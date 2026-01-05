<script lang="ts">
    import WeatherTile from "./WeatherTile.svelte";
    import { weatherStore } from "$lib/stores/weather.svelte";

    let pressure = $derived(
        weatherStore.data?.current?.surface_pressure ?? 1013,
    );

    // Scale: 950 to 1050 usually
    let min = 970;
    let max = 1040;
    let percent = $derived(
        Math.max(0, Math.min(1, (pressure - min) / (max - min))),
    );

    // Arc path calculation
    // Start -135deg, End +135deg. Total 270deg.
    // Radius 40.
</script>

<WeatherTile title="Pressure" icon="compress">
    <div
        class="relative w-full h-full flex flex-col items-center justify-center"
    >
        <div class="relative w-28 h-28">
            <!-- Gauge Background -->
            <svg viewBox="0 0 100 100" class="w-full h-full rotate-[135deg]">
                <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    class="stroke-m3-surface-container-high"
                    stroke-width="8"
                    stroke-dasharray="188.5 251.2"
                    stroke-linecap="round"
                />

                <!-- Value Arc -->
                <!-- Circumference 2*PI*40 = ~251.2. 
                     75% of circle (270deg) is ~188.5. 
                     stroke-dasharray="current_length full_gap"
                -->
                <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    class="stroke-m3-tertiary transition-all duration-1000 ease-out"
                    stroke-width="8"
                    stroke-dasharray="{percent * 188.5} 251.2"
                    stroke-linecap="round"
                />
            </svg>

            <!-- Centered Text (unrotated) -->
            <div
                class="absolute inset-0 flex flex-col items-center justify-center"
            >
                <span class="text-headline-medium font-bold text-m3-on-surface"
                    >{Math.round(pressure)}</span
                >
                <span class="text-label-small text-m3-on-surface-variant"
                    >hPa</span
                >
            </div>
        </div>
    </div>
</WeatherTile>
