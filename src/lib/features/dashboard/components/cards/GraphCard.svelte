<script lang="ts">
    import {
        haStore,
        cardEditorStore,
        getEntityName,
        getDomain,
        type HistoryDataPoint,
        HistoryService,
        type GraphCardEntity,
    } from "$lib";
    import IconEdit from "~icons/material-symbols/edit";
    import IconShowChart from "~icons/material-symbols/show-chart";
    import MiniChart from "$lib/components/viz/MiniChart.svelte";
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

    let historyData = $state<
        Array<{ entityId: string; points: HistoryDataPoint[]; color?: string }>
    >([]);
    let isLoading = $state(false);
    let error = $state<string | null>(null);

    // Fetch history data for all entities
    $effect(() => {
        const entitiesToFetch = [
            ...(entityId
                ? [{ entity_id: entityId, name, color: line_color as string }]
                : []),
            ...graphEntities.map((ge) => ({
                entity_id: ge.entity_id,
                name: ge.name,
                color: ge.color,
            })),
        ];

        if (entitiesToFetch.length === 0 || !haStore.connected || !haStore.auth)
            return;

        async function fetchHistory() {
            isLoading = true;
            error = null;

            const end = new Date();
            const start = new Date(
                end.getTime() - hours_to_show * 60 * 60 * 1000,
            );

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
            onSave: (newConfig) => {
                if (newConfig.type === "graph") {
                    entityId = newConfig.entityId;
                    name = newConfig.name;
                    hours_to_show = newConfig.hours_to_show ?? 24;
                    aggregate_func = newConfig.aggregate_func ?? "avg";
                    graphEntities = newConfig.graphEntities || [];
                }
            },
            onDelete: ondelete,
        });
    }

    const baseStyles =
        "relative flex flex-col w-full h-full min-h-32 rounded-m3-md bg-m3-surface-container-highest text-m3-on-surface overflow-hidden transition-all duration-200 group p-4 gap-2";
</script>

<div class="{baseStyles} {className} @container">
    <!-- Header -->
    <div class="flex items-start justify-between z-10">
        <div class="flex items-center gap-3">
            {#if show.icon !== false}
                <div
                    class="flex items-center justify-center size-10 rounded-full bg-m3-primary/10 text-m3-primary shrink-0"
                >
                    <Icon class="size-6" />
                </div>
            {/if}
            <div class="flex flex-col min-w-0">
                {#if show.name !== false}
                    <span class="text-sm font-medium truncate opacity-70"
                        >{title}</span
                    >
                {/if}
                {#if show.state !== false}
                    <span class="text-2xl font-bold leading-tight truncate">
                        {displayState}
                        <span class="text-sm font-normal opacity-70"
                            >{unitOfMeasurement}</span
                        >
                    </span>
                {/if}
            </div>
        </div>
    </div>

    <!-- Chart -->
    <div class="flex-1 min-h-0 mt-2 relative">
        {#if isLoading && historyData.length === 0}
            <div
                class="absolute inset-0 flex items-center justify-center opacity-50"
            >
                <span class="text-xs">Loading history...</span>
            </div>
        {/if}

        {#if error}
            <div
                class="absolute inset-0 flex items-center justify-center text-m3-error text-xs p-2 text-center"
            >
                {error}
            </div>
        {/if}

        {#if show.graph !== false}
            <MiniChart
                series={historyData.map((s) => ({
                    data: s.points,
                    color: s.color,
                    isFilled: show.fill !== false,
                }))}
                height={80}
            />
        {/if}
    </div>

    <!-- Edit FAB -->
    <button
        class="absolute top-2 right-2 p-1.5 rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Card"
    >
        <IconEdit class="size-4" />
    </button>
</div>
