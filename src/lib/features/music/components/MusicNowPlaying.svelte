<!--
  MusicNowPlaying.svelte
  Full-screen immersive Now Playing view (Spotify-style)
  
  Features:
  - Blurred album art background with gradient overlay
  - Large centered album artwork
  - Track info (title, artist, album)
  - Progress bar with seek functionality
  - Playback controls (shuffle, prev, play/pause, next, repeat)
  - Volume slider
-->
<script lang="ts">
    import AuthenticatedImage from "$lib/components/common/AuthenticatedImage.svelte";
    import { maStore } from "../stores/maStore.svelte";

    import Close from "~icons/material-symbols/close";
    import PlayArrow from "~icons/material-symbols/play-arrow";
    import Pause from "~icons/material-symbols/pause";
    import SkipPrevious from "~icons/material-symbols/skip-previous";
    import SkipNext from "~icons/material-symbols/skip-next";
    import Shuffle from "~icons/material-symbols/shuffle";
    import Repeat from "~icons/material-symbols/repeat";
    import RepeatOne from "~icons/material-symbols/repeat-one";
    import VolumeUp from "~icons/material-symbols/volume-up";
    import VolumeOff from "~icons/material-symbols/volume-off";
    import QueueMusic from "~icons/material-symbols/queue-music";

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();

    // Derived state from store
    let nowPlaying = $derived(maStore.nowPlaying);
    let artwork = $derived(nowPlaying?.artwork ?? null);

    // Local position tracking (updates every second when playing)
    let currentPosition = $state(0);
    let positionInterval: ReturnType<typeof setInterval> | null = null;

    $effect(() => {
        if (nowPlaying?.isPlaying && nowPlaying?.positionUpdatedAt) {
            // Start interval to update position
            positionInterval = setInterval(() => {
                if (nowPlaying?.positionUpdatedAt) {
                    const elapsed =
                        (Date.now() - nowPlaying.positionUpdatedAt.getTime()) /
                        1000;
                    currentPosition = (nowPlaying?.position || 0) + elapsed;
                }
            }, 1000);
        } else {
            currentPosition = nowPlaying?.position || 0;
            if (positionInterval) {
                clearInterval(positionInterval);
                positionInterval = null;
            }
        }

        return () => {
            if (positionInterval) clearInterval(positionInterval);
        };
    });

    // Format time as MM:SS
    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    // Progress percentage
    let progress = $derived(
        nowPlaying?.duration
            ? (currentPosition / nowPlaying.duration) * 100
            : 0,
    );

    // Handle seek
    function handleSeek(e: MouseEvent) {
        const target = e.currentTarget as HTMLDivElement;
        const rect = target.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const position = percent * (nowPlaying?.duration || 0);
        maStore.seek(position);
    }

    // Cycle repeat mode
    function cycleRepeat() {
        const modes = ["off", "all", "one"] as const;
        const current = nowPlaying?.repeat || "off";
        const idx = modes.indexOf(current);
        const next = modes[(idx + 1) % modes.length];
        maStore.setRepeat(next);
    }

    // Volume control
    let volumeValue = $derived((nowPlaying?.volume || 1) * 100);
    function handleVolumeChange(e: Event) {
        const target = e.target as HTMLInputElement;
        maStore.setVolume(parseInt(target.value) / 100);
    }
</script>

<!-- Full screen overlay -->
<div
    class="fixed inset-0 z-50 flex flex-col bg-black"
    role="dialog"
    aria-modal="true"
    aria-label="Now Playing"
