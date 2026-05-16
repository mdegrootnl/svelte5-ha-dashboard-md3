<script lang="ts">
    import * as d3Shape from "d3-shape";
    import * as d3Scale from "d3-scale";
    import { perfCount, perfMeasure } from "$lib/utils/perf";

    interface ChartSeries {
        data: Array<{ timestamp: Date; value: number | null }>;
        color?: string;
        isFilled?: boolean;
        strokeWidth?: number;
    }

    interface Props {
        series?: ChartSeries[];
        // Legacy props for backward compatibility if needed, but we'll focus on series
        data?: Array<{ timestamp: Date; value: number | null }>;
        height?: number;
        color?: string;
        isFilled?: boolean;
        strokeWidth?: number;
        startTime?: Date;
        endTime?: Date;
    }

    let {
        series = [],
        data = [],
        height = 50,
        color = "var(--color-m3-primary)",
        isFilled = true,
        strokeWidth = 2,
        startTime,
        endTime,
    }: Props = $props();

    function extendToEdges(
        dataPts: Array<{ timestamp: Date; value: number | null }>,
    ): Array<{ timestamp: Date; value: number | null }> {
        if (!startTime || !endTime || dataPts.length === 0) return dataPts;

        const result = [...dataPts];
        const first = result[0];
        const last = result[result.length - 1];

        // Ensure we have something at the exact start
        if (first.timestamp.getTime() > startTime.getTime()) {
            result.unshift({
                timestamp: startTime,
                value: first.value,
            });
        }

        // Ensure we have something at the exact end
        if (last.timestamp.getTime() < endTime.getTime()) {
            result.push({
                timestamp: endTime,
                value: last.value,
            });
        }

        return result;
    }

    // Normalize series: if `data` is provided instead of `series`, use it as a single series
    let activeSeries = $derived.by(() => {
        let raw: ChartSeries[] = [];
        if (series.length > 0) {
            raw = series;
        } else if (data.length > 0) {
            raw = [
                {
                    data,
                    color,
                    isFilled,
                    strokeWidth,
                },
            ];
        }

        return raw.map((s) => ({
            ...s,
            data: extendToEdges(s.data),
        }));
    });

    let container = $state<HTMLElement>();
    let width = $state(0);
    let trackedHeight = $state(0);

    // Gradient ID to ensure uniqueness if multiple charts exist
    const gradientId = `grad-${Math.random().toString(36).slice(2, 9)}`;

    function requestChartFrame(callback: FrameRequestCallback) {
        if (typeof requestAnimationFrame === "function") {
            return requestAnimationFrame(callback);
        }
        return setTimeout(() => callback(performance.now()), 0) as unknown as number;
    }

    function cancelChartFrame(id: number) {
        if (typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(id);
        } else {
            clearTimeout(id);
        }
    }

    $effect(() => {
        if (!container) return;
        let frame: number | null = null;
        let nextWidth = 0;
        let nextHeight = 0;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[entries.length - 1];
            if (!entry) return;

            nextWidth = entry.contentRect.width;
            nextHeight = entry.contentRect.height;

            if (frame !== null) return;
            frame = requestChartFrame(() => {
                frame = null;
                width = nextWidth;
                trackedHeight = nextHeight;
                perfCount("chart.resize");
            });
        });
        observer.observe(container);
        return () => {
            if (frame !== null) cancelChartFrame(frame);
            observer.disconnect();
        };
    });

    const chartBounds = $derived.by(() => {
        let minTime = Number.POSITIVE_INFINITY;
        let maxTime = Number.NEGATIVE_INFINITY;
        let minValue = Number.POSITIVE_INFINITY;
        let maxValue = Number.NEGATIVE_INFINITY;
        let hasPoints = false;
        let hasValues = false;

        for (const active of activeSeries) {
            for (const point of active.data) {
                const time = point.timestamp.getTime();
                if (Number.isFinite(time)) {
                    hasPoints = true;
                    if (time < minTime) minTime = time;
                    if (time > maxTime) maxTime = time;
                }

                if (point.value !== null) {
                    hasValues = true;
                    if (point.value < minValue) minValue = point.value;
                    if (point.value > maxValue) maxValue = point.value;
                }
            }
        }

        return {
            minTime,
            maxTime,
            minValue: hasValues ? minValue : 0,
            maxValue: hasValues ? maxValue : 100,
            hasPoints,
        };
    });

    const x = $derived.by(() => {
        if (startTime && endTime) {
            return d3Scale
                .scaleTime()
                .domain([startTime, endTime])
                .range([0, width]);
        }

        if (!chartBounds.hasPoints)
            return d3Scale.scaleTime().range([0, width]);

        return d3Scale
            .scaleTime()
            .domain([new Date(chartBounds.minTime), new Date(chartBounds.maxTime)])
            .range([0, width]);
    });

    const y = $derived.by(() => {
        const minVal = chartBounds.minValue;
        const maxVal = chartBounds.maxValue;

        // Use trackedHeight if available, fallback to height prop
        const currentHeight = trackedHeight || height;

        // Add small padding to y domain so line doesn't hit edges
        const padding = (maxVal - minVal) * 0.1 || 1;

        return d3Scale
            .scaleLinear()
            .domain([minVal - padding, maxVal + padding])
            .range([currentHeight, 0]);
    });

    const paths = $derived.by(() =>
        perfMeasure("chart.paths", () => activeSeries.map((s, idx) => {
            const currentHeight = trackedHeight || height;
            const line = d3Shape
                .line<{ timestamp: Date; value: number | null }>()
                .x((d) => x(d.timestamp))
                .y((d) => y(d.value ?? 0))
                .defined((d) => d.value !== null)
                .curve(d3Shape.curveMonotoneX);

            const area = d3Shape
                .area<{ timestamp: Date; value: number | null }>()
                .x((d) => x(d.timestamp))
                .y0(currentHeight)
                .y1((d) => y(d.value ?? 0))
                .defined((d) => d.value !== null)
                .curve(d3Shape.curveMonotoneX);

            return {
                id: `series-${idx}`,
                linePath: line(s.data) || "",
                areaPath: area(s.data) || "",
                color: s.color || "var(--color-m3-primary)",
                isFilled: s.isFilled !== false,
                strokeWidth: s.strokeWidth ?? strokeWidth,
                gradientId: `${gradientId}-${idx}`,
            };
        })),
    );
</script>

<div bind:this={container} class="chart-container">
    {#if width > 0 && activeSeries.length > 0}
        {@const currentHeight = trackedHeight || height || 100}
        <svg viewBox="0 0 {width} {currentHeight}" preserveAspectRatio="none">
            <defs>
                {#each paths as p}
                    <linearGradient
                        id={p.gradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stop-color={p.color}
                            stop-opacity="0.4"
                        />
                        <stop
                            offset="100%"
                            stop-color={p.color}
                            stop-opacity="0"
                        />
                    </linearGradient>
                {/each}
            </defs>

            {#each paths as p}
                {#if p.isFilled}
                    <path d={p.areaPath} fill="url(#{p.gradientId})" />
                {/if}

                <path
                    d={p.linePath}
                    fill="none"
                    stroke={p.color}
                    stroke-width={p.strokeWidth}
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            {/each}
        </svg>
    {/if}
</div>

<style>
    .chart-container {
        width: 100%;
        height: 100%;
        min-height: inherit;
        overflow: hidden;
        display: flex;
        align-items: flex-end;
    }

    svg {
        display: block;
        width: 100%;
        height: 100%;
    }
</style>
