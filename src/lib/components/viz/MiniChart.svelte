<script lang="ts">
    import * as d3Shape from "d3-shape";
    import * as d3Scale from "d3-scale";

    interface Props {
        data: Array<{ timestamp: Date; value: number | null }>;
        height?: number;
        color?: string;
        isFilled?: boolean;
        strokeWidth?: number;
    }

    let {
        data = [],
        height = 50,
        color = "var(--md-sys-color-primary)",
        isFilled = true,
        strokeWidth = 2,
    }: Props = $props();

    let container = $state<HTMLElement>();
    let width = $state(0);

    // Gradient ID to ensure uniqueness if multiple charts exist
    const gradientId = `grad-${Math.random().toString(36).slice(2, 9)}`;

    $effect(() => {
        if (!container) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                width = entry.contentRect.width;
            }
        });
        observer.observe(container);
        return () => observer.disconnect();
    });

    const x = $derived(
        d3Scale
            .scaleTime()
            .domain([
                new Date(Math.min(...data.map((d) => d.timestamp.getTime()))),
                new Date(Math.max(...data.map((d) => d.timestamp.getTime()))),
            ])
            .range([0, width]),
    );

    const y = $derived.by(() => {
        const values = data
            .map((d) => d.value)
            .filter((v): v is number => v !== null);
        const minVal = values.length > 0 ? Math.min(...values) : 0;
        const maxVal = values.length > 0 ? Math.max(...values) : 100;

        // Add small padding to y domain so line doesn't hit edges
        const padding = (maxVal - minVal) * 0.1 || 1;

        return d3Scale
            .scaleLinear()
            .domain([minVal - padding, maxVal + padding])
            .range([height, 0]);
    });

    const lineGenerator = $derived(
        d3Shape
            .line<{ timestamp: Date; value: number | null }>()
            .x((d) => x(d.timestamp))
            .y((d) => y(d.value ?? 0))
            .defined((d) => d.value !== null)
            .curve(d3Shape.curveMonotoneX),
    );

    const areaGenerator = $derived(
        d3Shape
            .area<{ timestamp: Date; value: number | null }>()
            .x((d) => x(d.timestamp))
            .y0(height)
            .y1((d) => y(d.value ?? 0))
            .defined((d) => d.value !== null)
            .curve(d3Shape.curveMonotoneX),
    );

    const linePath = $derived(lineGenerator(data) || "");
    const areaPath = $derived(areaGenerator(data) || "");
</script>

<div bind:this={container} class="chart-container" style:height="{height}px">
    {#if width > 0 && data.length > 0}
        <svg
            {width}
            {height}
            viewBox="0 0 {width} {height}"
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color={color} stop-opacity="0.4" />
                    <stop offset="100%" stop-color={color} stop-opacity="0" />
                </linearGradient>
            </defs>

            {#if isFilled}
                <path d={areaPath} fill="url(#{gradientId})" />
            {/if}

            <path
                d={linePath}
                fill="none"
                stroke={color}
                stroke-width={strokeWidth}
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    {/if}
</div>

<style>
    .chart-container {
        width: 100%;
        overflow: hidden;
        display: flex;
        align-items: flex-end;
    }

    svg {
        display: block;
    }
</style>
