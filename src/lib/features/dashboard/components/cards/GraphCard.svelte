<script lang="ts">
    import { haStore } from "$lib/stores/ha.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { HistoryService } from "$lib/domain/historyService";
    import { getDomain, getEntityName } from "$lib/utils/entity";
    import type { GraphCardEntity, HistoryDataPoint } from "$lib/types";
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
        show?: {
            graph?: boolean;
            icon?: boolean;
            name?: boolean;
            state?: boolean;
            fill?: boolean;
        };
        line_color?: string | string[];
        graphEntities?: GraphCardEntity[];
        ondelete?: () => void;
        class?: string;
        color?: string;
        backgroundColor?: string;
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
        show = { graph: true, icon: true, name: true, state: true, fill: true },
        line_color,
        graphEntities = $bindable([]),
        ondelete,
        class: className = "",
        color = $bindable(),
        backgroundColor = $bindable(),
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

    let historyData = $state<
        Array<{ entityId: string; points: HistoryDataPoint[]; color?: string }>
    >([]);
    let isLoading = $state(false);
    let error = $state<string | null>(null);

    function buildDemoHistory(
        entities: Array<{ entity_id: string; color?: string }>,
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
                    const value = Number((base + wave + trend).toFixed(1));

                    return {
                        timestamp,
                        state: String(value),
                        value,
                    };
                },
            );

            return {
                entityId: entityConfig.entity_id || `demo-${seriesIndex}`,
                points,
                color:
                    entityConfig.color ||
                    `var(--color-m3-graph-${(seriesIndex % 6) + 1})`,
            };
        });
    }

    // Fetch history data for all entities
    $effect(() => {
        const entitiesToFetch = [
            ...(entityId
                ? [
                      {
                          entity_id: entityId,
                          name,
                          color: color || (line_color as string),
                      },
                  ]
                : []),
            ...graphEntities.map((ge) => ({
                entity_id: ge.entity_id,
                name: ge.name,
                color: ge.color,
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

        async function fetchHistory() {
            isLoading = true;
            error = null;

            const end = timeRange.end;
            const start = timeRange.start;

            const entityIds = entitiesToFetch.map((e) => e.entity_id);
            const result = await haStore.getHistory(entityIds, start, end);

            if (result.ok) {
                const targetCount = Math.max(
                    10,
                    Math.floor(hours_to_show * points_per_hour),
                );

                historyData = result.value.map((res, idx) => {
                    const config = entitiesToFetch[idx];
                    return {
                        entityId: config.entity_id,
                        points: HistoryService.aggregateHistory(
                            res.points || [],
                            aggregate_func,
                            targetCount,
                        ),
                        color:
                            config.color ||
                            `var(--color-m3-graph-${(idx % 6) + 1})`,
                    };
                });
            } else {
                error = result.error.message;
            }
            isLoading = false;
        }

        fetchHistory();
    });

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            entityId,
            name,
            type: "graph",
            graphEntities,
            color,
            backgroundColor,
            icon: typeof iconProp === "string" ? iconProp : "",
            onSave: (newConfig) => {
                if (newConfig.type === "graph") {
                    entityId = newConfig.entityId;
                    name = newConfig.name;
                    hours_to_show = newConfig.hours_to_show ?? 24;
                    aggregate_func = newConfig.aggregate_func ?? "avg";
                    graphEntities = newConfig.graphEntities || [];
                    color = newConfig.color;
                    backgroundColor = newConfig.backgroundColor;
                    iconProp = newConfig.icon || "";
                }
            },
            onDelete: ondelete,
        });
    }

    const baseStyles =
        "relative flex flex-col w-full h-full rounded-m3-card bg-m3-surface-container-highest text-m3-on-surface overflow-hidden transition-all duration-200 group/card";
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
</script>

<div
    class="{baseStyles} {className} @container"
    bind:clientHeight
    style={`container-type: size;${backgroundColor ? ` background-color: ${backgroundColor};` : ""}`}
>
    <!-- Background Graph (Visible when NOT expanded) -->
    {#if !isExpanded && show.graph !== false}
        <div
            class="absolute inset-0 z-0 opacity-10 pointer-events-none w-full h-full"
        >
            <MiniChart
                series={historyData.map((s) => ({
                    data: s.points,
                    color: s.color,
                    isFilled: show.fill !== false,
                }))}
                startTime={timeRange.start}
                endTime={timeRange.end}
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
                        style:background-color={color
                            ? `color-mix(in srgb, ${color} 10%, transparent)`
                            : "var(--color-m3-primary-container)"}
                        style:color={color || "var(--color-m3-primary)"}
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

    <!-- Foreground Chart (Visible when expanded) -->
    {#if isExpanded && show.graph !== false}
        <div class="flex-1 min-h-0 relative z-10">
            {#if isLoading && historyData.length === 0}
                <div
                    class="absolute inset-0 flex items-center justify-center opacity-50"
                >
                    <span class="text-[clamp(0.6875rem,3cqmin,0.875rem)]">Loading history...</span>
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
                series={historyData.map((s) => ({
                    data: s.points,
                    color: s.color,
                    isFilled: show.fill !== false,
                }))}
                startTime={timeRange.start}
                endTime={timeRange.end}
            />
        </div>
    {/if}

    <!-- Edit FAB -->
    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</div>
