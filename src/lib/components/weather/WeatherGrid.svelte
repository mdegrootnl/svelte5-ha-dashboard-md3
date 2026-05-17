<script lang="ts">
    import SunWidget from "./widgets/SunWidget.svelte";
    import UVWidget from "./widgets/UVWidget.svelte";
    import WindWidget from "./widgets/WindWidget.svelte";
    import AQIWidget from "./widgets/AQIWidget.svelte";
    import HumidityWidget from "./widgets/HumidityWidget.svelte";
    import PressureWidget from "./widgets/PressureWidget.svelte";
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 h-full">
    <SunWidget />
    <UVWidget />
    <AQIWidget />
    <WindWidget />
    <HumidityWidget />
    <PressureWidget />
</div>
