import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
    // 1. Handle CORS Preflight (OPTIONS)
    if (event.request.method === 'OPTIONS' && event.url.pathname.startsWith('/api')) {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*', // Relaxed for home automation local network support
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-dashboard-api, x-filename',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    // 2. Custom CSRF protection for mutation requests
    if (event.url.pathname.startsWith('/api') && !['GET', 'HEAD', 'OPTIONS'].includes(event.request.method.toUpperCase())) {
        const securityHeader = event.request.headers.get('x-dashboard-api');
        const securityQuery = event.url.searchParams.get('csrf');

        if (securityHeader !== 'true' && securityQuery !== 'true') {
            const headerNames = [...event.request.headers.keys()].join(', ');
            console.warn(`[Server Hook] CSRF Blocked: ${event.request.method} ${event.url.pathname}. Missing 'x-dashboard-api' header or 'csrf=true' query param.`);

            return new Response(JSON.stringify({
                error: 'Missing required security validation',
                details: 'Provide x-dashboard-api: true header or ?csrf=true query parameter'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    const response = await resolve(event);

    // 3. Add CORS headers to API responses
    if (event.url.pathname.startsWith('/api')) {
        response.headers.set('Access-Control-Allow-Origin', '*');
    }

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
