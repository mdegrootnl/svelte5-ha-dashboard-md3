import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canUseSupervisorProxyForAppRequest, fetchSupervisorCore } from '$lib/server/supervisorProxy';
import { loadHaSessionTokensFromCookie } from '$lib/server/haSession';

const ALLOWED_HA_RESOURCE_PREFIXES = [
    '/api/',
    '/auth/',
    '/local/',
    '/media/'
] as const;

function normalizeHomeAssistantResourcePath(resourcePath: string) {
    const trimmedPath = resourcePath.trim();

    if (!trimmedPath) {
        throw error(400, 'Missing path parameter');
    }

    if (/[\u0000-\u001f\u007f\\]/.test(trimmedPath)) {
        throw error(400, 'Invalid Home Assistant resource path');
    }

    if (trimmedPath.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(trimmedPath)) {
        throw error(400, 'Home Assistant resource path must be relative');
    }

    const normalizedPath = trimmedPath.startsWith('/')
        ? trimmedPath
        : `/${trimmedPath}`;

    if (normalizedPath.split('/').includes('..')) {
        throw error(400, 'Invalid Home Assistant resource path');
    }

    if (!ALLOWED_HA_RESOURCE_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
        throw error(403, 'Unsupported Home Assistant resource path');
    }

    return normalizedPath;
}

export const GET: RequestHandler = async ({ url, request, fetch, cookies }) => {
    const haUrlFromHeader = request.headers.get('x-ha-url');
    const authHeader = request.headers.get('Authorization');
    const resourcePath = url.searchParams.get('path');

    if (!resourcePath) {
        throw error(400, 'Missing path parameter');
    }

    try {
        const normalizedPath = normalizeHomeAssistantResourcePath(resourcePath);
        const sessionTokens = authHeader ? null : await loadHaSessionTokensFromCookie(cookies);
        const resolvedAuthHeader = authHeader ?? (sessionTokens ? `Bearer ${sessionTokens.access_token}` : null);
        const resolvedHaUrl = haUrlFromHeader ?? sessionTokens?.hassUrl ?? null;

        if (canUseSupervisorProxyForAppRequest(resolvedAuthHeader)) {
            const res = await fetchSupervisorCore(fetch, normalizedPath);
            if (!res.ok) {
                return new Response(JSON.stringify({ error: 'Upstream Error' }), { status: res.status });
            }

            const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
            const data = await res.arrayBuffer();

            return new Response(data, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'private, max-age=3600'
                }
            });
        }

        if (!resolvedAuthHeader) {
            throw error(401, 'Missing Authorization header');
        }

        if (!resolvedHaUrl) {
            throw error(400, 'Missing x-ha-url header');
        }

        let baseUrl: URL;
        try {
            baseUrl = new URL(resolvedHaUrl);
        } catch {
            throw error(400, 'Invalid Home Assistant URL');
        }

        if (!['http:', 'https:'].includes(baseUrl.protocol)) {
            throw error(400, 'Invalid Home Assistant URL');
        }

        const targetUrl = new URL(normalizedPath, baseUrl);
        if (targetUrl.origin !== baseUrl.origin) {
            throw error(400, 'Home Assistant resource path must stay on the configured origin');
        }

        const res = await fetch(targetUrl, {
            headers: {
                'Authorization': resolvedAuthHeader
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
        throw error(500, 'Internal Proxy Error');
    }
};
