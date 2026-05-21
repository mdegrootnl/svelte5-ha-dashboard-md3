<script lang="ts">
    import { haStore } from "$lib/stores/ha.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { HistoryService } from "$lib/domain/historyService";
    import {
        analyzeGraphSeries,
        chooseGraphStatisticsPeriod,
        hasNumericHistoryPoints,
        normalizeHistoryPoints,
        shiftHistoryPoints,
        shouldUseStatistics,
        summarizeGraphPoints,
    } from "$lib/domain/graphAnalytics";
    import { getDomain, getEntityName } from "$lib/utils/entity";
    import type {
        GraphComparisonMode,
        GraphCardEntity,
        GraphChartType,
        GraphDataSourceMode,
        GraphRangeBand,
        GraphScaleMode,
        GraphStatisticsPeriod,
        GraphThreshold,
        HistoryDataPoint,
    } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import {
        getCardSurfaceClasses,
        getCardSurfaceStyle,
    } from "$lib/features/dashboard/utils/cardSurface";
    import IconEdit from "~icons/material-symbols/edit";
    import IconShowChart from "~icons/material-symbols/show-chart";
    import MiniChart from "$lib/components/viz/MiniChart.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import { onMount } from "svelte";
    import IconLightbulb from "~icons/material-symbols/lightbulb";
    import IconThermostat from "~icons/material-symbols/thermostat";
    import IconToggleOn from "~icons/material-symbols/toggle-on";
    import IconSensors from "~icons/material-symbols/sensors";
    import IconPlayCircle from "~icons/material-symbols/play-circle";
    import IconDevices from "~icons/material-symbols/devices";

    interface Props {
        id?: string;
        type?: "graph";
        entityId: string;
        name: string;
        hours_to_show?: number;
        points_per_hour?: number;
        aggregate_func?: "avg" | "min" | "max" | "last";
        chartType?: GraphChartType;
        comparisonMode?: GraphComparisonMode;
        dataSource?: GraphDataSourceMode;
        statisticsPeriod?: GraphStatisticsPeriod;
        scaleMode?: GraphScaleMode;
        showAnalytics?: boolean;
        show?: {
            graph?: boolean;
            icon?: boolean;
            name?: boolean;
            state?: boolean;
            fill?: boolean;
        };
        line_color?: string | string[];
        graphEntities?: GraphCardEntity[];
        color_thresholds?: GraphThreshold[];
        rangeBands?: GraphRangeBand[];
        ondelete?: () => void;
        class?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        icon?: string | any;
        fetchHistory?: boolean;
        layoutRows?: number;
    }

    let {
        id,
        type = "graph",
        entityId = $bindable(""),
        name = $bindable(""),
        hours_to_show = $bindable(24),
        points_per_hour = 0.5,
        aggregate_func = $bindable("avg"),
        chartType = $bindable<GraphChartType>("area"),
        comparisonMode = $bindable<GraphComparisonMode>("none"),
        dataSource = $bindable<GraphDataSourceMode>("auto"),
        statisticsPeriod = $bindable<GraphStatisticsPeriod | undefined>(),
        scaleMode = $bindable<GraphScaleMode>("absolute"),
        showAnalytics = $bindable(true),
        show = { graph: true, icon: true, name: true, state: true, fill: true },
        line_color,
        graphEntities = $bindable([]),
        color_thresholds = $bindable<GraphThreshold[]>([]),
        rangeBands = $bindable<GraphRangeBand[]>([]),
        ondelete,
        class: className = "",
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        icon: iconProp = $bindable(),
        fetchHistory = true,
        layoutRows,
    }: Props = $props();

    let entity = $derived(entityId ? haStore.getEntity(entityId) : null);
    let title = $derived(
        name ||
            (entity
                ? getEntityName(entityId, entity.attributes)
                : "Graph Card"),
    );
    let displayState = $derived(entity ? entity.state : "---");
    let unitOfMeasurement = $derived(
        entity?.attributes?.unit_of_measurement || "",
    );

    // -- Icon Logic --
    let Icon = $derived.by(() => {
        if (!entityId) return IconDevices;
        const domain = getDomain(entityId);
        switch (domain) {
            case "light":
                return IconLightbulb;
            case "climate":
                return IconThermostat;
            case "switch":
                return IconToggleOn;
            case "sensor":
            case "binary_sensor":
                return IconSensors;
            case "media_player":
                return IconPlayCircle;
            default:
                return IconDevices;
        }
    });

    let timeRange = $derived.by(() => {
        const end = new Date();
        const hours = hours_to_show || 24;
        const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
        return { start, end };
    });
    let primaryGraphColor = $derived.by(() => {
        if (color) return color;
        if (typeof line_color === "string" && line_color) return line_color;
        if (Array.isArray(line_color) && line_color[0]) return line_color[0];
        return "var(--color-m3-graph-1)";
    });

    type GraphSeriesConfig = {
        entity_id: string;
        name?: string;
        color?: string;
        chartType?: GraphChartType;
    };

    type RenderedGraphSeries = {
        entityId: string;
        name?: string;
        points: HistoryDataPoint[];
        color?: string;
        chartType?: GraphChartType;
        comparison?: boolean;
    };

    let historyData = $state<RenderedGraphSeries[]>([]);
    let isLoading = $state(false);
    let error = $state<string | null>(null);

    function buildDemoHistory(
        entities: Array<{
            entity_id: string;
            name?: string;
            color?: string;
            chartType?: GraphChartType;
        }>,
    ) {
        const end = timeRange.end;
        const start = timeRange.start;
        const span = Math.max(1, end.getTime() - start.getTime());
        const pointCount = 24;

        return entities.map((entityConfig, seriesIndex) => {
            const points: HistoryDataPoint[] = Array.from(
                { length: pointCount },
                (_, pointIndex) => {
                    const progress = pointIndex / Math.max(1, pointCount - 1);
                    const timestamp = new Date(
                        start.getTime() + span * progress,
                    );
                    const base = 18 + seriesIndex * 12;
                    const wave = Math.sin(pointIndex * 0.65 + seriesIndex) * 2;
                    const trend = progress * (3 + seriesIndex);
                    const value = Number(
                        (chartType === "bar"
                            ? Math.max(
                                  0,
                                  2 +
                                      Math.abs(wave) * (1.4 + seriesIndex) +
                                      progress * 4,
                              )
                            : chartType === "step"
                              ? base +
                                Math.floor(progress * 5) * (1 + seriesIndex)
                              : base + wave + trend
                        ).toFixed(1),
                    );

                    return {
                        timestamp,
                        state: String(value),
                        value,
                    };
                },
            );

            return {
                entityId: entityConfig.entity_id || `demo-${seriesIndex}`,
                name: entityConfig.name,
                points,
                color:
                    entityConfig.color ||
                    `var(--color-m3-graph-${(seriesIndex % 6) + 1})`,
                chartType: entityConfig.chartType,
            };
        });
    }

    function buildCurrentStateHistory(
        entityId: string,
        start = timeRange.start,
        end = timeRange.end,
    ): HistoryDataPoint[] {
        const currentEntity = haStore.getEntity(entityId);
        const value = Number.parseFloat(currentEntity?.state ?? "");
        if (!Number.isFinite(value)) return [];

        return [
            {
                timestamp: start,
                state: currentEntity?.state ?? String(value),
                value,
            },
            {
                timestamp: end,
                state: currentEntity?.state ?? String(value),
                value,
            },
        ];
    }

    function targetPointCount() {
        return Math.max(10, Math.floor(hours_to_show * points_per_hour));
    }

    function formatNumericValue(value: number | undefined, maximumFractionDigits = 1) {
        if (value === undefined || !Number.isFinite(value)) return "--";
        const formatted = new Intl.NumberFormat(undefined, {
            maximumFractionDigits,
            minimumFractionDigits: 0,
        }).format(value);
        return `${formatted}${unitOfMeasurement ? ` ${unitOfMeasurement}` : ""}`;
    }

    function analyticsTitle() {
        if (!analyticsSummary) return "";
        switch (analyticsSummary.kind) {
            case "threshold":
                return themeStore.t("graph.analytics.threshold", {
                    value: formatNumericValue(analyticsSummary.reference),
                });
            case "spike":
                return themeStore.t("graph.analytics.spike");
            case "dip":
                return themeStore.t("graph.analytics.dip");
            case "trend_up":
                return themeStore.t("graph.analytics.trendUp", {
                    percent: Math.abs(analyticsSummary.deltaPercent ?? 0).toFixed(0),
                });
            case "trend_down":
                return themeStore.t("graph.analytics.trendDown", {
                    percent: Math.abs(analyticsSummary.deltaPercent ?? 0).toFixed(0),
                });
            default:
                return themeStore.t("graph.analytics.range");
        }
    }

    function analyticsDetail() {
        if (!analyticsSummary) return "";
        if (analyticsSummary.kind === "range") {
            return themeStore.t("graph.analytics.rangeDetail", {
                min: formatNumericValue(analyticsSummary.min),
                max: formatNumericValue(analyticsSummary.max),
            });
        }

        return themeStore.t("graph.analytics.latestDetail", {
            latest: formatNumericValue(analyticsSummary.latest),
            average: formatNumericValue(analyticsSummary.average),
        });
    }

    function formatPercentDelta(value: number | undefined) {
        if (value === undefined || !Number.isFinite(value)) return "--";
        const sign = value > 0 ? "+" : "";
        return `${sign}${value.toFixed(0)}%`;
    }

    async function fetchGraphWindow(
        entityIds: string[],
        start: Date,
        end: Date,
    ) {
        const useStatistics = shouldUseStatistics(dataSource, hours_to_show);
        if (useStatistics && typeof haStore.getStatistics === "function") {
            const statsResult = await haStore.getStatistics(
                entityIds,
                start,
                end,
                statisticsPeriod ?? chooseGraphStatisticsPeriod(hours_to_show),
            );
            if (
                statsResult.ok &&
                statsResult.value.some((item) =>
                    hasNumericHistoryPoints(item.points),
                )
            ) {
                return statsResult;
            }
        }

        return haStore.getHistory(entityIds, start, end);
    }

    async function loadSeriesWindow(
        configs: GraphSeriesConfig[],
        start: Date,
        end: Date,
    ) {
        const entityIds = configs.map((config) => config.entity_id);
        const result = await fetchGraphWindow(entityIds, start, end);
        if (!result.ok) return result;

        const historyByEntityId = new Map(
            result.value.map((res) => [res.entityId, res]),
        );

        return {
            ok: true as const,
            value: configs.map((config, idx) => {
                const res = historyByEntityId.get(config.entity_id);
                const points = HistoryService.aggregateHistory(
                    res?.points || [],
                    aggregate_func,
                    targetPointCount(),
                );

                return {
                    entityId: config.entity_id,
                    name: config.name,
                    points: hasNumericHistoryPoints(points)
                        ? points
                        : buildCurrentStateHistory(config.entity_id, start, end),
                    color:
                        config.color ||
                        `var(--color-m3-graph-${(idx % 6) + 1})`,
                    chartType: config.chartType,
                };
            }),
        };
    }

    // Fetch history data for all entities
    $effect(() => {
        const entitiesToFetch: GraphSeriesConfig[] = [
            ...(entityId
                ? [
                      {
                          entity_id: entityId,
                          name,
                          color: primaryGraphColor,
                      },
                  ]
                : []),
            ...graphEntities.map((ge) => ({
                entity_id: ge.entity_id,
                name: ge.name,
                color: ge.color,
                chartType: ge.chartType,
            })),
        ];

        if (entitiesToFetch.length === 0) {
            historyData = [];
            return;
        }

        if (!fetchHistory) {
            historyData = buildDemoHistory(entitiesToFetch);
            isLoading = false;
            error = null;
            return;
        }

        if (!haStore.connected || !haStore.auth)
            return;

        let cancelled = false;

        async function loadHistory() {
            isLoading = true;
            error = null;

            const end = timeRange.end;
            const start = timeRange.start;
            const spanMs = end.getTime() - start.getTime();

            const result = await loadSeriesWindow(entitiesToFetch, start, end);
            if (cancelled) return;

            if (result.ok) {
                let nextHistory: RenderedGraphSeries[] = result.value;

                if (comparisonMode === "previous_period" && spanMs > 0) {
                    const previousStart = new Date(start.getTime() - spanMs);
                    const previousEnd = new Date(end.getTime() - spanMs);
                    const previousResult = await loadSeriesWindow(
                        entitiesToFetch,
                        previousStart,
                        previousEnd,
                    );
                    if (cancelled) return;

                    if (previousResult.ok) {
                        nextHistory = [
                            ...nextHistory,
                            ...previousResult.value.map((series) => ({
                                ...series,
                                points: shiftHistoryPoints(series.points, spanMs),
                                chartType: "line" as GraphChartType,
                                comparison: true,
                            })),
                        ];
                    }
                }

                historyData = nextHistory;
            } else {
                error = result.error.message;
            }
            isLoading = false;
        }

        loadHistory();

        return () => {
            cancelled = true;
        };
    });

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            entityId,
            name,
            type: "graph",
            hours_to_show,
            aggregate_func,
            graphEntities,
            chartType,
            comparisonMode,
            dataSource,
            statisticsPeriod,
            scaleMode,
            showAnalytics,
            color_thresholds,
            rangeBands,
            color,
            backgroundColor,
            icon: typeof iconProp === "string" ? iconProp : "",
            onSave: (newConfig) => {
                if (newConfig.type === "graph") {
                    entityId = newConfig.entityId;
                    name = newConfig.name;
                    hours_to_show = newConfig.hours_to_show ?? 24;
                    aggregate_func = newConfig.aggregate_func ?? "avg";
                    chartType = newConfig.chartType ?? "area";
                    graphEntities = newConfig.graphEntities || [];
                    comparisonMode = newConfig.comparisonMode ?? "none";
                    dataSource = newConfig.dataSource ?? "auto";
                    statisticsPeriod = newConfig.statisticsPeriod;
                    scaleMode = newConfig.scaleMode ?? "absolute";
                    showAnalytics = newConfig.showAnalytics ?? true;
                    color_thresholds = newConfig.color_thresholds ?? [];
                    rangeBands = newConfig.rangeBands ?? [];
                    color = newConfig.color;
                    backgroundColor = newConfig.backgroundColor;
                    iconProp = newConfig.icon || "";
                }
            },
            onDelete: ondelete,
        });
    }

    const baseStyles =
        "relative flex flex-col w-full h-full rounded-m3-card text-m3-on-surface overflow-hidden transition-all duration-200 group/card";
    // -- Responsive Layout --
    let clientHeight = $state(0);
    const LAYOUT = {
        COMPACT_HEIGHT: 130,
        EXPANDED_HEIGHT: 150, // Standard 2-row cards should be expanded
    };
    // Default to expanded for initial render/unknown size
    let isExpanded = $derived(
        typeof layoutRows === "number"
            ? layoutRows >= 2
            : clientHeight === 0 || clientHeight >= LAYOUT.EXPANDED_HEIGHT,
    );

    function getSeriesChartType(seriesEntityId: string): GraphChartType {
        if (seriesEntityId === entityId) return chartType;
        return (
            graphEntities.find(
                (graphEntity) => graphEntity.entity_id === seriesEntityId,
            )?.chartType ?? chartType
        );
    }

    function getSeriesLabel(series: RenderedGraphSeries) {
        if (series.entityId === entityId) return title;
        const config = graphEntities.find(
            (graphEntity) => graphEntity.entity_id === series.entityId,
        );
        if (config?.name) return config.name;
        const seriesEntity = haStore.getEntity(series.entityId);
        return getEntityName(series.entityId, seriesEntity?.attributes ?? {});
    }

    function getChartData(points: HistoryDataPoint[]) {
        return scaleMode === "normalized" ? normalizeHistoryPoints(points) : points;
    }

    function toMiniChartSeries(series: RenderedGraphSeries) {
        const seriesChartType =
            series.chartType ?? getSeriesChartType(series.entityId);
        return {
            data: getChartData(series.points),
            color: series.color,
            chartType: seriesChartType,
            isFilled:
                !series.comparison &&
                seriesChartType === "area" &&
                show.fill !== false,
            strokeDasharray: series.comparison ? "6 5" : undefined,
            opacity: series.comparison ? 0.55 : 1,
        };
    }

    let chartThresholds = $derived(
        scaleMode === "normalized" ? [] : color_thresholds,
    );
    let chartRangeBands = $derived(scaleMode === "normalized" ? [] : rangeBands);
    let seriesLegend = $derived(
        historyData
            .filter((series) => !series.comparison)
            .map((series) => ({
                entityId: series.entityId,
                name: getSeriesLabel(series),
                color: series.color ?? primaryGraphColor,
            })),
    );

    let primarySeries = $derived(
        historyData.find((series) => series.entityId === entityId && !series.comparison),
    );
    let previousPrimarySeries = $derived(
        historyData.find((series) => series.entityId === entityId && series.comparison),
    );
    let analyticsSummary = $derived(
        showAnalytics === false
            ? null
            : analyzeGraphSeries(
                  primarySeries?.points ?? [],
                  previousPrimarySeries?.points ?? [],
                  color_thresholds ?? [],
              ),
    );
    let currentStats = $derived(summarizeGraphPoints(primarySeries?.points ?? []));
    let previousStats = $derived(summarizeGraphPoints(previousPrimarySeries?.points ?? []));
    let comparisonDeltaPercent = $derived(
        currentStats && previousStats && Math.abs(previousStats.average) > 0.0001
            ? ((currentStats.average - previousStats.average) /
                  Math.abs(previousStats.average)) *
              100
            : undefined,
    );
    let showMetricStrip = $derived(
        typeof layoutRows === "number" ? layoutRows >= 3 : clientHeight >= 220,
    );
