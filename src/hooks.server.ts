import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
    // Custom CSRF protection: require a security header for all mutation requests (POST, PUT, DELETE, PATCH)
    if (event.url.pathname.startsWith('/api') && !['GET', 'HEAD', 'OPTIONS'].includes(event.request.method.toUpperCase())) {
        const securityHeader = event.request.headers.get('x-dashboard-api');

        if (securityHeader !== 'true') {
            const headerNames = [...event.request.headers.keys()].join(', ');
            console.warn(`[Server Hook] CSRF Blocked: ${event.request.method} ${event.url.pathname}. Missing 'x-dashboard-api'. Found headers: ${headerNames}`);

            return new Response(JSON.stringify({
                error: 'Missing required security header',
                received_headers: dev ? headerNames : undefined // Only show in dev for security
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
