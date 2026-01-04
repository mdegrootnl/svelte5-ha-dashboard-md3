<script lang="ts">
    // Buienradar iframe for NL context
    // 52.01, 4.58 (Zevenhuizen)
    const lat = 52.01;
    const lon = 4.58;
    const src = `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${lon}&overname=2&zoom=8&naam=Zevenhuizen&size=2b&voor=1`;
</script>

<div
    class="rounded-3xl overflow-hidden border border-outline-variant h-[300px] md:h-[400px] w-full max-w-full relative bg-surface-container group"
>
    <!-- Overlay to prevent interaction if desired, or allow -->
    <iframe
        title="Buienradar"
        {src}
        class="w-full h-full border-0 grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
        scrolling="no"
    >
    </iframe>
</div>
