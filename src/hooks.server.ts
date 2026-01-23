import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import dns from 'node:dns';

// Force usage of IPv4 for DNS resolution
// This fixes issues with .local domains in Docker/Node 17+ where it tries IPv6 first and fails
// ignoring the IPv4 response that standard tools like ping might find.
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

export const handle: Handle = async ({ event, resolve }) => {
    // Debug logging for API requests
    if (event.url.pathname.startsWith('/api')) {
        console.log(`[Server Hook] Request: ${event.request.method} ${event.url.pathname}`);
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
