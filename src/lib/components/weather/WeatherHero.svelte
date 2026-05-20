<script lang="ts">
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import Card from "$lib/components/md3/Card.svelte";
    import { fade } from "svelte/transition";
    import { withBase } from "$lib/utils/appBase";

    // Derived state for current weather
    let current = $derived(weatherStore.data?.current);

    // Timer for relative time
    let now = $state(Date.now());

    $effect(() => {
        const interval = setInterval(() => {
            now = Date.now();
        }, 60000);
        return () => clearInterval(interval);
    });

    // Refresh weather when HA config (location) loads
    $effect(() => {
        if (haStore.config) {
            weatherStore.fetch();
        }
    });

    function getVideoSrc(code: number, isDay: boolean): string {
        // Map WMO codes to our downloaded video files
        // New mapping uses strict _day / _night suffixes for everything.

        const suffix = isDay ? "day" : "night";

        // 0: Clear
        if (code === 0) return `clear_${suffix}`;

        // 1, 2, 3: Cloudy variations
        if (code === 1) return `mostly_cloudy_${suffix}`;
        if (code === 2) return `partly_cloudy_${suffix}`;
        if (code === 3) return `cloudy_${suffix}`;

        // 45, 48: Fog
        if (code === 45 || code === 48) return `fog_${suffix}`;

        // 51, 53, 55: Drizzle -> light_rain
        if ([51, 53, 55].includes(code)) return `light_rain_${suffix}`;

        // 56, 57: Freezing Drizzle -> sleet
        if (code === 56 || code === 57) return `sleet_${suffix}`;

        // 61, 63, 65: Rain
        if (code === 61) return `light_rain_${suffix}`;
        if (code === 63) return `rain_${suffix}`;
        if (code === 65) return `heavy_rain_${suffix}`;

        // 66, 67: Freezing Rain -> sleet
        if (code === 66 || code === 67) return `sleet_${suffix}`;

        // 71, 73, 75: Snow
        if (code === 71) return `snow_${suffix}`;
        if (code === 73) return `snow_${suffix}`;
        if (code === 75) return `heavy_snow_${suffix}`;
        if (code === 77) return `snow_${suffix}`;

        // 80, 81, 82: Showers
        if (code === 80) return `scattered_showers_${suffix}`;
        if (code === 81) return `rain_${suffix}`;
        if (code === 82) return `heavy_rain_${suffix}`;

        // 85, 86: Snow showers
        if (code === 85) return `snow_${suffix}`;
        if (code === 86) return `heavy_snow_${suffix}`;

        // 95, 96, 99: Thunderstorm
        if ([95, 96, 99].includes(code)) return `thunderstorm_${suffix}`;

        // Default
        return `clear_${suffix}`;
    }

    // Calculate day/night based on sunrise/sunset if available, otherwise fallback to API is_day
    let isDayTime = $derived.by(() => {
        if (!current) return true;

        const astronomy = weatherStore.data?.astronomy;
        if (astronomy?.sunrise && astronomy?.sunset) {
            return (
                now >= astronomy.sunrise.getTime() && now < astronomy.sunset.getTime()
            );
        }

        // Fallback to API flag
        return current.is_day === 1;
    });

    let videoName = $derived(
        current ? getVideoSrc(current.weather_code, isDayTime) : "clear_day",
    );
    let videoUrl = $derived(withBase(`/weather-videos/${videoName}.mp4`));
</script>

<div class="w-full">
    <Card
        variant="filled"
        class="relative overflow-hidden transition-all duration-300 hover:shadow-lg !p-0 aspect-video group/card"
    >
        <!-- Video Background -->
        {#key videoUrl}
            <div class="absolute inset-0 z-0 bg-surface-variant">
                <video
                    src={videoUrl}
                    autoplay
                    muted
                    loop
                    playsinline
                    class="w-full h-full object-cover transition-opacity duration-1000"
                    in:fade={{ duration: 1000 }}
                ></video>
                <!-- Overlay for legibility -->
                <div class="absolute inset-0 bg-black/60"></div>
            </div>
        {/key}

        <!-- Main Container -->
        <div
            class="relative z-10 w-full h-full flex flex-col justify-between p-6 md:p-8 text-white"
        >
            <!-- Top Row -->
            <div class="flex justify-between items-start w-full">
                <div class="flex flex-col">
                    <span
                        class="text-title-md font-medium opacity-90 tracking-wide"
                        >{themeStore.t("weather.now")}</span
                    >
                    <h1
                        class="text-title-small opacity-80 flex items-center gap-1 mt-1"
                    >
                        <span class="material-symbols-outlined text-[18px]"
                            >location_on</span
                        >
                        {weatherStore.location.name}
                    </h1>
                </div>

                <div class="flex flex-col items-end text-right">
                    <span
                        class="text-headline-small font-bold capitalize drop-shadow-md"
                    >
                        {current
                            ? weatherStore.getConditionText(
                                  current.weather_code,
                              )
                            : themeStore.t("common.loading")}
                    </span>
                    {#if current}
                        <span class="text-label-lg opacity-90 drop-shadow-sm">
                            {themeStore.t("weather.feelsLike", { temperature: Math.round(current.temperature_2m) })}
                        </span>
                    {/if}
                </div>
            </div>

            <!-- Middle / Main Content -->
            <div class="flex-1 flex items-center justify-between">
                <div class="flex items-baseline gap-2">
                    <span
                        class="text-[5rem] md:text-[7rem] leading-none font-bold tracking-tighter drop-shadow-xl"
                    >
                        {current ? Math.round(current.temperature_2m) : "--"}°
                    </span>
                </div>

                {#if current}
                    <!-- Using the icon from store, but maybe white/monochrome version would be better on video? 
                          The store returns a themed path. We might want to force a specific style or just use it. 
                          The 'dark' folder icons usually look good on dark backgrounds. -->
                    <img
                        src={weatherStore.getIconUrl(
                            current.weather_code,
                            current.is_day === 1,
                            true,
                        )}
                        alt={themeStore.t("weather.weatherIcon")}
                        class="w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl opacity-90"
                    />
                {/if}
            </div>

            <!-- Bottom Row -->
            <div class="flex justify-between items-end w-full">
                {#if current && weatherStore.data?.daily?.[0]}
                    {@const today = weatherStore.data.daily[0]}
                    <div
                        class="flex items-center gap-4 text-title-large font-medium drop-shadow-md"
                    >
                        <span class="flex items-center gap-1">
                            <span class="material-symbols-outlined"
                                >arrow_upward</span
                            >
                            {Math.round(today.max)}°
                        </span>
                        <span class="flex items-center gap-1 opacity-80">
                            <span class="material-symbols-outlined"
                                >arrow_downward</span
                            >
                            {Math.round(today.min)}°
                        </span>
                    </div>
                {/if}

                <div
                    class="text-label-md opacity-70 flex items-center gap-1 relative group/refresh"
                >
                    <button
                        class="hover:opacity-100 transition-opacity"
                        onclick={() => weatherStore.fetch()}
                    >
                        <span
                            class="material-symbols-outlined text-[16px] {weatherStore.loading
                                ? 'animate-spin'
                                : ''}"
                        >
                            {weatherStore.loading ? "sync" : "refresh"}
                        </span>
                    </button>
                    <span class:animate-pulse={weatherStore.loading}>
                        {weatherStore.loading
                            ? "Updating..."
                            : weatherStore.lastUpdated
                              ? `Updated ${Math.max(0, Math.floor((now - weatherStore.lastUpdated.getTime()) / 60000))}m ago`
                              : "Just now"}
                    </span>
                </div>
            </div>
        </div>
    </Card>
</div>
