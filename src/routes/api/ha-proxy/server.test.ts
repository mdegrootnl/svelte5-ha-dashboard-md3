import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv: Record<string, string | undefined> = {};
let mockSessionTokens: any = null;

vi.mock("$env/dynamic/private", () => ({
    env: mockEnv,
}));

vi.mock("$lib/server/haSession", () => ({
    loadHaSessionTokensFromCookie: vi.fn(async () => mockSessionTokens),
}));

const { GET } = await import("./+server");

function proxyEvent(resourcePath: string, eventFetch = vi.fn(), headers: Record<string, string> = {
    Authorization: "Bearer ha-token",
    "x-ha-url": "http://ha.local:8123",
}) {
    const url = new URL("http://localhost/api/ha-proxy");
    url.searchParams.set("path", resourcePath);

    return {
        request: new Request(url.toString(), {
            headers,
        }),
        url,
        fetch: eventFetch,
        cookies: { get: vi.fn(() => "session-id") },
    } as any;
}

describe("/api/ha-proxy", () => {
    beforeEach(() => {
        for (const key of Object.keys(mockEnv)) delete mockEnv[key];
        mockSessionTokens = null;
    });

    it("rejects protocol-relative and absolute resource paths before proxying", async () => {
        const eventFetch = vi.fn();

        await expect(GET(proxyEvent("//attacker.example/capture", eventFetch))).rejects.toMatchObject({ status: 400 });
        await expect(GET(proxyEvent("https://attacker.example/capture", eventFetch))).rejects.toMatchObject({ status: 400 });

        expect(eventFetch).not.toHaveBeenCalled();
    });

    it("rejects dot-segment paths that could escape the allowed resource prefix", async () => {
        const eventFetch = vi.fn();

        await expect(GET(proxyEvent("/api/../secret", eventFetch))).rejects.toMatchObject({ status: 400 });

        expect(eventFetch).not.toHaveBeenCalled();
    });

    it("rejects unsupported Home Assistant resource paths", async () => {
        const eventFetch = vi.fn();

        await expect(GET(proxyEvent("/frontend_latest/app.js", eventFetch))).rejects.toMatchObject({ status: 403 });

        expect(eventFetch).not.toHaveBeenCalled();
    });

    it("proxies allowed Home Assistant resource paths to the configured origin", async () => {
        const eventFetch = vi.fn(async () => new Response("image", {
            headers: { "Content-Type": "image/jpeg" },
        }));

        const response = await GET(proxyEvent("local/kitchen.jpg", eventFetch));

        expect(response.status).toBe(200);
        expect(eventFetch).toHaveBeenCalledTimes(1);
        const [target, init] = eventFetch.mock.calls[0] as unknown as [URL, RequestInit];
        const headers = new Headers(init.headers);

        expect(String(target)).toBe("http://ha.local:8123/local/kitchen.jpg");
        expect(headers.get("Authorization")).toBe("Bearer ha-token");
    });

    it("uses the server-side Home Assistant session when browser auth headers are omitted", async () => {
        mockSessionTokens = {
            hassUrl: "http://session-ha.local:8123",
            access_token: "session-token",
        };
        const eventFetch = vi.fn(async () => new Response("image", {
            headers: { "Content-Type": "image/jpeg" },
        }));

        const response = await GET(proxyEvent("local/kitchen.jpg", eventFetch, {}));

        expect(response.status).toBe(200);
        const [target, init] = eventFetch.mock.calls[0] as unknown as [URL, RequestInit];
        const headers = new Headers(init.headers);

        expect(String(target)).toBe("http://session-ha.local:8123/local/kitchen.jpg");
        expect(headers.get("Authorization")).toBe("Bearer session-token");
    });

    it("allows server-owned add-on proxying without exposing a browser token", async () => {
        mockEnv.DASHBOARD_DEPLOYMENT = "ha-addon";
        mockEnv.SUPERVISOR_TOKEN = "supervisor-secret";
        const eventFetch = vi.fn(async () => new Response("image", {
            headers: { "Content-Type": "image/jpeg" },
        }));

        const response = await GET(proxyEvent("/media/local/radio.png", eventFetch, {}));

        expect(response.status).toBe(200);
        const [target, init] = eventFetch.mock.calls[0] as unknown as [URL, RequestInit];
        const headers = new Headers(init.headers);

        expect(String(target)).toBe("http://supervisor/core/media/local/radio.png");
        expect(headers.get("Authorization")).toBe("Bearer supervisor-secret");
    });
});
