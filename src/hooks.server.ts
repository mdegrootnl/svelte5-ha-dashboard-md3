import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { getDeploymentInfo } from '$lib/server/deployment';
import {
    buildContentSecurityPolicy,
    contentSecurityPolicyHeaderName,
} from '$lib/server/securityHeaders';
import { checkRateLimit } from '$lib/server/rateLimit';

function isRateLimitDisabled() {
    const value = env.DASHBOARD_RATE_LIMIT?.trim().toLowerCase();
    return value === '0' || value === 'false' || value === 'off';
}

function getRateLimitIdentifier(event: Parameters<Handle>[0]['event']) {
    try {
        return event.getClientAddress();
    } catch {
        return event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || event.request.headers.get('x-real-ip')?.trim()
            || 'unknown';
    }
}

export const handle: Handle = async ({ event, resolve }) => {
    const deployment = getDeploymentInfo(event.request, event.url);
    const method = event.request.method.toUpperCase();

    if (!isRateLimitDisabled()) {
        const rateLimit = checkRateLimit({
            identifier: getRateLimitIdentifier(event),
            method,
            pathname: event.url.pathname,
        });

        if (!rateLimit.allowed) {
            const retryAfter = String(rateLimit.retryAfterSeconds);
            return new Response(JSON.stringify({
                error: 'Too many requests',
                retryAfter: rateLimit.retryAfterSeconds,
            }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': retryAfter,
                    'X-RateLimit-Limit': String(rateLimit.rule?.max ?? 0),
                    'X-RateLimit-Remaining': String(rateLimit.remaining),
                    'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
                }
            });
        }
    }

    if (event.url.pathname.startsWith('/api') && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const origin = event.request.headers.get('origin');
        const secFetchSite = event.request.headers.get('sec-fetch-site');
        const isCrossSiteFetch = secFetchSite === 'cross-site' || secFetchSite === 'same-site';
        const isBrowserConfirmedSameOrigin = secFetchSite === 'same-origin';

        if ((origin && origin !== event.url.origin && !isBrowserConfirmedSameOrigin) || isCrossSiteFetch) {
            console.warn('[Server Hook] Cross-origin API mutation blocked', {
                method,
                path: event.url.pathname,
                origin,
                secFetchSite
            });

            return new Response(JSON.stringify({
                error: 'Cross-origin API mutations are not allowed'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    const response = await resolve(event);

    // Security Headers - only apply CSP in production
    // In development, Vite injects inline scripts for HMR that would be blocked
    if (!dev) {
        response.headers.set(
            contentSecurityPolicyHeaderName({
                reportOnly: env.DASHBOARD_CSP_REPORT_ONLY,
            }),
            buildContentSecurityPolicy(deployment, event.url, {
                connectSrc: env.DASHBOARD_CSP_CONNECT_SRC,
                imageSrc: env.DASHBOARD_CSP_IMG_SRC,
                mode: env.DASHBOARD_CSP_MODE,
                reportOnly: env.DASHBOARD_CSP_REPORT_ONLY,
            })
        );
    }

    // Additional security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', deployment.mode === 'ha-addon' ? 'SAMEORIGIN' : 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    return response;
};
