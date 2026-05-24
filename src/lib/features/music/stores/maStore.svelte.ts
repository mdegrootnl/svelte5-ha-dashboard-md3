/**
 * Music Assistant Store
 * 
 * Svelte 5 rune-based store for Music Assistant integration.
 * Communicates with MA through Home Assistant's WebSocket connection.
 */

import { browser } from '$app/environment';
import { untrack } from 'svelte';
import { haStore } from '$lib/stores/ha.svelte';
import { haRegistryStore } from '$lib/stores/haRegistry.svelte';
import { musicLibraryStore } from './musicLibrary.svelte';
import { createLogger } from '$lib/utils/logger';
import type {
    MAIntegrationStatus,
    MAMediaItem,
    MAMediaType,
    MAArtist,
    MAAlbum,
    MATrack,
    MAPlaylist,
    MAPodcast,
    MARadio,
    MASearchResults,
    MAQueueItem,
    MAPlayerAttributes,
    MAProvider,
    MARepeatMode
} from '$lib/types/musicAssistant';
import { type Result, ok, err, wrap } from '$lib/utils/result';

const logger = createLogger('MAStore');

// Cache TTL for library items (5 minutes)
const LIBRARY_CACHE_TTL = 5 * 60 * 1000;

interface RadioStationAliasGroup {
    key: string;
    aliases: string[];
}

interface RadioStationSearchOptions {
    stationAliases?: RadioStationAliasGroup[];
    rejectedNamePhrases?: string[];
}

interface HABrowseMediaItem {
    title?: string;
    media_content_id?: string;
    media_content_type?: string;
    media_class?: string;
    can_play?: boolean;
    can_expand?: boolean;
    thumbnail?: string;
    domain?: string;
    identifier?: string;
    children?: HABrowseMediaItem[];
}

