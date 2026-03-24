import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, fetch }) => {
    const haUrlFromHeader = request.headers.get('x-ha-url') || url.searchParams.get('url');
    const authHeader = request.headers.get('Authorization') || (url.searchParams.get('token') ? `Bearer ${url.searchParams.get('token')}` : null);
    const resourcePath = url.searchParams.get('path');

    if (!haUrlFromHeader) {
        throw error(400, 'Missing x-ha-url header');
    }

    if (!authHeader) {
        throw error(401, 'Missing Authorization header');
    }

    if (!resourcePath) {
        throw error(400, 'Missing path parameter');
    }

    try {
        const normalizedHaUrl = haUrlFromHeader.endsWith('/')
            ? haUrlFromHeader.slice(0, -1)
            : haUrlFromHeader;

        // Ensure path starts with /
        const normalizedPath = resourcePath.startsWith('/')
            ? resourcePath
            : `/${resourcePath}`;

        const targetUrl = `${normalizedHaUrl}${normalizedPath}`;

        const res = await fetch(targetUrl, {
            headers: {
                'Authorization': authHeader
            }
        });

        if (!res.ok) {
            return new Response(JSON.stringify({ error: 'Upstream Error' }), { status: res.status });
        }

        // Forward the content type and body as an arrayBuffer for better reliability
        const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
        const data = await res.arrayBuffer();

        return new Response(data, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
            }
        });

    } catch (err: any) {
        if (err.status) throw err;
        throw error(500, `Internal Proxy Error: ${err.message}`, { cause: err.cause });
    }
};
