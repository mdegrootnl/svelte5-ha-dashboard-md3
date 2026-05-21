<script lang="ts">
    import * as d3Shape from "d3-shape";
    import * as d3Scale from "d3-scale";
    import { perfCount, perfMeasure } from "$lib/utils/perf";
    import type { GraphChartType } from "$lib/types/dashboard";

    interface ChartSeries {
        data: Array<{ timestamp: Date; value: number | null }>;
        color?: string;
        isFilled?: boolean;
        strokeWidth?: number;
        chartType?: GraphChartType;
        strokeDasharray?: string;
        opacity?: number;
    }

    interface ChartThreshold {
        value: number;
        color?: string;
        label?: string;
    }

    interface ChartRangeBand {
        min: number;
        max: number;
        color?: string;
        label?: string;
    }

    interface ChartBandRect {
        id: string;
        y: number;
        height: number;
        color: string;
        label?: string;
    }

    interface ChartThresholdLine {
        id: string;
        y: number;
        color: string;
        label?: string;
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
        chartType?: GraphChartType;
        thresholds?: ChartThreshold[];
        rangeBands?: ChartRangeBand[];
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
        chartType = "area",
        thresholds = [],
        rangeBands = [],
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
            chartType: s.chartType ?? chartType,
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

        for (const threshold of thresholds) {
            if (!Number.isFinite(threshold.value)) continue;
            hasValues = true;
            if (threshold.value < minValue) minValue = threshold.value;
            if (threshold.value > maxValue) maxValue = threshold.value;
        }

        for (const band of rangeBands) {
            const min = Math.min(band.min, band.max);
            const max = Math.max(band.min, band.max);
            if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
            hasValues = true;
            if (min < minValue) minValue = min;
            if (max > maxValue) maxValue = max;
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
            const seriesChartType = s.chartType ?? chartType;
            const curve =
                seriesChartType === "step"
                    ? d3Shape.curveStepAfter
                    : d3Shape.curveMonotoneX;
            const line = d3Shape
                .line<{ timestamp: Date; value: number | null }>()
                .x((d) => x(d.timestamp))
                .y((d) => y(d.value ?? 0))
                .defined((d) => d.value !== null)
                .curve(curve);

            const area = d3Shape
                .area<{ timestamp: Date; value: number | null }>()
                .x((d) => x(d.timestamp))
                .y0(currentHeight)
                .y1((d) => y(d.value ?? 0))
                .defined((d) => d.value !== null)
                .curve(curve);

            return {
                id: `series-${idx}`,
                linePath: line(s.data) || "",
                areaPath: area(s.data) || "",
                color: s.color || "var(--color-m3-primary)",
                isFilled: seriesChartType === "area" && s.isFilled !== false,
                strokeWidth: s.strokeWidth ?? strokeWidth,
                chartType: seriesChartType,
                gradientId: `${gradientId}-${idx}`,
                strokeDasharray: s.strokeDasharray,
                opacity: s.opacity ?? 1,
            };
        })),
    );

    const barRects = $derived.by(() =>
        perfMeasure("chart.bars", () => {
            const currentHeight = trackedHeight || height;
            const barSeries = activeSeries.filter(
                (active) => active.chartType === "bar",
            );
            const seriesCount = Math.max(1, barSeries.length);
            const maxPointCount = Math.max(
                1,
                ...barSeries.map((active) => active.data.length),
            );
            const groupWidth = Math.max(
                4,
                Math.min(36, (width / maxPointCount) * 0.72),
            );
            const barWidth = Math.max(2, groupWidth / seriesCount);

            return barSeries.flatMap((active, seriesIndex) =>
                active.data
                    .filter((point) => point.value !== null)
                    .map((point, pointIndex) => {
                        const center = x(point.timestamp);
                        const top = Math.max(
                            0,
                            Math.min(currentHeight, y(point.value ?? 0)),
                        );
                        return {
                            id: `bar-${seriesIndex}-${pointIndex}`,
                            x:
                                center -
                                groupWidth / 2 +
                                seriesIndex * barWidth,
                            y: top,
                            width: Math.max(1, barWidth - 1),
                            height: Math.max(1, currentHeight - top),
                            color: active.color || "var(--color-m3-primary)",
                        };
                    }),
            );
        }),
    );

    const bandRects = $derived.by(() => {
        const currentHeight = trackedHeight || height;

        return rangeBands.flatMap((band, index): ChartBandRect[] => {
                const min = Math.min(band.min, band.max);
                const max = Math.max(band.min, band.max);
                if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
                const top = Math.max(0, Math.min(currentHeight, y(max)));
                const bottom = Math.max(0, Math.min(currentHeight, y(min)));
                return [{
                    id: `band-${index}`,
                    y: top,
                    height: Math.max(1, bottom - top),
                    color: band.color || "var(--color-m3-primary)",
                    label: band.label,
                }];
            });
    });

    const thresholdLines = $derived.by(() => {
        const currentHeight = trackedHeight || height;

        return thresholds.flatMap((threshold, index): ChartThresholdLine[] => {
                if (!Number.isFinite(threshold.value)) return [];
                return [{
                    id: `threshold-${index}`,
                    y: Math.max(0, Math.min(currentHeight, y(threshold.value))),
                    color: threshold.color || "var(--color-m3-error)",
                    label: threshold.label,
                }];
            });
    });
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

            {#if bandRects.length > 0}
                {#each bandRects as band}
                    <rect
                        data-testid="chart-range-band"
                        x="0"
                        y={band.y}
                        width={width}
                        height={band.height}
                        fill={band.color}
                        opacity="0.1"
                    />
                {/each}
            {/if}

            {#if barRects.length > 0}
                {#each barRects as bar}
                    <rect
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        rx="3"
                        fill={bar.color}
                        opacity="0.82"
                    />
                {/each}
            {/if}

            {#each paths.filter((p) => p.chartType !== "bar") as p}
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
                    stroke-dasharray={p.strokeDasharray}
                    opacity={p.opacity}
                />
            {/each}

            {#if thresholdLines.length > 0}
                {#each thresholdLines as line}
                    <g data-testid="chart-threshold-line">
                        <line
                            x1="0"
                            x2={width}
                            y1={line.y}
                            y2={line.y}
                            stroke={line.color}
                            stroke-width="1.5"
                            stroke-dasharray="5 5"
                            opacity="0.78"
                        />
                        {#if line.label}
                            <text
                                x={Math.max(6, width - 6)}
                                y={Math.max(10, line.y - 4)}
                                text-anchor="end"
                                fill={line.color}
                                font-size="10"
                                font-weight="700"
                            >
                                {line.label}
                            </text>
                        {/if}
                    </g>
                {/each}
            {/if}
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
