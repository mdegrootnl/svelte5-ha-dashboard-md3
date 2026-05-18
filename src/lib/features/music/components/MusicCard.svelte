<!--
  MusicCard.svelte
  Reusable card for displaying music items (artists, albums, tracks, playlists, radio)
  
  Features:
  - Artwork with fallback icon
  - Play overlay on hover
  - Favorite toggle button
  - Supports square (default) or circular (artist) image shapes
-->
<script lang="ts">
    import AuthenticatedImage from "$lib/components/common/AuthenticatedImage.svelte";
    import { musicLibraryStore } from "../stores/musicLibrary.svelte";
    import type {
        MAMediaItem,
        MAArtist,
        MAAlbum,
        MATrack,
    } from "$lib/types/musicAssistant";

    import PlayArrow from "~icons/material-symbols/play-arrow";
    import MusicNote from "~icons/material-symbols/music-note";
    import Album from "~icons/material-symbols/album";
    import Person from "~icons/material-symbols/person";
    import Radio from "~icons/material-symbols/radio";
    import QueueMusic from "~icons/material-symbols/queue-music";
    import Favorite from "~icons/material-symbols/favorite";
    import FavoriteBorder from "~icons/material-symbols/favorite-outline";

    interface Props {
        item: MAMediaItem;
        onPlay: (item: MAMediaItem) => void;
        rounded?: boolean; // For artist cards (circular)
    }

    let { item, onPlay, rounded = false }: Props = $props();

    // Get fallback icon based on media type
    function getFallbackIcon() {
        switch (item.media_type) {
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
    function getSubtitle(): string {
        if (item.media_type === "track") {
            const track = item as MATrack;
            return track.artists?.map((a) => a.name).join(", ") || "";
        }
        if (item.media_type === "album") {
            const album = item as MAAlbum;
            return album.artist?.name || "";
        }
        if (item.media_type === "artist") {
            return "Artist";
        }
        if (item.media_type === "playlist") {
            return "Playlist";
        }
        if (item.media_type === "radio") {
            return item.provider || "Radio";
        }
        return item.provider || "";
    }

    const FallbackIcon = getFallbackIcon();
    const isFavorite = $derived(musicLibraryStore.isFavorite(item.uri));
</script>

<div class="relative group">
    <button
        class="w-full bg-m3-surface-container rounded-lg p-3 text-left hover:bg-m3-surface-container-high transition-colors"
        onclick={() => onPlay(item)}
    >
        <div
            class="aspect-square {rounded
                ? 'rounded-full'
                : 'rounded-md'} bg-m3-surface-container-highest mb-3 overflow-hidden relative"
        >
            {#if item.image_url}
                <AuthenticatedImage
                    src={item.image_url}
                    alt={item.name}
                    class="w-full h-full object-cover"
                />
            {:else}
                <div class="w-full h-full flex items-center justify-center">
                    <FallbackIcon
                        class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                    />
                </div>
            {/if}
            <!-- Play overlay -->
            <div
                class="touch-visible absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
                <div
                    class="w-12 h-12 rounded-full bg-m3-primary flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform"
                >
                    <PlayArrow class="w-6 h-6 text-m3-on-primary" />
                </div>
            </div>
        </div>
        <p
            class="text-m3-body-medium font-medium text-m3-on-surface truncate {rounded
                ? 'text-center'
                : ''}"
        >
            {item.name}
        </p>
        <p
            class="text-m3-body-small text-m3-on-surface-variant truncate {rounded
                ? 'text-center'
                : ''}"
        >
            {getSubtitle()}
        </p>
    </button>
    <!-- Toggle Favorite Button -->
    <button
        class="touch-edit-control absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary hover:scale-110 z-10"
        aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
        onclick={(e) => {
            e.stopPropagation();
            musicLibraryStore.toggleFavorite(item);
        }}
    >
        {#if isFavorite}
            <Favorite class="w-5 h-5 text-m3-primary" />
        {:else}
            <FavoriteBorder class="w-5 h-5" />
        {/if}
    </button>
</div>
