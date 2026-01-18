<script lang="ts">
    import { area, line, curveMonotoneX, type Area, type Line } from "d3-shape";
    import {
        scaleLinear,
        scaleTime,
        type ScaleLinear,
        type ScaleTime,
    } from "d3-scale";
    import type { HistoryDataPoint } from "$lib/types";

    interface Props {
        insideData: HistoryDataPoint[];
        outsideData: HistoryDataPoint[];
        width?: number;
        height?: number;
    }

    let {
        insideData = [],
        outsideData = [],
        width = 400,
        height = 120,
    }: Props = $props();

    // Combine data for scale calculation
    let allData = $derived(
        [...insideData, ...outsideData].filter((d) => d.value !== null),
    );

    // Time domain: last 24 hours
    let timeExtent = $derived.by((): [Date, Date] => {
        if (allData.length === 0) {
            const now = new Date();
            return [new Date(now.getTime() - 24 * 60 * 60 * 1000), now];
        }
        const times = allData.map((d) => d.timestamp.getTime());
        return [new Date(Math.min(...times)), new Date(Math.max(...times))];
    });

    // Extend data to full time range (add synthetic edge points)
    function extendToEdges(
        data: HistoryDataPoint[],
        extent: [Date, Date],
    ): HistoryDataPoint[] {
        const filtered = data.filter((d) => d.value !== null);
        if (filtered.length === 0) return [];

        const [startTime, endTime] = extent;
        const result = [...filtered];

        // Add start point if data starts after extent start
        if (result[0].timestamp.getTime() > startTime.getTime()) {
            result.unshift({
                timestamp: startTime,
                state: result[0].state,
                value: result[0].value!,
            });
        }

        // Add end point if data ends before extent end
        const lastIdx = result.length - 1;
        if (result[lastIdx].timestamp.getTime() < endTime.getTime()) {
            result.push({
                timestamp: endTime,
                state: result[lastIdx].state,
                value: result[lastIdx].value!,
            });
        }

        return result;
    }

    // Value domain with padding
    let valueExtent = $derived.by((): [number, number] => {
        const values = allData.map((d) => d.value!).filter((v) => !isNaN(v));
        if (values.length === 0) return [0, 30];

        const min = Math.min(...values);
        const max = Math.max(...values);
        const diff = max - min;
        const minRange = 10;

        if (diff < minRange) {
            const center = (max + min) / 2;
            return [center - minRange / 2, center + minRange / 2];
        }

        const padding = diff * 0.1;
        return [min - padding, max + padding];
    });

    // Scales
    let xScale = $derived(
        scaleTime<number>().domain(timeExtent).range([0, width]),
    );

    let yScale = $derived(
        scaleLinear<number>().domain(valueExtent).range([height, 0]),
    );

    // Line generators - no .defined() needed since we pre-filter nulls
    let lineGenerator = $derived(
        line<HistoryDataPoint>()
            .x((d) => xScale(d.timestamp))
            .y((d) => yScale(d.value!))
            .curve(curveMonotoneX),
    );

    // Area generators
    let areaGenerator = $derived(
        area<HistoryDataPoint>()
            .x((d) => xScale(d.timestamp))
            .y0(height)
            .y1((d) => yScale(d.value!))
            .curve(curveMonotoneX),
    );

    // Extend data to edges and filter nulls for smooth continuous lines
    let extendedInsideData = $derived(extendToEdges(insideData, timeExtent));
    let extendedOutsideData = $derived(extendToEdges(outsideData, timeExtent));

    // Generated paths - use extended data for full-width lines
    let insideLine = $derived(
        extendedInsideData.length > 0 ? lineGenerator(extendedInsideData) : "",
    );
    let insideArea = $derived(
        extendedInsideData.length > 0 ? areaGenerator(extendedInsideData) : "",
    );
    let outsideLine = $derived(
        extendedOutsideData.length > 0
            ? lineGenerator(extendedOutsideData)
            : "",
    );
    let outsideArea = $derived(
        extendedOutsideData.length > 0
            ? areaGenerator(extendedOutsideData)
            : "",
    );
</script>

<svg
    viewBox="0 0 {width} {height}"
    class="w-full h-full"
    preserveAspectRatio="none"
>
    <defs>
        <!-- Inside (Secondary/Heat) gradient -->
        <linearGradient id="insideGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
                offset="0%"
                stop-color="var(--color-m3-secondary)"
                stop-opacity="0.4"
            />
            <stop
                offset="100%"
                stop-color="var(--color-m3-secondary)"
                stop-opacity="0"
            />
        </linearGradient>

        <!-- Outside (Primary/Cold) gradient -->
        <linearGradient id="outsideGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
                offset="0%"
                stop-color="var(--color-m3-primary)"
                stop-opacity="0.3"
            />
            <stop
                offset="100%"
                stop-color="var(--color-m3-primary)"
                stop-opacity="0"
            />
        </linearGradient>
    </defs>

    {#if insideData.length === 0 && outsideData.length === 0}
        <!-- Placeholder when no data -->
        <text
            x={width / 2}
            y={height / 2}
            text-anchor="middle"
            class="text-m3-label-small fill-m3-on-surface-variant/50"
        >
            No history data
        </text>
    {:else}
        <!-- Outside series (rendered first, behind) -->
        {#if outsideArea}
            <path d={outsideArea} fill="url(#outsideGradient)" />
        {/if}
        {#if outsideLine}
            <path
                d={outsideLine}
                fill="none"
                stroke="var(--color-m3-primary)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        {/if}

        <!-- Inside series (rendered on top) -->
        {#if insideArea}
            <path d={insideArea} fill="url(#insideGradient)" />
        {/if}
        {#if insideLine}
            <path
                d={insideLine}
                fill="none"
                stroke="var(--color-m3-secondary)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        {/if}
    {/if}
</svg>
