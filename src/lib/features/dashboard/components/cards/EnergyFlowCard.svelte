<script lang="ts">
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { inventoryStore } from "$lib/stores/inventory.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { HistoryService } from "$lib/domain/historyService";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import MiniChart from "$lib/components/viz/MiniChart.svelte";
    import type {
        EnergyCardOptions,
        GraphChartType,
        HistoryDataPoint,
    } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import {
        getCardSurfaceClasses,
        getCardSurfaceStyle,
    } from "$lib/features/dashboard/utils/cardSurface";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: EnergyCardOptions;
        layoutRows?: number;
        ondelete?: () => void;
        class?: string;
    }

    type EnergyReading = {
        entityId?: string;
        display: string;
        numeric: number | null;
        unit: string;
        missing: boolean;
    };

    type EnergyNode = {
        key: string;
        label: string;
        iconName: string;
        reading: EnergyReading;
        accent: string;
        detail: string;
    };

    type EnergyGauge = {
        key: string;
        label: string;
        value: number | null;
        display: string;
        detail: string;
        iconName: string;
        accent: string;
    };

    type EnergySourceSeries = {
        entityId: string;
        label: string;
        color: string;
        chartType: GraphChartType;
    };

    type DeviceEnergyRow = {
        entityId: string;
        name: string;
        reading: EnergyReading;
        accent: string;
        width: string;
    };

    type StatisticsPeriod = "5minute" | "hour" | "day" | "month";

    type SourceHistoryConfig = {
        start: Date;
        end: Date;
        period: StatisticsPeriod;
        targetCount: number;
        subtitle: string;
    };

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("electric_bolt"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ source: "auto" }),
        layoutRows,
        ondelete,
        class: className = "",
    }: Props = $props();

    const missingStates = new Set(["unknown", "unavailable", ""]);
    const compactUnits = new Set(["%", "°", "°C", "C"]);
    const powerDeviceClasses = new Set(["power", "energy"]);

    let smartOptions = $derived(inventoryStore.smartEnergyOptions(options));
    let title = $derived(name || "Energy Flow");
    let mode = $derived(smartOptions.mode ?? "overview");
    let isCompact = $derived(layoutRows !== undefined && layoutRows < 3);
    let sourceHistory = $state<
        Array<{
            entityId: string;
            points: HistoryDataPoint[];
            color: string;
            chartType: GraphChartType;
        }>
    >([]);
    let sourceHistoryLoading = $state(false);
    let sourceHistoryError = $state<string | null>(null);

    function parseNumeric(state: string) {
        const value = Number(state.replace(",", "."));
        return Number.isFinite(value) ? value : null;
    }

    function formatNumber(value: number, maximumFractionDigits = 1) {
        return new Intl.NumberFormat(undefined, {
            maximumFractionDigits,
            minimumFractionDigits: 0,
        }).format(value);
    }

    function formatWithUnit(value: number, unit: string) {
        if (unit === "W" && Math.abs(value) >= 1000) {
            return `${formatNumber(value / 1000)} kW`;
        }
        if (unit === "Wh" && Math.abs(value) >= 1000) {
            return `${formatNumber(value / 1000)} kWh`;
        }
        if (unit === "kWh") {
            return `${formatNumber(value)} kWh`;
        }

        const separator =
            compactUnits.has(unit) || unit.length === 0 ? "" : " ";
        return `${formatNumber(value)}${separator}${unit}`;
    }

    function formatSourceAxisValue(value: number) {
        return formatWithUnit(value, "W");
    }

    function formatSourceTimeTick(value: Date) {
        const range = smartOptions.historyRange ?? "last24h";

        if (range === "12m") {
            return new Intl.DateTimeFormat(undefined, {
                month: "short",
            }).format(value);
        }

        if (range === "7d" || range === "30d") {
            return new Intl.DateTimeFormat(undefined, {
                day: "numeric",
                month: "short",
            }).format(value);
        }

        return new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
        }).format(value);
    }

    function clampPercent(value: number) {
        return Math.max(0, Math.min(100, value));
    }

    function formatPercent(value: number | null) {
        if (value === null) return "--";
        return `${formatNumber(clampPercent(value), 0)}%`;
    }

    function hasNumericPoints(points: HistoryDataPoint[]) {
        return points.some((point) => point.value !== null);
    }

    function latestNumericPoint(points: HistoryDataPoint[]) {
        for (let index = points.length - 1; index >= 0; index -= 1) {
            const value = points[index]?.value;
            if (value !== null && value !== undefined) return value;
        }
        return null;
    }

    function buildDemoSourceHistory(
        configs: EnergySourceSeries[],
        start: Date,
        end: Date,
        pointCount = 24,
    ) {
        const span = Math.max(1, end.getTime() - start.getTime());

        return configs.map((config, seriesIndex) => ({
            entityId: config.entityId,
            color: config.color,
            chartType: config.chartType,
            points: Array.from({ length: pointCount }, (_, pointIndex) => {
                const progress = pointIndex / Math.max(1, pointCount - 1);
                const timestamp = new Date(start.getTime() + span * progress);
                const wave = Math.sin(pointIndex * 0.65 + seriesIndex) * 180;
                const base = 450 + seriesIndex * 260;
                const dailyShape =
                    config.label === "Solar"
                        ? Math.max(0, Math.sin(progress * Math.PI)) * 1400
                        : progress * 240;
                const value = Number(
                    Math.max(0, base + dailyShape + wave).toFixed(0),
                );

                return {
                    timestamp,
                    state: String(value),
                    value,
                };
            }),
        }));
    }

    function startOfLocalDay(date: Date) {
        const next = new Date(date);
        next.setHours(0, 0, 0, 0);
        return next;
    }

    function buildSourceHistoryConfig(current: EnergyCardOptions): SourceHistoryConfig {
        const end = new Date();
        const range = current.historyRange ?? "last24h";

        if (range === "today") {
            return {
                start: startOfLocalDay(end),
                end,
                period: "hour",
                targetCount: 24,
                subtitle: "Today by hour",
            };
        }

        if (range === "7d") {
            const start = startOfLocalDay(end);
            start.setDate(start.getDate() - 6);
            return {
                start,
                end,
                period: "day",
                targetCount: 7,
                subtitle: "Last 7 days by day",
            };
        }

        if (range === "30d") {
            const start = startOfLocalDay(end);
            start.setDate(start.getDate() - 29);
            return {
                start,
                end,
                period: "day",
                targetCount: 30,
                subtitle: "Last 30 days by day",
            };
        }

        if (range === "12m") {
            const start = new Date(end);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            start.setMonth(start.getMonth() - 11);
            return {
                start,
                end,
                period: "month",
                targetCount: 12,
                subtitle: "Last 12 months by month",
            };
        }

        const hours = current.hoursToShow ?? 24;
        return {
            start: new Date(end.getTime() - hours * 60 * 60 * 1000),
            end,
            period: hours <= 6 ? "5minute" : "hour",
            targetCount: Math.max(12, Math.min(72, Math.round(hours))),
            subtitle: `Last ${hours} hours`,
        };
    }

    function readEnergyValue(entityId?: string): EnergyReading {
        if (!entityId) {
            return {
                entityId,
                display: "--",
                numeric: null,
                unit: "",
                missing: true,
            };
        }

        const entity = haStore.getEntity(entityId);
        if (!entity || missingStates.has(entity.state)) {
            return {
                entityId,
                display: "--",
                numeric: null,
                unit: "",
                missing: true,
            };
        }

        const unit =
            typeof entity.attributes.unit_of_measurement === "string"
                ? entity.attributes.unit_of_measurement
                : "";
        const numeric = parseNumeric(entity.state);

        return {
            entityId,
            display:
                numeric === null
                    ? `${entity.state}${unit}`
                    : formatWithUnit(numeric, unit),
            numeric,
            unit,
            missing: false,
        };
    }

    function value(entityId?: string) {
        return readEnergyValue(entityId).display;
    }

    function gridReading(): EnergyReading {
        const imported = readEnergyValue(smartOptions.gridImportEntityId);
        const exported = readEnergyValue(smartOptions.gridExportEntityId);
        const unit = imported.unit || exported.unit;

        if (
            !imported.missing &&
            !exported.missing &&
            imported.numeric !== null &&
            exported.numeric !== null
        ) {
            const balance = imported.numeric - exported.numeric;
            const direction = balance >= 0 ? "in" : "out";
            return {
                entityId: imported.entityId,
                display: `${formatWithUnit(Math.abs(balance), unit)} ${direction}`,
                numeric: Math.abs(balance),
                unit,
                missing: false,
            };
        }

        if (!imported.missing) {
            return { ...imported, display: `${imported.display} in` };
        }
        if (!exported.missing) {
            return { ...exported, display: `${exported.display} out` };
        }
        return {
            entityId: undefined,
            display: "--",
            numeric: null,
            unit: "",
            missing: true,
        };
    }

    function node(
        key: string,
        label: string,
        iconName: string,
        reading: EnergyReading,
        accent: string,
        detail: string,
    ): EnergyNode {
        return {
            key,
            label,
            iconName,
            reading,
            accent,
            detail,
        };
    }

    let homeReading = $derived(
        readEnergyValue(smartOptions.homePowerEntityId || entityId),
    );
    let solarNode = $derived(
        node(
            "solar",
            "Solar",
            "solar_power",
            readEnergyValue(smartOptions.solarPowerEntityId),
            "var(--color-m3-secondary)",
            "Production",
        ),
    );
    let gridNode = $derived(
        node(
            "grid",
            "Grid",
            "power",
            gridReading(),
            "var(--color-m3-primary)",
            "Import / export",
        ),
    );
    let batteryNode = $derived(
        node(
            "battery",
            "Battery",
            "battery_charging_full",
            readEnergyValue(smartOptions.batteryPowerEntityId),
            "var(--color-m3-tertiary)",
            "Storage",
        ),
    );
    let flowNodes = $derived([solarNode, gridNode, batteryNode]);
    let allNodes = $derived([
        solarNode,
        node(
            "home",
            "Home",
            "home",
            homeReading,
            "var(--color-m3-tertiary)",
            "Current load",
        ),
        gridNode,
        batteryNode,
    ]);
    let maxFlowValue = $derived.by(() => {
        const values = [homeReading, ...flowNodes.map((item) => item.reading)]
            .map((reading) =>
                reading.numeric === null ? 0 : Math.abs(reading.numeric),
            )
            .filter((reading) => reading > 0);
        return Math.max(...values, 1);
    });
    let summaryMetrics = $derived(
        [
            {
                key: "today",
                label: "Today",
                iconName: "today",
                reading: readEnergyValue(smartOptions.todayEnergyEntityId),
                accent: "var(--color-m3-primary)",
            },
            {
                key: "gas",
                label: "Gas",
                iconName: "local_fire_department",
                reading: readEnergyValue(smartOptions.gasEntityId),
                accent: "var(--color-m3-secondary)",
            },
            {
                key: "water",
                label: "Water",
                iconName: "water_drop",
                reading: readEnergyValue(smartOptions.waterEntityId),
                accent: "var(--color-m3-tertiary)",
            },
        ].filter((item) => !item.reading.missing),
    );

    let sourceEntityIds = $derived(
        new Set(
            [
                smartOptions.solarPowerEntityId,
                smartOptions.homePowerEntityId || entityId,
                smartOptions.gridImportEntityId,
                smartOptions.gridExportEntityId,
                smartOptions.batteryPowerEntityId,
                smartOptions.todayEnergyEntityId,
            ].filter((item): item is string => !!item),
        ),
    );

    let sourceSeriesConfigs = $derived(
        [
            {
                entityId: smartOptions.solarPowerEntityId,
                label: "Solar",
                color: "var(--color-m3-graph-2)",
                chartType: "area" as GraphChartType,
            },
            {
                entityId: smartOptions.homePowerEntityId || entityId,
                label: "Home",
                color: "var(--color-m3-graph-1)",
                chartType: "line" as GraphChartType,
            },
            {
                entityId: smartOptions.gridImportEntityId,
                label: "Grid",
                color: "var(--color-m3-graph-3)",
                chartType: "bar" as GraphChartType,
            },
            {
                entityId: smartOptions.batteryPowerEntityId,
                label: "Battery",
                color: "var(--color-m3-graph-4)",
                chartType: "step" as GraphChartType,
            },
        ].filter((item): item is EnergySourceSeries => !!item.entityId),
    );
    let sourceHistoryConfig = $derived.by(() =>
        buildSourceHistoryConfig(smartOptions),
    );
    let sourceHistoryByEntityId = $derived.by(() =>
        new Map(sourceHistory.map((item) => [item.entityId, item])),
    );
    let sourcePeakDisplay = $derived.by(() => {
        const values = sourceHistory
            .flatMap((item) => item.points)
            .map((point) => point.value)
            .filter((value): value is number => value !== null);

        if (values.length === 0) return null;
        return formatSourceAxisValue(
            values.reduce(
                (highest, value) =>
                    Math.max(highest, Math.abs(value)),
                0,
            ),
        );
    });
    let sourceLegendItems = $derived.by(() =>
        sourceSeriesConfigs.map((source) => {
            const history = sourceHistoryByEntityId.get(source.entityId);
            const latest = history ? latestNumericPoint(history.points) : null;
            const fallback = readEnergyValue(source.entityId);

            return {
                ...source,
                display:
                    latest === null
                        ? fallback.display
                        : formatSourceAxisValue(latest),
            };
        }),
    );

    let balanceGauges = $derived.by(() => {
        const solar = solarNode.reading.numeric;
        const home = homeReading.numeric;
        const imported = readEnergyValue(smartOptions.gridImportEntityId);
        const exported = readEnergyValue(smartOptions.gridExportEntityId);
        const battery = batteryNode.reading.numeric;
        const importValue = imported.numeric ?? 0;
        const exportValue = exported.numeric ?? 0;
        const gridTotal = importValue + exportValue;
        const gridBalance =
            gridTotal > 0 ? (exportValue / gridTotal) * 100 : null;
        const solarSelfUse =
            solar !== null && solar > 0
                ? ((solar - exportValue) / solar) * 100
                : null;
        const selfSufficiency =
            home !== null && home > 0 && solar !== null
                ? ((solar + Math.max(0, battery ?? 0)) / home) * 100
                : null;
        const batteryContribution =
            home !== null && home > 0 && battery !== null
                ? (Math.abs(battery) / home) * 100
                : null;

        return [
            {
                key: "grid",
                label: "Grid Balance",
                value: gridBalance,
                display: formatPercent(gridBalance),
                detail:
                    exported.missing && imported.missing
                        ? "No import/export data"
                        : `${formatWithUnit(importValue, imported.unit || exported.unit)} in / ${formatWithUnit(exportValue, exported.unit || imported.unit)} out`,
                iconName: "power",
                accent: "var(--color-m3-primary)",
            },
            {
                key: "solar",
                label: "Solar Self-use",
                value: solarSelfUse,
                display: formatPercent(solarSelfUse),
                detail:
                    solar === null
                        ? "No solar production"
                        : `${solarNode.reading.display} producing`,
                iconName: "solar_power",
                accent: "var(--color-m3-secondary)",
            },
            {
                key: "self",
                label: "Self-sufficiency",
                value: selfSufficiency,
                display: formatPercent(selfSufficiency),
                detail:
                    home === null
                        ? "No home load"
                        : `${homeReading.display} current load`,
                iconName: "home",
                accent: "var(--color-m3-tertiary)",
            },
            {
                key: "battery",
                label: "Battery",
                value: batteryContribution,
                display: formatPercent(batteryContribution),
                detail:
                    battery === null
                        ? "No battery power"
                        : `${batteryNode.reading.display} contribution`,
                iconName: "battery_charging_full",
                accent: "var(--color-m3-graph-4)",
            },
        ] satisfies EnergyGauge[];
    });

    let deviceRows = $derived.by(() => {
        const configuredIds = smartOptions.deviceEntityIds?.filter(Boolean) ?? [];
        const entities =
            configuredIds.length > 0
                ? inventoryStore.getEntities(configuredIds)
                : inventoryStore.query({
                      domains: ["sensor"],
                      deviceClasses: ["energy", "power"],
                      limit: 30,
                      sort: "name",
                  });

        const rows = entities
            .filter(
                (entity) =>
                    !sourceEntityIds.has(entity.entityId) &&
                    (!entity.deviceClass ||
                        powerDeviceClasses.has(entity.deviceClass)),
            )
            .map((entity) => {
                const reading = readEnergyValue(entity.entityId);
                return {
                    entityId: entity.entityId,
                    name: entity.name,
                    reading,
                    accent:
                        entity.deviceClass === "power"
                            ? "var(--color-m3-primary)"
                            : "var(--color-m3-secondary)",
                    width: "8%",
                };
            })
            .filter(
                (row) => !row.reading.missing && row.reading.numeric !== null,
            )
            .sort(
                (a, b) =>
                    Math.abs(b.reading.numeric ?? 0) -
                    Math.abs(a.reading.numeric ?? 0),
            )
            .slice(0, 6);

        const maxValue = Math.max(
            1,
            ...rows.map((row) => Math.abs(row.reading.numeric ?? 0)),
        );

        return rows.map((row) => ({
            ...row,
            width: `${Math.max(10, Math.round((Math.abs(row.reading.numeric ?? 0) / maxValue) * 100))}%`,
        })) satisfies DeviceEnergyRow[];
    });

    function flowWidth(reading: EnergyReading) {
        if (reading.numeric === null || reading.missing) return "8%";
        const ratio = Math.abs(reading.numeric) / maxFlowValue;
        return `${Math.max(12, Math.min(100, Math.round(ratio * 100)))}%`;
    }

    $effect(() => {
        const selectedMode = mode;
        const configs = sourceSeriesConfigs;
        const historyConfig = sourceHistoryConfig;
        const connected = haStore.connected;
        const auth = haStore.auth;

        if (selectedMode !== "sources") {
            sourceHistory = [];
            sourceHistoryLoading = false;
            sourceHistoryError = null;
            return;
        }

        if (configs.length === 0) {
            sourceHistory = [];
            sourceHistoryLoading = false;
            sourceHistoryError = "No energy source entities configured.";
            return;
        }

        if (!connected || !auth) {
            sourceHistory = buildDemoSourceHistory(
                configs,
                historyConfig.start,
                historyConfig.end,
                historyConfig.targetCount,
            );
            sourceHistoryLoading = false;
            sourceHistoryError = null;
            return;
        }

        let cancelled = false;

        async function loadSourceHistory() {
            sourceHistoryLoading = true;
            sourceHistoryError = null;
            const entityIds = configs.map((config) => config.entityId);

            let result = await haStore.getStatistics(
                entityIds,
                historyConfig.start,
                historyConfig.end,
                historyConfig.period,
            );

            const hasStatistics =
                result.ok &&
                result.value.some((item) => hasNumericPoints(item.points));

            if (!hasStatistics) {
                result = await haStore.getHistory(
                    entityIds,
                    historyConfig.start,
                    historyConfig.end,
                );
            }

            if (cancelled) return;

            if (result.ok) {
                const historyByEntityId = new Map(
                    result.value.map((item) => [item.entityId, item.points]),
                );

                sourceHistory = configs.map((config) => {
                    const points = HistoryService.aggregateHistory(
                        historyByEntityId.get(config.entityId) ?? [],
                        config.chartType === "bar" ? "last" : "avg",
                        historyConfig.targetCount,
                    );

                    return {
                        entityId: config.entityId,
                        color: config.color,
                        chartType: config.chartType,
                        points: hasNumericPoints(points)
                            ? points
                            : buildDemoSourceHistory(
                                  [config],
                                  historyConfig.start,
                                  historyConfig.end,
                                  historyConfig.targetCount,
                              )[0].points,
                    };
                });
            } else {
                sourceHistoryError = result.error.message;
            }

            sourceHistoryLoading = false;
        }

        loadSourceHistory();

        return () => {
            cancelled = true;
        };
    });

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "energy",
            options: { energy: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "electric_bolt";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options =
                    (newConfig.options as { energy?: EnergyCardOptions })
                        ?.energy || options;
            },
            onDelete: ondelete,
        });
    }
