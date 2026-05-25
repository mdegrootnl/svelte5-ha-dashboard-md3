<script lang="ts">
    import {
        WeatherEnricher,
        type RainDataPoint,
    } from "$lib/domain/weatherEnricher";
    import { haStore } from "$lib/stores/ha.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { area, line, curveMonotoneX } from "d3-shape";
    import { scaleLinear, scaleTime } from "d3-scale";

    import { Poller } from "$lib/utils/poller";

    let width = $state(300);
    let height = $state(100);
    let data = $state<RainDataPoint[]>([]);
    let loading = $state(false);

    // Create poller
    const poller = new Poller("RainGraph", 5 * 60 * 1000, fetchData);

    async function fetchData() {
        if (!haStore.config) return;

        const url = `/rain-proxy?lat=${haStore.config.latitude}&lon=${haStore.config.longitude}`;
        loading = true;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            data = WeatherEnricher.parseBuienradarData(text);
        } catch (e) {
            console.error("[RainGraph] Fetch failed", e);
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        if (haStore.config) {
            poller.start();
            return () => poller.stop();
        }
    });

    // D3 Scales & Generators
    let xScale = $derived(
        scaleTime()
            .domain([
                data[0]?.time ?? new Date(),
                data[data.length - 1]?.time ?? new Date(),
            ])
            .range([0, width]),
    );

    let yScale = $derived(
        scaleLinear()
            .domain(WeatherEnricher.getRainScaleDomain(data))
            .range([height, 0]),
    );

    let areaGen = $derived(
        area<{ time: Date; intensity: number }>()
            .x((d) => xScale(d.time))
            .y0(height)
            .y1((d) => yScale(d.intensity))
            .curve(curveMonotoneX),
    );

    let lineGen = $derived(
        line<{ time: Date; intensity: number }>()
            .x((d) => xScale(d.time))
            .y((d) => yScale(d.intensity))
            .curve(curveMonotoneX),
    );
</script>

<div class="flex flex-col h-full w-full">
    <div class="flex justify-between items-center mb-2">
        <h3 class="text-m3-label-large font-medium text-m3-on-surface-variant">
            {themeStore.t("weather.precipitation")}
        </h3>
        {#if data.length > 0}
            <span class="text-m3-label-small text-m3-on-surface-variant"
                >{themeStore.t("weather.nextMinutes", {
                    minutes: Math.round(
                        (data[data.length - 1].time.getTime() -
                            data[0].time.getTime()) /
                            60000,
                    ),
                })}</span
            >
        {/if}
    </div>

    <div
        class="flex-1 min-h-[100px] w-full"
        bind:clientWidth={width}
        bind:clientHeight={height}
    >
        {#if data.length > 0}
            <svg {width} {height} class="overflow-visible">
                <defs>
                    <linearGradient
                        id="rainGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stop-color="var(--color-m3-primary)"
                            stop-opacity="0.5"
                        />
                        <stop
                            offset="100%"
                            stop-color="var(--color-m3-primary)"
                            stop-opacity="0.1"
                        />
                    </linearGradient>
                </defs>

                <!-- Area -->
                <path d={areaGen(data)} fill="url(#rainGradient)" />

                <!-- Line -->
                <path
                    d={lineGen(data)}
                    fill="none"
                    stroke="var(--color-m3-primary)"
                    stroke-width="2"
                />

                <!-- Grid lines (optional) -->
                <!-- x-axis ticks (every 30 mins roughly?) -->
            </svg>
        {:else}
            <div
                class="flex h-full items-center justify-center text-m3-body-small text-m3-on-surface-variant/60"
            >
                {loading ? themeStore.t("common.loading") : themeStore.t("common.noData")}
            </div>
        {/if}
    </div>

    <!-- Legend / Max Value -->
    <div class="mt-2 flex justify-between px-1 text-m3-label-small text-m3-on-surface-variant">
        <span>{themeStore.t("weather.now")}</span>
        <span
            >{data.length > 0
                ? data[data.length - 1].time.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                  })
                : ""}</span
        >
    </div>
</div>
