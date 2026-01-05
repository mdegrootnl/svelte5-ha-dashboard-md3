<script lang="ts">
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import Card from "$lib/components/md3/Card.svelte";
</script>

<Card variant="filled" class="h-full">
    <!-- Header -->
    <div
        class="px-4 py-4 md:px-6 flex justify-between items-center bg-m3-surface-container-highest/50"
    >
        <h2 class="text-title-medium font-bold text-m3-on-surface">
            7-Day Forecast
        </h2>
        <span class="material-symbols-outlined text-m3-outline"
            >calendar_month</span
        >
    </div>

    <!-- Column Headers -->
    <div class="px-4 md:px-6 pb-2 pt-2 border-b border-m3-outline-variant/10">
        <div
            class="grid grid-cols-[4rem_3rem_4rem_1fr_3.5rem_3.5rem] items-center gap-2 text-label-medium text-m3-on-surface-variant opacity-70"
        >
            <span>Day</span>
            <span></span>
            <!-- Icon -->
            <span>Rain</span>
            <span></span>
            <!-- Spacer -->
            <span class="text-right">Min</span>
            <span class="text-right">Max</span>
        </div>
    </div>

    <!-- List -->
    <div class="flex flex-col">
        {#if weatherStore.data}
            {#each weatherStore.data.daily as day, i}
                <div
                    class="group relative grid grid-cols-[4rem_3rem_4rem_1fr_3.5rem_3.5rem] items-center px-4 md:px-6 py-3 md:py-4 gap-2 transition-colors hover:bg-m3-on-surface/[0.04]"
                >
                    <!-- Divider (except last) -->
                    {#if i !== weatherStore.data.daily.length - 1}
                        <div
                            class="absolute bottom-0 left-4 right-4 h-[1px] bg-m3-outline-variant/10 group-hover:hidden"
                        ></div>
                    {/if}

                    <span class="text-body-large font-medium text-m3-on-surface"
                        >{day.date.toLocaleDateString("en-US", {
                            weekday: "short",
                        })}</span
                    >

                    <img
                        src={weatherStore.getIconUrl(
                            day.code,
                            true,
                            themeStore.isDark,
                        )}
                        alt=""
                        class="w-8 h-8 flex-shrink-0"
                    />

                    <!-- Precip Badge or Empty -->
                    <div>
                        {#if day.precip > 0}
                            <div
                                class="inline-flex items-center gap-0.5 text-label-small text-m3-on-primary-container bg-m3-primary-container px-1.5 py-0.5 rounded-md whitespace-nowrap"
                            >
                                <span
                                    class="material-symbols-outlined text-[10px]"
                                    >water_drop</span
                                >
                                {Math.round(day.precip)}%
                            </div>
                        {/if}
                    </div>

                    <!-- Spacer -->
                    <div></div>

                    <span
                        class="text-body-large text-m3-on-surface-variant text-right"
                        >{Math.round(day.min)}°</span
                    >
                    <span
                        class="text-body-large font-bold text-m3-on-surface text-right"
                        >{Math.round(day.max)}°</span
                    >
                </div>
            {/each}
        {:else}
            {#each Array(7) as _}
                <div
                    class="h-12 w-full bg-m3-surface-variant/10 animate-pulse rounded-full m-2"
                ></div>
            {/each}
        {/if}
    </div>
</Card>
