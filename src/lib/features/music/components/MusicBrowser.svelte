<!--
  MusicBrowser.svelte
  Grid browser for library content (Spotify-style)
  
  Features:
  - Responsive grid (2-6 columns)
  - Card items with artwork, title, subtitle
  - Different sections: home, browse, radio, library, search
-->
<script lang="ts">
    import { maStore } from "../stores/maStore.svelte";
    import { musicLibraryStore } from "../stores/musicLibrary.svelte";
    import type {
        MAMediaItem,
        MAArtist,
        MAAlbum,
        MATrack,
        MARadio,
        MAPlaylist,
    } from "$lib/types/musicAssistant";

    import MusicNote from "~icons/material-symbols/music-note";
    import Radio from "~icons/material-symbols/radio";
    import Sync from "~icons/material-symbols/sync";

    import MusicSection from "./MusicSection.svelte";
    import MusicCard from "./MusicCard.svelte";

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
        if (section === "browse") {
            loading = true;
            try {
                const [artistsRes, albumsRes, playlistsRes, tracksRes] =
                    await Promise.all([
                        maStore.getArtists(20),
                        maStore.getAlbums(20),
                        maStore.getPlaylists(20),
                        maStore.getTracks(20),
                    ]);

                if (artistsRes.ok) browseArtists = artistsRes.value;
                if (albumsRes.ok) browseAlbums = albumsRes.value;
                if (playlistsRes.ok) browsePlaylists = playlistsRes.value;
                if (tracksRes.ok) browseTracks = tracksRes.value;
            } finally {
                loading = false;
            }
        }
    }

    // Handle search queries
    async function performSearch(query: string) {
        if (!query.trim()) {
            searchResults = null;
            return;
        }
        loading = true;
        try {
            const result = await maStore.search(query, 20);
            if (result.ok) {
                searchResults = result.value;
            } else {
                console.error("Search failed:", result.error);
                searchResults = null;
            }
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
        <MusicSection title="Your Playlists" items={localPlaylists} {onPlay} />
        <MusicSection title="Favorite Albums" items={localAlbums} {onPlay} />

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
        <MusicSection title="Artists" items={browseArtists} {onPlay} rounded />
        <MusicSection title="Albums" items={browseAlbums} {onPlay} />
        <MusicSection title="Playlists" items={browsePlaylists} {onPlay} />
        <MusicSection title="Tracks" items={browseTracks} {onPlay} />
    {:else if section === "radio"}
        <!-- Radio Section -->
        {#if localRadios.length > 0}
            <div
                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
                {#each localRadios as item (item.uri || item.item_id)}
                    <MusicCard {item} {onPlay} />
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

        <MusicSection title="Favorite Tracks" items={localTracks} {onPlay} />
        <MusicSection title="Favorite Albums" items={localAlbums} {onPlay} />
        <MusicSection
            title="Favorite Artists"
            items={localArtists}
            {onPlay}
            rounded
        />
        <MusicSection title="Playlists" items={localPlaylists} {onPlay} />
        <MusicSection title="Radio Stations" items={localRadios} {onPlay} />

        {#if localTracks.length === 0 && localAlbums.length === 0 && localArtists.length === 0 && localPlaylists.length === 0 && localRadios.length === 0}
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
                    class="text-m3-body-medium text-m3-on-surface-variant opacity-70 mt-1"
                >
                    Browse or search for music and tap the heart to add
                    favorites
                </p>
            </div>
        {/if}
    {:else if section === "search"}
        <!-- Search Section -->
        {#if searchResults}
            <MusicSection
                title="Artists"
                items={searchResults.artists}
                {onPlay}
                rounded
            />
            <MusicSection
                title="Albums"
                items={searchResults.albums}
                {onPlay}
            />
            <MusicSection
                title="Tracks"
                items={searchResults.tracks}
                {onPlay}
            />
            <MusicSection
                title="Playlists"
                items={searchResults.playlists}
                {onPlay}
            />
            <MusicSection title="Radio" items={searchResults.radio} {onPlay} />

            {#if searchResults.artists.length === 0 && searchResults.albums.length === 0 && searchResults.tracks.length === 0 && searchResults.playlists.length === 0 && searchResults.radio.length === 0}
                <div
                    class="flex flex-col items-center justify-center py-12 text-center"
                >
                    <MusicNote
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
        {:else if searchQuery}
            <div
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <MusicNote
                    class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                />
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    Start typing to search
                </p>
            </div>
        {:else}
            <div
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <MusicNote
                    class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                />
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    Search for artists, albums, tracks, and more
                </p>
            </div>
        {/if}
    {/if}
</div>
