import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, fetch }) => {
    const haUrlFromHeader = request.headers.get('x-ha-url');
    const authHeader = request.headers.get('Authorization');
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
        const baseUrl = new URL(haUrlFromHeader);
        if (!['http:', 'https:'].includes(baseUrl.protocol)) {
            throw error(400, 'Invalid Home Assistant URL');
        }

        const normalizedPath = resourcePath.startsWith('/')
            ? resourcePath
            : `/${resourcePath}`;

        const targetUrl = new URL(normalizedPath, baseUrl);

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
                'Cache-Control': 'private, max-age=3600'
            }
        });

    } catch (err: any) {
        if (err.status) throw err;
        throw error(500, `Internal Proxy Error: ${err.message}`);
    }
};
