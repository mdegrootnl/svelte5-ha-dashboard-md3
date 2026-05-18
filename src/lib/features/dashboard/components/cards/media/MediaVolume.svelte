<script>
    import { haStore } from "$lib/stores/ha.svelte";
    import VolumeDown from "~icons/material-symbols/volume-down";

    let { entityId, theme = "light", color = "" } = $props();
    let entity = $derived(haStore.getEntity(entityId));

    // Local state for smooth dragging
    let volume = $state(0);
    /** @type {any} */
    let timeout;

    // Sync local state with HA when not dragging
    $effect(() => {
        if (entity?.attributes?.volume_level !== undefined) {
            // Only update if we're not actively dragging
            if (
                !document.activeElement ||
                !(document.activeElement instanceof HTMLInputElement) ||
                document.activeElement.type !== "range"
            ) {
                volume = Math.round(entity.attributes.volume_level * 100);
            }
        }
    });

    /** @param {number} vol */
    function updateVolumeDebounced(vol) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            haStore.callService("media_player", "volume_set", {
                entity_id: entityId,
                volume_level: vol / 100,
            });
        }, 500);
    }

    /** @param {Event} e */
    function handleSlide(e) {
        const target = /** @type {HTMLInputElement} */ (e.target);
        volume = parseInt(target.value);
        updateVolumeDebounced(volume);
    }

    // Theme styles
    let labelColor = $derived(
        theme === "dark" ? "text-white/60" : "text-m3-on-surface-variant",
    );
    let trackColor = $derived(
        theme === "dark" ? "bg-white/20" : "bg-m3-surface-variant",
    );
    let thumbColor = $derived.by(() => {
        if (theme === "dark") return "bg-white";
        if (color) return ""; // Handled inline
        return "bg-m3-primary";
    });

    let thumbStyle = $derived.by(() => {
        if (theme !== "dark" && color) return `background-color: ${color};`;
        return "";
    });

    let activeTrackStyle = $derived.by(() => {
        if (theme !== "dark" && color)
            return `background-color: ${color}; opacity: 0.6;`;
        return "";
    });

    let rangeStyle = $derived.by(() => {
        const track = theme === "dark"
            ? "rgb(255 255 255 / 0.2)"
            : "var(--color-m3-surface-variant)";
        const thumb = theme === "dark"
            ? "white"
            : color || "var(--color-m3-primary)";
        return `--touch-range-track-color: ${track}; --touch-range-thumb-color: ${thumb};`;
    });
</script>

<div class="flex items-center gap-[clamp(0.375rem,3cqmin,1rem)] w-full group/vol">
    <VolumeDown
        class={`${labelColor} size-[clamp(1rem,5cqmin,1.5rem)] shrink-0 transition-colors`}
        style={theme !== "dark" && color ? `color: ${color};` : ""}
    />

    <div class="relative flex-1 flex items-center min-h-[var(--touch-target-compact)]">
        <input
            type="range"
            min="0"
            max="100"
            bind:value={volume}
            oninput={handleSlide}
            style={rangeStyle}
            class={`touch-range w-full rounded-full appearance-none cursor-pointer transition-all ${trackColor} accent-transparent
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:w-[clamp(0.75rem,3.5cqmin,1.125rem)] 
                [&::-webkit-slider-thumb]:h-[clamp(0.75rem,3.5cqmin,1.125rem)] 
                [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:shadow-lg 
                [&::-webkit-slider-thumb]:transition-transform 
                [&::-webkit-slider-thumb]:hover:scale-125
                ${theme === "dark" ? "[&::-webkit-slider-thumb]:bg-white" : "[&::-webkit-slider-thumb]:bg-m3-primary"}
                [&::-moz-range-thumb]:w-[clamp(0.75rem,3.5cqmin,1.125rem)] 
                [&::-moz-range-thumb]:h-[clamp(0.75rem,3.5cqmin,1.125rem)] 
                ${theme === "dark" ? "[&::-moz-range-thumb]:bg-white" : "[&::-moz-range-thumb]:bg-m3-primary"}
                [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:border-0`}
        />
        <!-- Active Track Overlay -->
        <div
            class={`absolute left-0 top-1/2 -translate-y-1/2 h-[clamp(0.1875rem,1cqmin,0.375rem)] rounded-full pointer-events-none transition-all ${thumbColor}`}
            style={`width: ${volume}%; ${activeTrackStyle}`}
        ></div>
    </div>

    <span
        class={`text-[clamp(0.625rem,2.8cqmin,0.875rem)] font-bold w-[clamp(1.5rem,7cqmin,2.5rem)] text-right tabular-nums transition-colors ${labelColor}`}
    >
        {volume}%
    </span>
</div>
