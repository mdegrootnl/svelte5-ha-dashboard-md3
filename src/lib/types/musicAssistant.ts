/**
 * Music Assistant Types
 * Types for Music Assistant integration via Home Assistant services
 */

// ============================================================================
// Connection & Integration Status
// ============================================================================

export type MAIntegrationStatus =
    | 'checking'        // Initial state, verifying if MA integration exists
    | 'not_installed'   // MA addon/integration not found in HA
    | 'available'       // MA integration is available and connected
    | 'no_providers'    // MA connected but no music providers configured
    | 'error';          // Connection or communication error

// ============================================================================
// Media Item Types
// ============================================================================

export type MAMediaType = 'artist' | 'album' | 'track' | 'playlist' | 'radio';

export interface MAMediaItem {
    item_id: string;
    provider: string;
    name: string;
    media_type: MAMediaType;
    image_url?: string;
    uri: string;
    sort_name?: string;
    version?: string;
}

export interface MAArtist extends MAMediaItem {
    media_type: 'artist';
}

export interface MAAlbum extends MAMediaItem {
    media_type: 'album';
    artist?: MAArtist;
    year?: number;
    album_type?: 'album' | 'single' | 'compilation' | 'ep';
}

export interface MATrack extends MAMediaItem {
    media_type: 'track';
    artists: MAArtist[];
    album?: MAAlbum;
    duration: number;  // in seconds
    disc_number?: number;
    track_number?: number;
}

export interface MAPlaylist extends MAMediaItem {
    media_type: 'playlist';
    owner?: string;
    is_editable?: boolean;
}

export interface MARadio extends MAMediaItem {
    media_type: 'radio';
}

// ============================================================================
// Search Results
// ============================================================================

export interface MASearchResults {
    artists: MAArtist[];
    albums: MAAlbum[];
    tracks: MATrack[];
    playlists: MAPlaylist[];
    radio: MARadio[];
}

// ============================================================================
// Queue & Playback
// ============================================================================

export interface MAQueueItem {
    queue_item_id: string;
    name: string;
    uri: string;
    media_type: MAMediaType;
    image_url?: string;
    duration: number;
    artists?: string;
    album?: string;
}

export type MAPlayerState = 'idle' | 'playing' | 'paused' | 'off';

export type MARepeatMode = 'off' | 'one' | 'all';

export interface MAQueue {
    queue_id: string;
    active: boolean;
    items: MAQueueItem[];
    current_index: number;
    shuffle_enabled: boolean;
    repeat_mode: MARepeatMode;
}

// ============================================================================
// Player Types (derived from HA media_player entities)
// ============================================================================

export interface MAPlayerAttributes {
    friendly_name?: string;
    media_title?: string;
    media_artist?: string;
    media_album_name?: string;
    media_duration?: number;
    media_position?: number;
    media_position_updated_at?: string;
    entity_picture?: string;
    volume_level?: number;
    is_volume_muted?: boolean;
    shuffle?: boolean;
    repeat?: MARepeatMode;
    supported_features?: number;
    source?: string;
    source_list?: string[];
    group_members?: string[];
}

// ============================================================================
// Provider Types
// ============================================================================

export interface MAProvider {
    instance_id: string;
    domain: string;
    name: string;
    type: 'music' | 'player' | 'metadata' | 'plugin';
    available: boolean;
    is_streaming_provider: boolean;
    icon?: string;
}

// Supported streaming providers
export type MAStreamingProvider =
    | 'spotify'
    | 'tunein'
    | 'ytmusic'
    | 'soundcloud'
    | 'tidal'
    | 'qobuz'
    | 'deezer'
    | 'filesystem';

// ============================================================================
// HA Service Response Types
// ============================================================================

export interface MAGetLibraryResponse {
    items: MAMediaItem[];
    count: number;
    limit: number;
    offset: number;
}

export interface MAServiceCallResult {
    success: boolean;
    error?: string;
}

// ============================================================================
// Local Library Types
// ============================================================================

export interface LocalMusicLibrary {
    favorites: MAMediaItem[];
    lastSyncedAt: number;
}

