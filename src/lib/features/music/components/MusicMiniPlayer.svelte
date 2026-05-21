<!--
  MusicMiniPlayer.svelte
  Compact player bar fixed at bottom of screen (Spotify-style)
  
  Features:
  - Album art thumbnail
  - Track title + artist (truncated)
  - Play/Pause button
  - Thin progress line at top
  - Tapping expands to full Now Playing view
-->
<script lang="ts">
    import AuthenticatedImage from "$lib/components/common/AuthenticatedImage.svelte";
    import { maStore } from "../stores/maStore.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";

    import PlayArrow from "~icons/material-symbols/play-arrow";
    import Pause from "~icons/material-symbols/pause";
    import SkipPrevious from "~icons/material-symbols/skip-previous";
    import SkipNext from "~icons/material-symbols/skip-next";
    import VolumeUp from "~icons/material-symbols/volume-up";
    import VolumeOff from "~icons/material-symbols/volume-off";
    import MusicNote from "~icons/material-symbols/music-note";
    import SpeakerIcon from "~icons/material-symbols/speaker";

    interface Props {
        onclick?: () => void;
    }

    let { onclick }: Props = $props();

    // Derived state from store
    let nowPlaying = $derived(maStore.nowPlaying);
    let activePlayer = $derived(
        maStore.activePlayerId ? maStore.players[maStore.activePlayerId] : null,
    );
    let artwork = $derived(nowPlaying?.artwork ?? null);

    // Progress percentage
    let progress = $derived(
        nowPlaying?.duration && nowPlaying?.position
            ? (nowPlaying.position / nowPlaying.duration) * 100
            : 0,
    );

    // Stop event propagation for controls
    function handlePlayPause(e: MouseEvent) {
        e.stopPropagation();
        maStore.playPause();
    }

    const volumeRangeStyle =
        "--touch-range-track-color: color-mix(in srgb, var(--color-m3-on-surface-variant) 30%, transparent); --touch-range-thumb-color: var(--color-m3-primary);";
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="w-full bg-m3-surface-container-highest border-t border-m3-outline-variant shadow-lg cursor-pointer touch-manipulation"
    {onclick}
>
    <!-- Progress bar at top -->
    <div class="h-0.5 bg-m3-surface-container relative">
        <div
            class="h-full bg-m3-primary transition-all duration-1000 ease-linear"
            style="width: {progress}%"
        ></div>
    </div>

    <div class="mx-auto flex w-full max-w-6xl items-center gap-3 p-3">
        <!-- Album Art or Player Icon -->
        {#if artwork}
            <AuthenticatedImage
                src={artwork}
                alt={themeStore.t("music.nowPlaying")}
                class="w-12 h-12 rounded-md object-cover shadow-sm flex-shrink-0"
            />
        {:else}
            <div
                class="w-12 h-12 rounded-md bg-m3-surface-container flex items-center justify-center flex-shrink-0"
            >
                {#if nowPlaying}
                    <MusicNote
                        class="w-6 h-6 text-m3-on-surface-variant opacity-50"
                    />
                {:else}
                    <SpeakerIcon
                        class="w-6 h-6 text-m3-on-surface-variant opacity-50"
                    />
                {/if}
            </div>
        {/if}

        <!-- Track Info -->
        <div class="flex-1 min-w-0 text-left">
            {#if nowPlaying}
                <p
                    class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                >
                    {nowPlaying.title}
                </p>
                <p
                    class="text-m3-body-small text-m3-on-surface-variant truncate"
                >
                    {nowPlaying.artist || themeStore.t("common.unknownArtist")}
                </p>
            {:else}
                <p
                    class="text-m3-body-medium font-medium text-m3-on-surface truncate"
                >
                    {activePlayer?.attributes?.friendly_name || themeStore.t("music.search.ready")}
                </p>
                <p
                    class="text-m3-body-small text-m3-on-surface-variant truncate capitalize"
                >
                    {activePlayer?.state || themeStore.t("music.search.selectTrack")}
                </p>
            {/if}
        </div>

        <!-- Volume Control (centered on tablet/desktop) -->
        {#if nowPlaying}
            <div
                class="hidden min-w-0 flex-1 items-center justify-center gap-3 px-2 md:flex"
                onclick={(e) => e.stopPropagation()}
            >
                <button
                    onclick={() => maStore.toggleMute()}
                    class="touch-target-compact rounded-full text-m3-on-surface-variant hover:text-m3-on-surface transition-colors"
                    aria-label={themeStore.t("music.mute")}
                >
                    {#if nowPlaying.isMuted || nowPlaying.volume === 0}
                        <VolumeOff class="w-5 h-5" />
                    {:else}
                        <VolumeUp class="w-5 h-5" />
                    {/if}
                </button>

                <input
                    type="range"
                    min="0"
                    max="100"
                    value={(nowPlaying.volume || 0) * 100}
                    oninput={(e) =>
                        maStore.setVolume(
                            parseInt(e.currentTarget.value) / 100,
                        )}
                    style={volumeRangeStyle}
                    class="touch-range w-full min-w-40 max-w-72 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:bg-m3-primary
                        [&::-webkit-slider-thumb]:rounded-full"
                    aria-label={themeStore.t("music.volume")}
                />
            </div>
        {/if}

        <!-- Player Controls -->
        <div class="flex shrink-0 items-center gap-2">
            <!-- Previous -->
            {#if nowPlaying && nowPlaying.supported_features & 16}
                <button
                    onclick={(e) => {
                        e.stopPropagation();
                        maStore.previous();
                    }}
                    class="touch-target-compact w-10 h-10 rounded-full text-m3-on-surface hover:bg-m3-on-surface/10 flex items-center justify-center transition-colors"
                    aria-label={themeStore.t("music.previous")}
                >
                    <SkipPrevious class="w-6 h-6" />
                </button>
            {/if}

            <!-- Play/Pause Button -->
            <button
                onclick={handlePlayPause}
                class="touch-target-compact w-10 h-10 rounded-full bg-m3-primary text-m3-on-primary flex items-center justify-center hover:bg-m3-primary/90 transition-colors flex-shrink-0 shadow-sm"
                aria-label={nowPlaying?.isPlaying ? themeStore.t("music.pause") : themeStore.t("music.play")}
            >
                {#if nowPlaying?.isPlaying}
                    <Pause class="w-6 h-6" />
                {:else}
                    <PlayArrow class="w-6 h-6" />
                {/if}
            </button>

            <!-- Next -->
            {#if nowPlaying && nowPlaying.supported_features & 32}
                <button
                    onclick={(e) => {
                        e.stopPropagation();
                        maStore.next();
                    }}
                    class="touch-target-compact w-10 h-10 rounded-full text-m3-on-surface hover:bg-m3-on-surface/10 flex items-center justify-center transition-colors"
                    aria-label={themeStore.t("music.next")}
                >
                    <SkipNext class="w-6 h-6" />
                </button>
            {/if}
        </div>

    </div>
</div>
