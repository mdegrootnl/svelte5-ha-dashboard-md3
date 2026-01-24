<script lang="ts">
    import * as d3Shape from "d3-shape";
    import * as d3Scale from "d3-scale";

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

    $effect(() => {
        if (!container) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                width = entry.contentRect.width;
                trackedHeight = entry.contentRect.height;
            }
        });
        observer.observe(container);
        return () => observer.disconnect();
    });

    const x = $derived.by(() => {
        if (startTime && endTime) {
            return d3Scale
                .scaleTime()
                .domain([startTime, endTime])
                .range([0, width]);
        }

        const allPoints = activeSeries.flatMap((s) => s.data);
        if (allPoints.length === 0)
            return d3Scale.scaleTime().range([0, width]);

        return d3Scale
            .scaleTime()
            .domain([
                new Date(
                    Math.min(...allPoints.map((d) => d.timestamp.getTime())),
                ),
                new Date(
                    Math.max(...allPoints.map((d) => d.timestamp.getTime())),
                ),
            ])
            .range([0, width]);
    });

    const y = $derived.by(() => {
        const allValues = activeSeries
            .flatMap((s) => s.data)
            .map((d) => d.value)
            .filter((v): v is number => v !== null);

        const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
        const maxVal = allValues.length > 0 ? Math.max(...allValues) : 100;

        // Use trackedHeight if available, fallback to height prop
        const currentHeight = trackedHeight || height;

        // Add small padding to y domain so line doesn't hit edges
        const padding = (maxVal - minVal) * 0.1 || 1;

        return d3Scale
            .scaleLinear()
            .domain([minVal - padding, maxVal + padding])
            .range([currentHeight, 0]);
    });

    const paths = $derived(
        activeSeries.map((s, idx) => {
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
        }),
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
