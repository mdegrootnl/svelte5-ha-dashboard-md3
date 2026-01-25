import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
    // Custom CSRF protection: require a security header for all mutation requests (POST, PUT, DELETE, PATCH)
    // This is more flexible than SvelteKit's built-in origin check for local networks
    if (event.url.pathname.startsWith('/api') && !['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)) {
        console.log(`[Server Hook] Validating CSRF for: ${event.request.method} ${event.url.pathname}`);
        if (event.request.headers.get('x-dashboard-api') !== 'true') {
            console.warn(`[Server Hook] Blocked mutation request missing security header: ${event.request.method} ${event.url.pathname}`);
            return new Response(JSON.stringify({ error: 'Missing required security header' }), {
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
