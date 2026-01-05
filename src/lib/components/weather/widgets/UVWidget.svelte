<script lang="ts">
    import WeatherTile from "./WeatherTile.svelte";
    import { weatherStore } from "$lib/stores/weather.svelte";

    let uv = $derived(weatherStore.data?.current?.uv_index ?? 0);

    let level = $derived.by(() => {
        if (uv <= 2) return "Low";
        if (uv <= 5) return "Moderate";
        if (uv <= 7) return "High";
        if (uv <= 10) return "Very High";
        return "Extreme";
    });

    let colorClass = $derived.by(() => {
        if (uv <= 2) return "text-green-500 fill-green-500"; // Can use m3-tertiary
        if (uv <= 5) return "text-yellow-500 fill-yellow-500"; // Can use m3-secondary
        return "text-red-500 fill-red-500"; // m3-error
    });
</script>

<WeatherTile title="UV Index" icon="wb_sunny">
    <div class="flex flex-col items-center gap-2">
        <!-- Dynamic UV Star Shape -->
        <div class="relative w-24 h-24 flex items-center justify-center">
            <!-- Abstract Sun/Star Shape -->
            <svg
                viewBox="0 0 100 100"
                class="w-full h-full {colorClass} drop-shadow-sm transition-all duration-500"
            >
                <!-- 12-point star approximation (scalloped circle) -->
                <path
                    d="M50 0 C60 10 70 0 80 10 C90 20 100 30 90 40 C100 50 90 60 80 70 C70 80 60 90 50 80 C40 90 30 80 20 70 C10 60 0 50 10 40 C0 30 10 20 20 10 C30 0 40 10 50 0 Z"
                />
            </svg>
            <span
                class="absolute text-title-large font-bold text-white shadow-sm"
                >{Math.round(uv)}</span
            >
        </div>

        <span class="text-title-medium font-medium text-m3-on-surface"
            >{level}</span
        >
    </div>
</WeatherTile>
