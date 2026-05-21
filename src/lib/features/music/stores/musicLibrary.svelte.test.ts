import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicLibraryStore } from "./musicLibrary.svelte";
import type { MAMediaItem } from "$lib/types/musicAssistant";
import type { MusicLibraryConfig } from "$lib/types/config";

const STORAGE_KEY = "music-library";
const LOCAL_IMPORT_KEY = "music-library-imported-to-server";

function item(uri: string, name = "Track"): MAMediaItem {
    return {
        uri,
        name,
        media_type: "track",
    } as MAMediaItem;
}

function response(musicLibrary: MusicLibraryConfig, ok = true) {
    return new Response(JSON.stringify({ musicLibrary }), {
        status: ok ? 200 : 500,
        headers: {
            "content-type": "application/json",
        },
    });
}

describe("MusicLibraryStore", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("lets server config win over the local cache after initialization", () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                favorites: [item("mass://track/local", "Local")],
                lastSyncedAt: 1,
                defaultPlayerId: "media_player.local",
            }),
        );
        localStorage.setItem(LOCAL_IMPORT_KEY, "true");

        const store = new MusicLibraryStore();
        store.init({
            favorites: [item("mass://track/server", "Server")],
            lastSyncedAt: 2,
            defaultPlayerId: "media_player.server",
        });

        expect(store.favorites.map((favorite) => favorite.uri)).toEqual(["mass://track/server"]);
        expect(store.defaultPlayerId).toBe("media_player.server");
        expect(fetch).not.toHaveBeenCalled();
    });

    it("imports old local favorites once when the backend library is empty", async () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                favorites: [item("mass://track/local", "Local")],
                lastSyncedAt: 10,
                defaultPlayerId: "media_player.local",
            }),
        );

        vi.mocked(fetch).mockResolvedValueOnce(response({
            favorites: [item("mass://track/local", "Local")],
            lastSyncedAt: 10,
            defaultPlayerId: "media_player.local",
        }));

        const store = new MusicLibraryStore();
        store.init({ favorites: [], lastSyncedAt: 0 });

        await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        expect(fetch).toHaveBeenCalledWith(
            "/api/music-library/import-local",
            expect.objectContaining({ method: "POST" }),
        );
        await vi.waitFor(() => expect(localStorage.getItem(LOCAL_IMPORT_KEY)).toBe("true"));
        expect(store.favorites.map((favorite) => favorite.uri)).toEqual(["mass://track/local"]);
    });

    it("does not resurrect old local favorites after the one-time import flag is set", () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                favorites: [item("mass://track/local", "Local")],
                lastSyncedAt: 10,
            }),
        );
        localStorage.setItem(LOCAL_IMPORT_KEY, "true");

        const store = new MusicLibraryStore();
        store.init({ favorites: [], lastSyncedAt: 0 });

        expect(store.favorites).toEqual([]);
        expect(fetch).not.toHaveBeenCalled();
    });

    it("updates optimistically and replaces state with the server response", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(response({
            favorites: [item("mass://track/1", "Server Name")],
            lastSyncedAt: 0,
        }));

        const store = new MusicLibraryStore();
        store.init({ favorites: [], lastSyncedAt: 0 });

        await store.addFavorite(item("mass://track/1", "Local Name"));

        expect(store.syncError).toBeNull();
        expect(store.syncing).toBe(false);
        expect(store.favorites[0].name).toBe("Server Name");
    });

    it("sets syncError and restores previous state when a write fails", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ error: "Backend unavailable" }), {
                status: 503,
                headers: { "content-type": "application/json" },
            }),
        );

        const store = new MusicLibraryStore();
        store.init({ favorites: [item("mass://track/existing", "Existing")], lastSyncedAt: 0 });

        await store.addFavorite(item("mass://track/new", "New"));

        expect(store.syncError).toBe("Backend unavailable");
        expect(store.syncing).toBe(false);
        expect(store.favorites.map((favorite) => favorite.uri)).toEqual(["mass://track/existing"]);
    });

    it("can apply a remote server update to simulate another device syncing", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(response({
            favorites: [item("mass://track/a", "A")],
            lastSyncedAt: 0,
        }));

        const deviceA = new MusicLibraryStore();
        const deviceB = new MusicLibraryStore();
        deviceA.init({ favorites: [], lastSyncedAt: 0 });
        deviceB.init({ favorites: [], lastSyncedAt: 0 });

        await deviceA.addFavorite(item("mass://track/a", "A"));
        deviceB.applyServerConfig({
            favorites: deviceA.favorites,
            lastSyncedAt: deviceA.lastSyncedAt,
            defaultPlayerId: deviceA.defaultPlayerId,
        });

        expect(deviceB.isFavorite("mass://track/a")).toBe(true);
    });
});
