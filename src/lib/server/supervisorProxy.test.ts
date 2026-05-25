import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADDON_BROWSER_TOKEN } from "$lib/shared/deployment";

const mockEnv: Record<string, string | undefined> = {};

vi.mock("$env/dynamic/private", () => ({
    env: mockEnv,
}));

const {
    fetchSupervisorCore,
    getSupervisorCoreUrl,
    shouldUseSupervisorProxy,
} = await import("./supervisorProxy");

describe("supervisor proxy", () => {
    beforeEach(() => {
        for (const key of Object.keys(mockEnv)) delete mockEnv[key];
    });

    it("only enables the proxy for add-on browser auth when a supervisor token exists", () => {
        const browserAuth = `Bearer ${ADDON_BROWSER_TOKEN}`;

        expect(shouldUseSupervisorProxy(browserAuth)).toBe(false);

        mockEnv.DASHBOARD_DEPLOYMENT = "ha-addon";
        expect(shouldUseSupervisorProxy(browserAuth)).toBe(false);

        mockEnv.SUPERVISOR_TOKEN = "supervisor-secret";
        expect(shouldUseSupervisorProxy(browserAuth)).toBe(true);
        expect(shouldUseSupervisorProxy("Bearer user-token")).toBe(false);
        expect(shouldUseSupervisorProxy(null)).toBe(false);
    });

    it("builds Supervisor core URLs from clean or slash-prefixed paths", () => {
        expect(String(getSupervisorCoreUrl("api/states"))).toBe("http://supervisor/core/api/states");
        expect(String(getSupervisorCoreUrl("/api/states/sensor.energy?minimal_response"))).toBe(
            "http://supervisor/core/api/states/sensor.energy?minimal_response",
        );
    });

    it("returns an unavailable response when the Supervisor token is missing", async () => {
        const eventFetch = vi.fn();

        const response = await fetchSupervisorCore(eventFetch as any, "/api/states");

        expect(response.status).toBe(503);
        expect(eventFetch).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: "Supervisor token is unavailable",
        });
    });

    it("forwards requests with the Supervisor token and never the browser token", async () => {
        mockEnv.SUPERVISOR_TOKEN = "supervisor-secret";
        const eventFetch = vi.fn(async () => new Response(JSON.stringify({ ok: true })));

        const response = await fetchSupervisorCore(eventFetch as any, "/api/services/light/turn_on", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${ADDON_BROWSER_TOKEN}`,
                "x-dashboard-source": "test",
            },
            body: JSON.stringify({ entity_id: "light.keuken" }),
        });

        expect(response.status).toBe(200);
        expect(eventFetch).toHaveBeenCalledTimes(1);
        const [url, init] = eventFetch.mock.calls[0] as unknown as [URL, RequestInit];
        const headers = new Headers(init.headers);

        expect(String(url)).toBe("http://supervisor/core/api/services/light/turn_on");
        expect(init.method).toBe("POST");
        expect(init.body).toBe(JSON.stringify({ entity_id: "light.keuken" }));
        expect(headers.get("Authorization")).toBe("Bearer supervisor-secret");
        expect(headers.get("Authorization")).not.toContain(ADDON_BROWSER_TOKEN);
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(headers.get("x-dashboard-source")).toBe("test");
    });
});
