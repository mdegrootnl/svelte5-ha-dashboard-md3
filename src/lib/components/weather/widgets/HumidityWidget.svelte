<script lang="ts">
    import WeatherTile from "./WeatherTile.svelte";
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";

    let humidity = $derived(
        weatherStore.data?.current?.relative_humidity_2m ?? 0,
    );
    let temperature = $derived(
        weatherStore.data?.current?.temperature_2m ?? 20,
    );

    // Calculate dew point using Magnus formula
    // Td = (c × γ) / (b - γ) where γ = ln(RH/100) + (b × T) / (c + T)
    // Constants for water vapor (valid for 0°C to 60°C)
    const b = 17.67;
    const c = 243.5;

    let dewPoint = $derived.by(() => {
        if (humidity <= 0 || humidity > 100) return 0;
        const rh = humidity / 100;
        const gamma = Math.log(rh) + (b * temperature) / (c + temperature);
        const dew = (c * gamma) / (b - gamma);
        return Math.round(dew);
    });

    // Fill percentage (0-100)
    let fillPercent = $derived(
        isNaN(humidity) ? 0 : Math.max(0, Math.min(100, humidity)),
    );
</script>

<WeatherTile title={themeStore.t("weather.humidity")} icon="humidity_percentage">
    <div
        class="relative w-full h-full flex items-center justify-between gap-4 px-2"
    >
        <!-- Left: Values -->
        <div class="flex flex-col items-start justify-center">
            <span
                class="text-display-small font-bold text-m3-on-surface leading-none"
            >
                {humidity}<span class="text-headline-small">%</span>
            </span>
            <span class="text-label-medium text-m3-on-surface-variant mt-1">
                {themeStore.t("weather.dewPoint", { temperature: dewPoint })}
            </span>
        </div>

        <!-- Right: Vertical Pill Indicator -->
        <div class="relative flex flex-col items-center gap-1">
            <!-- 100 label -->
            <span
                class="text-label-small text-m3-on-surface-variant font-medium"
                >100</span
            >

            <!-- Pill Container -->
            <div
                class="relative w-8 h-24 rounded-full bg-m3-surface-container-high overflow-hidden"
            >
                <!-- Fill (bottom-up) -->
                <div
                    class="absolute bottom-0 left-0 right-0 bg-m3-tertiary rounded-full transition-all duration-700 ease-out"
                    style="height: {fillPercent}%"
                >
                    <!-- Subtle gradient overlay for depth -->
                    <div
                        class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                    ></div>
                </div>
            </div>

            <!-- 0 label -->
            <span
                class="text-label-small text-m3-on-surface-variant font-medium"
                >0</span
            >
        </div>
    </div>
</WeatherTile>
