import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HA_OAUTH_STATE_COOKIE } from "$lib/server/haOAuth";
import { HA_SESSION_COOKIE } from "$lib/server/haSession";

function cookieJar() {
    const values = new Map<string, string>();
    const setCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const deleteCalls: Array<{ name: string; options: Record<string, unknown> }> = [];

    return {
        values,
        setCalls,
        deleteCalls,
        cookies: {
            get: (name: string) => values.get(name),
            set: (name: string, value: string, options: Record<string, unknown>) => {
                values.set(name, value);
                setCalls.push({ name, value, options });
            },
            delete: (name: string, options: Record<string, unknown>) => {
                values.delete(name);
                deleteCalls.push({ name, options });
            },
        },
    };
}

function redirectLocation(error: unknown) {
    return error && typeof error === "object" && "location" in error
        ? String((error as { location: string }).location)
        : "";
}

describe("/api/ha-session/auth", () => {
    let tempDir = "";
    const previousInternalUrl = process.env.DASHBOARD_HA_INTERNAL_URL;

    async function loadRoutes() {
        vi.resetModules();
        vi.doMock("$lib/server/dataDir", () => ({
            getResolvedDataDir: () => tempDir,
        }));
        const start = await import("./start/+server");
        const callback = await import("./callback/+server");
        return { start, callback };
    }

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ha-session-auth-route-"));
    });

    afterEach(async () => {
        vi.doUnmock("$lib/server/dataDir");
        if (previousInternalUrl === undefined) {
            delete process.env.DASHBOARD_HA_INTERNAL_URL;
        } else {
            process.env.DASHBOARD_HA_INTERNAL_URL = previousInternalUrl;
        }
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("starts a server-owned Home Assistant OAuth flow with HttpOnly state", async () => {
        const { start } = await loadRoutes();
        const jar = cookieJar();

        const response = await start.POST({
            request: new Request("http://dashboard.local/api/ha-session/auth/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hassUrl: "http://ha.local:8123/lovelace",
                    returnTo: "/settings?tab=connections",
                }),
            }),
            cookies: jar.cookies,
            url: new URL("http://dashboard.local/api/ha-session/auth/start"),
            fetch: vi.fn(async () => new Response()) as unknown as typeof globalThis.fetch,
        } as any);

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(jar.setCalls[0]).toMatchObject({
            name: HA_OAUTH_STATE_COOKIE,
            options: {
                httpOnly: true,
                sameSite: "lax",
                secure: false,
            },
        });

        const body = await response.json();
        const authorizeUrl = new URL(body.authorizeUrl);
        expect(authorizeUrl.origin).toBe("http://ha.local:8123");
        expect(authorizeUrl.searchParams.get("redirect_uri")).toBe("http://dashboard.local/api/ha-session/auth/callback");
        expect(authorizeUrl.searchParams.get("client_id")).toBe("http://dashboard.local/");
    });

    it("exchanges the callback code server-side, stores tokens, and redirects to the app", async () => {
        const { start, callback } = await loadRoutes();
        const jar = cookieJar();

        const startResponse = await start.POST({
            request: new Request("https://dashboard.local/api/ha-session/auth/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hassUrl: "http://ha.local:8123",
                    returnTo: "/settings?tab=connections",
                }),
            }),
            cookies: jar.cookies,
            url: new URL("https://dashboard.local/api/ha-session/auth/start"),
            fetch: vi.fn(async () => new Response()) as unknown as typeof globalThis.fetch,
        } as any);
        const authorizeBody = await startResponse.json();
        const state = new URL(authorizeBody.authorizeUrl).searchParams.get("state");

        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            access_token: "access-secret",
            refresh_token: "refresh-secret",
            expires_in: 1800,
        }))) as unknown as typeof globalThis.fetch;

        await expect(callback.GET({
            cookies: jar.cookies,
            fetch: fetchMock,
            url: new URL(`https://dashboard.local/api/ha-session/auth/callback?code=abc&state=${state}`),
        } as any)).rejects.toMatchObject({
            status: 303,
            location: "/settings?tab=connections&haLogin=success",
        });

        expect(jar.setCalls.some((call) => call.name === HA_SESSION_COOKIE && call.options.httpOnly === true)).toBe(true);
        expect(jar.deleteCalls.some((call) => call.name === HA_OAUTH_STATE_COOKIE)).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(new URL("http://ha.local:8123/auth/token"), expect.objectContaining({
            method: "POST",
        }));

        const stored = await fs.readFile(path.join(tempDir, "ha-sessions.json"), "utf-8");
        expect(stored).toContain("refresh-secret");
    });

    it("uses a server-facing Home Assistant URL for reachability and token exchange", async () => {
        process.env.DASHBOARD_HA_INTERNAL_URL = "http://192.168.0.157:8123";
        const { start, callback } = await loadRoutes();
        const jar = cookieJar();
        const preflightFetch = vi.fn(async () => new Response()) as unknown as typeof globalThis.fetch;

        const startResponse = await start.POST({
            request: new Request("https://dashboard.local/api/ha-session/auth/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hassUrl: "http://homeassistant.local:8123",
                    returnTo: "/settings?tab=connections",
                }),
            }),
            cookies: jar.cookies,
            url: new URL("https://dashboard.local/api/ha-session/auth/start"),
            fetch: preflightFetch,
        } as any);
        const authorizeBody = await startResponse.json();
        const authorizeUrl = new URL(authorizeBody.authorizeUrl);
        const state = authorizeUrl.searchParams.get("state");

        expect(preflightFetch).toHaveBeenCalledWith(new URL("http://192.168.0.157:8123/"), expect.objectContaining({
            method: "GET",
        }));
        expect(authorizeUrl.origin).toBe("http://homeassistant.local:8123");

        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            access_token: "access-secret",
            refresh_token: "refresh-secret",
            expires_in: 1800,
        }))) as unknown as typeof globalThis.fetch;

        await expect(callback.GET({
            cookies: jar.cookies,
            fetch: fetchMock,
            url: new URL(`https://dashboard.local/api/ha-session/auth/callback?code=abc&state=${state}`),
        } as any)).rejects.toMatchObject({
            status: 303,
            location: "/settings?tab=connections&haLogin=success",
        });

        expect(fetchMock).toHaveBeenCalledWith(new URL("http://192.168.0.157:8123/auth/token"), expect.objectContaining({
            method: "POST",
        }));
    });

    it("returns an actionable error when the dashboard server cannot reach Home Assistant", async () => {
        const { start } = await loadRoutes();
        const jar = cookieJar();

        const response = await start.POST({
            request: new Request("http://dashboard.local/api/ha-session/auth/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hassUrl: "http://homeassistant.local:8123",
                    returnTo: "/settings",
                }),
            }),
            cookies: jar.cookies,
            url: new URL("http://dashboard.local/api/ha-session/auth/start"),
            fetch: vi.fn(async () => {
                throw new Error("getaddrinfo ENOTFOUND homeassistant.local");
            }) as unknown as typeof globalThis.fetch,
        } as any);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({
            error: "Home Assistant is not reachable from the dashboard server.",
            serverHassUrl: "http://homeassistant.local:8123",
        });
        expect(jar.setCalls).toHaveLength(0);
    });

    it("rejects callbacks with mismatched state before token exchange", async () => {
        const { start, callback } = await loadRoutes();
        const jar = cookieJar();

        await start.POST({
            request: new Request("http://dashboard.local/api/ha-session/auth/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hassUrl: "http://ha.local:8123",
                    returnTo: "/settings",
                }),
            }),
            cookies: jar.cookies,
            url: new URL("http://dashboard.local/api/ha-session/auth/start"),
            fetch: vi.fn(async () => new Response()) as unknown as typeof globalThis.fetch,
        } as any);

        const fetchMock = vi.fn() as unknown as typeof globalThis.fetch;
        let thrown: unknown;
        try {
            await callback.GET({
                cookies: jar.cookies,
                fetch: fetchMock,
                url: new URL("http://dashboard.local/api/ha-session/auth/callback?code=abc&state=wrong"),
            } as any);
        } catch (error) {
            thrown = error;
        }

        expect(redirectLocation(thrown)).toBe("/settings?haLogin=error");
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
