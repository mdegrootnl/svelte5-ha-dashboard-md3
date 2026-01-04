<script lang="ts">
    import { weatherStore } from "$lib/stores/weather.svelte";
    import Card from "$lib/components/md3/Card.svelte";

    let current = $derived(weatherStore.data?.current);
</script>

<div class="grid grid-cols-2 gap-2 md:gap-4 h-full">
    <Card
        variant="filled"
        class="p-3 md:p-4 flex flex-col justify-between min-h-[140px] md:min-h-[160px]"
    >
        <div class="flex items-center gap-2 text-primary">
            <span class="material-symbols-outlined text-[20px] md:text-[24px]"
                >wb_sunny</span
            >
            <span
                class="text-label-md md:text-label-lg font-medium opacity-70 truncate"
                >UV Index</span
            >
        </div>
        <div class="flex flex-col">
            <span class="text-headline-md md:text-headline-lg font-bold"
                >{current?.uv_index ?? "-"}</span
            >
            <span class="text-body-sm opacity-60 truncate">
                {current?.uv_index > 5
                    ? "High"
                    : current?.uv_index > 2
                      ? "Moderate"
                      : "Low"}
            </span>
        </div>
    </Card>

    <Card
        variant="filled"
        class="p-3 md:p-4 flex flex-col justify-between min-h-[140px] md:min-h-[160px]"
    >
        <div class="flex items-center gap-2 text-primary">
            <span class="material-symbols-outlined text-[20px] md:text-[24px]"
                >air</span
            >
            <span
                class="text-label-md md:text-label-lg font-medium opacity-70 truncate"
                >Wind</span
            >
        </div>
        <div class="flex flex-col">
            <span class="text-headline-md md:text-headline-lg font-bold"
                >{Math.round(current?.wind_speed_10m ?? 0)}</span
            >
            <span class="text-body-sm opacity-60">km/h</span>
        </div>
    </Card>

    <Card
        variant="filled"
        class="p-3 md:p-4 flex flex-col justify-between min-h-[140px] md:min-h-[160px]"
    >
        <div class="flex items-center gap-2 text-primary">
            <span class="material-symbols-outlined text-[20px] md:text-[24px]"
                >humidity_percentage</span
            >
            <span
                class="text-label-md md:text-label-lg font-medium opacity-70 truncate"
                >Humidity</span
            >
        </div>
        <div class="flex flex-col">
            <span class="text-headline-md md:text-headline-lg font-bold"
                >{current?.relative_humidity_2m ?? "-"}%</span
            >
            <span class="text-body-sm opacity-60 truncate"
                >Dew: {current?.dewpoint_2m
                    ? Math.round(current.dewpoint_2m)
                    : "-"}°</span
            >
        </div>
    </Card>

    <Card
        variant="filled"
        class="p-3 md:p-4 flex flex-col justify-between min-h-[140px] md:min-h-[160px]"
    >
        <div class="flex items-center gap-2 text-primary">
            <span class="material-symbols-outlined text-[20px] md:text-[24px]"
                >compress</span
            >
            <span
                class="text-label-md md:text-label-lg font-medium opacity-70 truncate"
                >Pressure</span
            >
        </div>
        <div class="flex flex-col">
            <span class="text-headline-md md:text-headline-lg font-bold"
                >{current?.surface_pressure ?? "-"}</span
            >
            <span class="text-body-sm opacity-60">hPa</span>
        </div>
    </Card>
</div>
