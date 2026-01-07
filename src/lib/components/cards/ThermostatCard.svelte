<script lang="ts">
    import {
        haStore,
        cardEditorStore,
        formatTemperature,
        getEntityName,
    } from "$lib";
    import type {
        ClimateEntityAttributes,
        HistoryData,
        ThermostatCardConfig,
    } from "$lib/types";
    import HistoryGraph from "./thermostat/HistoryGraph.svelte";
    import IconFire from "~icons/material-symbols/local-fire-department";
    import IconSnowflake from "~icons/material-symbols/ac-unit";
    import IconPower from "~icons/material-symbols/power-settings-new";
    import IconCloud from "~icons/material-symbols/cloud";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        entityId: string;
        secondaryEntityId?: string;
        name?: string;
        secondaryName?: string;
        class?: string;
    }

    let {
        entityId = $bindable(""),
        secondaryEntityId = $bindable(""),
        name = $bindable(""),
        secondaryName = $bindable(""),
        class: className = "",
    }: Props = $props();

    // -- Entity State --
    let entity = $derived(haStore.getEntity(entityId));
    let secondaryEntity = $derived(
        secondaryEntityId ? haStore.getEntity(secondaryEntityId) : null,
    );

    // Cast to climate attributes for type safety
    let climateAttrs = $derived(
        (entity?.attributes || {}) as ClimateEntityAttributes,
    );

    // -- Derived Display Values --
    let displayName = $derived(
        name || getEntityName(entityId, entity?.attributes || {}),
    );
    let secondaryDisplayName = $derived(
        secondaryName ||
            (secondaryEntity
                ? getEntityName(secondaryEntityId!, secondaryEntity.attributes)
                : "Outside"),
    );

    let currentTemp = $derived(
        parseFloat(climateAttrs.current_temperature?.toString() || "") || null,
    );
    let targetTemp = $state<number | null>(null);
    let hvacAction = $derived(climateAttrs.hvac_action);
    let hvacMode = $derived(climateAttrs.hvac_mode);
    let hvacModes = $derived(climateAttrs.hvac_modes || ["off", "heat"]);

    let minTemp = $derived(
        parseFloat(climateAttrs.min_temp?.toString() || "") || 5,
    );
    let maxTemp = $derived(
        parseFloat(climateAttrs.max_temp?.toString() || "") || 35,
    );
    let tempStep = $derived(
        parseFloat(climateAttrs.target_temp_step?.toString() || "") || 0.5,
    );

    let outsideTemp = $derived(
        secondaryEntity ? parseFloat(secondaryEntity.state) : null,
    );

    let isActive = $derived(hvacMode !== "off" && entity?.state !== "off");

    // -- Sync target temp from entity --
    $effect(() => {
        const entityTemp = parseFloat(
            climateAttrs.temperature?.toString() || "",
        );
        if (!isNaN(entityTemp)) {
            targetTemp = entityTemp;
        }
    });

    // -- History Data --
    let insideHistory = $state<HistoryData | null>(null);
    let outsideHistory = $state<HistoryData | null>(null);
    let lastFetchTime = 0;

    $effect(() => {
        // Trigger fetch on entity change, initial mount, or when connection is established
        if (entityId && haStore.connected) {
            fetchHistory();
        }
    });

    async function fetchHistory() {
        // Prevent spamming calls
        const now = Date.now();
        if (now - lastFetchTime < 60000) return; // Only fetch once per minute max
        lastFetchTime = now;

        // Round to nearest 5 minutes for better cache hitting in HAStore
        const roundedNow = Math.floor(now / (5 * 60000)) * (5 * 60000);
        const startTime = new Date(roundedNow - 24 * 60 * 60 * 1000);

        const entityIds = secondaryEntityId
            ? [entityId, secondaryEntityId]
            : [entityId];

        console.log(
            "[Thermostat Debug] Triggering history fetch for:",
            entityIds,
        );
        const historyData = await haStore.getHistory(entityIds, startTime);
        console.log("[Thermostat Debug] Received history data:", historyData);

        if (historyData[0]) insideHistory = historyData[0];
        if (historyData[1]) outsideHistory = historyData[1];
    }

    // -- Dynamic HVAC Icon Component --
    let HvacIconComponent = $derived(
        hvacAction === "heating"
            ? IconFire
            : hvacAction === "cooling"
              ? IconSnowflake
              : IconPower,
    );

    // -- Temperature Controls --
    function incrementTemp() {
        if (targetTemp === null) return;
        const newTemp = Math.min(targetTemp + tempStep, maxTemp);
        setTargetTemp(newTemp);
    }

    function decrementTemp() {
        if (targetTemp === null) return;
        const newTemp = Math.max(targetTemp - tempStep, minTemp);
        setTargetTemp(newTemp);
    }

    function setTargetTemp(temp: number) {
        targetTemp = temp; // Optimistic update
        haStore.callService("climate", "set_temperature", {
            entity_id: entityId,
            temperature: temp,
        });
    }

    // -- Mode Controls --
    function togglePower() {
        const newMode = hvacMode === "off" ? "heat" : "off";
        haStore.callService("climate", "set_hvac_mode", {
            entity_id: entityId,
            hvac_mode: newMode,
        });
    }

    function cycleMode() {
        const currentIndex = hvacModes.indexOf(hvacMode || "off");
        const nextIndex = (currentIndex + 1) % hvacModes.length;
        const newMode = hvacModes[nextIndex];

        haStore.callService("climate", "set_hvac_mode", {
            entity_id: entityId,
            hvac_mode: newMode,
        });
    }

    // -- Config Dialog --
    function openConfig(e: Event) {
        e.stopPropagation();
        const config: ThermostatCardConfig = {
            entityId,
            name: name || "",
            type: "thermostat",
            secondaryEntityId,
            secondaryName,
            onSave: (newConfig: any) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                secondaryEntityId = newConfig.secondaryEntityId || "";
                secondaryName = newConfig.secondaryName || "";
            },
        };
        cardEditorStore.open(config);
    }

    // -- Responsive Layout --
    let clientHeight = $state(0);
    // 1 row (<130px): Compact Horizontal
    let isCompact = $derived(clientHeight < 130);
    // 3 rows (>=220px): Full with Graph. 2 rows: Vertical but no graph.
    let isExpanded = $derived(clientHeight >= 220);
