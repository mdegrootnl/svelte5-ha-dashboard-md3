import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import dns from 'node:dns';
import { promisify } from 'util';
import { fetchSupervisorCore, shouldUseSupervisorProxy } from '$lib/server/supervisorProxy';

const lookup = promisify(dns.lookup);
const DNS_CACHE_TTL = 5 * 60 * 1000;
const dnsCache = new Map<string, { address: string; timestamp: number }>();

async function resolveHost(host: string) {
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return host;

    const cached = dnsCache.get(host);
    if (cached && Date.now() - cached.timestamp < DNS_CACHE_TTL) {
        return cached.address;
    }

    const { address } = await lookup(host, { family: 4 });
    dnsCache.set(host, { address, timestamp: Date.now() });
    if (dev) console.debug(`[History Proxy] Resolved ${host} -> ${address}`);
    return address;
}

export const GET: RequestHandler = async ({ url, request, fetch }) => {
    try {
        // Get headers
        const haUrl = request.headers.get('x-ha-url');
        const auth = request.headers.get('Authorization');

        if (!auth) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
        }

        const timestamp = url.searchParams.get('timestamp');
        const endTime = url.searchParams.get('end_time');
        const filter = url.searchParams.get('filter_entity_id');

        if (!timestamp) {
            return new Response(JSON.stringify({ error: 'Missing timestamp' }), { status: 400 });
        }

        if (shouldUseSupervisorProxy(auth)) {
            const targetPath = new URLSearchParams();
            if (endTime) targetPath.set('end_time', endTime);
            if (filter) targetPath.set('filter_entity_id', filter);
            const query = targetPath.toString();

            const res = await fetchSupervisorCore(
                fetch,
                `/api/history/period/${timestamp}${query ? `?${query}` : ''}`,
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const body = await res.arrayBuffer();
            return new Response(body, {
                status: res.status,
                headers: {
                    'Content-Type': res.headers.get('Content-Type') || 'application/json'
                }
            });
        }

        if (!haUrl) {
            return new Response(JSON.stringify({ error: 'Missing x-ha-url header' }), { status: 400 });
        }

        // Normalize URL: remove trailing slash if present
        const normalizedHaUrl = haUrl.endsWith('/') ? haUrl.slice(0, -1) : haUrl;

        // Parse the provided HA URL to extract hostname
        const parsedHaUrl = new URL(normalizedHaUrl);
        const originalHost = parsedHaUrl.hostname;

        // Manually resolve hostname to IPv4 to bypass Docker .local issues
        let resolvedHost = originalHost;
        try {
            resolvedHost = await resolveHost(originalHost);
        } catch (dnsErr) {
            if (dev) console.warn(`[History Proxy] DNS lookup failed for ${originalHost}, using original.`, dnsErr);
        }

        // Construct target URL using the RESOLVED IP but keeping the port/protocol
        // We must preserve the original Host header so the server accepts it (if vhost)
        const targetUrl = new URL(`${parsedHaUrl.protocol}//${resolvedHost}:${parsedHaUrl.port || (parsedHaUrl.protocol === 'https:' ? '443' : '80')}/api/history/period/${timestamp}`);

        if (endTime) targetUrl.searchParams.set('end_time', endTime);
        if (filter) targetUrl.searchParams.set('filter_entity_id', filter);

        const res = await fetch(targetUrl.toString(), {
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json',
                // Important: Pass the original Host header in case the server checks it
                'Host': originalHost
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
