import type { RequestHandler } from "./$types";
import { copyAhProxyResponseHeaders, rewriteAhLoginBody, rewriteAhRequestHeader } from "$lib/server/ahAuthProxy";

const LOGIN_ORIGIN = "https://login.ah.nl";
const TEXT_CONTENT_TYPES = ["text/html", "javascript", "json", "css"];

function shouldRewriteBody(response: Response) {
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    return TEXT_CONTENT_TYPES.some((type) => contentType.includes(type));
}

async function proxyAhLogin({ request, params, url, fetch }: Parameters<RequestHandler>[0]) {
    const target = new URL(`/${params.path ?? ""}`, "https://login.ah.nl");
    target.search = url.search;

    const headers = new Headers();
    for (const key of ["accept", "accept-language", "content-type", "cookie", "user-agent", "referer"]) {
        const value = request.headers.get(key);
        if (value) headers.set(key, key === "referer" ? rewriteAhRequestHeader(value, url) : value);
    }
    headers.set("host", "login.ah.nl");

    const method = request.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
        headers.set("origin", LOGIN_ORIGIN);
        if (!headers.has("referer")) headers.set("referer", `${LOGIN_ORIGIN}/login`);
    }

    const response = await fetch(target, {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
        redirect: "manual",
    });

    const rewriteBody = shouldRewriteBody(response);
    const responseHeaders = copyAhProxyResponseHeaders(response, url, rewriteBody);
    if (!rewriteBody) {
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    }

    const body = rewriteAhLoginBody(await response.text(), url);
    responseHeaders.delete("content-length");
    return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
    });
}

export const GET: RequestHandler = proxyAhLogin;
export const POST: RequestHandler = proxyAhLogin;
export const PUT: RequestHandler = proxyAhLogin;
