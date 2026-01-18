<!--
  MusicBrowser.svelte
  Grid browser for library content (Spotify-style)
  
  Features:
  - Responsive grid (2-6 columns)
  - Card items with artwork, title, subtitle
  - Different sections: home, browse, radio, library, search
-->
<script lang="ts">
    import { maStore, haStore, musicLibraryStore } from "$lib";
    import { onMount } from "svelte";
    import type {
        MAMediaItem,
        MAArtist,
        MAAlbum,
        MATrack,
        MARadio,
        MAPlaylist,
    } from "$lib/types/musicAssistant";

    import PlayArrow from "~icons/material-symbols/play-arrow";
    import MusicNote from "~icons/material-symbols/music-note";
    import Album from "~icons/material-symbols/album";
    import Person from "~icons/material-symbols/person";
    import Radio from "~icons/material-symbols/radio";
    import QueueMusic from "~icons/material-symbols/queue-music";
    import Search from "~icons/material-symbols/search";
    import Favorite from "~icons/material-symbols/favorite";
    import FavoriteBorder from "~icons/material-symbols/favorite-outline";
    import Sync from "~icons/material-symbols/sync";

    interface Props {
        section: "home" | "browse" | "radio" | "library" | "search";
        searchQuery?: string;
        onPlay: (item: MAMediaItem) => void;
    }

    let { section, searchQuery = "", onPlay }: Props = $props();

    // ========================================================================
    // Local Library - Derived filters by media type
    // ========================================================================

    const localPlaylists = $derived(
        musicLibraryStore.favorites.filter(
            (f) => f.media_type === "playlist",
        ) as MAPlaylist[],
    );
    const localAlbums = $derived(
        musicLibraryStore.favorites.filter(
            (f) => f.media_type === "album",
        ) as MAAlbum[],
    );
    const localTracks = $derived(
        musicLibraryStore.favorites.filter(
            (f) => f.media_type === "track",
        ) as MATrack[],
    );
    const localRadios = $derived(
        musicLibraryStore.favorites.filter(
            (f) => f.media_type === "radio",
        ) as MARadio[],
    );
    const localArtists = $derived(
        musicLibraryStore.favorites.filter(
            (f) => f.media_type === "artist",
        ) as MAArtist[],
    );

    // ========================================================================
    // Content state (for browse/search from MA)
    // ========================================================================

    let browseArtists = $state<MAArtist[]>([]);
    let browseAlbums = $state<MAAlbum[]>([]);
    let browsePlaylists = $state<MAPlaylist[]>([]);
    let browseTracks = $state<MATrack[]>([]);
    let loading = $state(false);

    // Search results
    let searchResults = $state<{
        artists: MAArtist[];
        albums: MAAlbum[];
        tracks: MATrack[];
        playlists: MAPlaylist[];
        radio: MARadio[];
    } | null>(null);

    // Load content based on section (only browse needs MA fetch)
    async function loadContent() {
        // Home, Radio, Library use local favorites (reactive, no fetch needed)
        // Only Browse needs to fetch from MA for discovery
        if (section === "browse") {
            loading = true;
            try {
                const [artists, albums, playlists, tracks] = await Promise.all([
                    maStore.getArtists(20),
                    maStore.getAlbums(20),
                    maStore.getPlaylists(20),
                    maStore.getTracks(20),
                ]);
                browseArtists = artists;
                browseAlbums = albums;
                browsePlaylists = playlists;
                browseTracks = tracks;
            } finally {
                loading = false;
            }
        }
        // Search is handled separately by searchQuery effect
    }

    // Handle search queries
    async function performSearch(query: string) {
        if (!query.trim()) {
            searchResults = null;
            return;
        }
        loading = true;
        try {
            searchResults = await maStore.search(query, 20);
        } finally {
            loading = false;
        }
    }

    // Reload when section changes
    $effect(() => {
        if (section && section !== "search") {
            loadContent();
        }
    });

    // Perform search when query changes
    $effect(() => {
        if (section === "search" && searchQuery) {
            performSearch(searchQuery);
        }
    });

    // Get icon for media type
    function getIcon(mediaType: string) {
        switch (mediaType) {
            case "artist":
                return Person;
            case "album":
                return Album;
            case "track":
                return MusicNote;
            case "playlist":
                return QueueMusic;
            case "radio":
                return Radio;
            default:
                return MusicNote;
        }
    }

    // Get subtitle for item
    function getSubtitle(item: MAMediaItem): string {
        if (item.media_type === "track") {
            const track = item as MATrack;
            return track.artists?.map((a) => a.name).join(", ") || "";
        }
        if (item.media_type === "album") {
            const album = item as MAAlbum;
            return album.artist?.name || "";
        }
        return item.provider || "";
    }
