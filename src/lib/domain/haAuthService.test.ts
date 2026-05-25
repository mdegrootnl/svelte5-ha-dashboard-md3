import { beforeEach, describe, expect, it, vi } from "vitest";
import { HAAuthService } from "./haAuthService";
import { StorageProvider } from "$lib/utils/storageProvider";

vi.mock("$app/environment", () => ({
    browser: true,
    dev: false,
}));

vi.mock("home-assistant-js-websocket", () => ({
    ERR_HASS_HOST_REQUIRED: "ERR_HASS_HOST_REQUIRED",
}));

describe("HAAuthService", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it("initializes standalone mode with a browser-safe websocket proxy auth when a server session exists", async () => {
        vi.spyOn(StorageProvider, "loadSessionInfo").mockResolvedValue({
            connected: true,
            hassUrl: "http://ha.local:8123",
        });
        vi.spyOn(StorageProvider, "migrateLegacyTokensToServer").mockResolvedValue(null);

        const auth = await HAAuthService.initialize();

        expect(auth?.data.hassUrl).toBe("http://ha.local:8123");
        expect(auth?.accessToken).toBe("__dashboard_ha_session__");
        expect(auth?.wsUrl).toContain("/api/ha-websocket");
        expect(StorageProvider.migrateLegacyTokensToServer).not.toHaveBeenCalled();
    });

    it("starts a server-owned OAuth flow without exposing tokens to the browser", async () => {
        vi.spyOn(StorageProvider, "startServerAuth").mockResolvedValue({
            authorizeUrl: "http://ha.local:8123/auth/authorize?state=state",
        });
        const saveTokens = vi.spyOn(StorageProvider, "saveTokensToServer").mockResolvedValue(undefined);
        const redirect = vi.spyOn(HAAuthService, "redirectToAuthorizeUrl").mockImplementation(() => undefined);

        void HAAuthService.login("http://ha.local:8123");
        await vi.waitFor(() => expect(StorageProvider.startServerAuth).toHaveBeenCalledWith("http://ha.local:8123"));

        expect(redirect).toHaveBeenCalledWith("http://ha.local:8123/auth/authorize?state=state");
        expect(saveTokens).not.toHaveBeenCalled();
    });

    it("fetches proxied blobs through the server session without browser HA bearer headers", async () => {
        const createObjectURL = vi.fn(() => "blob:proxied");
        vi.stubGlobal("URL", Object.assign(URL, { createObjectURL }));
        const fetchMock = vi.fn(async () => new Response("image"));
        vi.stubGlobal("fetch", fetchMock);

        const result = await HAAuthService.fetchProxiedBlobUrl(
            "/local/kitchen.jpg",
            "http://ha.local:8123",
            "browser-token",
        );

        expect(result).toBe("blob:proxied");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [target, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        const headers = new Headers(init.headers);

        expect(target).toBe("/api/ha-proxy?path=%2Flocal%2Fkitchen.jpg");
        expect(init.credentials).toBe("same-origin");
        expect(headers.has("Authorization")).toBe(false);
        expect(headers.has("x-ha-url")).toBe(false);
    });
});
