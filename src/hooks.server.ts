import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
    if (event.url.pathname.startsWith('/api') && !['GET', 'HEAD', 'OPTIONS'].includes(event.request.method.toUpperCase())) {
        const origin = event.request.headers.get('origin');
        const secFetchSite = event.request.headers.get('sec-fetch-site');
        const isCrossSiteFetch = secFetchSite === 'cross-site' || secFetchSite === 'same-site';

        if ((origin && origin !== event.url.origin) || isCrossSiteFetch) {
            console.warn('[Server Hook] Cross-origin API mutation blocked', {
                method: event.request.method,
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
            'Content-Security-Policy',
            [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "connect-src 'self' ws: wss: http: https:",
                "img-src 'self' data: http: https:",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
            ].join('; ')
        );
    }

    // Additional security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    return response;
};
