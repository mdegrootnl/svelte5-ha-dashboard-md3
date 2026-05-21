/**
 * Music Library Store
 *
 * Keeps a fast local cache for startup, but treats the backend config as the
 * shared household source of truth. Mutations go through dedicated endpoints
 * so favorites/default player sync across devices without writing the whole
 * settings document from the browser.
 */

import { browser } from "$app/environment";
import { createLogger } from "$lib/utils/logger";
import type { MAMediaItem, MAMediaType } from "$lib/types/musicAssistant";
import type { MusicLibraryConfig } from "$lib/types/config";

const logger = createLogger("MusicLibraryStore");
const STORAGE_KEY = "music-library";
const LOCAL_IMPORT_KEY = "music-library-imported-to-server";

type MusicLibraryResponse = {
    musicLibrary?: MusicLibraryConfig;
    error?: string;
};

type ServerApplyOptions = {
    saveCache?: boolean;
};

function normalizeConfig(config?: MusicLibraryConfig | null): MusicLibraryConfig {
    return {
        favorites: config?.favorites ?? [],
        lastSyncedAt: config?.lastSyncedAt ?? 0,
        defaultPlayerId: config?.defaultPlayerId,
    };
}

async function readMusicLibraryResponse(response: Response): Promise<MusicLibraryConfig> {
    let payload: MusicLibraryResponse = {};

    try {
        payload = await response.json();
    } catch {
        // Keep the fallback error below.
    }

    if (!response.ok || !payload.musicLibrary) {
        throw new Error(payload.error || `Music library request failed (${response.status})`);
    }

    return normalizeConfig(payload.musicLibrary);
}

export class MusicLibraryStore {
    /** Array of favorited media items */
    favorites = $state<MAMediaItem[]>([]);

    /** Loading state for Music Assistant import operations */
    loading = $state(false);

    /** Loading state for backend persistence operations */
    syncing = $state(false);

    /** Last backend sync error, shown by the UI when present */
    syncError = $state<string | null>(null);

    /** Timestamp of the last successful server write/apply */
    lastServerSyncedAt = $state<number>(0);

    /** Timestamp of last MA sync */
    lastSyncedAt = $state<number>(0);

    /** Track if store has been initialized with server data */
    initialized = $state(false);

    /** ID of the default media player */
    defaultPlayerId = $state<string | undefined>(undefined);

    /** Set of favorite URIs for O(1) lookup */
    private favoriteUris = $derived(new Set(this.favorites.map((favorite) => favorite.uri)));

    private pendingWrites = 0;

    constructor() {
        if (browser) {
            this.loadFromLocalStorage();
        }
    }

    /**
     * Initialize from server config. Server config wins except for the one-time
     * migration where this browser has old local favorites and the backend is empty.
     */
    init(config: MusicLibraryConfig) {
        if (this.initialized) return;

        const serverConfig = normalizeConfig(config);
        const localConfig = normalizeConfig({
            favorites: this.favorites,
            lastSyncedAt: this.lastSyncedAt,
            defaultPlayerId: this.defaultPlayerId,
        });

        this.initialized = true;

        if (
            browser &&
            localConfig.favorites.length > 0 &&
            serverConfig.favorites.length === 0 &&
            !this.hasCompletedLocalImport()
        ) {
            logger.info("Adopting local music favorites as the initial server library.");
            this.applyServerConfig(localConfig);
            void this.importLocalLibrary(localConfig);
            return;
        }

        this.applyServerConfig(serverConfig);
        logger.info(
            `Initialized from server (${this.favorites.length} favorites, default player: ${this.defaultPlayerId})`,
        );
    }

    applyServerConfig(config: MusicLibraryConfig | undefined, options: ServerApplyOptions = {}) {
        const normalized = normalizeConfig(config);
        this.favorites = normalized.favorites;
        this.lastSyncedAt = normalized.lastSyncedAt;
        this.defaultPlayerId = normalized.defaultPlayerId;
        this.syncError = null;
        this.lastServerSyncedAt = Date.now();

        if (options.saveCache !== false) {
            this.saveToLocalStorage();
        }
    }

