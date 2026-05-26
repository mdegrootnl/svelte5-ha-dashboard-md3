import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validTokens = {
    hassUrl: "http://homeassistant.local:8123",
    clientId: "dashboard",
    expires: Date.now() + 3600_000,
    refresh_token: "refresh-secret",
    access_token: "access-secret",
    expires_in: 1800,
};

function requestWithJson(method: string, body: unknown) {
    return new Request("http://localhost/api/ha-session", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

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

describe("/api/ha-session", () => {
    let tempDir = "";
    const previousInternalUrl = process.env.DASHBOARD_HA_INTERNAL_URL;

    async function loadRoute() {
        vi.resetModules();
        vi.doMock("$lib/server/dataDir", () => ({
            getResolvedDataDir: () => tempDir,
        }));
        return import("./+server");
    }

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ha-session-route-"));
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

    it("stores tokens server-side and returns them through the HttpOnly session cookie", async () => {
        const route = await loadRoute();
        const jar = cookieJar();

        const post = await route.POST({
            request: requestWithJson("POST", { tokens: validTokens }),
            cookies: jar.cookies,
            url: new URL("http://localhost/api/ha-session"),
        } as any);

        expect(post.status).toBe(200);
        expect(jar.setCalls[0]).toMatchObject({
            name: "ha_dashboard_session",
            options: {
                httpOnly: true,
                sameSite: "lax",
                secure: false,
            },
        });
        expect(jar.setCalls[0].value).toHaveLength(64);

        const stored = await fs.readFile(path.join(tempDir, "ha-sessions.json"), "utf-8");
        expect(stored).toContain("refresh-secret");

        const get = await route.GET({ cookies: jar.cookies } as any);
        expect(get.headers.get("Cache-Control")).toBe("no-store");
        const publicBody = await get.json();
        expect(publicBody).toEqual({
            connected: true,
            hassUrl: "http://homeassistant.local:8123",
        });
        expect(JSON.stringify(publicBody)).not.toContain("access-secret");
        expect(JSON.stringify(publicBody)).not.toContain("refresh-secret");
    });

    it("uses the optional server-facing Home Assistant URL for stored standalone sessions", async () => {
        process.env.DASHBOARD_HA_INTERNAL_URL = "http://192.168.0.157:8123";
        const route = await loadRoute();
        const jar = cookieJar();

        await route.POST({
            request: requestWithJson("POST", { tokens: validTokens }),
            cookies: jar.cookies,
            url: new URL("http://localhost/api/ha-session"),
        } as any);

        const get = await route.GET({ cookies: jar.cookies } as any);
        await expect(get.json()).resolves.toEqual({
            connected: true,
            hassUrl: "http://192.168.0.157:8123",
        });
    });

    it("rejects invalid token payloads", async () => {
        const route = await loadRoute();
        const jar = cookieJar();

        const response = await route.POST({
            request: requestWithJson("POST", {
                tokens: {
                    ...validTokens,
                    hassUrl: "file:///etc/passwd",
                },
            }),
            cookies: jar.cookies,
            url: new URL("http://localhost/api/ha-session"),
        } as any);

        expect(response.status).toBe(400);
        expect(jar.setCalls).toHaveLength(0);
    });

    it("clears the server session and cookie", async () => {
        const route = await loadRoute();
        const jar = cookieJar();

        await route.POST({
            request: requestWithJson("POST", { tokens: validTokens }),
            cookies: jar.cookies,
            url: new URL("https://dashboard.local/api/ha-session"),
        } as any);

        const fetchMock = vi.fn(async () => new Response());
        const response = await route.DELETE({
            cookies: jar.cookies,
            fetch: fetchMock,
            url: new URL("https://dashboard.local/api/ha-session"),
        } as any);

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith(new URL("http://homeassistant.local:8123/auth/revoke"), expect.objectContaining({
            method: "POST",
        }));
        expect(jar.deleteCalls[0]).toMatchObject({
            name: "ha_dashboard_session",
            options: {
                path: "/",
                secure: true,
                sameSite: "lax",
            },
        });

        const get = await route.GET({ cookies: jar.cookies } as any);
        await expect(get.json()).resolves.toEqual({ connected: false, hassUrl: null });
    });
});
