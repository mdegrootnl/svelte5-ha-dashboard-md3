import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MAMediaItem } from "$lib/types/musicAssistant";

describe("MusicLibraryService", () => {
    let tempDir = "";
    let MusicLibraryService: typeof import("./musicLibrary").MusicLibraryService;

    const track = (uri: string, name = "Track"): MAMediaItem => ({
        uri,
        name,
        media_type: "track",
    } as MAMediaItem);

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "music-library-"));
        vi.resetModules();
        vi.doMock("$lib/server/dataDir", () => ({
            getResolvedDataDir: () => tempDir,
            getDataPath: (file: string) => path.join(tempDir, file),
        }));
        ({ MusicLibraryService } = await import("./musicLibrary"));
    });

    afterEach(async () => {
        vi.doUnmock("$lib/server/dataDir");
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("adds favorites atomically and merges duplicates by uri", async () => {
        await MusicLibraryService.addFavorite(track("mass://track/1", "Original"));
        await MusicLibraryService.addFavorite(track("mass://track/1", "Updated"));

        const musicLibrary = await MusicLibraryService.load();
        expect(musicLibrary.favorites).toHaveLength(1);
        expect(musicLibrary.favorites[0]).toMatchObject({
            uri: "mass://track/1",
            name: "Updated",
        });
    });

    it("removes favorites without disturbing other music settings", async () => {
        await MusicLibraryService.addFavorite(track("mass://track/1"));
        await MusicLibraryService.addFavorite(track("mass://track/2"));
        await MusicLibraryService.patchSettings({ defaultPlayerId: "media_player.living_room" });

        const result = await MusicLibraryService.removeFavorite("mass://track/1");

        expect(result.changed).toBe(true);
        expect(result.musicLibrary.favorites.map((item) => item.uri)).toEqual(["mass://track/2"]);
        expect(result.musicLibrary.defaultPlayerId).toBe("media_player.living_room");
    });

    it("patches default player and sync timestamp", async () => {
        await MusicLibraryService.patchSettings({
            defaultPlayerId: "media_player.kitchen",
            lastSyncedAt: 123,
        });

        let musicLibrary = await MusicLibraryService.load();
        expect(musicLibrary.defaultPlayerId).toBe("media_player.kitchen");
        expect(musicLibrary.lastSyncedAt).toBe(123);

        await MusicLibraryService.patchSettings({ defaultPlayerId: null });
        musicLibrary = await MusicLibraryService.load();
        expect(musicLibrary.defaultPlayerId).toBeUndefined();
        expect(musicLibrary.lastSyncedAt).toBe(123);
    });

    it("imports local favorites only while the backend library is empty", async () => {
        const first = await MusicLibraryService.importLocal({
            favorites: [track("mass://track/local")],
            defaultPlayerId: "media_player.local",
            lastSyncedAt: 500,
        });
        const second = await MusicLibraryService.importLocal({
            favorites: [track("mass://track/other")],
            defaultPlayerId: "media_player.other",
        });

        expect(first.changed).toBe(true);
        expect(second.changed).toBe(false);
        expect(second.musicLibrary.favorites.map((item) => item.uri)).toEqual(["mass://track/local"]);
        expect(second.musicLibrary.defaultPlayerId).toBe("media_player.local");
        expect(second.musicLibrary.lastSyncedAt).toBe(500);
    });
});