>
    <!-- Background with blurred artwork -->
    {#if artwork}
        <div class="absolute inset-0 overflow-hidden">
            <AuthenticatedImage
                src={artwork}
                alt=""
                class="w-full h-full object-cover scale-110 blur-2xl opacity-50"
            />
            <div
                class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90"
            ></div>
        </div>
    {:else}
        <div
            class="absolute inset-0 bg-gradient-to-b from-m3-surface-container to-m3-surface"
        ></div>
    {/if}

    <!-- Content -->
    <div class="relative z-10 flex flex-col h-full text-white">
        <!-- Header with close button -->
        <header class="flex items-center justify-between p-4">
            <button
                onclick={onClose}
                class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Close"
            >
                <Close class="w-6 h-6" />
            </button>

            <span class="text-sm uppercase tracking-wider text-white/60">
                Now Playing
            </span>

            <!-- Placeholder for symmetry -->
            <div class="w-10 h-10"></div>
        </header>

        <!-- Album Art -->
        <div class="flex-1 flex items-center justify-center p-8 min-h-0">
            {#if artwork}
                <AuthenticatedImage
                    src={artwork}
                    alt="Album Art"
                    class="max-w-full max-h-full aspect-square rounded-lg shadow-2xl object-cover"
                    style="max-height: min(70vh, 400px);"
                />
            {:else}
                <div
                    class="w-64 h-64 rounded-lg bg-white/10 flex items-center justify-center"
                >
                    <QueueMusic class="w-24 h-24 text-white/30" />
                </div>
            {/if}
        </div>

        <!-- Track Info -->
        <div class="px-8 text-center">
            <h2 class="text-2xl font-bold truncate">
                {nowPlaying?.title || "No Track"}
            </h2>
            <p class="text-lg text-white/70 truncate mt-1">
                {nowPlaying?.artist || "Unknown Artist"}
            </p>
            {#if nowPlaying?.album}
                <p class="text-sm text-white/50 truncate mt-1">
                    {nowPlaying.album}
                </p>
            {/if}
        </div>

        <!-- Progress Bar -->
        <div class="px-8 mt-6">
            <button
                class="w-full h-2 bg-white/20 rounded-full cursor-pointer group"
                onclick={handleSeek}
                aria-label="Seek"
            >
                <div
                    class="h-full bg-white rounded-full relative transition-all group-hover:bg-m3-primary"
                    style="width: {progress}%"
                >
                    <div
                        class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    ></div>
                </div>
            </button>
            <div class="flex justify-between mt-2 text-sm text-white/60">
                <span>{formatTime(currentPosition)}</span>
                <span>{formatTime(nowPlaying?.duration || 0)}</span>
            </div>
        </div>

        <!-- Main Controls -->
        <div class="flex items-center justify-center gap-6 mt-6 px-8">
            <!-- Shuffle -->
            {#if nowPlaying && nowPlaying.supported_features & 32768}
                <button
                    onclick={() => maStore.toggleShuffle()}
                    class="w-10 h-10 rounded-full flex items-center justify-center transition-colors
                        {nowPlaying?.shuffle
                        ? 'text-m3-primary'
                        : 'text-white/60 hover:text-white'}"
                    aria-label="Toggle Shuffle"
                >
                    <Shuffle class="w-6 h-6" />
                </button>
            {:else}
                <div class="w-10 h-10"></div>
                <!-- Placeholder to keep alignment -->
            {/if}

            <!-- Previous -->
            {#if nowPlaying && nowPlaying.supported_features & 16}
                <button
                    onclick={() => maStore.previous()}
                    class="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    aria-label="Previous Track"
                >
                    <SkipPrevious class="w-8 h-8" />
                </button>
            {:else}
                <div class="w-12 h-12"></div>
                <!-- Placeholder -->
            {/if}

            <!-- Play/Pause -->
            <button
                onclick={() => maStore.playPause()}
                class="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl"
                aria-label={nowPlaying?.isPlaying ? "Pause" : "Play"}
            >
                {#if nowPlaying?.isPlaying}
                    <Pause class="w-8 h-8" />
                {:else}
                    <PlayArrow class="w-8 h-8" />
                {/if}
            </button>

            <!-- Next -->
            {#if nowPlaying && nowPlaying.supported_features & 32}
                <button
                    onclick={() => maStore.next()}
                    class="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    aria-label="Next Track"
                >
                    <SkipNext class="w-8 h-8" />
                </button>
            {:else}
                <div class="w-12 h-12"></div>
                <!-- Placeholder -->
            {/if}

            <!-- Repeat -->
            {#if nowPlaying && nowPlaying.supported_features & 262144}
                <button
                    onclick={cycleRepeat}
                    class="w-10 h-10 rounded-full flex items-center justify-center transition-colors
                        {nowPlaying?.repeat !== 'off'
                        ? 'text-m3-primary'
                        : 'text-white/60 hover:text-white'}"
                    aria-label="Toggle Repeat"
                >
                    {#if nowPlaying?.repeat === "one"}
                        <RepeatOne class="w-6 h-6" />
                    {:else}
                        <Repeat class="w-6 h-6" />
                    {/if}
                </button>
            {:else}
                <div class="w-10 h-10"></div>
                <!-- Placeholder -->
            {/if}
        </div>

        <!-- Volume Slider -->
        <div class="flex items-center gap-3 px-8 mt-6 mb-8">
            <button
                onclick={() => maStore.toggleMute()}
                class="text-white/60 hover:text-white transition-colors"
                aria-label="Toggle Mute"
            >
                {#if nowPlaying?.isMuted || nowPlaying?.volume === 0}
                    <VolumeOff class="w-5 h-5" />
                {:else}
                    <VolumeUp class="w-5 h-5" />
                {/if}
            </button>

            <input
                type="range"
                min="0"
                max="100"
                value={volumeValue}
                oninput={handleVolumeChange}
                class="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:shadow"
                aria-label="Volume"
            />
        </div>
    </div>
</div>
