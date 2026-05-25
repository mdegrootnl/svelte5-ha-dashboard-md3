import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv: Record<string, string | undefined> = {};

vi.mock("$app/environment", () => ({
    browser: false,
    dev: false,
    building: false,
    version: "test",
}));

vi.mock("$env/dynamic/private", () => ({
    env: mockEnv,
}));

const { handle } = await import("../hooks.server");

function requestEvent(url: string, init: RequestInit = {}) {
    const request = new Request(url, init);
    return {
        request,
        url: new URL(url),
    } as any;
}

describe("server security hook", () => {
    beforeEach(() => {
        for (const key of Object.keys(mockEnv)) delete mockEnv[key];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("applies production standalone CSP and security headers", async () => {
        const response = await handle({
            event: requestEvent("https://dashboard.local/dashboard"),
            resolve: async () => new Response("ok"),
        });

        const policy = response.headers.get("content-security-policy") ?? "";
        expect(policy).toContain("default-src 'self'");
        expect(policy).toContain("script-src 'self' 'unsafe-inline'");
        expect(policy).not.toContain("'unsafe-eval'");
        expect(policy).toContain("frame-ancestors 'none'");
        expect(response.headers.get("x-frame-options")).toBe("DENY");
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(response.headers.get("permissions-policy")).toBe("geolocation=(), microphone=(), camera=()");
    });

    it("honors report-only hardened CSP options from the environment", async () => {
        mockEnv.DASHBOARD_CSP_MODE = "hardened";
        mockEnv.DASHBOARD_CSP_CONNECT_SRC = "https://ha.local wss://ha.local";
        mockEnv.DASHBOARD_CSP_IMG_SRC = "http://camera.local";
        mockEnv.DASHBOARD_CSP_REPORT_ONLY = "true";

        const response = await handle({
            event: requestEvent("http://dashboard.local/settings"),
            resolve: async () => new Response("ok"),
        });

        expect(response.headers.has("content-security-policy")).toBe(false);
        const policy = response.headers.get("content-security-policy-report-only") ?? "";
        expect(policy).toContain("connect-src 'self' ws://dashboard.local https://ha.local wss://ha.local");
        expect(policy).toContain("img-src 'self' data: blob: https: http://camera.local");
        expect(policy).not.toContain("connect-src 'self' ws: wss: http: https:");
        expect(response.headers.get("x-frame-options")).toBe("DENY");
    });

    it("blocks cross-origin browser API mutations before route handlers run", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const resolve = vi.fn(async () => new Response("should not run"));
        const response = await handle({
            event: requestEvent("https://dashboard.local/api/settings", {
                method: "POST",
                headers: {
                    origin: "https://attacker.example",
                    "sec-fetch-site": "cross-site",
                },
            }),
            resolve,
        });

        expect(response.status).toBe(403);
        expect(resolve).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: "Cross-origin API mutations are not allowed",
        });
    });
});
