/**
 * Music Library Store
 * 
 * Local library for storing user favorites independently from Music Assistant.
 * Since MA's library_add/library_remove services are not exposed via HA,
 * this store provides a local solution with localStorage + server persistence.
 */

import { browser } from '$app/environment';
import { createLogger } from '$lib/utils/logger';
import type { MAMediaItem, MAMediaType } from '$lib/types/musicAssistant';
import type { MusicLibraryConfig } from '$lib/types/config';

const logger = createLogger('MusicLibraryStore');
const STORAGE_KEY = 'music-library';
const SYNC_DEBOUNCE_MS = 2000;

/**
 * Music Library Store - Manages local favorites with localStorage + server persistence
 */
export class MusicLibraryStore {
    // ========================================================================
    // State
    // ========================================================================

    /** Array of favorited media items */
    favorites = $state<MAMediaItem[]>([]);

    /** Loading state for sync operations */
    loading = $state(false);

    /** Timestamp of last MA sync */
    lastSyncedAt = $state<number>(0);

    /** Track if store has been initialized with server data */
    initialized = $state(false);

    /** ID of the default media player */
    defaultPlayerId = $state<string | undefined>(undefined);

    /** Set of favorite URIs for O(1) lookup */
    private favoriteUris = $derived(new Set(this.favorites.map(f => f.uri)));

    /** Debounce timer for server sync */
    private syncTimer: ReturnType<typeof setTimeout> | null = null;

    // ========================================================================
    // Initialization
    // ========================================================================

    constructor() {
        if (browser) {
            this.loadFromLocalStorage();
        }
    }

    /**
     * Initialize from server config (called on page load)
     * Server is the source of truth, but we handle the "first adoption" case
     * where localStorage has data but the server doesn't yet.
     */
    init(config: MusicLibraryConfig) {
        if (this.initialized) return;

        const serverFavorites = config?.favorites || [];
        const serverLastSyncedAt = config?.lastSyncedAt || 0;
        const serverDefaultPlayerId = config?.defaultPlayerId;

        // Adoption case: Local has data, Server is empty.
        // We push local data to server to "adopt" it as the starting point.
        if (this.favorites.length > 0 && serverFavorites.length === 0 && !serverDefaultPlayerId) {
            logger.info('Adopting local favorites as server source of truth.');
            this.scheduleSyncToServer();
            this.initialized = true;
            return;
        }

        // Server is source of truth
        this.favorites = serverFavorites;
        this.lastSyncedAt = serverLastSyncedAt;
        this.defaultPlayerId = serverDefaultPlayerId;
        this.initialized = true;

        logger.info(`Initialized from server (${this.favorites.length} favorites, default player: ${this.defaultPlayerId})`);
    }

    /**
     * Set the default player ID
     */
    setDefaultPlayer(playerId: string | undefined): void {
        this.defaultPlayerId = playerId;
        this.persistChanges();
        logger.info('Set default player:', playerId);
    }

    // ========================================================================
    // Favorites Management
    // ========================================================================

    /**
     * Add an item to favorites
     */
    addFavorite(item: MAMediaItem): void {
        if (!item?.uri) {
            logger.warn('Cannot add item without URI');
            return;
        }

        // Check if already a favorite
        if (this.isFavorite(item.uri)) {
            logger.info('Item already in favorites:', item.uri);
            return;
        }

        this.favorites = [...this.favorites, item];
        this.persistChanges();
        logger.info('Added to favorites:', item.name);
    }

    /**
     * Remove an item from favorites by URI
     */
    removeFavorite(uri: string): void {
        if (!uri) return;

        const before = this.favorites.length;
        this.favorites = this.favorites.filter(f => f.uri !== uri);

        if (this.favorites.length < before) {
            this.persistChanges();
            logger.info('Removed from favorites:', uri);
        }
    }

    /**
     * Toggle favorite status for an item
     */
    toggleFavorite(item: MAMediaItem): void {
        if (this.isFavorite(item.uri)) {
            this.removeFavorite(item.uri);
        } else {
            this.addFavorite(item);
        }
    }

