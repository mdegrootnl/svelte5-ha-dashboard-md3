<script>
    import { haStore } from "$lib/stores/ha.svelte";
    import { onMount, onDestroy } from "svelte";

    let { entityId, theme = "light", color = "" } = $props();
    let entity = $derived(haStore.getEntity(entityId));

    let duration = $derived(entity?.attributes?.media_duration || 0);
    let positionBase = $derived(entity?.attributes?.media_position || 0);
    let positionUpdatedAt = $derived(
        entity?.attributes?.media_position_updated_at,
    );
    let mediaState = $derived(entity?.state);

    let currentPosition = $state(0);
    /** @type {number | undefined} */
    let raf;

    function updatePosition() {
        if (mediaState === "playing" && positionUpdatedAt && duration > 0) {
            const now = new Date().getTime();
            const updated = new Date(positionUpdatedAt).getTime();
            const diff = (now - updated) / 1000;
            currentPosition = Math.min(positionBase + diff, duration);
        } else {
            currentPosition = positionBase;
        }

        if (mediaState === "playing") {
            raf = requestAnimationFrame(updatePosition);
        }
    }

    $effect(() => {
        if (mediaState === "playing") {
            cancelAnimationFrame(raf || 0);
            raf = requestAnimationFrame(updatePosition);
        } else {
            cancelAnimationFrame(raf || 0);
            currentPosition = positionBase;
        }
        return () => cancelAnimationFrame(raf || 0);
    });

    /** @param {number} seconds */
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    // Theme calculations
    let trackBg = $derived(
        theme === "dark" ? "bg-white/20" : "bg-m3-surface-variant",
    );
    let progressBg = $derived.by(() => {
        if (theme === "dark") return "bg-white";
        if (color) return ""; // Handled inline
        return "bg-m3-primary";
    });

    let progressStyle = $derived.by(() => {
        if (theme !== "dark" && color) return `background-color: ${color};`;
        return "";
    });
    let textColor = $derived(
        theme === "dark"
            ? "text-white/60"
            : "text-m3-on-surface-variant opacity-80",
    );
</script>

{#if duration > 0}
    <div class="flex flex-col gap-1.5 w-full">
        <div class={`w-full h-1 ${trackBg} rounded-full overflow-hidden`}>
            <div
                class={`h-full ${progressBg} transition-all duration-300 ease-linear`}
                style={`width: ${(currentPosition / duration) * 100}%; ${progressStyle}`}
            ></div>
        </div>
        <div
            class={`flex justify-between text-[10px] font-medium leading-none tabular-nums ${textColor}`}
        >
            <span>{formatTime(currentPosition)}</span>
            <span>{formatTime(duration)}</span>
        </div>
    </div>
{/if}
