import type { RequestHandler } from "./$types";
import { fetchSupervisorCore, shouldUseSupervisorProxy } from "$lib/server/supervisorProxy";

async function proxy({ params, request, url, fetch }: Parameters<RequestHandler>[0]) {
    const authHeader = request.headers.get("Authorization");
    if (!shouldUseSupervisorProxy(authHeader)) {
        return new Response(JSON.stringify({ error: "Add-on supervisor proxy is unavailable" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("authorization");
    headers.delete("content-length");

    const body = request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer();

    return fetchSupervisorCore(fetch, `/${params.path}${url.search}`, {
        method: request.method,
        headers,
        body,
    });
}

export const GET: RequestHandler = proxy;
export const POST: RequestHandler = proxy;
export const PUT: RequestHandler = proxy;
export const PATCH: RequestHandler = proxy;
export const DELETE: RequestHandler = proxy;
