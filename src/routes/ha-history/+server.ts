import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, fetch }) => {
    // Extract query parameters
    const searchParams = url.searchParams.toString();

    // Get headers
    const haUrl = request.headers.get('x-ha-url');
    const auth = request.headers.get('Authorization');

    if (!haUrl) {
        throw error(400, 'Missing x-ha-url header');
    }

    if (!auth) {
        throw error(401, 'Missing Authorization header');
    }

    const timestamp = url.searchParams.get('timestamp');
    const endTime = url.searchParams.get('end_time');
    const filter = url.searchParams.get('filter_entity_id');

    if (!timestamp) {
        throw error(400, 'Missing timestamp');
    }

    try {
        // Normalize URL: remove trailing slash if present
        const normalizedHaUrl = haUrl.endsWith('/') ? haUrl.slice(0, -1) : haUrl;

        // Encode the timestamp just in case, though usually browser handles it.
        // HA expects the ISO string in the path.
        const encodedTimestamp = encodeURIComponent(timestamp);

        const targetUrl = `${normalizedHaUrl}/api/history/period/${encodedTimestamp}?end_time=${endTime}&filter_entity_id=${filter}`;

        // console.log('[History Proxy] Fetching:', targetUrl);

        const res = await fetch(targetUrl, {
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            // console.error(`[History Proxy] Upstream Error: ${res.status} ${res.statusText}`);
            // Return 502 Bad Gateway to distinguish "Proxy not found" (404) from "HA error"
            return new Response(JSON.stringify({ error: 'Upstream Error' }), { status: res.status });
        }

        const data = await res.json();
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        // console.error('[History Proxy] Error:', err);
        // If it's already an HttpError (like our 502), rethrow it
        if (err.status) throw err;

        throw error(500, `Internal Proxy Error: ${err.message}`);
    }
};