</script>

<div
    class="{baseStyles} {getCardSurfaceClasses(surfaceStyle)} {className} @container"
    bind:clientHeight
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
>
    <!-- Background Graph (Visible when NOT expanded) -->
    {#if !isExpanded && show.graph !== false}
        <div
            class="absolute inset-0 z-0 opacity-10 pointer-events-none w-full h-full"
        >
            <MiniChart
                series={historyData.map(toMiniChartSeries)}
                startTime={timeRange.start}
                endTime={timeRange.end}
                {chartType}
                thresholds={chartThresholds}
                rangeBands={chartRangeBands}
            />
        </div>
    {/if}

    <div class="p-[clamp(0.625rem,4cqmin,1.5rem)] flex flex-col gap-[clamp(0.25rem,2cqmin,0.75rem)] relative z-10">
        <!-- Header -->
        <div class="flex items-start justify-between z-10">
            <div class="flex items-center gap-[clamp(0.375rem,3cqmin,1rem)] min-w-0">
                {#if show.icon !== false}
                    <div
                        class="flex items-center justify-center size-[clamp(2.5rem,22cqmin,4.75rem)] rounded-full shrink-0"
                        style:background-color={`color-mix(in srgb, ${primaryGraphColor} 10%, transparent)`}
                        style:color={primaryGraphColor}
                    >
                        {#if iconProp}
                            <DynamicIcon name={iconProp} class="size-[58%]" />
                        {:else}
                            <Icon class="size-[58%]" />
                        {/if}
                    </div>
                {/if}
                <div class="flex flex-col min-w-0">
                    {#if show.name !== false}
                        <span class="text-[clamp(0.75rem,3.4cqmin,1rem)] font-medium truncate opacity-70"
                            >{title}</span
                        >
                    {/if}
                    {#if show.state !== false}
                        <span class="text-[clamp(1.25rem,7cqmin,2.25rem)] font-bold leading-tight truncate">
                            {displayState}
                            <span class="text-[clamp(0.75rem,3.4cqmin,1rem)] font-normal opacity-70"
                                >{unitOfMeasurement}</span
                            >
                        </span>
                    {/if}
                </div>
            </div>
        </div>
    </div>

    {#if isExpanded && analyticsSummary}
        <div
            class="mx-[clamp(0.625rem,4cqmin,1.5rem)] mb-[clamp(0.375rem,2cqmin,0.75rem)] flex min-w-0 items-center gap-2 rounded-m3-full border px-3 py-1.5 text-[clamp(0.625rem,2.5cqmin,0.8125rem)] relative z-10"
            class:border-m3-error={analyticsSummary.tone === "warning"}
            class:border-m3-outline-variant={analyticsSummary.tone !== "warning"}
            class:bg-m3-error-container={analyticsSummary.tone === "warning"}
            class:bg-m3-surface-container-high={analyticsSummary.tone !== "warning"}
            class:text-m3-on-error-container={analyticsSummary.tone === "warning"}
            class:text-m3-on-surface={analyticsSummary.tone !== "warning"}
            data-testid="graph-analytics-callout"
        >
            <span class="shrink-0 font-semibold">{analyticsTitle()}</span>
            <span class="min-w-0 truncate opacity-75">{analyticsDetail()}</span>
        </div>
    {/if}

    {#if isExpanded && seriesLegend.length > 1}
        <div
            class="mx-[clamp(0.625rem,4cqmin,1.5rem)] mb-[clamp(0.25rem,1.5cqmin,0.5rem)] flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[clamp(0.625rem,2.35cqmin,0.75rem)] text-m3-on-surface-variant relative z-10"
            data-testid="graph-series-legend"
            aria-label={scaleMode === "normalized" ? "Normalized series legend" : "Series legend"}
        >
            {#each seriesLegend as series}
                <span class="inline-flex min-w-0 items-center gap-1.5">
                    <span
                        class="size-2 rounded-full shrink-0"
                        style:background-color={series.color}
                    ></span>
                    <span class="truncate max-w-32">{series.name}</span>
                </span>
            {/each}
        </div>
    {/if}

    {#if isExpanded && showMetricStrip && currentStats}
        <div
            class="mx-[clamp(0.625rem,4cqmin,1.5rem)] mb-[clamp(0.375rem,2cqmin,0.75rem)] grid grid-cols-2 gap-2 @[22rem]:grid-cols-4 relative z-10"
            data-testid="graph-metric-strip"
        >
            <div class="min-w-0 rounded-m3-sm bg-m3-surface-container px-3 py-2">
                <span class="block truncate text-[clamp(0.5625rem,2.1cqmin,0.6875rem)] uppercase text-m3-on-surface-variant">{themeStore.t("graph.analytics.now")}</span>
                <span class="block truncate text-[clamp(0.75rem,2.7cqmin,0.9375rem)] font-semibold">{formatNumericValue(currentStats.latest)}</span>
            </div>
            <div class="min-w-0 rounded-m3-sm bg-m3-surface-container px-3 py-2">
                <span class="block truncate text-[clamp(0.5625rem,2.1cqmin,0.6875rem)] uppercase text-m3-on-surface-variant">{themeStore.t("graph.analytics.average")}</span>
                <span class="block truncate text-[clamp(0.75rem,2.7cqmin,0.9375rem)] font-semibold">{formatNumericValue(currentStats.average)}</span>
            </div>
            <div class="min-w-0 rounded-m3-sm bg-m3-surface-container px-3 py-2">
                <span class="block truncate text-[clamp(0.5625rem,2.1cqmin,0.6875rem)] uppercase text-m3-on-surface-variant">{themeStore.t("graph.analytics.minMax")}</span>
                <span class="block truncate text-[clamp(0.75rem,2.7cqmin,0.9375rem)] font-semibold">{formatNumericValue(currentStats.min)} - {formatNumericValue(currentStats.max)}</span>
            </div>
            <div class="min-w-0 rounded-m3-sm bg-m3-surface-container px-3 py-2">
                <span class="block truncate text-[clamp(0.5625rem,2.1cqmin,0.6875rem)] uppercase text-m3-on-surface-variant">{themeStore.t("graph.analytics.previous")}</span>
                <span
                    class="block truncate text-[clamp(0.75rem,2.7cqmin,0.9375rem)] font-semibold"
                    class:text-m3-error={comparisonDeltaPercent !== undefined && comparisonDeltaPercent > 10}
                    class:text-m3-primary={comparisonDeltaPercent !== undefined && comparisonDeltaPercent < -10}
                    data-testid="graph-comparison-delta"
                >
                    {formatPercentDelta(comparisonDeltaPercent)}
                </span>
            </div>
        </div>
    {/if}

    <!-- Foreground Chart (Visible when expanded) -->
    {#if isExpanded && show.graph !== false}
        <div class="flex-1 min-h-0 relative z-10">
            {#if isLoading && historyData.length === 0}
                <div
                    class="absolute inset-0 flex items-center justify-center opacity-50"
                >
                    <span class="text-[clamp(0.6875rem,3cqmin,0.875rem)]">{themeStore.t("graph.loadingHistory")}</span>
                </div>
            {/if}

            {#if error}
                <div
                    class="absolute inset-0 flex items-center justify-center text-m3-error text-[clamp(0.6875rem,3cqmin,0.875rem)] p-[clamp(0.375rem,2cqmin,0.75rem)] text-center"
                >
                    {error}
                </div>
            {/if}

            <MiniChart
                series={historyData.map(toMiniChartSeries)}
                startTime={timeRange.start}
                endTime={timeRange.end}
                {chartType}
                thresholds={chartThresholds}
                rangeBands={chartRangeBands}
            />
        </div>
    {/if}

    <!-- Edit FAB -->
    <button
        class="touch-edit-control absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</div>