    /**
     * Check if an item is in favorites
     */
    isFavorite(uri: string): boolean {
        return this.favoriteUris.has(uri);
    }

    /**
     * Clear all favorites
     */
    purgeAll(): void {
        this.favorites = [];
        this.lastSyncedAt = 0;
        this.persistChanges();
        logger.info('Purged all favorites');
    }

    // ========================================================================
    // Persistence
    // ========================================================================

    /**
     * Helper to save changes (localStorage + server sync)
     */
    private persistChanges(): void {
        this.saveToLocalStorage();
        this.scheduleSyncToServer();
    }

    /**
     * Load favorites from localStorage
     */
    private loadFromLocalStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.favorites = data.favorites || [];
                this.lastSyncedAt = data.lastSyncedAt || 0;
                this.defaultPlayerId = data.defaultPlayerId;
                logger.info(`Loaded ${this.favorites.length} favorites from localStorage`);
            }
        } catch (e) {
            logger.error('Failed to load from localStorage:', e);
        }
    }

    /**
     * Save favorites to localStorage (immediate)
     */
    private saveToLocalStorage(): void {
        if (!browser) return;

        try {
            const data: MusicLibraryConfig = {
                favorites: this.favorites,
                lastSyncedAt: this.lastSyncedAt,
                defaultPlayerId: this.defaultPlayerId
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            logger.error('Failed to save to localStorage:', e);
        }
    }

    /**
     * Schedule server sync (debounced)
     */
    private scheduleSyncToServer(): void {
        if (!browser) return;

        // Clear any pending sync
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
        }

        // Schedule new sync
        this.syncTimer = setTimeout(() => {
            this.syncToServer();
        }, SYNC_DEBOUNCE_MS);
    }

    /**
     * Actually sync to server
     */
    async syncToServer(): Promise<void> {
        if (!browser) return;

        const config = {
            musicLibrary: {
                favorites: this.favorites,
                lastSyncedAt: this.lastSyncedAt,
                defaultPlayerId: this.defaultPlayerId
            }
        };

        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            logger.info('Music library synced to server');
        } catch (e) {
            logger.error('Failed to sync to server:', e);
        }
    }

    /**
     * Flush any pending sync (call on page unload)
     */
    flushSync(): void {
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
            // Use sendBeacon for reliable unload sync
            if (browser && navigator.sendBeacon) {
                const config = {
                    musicLibrary: {
                        favorites: this.favorites,
                        lastSyncedAt: this.lastSyncedAt,
                        defaultPlayerId: this.defaultPlayerId
                    }
                };
                navigator.sendBeacon('/api/settings', JSON.stringify(config));
            }
        }
    }

    // ========================================================================
    // Sync with MA
    // ========================================================================

    /**
     * Sync favorites from Music Assistant's library
     * This imports MA's favorites into our local library
     */
    async syncFromMA(maStore: { getLibrary: (type: MAMediaType, options?: { favorite?: boolean }) => Promise<MAMediaItem[]> }): Promise<void> {
        this.loading = true;

        try {
            // Fetch favorites from MA for each media type
            const types = ['track', 'album', 'artist', 'playlist', 'radio'] as const;
            const allFavorites: MAMediaItem[] = [];

            for (const type of types) {
                try {
                    const items = await maStore.getLibrary(type, { favorite: true });
                    allFavorites.push(...items);
                } catch (e) {
                    logger.warn(`Failed to fetch ${type} favorites from MA:`, e);
                }
            }

            // Merge with existing favorites (avoid duplicates)
            const existingUris = new Set(this.favorites.map(f => f.uri));
            const newItems = allFavorites.filter(item => !existingUris.has(item.uri));

            if (newItems.length > 0) {
                this.favorites = [...this.favorites, ...newItems];
                logger.info(`Synced ${newItems.length} new items from MA`);
            }

            this.lastSyncedAt = Date.now();
            this.persistChanges();
        } catch (e) {
            logger.error('Failed to sync from MA:', e);
        } finally {
            this.loading = false;
        }
    }
}

export const musicLibraryStore = new MusicLibraryStore();
