import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADDON_BROWSER_TOKEN } from "$lib/shared/deployment";

const mockEnv: Record<string, string | undefined> = {};

vi.mock("$env/dynamic/private", () => ({
    env: mockEnv,
}));

const { GET, POST } = await import("./+server");

describe("/api/addon/core/[...path]", () => {
    beforeEach(() => {
        for (const key of Object.keys(mockEnv)) delete mockEnv[key];
    });

    it("rejects requests that are not authenticated with the add-on browser token", async () => {
        mockEnv.DASHBOARD_DEPLOYMENT = "ha-addon";
        mockEnv.SUPERVISOR_TOKEN = "supervisor-secret";

        const response = await GET({
            params: { path: "api/states" },
            request: new Request("http://localhost/api/addon/core/api/states", {
                headers: { Authorization: "Bearer user-token" },
            }),
            url: new URL("http://localhost/api/addon/core/api/states"),
            fetch: vi.fn(),
        } as any);

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: "Add-on supervisor proxy is unavailable",
        });
    });

    it("forwards body, query string, and safe headers through the Supervisor proxy", async () => {
        mockEnv.DASHBOARD_DEPLOYMENT = "ha-addon";
        mockEnv.SUPERVISOR_TOKEN = "supervisor-secret";
        const eventFetch = vi.fn(async () => new Response(JSON.stringify({ ok: true })));

        const response = await POST({
            params: { path: "api/services/light/turn_on" },
            request: new Request("http://localhost/api/addon/core/api/services/light/turn_on?return_response", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${ADDON_BROWSER_TOKEN}`,
                    "Content-Length": "999",
                    "Content-Type": "application/json",
                    Host: "dashboard.local",
                    "x-dashboard-request": "card-action",
                },
                body: JSON.stringify({ entity_id: "light.keuken" }),
            }),
            url: new URL("http://localhost/api/addon/core/api/services/light/turn_on?return_response"),
            fetch: eventFetch,
        } as any);

        expect(response.status).toBe(200);
        expect(eventFetch).toHaveBeenCalledTimes(1);
        const [url, init] = eventFetch.mock.calls[0] as unknown as [URL, RequestInit];
        const headers = new Headers(init.headers);

        expect(String(url)).toBe("http://supervisor/core/api/services/light/turn_on?return_response");
        expect(init.method).toBe("POST");
        expect(init.body).toBeInstanceOf(ArrayBuffer);
        expect(headers.get("Authorization")).toBe("Bearer supervisor-secret");
        expect(headers.get("Host")).toBeNull();
        expect(headers.get("Content-Length")).toBeNull();
        expect(headers.get("x-dashboard-request")).toBe("card-action");
        expect(headers.get("Content-Type")).toBe("application/json");
    });
});
