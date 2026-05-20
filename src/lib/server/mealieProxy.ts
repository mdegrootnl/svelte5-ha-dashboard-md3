import { MealieSettingsService } from '$lib/server/mealieSettings';

const ALLOWED_MEALIE_PATHS = [
    /^app\/about$/,
    /^users\/self$/,
    /^users\/self\/(?:favorites|ratings)(?:\/[^/]+)?$/,
    /^recipes(?:\/.*)?$/,
    /^households\/mealplans(?:\/.*)?$/,
    /^households\/shopping\/lists(?:\/.*)?$/,
    /^households\/shopping\/items(?:\/.*)?$/,
    /^media\/recipes\/[^/]+\/(?:images|assets)(?:\/.*)?$/,
];

export class MealieProxyError extends Error {
    constructor(
        message: string,
        public status = 500,
    ) {
        super(message);
    }
}

function normalizeProxyPath(path: string) {
    const cleaned = path.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!cleaned || cleaned.includes('..') || cleaned.includes('\\')) {
        throw new MealieProxyError('Invalid Mealie path', 400);
    }

    if (!ALLOWED_MEALIE_PATHS.some((pattern) => pattern.test(cleaned))) {
        throw new MealieProxyError('Mealie endpoint is not allowed', 403);
    }

    return cleaned;
}

function encodePath(path: string) {
    return path
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');
}

function copyRequestHeaders(request: Request) {
    const headers = new Headers();
    const contentType = request.headers.get('content-type');
    const accept = request.headers.get('accept');
    const acceptLanguage = request.headers.get('accept-language');

    if (contentType) headers.set('content-type', contentType);
    if (accept) headers.set('accept', accept);
    if (acceptLanguage) headers.set('accept-language', acceptLanguage);

    return headers;
}

function copyResponseHeaders(response: Response) {
    const headers = new Headers();
    for (const [key, value] of response.headers) {
        if (['content-type', 'cache-control', 'etag', 'last-modified'].includes(key.toLowerCase())) {
            headers.set(key, value);
        }
    }
    return headers;
}

export async function proxyMealieRequest({
    path,
    request,
    url,
    fetch,
}: {
    path: string;
    request: Request;
    url: URL;
    fetch: typeof globalThis.fetch;
}) {
    const safePath = normalizeProxyPath(path);
    const { baseUrl, apiToken } = await MealieSettingsService.getCredentials();

    if (!baseUrl) {
        throw new MealieProxyError('Mealie is not configured', 503);
    }

    const headers = copyRequestHeaders(request);
    if (apiToken) {
        headers.set('authorization', `Bearer ${apiToken}`);
    } else if (safePath !== 'app/about') {
        throw new MealieProxyError('Mealie API token is not configured', 401);
    }

    const targetUrl = new URL(`/api/${encodePath(safePath)}`, baseUrl);
    targetUrl.search = url.search;

    const init: RequestInit = {
        method: request.method,
        headers,
        redirect: 'manual',
    };

    if (!['GET', 'HEAD'].includes(request.method)) {
        init.body = await request.arrayBuffer();
    }

    const response = await fetch(targetUrl, init);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: copyResponseHeaders(response),
    });
}
