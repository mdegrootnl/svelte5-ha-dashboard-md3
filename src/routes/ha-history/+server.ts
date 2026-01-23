import { env } from '$env/dynamic/private';
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

        // Use INTERNAL_HASS_URL if set (Docker DNS fix), otherwise fallback to client header
        const internalUrl = env.INTERNAL_HASS_URL;
        const baseUrl = internalUrl || haUrl;

        console.log(`[History Proxy] Internal URL Env: '${internalUrl}'`);
        console.log(`[History Proxy] Client Header URL: '${haUrl}'`);
        console.log(`[History Proxy] Using Base URL: '${baseUrl}'`);

        // Normalize URL: remove trailing slash if present
        const normalizedHaUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

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
        if (err.cause) console.error('[History Proxy] Error Cause:', err.cause);

        // Serialize cause if it exists (it's often an Error object)
        let causeInfo = undefined;
        if (err.cause) {
            causeInfo = err.cause instanceof Error ? err.cause.message : String(err.cause);
            // Check for common connection errors to give a hint
            if (String(err.cause).includes('ECONNREFUSED')) {
                causeInfo += ' (Connection Refused - Check IP/Port visibility)';
            }
        }

        return new Response(JSON.stringify({
            error: 'Internal Proxy Error',
            message: err.message,
            cause: causeInfo,
            stack: err.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
