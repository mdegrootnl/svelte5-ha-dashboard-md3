<script lang="ts">
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import Card from "$lib/components/md3/Card.svelte";

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
</script>

<div class="col-span-1 md:col-span-2">
    <Card
        variant="filled"
        class="bg-primary-container text-on-primary-container min-h-[220px] md:min-h-[260px] flex items-center justify-between p-4 md:p-8 relative overflow-hidden transition-all duration-300 hover:shadow-lg"
    >
        <!-- Main Container -->
        <div
            class="z-10 w-full max-w-4xl mx-auto h-full flex flex-col justify-between relative"
        >
            <!-- Top Row -->
            <div class="flex justify-between items-start w-full">
                <div class="flex flex-col">
                    <span class="text-title-md font-medium opacity-90">Now</span
                    >
                    <h1
                        class="text-title-sm opacity-60 flex items-center gap-1 mt-1"
                    >
                        <span class="material-symbols-outlined text-[16px]"
                            >location_on</span
                        >
                        {weatherStore.location.name}
                    </h1>
                </div>

                <div class="flex flex-col items-end text-right z-20">
                    <span class="text-title-lg font-bold capitalize">
                        {current
                            ? weatherStore.getConditionText(
                                  current.weather_code,
                              )
                            : "Loading..."}
                    </span>
                    {#if current}
                        <span class="text-label-lg opacity-80"
                            >Feels like {Math.round(
                                current.temperature_2m,
                            )}°</span
                        >
                    {/if}
                </div>
            </div>

            <!-- Middle / Main Content -->
            <div class="flex items-center gap-4 mt-2 mb-4">
                <div class="flex items-baseline text-on-primary-container">
                    <span
                        class="text-[6rem] md:text-[8rem] leading-none font-bold tracking-tighter"
                    >
                        {current ? Math.round(current.temperature_2m) : "--"}°
                    </span>
                </div>

                {#if current}
                    <img
                        src={weatherStore.getIconUrl(
                            current.weather_code,
                            current.is_day === 1,
                            themeStore.isDark,
                        )}
                        alt="Weather Icon"
                        class="w-24 h-24 md:w-32 md:h-32 drop-shadow-lg -ml-2 mt-4 z-20"
                    />
                {/if}
            </div>

            <!-- Bottom Row -->
            <div class="flex justify-between items-end w-full">
                {#if current && weatherStore.data?.daily?.[0]}
                    {@const today = weatherStore.data.daily[0]}
                    <div
                        class="flex items-center gap-3 text-title-md font-medium"
                    >
                        <span class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-[20px]"
                                >arrow_upward</span
                            >
                            {Math.round(today.max)}°
                        </span>
                        <span class="flex items-center gap-1 opacity-70">
                            <span class="material-symbols-outlined text-[20px]"
                                >arrow_downward</span
                            >
                            {Math.round(today.min)}°
                        </span>
                    </div>
                {/if}

                <div
                    class="text-label-md opacity-60 italic flex items-center gap-1 relative group"
                >
                    <span class="material-symbols-outlined text-[14px]">
                        {weatherStore.loading ? "sync" : "refresh"}
                    </span>
                    <span class:animate-pulse={weatherStore.loading}>
                        {weatherStore.loading
                            ? "Updating..."
                            : weatherStore.lastUpdated
                              ? `Updated ${Math.max(0, Math.floor((now - weatherStore.lastUpdated.getTime()) / 60000))}m ago`
                              : "Just now"}
                    </span>
                    <!-- Tooltip -->
                    {#if weatherStore.lastUpdated}
                        <div
                            class="absolute bottom-full right-0 mb-2 px-2 py-1 bg-surface-variant text-on-surface-variant text-label-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                        >
                            {weatherStore.lastUpdated.toLocaleTimeString()}
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Decorative background elements -->
        <div
            class="absolute right-[-20px] top-[-20px] w-48 h-48 md:w-64 md:h-64 bg-primary opacity-10 rounded-full blur-3xl rounded-bl-none pointer-events-none"
        ></div>
    </Card>
</div>
