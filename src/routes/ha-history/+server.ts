import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import dns from 'node:dns';
import { promisify } from 'util';
import { canUseSupervisorProxyForAppRequest, fetchSupervisorCore } from '$lib/server/supervisorProxy';
import { loadHaSessionTokensFromCookie } from '$lib/server/haSession';

const lookup = promisify(dns.lookup);
const DNS_CACHE_TTL = 5 * 60 * 1000;
const dnsCache = new Map<string, { address: string; timestamp: number }>();
const HISTORY_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:?\d{2})$/;

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

function isValidHistoryTimestamp(timestamp: string) {
    return timestamp.length <= 40
        && HISTORY_TIMESTAMP_PATTERN.test(timestamp)
        && !Number.isNaN(Date.parse(timestamp));
}

export const GET: RequestHandler = async ({ url, request, fetch, cookies }) => {
    try {
        // Get headers
        const haUrlFromHeader = request.headers.get('x-ha-url');
        const authFromHeader = request.headers.get('Authorization');
        const sessionTokens = authFromHeader ? null : await loadHaSessionTokensFromCookie(cookies);
        const auth = authFromHeader ?? (sessionTokens ? `Bearer ${sessionTokens.access_token}` : null);
        const haUrl = haUrlFromHeader ?? sessionTokens?.hassUrl ?? null;

        const timestamp = url.searchParams.get('timestamp');
        const endTime = url.searchParams.get('end_time');
        const filter = url.searchParams.get('filter_entity_id');

        if (!timestamp) {
            return new Response(JSON.stringify({ error: 'Missing timestamp' }), { status: 400 });
        }

        if (!isValidHistoryTimestamp(timestamp)) {
            return new Response(JSON.stringify({ error: 'Invalid timestamp' }), { status: 400 });
        }

        if (canUseSupervisorProxyForAppRequest(auth)) {
            const targetPath = new URLSearchParams();
            if (endTime) targetPath.set('end_time', endTime);
            if (filter) targetPath.set('filter_entity_id', filter);
            const query = targetPath.toString();

            const res = await fetchSupervisorCore(
                fetch,
                `/api/history/period/${encodeURIComponent(timestamp)}${query ? `?${query}` : ''}`,
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

        if (!auth) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
        }

        if (!haUrl) {
            return new Response(JSON.stringify({ error: 'Missing x-ha-url header' }), { status: 400 });
        }

        // Normalize URL: remove trailing slash if present
        const normalizedHaUrl = haUrl.endsWith('/') ? haUrl.slice(0, -1) : haUrl;

        // Parse the provided HA URL to extract hostname
        let parsedHaUrl: URL;
        try {
            parsedHaUrl = new URL(normalizedHaUrl);
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid Home Assistant URL' }), { status: 400 });
        }

        if (!['http:', 'https:'].includes(parsedHaUrl.protocol)) {
            return new Response(JSON.stringify({ error: 'Invalid Home Assistant URL' }), { status: 400 });
        }

        const originalHost = parsedHaUrl.hostname;
        const originalHostHeader = parsedHaUrl.host;

        // Manually resolve hostname to IPv4 to bypass Docker .local issues
        let resolvedHost = originalHost;
        try {
            resolvedHost = await resolveHost(originalHost);
        } catch (dnsErr) {
            if (dev) console.warn(`[History Proxy] DNS lookup failed for ${originalHost}, using original.`, dnsErr);
        }

        // Construct target URL using the RESOLVED IP but keeping the port/protocol
        // We must preserve the original Host header so the server accepts it (if vhost)
        const resolvedOrigin = `${parsedHaUrl.protocol}//${resolvedHost}${parsedHaUrl.port ? `:${parsedHaUrl.port}` : ''}`;
        const targetUrl = new URL(`/api/history/period/${encodeURIComponent(timestamp)}`, resolvedOrigin);

        if (endTime) targetUrl.searchParams.set('end_time', endTime);
        if (filter) targetUrl.searchParams.set('filter_entity_id', filter);

        const res = await fetch(targetUrl.toString(), {
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json',
                // Important: Pass the original Host header in case the server checks it
                'Host': originalHostHeader
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

            const payload = dev
                ? {
                    error: 'Upstream Error',
                    status: res.status,
                    details
                }
                : {
                    error: 'Upstream Error',
                    status: res.status
                };

            return new Response(JSON.stringify(payload), {
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

        const payload = dev
            ? {
                error: 'Internal Proxy Error',
                message: err.message,
                cause: causeInfo,
                stack: err.stack
            }
            : {
                error: 'Internal Proxy Error',
                message: 'History proxy request failed'
            };

        return new Response(JSON.stringify(payload), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
