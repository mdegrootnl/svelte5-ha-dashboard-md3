<script lang="ts">
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import Card from "$lib/components/md3/Card.svelte";
</script>

<Card
    variant="outlined"
    class="h-full bg-surface-container-low/50 backdrop-blur-sm"
>
    <div class="p-4 pb-2 flex justify-between items-center">
        <h2 class="text-title-md font-bold">7-Day Forecast</h2>
        <span class="material-symbols-outlined text-outline"
            >calendar_month</span
        >
    </div>

    <!-- Column Headers -->
    <div class="px-6 pb-2">
        <div
            class="grid grid-cols-[4.5rem_auto_1fr_auto] items-center gap-4 text-label-sm text-on-surface-variant opacity-60"
        >
            <span>Day</span>
            <span>Conditions</span>
            <div></div>
            <div class="flex gap-4 lg:gap-8 items-center">
                <span class="w-10 text-right">Low</span>
                <span class="w-10 text-right">High</span>
            </div>
        </div>
    </div>

    <div class="px-2 flex flex-col gap-1">
        {#if weatherStore.data}
            {#each weatherStore.data.daily as day}
                <div
                    class="grid grid-cols-[4.5rem_auto_1fr_auto] items-center p-3 lg:p-4 hover:bg-surface-container-highest rounded-xl transition duration-200 group gap-4"
                >
                    <span class="font-bold text-lg lg:text-xl"
                        >{day.date.toLocaleDateString("en-US", {
                            weekday: "short",
                        })}</span
                    >

                    <div class="flex items-center gap-3 lg:gap-4">
                        <img
                            src={weatherStore.getIconUrl(
                                day.code,
                                true,
                                themeStore.isDark,
                            )}
                            alt=""
                            class="w-8 h-8 lg:w-10 lg:h-10 group-hover:scale-110 transition-transform flex-shrink-0"
                        />
                        {#if day.precip > 0}
                            <div
                                class="flex items-center gap-0.5 text-xs lg:text-sm text-primary font-bold bg-primary-container px-1.5 py-0.5 rounded-md whitespace-nowrap flex-shrink-0"
                            >
                                <span
                                    class="material-symbols-outlined text-[10px] lg:text-[12px]"
                                    >water_drop</span
                                >
                                {Math.round(day.precip)}%
                            </div>
                        {/if}
                    </div>

                    <!-- Spacer -->
                    <div></div>

                    <div
                        class="flex gap-4 lg:gap-8 text-body-lg lg:text-title-sm items-center"
                    >
                        <span class="text-on-surface-variant text-right w-10"
                            >{Math.round(day.min)}°</span
                        >
                        <span class="font-bold text-on-surface text-right w-10"
                            >{Math.round(day.max)}°</span
                        >
                    </div>
                </div>
            {/each}
        {:else}
            {#each Array(7) as _}
                <div
                    class="h-12 w-full bg-surface-variant/10 animate-pulse rounded-lg m-2"
                ></div>
            {/each}
        {/if}
    </div>
</Card>
