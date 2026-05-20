import type { RequestEvent } from "@sveltejs/kit";
import { getSupervisorToken, isAddonBrowserAuthorization, isHaAddonDeployment } from "$lib/server/deployment";

const SUPERVISOR_CORE_BASE = "http://supervisor/core/";

export function shouldUseSupervisorProxy(authHeader: string | null) {
    return isHaAddonDeployment() && isAddonBrowserAuthorization(authHeader) && Boolean(getSupervisorToken());
}

export function getSupervisorCoreUrl(resourcePath: string) {
    const cleanPath = resourcePath.replace(/^\/+/, "");
    return new URL(cleanPath, SUPERVISOR_CORE_BASE);
}

export async function fetchSupervisorCore(
    eventFetch: RequestEvent["fetch"],
    resourcePath: string,
    init: RequestInit = {},
) {
    const token = getSupervisorToken();
    if (!token) {
        return new Response(JSON.stringify({ error: "Supervisor token is unavailable" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
        });
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init.body) {
        headers.set("Content-Type", "application/json");
    }

    return eventFetch(getSupervisorCoreUrl(resourcePath), {
        ...init,
        headers,
    });
}