</script>

<div class="py-4">
    {#if loading}
        <!-- Loading State -->
        <div class="flex items-center justify-center py-12">
            <div
                class="w-8 h-8 border-2 border-m3-primary border-t-transparent rounded-full animate-spin"
            ></div>
        </div>
    {:else if section === "home"}
        <!-- Home Section -->
        {#if localPlaylists.length > 0}
            <section class="mb-8">
                <h3
                    class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                >
                    Your Playlists
                </h3>
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                >
                    {#each localPlaylists as item}
                        <div class="relative group">
                            <button
                                class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                onclick={() => onPlay(item)}
                            >
                                <div
                                    class="aspect-square rounded-md bg-m3-surface-container-highest mb-3 overflow-hidden relative"
                                >
                                    {#if item.image_url}
                                        <img
                                            src={haStore.getProxiedUrl(
                                                item.image_url,
                                            )}
                                            alt={item.name}
                                            class="w-full h-full object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="w-full h-full flex items-center justify-center"
                                        >
                                            <QueueMusic
                                                class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                            />
                                        </div>
                                    {/if}
                                    <!-- Play overlay -->
                                    <div
                                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <div
                                            class="w-12 h-12 rounded-full bg-m3-primary flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform"
                                        >
                                            <PlayArrow
                                                class="w-6 h-6 text-m3-on-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p
                                    class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                >
                                    {item.name}
                                </p>
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant truncate"
                                >
                                    {getSubtitle(item)}
                                </p>
                            </button>
                            <!-- Toggle Favorite Button -->
                            <button
                                class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    musicLibraryStore.toggleFavorite(item);
                                }}
                            >
                                {#if musicLibraryStore.isFavorite(item.uri)}
                                    <Favorite class="w-5 h-5 text-m3-primary" />
                                {:else}
                                    <FavoriteBorder class="w-5 h-5" />
                                {/if}
                            </button>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        {#if localAlbums.length > 0}
            <section class="mb-8">
                <h3
                    class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                >
                    Favorite Albums
                </h3>
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                >
                    {#each localAlbums as item}
                        <div class="relative group">
                            <button
                                class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                onclick={() => onPlay(item)}
                            >
                                <div
                                    class="aspect-square rounded-md bg-m3-surface-container-highest mb-3 overflow-hidden relative"
                                >
                                    {#if item.image_url}
                                        <img
                                            src={haStore.getProxiedUrl(
                                                item.image_url,
                                            )}
                                            alt={item.name}
                                            class="w-full h-full object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="w-full h-full flex items-center justify-center"
                                        >
                                            <Album
                                                class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                            />
                                        </div>
                                    {/if}
                                    <div
                                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <div
                                            class="w-12 h-12 rounded-full bg-m3-primary flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform"
                                        >
                                            <PlayArrow
                                                class="w-6 h-6 text-m3-on-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p
                                    class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                >
                                    {item.name}
                                </p>
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant truncate"
                                >
                                    {getSubtitle(item)}
                                </p>
                            </button>
                            <!-- Toggle Favorite Button -->
                            <button
                                class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    musicLibraryStore.toggleFavorite(item);
                                }}
                            >
                                {#if musicLibraryStore.isFavorite(item.uri)}
                                    <Favorite class="w-5 h-5 text-m3-primary" />
                                {:else}
                                    <FavoriteBorder class="w-5 h-5" />
                                {/if}
                            </button>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        {#if localPlaylists.length === 0 && localAlbums.length === 0}
            <div
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <MusicNote
                    class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                />
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    No favorites yet
                </p>
                <p
                    class="text-m3-body-medium text-m3-on-surface-variant opacity-70 mt-1"
                >
                    Search for music and tap the heart to add favorites
                </p>
            </div>
        {/if}
    {:else if section === "browse"}
        <!-- Browse Section -->
        {#if browseArtists.length > 0}
            <section class="mb-8">
                <h3
                    class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                >
                    Artists
                </h3>
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                >
                    {#each browseArtists as item}
                        <div class="relative group">
                            <button
                                class="w-full group bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                onclick={() => onPlay(item)}
                            >
                                <div
                                    class="aspect-square rounded-full bg-m3-surface-container-highest mb-3 overflow-hidden relative"
                                >
                                    {#if item.image_url}
                                        <img
                                            src={haStore.getProxiedUrl(
                                                item.image_url,
                                            )}
                                            alt={item.name}
                                            class="w-full h-full object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="w-full h-full flex items-center justify-center"
                                        >
                                            <Person
                                                class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                            />
                                        </div>
                                    {/if}
                                    <!-- Play Button Overlay -->
                                    <div
                                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <div
                                            class="w-12 h-12 rounded-full bg-m3-primary flex items-center justify-center shadow-lg"
                                        >
                                            <PlayArrow
                                                class="w-6 h-6 text-m3-on-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p
                                    class="text-m3-body-medium font-medium text-m3-on-surface truncate text-center"
                                >
                                    {item.name}
                                </p>
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant truncate text-center"
                                >
                                    Artist
                                </p>
                            </button>
                            <!-- Toggle Favorite Button -->
                            <button
                                class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    musicLibraryStore.toggleFavorite(item);
                                }}
                            >
                                {#if musicLibraryStore.isFavorite(item.uri)}
                                    <Favorite class="w-5 h-5 text-m3-primary" />
                                {:else}
                                    <FavoriteBorder class="w-5 h-5" />
                                {/if}
                            </button>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        {#if browseAlbums.length > 0}
            <section class="mb-8">
                <h3
                    class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                >
                    Albums
                </h3>
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                >
                    {#each browseAlbums as item}
                        <div class="relative group">
                            <button
                                class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                onclick={() => onPlay(item)}
                            >
                                <div
                                    class="aspect-square rounded-md bg-m3-surface-container-highest mb-3 overflow-hidden relative"
                                >
                                    {#if item.image_url}
                                        <img
                                            src={haStore.getProxiedUrl(
                                                item.image_url,
                                            )}
                                            alt={item.name}
                                            class="w-full h-full object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="w-full h-full flex items-center justify-center"
                                        >
                                            <Album
                                                class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                            />
                                        </div>
                                    {/if}
                                    <div
                                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <div
                                            class="w-12 h-12 rounded-full bg-m3-primary flex items-center justify-center shadow-lg"
                                        >
                                            <PlayArrow
                                                class="w-6 h-6 text-m3-on-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p
                                    class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                >
                                    {item.name}
                                </p>
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant truncate"
                                >
                                    {getSubtitle(item)}
                                </p>
                            </button>
                            <!-- Toggle Favorite Button -->
                            <button
                                class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    musicLibraryStore.toggleFavorite(item);
                                }}
                            >
                                {#if musicLibraryStore.isFavorite(item.uri)}
                                    <Favorite class="w-5 h-5 text-m3-primary" />
                                {:else}
                                    <FavoriteBorder class="w-5 h-5" />
                                {/if}
                            </button>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}
        {#if browsePlaylists.length > 0}
            <section class="mb-8">
                <h3
                    class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                >
                    Playlists
                </h3>
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                >
                    {#each browsePlaylists as item}
                        <div class="relative group">
                            <button
                                class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                onclick={() => onPlay(item)}
                            >
                                <div
                                    class="aspect-square rounded-md bg-m3-surface-container-highest mb-3 overflow-hidden relative"
                                >
                                    {#if item.image_url}
                                        <img
                                            src={haStore.getProxiedUrl(
                                                item.image_url,
                                            )}
                                            alt={item.name}
                                            class="w-full h-full object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="w-full h-full flex items-center justify-center"
                                        >
                                            <QueueMusic
                                                class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                            />
                                        </div>
                                    {/if}
                                    <div
                                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <div
                                            class="w-12 h-12 rounded-full bg-m3-primary flex items-center justify-center shadow-lg"
                                        >
                                            <PlayArrow
                                                class="w-6 h-6 text-m3-on-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p
                                    class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                >
                                    {item.name}
                                </p>
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant truncate"
                                >
                                    Playlist
                                </p>
                            </button>
                            <!-- Toggle Favorite Button -->
                            <button
                                class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    musicLibraryStore.toggleFavorite(item);
                                }}
                            >
                                {#if musicLibraryStore.isFavorite(item.uri)}
                                    <Favorite class="w-5 h-5 text-m3-primary" />
                                {:else}
                                    <FavoriteBorder class="w-5 h-5" />
                                {/if}
                            </button>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        {#if browseTracks.length > 0}
            <section class="mb-8">
                <h3
                    class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                >
                    Tracks
                </h3>
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                >
                    {#each browseTracks as item}
                        <div class="relative group">
                            <button
                                class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                onclick={() => onPlay(item)}
                            >
                                <div
                                    class="aspect-square rounded-md bg-m3-surface-container-highest mb-3 overflow-hidden relative"
                                >
                                    {#if item.image_url}
                                        <img
                                            src={haStore.getProxiedUrl(
                                                item.image_url,
                                            )}
                                            alt={item.name}
                                            class="w-full h-full object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="w-full h-full flex items-center justify-center"
                                        >
                                            <MusicNote
                                                class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                            />
                                        </div>
                                    {/if}
                                    <div
                                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <div
                                            class="w-12 h-12 rounded-full bg-m3-primary flex items-center justify-center shadow-lg"
                                        >
                                            <PlayArrow
                                                class="w-6 h-6 text-m3-on-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p
                                    class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                >
                                    {item.name}
                                </p>
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant truncate"
                                >
                                    {getSubtitle(item)}
                                </p>
                            </button>
                            <!-- Toggle Favorite Button -->
                            <button
                                class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    musicLibraryStore.toggleFavorite(item);
                                }}
                            >
                                {#if musicLibraryStore.isFavorite(item.uri)}
                                    <Favorite class="w-5 h-5 text-m3-primary" />
                                {:else}
                                    <FavoriteBorder class="w-5 h-5" />
                                {/if}
                            </button>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}
    {:else if section === "radio"}
        <!-- Radio Section -->
        {#if localRadios.length > 0}
            <div
                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
                {#each localRadios as item}
                    <div class="relative group">
                        <button
                            class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                            onclick={() => onPlay(item)}
                        >
                            <div
                                class="aspect-square rounded-md bg-m3-surface-container-highest mb-3 overflow-hidden relative"
                            >
                                {#if item.image_url}
                                    <img
                                        src={haStore.getProxiedUrl(
                                            item.image_url,
                                        )}
                                        alt={item.name}
                                        class="w-full h-full object-cover"
                                    />
                                {:else}
                                    <div
                                        class="w-full h-full flex items-center justify-center"
                                    >
                                        <Radio
                                            class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                        />
                                    </div>
                                {/if}
                                <div
                                    class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <div
                                        class="w-12 h-12 rounded-full bg-m3-primary flex items-center justify-center shadow-lg"
                                    >
                                        <PlayArrow
                                            class="w-6 h-6 text-m3-on-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                            <p
                                class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                            >
                                {item.name}
                            </p>
                            <p
                                class="text-m3-body-small text-m3-on-surface-variant truncate"
                            >
                                {item.provider || "Radio"}
                            </p>
                        </button>
                        <!-- Toggle Favorite Button -->
                        <button
                            class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                            onclick={(e) => {
                                e.stopPropagation();
                                musicLibraryStore.toggleFavorite(item);
                            }}
                        >
                            {#if musicLibraryStore.isFavorite(item.uri)}
                                <Favorite class="w-5 h-5 text-m3-primary" />
                            {:else}
                                <FavoriteBorder class="w-5 h-5" />
                            {/if}
                        </button>
                    </div>
                {/each}
            </div>
        {:else}
            <div
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <Radio
                    class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                />
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    No radio stations available
                </p>
                <p
                    class="text-m3-body-medium text-m3-on-surface-variant opacity-70 mt-1"
                >
                    Search for radio stations and tap the heart to add favorites
                </p>
            </div>
        {/if}
    {:else if section === "library"}
        <!-- Library Section -->
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-m3-title-large font-bold text-m3-on-surface">
                Library
            </h2>
            <button
                class="flex items-center gap-2 px-4 py-2 rounded-full bg-m3-surface-container-high text-m3-on-surface hover:bg-m3-surface-container-highest transition-colors disabled:opacity-50"
                onclick={() => musicLibraryStore.syncFromMA(maStore)}
                disabled={musicLibraryStore.loading}
            >
                <Sync
                    class="w-5 h-5 {musicLibraryStore.loading
                        ? 'animate-spin'
                        : ''}"
                />
                <span class="text-m3-label-large">
                    {musicLibraryStore.loading
                        ? "Syncing..."
                        : "Sync from Music Assistant"}
                </span>
            </button>
        </div>

        {#if localTracks.length > 0}
            <section class="mb-8">
                <h3
                    class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                >
                    Liked Songs
                </h3>
                <div class="space-y-1">
                    {#each localTracks.slice(0, 20) as item}
                        <div class="relative group">
                            <button
                                class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-m3-surface-container transition-colors text-left pr-12"
                                onclick={() => onPlay(item)}
                            >
                                <div
                                    class="w-12 h-12 rounded bg-m3-surface-container-highest overflow-hidden flex-shrink-0 relative"
                                >
                                    {#if item.image_url}
                                        <img
                                            src={haStore.getProxiedUrl(
                                                item.image_url,
                                            )}
                                            alt={item.name}
                                            class="w-full h-full object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="w-full h-full flex items-center justify-center"
                                        >
                                            <MusicNote
                                                class="w-6 h-6 text-m3-on-surface-variant opacity-30"
                                            />
                                        </div>
                                    {/if}
                                    <!-- Play overlay -->
                                    <div
                                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <PlayArrow class="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p
                                        class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                    >
                                        {item.name}
                                    </p>
                                    <p
                                        class="text-m3-body-small text-m3-on-surface-variant truncate"
                                    >
                                        {getSubtitle(item)}
                                    </p>
                                </div>
                            </button>
                            <!-- Toggle Favorite Button -->
                            <button
                                class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-m3-surface text-m3-on-surface opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:text-m3-on-primary z-10 shadow-sm"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    musicLibraryStore.toggleFavorite(item);
                                }}
                            >
                                <Favorite class="w-5 h-5 text-m3-primary" />
                            </button>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        {#if localPlaylists.length > 0}
            <section class="mb-8">
                <h3
                    class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                >
                    Playlists
                </h3>
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                >
                    {#each localPlaylists as item}
                        <div class="relative group">
                            <button
                                class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                onclick={() => onPlay(item)}
                            >
                                <div
                                    class="aspect-square rounded-md bg-m3-surface-container-highest mb-3 overflow-hidden relative"
                                >
                                    {#if item.image_url}
                                        <img
                                            src={haStore.getProxiedUrl(
                                                item.image_url,
                                            )}
                                            alt={item.name}
                                            class="w-full h-full object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="w-full h-full flex items-center justify-center"
                                        >
                                            <QueueMusic
                                                class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                            />
                                        </div>
                                    {/if}
                                    <!-- Play overlay -->
                                    <div
                                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <div
                                            class="w-12 h-12 rounded-full bg-m3-primary flex items-center justify-center shadow-lg"
                                        >
                                            <PlayArrow
                                                class="w-6 h-6 text-m3-on-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p
                                    class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                >
                                    {item.name}
                                </p>
                            </button>
                            <!-- Toggle Favorite Button -->
                            <button
                                class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    musicLibraryStore.toggleFavorite(item);
                                }}
                            >
                                <Favorite class="w-5 h-5 text-m3-primary" />
                            </button>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        {#if localTracks.length === 0 && localPlaylists.length === 0}
            <div
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <MusicNote
                    class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                />
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    Your library is empty
                </p>
                <p
                    class="text-m3-body-medium text-m3-on-surface-variant opacity-70 mt-1 mb-6"
                >
                    Search for music and tap the heart to add favorites
                </p>
                <button
                    class="flex items-center gap-2 px-6 py-3 rounded-full bg-m3-primary text-m3-on-primary hover:shadow-lg transition-all disabled:opacity-50"
                    onclick={() => musicLibraryStore.syncFromMA(maStore)}
                    disabled={musicLibraryStore.loading}
                >
                    <Sync
                        class="w-5 h-5 {musicLibraryStore.loading
                            ? 'animate-spin'
                            : ''}"
                    />
                    <span class="text-m3-label-large font-bold">
                        {musicLibraryStore.loading
                            ? "Syncing Favorites..."
                            : "Sync from Music Assistant"}
                    </span>
                </button>
            </div>
        {/if}
    {:else if section === "search"}
        <!-- Search Results Section -->
        {#if !searchQuery}
            <div
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <Search
                    class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                />
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    Search for music
                </p>
                <p
                    class="text-m3-body-medium text-m3-on-surface-variant opacity-70 mt-1"
                >
                    Type in the search bar above
                </p>
            </div>
        {:else if searchResults}
            <!-- Playlists Results (Priority 1) -->
            {#if searchResults.playlists.length > 0}
                <section class="mb-8">
                    <h3
                        class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                    >
                        Playlists
                    </h3>
                    <div
                        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                    >
                        {#each searchResults.playlists.slice(0, 8) as item}
                            <div class="relative group">
                                <button
                                    class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                    onclick={() => onPlay(item)}
                                >
                                    <div
                                        class="aspect-square rounded-md bg-m3-surface-container-highest mb-3 overflow-hidden"
                                    >
                                        {#if item.image_url}
                                            <img
                                                src={haStore.getProxiedUrl(
                                                    item.image_url,
                                                )}
                                                alt={item.name}
                                                class="w-full h-full object-cover"
                                            />
                                        {:else}
                                            <div
                                                class="w-full h-full flex items-center justify-center"
                                            >
                                                <QueueMusic
                                                    class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                                />
                                            </div>
                                        {/if}
                                    </div>
                                    <p
                                        class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                    >
                                        {item.name}
                                    </p>
                                </button>
                                <button
                                    class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        musicLibraryStore.toggleFavorite(item);
                                    }}
                                    title={musicLibraryStore.isFavorite(
                                        item.uri,
                                    )
                                        ? "Remove from Library"
                                        : "Add to Library"}
                                >
                                    {#if musicLibraryStore.isFavorite(item.uri)}
                                        <Favorite
                                            class="w-5 h-5 text-m3-primary"
                                        />
                                    {:else}
                                        <FavoriteBorder class="w-5 h-5" />
                                    {/if}
                                </button>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}

            <!-- Albums Results (Priority 2) -->
            {#if searchResults.albums.length > 0}
                <section class="mb-8">
                    <h3
                        class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                    >
                        Albums
                    </h3>
                    <div
                        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                    >
                        {#each searchResults.albums.slice(0, 8) as item}
                            <div class="relative group">
                                <button
                                    class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                    onclick={() => onPlay(item)}
                                >
                                    <div
                                        class="aspect-square rounded-md bg-m3-surface-container-highest mb-3 overflow-hidden relative"
                                    >
                                        {#if item.image_url}
                                            <img
                                                src={haStore.getProxiedUrl(
                                                    item.image_url,
                                                )}
                                                alt={item.name}
                                                class="w-full h-full object-cover"
                                            />
                                        {:else}
                                            <div
                                                class="w-full h-full flex items-center justify-center"
                                            >
                                                <Album
                                                    class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                                />
                                            </div>
                                        {/if}
                                    </div>
                                    <p
                                        class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                    >
                                        {item.name}
                                    </p>
                                    <p
                                        class="text-m3-body-small text-m3-on-surface-variant truncate"
                                    >
                                        {getSubtitle(item)}
                                    </p>
                                </button>
                                <button
                                    class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        musicLibraryStore.toggleFavorite(item);
                                    }}
                                    title={musicLibraryStore.isFavorite(
                                        item.uri,
                                    )
                                        ? "Remove from Library"
                                        : "Add to Library"}
                                >
                                    {#if musicLibraryStore.isFavorite(item.uri)}
                                        <Favorite
                                            class="w-5 h-5 text-m3-primary"
                                        />
                                    {:else}
                                        <FavoriteBorder class="w-5 h-5" />
                                    {/if}
                                </button>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}

            <!-- Songs Results (Priority 3) -->
            {#if searchResults.tracks.length > 0}
                <section class="mb-8">
                    <h3
                        class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                    >
                        Songs
                    </h3>
                    <div class="space-y-1">
                        {#each searchResults.tracks.slice(0, 10) as item}
                            <div class="relative group">
                                <button
                                    class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-m3-surface-container transition-colors text-left pr-12"
                                    onclick={() => onPlay(item)}
                                >
                                    <div
                                        class="w-12 h-12 rounded bg-m3-surface-container-highest overflow-hidden flex-shrink-0"
                                    >
                                        {#if item.image_url}
                                            <img
                                                src={haStore.getProxiedUrl(
                                                    item.image_url,
                                                )}
                                                alt={item.name}
                                                class="w-full h-full object-cover"
                                            />
                                        {:else}
                                            <div
                                                class="w-full h-full flex items-center justify-center"
                                            >
                                                <MusicNote
                                                    class="w-6 h-6 text-m3-on-surface-variant opacity-30"
                                                />
                                            </div>
                                        {/if}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p
                                            class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                        >
                                            {item.name}
                                        </p>
                                        <p
                                            class="text-m3-body-small text-m3-on-surface-variant truncate"
                                        >
                                            {getSubtitle(item)}
                                        </p>
                                    </div>
                                </button>
                                <button
                                    class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-m3-surface text-m3-on-surface opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:text-m3-on-primary z-10 shadow-sm"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        musicLibraryStore.toggleFavorite(item);
                                    }}
                                    title={musicLibraryStore.isFavorite(
                                        item.uri,
                                    )
                                        ? "Remove from Library"
                                        : "Add to Library"}
                                >
                                    {#if musicLibraryStore.isFavorite(item.uri)}
                                        <Favorite
                                            class="w-5 h-5 text-m3-primary"
                                        />
                                    {:else}
                                        <FavoriteBorder class="w-5 h-5" />
                                    {/if}
                                </button>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}

            <!-- Artists Results -->
            {#if searchResults.artists.length > 0}
                <section class="mb-8">
                    <h3
                        class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                    >
                        Artists
                    </h3>
                    <div
                        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                    >
                        {#each searchResults.artists.slice(0, 8) as item}
                            <div class="relative group">
                                <button
                                    class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                    onclick={() => onPlay(item)}
                                >
                                    <div
                                        class="aspect-square rounded-full bg-m3-surface-container-highest mb-3 overflow-hidden"
                                    >
                                        {#if item.image_url}
                                            <img
                                                src={haStore.getProxiedUrl(
                                                    item.image_url,
                                                )}
                                                alt={item.name}
                                                class="w-full h-full object-cover"
                                            />
                                        {:else}
                                            <div
                                                class="w-full h-full flex items-center justify-center"
                                            >
                                                <Person
                                                    class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                                />
                                            </div>
                                        {/if}
                                    </div>
                                    <p
                                        class="text-m3-body-medium font-medium text-m3-on-surface truncate text-center"
                                    >
                                        {item.name}
                                    </p>
                                    <p
                                        class="text-m3-body-small text-m3-on-surface-variant truncate text-center"
                                    >
                                        Artist
                                    </p>
                                </button>
                                <button
                                    class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        musicLibraryStore.toggleFavorite(item);
                                    }}
                                    title={musicLibraryStore.isFavorite(
                                        item.uri,
                                    )
                                        ? "Remove from Library"
                                        : "Add to Library"}
                                >
                                    {#if musicLibraryStore.isFavorite(item.uri)}
                                        <Favorite
                                            class="w-5 h-5 text-m3-primary"
                                        />
                                    {:else}
                                        <FavoriteBorder class="w-5 h-5" />
                                    {/if}
                                </button>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}

            <!-- Radio Results -->
            {#if searchResults.radio.length > 0}
                <section class="mb-8">
                    <h3
                        class="text-m3-title-medium font-bold text-m3-on-surface mb-4"
                    >
                        Radio Stations
                    </h3>
                    <div
                        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                    >
                        {#each searchResults.radio.slice(0, 12) as item}
                            <div class="relative group">
                                <button
                                    class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
                                    onclick={() => onPlay(item)}
                                >
                                    <div
                                        class="aspect-square rounded-md bg-m3-surface-container-highest mb-3 overflow-hidden relative"
                                    >
                                        {#if item.image_url}
                                            <img
                                                src={haStore.getProxiedUrl(
                                                    item.image_url,
                                                )}
                                                alt={item.name}
                                                class="w-full h-full object-cover"
                                            />
                                        {:else}
                                            <div
                                                class="w-full h-full flex items-center justify-center"
                                            >
                                                <Radio
                                                    class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                                                />
                                            </div>
                                        {/if}
                                        <!-- Play overlay -->
                                        <div
                                            class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                                        >
                                            <div
                                                class="w-12 h-12 rounded-full bg-m3-primary flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform"
                                            >
                                                <PlayArrow
                                                    class="w-6 h-6 text-m3-on-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <p
                                        class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                                    >
                                        {item.name}
                                    </p>
                                    <p
                                        class="text-m3-body-small text-m3-on-surface-variant truncate"
                                    >
                                        {item.provider || "Radio"}
                                    </p>
                                </button>
                                <!-- Toggle Favorite Button -->
                                <button
                                    class="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        musicLibraryStore.toggleFavorite(item);
                                    }}
                                    title={musicLibraryStore.isFavorite(
                                        item.uri,
                                    )
                                        ? "Remove from Library"
                                        : "Add to Library"}
                                >
                                    {#if musicLibraryStore.isFavorite(item.uri)}
                                        <Favorite
                                            class="w-5 h-5 text-m3-primary"
                                        />
                                    {:else}
                                        <FavoriteBorder class="w-5 h-5" />
                                    {/if}
                                </button>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}

            {#if searchResults.tracks.length === 0 && searchResults.albums.length === 0 && searchResults.artists.length === 0 && searchResults.playlists.length === 0}
                <div
                    class="flex flex-col items-center justify-center py-12 text-center"
                >
                    <Search
                        class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                    />
                    <p class="text-m3-body-large text-m3-on-surface-variant">
                        No results found
                    </p>
                    <p
                        class="text-m3-body-medium text-m3-on-surface-variant opacity-70 mt-1"
                    >
                        Try a different search term
                    </p>
                </div>
            {/if}
        {/if}
    {/if}
</div>
