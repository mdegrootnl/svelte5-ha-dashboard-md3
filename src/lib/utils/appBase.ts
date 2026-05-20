import { browser } from "$app/environment";
import {
    detectIngressPathFromPathname,
    isLocalAppPath,
    normalizeIngressPath,
    stripIngressPath,
} from "$lib/shared/deployment";

let appBasePath = "";
let originalFetch: typeof fetch | null = null;

function hasExternalScheme(value: string) {
    return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
}

function shouldPrefix(value: string) {
    const base = getAppBasePath();
    if (!base) return false;
    if (!isLocalAppPath(value)) return false;
    if (value === base || value.startsWith(`${base}/`)) return false;
    return true;
}

export function setAppBasePath(value: string | null | undefined) {
    appBasePath = normalizeIngressPath(value);
    if (browser) installAppBaseFetchPatch();
}

export function getAppBasePath() {
    if (!appBasePath && browser) {
        return detectIngressPathFromPathname(window.location.pathname);
    }
    return appBasePath;
}

export function getRoutePath(pathname: string) {
    return stripIngressPath(pathname, getAppBasePath());
}

export function withBase<T extends string | null | undefined>(value: T): T {
    if (!value || hasExternalScheme(value) || value.startsWith("#")) return value;
    const base = getAppBasePath();
    return (shouldPrefix(value) ? `${base}${value}` : value) as T;
}

export function makeAppWebSocketUrl(path: string) {
    if (!browser) return path;
    const url = new URL(withBase(path), window.location.origin);
    url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
}

function rebaseFetchInput(input: RequestInfo | URL): RequestInfo | URL {
    if (!browser || !getAppBasePath()) return input;

    if (typeof input === "string") {
        return withBase(input);
    }

    if (input instanceof URL && input.origin === window.location.origin) {
        return new URL(withBase(`${input.pathname}${input.search}${input.hash}`), window.location.origin);
    }

    if (input instanceof Request) {
        const url = new URL(input.url, window.location.origin);
        if (url.origin !== window.location.origin) return input;
        const rebased = new URL(withBase(`${url.pathname}${url.search}${url.hash}`), window.location.origin);
        return new Request(rebased, input);
    }

    return input;
}

export function installAppBaseFetchPatch() {
    if (!browser || originalFetch) return;

    originalFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        return originalFetch!(rebaseFetchInput(input), init);
    }) as typeof fetch;
}

export function resetAppBaseForTests() {
    appBasePath = "";
    if (browser && originalFetch) {
        window.fetch = originalFetch;
        originalFetch = null;
    }
}
