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
</script>

<div class="flex items-center gap-3 w-full group/vol">
    <VolumeDown
        class={`${labelColor} w-5 h-5 shrink-0 transition-colors`}
        style={theme !== "dark" && color ? `color: ${color};` : ""}
    />

    <div class="relative flex-1 flex items-center h-5">
        <input
            type="range"
            min="0"
            max="100"
            bind:value={volume}
            oninput={handleSlide}
            class={`w-full h-1 rounded-full appearance-none cursor-pointer transition-all ${trackColor} accent-transparent
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:w-3.5 
                [&::-webkit-slider-thumb]:h-3.5 
                [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:shadow-lg 
                [&::-webkit-slider-thumb]:transition-transform 
                [&::-webkit-slider-thumb]:hover:scale-125
                ${theme === "dark" ? "[&::-webkit-slider-thumb]:bg-white" : "[&::-webkit-slider-thumb]:bg-m3-primary"}
                [&::-moz-range-thumb]:w-3.5 
                [&::-moz-range-thumb]:h-3.5 
                ${theme === "dark" ? "[&::-moz-range-thumb]:bg-white" : "[&::-moz-range-thumb]:bg-m3-primary"}
                [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:border-0`}
        />
        <!-- Active Track Overlay -->
        <div
            class={`absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full pointer-events-none transition-all ${thumbColor}`}
            style={`width: ${volume}%; ${activeTrackStyle}`}
        ></div>
    </div>

    <span
        class={`text-[10px] font-bold w-7 text-right tabular-nums transition-colors ${labelColor}`}
    >
        {volume}%
    </span>
</div>