</script>

{#snippet sourceNode(item: EnergyNode)}
    <div
        class="relative z-10 flex min-h-0 flex-col justify-between overflow-hidden rounded-m3-lg border border-m3-outline-variant/35 bg-m3-surface-container-high/80 p-[clamp(0.5rem,2.8cqmin,0.875rem)]"
        class:opacity-55={item.reading.missing}
    >
        <div class="flex min-w-0 items-center gap-2">
            <span
                class="flex size-[clamp(1.75rem,9cqmin,2.5rem)] shrink-0 items-center justify-center rounded-m3-full"
                style:background-color={`color-mix(in srgb, ${item.accent} 16%, transparent)`}
                style:color={item.accent}
            >
                <DynamicIcon name={item.iconName} class="size-[54%]" />
            </span>
            <div class="min-w-0">
                <p
                    class="truncate text-[clamp(0.6875rem,2.7cqmin,0.8125rem)] font-medium leading-tight"
                >
                    {item.label}
                </p>
                <p
                    class="truncate text-[clamp(0.5625rem,2.2cqmin,0.6875rem)] text-m3-on-surface-variant"
                >
                    {item.detail}
                </p>
            </div>
        </div>

        <div class="mt-2 min-w-0">
            <p
                class="truncate text-[clamp(0.875rem,4.2cqmin,1.25rem)] font-bold leading-tight"
            >
                {item.reading.display}
            </p>
            <div
                class="mt-2 h-1.5 overflow-hidden rounded-m3-full bg-m3-surface-container-highest"
            >
                <div
                    class="h-full rounded-m3-full"
                    style:width={flowWidth(item.reading)}
                    style:background-color={item.accent}
                ></div>
            </div>
        </div>
    </div>
{/snippet}

{#snippet metricPill(item: { label: string; iconName: string; reading: EnergyReading; accent: string })}
    <div
        class="flex min-w-0 items-center gap-2 rounded-m3-full bg-m3-surface-container-high px-[clamp(0.625rem,2.6cqmin,0.875rem)] py-[clamp(0.375rem,1.8cqmin,0.625rem)]"
    >
        <DynamicIcon
            name={item.iconName}
            class="size-[clamp(0.875rem,3cqmin,1.125rem)] shrink-0"
            style={`color: ${item.accent};`}
        />
        <span
            class="truncate text-[clamp(0.625rem,2.4cqmin,0.75rem)] text-m3-on-surface-variant"
        >
            {item.label}
        </span>
        <span
            class="ml-auto truncate text-[clamp(0.75rem,2.8cqmin,0.875rem)] font-semibold"
        >
            {item.reading.display}
        </span>
    </div>
{/snippet}

{#snippet gaugeCard(item: EnergyGauge)}
    <div
        class="relative flex min-h-0 flex-col overflow-hidden rounded-m3-lg border border-m3-outline-variant/35 bg-m3-surface-container-high/80 p-[clamp(0.625rem,3cqmin,1rem)]"
        class:opacity-60={item.value === null}
    >
        <div class="flex items-center gap-2">
            <span
                class="flex size-[clamp(2rem,8cqmin,2.75rem)] shrink-0 items-center justify-center rounded-m3-full"
                style:background-color={`color-mix(in srgb, ${item.accent} 16%, transparent)`}
                style:color={item.accent}
            >
                <DynamicIcon name={item.iconName} class="size-[56%]" />
            </span>
            <div class="min-w-0">
                <p
                    class="truncate text-[clamp(0.75rem,3cqmin,0.9375rem)] font-semibold"
                >
                    {item.label}
                </p>
                <p
                    class="truncate text-[clamp(0.5625rem,2.2cqmin,0.75rem)] text-m3-on-surface-variant"
                >
                    {item.detail}
                </p>
            </div>
        </div>

        <div class="mt-auto pt-3">
            <div class="flex items-end justify-between gap-3">
                <span
                    class="text-[clamp(1.25rem,7cqmin,2rem)] font-bold leading-none"
                >
                    {item.display}
                </span>
                <span
                    class="text-[clamp(0.5625rem,2.2cqmin,0.6875rem)] uppercase tracking-wide text-m3-on-surface-variant"
                >
                    live
                </span>
            </div>
            <div
                class="mt-3 h-2 overflow-hidden rounded-m3-full bg-m3-surface-container-highest"
            >
                <div
                    class="h-full rounded-m3-full"
                    style:width={`${item.value === null ? 0 : clampPercent(item.value)}%`}
                    style:background-color={item.accent}
                ></div>
            </div>
        </div>
    </div>
{/snippet}

{#snippet deviceRow(row: DeviceEnergyRow)}
    <div class="flex min-w-0 flex-col gap-1.5 rounded-m3-md bg-m3-surface-container-high/80 p-2">
        <div class="flex min-w-0 items-center gap-2">
            <span
                class="size-2 rounded-m3-full"
                style:background-color={row.accent}
            ></span>
            <span
                class="min-w-0 flex-1 truncate text-[clamp(0.6875rem,2.8cqmin,0.875rem)] font-medium"
            >
                {row.name}
            </span>
            <span
                class="shrink-0 text-[clamp(0.6875rem,2.8cqmin,0.875rem)] font-semibold"
            >
                {row.reading.display}
            </span>
        </div>
        <div
            class="h-1.5 overflow-hidden rounded-m3-full bg-m3-surface-container-highest"
        >
            <div
                class="h-full rounded-m3-full"
                style:width={row.width}
                style:background-color={row.accent}
            ></div>
        </div>
    </div>
{/snippet}

<article
    class="relative h-full w-full rounded-m3-card text-m3-on-surface overflow-hidden group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
>
    <div
        class="flex h-full flex-col gap-[clamp(0.375rem,3cqmin,1rem)] p-[clamp(0.625rem,4cqmin,1.5rem)]"
    >
        <header class="flex items-center gap-[clamp(0.375rem,3cqmin,1rem)]">
            <div
                class="size-[clamp(2.5rem,18cqmin,4.75rem)] rounded-m3-full flex items-center justify-center shrink-0"
                style:background-color={color
                    ? `color-mix(in srgb, ${color} 16%, transparent)`
                    : "var(--color-m3-tertiary-container)"}
                style:color={color || "var(--color-m3-tertiary)"}
            >
                <DynamicIcon
                    name={icon || "electric_bolt"}
                    class="size-[58%]"
                />
            </div>
            <div class="min-w-0 flex-1">
                <h3
                    class="text-[clamp(14px,5cqmin,20px)] font-bold leading-tight truncate"
                >
                    {title}
                </h3>
                <p
                    class="text-[clamp(10px,3.4cqmin,13px)] text-m3-on-surface-variant"
                >
                    {value(smartOptions.todayEnergyEntityId)} today
                </p>
            </div>
        </header>

        {#if isCompact}
            <div
                class="grid grid-cols-2 gap-[clamp(0.25rem,2.4cqmin,0.75rem)] flex-1 min-h-0"
            >
                {#each allNodes as item (item.key)}
                    {@render sourceNode(item)}
                {/each}
            </div>
        {:else if mode === "balance"}
            <div
                class="grid min-h-0 flex-1 grid-cols-1 gap-[clamp(0.5rem,3cqmin,1rem)] @[30rem]:grid-cols-2"
            >
                {#each balanceGauges as item (item.key)}
                    {@render gaugeCard(item)}
                {/each}
            </div>
        {:else if mode === "sources"}
            <div
                class="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-m3-lg border border-m3-outline-variant/25 bg-m3-surface-container-high/55 p-[clamp(0.625rem,3cqmin,1.25rem)]"
            >
                <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <p
                            class="truncate text-[clamp(0.75rem,3cqmin,0.9375rem)] font-semibold"
                        >
                            Power Sources
                        </p>
                        <p
                            class="truncate text-[clamp(0.5625rem,2.2cqmin,0.75rem)] text-m3-on-surface-variant"
                        >
                            {sourceHistoryConfig.subtitle}
                        </p>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                        {#if sourcePeakDisplay}
                            <span
                                class="rounded-m3-full bg-m3-surface-container-highest px-3 py-1 text-[clamp(0.5625rem,2.2cqmin,0.6875rem)] font-semibold text-m3-on-surface-variant"
                            >
                                Peak {sourcePeakDisplay}
                            </span>
                        {/if}
                        {#if sourceHistoryLoading}
                            <span
                                class="rounded-m3-full bg-m3-surface-container-highest px-3 py-1 text-[clamp(0.5625rem,2.2cqmin,0.6875rem)] text-m3-on-surface-variant"
                            >
                                Loading
                            </span>
                        {/if}
                    </div>
                </div>

                <div class="mt-3 min-h-0 flex-1">
                    {#if sourceHistory.length > 0}
                        <MiniChart
                            series={sourceHistory.map((source) => ({
                                data: source.points,
                                color: source.color,
                                chartType: source.chartType,
                                isFilled: source.chartType === "area",
                                strokeWidth: source.chartType === "line" ? 2.4 : 2,
                                strokeDasharray:
                                    source.chartType === "line"
                                        ? "6 5"
                                        : undefined,
                            }))}
                            chartType="area"
                            showGrid={true}
                            showValueAxis={true}
                            showTimeAxis={true}
                            valueFormatter={formatSourceAxisValue}
                            timeFormatter={formatSourceTimeTick}
                        />
                    {:else}
                        <div
                            class="flex h-full items-center justify-center rounded-m3-md bg-m3-surface-container-high/70 text-center text-[clamp(0.6875rem,2.7cqmin,0.875rem)] text-m3-on-surface-variant"
                        >
                            {sourceHistoryError ?? "No source history yet"}
                        </div>
                    {/if}
                </div>

                {#if sourceSeriesConfigs.length > 0}
                    <div class="mt-3 flex flex-wrap gap-2">
                        {#each sourceLegendItems as source (source.entityId)}
                            <span
                                class="inline-flex items-center gap-1.5 rounded-m3-full bg-m3-surface-container-high px-2.5 py-1 text-[clamp(0.5625rem,2.2cqmin,0.75rem)]"
                            >
                                <span
                                    class="size-2 rounded-m3-full"
                                    style:background-color={source.color}
                                ></span>
                                <span>{source.label}</span>
                                <span class="font-semibold text-m3-on-surface">
                                    {source.display}
                                </span>
                            </span>
                        {/each}
                    </div>
                {/if}
            </div>
        {:else if mode === "devices"}
            <div
                class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-m3-lg border border-m3-outline-variant/25 bg-m3-surface-container-high/55 p-[clamp(0.625rem,3cqmin,1.25rem)]"
            >
                <div class="flex items-center justify-between">
                    <div class="min-w-0">
                        <p
                            class="truncate text-[clamp(0.75rem,3cqmin,0.9375rem)] font-semibold"
                        >
                            Top Consumers
                        </p>
                        <p
                            class="truncate text-[clamp(0.5625rem,2.2cqmin,0.75rem)] text-m3-on-surface-variant"
                        >
                            Current energy and power sensors
                        </p>
                    </div>
                    <span
                        class="rounded-m3-full bg-m3-secondary-container px-3 py-1 text-[clamp(0.5625rem,2.2cqmin,0.75rem)] font-semibold text-m3-on-secondary-container"
                    >
                        {deviceRows.length}
                    </span>
                </div>

                {#if deviceRows.length > 0}
                    <div class="min-h-0 flex-1 space-y-2 overflow-hidden">
                        {#each deviceRows as row (row.entityId)}
                            {@render deviceRow(row)}
                        {/each}
                    </div>
                {:else}
                    <div
                        class="flex min-h-0 flex-1 items-center justify-center rounded-m3-md bg-m3-surface-container-high/70 text-center text-[clamp(0.6875rem,2.7cqmin,0.875rem)] text-m3-on-surface-variant"
                    >
                        No device energy sensors found
                    </div>
                {/if}
            </div>
        {:else}
            <div
                class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-m3-lg border border-m3-outline-variant/25 bg-m3-surface-container-high/55 p-[clamp(0.625rem,3cqmin,1.25rem)]"
            >
                <div class="pointer-events-none absolute inset-0 opacity-70">
                    <div
                        class="absolute left-[16%] right-[16%] top-1/2 h-px bg-m3-outline-variant/45"
                    ></div>
                    <div
                        class="absolute bottom-[24%] left-[18%] right-[18%] h-px bg-m3-outline-variant/25"
                    ></div>
                    <div
                        class="absolute left-1/2 top-[16%] bottom-[16%] w-px bg-m3-outline-variant/25"
                    ></div>
                </div>

                <div
                    class="relative z-10 grid h-full w-full grid-cols-[minmax(0,1fr)_minmax(5.5rem,0.85fr)_minmax(0,1fr)] grid-rows-2 items-stretch gap-[clamp(0.5rem,3cqmin,1rem)]"
                >
                    {@render sourceNode(solarNode)}

                    <div
                        class="row-span-2 flex min-h-0 flex-col items-center justify-center rounded-m3-xl border border-m3-outline-variant/40 bg-m3-surface-container-highest/90 px-[clamp(0.625rem,3cqmin,1rem)] py-[clamp(0.75rem,4cqmin,1.25rem)] text-center shadow-m3-elevation-1"
                    >
                        <span
                            class="flex size-[clamp(2.25rem,12cqmin,3.5rem)] items-center justify-center rounded-m3-full bg-m3-tertiary-container text-m3-tertiary"
                        >
                            <DynamicIcon name="home" class="size-[56%]" />
                        </span>
                        <p
                            class="mt-2 text-[clamp(0.6875rem,2.7cqmin,0.8125rem)] font-medium text-m3-on-surface-variant"
                        >
                            Home Load
                        </p>
                        <p
                            class="max-w-full truncate text-[clamp(1rem,5cqmin,1.75rem)] font-bold leading-tight"
                        >
                            {homeReading.display}
                        </p>
                    </div>

                    {@render sourceNode(gridNode)}
                    {@render sourceNode(batteryNode)}

                    <div
                        class="flex min-h-0 flex-col justify-center gap-2 rounded-m3-lg bg-m3-surface-container-high/70 p-[clamp(0.5rem,2.8cqmin,0.875rem)]"
                    >
                        <p
                            class="text-[clamp(0.6875rem,2.7cqmin,0.8125rem)] font-semibold"
                        >
                            Balance
                        </p>
                        <p
                            class="text-[clamp(0.5625rem,2.2cqmin,0.6875rem)] text-m3-on-surface-variant"
                        >
                            Live power distribution
                        </p>
                        <div class="flex items-center gap-1.5">
                            {#each flowNodes as item (item.key)}
                                <span
                                    class="h-2 flex-1 rounded-m3-full opacity-80"
                                    class:opacity-25={item.reading.missing}
                                    style:background-color={item.accent}
                                ></span>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            {#if summaryMetrics.length > 0}
                <div class="grid grid-cols-1 gap-2 @[28rem]:grid-cols-3">
                    {#each summaryMetrics as item (item.key)}
                        {@render metricPill(item)}
                    {/each}
                </div>
            {/if}
        {/if}
    </div>

    <button
        class="touch-edit-control absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Energy Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>
