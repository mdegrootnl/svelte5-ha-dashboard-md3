import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, fetch }) => {
    try {
        // Extract query parameters
        const searchParams = url.searchParams.toString();

        // Get headers
        const haUrl = request.headers.get('x-ha-url');
        const auth = request.headers.get('Authorization');

        if (!haUrl) {
            return new Response(JSON.stringify({ error: 'Missing x-ha-url header' }), { status: 400 });
        }

        if (!auth) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
        }

        const timestamp = url.searchParams.get('timestamp');
        const endTime = url.searchParams.get('end_time');
        const filter = url.searchParams.get('filter_entity_id');

        if (!timestamp) {
            return new Response(JSON.stringify({ error: 'Missing timestamp' }), { status: 400 });
        }

        // Normalize URL: remove trailing slash if present
        const normalizedHaUrl = haUrl.endsWith('/') ? haUrl.slice(0, -1) : haUrl;

        // Construct target URL using URL object for robust encoding
        const targetUrl = new URL(`${normalizedHaUrl}/api/history/period/${timestamp}`);
        if (endTime) targetUrl.searchParams.set('end_time', endTime);
        if (filter) targetUrl.searchParams.set('filter_entity_id', filter);

        // console.log('[History Proxy] Fetching:', targetUrl.toString());

        const res = await fetch(targetUrl.toString(), {
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            // Try to get error details from upstream
            let details = res.statusText;
            try {
                const errBody = await res.text();
                details = errBody || res.statusText;
            } catch (e) { /* ignore */ }

            console.error(`[History Proxy] Upstream Error: ${res.status} ${details}`);

            return new Response(JSON.stringify({
                error: 'Upstream Error',
                status: res.status,
                details
            }), {
                status: res.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await res.json();
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('[History Proxy] Internal Error:', err);

        return new Response(JSON.stringify({
            error: 'Internal Proxy Error',
            message: err.message,
            stack: err.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