</script>

<!-- Card Container -->
<div
    class="relative flex flex-col w-full h-full rounded-[var(--radius-m3-md)] bg-m3-surface-container overflow-hidden shadow-sm group {className}"
    bind:clientHeight
>
    <!-- Background Graph (Visible when NOT expanded) -->
    {#if !isExpanded}
        <div class="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <HistoryGraph
                insideData={insideHistory?.points || []}
                outsideData={outsideHistory?.points || []}
            />
        </div>
    {/if}

    {#if isCompact}
        <!-- Compact Row Layout (Height < 130px) -->
        <div
            class="relative z-10 flex items-center justify-between pl-4 pr-12 h-full gap-4"
        >
            <!-- Status & Info -->
            <div class="flex items-center gap-3 min-w-0">
                <button
                    class="w-10 h-10 flex items-center justify-center rounded-full transition-colors shrink-0 {isActive
                        ? 'bg-m3-primary-container text-m3-on-primary-container'
                        : 'bg-m3-surface-container-high text-m3-on-surface-variant'}"
                    onclick={cycleMode}
                >
                    <HvacIconComponent class="size-5" />
                </button>
                <div class="flex flex-col min-w-0">
                    <span
                        class="text-m3-title-medium text-m3-on-surface font-bold leading-none"
                    >
                        {formatTemperature(currentTemp)}
                    </span>
                    <span
                        class="text-m3-body-small text-m3-on-surface-variant truncate leading-tight"
                    >
                        {displayName}
                    </span>
                </div>
            </div>

            <!-- Controls -->
            <div class="flex items-center gap-2 shrink-0">
                <!-- Mini Stepper -->
                <div
                    class="flex items-center bg-m3-surface-container-high rounded-full p-1 border border-m3-outline/10"
                >
                    <button
                        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-m3-on-surface/10 text-m3-on-surface-variant"
                        onclick={decrementTemp}
                    >
                        −
                    </button>
                    <span
                        class="text-m3-body-large text-m3-on-surface font-bold min-w-[2.5rem] text-center"
                    >
                        {targetTemp !== null ? targetTemp.toFixed(1) : "--"}
                    </span>
                    <button
                        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-m3-on-surface/10 text-m3-on-surface-variant"
                        onclick={incrementTemp}
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    {:else}
        <!-- Full Layout (Height >= 130px) -->
        <div class="relative z-10 flex flex-col h-full">
            <!-- Header Section -->
            <div class="flex justify-between items-start px-5 pt-5 pb-3">
                <!-- Inside Temperature -->
                <div class="flex items-center gap-3">
                    <div class="text-m3-secondary">
                        <HvacIconComponent class="size-6" />
                    </div>
                    <div class="flex flex-col">
                        <span
                            class="text-m3-title-medium text-m3-on-surface font-medium"
                        >
                            {formatTemperature(currentTemp)}
                        </span>
                        <span
                            class="text-m3-label-small text-m3-on-surface-variant"
                        >
                            {displayName}
                        </span>
                    </div>
                </div>

                <!-- Outside Temperature -->
                {#if secondaryEntityId && outsideTemp !== null}
                    <div class="flex items-center gap-3">
                        <div class="text-m3-primary">
                            <IconCloud class="size-6" />
                        </div>
                        <div class="flex flex-col items-end">
                            <span
                                class="text-m3-title-medium text-m3-on-surface font-medium"
                            >
                                {formatTemperature(outsideTemp)}
                            </span>
                            <span
                                class="text-m3-label-small text-m3-on-surface-variant"
                            >
                                {secondaryDisplayName}
                            </span>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- History Graph (Only in Expanded Mode) -->
            {#if isExpanded}
                <div class="w-full h-32 px-2 mt-auto">
                    <HistoryGraph
                        insideData={insideHistory?.points || []}
                        outsideData={outsideHistory?.points || []}
                    />
                </div>
            {/if}

            <!-- Control Footer -->
            <div
                class="flex items-center justify-between px-4 py-4 border-t border-m3-outline-variant/30 mt-auto"
            >
                <!-- Temperature Stepper -->
                <div
                    class="flex items-center gap-3 bg-m3-surface-container-high rounded-full px-3 py-2"
                >
                    <button
                        class="w-8 h-8 flex items-center justify-center rounded-full text-m3-on-surface-variant hover:bg-m3-on-surface/10 transition-colors"
                        onclick={decrementTemp}
                        aria-label="Decrease temperature"
                    >
                        <span class="text-xl font-medium">−</span>
                    </button>
                    <span
                        class="text-m3-title-large font-bold text-m3-on-surface min-w-[4rem] text-center"
                    >
                        {targetTemp !== null ? targetTemp.toFixed(1) : "--"}
                    </span>
                    <button
                        class="w-8 h-8 flex items-center justify-center rounded-full text-m3-on-surface-variant hover:bg-m3-on-surface/10 transition-colors"
                        onclick={incrementTemp}
                        aria-label="Increase temperature"
                    >
                        <span class="text-xl font-medium">+</span>
                    </button>
                </div>

                <!-- Mode Controls -->
                <div class="flex items-center gap-2">
                    <!-- HVAC Mode Button -->
                    <button
                        class="w-12 h-12 flex items-center justify-center rounded-full transition-colors {isActive
                            ? 'bg-m3-primary-container text-m3-on-primary-container'
                            : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-on-surface/10'}"
                        onclick={cycleMode}
                        aria-label="Toggle heating mode"
                    >
                        <IconFire class="size-6" />
                    </button>

                    <!-- Power Button -->
                    <button
                        class="w-12 h-12 flex items-center justify-center rounded-full bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-on-surface/10 transition-colors"
                        onclick={togglePower}
                        aria-label="Toggle power"
                    >
                        <IconPower class="size-6" />
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Edit FAB (Visible on Hover) -->
    <button
        class="absolute top-2 right-2 p-2 rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:brightness-110 z-20"
        onclick={openConfig}
        title="Edit Card"
    >
        <IconEdit class="size-4" />
    </button>
</div>
