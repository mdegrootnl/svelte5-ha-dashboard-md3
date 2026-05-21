import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Albert Heijn settings", () => {
    let tempDir = "";
    let AhSettingsService: typeof import("./ahSettings").AhSettingsService;
    let sanitizeAhToken: typeof import("./ahSettings").sanitizeAhToken;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ah-settings-"));
        vi.resetModules();
        vi.doMock("$lib/server/dataDir", () => ({
            getResolvedDataDir: () => tempDir,
        }));
        ({ AhSettingsService, sanitizeAhToken } = await import("./ahSettings"));
    });

    afterEach(async () => {
        vi.doUnmock("$lib/server/dataDir");
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("sanitizes token values", () => {
        expect(sanitizeAhToken("  token  ")).toBe("token");
        expect(sanitizeAhToken("")).toBeUndefined();
        expect(sanitizeAhToken(null)).toBeUndefined();
    });

    it("persists tokens server-side while status hides token values", async () => {
        await AhSettingsService.saveTokenResponse({
            access_token: "access-secret",
            refresh_token: "refresh-secret",
            member_id: "member-1",
            expires_in: 3600,
        });

        const stored = JSON.parse(await fs.readFile(path.join(tempDir, "ah-settings.json"), "utf-8"));
        expect(stored.accessToken).toBe("access-secret");
        expect(stored.refreshToken).toBe("refresh-secret");

        const status = await AhSettingsService.getStatus();
        expect(status).toMatchObject({
            configured: true,
            authenticated: true,
            needsReconnect: false,
        });
        expect(JSON.stringify(status)).not.toContain("secret");
    });

    it("keeps the existing refresh token when a refresh response omits it", async () => {
        await AhSettingsService.saveTokenResponse({
            access_token: "access-secret",
            refresh_token: "refresh-secret",
            expires_in: 3600,
        });

        await AhSettingsService.saveTokenResponse({
            access_token: "new-access-secret",
            expires_in: 3600,
        });

        const runtime = await AhSettingsService.loadRuntime();
        expect(runtime.accessToken).toBe("new-access-secret");
        expect(runtime.refreshToken).toBe("refresh-secret");
    });

    it("clears runtime credentials", async () => {
        await AhSettingsService.saveRuntime({ accessToken: "access-secret", refreshToken: "refresh-secret" });
        await AhSettingsService.clearRuntime();
        expect(await AhSettingsService.loadRuntime()).toEqual({});
    });
});
