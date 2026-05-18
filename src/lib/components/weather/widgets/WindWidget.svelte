<script lang="ts">
    import WeatherTile from "./WeatherTile.svelte";
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";

    // Assuming we don't have direction in current store yet, defaulting to North or random for demo if missing
    // In real app, we need to map attributes.wind_bearing from HA.
    // The current store implementation only explicitly grabs wind_speed_10m.
    // I should probably update store to get bearing too, but for now I'll mock 0 or try to fetch it if available in 'state' object passed through?
    // Actually WeatherStore 'current' object defines specific keys.
    // I can modify WeatherStore to include wind_direction but let's stick to speed for now or use a safe fallback.

    // UPDATE: The user asked for "Wind" widget. The image shows direction "From S".
    // I will assume for now wind_bearing is not available on 'current' (unless I patch it)
    // To match the user request effectively, I'll update WeatherStore to fetch wind_bearing later or just update the variable.
    // Let's assume we can add it to the 'current' object safely.
    // I'll define it locally for now.

    let speed = $derived(
        Math.round(weatherStore.data?.current?.wind_speed_10m ?? 0),
    );
    // Check if we can hackily access attributes from haStore for the weather entity?
    // No, cleaner dev pattern is to rely on store data.
    // I'll proceed with just speed for now and a static icon.
    // Wait, the store actually fetches a bunch of attributes. I missed checking if wind_bearing was mapped.
    // checking `mapHAStateToWMO`... `mapHAForecast`... `init`...
    // The `init` function maps: `wind_speed_10m: attributes.wind_speed`.
    // It does NOT map bearing.
    // Major oversight. I will have to patch `WeatherStore` again or `WeatherGrid` changes won't be full.
    // I'll proceed creating the widget assuming the data key `wind_direction_10m` exists, and then patch the store.

    let direction = $derived(
        isNaN(weatherStore.data?.current?.wind_direction_10m ?? 0)
            ? 0
            : (weatherStore.data?.current?.wind_direction_10m ?? 0),
    );

    function getDirectionText(deg: number) {
        const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        return dirs[Math.round(deg / 45) % 8];
    }
</script>

<WeatherTile title={themeStore.t("weather.wind")} icon="air">
    <div class="flex flex-col items-center gap-1">
        <!-- Fan Graphic -->
        <div class="relative w-28 h-28 flex items-center justify-center p-2">
            <!-- Triangular 'Wind' shape rotated -->
            <svg
                viewBox="0 0 100 100"
                class="w-full h-full text-m3-tertiary-container fill-current transition-transform duration-700 ease-out"
                style="transform: rotate({direction}deg)"
            >
                <!-- Soft rounded triangle pointing up -->
                <path
                    d="M50 5 L90 85 Q50 75 10 85 Z"
                    class="fill-m3-tertiary/20"
                />
                <path
                    d="M50 15 L80 80 Q50 70 20 80 Z"
                    class="fill-m3-tertiary/40"
                />
                <!-- Arrow/Needle -->
                <path
                    d="M50 0 L60 90 L50 80 L40 90 Z"
                    class="fill-m3-tertiary"
                />
            </svg>

            <span
                class="absolute text-headline-small font-bold text-m3-on-surface z-10 drop-shadow-sm leading-none flex flex-col items-center"
            >
                {speed}
                <span class="text-label-small font-normal opacity-70">km/h</span
                >
            </span>
        </div>

        <span class="text-label-medium font-medium text-m3-on-surface-variant">
            {themeStore.t("weather.windFrom", { direction: getDirectionText(direction) })}
        </span>
    </div>
</WeatherTile>