    async setDefaultPlayer(playerId: string | undefined): Promise<void> {
        const previous = this.snapshot();
        this.defaultPlayerId = playerId;
        this.saveToLocalStorage();

        await this.persistMutation(
            () =>
                fetch("/api/music-library/settings", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ defaultPlayerId: playerId ?? null }),
                }),
            previous,
            "Failed to set default music player",
        );
    }

    async addFavorite(item: MAMediaItem): Promise<void> {
        if (!item?.uri) {
            logger.warn("Cannot add item without URI");
            return;
        }

        if (this.isFavorite(item.uri)) {
            logger.info("Item already in favorites:", item.uri);
            return;
        }

        const previous = this.snapshot();
        this.favorites = [...this.favorites, item];
        this.saveToLocalStorage();

        await this.persistMutation(
            () =>
                fetch("/api/music-library/favorites", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ item }),
                }),
            previous,
            "Failed to add favorite",
        );
    }

    async removeFavorite(uri: string): Promise<void> {
        if (!uri) return;

        const previous = this.snapshot();
        this.favorites = this.favorites.filter((favorite) => favorite.uri !== uri);

        if (this.favorites.length === previous.favorites.length) {
            return;
        }

        this.saveToLocalStorage();

        await this.persistMutation(
            () =>
                fetch("/api/music-library/favorites/remove", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ uri }),
                }),
            previous,
            "Failed to remove favorite",
        );
    }

    async toggleFavorite(item: MAMediaItem): Promise<void> {
        if (this.isFavorite(item.uri)) {
            await this.removeFavorite(item.uri);
        } else {
            await this.addFavorite(item);
        }
    }

    isFavorite(uri: string): boolean {
        return this.favoriteUris.has(uri);
    }

    async purgeAll(): Promise<void> {
        const favorites = [...this.favorites];

        for (const favorite of favorites) {
            await this.removeFavorite(favorite.uri);
        }

        this.lastSyncedAt = 0;
        await this.patchLastSyncedAt(0);
        logger.info("Purged all favorites");
    }

    flushSync(): void {
        // Mutations are persisted immediately through dedicated endpoints.
    }

    async syncToServer(): Promise<void> {
        await this.patchLastSyncedAt(this.lastSyncedAt);
    }

    async syncFromMA(maStore: { getLibrary: (type: MAMediaType, options?: { favorite?: boolean }) => Promise<import("$lib/utils/result").Result<MAMediaItem[]>> }): Promise<void> {
        this.loading = true;
        this.syncError = null;

        try {
            const types = ["track", "album", "artist", "playlist", "radio"] as const;
            const allFavorites: MAMediaItem[] = [];

            for (const type of types) {
                try {
                    const result = await maStore.getLibrary(type, { favorite: true });
                    if (result.ok) {
                        allFavorites.push(...result.value);
                    } else {
                        logger.warn(`Failed to fetch ${type} favorites from MA:`, result.error);
                    }
                } catch (error) {
                    logger.warn(`Unexpected error fetching ${type} favorites from MA:`, error);
                }
            }

            const existingUris = new Set(this.favorites.map((favorite) => favorite.uri));
            const newItems = allFavorites.filter((item) => !existingUris.has(item.uri));

            for (const item of newItems) {
                await this.addFavorite(item);
            }

            this.lastSyncedAt = Date.now();
            await this.patchLastSyncedAt(this.lastSyncedAt);
            logger.info(`Synced ${newItems.length} new items from MA`);
        } catch (error) {
            this.syncError = error instanceof Error ? error.message : "Failed to sync from Music Assistant";
            logger.error("Failed to sync from MA:", error);
        } finally {
            this.loading = false;
        }
    }

    private async patchLastSyncedAt(lastSyncedAt: number): Promise<void> {
        const previous = this.snapshot();
        this.lastSyncedAt = lastSyncedAt;
        this.saveToLocalStorage();

        await this.persistMutation(
            () =>
                fetch("/api/music-library/settings", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ lastSyncedAt }),
                }),
            previous,
            "Failed to update music library sync timestamp",
        );
    }

    private async importLocalLibrary(config: MusicLibraryConfig): Promise<void> {
        const previous = this.snapshot();

        await this.persistMutation(
            () =>
                fetch("/api/music-library/import-local", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        favorites: config.favorites,
                        lastSyncedAt: config.lastSyncedAt,
                        defaultPlayerId: config.defaultPlayerId ?? null,
                    }),
                }),
            previous,
            "Failed to import local music favorites",
        );

        if (!this.syncError) {
            this.markLocalImportComplete();
        }
    }

    private async persistMutation(
        request: () => Promise<Response>,
        previous: MusicLibraryConfig,
        fallbackMessage: string,
    ): Promise<void> {
        this.beginWrite();

        try {
            const response = await request();
            const musicLibrary = await readMusicLibraryResponse(response);
            this.applyServerConfig(musicLibrary);
            this.syncError = null;
        } catch (error) {
            this.restore(previous);
            this.syncError = error instanceof Error ? error.message : fallbackMessage;
            logger.error(fallbackMessage, error);
        } finally {
            this.endWrite();
        }
    }

    private beginWrite() {
        this.pendingWrites += 1;
        this.syncing = true;
    }

    private endWrite() {
        this.pendingWrites = Math.max(0, this.pendingWrites - 1);
        this.syncing = this.pendingWrites > 0;
    }

    private snapshot(): MusicLibraryConfig {
        return {
            favorites: [...this.favorites],
            lastSyncedAt: this.lastSyncedAt,
            defaultPlayerId: this.defaultPlayerId,
        };
    }

    private restore(config: MusicLibraryConfig) {
        this.favorites = config.favorites;
        this.lastSyncedAt = config.lastSyncedAt;
        this.defaultPlayerId = config.defaultPlayerId;
        this.saveToLocalStorage();
    }

    private loadFromLocalStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = normalizeConfig(JSON.parse(stored));
                this.favorites = data.favorites;
                this.lastSyncedAt = data.lastSyncedAt;
                this.defaultPlayerId = data.defaultPlayerId;
                logger.info(`Loaded ${this.favorites.length} favorites from localStorage`);
            }
        } catch (error) {
            logger.error("Failed to load from localStorage:", error);
        }
    }

    private saveToLocalStorage(): void {
        if (!browser) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot()));
        } catch (error) {
            logger.error("Failed to save to localStorage:", error);
        }
    }

    private hasCompletedLocalImport() {
        if (!browser) return true;
        return localStorage.getItem(LOCAL_IMPORT_KEY) === "true";
    }

    private markLocalImportComplete() {
        if (!browser) return;
        localStorage.setItem(LOCAL_IMPORT_KEY, "true");
    }
}

export const musicLibraryStore = new MusicLibraryStore();
