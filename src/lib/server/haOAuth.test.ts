import { describe, expect, it, vi } from "vitest";
import {
    buildHaAuthorizeUrl,
    createHaOAuthState,
    decodeHaOAuthState,
    encodeHaOAuthState,
    exchangeHaAuthCode,
    checkHomeAssistantServerReachability,
    getConfiguredHomeAssistantInternalOrigin,
    revokeHaRefreshToken,
    resolveHomeAssistantServerOrigin,
    sanitizeHomeAssistantOrigin,
    sanitizeLocalReturnPath,
    validateOAuthCallback,
} from "./haOAuth";

describe("Home Assistant OAuth helpers", () => {
    it("sanitizes Home Assistant origins and local return paths", () => {
        expect(sanitizeHomeAssistantOrigin(" http://ha.local:8123/path ")).toBe("http://ha.local:8123");
        expect(sanitizeHomeAssistantOrigin("file:///etc/passwd")).toBeNull();
        expect(sanitizeHomeAssistantOrigin("https://user:pass@ha.local")).toBeNull();

        expect(sanitizeLocalReturnPath("/settings?tab=connections")).toBe("/settings?tab=connections");
        expect(sanitizeLocalReturnPath("https://evil.example/path")).toBe("/settings");
        expect(sanitizeLocalReturnPath("//evil.example/path")).toBe("/settings");
    });

    it("round-trips short-lived OAuth state and rejects expired state", () => {
        const state = createHaOAuthState({
            state: "abc",
            hassUrl: "http://ha.local:8123",
            serverHassUrl: "http://192.168.0.157:8123",
            clientId: "http://dashboard.local/",
            redirectUri: "http://dashboard.local/api/ha-session/auth/callback",
            returnTo: "/settings",
            now: 1_000,
        });

        const encoded = encodeHaOAuthState(state);

        expect(decodeHaOAuthState(encoded, 1_500)).toMatchObject({
            state: "abc",
            hassUrl: "http://ha.local:8123",
            serverHassUrl: "http://192.168.0.157:8123",
        });
        expect(decodeHaOAuthState(encoded, 11 * 60 * 1000)).toBeNull();
    });

    it("resolves an optional server-facing Home Assistant URL", () => {
        expect(getConfiguredHomeAssistantInternalOrigin({
            DASHBOARD_HA_INTERNAL_URL: " http://192.168.0.157:8123/lovelace ",
        })).toBe("http://192.168.0.157:8123");
        expect(resolveHomeAssistantServerOrigin("http://ha.local:8123", {
            DASHBOARD_HA_INTERNAL_URL: "file:///etc/passwd",
        })).toBe("http://ha.local:8123");
    });

    it("builds an authorize URL and validates callback state", () => {
        const state = createHaOAuthState({
            state: "abc",
            hassUrl: "http://ha.local:8123",
            clientId: "http://dashboard.local/",
            redirectUri: "http://dashboard.local/api/ha-session/auth/callback",
        });
        const authorizeUrl = new URL(buildHaAuthorizeUrl(state));

        expect(authorizeUrl.origin).toBe("http://ha.local:8123");
        expect(authorizeUrl.pathname).toBe("/auth/authorize");
        expect(authorizeUrl.searchParams.get("response_type")).toBe("code");
        expect(authorizeUrl.searchParams.get("client_id")).toBe("http://dashboard.local/");

        expect(validateOAuthCallback({ code: "code", state: "abc", stored: state })).toMatchObject({
            ok: true,
            code: "code",
        });
        expect(validateOAuthCallback({ code: "code", state: "wrong", stored: state })).toMatchObject({
            ok: false,
        });
    });

    it("exchanges an auth code server-side and shapes Home Assistant tokens", async () => {
        const fetch = vi.fn(async () => new Response(JSON.stringify({
            access_token: "access-secret",
            refresh_token: "refresh-secret",
            expires_in: 1800,
        }))) as unknown as typeof globalThis.fetch;

        const token = await exchangeHaAuthCode({
            fetch,
            hassUrl: "http://ha.local:8123",
            clientId: "http://dashboard.local/",
            code: "code",
        });

        expect(fetch).toHaveBeenCalledWith(new URL("http://ha.local:8123/auth/token"), expect.objectContaining({
            method: "POST",
        }));
        expect(token).toMatchObject({
            hassUrl: "http://ha.local:8123",
            clientId: "http://dashboard.local/",
            access_token: "access-secret",
            refresh_token: "refresh-secret",
        });
    });

    it("revokes refresh tokens against the configured Home Assistant origin", async () => {
        const fetch = vi.fn(async () => new Response()) as unknown as typeof globalThis.fetch;

        await revokeHaRefreshToken({
            fetch,
            hassUrl: "http://ha.local:8123/path",
            refreshToken: "refresh-secret",
        });

        expect(fetch).toHaveBeenCalledWith(new URL("http://ha.local:8123/auth/revoke"), expect.objectContaining({
            method: "POST",
        }));
    });

    it("preflights server-side Home Assistant reachability", async () => {
        const fetch = vi.fn(async () => new Response("ok", { status: 200 })) as unknown as typeof globalThis.fetch;

        await expect(checkHomeAssistantServerReachability({
            fetch,
            hassUrl: "http://ha.local:8123",
        })).resolves.toEqual({ ok: true });

        expect(fetch).toHaveBeenCalledWith(new URL("http://ha.local:8123/"), expect.objectContaining({
            method: "GET",
        }));
    });
});
