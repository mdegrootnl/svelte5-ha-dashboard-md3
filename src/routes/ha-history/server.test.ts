import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv: Record<string, string | undefined> = {};
let mockSessionTokens: any = null;

vi.mock("$app/environment", () => ({
    browser: false,
    dev: false,
    building: false,
    version: "test",
}));

vi.mock("$env/dynamic/private", () => ({
    env: mockEnv,
}));

vi.mock("$lib/server/haSession", () => ({
    loadHaSessionTokensFromCookie: vi.fn(async () => mockSessionTokens),
}));

const { GET } = await import("./+server");

function historyEvent(
    params: Record<string, string>,
    eventFetch = vi.fn(),
    headers: Record<string, string> | null = {},
) {
    const url = new URL("http://localhost/ha-history");
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }

    return {
        request: new Request(url.toString(), {
            headers: headers === null
                ? {}
                : {
                    Authorization: "Bearer ha-token",
                    "x-ha-url": "http://192.168.0.2:8123",
                    ...headers,
                },
        }),
        url,
        fetch: eventFetch,
        cookies: { get: vi.fn(() => "session-id") },
    } as any;
}

describe("/ha-history", () => {
    beforeEach(() => {
        for (const key of Object.keys(mockEnv)) delete mockEnv[key];
        mockSessionTokens = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("rejects invalid path-like timestamps before proxying", async () => {
        const eventFetch = vi.fn();

        const response = await GET(historyEvent({
            timestamp: "2026-05-25T12:00:00.000Z/../../secret",
        }, eventFetch));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: "Invalid timestamp" });
        expect(eventFetch).not.toHaveBeenCalled();
    });

    it("rejects Home Assistant URLs outside http and https", async () => {
        const eventFetch = vi.fn();

        const response = await GET(historyEvent({
            timestamp: "2026-05-25T12:00:00.000Z",
        }, eventFetch, {
            "x-ha-url": "file:///etc/passwd",
        }));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: "Invalid Home Assistant URL" });
        expect(eventFetch).not.toHaveBeenCalled();
    });

    it("encodes the timestamp path segment and preserves the configured Host header", async () => {
        const eventFetch = vi.fn(async () => new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
        }));

        const response = await GET(historyEvent({
            timestamp: "2026-05-25T12:00:00.000Z",
            end_time: "2026-05-25T13:00:00.000Z",
            filter_entity_id: "sensor.energy",
        }, eventFetch));

        expect(response.status).toBe(200);
        expect(eventFetch).toHaveBeenCalledTimes(1);
        const [target, init] = eventFetch.mock.calls[0] as unknown as [string, RequestInit];
        const headers = new Headers(init.headers);

        expect(target).toContain("/api/history/period/2026-05-25T12%3A00%3A00.000Z");
        expect(target).toContain("end_time=2026-05-25T13%3A00%3A00.000Z");
        expect(target).toContain("filter_entity_id=sensor.energy");
        expect(headers.get("Authorization")).toBe("Bearer ha-token");
        expect(headers.get("Host")).toBe("192.168.0.2:8123");
    });

    it("does not return stack traces or internal fetch details in production responses", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const eventFetch = vi.fn(async () => {
            throw new Error("secret network detail");
        });

        const response = await GET(historyEvent({
            timestamp: "2026-05-25T12:00:00.000Z",
        }, eventFetch));

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body).toEqual({
            error: "Internal Proxy Error",
            message: "History proxy request failed",
        });
        expect(JSON.stringify(body)).not.toContain("secret network detail");
        expect(JSON.stringify(body)).not.toContain("stack");
    });

    it("uses the server-side Home Assistant session when browser auth headers are omitted", async () => {
        mockSessionTokens = {
            hassUrl: "http://192.168.0.5:8123",
            access_token: "session-token",
        };
        const eventFetch = vi.fn(async () => new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
        }));

        const response = await GET(historyEvent({
            timestamp: "2026-05-25T12:00:00.000Z",
            filter_entity_id: "sensor.energy",
        }, eventFetch, null));

        expect(response.status).toBe(200);
        const [target, init] = eventFetch.mock.calls[0] as unknown as [string, RequestInit];
        const headers = new Headers(init.headers);

        expect(target).toContain("http://192.168.0.5:8123/api/history/period/");
        expect(headers.get("Authorization")).toBe("Bearer session-token");
        expect(headers.get("Host")).toBe("192.168.0.5:8123");
    });

    it("allows server-owned add-on history proxying without exposing a browser token", async () => {
        mockEnv.DASHBOARD_DEPLOYMENT = "ha-addon";
        mockEnv.SUPERVISOR_TOKEN = "supervisor-secret";
        const eventFetch = vi.fn(async () => new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
        }));

        const response = await GET(historyEvent({
            timestamp: "2026-05-25T12:00:00.000Z",
            filter_entity_id: "sensor.energy",
        }, eventFetch, null));

        expect(response.status).toBe(200);
        const [target, init] = eventFetch.mock.calls[0] as unknown as [URL, RequestInit];
        const headers = new Headers(init.headers);

        expect(String(target)).toContain("http://supervisor/core/api/history/period/2026-05-25T12%3A00%3A00.000Z");
        expect(headers.get("Authorization")).toBe("Bearer supervisor-secret");
    });
});
