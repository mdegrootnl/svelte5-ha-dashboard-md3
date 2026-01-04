<script lang="ts">
    import { haStore } from "$lib/stores/ha.svelte";
    import RainGraph from "./RainGraph.svelte";

    // Dynamic location from HA
    let lat = $derived(haStore.config?.latitude ?? 52.01);
    let lon = $derived(haStore.config?.longitude ?? 4.58);
    let locationName = "Home";

    // Adjust zoom and size as needed
    // 'voor=1' likely means forecast=1 (prediction)
    let src = $derived(
        `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${lon}&overname=2&zoom=8&naam=${locationName}&size=2b&voor=1`,
    );
</script>

<div class="flex flex-col gap-4 w-full h-full">
    <!-- Radar Map -->
    <div
        class="rounded-3xl overflow-hidden border border-outline-variant h-[300px] md:h-[350px] w-full relative bg-surface-container group flex-shrink-0"
    >
        <iframe
            title="Buienradar"
            {src}
            class="w-full h-full border-0 grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
            scrolling="no"
        >
        </iframe>
    </div>

    <!-- Rain Graph -->
    <div class="h-[180px] w-full">
        <RainGraph />
    </div>
</div>
