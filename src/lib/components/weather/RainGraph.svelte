<script lang="ts">
    import { haStore } from "$lib/stores/ha.svelte";
    import { area, line, curveMonotoneX } from "d3-shape";
    import { scaleLinear, scaleTime } from "d3-scale";
    import { onMount } from "svelte";

    let width = $state(300);
    let height = $state(100);
    let data = $state<{ time: Date; value: number; intensity: number }[]>([]);
    let loading = $state(false);

    // Debug: confirm module load
    console.log("[RainGraph] Module Loaded");

    async function fetchData() {
        if (!haStore.config) {
            console.log("[RainGraph] No HA config, waiting...");
            return;
        }

        const url = `/rain-proxy?lat=${haStore.config.latitude}&lon=${haStore.config.longitude}`;
        console.log("[RainGraph] Fetching Proxy:", url);
        loading = true;
        try {
            const res = await fetch(url);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const text = await res.text();
            console.log(
                "[RainGraph] Received text:",
                text.substring(0, 50) + "...",
            );

            // Format: "000|15:30" (value|time)
            const lines = text.trim().split("\n");
            const now = new Date();

            data = lines.map((l) => {
                const [valStr, timeStr] = l.split("|");
                const val = parseInt(valStr);

                // Parse Time
                const [h, m] = timeStr.split(":").map(Number);
                let date = new Date(now);
                date.setHours(h, m, 0, 0);

                // Handle date rollover (if time is much earlier than now, assume tomorrow)
                // Buienradar gives ~2hr forecast.
                // If now is 23:00 and time is 00:30, 00:30 < 23:00.
                if (date.getTime() < now.getTime() - 4 * 60 * 60 * 1000) {
                    date.setDate(date.getDate() + 1);
                }
                // Also if now is 00:30 and time is 23:30 (unlikely for forecast, but possible for history?)
                // Buienradar is purely forecast.

                // Formula: 10^((val-109)/32)
                let intensity = Math.pow(10, (val - 109) / 32);
                if (val === 0) intensity = 0; // Explicit 0 for no rain

                return {
                    time: date,
                    value: val,
                    intensity,
                };
            });
            console.log("[RainGraph] Parsed data points:", data.length);
        } catch (e) {
            console.error("[RainGraph] Fetch failed", e);
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        if (haStore.config) {
            console.log("[RainGraph] Config detected, triggering fetch");
            fetchData();
            // Refresh every 5 mins
            const i = setInterval(fetchData, 5 * 60 * 1000);
            return () => clearInterval(i);
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
            .domain([0, Math.max(2, ...data.map((d) => d.intensity))]) // Min max 2 for visual stability
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
        <h3 class="text-label-lg font-medium text-on-surface-variant">
            Precipitation (mm/h)
        </h3>
        {#if data.length > 0}
            <span class="text-label-sm text-on-surface-variant"
                >Next {Math.round(
                    (data[data.length - 1].time.getTime() -
                        data[0].time.getTime()) /
                        60000,
                )} min</span
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
                class="flex items-center justify-center h-full text-on-surface-variant/50 text-sm"
            >
                {loading ? "Loading..." : "No Data"}
            </div>
        {/if}
    </div>

    <!-- Legend / Max Value -->
    <div class="mt-2 flex justify-between text-xs text-on-surface-variant px-1">
        <span>Now</span>
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
