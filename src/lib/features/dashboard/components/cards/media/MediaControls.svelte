<script>
    import { haStore } from "$lib/stores/ha.svelte";
    import SkipPrevious from "~icons/material-symbols/skip-previous";
    import SkipNext from "~icons/material-symbols/skip-next";
    import PlayArrow from "~icons/material-symbols/play-arrow";
    import Pause from "~icons/material-symbols/pause";

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
</script>

<div
    class={`flex items-center justify-center ${compact ? "gap-1" : "gap-4"} w-full`}
>
    <!-- Previous Button -->
    <button
        class={`rounded-full transition-all ${baseBtnClass} ${compact ? "p-1" : "p-2"}`}
        style={baseBtnStyle}
        onclick={prevTrack}
        aria-label="Previous Track"
    >
        <SkipPrevious class={compact ? "w-5 h-5" : "w-7 h-7"} />
    </button>

    <!-- Play/Pause Button -->
    <button
        class={`rounded-full transition-all shadow-sm flex items-center justify-center ${playBtnClass} ${compact ? "p-1.5" : "p-3"}`}
        style={playBtnStyle}
        onclick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
    >
        {#if isPlaying}
            <Pause class={compact ? "w-6 h-6" : "w-8 h-8"} />
        {:else}
            <PlayArrow class={compact ? "w-6 h-6" : "w-8 h-8"} />
        {/if}
    </button>

    <!-- Next Button -->
    <button
        class={`rounded-full transition-all ${baseBtnClass} ${compact ? "p-1" : "p-2"}`}
        style={baseBtnStyle}
        onclick={nextTrack}
        aria-label="Next Track"
    >
        <SkipNext class={compact ? "w-5 h-5" : "w-7 h-7"} />
    </button>
</div>
