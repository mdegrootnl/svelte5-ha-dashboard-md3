<script lang="ts">
    import { weatherStore } from "$lib/stores/weather.svelte";
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import WeatherHero from "$lib/components/weather/WeatherHero.svelte";
    import ForecastStrip from "$lib/components/weather/ForecastStrip.svelte";
    import WeatherGrid from "$lib/components/weather/WeatherGrid.svelte";
    import ForecastList from "$lib/components/weather/ForecastList.svelte";
    import RainRadar from "$lib/components/weather/RainRadar.svelte";
    import RainGraph from "$lib/components/weather/RainGraph.svelte";
    import Card from "$lib/components/md3/Card.svelte";
    import IconButton from "$lib/components/md3/IconButton.svelte";
    import WeatherSettingsSheet from "./WeatherSettingsSheet.svelte";
    import IconSettings from "~icons/material-symbols/settings";
    import { onMount } from "svelte";

    let settingsOpen = $state(false);

    onMount(() => {
        weatherStore.startPolling();
        return () => weatherStore.stopPolling();
    });
</script>

<WeatherSettingsSheet bind:open={settingsOpen} />

<PageShell title="Weather" maxWidth="max-w-none">
    {#snippet actions()}
        <IconButton icon={IconSettings} onclick={() => (settingsOpen = true)} />
    {/snippet}
    <div
        class="grid w-full grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 max-w-[2200px] mx-auto p-4 md:p-6 overflow-hidden"
    >
        <!-- Hero Section -->
        <div class="col-span-1 xl:col-span-8 order-1 min-w-0">
            <WeatherHero />
        </div>

        <!-- Current Details Grid -->
        <div
            class="col-span-1 xl:col-span-4 h-full order-2 xl:order-2 min-w-0"
        >
            <WeatherGrid />
        </div>

        <!-- Hourly Forecast Strip -->
        <div
            class="col-span-1 xl:col-span-12 order-3 min-w-0"
        >
            <h2
                class="mb-4 flex items-center gap-2 px-2 text-m3-title-medium font-bold text-m3-on-surface"
            >
                <span class="material-symbols-outlined">schedule</span>
                Hourly Forecast
            </h2>
            <ForecastStrip />
        </div>

        <!-- 7-Day Forecast -->
        <div class="col-span-1 xl:col-span-5 order-4 min-w-0">
            <ForecastList />
        </div>

        <!-- Radar & Graph Combined -->
        <div class="col-span-1 xl:col-span-7 order-5 min-w-0">
            <Card variant="filled" class="p-4 flex flex-col gap-4 h-full">
                <div class="flex items-center justify-between">
                    <h2 class="flex items-center gap-2 text-m3-title-medium font-bold text-m3-on-surface">
                        <span class="material-symbols-outlined">radar</span>
                        Precipitation Radar
                    </h2>
                    <span class="text-m3-label-medium text-m3-on-surface-variant opacity-70">Buienradar (NL)</span
                    >
                </div>

                <RainRadar />

                <div class="h-[180px] w-full mt-2">
                    <RainGraph />
                </div>
            </Card>
        </div>
    </div>
</PageShell>
