<script>
    import { haStore } from "$lib/stores/ha.svelte";
    import SkipPrevious from "~icons/material-symbols/skip-previous";
    import SkipNext from "~icons/material-symbols/skip-next";
    import PlayArrow from "~icons/material-symbols/play-arrow";
    import Pause from "~icons/material-symbols/pause";
    import { themeStore } from "$lib/stores/theme.svelte";

    let { entityId, theme = "light", compact = false, color = "" } = $props();
    let entity = $derived(haStore.getEntity(entityId));
    let state = $derived(entity?.state);
    let isPlaying = $derived(state === "playing");

    function togglePlay() {
        haStore.callService("media_player", "media_play_pause", {
            entity_id: entityId,
        });
    }

    function nextTrack() {
        haStore.callService("media_player", "media_next_track", {
            entity_id: entityId,
        });
    }

    function prevTrack() {
        haStore.callService("media_player", "media_previous_track", {
            entity_id: entityId,
        });
    }

    // Theme calculation
    let baseBtnClass = $derived(
        theme === "dark"
            ? "text-white/70 hover:text-white hover:bg-white/10"
            : "text-m3-on-surface/70 hover:text-m3-on-surface hover:bg-m3-on-surface/5",
    );
    let playBtnClass = $derived.by(() => {
        if (theme === "dark") {
            return "bg-white text-black hover:bg-white/90";
        }
        if (color) {
            return ""; // Handled by inline style
        }
        return "bg-m3-primary-container text-m3-on-primary-container hover:brightness-95";
    });

    let playBtnStyle = $derived.by(() => {
        if (theme === "dark") return "";
        if (color) {
            return `background-color: ${color}; color: white;`;
        }
        return "";
    });

    let baseBtnStyle = $derived.by(() => {
        if (theme === "dark") return "";
        if (color) {
            return `color: ${color};`;
        }
        return "";
    });

    let gapClass = $derived(
        compact
            ? "gap-[clamp(0.125rem,1.5cqmin,0.5rem)]"
            : "gap-[clamp(0.375rem,4cqmin,1.25rem)]",
    );
    let sideButtonSizeClass = $derived(
        compact
            ? "size-[clamp(1.5rem,8cqmin,2.5rem)]"
            : "size-[clamp(2rem,11cqmin,3.5rem)]",
    );
    let playButtonSizeClass = $derived(
        compact
            ? "size-[clamp(1.875rem,10cqmin,3rem)]"
            : "size-[clamp(2.5rem,14cqmin,4.25rem)]",
    );
</script>

<div
    class={`flex items-center justify-center ${gapClass} w-full`}
>
    <!-- Previous Button -->
    <button
        class={`touch-target-compact rounded-full transition-all flex items-center justify-center ${baseBtnClass} ${sideButtonSizeClass}`}
        style={baseBtnStyle}
        onclick={prevTrack}
        aria-label={themeStore.t("mediaCard.previousTrack")}
    >
        <SkipPrevious class="size-[58%]" />
    </button>

    <!-- Play/Pause Button -->
    <button
        class={`touch-target rounded-full transition-all shadow-sm flex items-center justify-center ${playBtnClass} ${playButtonSizeClass}`}
        style={playBtnStyle}
        onclick={togglePlay}
        aria-label={isPlaying ? themeStore.t("music.pause") : themeStore.t("music.play")}
    >
        {#if isPlaying}
            <Pause class="size-[58%]" />
        {:else}
            <PlayArrow class="size-[58%]" />
        {/if}
    </button>

    <!-- Next Button -->
    <button
        class={`touch-target-compact rounded-full transition-all flex items-center justify-center ${baseBtnClass} ${sideButtonSizeClass}`}
        style={baseBtnStyle}
        onclick={nextTrack}
        aria-label={themeStore.t("mediaCard.nextTrack")}
    >
        <SkipNext class="size-[58%]" />
    </button>
</div>
