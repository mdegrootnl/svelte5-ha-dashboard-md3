<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fly, fade } from "svelte/transition";
    import { lockScreenStore } from "$lib/features/lockscreen/stores/lockscreen.svelte";
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { calendarStore } from "$lib/features/calendar/stores/calendar.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { getLanguageLocale } from "$lib/i18n";
    import { untrack } from "svelte";

    let now = $state(new Date());
    let mounted = $state(false);
    let mountTimer: ReturnType<typeof setTimeout>;
    let isActive = $derived(
        mounted && lockScreenStore.enabled && lockScreenStore.isLocked,
    );

    function updateTime() {
        now = new Date();
    }

    function fetchLockScreenData() {
        weatherStore.fetch();
        calendarStore.fetchUpcoming(3);
    }

    onMount(() => {
        mountTimer = setTimeout(() => {
            mounted = true;
        }, 1500);
        updateTime();
    });

    onDestroy(() => {
        clearTimeout(mountTimer);
    });

    $effect(() => {
        if (!isActive) return;

        updateTime();
        const timer = setInterval(updateTime, 1000);

        if (haStore.connectionState === "connected") {
            untrack(fetchLockScreenData);
        }

        const dataTimer = setInterval(() => {
            if (haStore.connectionState === "connected") {
                fetchLockScreenData();
            }
        }, 15 * 60 * 1000);

        return () => {
            clearInterval(timer);
            clearInterval(dataTimer);
        };
    });

    // Formatters
    let locale = $derived(getLanguageLocale(themeStore.language));

    let timeFormatter = $derived(new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
    }));

    let dateFormatter = $derived(new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
    }));

    let listDateFormatter = $derived(new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
    }));

    // Background style
    // Use dynamic CSS variables or inline styles for background images to allow reactivity
    // We treat empty strings as "no image"
    let bgStyle = $derived.by(() => {
        const landscape = lockScreenStore.backgroundLandscape;
        const portrait = lockScreenStore.backgroundPortrait;

        // We will use CSS media queries on the elements themselves or a container
        // to switch between them, but since we are in JS, we can also bind style variables.
        // Better: render two divs and toggle visibility with CSS classes for responsiveness.
        return { landscape, portrait };
    });
</script>

{#if isActive}
    <!-- Fullscreen Overlay -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-[9999] bg-black text-white overflow-hidden cursor-pointer select-none font-sans"
        onclick={() => lockScreenStore.unlock()}
        transition:fade={{ duration: 300 }}
    >
        <!-- Backgrounds -->
        {#if bgStyle.landscape}
            <div
                class="absolute inset-0 bg-cover bg-center hidden md:block transition-all duration-1000 ease-in-out"
                style="background-image: url('{bgStyle.landscape}');"
            ></div>
        {/if}
        {#if bgStyle.portrait}
            <div
                class="absolute inset-0 bg-cover bg-center md:hidden transition-all duration-1000 ease-in-out"
                style="background-image: url('{bgStyle.portrait}');"
            ></div>
        {/if}
        <!-- Fallback gradient if no image -->
        {#if !bgStyle.landscape && !bgStyle.portrait}
            <div
                class="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"
            ></div>
        {/if}

        <!-- Overlay Gradient for legibility -->
        <div
            class="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40"
        ></div>

        <!-- Content Container -->
        <div
            class="relative h-full w-full p-8 md:p-12 flex flex-col justify-between"
        >
            <!-- Top Section -->
            <div
                class="flex flex-col md:flex-row justify-between items-start gap-8"
            >
                <!-- Top Left: Clock & Date -->
                <div class="flex flex-col drop-shadow-lg">
                    <h1
                        class="text-8xl md:text-9xl font-light tracking-tight leading-none"
                    >
                        {timeFormatter.format(now)}
                    </h1>
                    <h2 class="text-3xl md:text-4xl font-light opacity-90 mt-2">
                        {dateFormatter.format(now)}
                    </h2>
                </div>

                <!-- Top Right: Calendar Events -->
                <div class="flex flex-col gap-4 text-right drop-shadow-md">
                    {#each calendarStore.events as event}
                        <div class="flex flex-col items-end">
                            <div class="flex items-baseline gap-2">
                                <span class="text-xl font-medium"
                                    >{event.summary}</span
                                >
                            </div>
                            <div
                                class="flex items-center gap-2 opacity-80 text-sm"
                            >
                                {#if event.allDay}
                                    <span class="font-bold">{themeStore.t("lockscreen.allDay")}</span>
                                    <span
                                        >• {listDateFormatter.format(
                                            event.start,
                                        )}</span
                                    >
                                {:else}
                                    <span
                                        >{listDateFormatter.format(
                                            event.start,
                                        )}</span
                                    >
                                    <span>•</span>
                                    <span
                                        >{timeFormatter.format(event.start)} - {timeFormatter.format(
                                            event.end,
                                        )}</span
                                    >
                                {/if}
                                {#if event.location}
                                    <span>• {event.location}</span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Bottom Section -->
            <div class="flex justify-start items-end drop-shadow-lg">
                <!-- Bottom Left: Weather & Forecast -->
                <div class="flex flex-col gap-4 items-start">
                    {#if weatherStore.data?.current}
                        {@const weather = weatherStore.data.current}
                        {@const forecast = weatherStore.data.daily.slice(0, 5)}
                        <!-- Today + 4 days -->

                        {#await weatherStore.getIconUrl(weather.weather_code, Boolean(weather.is_day), true) then iconUrl}
                            <div
                                class="flex flex-row items-end gap-8 md:gap-12"
                            >
                                <!-- Current Weather (Big) -->
                                <div class="flex flex-col items-start">
                                    <div
                                        class="flex items-center gap-2 opacity-80 mb-1"
                                    >
                                        {#if iconUrl}
                                            <img
                                                src={iconUrl}
                                                alt={themeStore.t("lockscreen.weatherIcon")}
                                                class="w-8 h-8"
                                            />
                                        {/if}
                                        <span class="text-lg font-medium"
                                            >{weather.temperature_2m}°</span
                                        >
                                    </div>
                                    <span
                                        class="text-6xl md:text-8xl font-light leading-none"
                                    >
                                        {weather.temperature_2m}°
                                    </span>
                                </div>

                                <!-- Forecast (Simpler vertical columns) -->
                                {#each forecast as day}
                                    {#await weatherStore.getIconUrl(day.code, true, true) then dayIconUrl}
                                        <div
                                            class="flex flex-col items-center gap-1 opacity-90"
                                        >
                                            <span
                                                class="text-sm font-bold uppercase opacity-70"
                                            >
                                                {listDateFormatter.format(
                                                    new Date(day.date),
                                                )}
                                            </span>
                                            {#if dayIconUrl}
                                                <img
                                                    src={dayIconUrl}
                                                    alt={themeStore.t("lockscreen.forecastIcon")}
                                                    class="w-8 h-8"
                                                />
                                            {/if}
                                            <div
                                                class="flex gap-1 text-sm font-medium"
                                            >
                                                <span class="opacity-100"
                                                    >{Math.round(
                                                        day.max,
                                                    )}°</span
                                                >
                                                <span class="opacity-60"
                                                    >{Math.round(
                                                        day.min,
                                                    )}°</span
                                                >
                                            </div>
                                        </div>
                                    {/await}
                                {/each}
                            </div>
                        {/await}
                    {:else}
                        <div class="flex flex-col gap-1 opacity-60">
                            <span class="text-xl">{themeStore.t("lockscreen.loadingWeather")}</span>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Ensure font weights match the thin look in the design */
    h1,
    h2,
    span {
        text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }
</style>
