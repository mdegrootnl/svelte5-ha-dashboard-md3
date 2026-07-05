const LOGIN_HOST = "login.ah.nl";
const LOGIN_ORIGIN = `https://${LOGIN_HOST}`;

export function ahProxyBase(url: URL) {
    const basePrefix = url.pathname.split("/api/ah/auth/proxy")[0] || "";
    return `${url.origin}${basePrefix}/api/ah/auth/proxy`;
}

export function ahCallbackUrl(url: URL) {
    const basePrefix = url.pathname.split("/api/ah/auth/proxy")[0] || "";
    return `${url.origin}${basePrefix}/api/ah/auth/callback`;
}

export function ahLoginUrl(url: URL) {
    const params = new URLSearchParams({
        client_id: "appie-ios",
        response_type: "code",
        redirect_uri: "appie://login-exit",
    });
    const basePrefix = url.pathname.split("/api/ah/auth/start")[0] || "";
    return `${basePrefix}/api/ah/auth/proxy/login?${params.toString()}`;
}

export function sanitizeAhCookie(cookie: string) {
    return cookie
        .split(";")
        .filter((part, index) => {
            if (index === 0) return true;
            const lower = part.trim().toLowerCase();
            return lower !== "secure" && !lower.startsWith("samesite") && !lower.startsWith("domain");
        })
        .join(";");
}

export function rewriteAhLocation(location: string, url: URL) {
    if (location.startsWith("appie://")) {
        const appieUrl = new URL(location);
        return `${ahCallbackUrl(url)}?${appieUrl.searchParams.toString()}`;
    }
    if (location.startsWith("/") && !location.startsWith("//")) {
        return `${ahProxyBase(url)}${location}`;
    }
    return location
        .replaceAll(LOGIN_ORIGIN, ahProxyBase(url))
        .replaceAll(`http://${LOGIN_HOST}`, ahProxyBase(url));
}

export function rewriteAhLoginBody(body: string, url: URL) {
    const proxyBase = ahProxyBase(url);
    return body
        .replaceAll(LOGIN_ORIGIN, proxyBase)
        .replaceAll(`http://${LOGIN_HOST}`, proxyBase)
        .replace(/(["'])\/(login|akam)(?=[/?#"'])/g, `$1${proxyBase}/$2`)
        .replace(/\b(href|src|action)=("([^"]*)"|'([^']*)')/gi, (match, attr, quoted, doubleValue, singleValue) => {
            const value = (doubleValue ?? singleValue) as string;
            if (!value.startsWith("/") || value.startsWith("//")) return match;
            const quote = quoted[0];
            return `${attr}=${quote}${proxyBase}${value}${quote}`;
        })
        .replace(/(\bfetch\(\s*["'])\/(?!\/)/g, `$1${proxyBase}/`)
        .replace(/(\burl\(\s*["']?)\/(?!\/)/g, `$1${proxyBase}/`);
}

export function rewriteAhRequestHeader(value: string, url: URL) {
    return value.replaceAll(ahProxyBase(url), LOGIN_ORIGIN);
}

export function copyAhProxyResponseHeaders(response: Response, url: URL, rewriteBody: boolean) {
    const headers = new Headers();
    for (const [key, value] of response.headers) {
        const lower = key.toLowerCase();
        if (["content-security-policy", "strict-transport-security", "x-frame-options", "content-length"].includes(lower)) {
            continue;
        }
        if (lower === "content-encoding") continue;
        if (lower === "location") {
            headers.set(key, rewriteAhLocation(value, url));
            continue;
        }
        if (lower === "set-cookie") continue;
        headers.set(key, value);
    }
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
        headers.append("set-cookie", sanitizeAhCookie(cookie));
    }
    return headers;
}
