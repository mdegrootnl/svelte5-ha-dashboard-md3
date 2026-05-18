<script lang="ts">
    import WeatherTile from "./WeatherTile.svelte";
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { getLanguageLocale } from "$lib/i18n";

    let astronomy = $derived(weatherStore.data?.astronomy);
    let locale = $derived(getLanguageLocale(themeStore.language));

    // 24h Format with fallback
    let sunriseStr = $derived(
        astronomy?.sunrise?.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }) ?? "--:--",
    );
    let sunsetStr = $derived(
        astronomy?.sunset?.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }) ?? "--:--",
    );

    // SVG Constants - Full 24h cycle
    // ViewBox: 0 0 100 70 (horizon at y=35, day peaks at y=8, night dips to y=62)
    const horizonY = 35;
    const startX = 10; // Sunrise point (left)
    const endX = 90; // Sunset point (right)
    const dayPeakY = 8; // Noon peak (above horizon)
    const nightDipY = 62; // Midnight dip (below horizon)

    // Calculate 24h progress (0 = sunrise, 0.5 = sunset, 1 = next sunrise)
    let progress24h = $derived.by(() => {
        if (!astronomy?.sunrise || !astronomy?.sunset) return 0.25; // Default to morning

        const now = new Date().getTime();
        const sunrise = astronomy.sunrise.getTime();
        const sunset = astronomy.sunset.getTime();

        // Day duration and night duration
        const dayDuration = sunset - sunrise;
        const fullDayMs = 24 * 60 * 60 * 1000;
        const nightDuration = fullDayMs - dayDuration;

        if (now >= sunrise && now <= sunset) {
            // Daytime: 0 to 0.5
            return ((now - sunrise) / dayDuration) * 0.5;
        } else if (now > sunset) {
            // After sunset (evening/night): 0.5 to 1
            const nightProgress = (now - sunset) / nightDuration;
            return 0.5 + nightProgress * 0.5;
        } else {
            // Before sunrise (early morning): continue from previous night
            // Calculate as if wrapping from yesterday's sunset
            const prevSunset = sunset - fullDayMs;
            const nightProgress = (now - prevSunset) / nightDuration;
            return 0.5 + nightProgress * 0.5;
        }
    });

    // Is it currently day or night?
    let isDay = $derived(progress24h >= 0 && progress24h <= 0.5);

    // Calculate sun position on the path
    // Day arc: Quadratic bezier from (startX, horizonY) to (endX, horizonY) with peak at (50, dayPeakY)
    // Night arc: Quadratic bezier from (endX, horizonY) to (startX, horizonY) with dip at (50, nightDipY)
    let sunPos = $derived.by(() => {
        if (progress24h <= 0.5) {
            // Day arc: t goes from 0 to 1 as progress goes from 0 to 0.5
            const t = progress24h * 2;
            const invT = 1 - t;
            return {
                x: invT * invT * startX + 2 * invT * t * 50 + t * t * endX,
                y:
                    invT * invT * horizonY +
                    2 * invT * t * dayPeakY +
                    t * t * horizonY,
            };
        } else {
            // Night arc: t goes from 0 to 1 as progress goes from 0.5 to 1
            const t = (progress24h - 0.5) * 2;
            const invT = 1 - t;
            return {
                x: invT * invT * endX + 2 * invT * t * 50 + t * t * startX,
                y:
                    invT * invT * horizonY +
                    2 * invT * t * nightDipY +
                    t * t * horizonY,
            };
        }
    });

    // For the filled day progress area
    let dayProgress = $derived.by(() => {
        const t = Math.min(progress24h * 2, 1); // Clamp to day arc
        const invT = 1 - t;
        return {
            x: invT * invT * startX + 2 * invT * t * 50 + t * t * endX,
            y:
                invT * invT * horizonY +
                2 * invT * t * dayPeakY +
                t * t * horizonY,
            q0x: invT * startX + t * 50,
            q0y: invT * horizonY + t * dayPeakY,
        };
    });
</script>

<WeatherTile title={themeStore.t("weather.sunriseSunset")} icon="wb_twilight">
    <div class="relative w-full h-full flex flex-col justify-between">
        <!-- Top Times (Sunrise / Sunset) -->
        <div class="w-full flex justify-between items-start px-1">
            <div class="flex flex-col items-start leading-none">
                <span
                    class="text-label-medium text-m3-on-surface-variant mb-0.5"
                    >{themeStore.t("weather.sunrise")}</span
                >
                <span class="text-title-large font-bold text-m3-on-surface"
                    >{sunriseStr}</span
                >
            </div>
            <div class="flex flex-col items-end leading-none">
                <span
                    class="text-label-medium text-m3-on-surface-variant mb-0.5"
                    >{themeStore.t("weather.sunset")}</span
                >
                <span class="text-title-large font-bold text-m3-on-surface"
                    >{sunsetStr}</span
                >
            </div>
        </div>

        <!-- 24h Sun Path Graph -->
        <div class="relative w-full flex-1 mt-1">
            <svg
                viewBox="0 0 100 70"
                class="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
            >
                <!-- Horizon Line -->
                <line
                    x1="5"
                    y1={horizonY}
                    x2="95"
                    y2={horizonY}
                    class="stroke-m3-outline-variant/40"
                    stroke-width="1"
                />

                <!-- Day Arc Background (Dashed) -->
                <path
                    d="M {startX},{horizonY} Q 50,{dayPeakY} {endX},{horizonY}"
                    fill="none"
                    class="stroke-m3-outline-variant/30"
                    stroke-width="1.5"
                    stroke-dasharray="3 3"
                />

                <!-- Night Arc Background (Dashed, dimmer) -->
                <path
                    d="M {endX},{horizonY} Q 50,{nightDipY} {startX},{horizonY}"
                    fill="none"
                    class="stroke-m3-outline-variant/20"
                    stroke-width="1"
                    stroke-dasharray="2 4"
                />

                <!-- Day Fill (only if currently day) -->
                {#if isDay}
                    <path
                        d="M {startX},{horizonY} Q {dayProgress.q0x},{dayProgress.q0y} {dayProgress.x},{dayProgress.y} L {dayProgress.x},{horizonY} Z"
                        class="fill-m3-primary/70"
                        stroke="none"
                    />
                    <!-- Day Progress Stroke -->
                    <path
                        d="M {startX},{horizonY} Q {dayProgress.q0x},{dayProgress.q0y} {dayProgress.x},{dayProgress.y}"
                        fill="none"
                        class="stroke-m3-primary"
                        stroke-width="2"
                    />
                {/if}

                <!-- Sun Icon -->
                <circle
                    cx={sunPos.x}
                    cy={sunPos.y}
                    r="5"
                    class="{isDay
                        ? 'fill-yellow-400'
                        : 'fill-slate-400'} stroke-white stroke-2 transition-all duration-1000"
                />
            </svg>
        </div>
    </div>
</WeatherTile>