function normalizeRadioStationName(name: string) {
    return name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(?:fm|the netherlands|netherlands|nederland|live|online|stream|radio station)\b/g, '')
        .replace(/[^\p{L}\p{N}%]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function containsNormalizedPhrase(name: string, phrase: string) {
    const normalizedName = ` ${normalizeRadioStationName(name)} `;
    const normalizedPhrase = ` ${normalizeRadioStationName(phrase)} `;
    return normalizedPhrase.trim().length > 0 && normalizedName.includes(normalizedPhrase);
}

function getCanonicalRadioStationKey(station: MARadio, options?: RadioStationSearchOptions) {
    if (!options?.stationAliases?.length) return normalizeRadioStationName(station.name);

    for (const group of options.stationAliases) {
        if (group.aliases.some((alias) => containsNormalizedPhrase(station.name, alias))) {
            return normalizeRadioStationName(group.key);
        }
    }

    return null;
}

function isRejectedRadioStation(station: MARadio, options?: RadioStationSearchOptions) {
    return Boolean(
        options?.rejectedNamePhrases?.some((phrase) => containsNormalizedPhrase(station.name, phrase))
    );
}

function hasUsefulRadioImage(station: MARadio) {
    const url = station.image_url?.trim();
    return Boolean(url && !url.startsWith('data:'));
}

function isUsefulRadioStation(station: MARadio) {
    const name = station.name?.trim();
    if (!name) return false;
    if (name.includes('%') && !/\b100\s*%\s*nl\b/i.test(name)) return false;
    return true;
}

function scoreRadioStationCandidate(station: MARadio) {
    let score = 0;
    if (hasUsefulRadioImage(station)) score += 10;
    if (station.provider) score += 2;
    if (station.name && !station.name.includes('%')) score += 2;
    if (station.uri?.includes('tunein')) score += 1;
    return score;
}

function pickRadioStationCandidate(current: MARadio, incoming: MARadio) {
    if (scoreRadioStationCandidate(incoming) > scoreRadioStationCandidate(current)) {
        return incoming;
    }

    return current;
}

function getMediaSourceUri(item: HABrowseMediaItem) {
    if (item.media_content_id) return item.media_content_id;
    if (!item.domain || !item.identifier) return null;
    return `media-source://${item.domain}/${item.identifier}`;
}

export class MusicAssistantStore {
    // ========================================================================
    // Connection State
    // ========================================================================

    integrationStatus = $state<MAIntegrationStatus>('checking');
    errorMessage = $state<string | null>(null);
    activeDomain = $state<'mass' | 'music_assistant'>('mass');
    configEntryId = $state<string | null>(null);

    // ========================================================================
    // Player State
    // ========================================================================

    /** Currently selected player entity_id */
    activePlayerId = $state<string | null>(null);

    /** Pre-computed list of MA player entity IDs from the registry (stable, only updates on registry change) */
    private maPlayerIds = $derived.by(() => {
        const ids: string[] = [];
        for (const entry of haRegistryStore.entityRegistry) {
            if (entry.entity_id.startsWith('media_player.') &&
                (entry.platform === 'mass' || entry.platform === 'music_assistant' ||
                    entry.entity_id.includes('mass') || entry.entity_id.includes('music_assistant'))) {
                ids.push(entry.entity_id);
            }
        }
        return ids;
    });

    /** All MA media_player entities from HA (now efficient - only accesses specific entities) */
    players = $derived.by(() => {
        const maPlayers: Record<string, { entity_id: string; state: string; attributes: MAPlayerAttributes }> = {};
        const states = haStore.states;

        for (const entityId of this.maPlayerIds) {
            const entity = states[entityId];
            if (entity) {
                maPlayers[entityId] = {
                    entity_id: entityId,
                    state: entity.state,
                    attributes: entity.attributes as MAPlayerAttributes
                };
            }
        }

        return maPlayers;
    });

    /** Current player's now playing info */
    nowPlaying = $derived.by(() => {
        if (!this.activePlayerId) return null;

        const player = this.players[this.activePlayerId];
        if (!player || player.state === 'off' || player.state === 'idle') return null;

        const attrs = player.attributes;
        return {
            title: attrs.media_title || 'Unknown',
            artist: attrs.media_artist || '',
            album: attrs.media_album_name || '',
            artwork: attrs.entity_picture || null,
            duration: attrs.media_duration || 0,
            position: attrs.media_position || 0,
            positionUpdatedAt: attrs.media_position_updated_at
                ? new Date(attrs.media_position_updated_at)
                : null,
            isPlaying: player.state === 'playing',
            volume: attrs.volume_level ?? 1,
            isMuted: attrs.is_volume_muted ?? false,
            shuffle: attrs.shuffle ?? false,
            repeat: attrs.repeat ?? 'off',
            supported_features: attrs.supported_features || 0
        };
    });

    // ========================================================================
    // Library Cache
    // ========================================================================

    private libraryCache = new Map<string, { data: MAMediaItem[]; timestamp: number }>();

    recentlyPlayed = $state<MAMediaItem[]>([]);
    favorites = $state<MAMediaItem[]>([]);

    // ====================================================
    // Providers
    // ====================================================

    providers = $state<MAProvider[]>([]);

    hasStreamingProviders = $derived(
        this.providers.some(p => p.is_streaming_provider && p.available)
    );

    // ====================================================
    // Initialization
    // ====================================================

    constructor() {
        if (browser) {
            $effect.root(() => {
                let initialized = false;
                $effect(() => {
                    const status = haStore.connectionState;
                    if (status === 'connected' && !initialized) {
                        initialized = true;
                        untrack(() => this.checkIntegration());
                    }
                    if (status === 'disconnected') {
                        initialized = false;
                        this.integrationStatus = 'checking';
                    }
                });
            });
        }
    }

    /**
     * Check if Music Assistant integration is available
     */
    private checkPromise: Promise<void> | null = null;

    /**
     * Check if Music Assistant integration is available
     */
    async checkIntegration(): Promise<void> {
        if (this.checkPromise) return this.checkPromise;

        this.checkPromise = (async () => {

            this.integrationStatus = 'checking';
            this.errorMessage = null;

            try {
                // Read connection early to avoid tracking later
                const conn = haStore.connection;
                if (!conn) {
                    this.checkPromise = null;
                    return;
                }

                logger.info('--- MAStore Check v8 ---');

                // 1. Wait for registry if it's currently loading
                let retries = 0;
                while (haRegistryStore.loading && retries < 10) {
                    logger.info('Waiting for HA Registry...');
                    await new Promise(r => setTimeout(r, 500));
                    retries++;
                }

                // 3. Discovery phase: Resolve domain and config_entry_id safely
                const services = await conn.sendMessagePromise({ type: 'get_services' }) as any;
                const massServices = services['mass'];
                const maServices = services['music_assistant'];

                const states = haStore.states;
                const allMediaPlayers = Object.keys(states).filter(id => id.startsWith('media_player.'));
                const maPlayers = Object.keys(this.players);

                logger.info(`Discovery: Found ${allMediaPlayers.length} total players, ${maPlayers.length} MA-linked players`);
                if (allMediaPlayers.length > 0) logger.info('Media players in HA:', allMediaPlayers.slice(0, 20));

                const entityRegistry = haRegistryStore.entityRegistry;

                // Try to find configEntryId from entity registry
                const maRegistryEntry = entityRegistry.find(e =>
                    e.platform === 'mass' || e.platform === 'music_assistant'
                );

                if (maRegistryEntry) {
                    this.configEntryId = maRegistryEntry.config_entry_id;
                    logger.info(`Found config_entry_id: ${this.configEntryId}`);
                } else {
                    logger.warn('Could not find MA in entity registry, searching players...');
                    // Fallback: search media players for config_entry_id
                    const maPlayerEntry = entityRegistry.find(e =>
                        e.entity_id.startsWith('media_player.mass_') ||
                        e.entity_id.startsWith('media_player.music_assistant_')
                    );
                    if (maPlayerEntry) {
                        this.configEntryId = maPlayerEntry.config_entry_id;
                        logger.info(`Found config_entry_id from player: ${this.configEntryId}`);
                    }
                }

                let success = false;
                if (massServices) {
                    logger.info('Detected modern mass domain');
                    this.activeDomain = 'mass';
                    try {
                        await haStore.callService('mass', 'search', { query: 'test', limit: 1 }, undefined, true);
                        success = true;
                    } catch (e: any) {
                        logger.warn('mass.search test failed:', e.message);
                    }
                }

                if (!success && maServices) {
                    logger.info('Detected legacy music_assistant domain');
                    this.activeDomain = 'music_assistant';

                    try {
                        const params: any = { name: 'test' };
                        if (this.configEntryId) params.config_entry_id = this.configEntryId;

                        await haStore.callService('music_assistant', 'search', params, undefined, true);
                        success = true;
                        logger.info('music_assistant.search test passed');
                    } catch (e: any) {
                        logger.error('music_assistant.search test failed:', e.message || e);
                    }
                }

                if (success) {
                    this.integrationStatus = 'available';
                    logger.info(`Final decision: using ${this.activeDomain} domain`);
                    await this.initializePlayer();
                } else {
                    const maPlayers = Object.keys(this.players);
                    if (maPlayers.length > 0) {
                        this.integrationStatus = 'error';
                        this.errorMessage = 'Music Assistant services unavailable but players detected';
                    } else {
                        this.integrationStatus = 'not_installed';
                        this.errorMessage = 'Music Assistant integration not found in Home Assistant';
                    }
                }
            } catch (err) {
                this.integrationStatus = 'error';
                this.errorMessage = err instanceof Error ? err.message : 'Unknown error during MA check';
                logger.error('Unexpected error in checkIntegration:', err);
            } finally {
                // Keep the promise for a while to debounce re-checks
                setTimeout(() => { this.checkPromise = null; }, 5000);
            }
        })();

        return this.checkPromise;
    }

    async initializePlayer(forceDefault = false): Promise<void> {
        const playerIds = Object.keys(this.players);
        if (playerIds.length === 0) return;

        const defaultId = musicLibraryStore.defaultPlayerId;

        // If forced or no active player, try to select the default
        if (forceDefault || !this.activePlayerId) {
            if (defaultId && playerIds.includes(defaultId)) {
                this.activePlayerId = defaultId;
                logger.info('Initialized with default player:', defaultId);
            } else if (!this.activePlayerId) {
                // If no default and no active, pick first available
                this.activePlayerId = playerIds[0];
                logger.info('No default player found, auto-selected:', this.activePlayerId);
            }
        }
    }

    // ====================================================
    // API Calls (using activeDomain)
    // ====================================================

    private async callMA(service: string, data: any = {}, options: any = {}, skipResponse = false) {
        const fullData = { ...data };

        // Only inject config_entry_id for domain-level services that require it (like search/library)
        // Player-specific services usually reject it as an extra key.
        const requiresConfigId = ['search', 'get_library'].includes(service);

        if (this.configEntryId && requiresConfigId && !fullData.config_entry_id) {
            fullData.config_entry_id = this.configEntryId;
        }

        const result = await haStore.callService(this.activeDomain, service, fullData, options, skipResponse);
        if (!result.ok) throw result.error;
        return result.value;
    }

    // ====================================================
    // Playback Controls
    // ====================================================

    async play(mediaUri?: string, playerId?: string, mediaContentType = 'music'): Promise<Result<void>> {
        let targetPlayer = playerId || this.activePlayerId;

        // Auto-select first player if none active
        if (!targetPlayer) {
            const playerIds = Object.keys(this.players);
            logger.info('No active player. Available players:', playerIds);
            if (playerIds.length > 0) {
                this.activePlayerId = playerIds[0];
                targetPlayer = this.activePlayerId;
                logger.info('Auto-selected player for playback:', targetPlayer);
            }
        }

        if (!targetPlayer) {
            logger.warn('No players found. Cannot play media.');
            return err(new Error('No players found'));
        }

        logger.info('Play called:', { mediaUri, targetPlayer, domain: this.activeDomain });

        try {
            if (mediaUri) {
                if (mediaUri.startsWith('media-source://')) {
                    logger.info('Calling media_player.play_media for HA media source:', {
                        media_content_id: mediaUri,
                        media_content_type: mediaContentType,
                        entity_id: targetPlayer
                    });
                    const res = await haStore.callService('media_player', 'play_media',
                        { media_content_id: mediaUri, media_content_type: mediaContentType || 'music' },
                        { entity_id: targetPlayer }
                    );
                    if (!res.ok) throw res.error;
                    return ok(undefined);
                }

                // Use the Music Assistant service to queue and play media
                logger.info('Calling play_media:', { media_id: mediaUri, entity_id: targetPlayer });
                await this.callMA('play_media', { media_id: mediaUri }, { entity_id: targetPlayer });
            } else {
                // Simple resume playback via standard media_player service
                const res = await haStore.callService('media_player', 'media_play', undefined, { entity_id: targetPlayer });
                if (!res.ok) throw res.error;
            }
            logger.info('Play command sent successfully');
            return ok(undefined);
        } catch (error) {
            logger.error('Play failed:', error);
            // Fallback: try standard media_player.play_media if the custom service fails
            if (mediaUri) {
                logger.info('Fallback: trying media_player.play_media');
                try {
                    const res = await haStore.callService('media_player', 'play_media',
                        { media_content_id: mediaUri, media_content_type: 'playlist' },
                        { entity_id: targetPlayer }
                    );
                    if (!res.ok) throw res.error;
                    return ok(undefined);
                } catch (fallbackErr) {
                    logger.error('Fallback also failed:', fallbackErr);
                    return err(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
                }
            }
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    }

    async pause(playerId?: string): Promise<void> {
        const targetPlayer = playerId || this.activePlayerId;
        if (!targetPlayer) return;
        await haStore.callService('media_player', 'media_pause', undefined, { entity_id: targetPlayer });
    }

    async playPause(playerId?: string): Promise<void> {
        const targetPlayer = playerId || this.activePlayerId;
        if (!targetPlayer) return;
        await haStore.callService('media_player', 'media_play_pause', undefined, { entity_id: targetPlayer });
    }

    async next(playerId?: string): Promise<void> {
        const targetPlayer = playerId || this.activePlayerId;
        if (!targetPlayer) return;
        await haStore.callService('media_player', 'media_next_track', undefined, { entity_id: targetPlayer });
    }

    async previous(playerId?: string): Promise<void> {
        const targetPlayer = playerId || this.activePlayerId;
        if (!targetPlayer) return;
        await haStore.callService('media_player', 'media_previous_track', undefined, { entity_id: targetPlayer });
    }

    async setVolume(volume: number, playerId?: string): Promise<void> {
        const targetPlayer = playerId || this.activePlayerId;
        if (!targetPlayer) return;
        await haStore.callService('media_player', 'volume_set', { volume_level: Math.max(0, Math.min(1, volume)) }, { entity_id: targetPlayer });
    }

    async toggleMute(playerId?: string): Promise<void> {
        const targetPlayer = playerId || this.activePlayerId;
        if (!targetPlayer || !this.players[targetPlayer]) return;
        await haStore.callService('media_player', 'volume_mute', { is_volume_muted: !this.players[targetPlayer].attributes.is_volume_muted }, { entity_id: targetPlayer });
    }

    async toggleShuffle(playerId?: string): Promise<void> {
        const targetPlayer = playerId || this.activePlayerId;
        if (!targetPlayer || !this.players[targetPlayer]) return;
        await haStore.callService('media_player', 'shuffle_set', { shuffle: !this.players[targetPlayer].attributes.shuffle }, { entity_id: targetPlayer });
    }

    async setRepeat(mode: MARepeatMode, playerId?: string): Promise<void> {
        const targetPlayer = playerId || this.activePlayerId;
        if (!targetPlayer) return;
        await haStore.callService('media_player', 'repeat_set', { repeat: mode }, { entity_id: targetPlayer });
    }

    async seek(position: number, playerId?: string): Promise<void> {
        const targetPlayer = playerId || this.activePlayerId;
        if (!targetPlayer) return;
        await haStore.callService('media_player', 'media_seek', { seek_position: position }, { entity_id: targetPlayer });
    }

    // ====================================================
    // Library & Search
    // ====================================================

    async search(query: string, limit = 20): Promise<Result<MASearchResults>> {
        if (!query.trim()) return ok({ artists: [], albums: [], tracks: [], playlists: [], podcasts: [], radio: [] });

        try {
            logger.info('Search request:', { query, limit, domain: this.activeDomain });

            let result: { response?: MASearchResults } | undefined;

            // Legacy music_assistant uses 'name' and requires explicit 'media_type'
            if (this.activeDomain === 'music_assistant') {
                const searchPayload = {
                    name: query,
                    media_type: ['playlist', 'artist', 'album', 'podcast', 'track', 'radio'],
                    limit
                };

                try {
                    result = await this.callMA('search', searchPayload, undefined, true) as { response?: MASearchResults };
                } catch (error) {
                    logger.warn('Search with podcast media type failed, retrying legacy media types:', error);
                    result = await this.callMA('search', {
                        ...searchPayload,
                        media_type: ['playlist', 'artist', 'album', 'track', 'radio']
                    }, undefined, true) as { response?: MASearchResults };
                }
            } else {
                // Modern 'mass' domain uses 'query'
                result = await this.callMA('search', { query, limit }, undefined, true) as { response?: MASearchResults };
            }

            logger.info('Search result success');

            const resp = result?.response;

            // Map items using helper
            const artists = (resp?.artists || []).map(i => this.mapMAItem(i)) as MAArtist[];
            const albums = (resp?.albums || []).map(i => this.mapMAItem(i)) as MAAlbum[];
            const tracks = (resp?.tracks || []).map(i => this.mapMAItem(i)) as MATrack[];
            const playlists = (resp?.playlists || []).map(i => this.mapMAItem(i)) as MAPlaylist[];
            const podcasts = ((resp as any)?.podcasts || []).map((i: any) => this.mapMAItem(i)) as MAPodcast[];
            const radio = (resp?.radio || []).map(i => this.mapMAItem(i)) as MARadio[];

            return ok({ artists, albums, tracks, playlists, podcasts, radio });
        } catch (error: any) {
            const errorMsg = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
            logger.error(`Search failed: ${errorMsg}`);
            // Return empty result instead of throwing, or you could return err(error) if you want to show it
            // For search, returning empty is often UX friendly, but strict Result pattern might prefer error.
            // Let's return error so UI can decide.
            return err(error instanceof Error ? error : new Error(errorMsg));
        }
    }

    async getLibrary(
        mediaType: MAMediaType,
        options: { limit?: number; offset?: number; favorite?: boolean; search?: string; provider?: string; } = {}
    ): Promise<Result<MAMediaItem[]>> {
        const { limit = 50, offset = 0, favorite, search, provider } = options;
        const cacheKey = `${mediaType}:${limit}:${offset}:${favorite}:${search}:${provider}`;

        const cached = this.libraryCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < LIBRARY_CACHE_TTL) return ok(cached.data);

        try {
            const result = await this.callMA('get_library', { media_type: mediaType, limit, offset, favorite, search }, undefined, true) as { response?: { items: MAMediaItem[] } };

            // Map items using helper to ensure image_url is populated
            const rawItems = result?.response?.items || [];
            const items = rawItems.map(this.mapMAItem);

            this.libraryCache.set(cacheKey, { data: items, timestamp: Date.now() });
            return ok(items);
        } catch (error) {
            logger.error('Get library failed:', error);
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Map raw API item to internal MAMediaItem, handling legacy fields like 'image' -> 'image_url'
     */
    private mapMAItem(item: any): MAMediaItem {
        return {
            ...item,
            // Map legacy 'image' field to 'image_url' if image_url is missing
            image_url: item.image_url || item.image || item.img_thumb || item.thumbnail
        };
    }

    async getRadioStations(limit = 50): Promise<Result<MARadio[]>> { return this.getLibrary('radio', { limit }) as Promise<Result<MARadio[]>>; }

    async getRadioBrowserCountryStations(countryCode: string, limit = 120): Promise<Result<MARadio[]>> {
        if (!haStore.connection) return err(new Error('No connection'));

        const normalizedCountryCode = countryCode.trim().toUpperCase();
        if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
            return err(new Error(`Invalid radio country code: ${countryCode}`));
        }

        try {
            const response = await haStore.connection.sendMessagePromise({
                type: 'media_source/browse_media',
                media_content_id: `media-source://radio_browser/country/${normalizedCountryCode}`,
            }) as HABrowseMediaItem;

            const stationsByUri = new Map<string, MARadio>();
            const stationNameToUri = new Map<string, string>();
            const children = Array.isArray(response?.children) ? response.children : [];

            for (const child of children) {
                if (!child.can_play) continue;

                const name = child.title?.trim();
                const uri = getMediaSourceUri(child);
                if (!name || !uri) continue;

                const station: MARadio = {
                    item_id: child.identifier || uri,
                    provider: 'radio_browser',
                    name,
                    media_type: 'radio',
                    image_url: child.thumbnail,
                    uri,
                    media_content_type: child.media_content_type || 'music',
                    countryCode: normalizedCountryCode,
                };

                if (!isUsefulRadioStation(station)) continue;

                const nameKey = normalizeRadioStationName(station.name);
                const existingUriKey = stationNameToUri.get(nameKey) ?? (stationsByUri.has(uri) ? uri : undefined);

                if (existingUriKey) {
                    const current = stationsByUri.get(existingUriKey);
                    if (!current) continue;

                    const preferred = pickRadioStationCandidate(current, station);
                    if (preferred !== current) {
                        stationsByUri.set(existingUriKey, preferred);
                    }
                    stationNameToUri.set(nameKey, existingUriKey);
                } else {
                    stationsByUri.set(uri, station);
                    stationNameToUri.set(nameKey, uri);
                }
            }

            return ok([...stationsByUri.values()].slice(0, limit));
        } catch (error) {
            logger.warn('Radio Browser country lookup failed:', error);
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    }

    async searchRadioStations(
        queries: string | string[],
        limit = 72,
        options: RadioStationSearchOptions = {}
    ): Promise<Result<MARadio[]>> {
        const terms = (Array.isArray(queries) ? queries : [queries])
            .map((query) => query.trim())
            .filter(Boolean);

        if (terms.length === 0) return ok([]);

        const stationsByUri = new Map<string, MARadio>();
        const stationNameToUri = new Map<string, string>();
        let lastError: Error | null = null;
        const perQueryLimit = Math.max(24, Math.min(limit, 50));

        const results = await Promise.allSettled(
            terms.map((term) => this.search(term, perQueryLimit))
        );

        for (const result of results) {
            if (result.status === 'rejected') {
                lastError = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
                continue;
            }

            if (!result.value.ok) {
                lastError = result.value.error;
                continue;
            }

            for (const station of result.value.value.radio) {
                if (!isUsefulRadioStation(station)) continue;
                if (isRejectedRadioStation(station, options)) continue;

                const uriKey = station.uri || `${station.provider}:${station.item_id}`;
                const nameKey = getCanonicalRadioStationKey(station, options);
                if (!nameKey) continue;

                const existingUriKey = stationNameToUri.get(nameKey) ?? (stationsByUri.has(uriKey) ? uriKey : undefined);

                if (existingUriKey) {
                    const current = stationsByUri.get(existingUriKey);
                    if (!current) continue;

                    const preferred = pickRadioStationCandidate(current, station);
                    if (preferred !== current) {
                        stationsByUri.set(existingUriKey, preferred);
                        stationNameToUri.set(nameKey, existingUriKey);
                    }
                } else {
                    stationsByUri.set(uriKey, station);
                    stationNameToUri.set(nameKey, uriKey);
                }
            }
        }

        if (stationsByUri.size > 0 || !lastError) return ok([...stationsByUri.values()].slice(0, limit));
        return err(lastError);
    }

    async getPlaylists(limit = 50): Promise<Result<MAPlaylist[]>> { return this.getLibrary('playlist', { limit }) as Promise<Result<MAPlaylist[]>>; }
    async getArtists(limit = 50, favorite = false): Promise<Result<MAArtist[]>> { return this.getLibrary('artist', { limit, favorite }) as Promise<Result<MAArtist[]>>; }
    async getAlbums(limit = 50, favorite = false): Promise<Result<MAAlbum[]>> { return this.getLibrary('album', { limit, favorite }) as Promise<Result<MAAlbum[]>>; }
    async getTracks(limit = 50, favorite = false): Promise<Result<MATrack[]>> { return this.getLibrary('track', { limit, favorite }) as Promise<Result<MATrack[]>>; }

    async getQueue(playerId?: string): Promise<MAQueueItem[]> {
        const targetPlayer = playerId || this.activePlayerId;
        if (!targetPlayer) return [];

        try {
            const result = await this.callMA('get_queue', { entity_id: targetPlayer }, undefined, true) as { response?: { items: MAQueueItem[] } };
            return result?.response?.items || [];
        } catch (err) {
            logger.error('Get queue failed:', err);
            return [];
        }
    }

    selectPlayer(playerId: string): void {
        if (this.players[playerId]) {
            this.activePlayerId = playerId;
            logger.info('Selected player:', playerId);
        }
    }

    clearCache(): void {
        this.libraryCache.clear();
    }
}

export const maStore = new MusicAssistantStore();
