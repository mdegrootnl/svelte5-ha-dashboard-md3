import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function requestWithJson(url: string, method: string, body: unknown) {
    return new Request(url, {
        method,
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(body),
    });
}

describe("/api/music-library", () => {
    let tempDir = "";

    async function loadRoutes() {
        vi.resetModules();
        vi.doMock("$lib/server/dataDir", () => ({
            getResolvedDataDir: () => tempDir,
            getDataPath: (file: string) => path.join(tempDir, file),
        }));

        const [root, favorites, remove, settings, importLocal, events] = await Promise.all([
            import("./+server"),
            import("./favorites/+server"),
            import("./favorites/remove/+server"),
            import("./settings/+server"),
            import("./import-local/+server"),
            import("$lib/server/events"),
        ]);

        return { root, favorites, remove, settings, importLocal, events };
    }

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "music-library-routes-"));
    });

    afterEach(async () => {
        vi.doUnmock("$lib/server/dataDir");
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("adds and removes favorites through dedicated endpoints and emits config events", async () => {
        const { root, favorites, remove, events } = await loadRoutes();
        let emitted = 0;
        const listener = () => {
            emitted += 1;
        };
        events.configEvents.on(events.CONFIG_CHANGED_EVENT, listener);

        const addResponse = await favorites.POST({
            request: requestWithJson("http://localhost/api/music-library/favorites", "POST", {
                item: {
                    uri: "mass://track/1",
                    name: "Test Track",
                    media_type: "track",
                },
            }),
        } as any);
        expect(addResponse.status).toBe(200);

        let getResponse = await root.GET({} as any);
        await expect(getResponse.json()).resolves.toMatchObject({
            musicLibrary: {
                favorites: [{ uri: "mass://track/1", name: "Test Track" }],
            },
        });

        const removeResponse = await remove.POST({
            request: requestWithJson("http://localhost/api/music-library/favorites/remove", "POST", {
                uri: "mass://track/1",
            }),
        } as any);
        expect(removeResponse.status).toBe(200);

        getResponse = await root.GET({} as any);
        await expect(getResponse.json()).resolves.toMatchObject({
            musicLibrary: {
                favorites: [],
            },
        });
        expect(emitted).toBe(2);
        events.configEvents.off(events.CONFIG_CHANGED_EVENT, listener);
    });

    it("patches default player settings", async () => {
        const { root, settings } = await loadRoutes();

        const response = await settings.PATCH({
            request: requestWithJson("http://localhost/api/music-library/settings", "PATCH", {
                defaultPlayerId: "media_player.office",
                lastSyncedAt: 42,
            }),
        } as any);

        expect(response.status).toBe(200);
        const getResponse = await root.GET({} as any);
        await expect(getResponse.json()).resolves.toMatchObject({
            musicLibrary: {
                defaultPlayerId: "media_player.office",
                lastSyncedAt: 42,
            },
        });
    });

    it("imports old local favorites only when the backend is empty", async () => {
        const { importLocal } = await loadRoutes();

        const first = await importLocal.POST({
            request: requestWithJson("http://localhost/api/music-library/import-local", "POST", {
                favorites: [{ uri: "mass://track/local", name: "Local", media_type: "track" }],
                defaultPlayerId: "media_player.local",
            }),
        } as any);
        await expect(first.json()).resolves.toMatchObject({
            imported: true,
            musicLibrary: {
                favorites: [{ uri: "mass://track/local" }],
                defaultPlayerId: "media_player.local",
            },
        });

        const second = await importLocal.POST({
            request: requestWithJson("http://localhost/api/music-library/import-local", "POST", {
                favorites: [{ uri: "mass://track/other", name: "Other", media_type: "track" }],
                defaultPlayerId: "media_player.other",
            }),
        } as any);
        await expect(second.json()).resolves.toMatchObject({
            imported: false,
            musicLibrary: {
                favorites: [{ uri: "mass://track/local" }],
                defaultPlayerId: "media_player.local",
            },
        });
    });
});
