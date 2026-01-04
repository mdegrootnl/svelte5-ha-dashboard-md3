<script lang="ts">
    import { weatherStore } from "$lib/stores/weather.svelte";
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import WeatherHero from "$lib/components/weather/WeatherHero.svelte";
    import ForecastStrip from "$lib/components/weather/ForecastStrip.svelte";
    import WeatherGrid from "$lib/components/weather/WeatherGrid.svelte";
    import ForecastList from "$lib/components/weather/ForecastList.svelte";
    import RainRadar from "$lib/components/weather/RainRadarLeaflet.svelte";
</script>

<PageShell title="Weather">
    <div
        class="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 md:gap-6 max-w-[2200px] mx-auto p-4 md:p-6 pb-24 md:pb-6 overflow-hidden"
    >
        <!-- Hero Section -->
        <div class="col-span-1 md:col-span-6 lg:col-span-8 order-1 min-w-0">
            <WeatherHero />
        </div>

        <!-- Current Details Grid -->
        <div
            class="col-span-1 md:col-span-6 lg:col-span-4 h-full order-2 md:order-3 lg:order-2 min-w-0"
        >
            <WeatherGrid />
        </div>

        <!-- Hourly Forecast Strip -->
        <div
            class="col-span-1 md:col-span-6 lg:col-span-12 order-3 md:order-2 lg:order-3 min-w-0"
        >
            <h2
                class="text-title-md font-bold mb-4 px-2 flex items-center gap-2"
            >
                <span class="material-symbols-outlined">schedule</span>
                Hourly Forecast
            </h2>
            <ForecastStrip />
        </div>

        <!-- 7-Day Forecast -->
        <div class="col-span-1 md:col-span-6 lg:col-span-5 order-4 min-w-0">
            <ForecastList />
        </div>

        <!-- Radar -->
        <div
            class="col-span-1 md:col-span-6 lg:col-span-7 flex flex-col gap-4 order-5 min-w-0"
        >
            <div class="flex items-center justify-between px-2">
                <h2 class="text-title-md font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined">radar</span>
                    Precipitation Radar
                </h2>
                <span class="text-label-md opacity-60">Buienradar (NL)</span>
            </div>
            <RainRadar />
        </div>
    </div>
</PageShell>
