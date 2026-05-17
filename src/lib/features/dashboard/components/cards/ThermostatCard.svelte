<script lang="ts">
    import { dev } from "$app/environment";
    import { haStore } from "$lib/stores/ha.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { formatTemperature, getEntityName } from "$lib/utils/entity";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type {
        ClimateEntityAttributes,
        HistoryData,
        ThermostatCardConfig,
    } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import {
        getCardSurfaceClasses,
        getCardSurfaceStyle,
    } from "$lib/features/dashboard/utils/cardSurface";
    import HistoryGraph from "./thermostat/HistoryGraph.svelte";
    import IconFire from "~icons/material-symbols/local-fire-department";
    import IconSnowflake from "~icons/material-symbols/ac-unit";
    import IconPower from "~icons/material-symbols/power-settings-new";
    import IconCloud from "~icons/material-symbols/cloud";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId: string;
        name: string;
        secondaryEntityId?: string;
        secondaryName?: string;
        domainFilter: string;
        ondelete?: () => void;
        class?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        icon?: string | any;
        layoutRows?: number;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        secondaryEntityId = $bindable(""),
        secondaryName = $bindable(""),
        domainFilter = $bindable(""),
        ondelete,
        class: className = "",
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        icon: iconProp = $bindable(),
        layoutRows,
    }: Props = $props();

    // -- Constants --
    const CONSTANTS = {
        LAYOUT: {
            COMPACT_HEIGHT: 130,
            EXPANDED_HEIGHT: 220,
        },
        DEFAULTS: {
            MIN_TEMP: 5,
            MAX_TEMP: 35,
            TEMP_STEP: 0.5,
        },
        HISTORY: {
            THROTTLE_MS: 60_000,
            CACHE_ROUNDING_MS: 5 * 60_000,
            WINDOW_MS: 24 * 60 * 60 * 1000,
        },
    } as const;

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
        parseFloat(climateAttrs.min_temp?.toString() || "") ||
            CONSTANTS.DEFAULTS.MIN_TEMP,
    );
    let maxTemp = $derived(
        parseFloat(climateAttrs.max_temp?.toString() || "") ||
            CONSTANTS.DEFAULTS.MAX_TEMP,
    );
    let tempStep = $derived(
        parseFloat(climateAttrs.target_temp_step?.toString() || "") ||
            CONSTANTS.DEFAULTS.TEMP_STEP,
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
    let lastFetchedEntityId = ""; // Track which entity we last fetched
    let lastFetchedSecondaryId = ""; // Track secondary entity too

    $effect(() => {
        // Trigger fetch on entity change, initial mount, or when connection is established
        if (entityId && haStore.connected) {
            // If primary or secondary entity changed, reset throttle and clear old data
            if (
                entityId !== lastFetchedEntityId ||
                secondaryEntityId !== lastFetchedSecondaryId
            ) {
                lastFetchTime = 0; // Reset throttle
                insideHistory = null; // Clear old data
                outsideHistory = null;
            }
            fetchHistory();
        }
    });

    async function fetchHistory() {
        // Prevent spamming calls (only for same entities)
        const now = Date.now();
        if (
            now - lastFetchTime < CONSTANTS.HISTORY.THROTTLE_MS &&
            entityId === lastFetchedEntityId &&
            secondaryEntityId === lastFetchedSecondaryId
        )
            return;
        lastFetchTime = now;
        lastFetchedEntityId = entityId;
        lastFetchedSecondaryId = secondaryEntityId || "";

        // Round to nearest 5 minutes for better cache hitting in HAStore
        const roundedNow =
            Math.floor(now / CONSTANTS.HISTORY.CACHE_ROUNDING_MS) *
            CONSTANTS.HISTORY.CACHE_ROUNDING_MS;
        const startTime = new Date(roundedNow - CONSTANTS.HISTORY.WINDOW_MS);

        const entityIds = secondaryEntityId
            ? [entityId, secondaryEntityId]
            : [entityId];

        if (dev) console.debug("[Thermostat] Fetching history for:", entityIds);
        const result = await haStore.getHistory(entityIds, startTime);

        if (result.ok) {
            const historyData = result.value;

            if (historyData[0]) insideHistory = historyData[0];
            if (historyData[1]) outsideHistory = historyData[1];
        } else {
            if (dev) console.error("[Thermostat] History fetch failed:", result.error);
        }
    }

    // -- Dynamic HVAC Icon Component --
    let iconOverride = $derived(typeof iconProp === "string" ? iconProp : "");
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
            id,
            entityId,
            name: name || "",
            type: "thermostat",
            secondaryEntityId,
            secondaryName,
            domainFilter: domainFilter || "climate",
            onSave: (newConfig: any) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                secondaryEntityId = newConfig.secondaryEntityId || "";

                secondaryName = newConfig.secondaryName || "";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
            },
            onDelete: ondelete,
        };
        cardEditorStore.open(config);
    }

    // -- Responsive Layout --
    let clientHeight = $state(0);
    // 1 row (<130px): Compact Horizontal
    let isCompact = $derived(
        typeof layoutRows === "number"
            ? layoutRows <= 1
            : clientHeight > 0 && clientHeight < CONSTANTS.LAYOUT.COMPACT_HEIGHT,
    );
    // 3 rows (>=220px): Full with Graph. 2 rows: Vertical but no graph.
    // Default to expanded (isExpanded = true) when height is unknown (0) for tests/initial render
    let isExpanded = $derived(
        typeof layoutRows === "number"
            ? layoutRows >= 3
            : clientHeight === 0 || clientHeight >= CONSTANTS.LAYOUT.EXPANDED_HEIGHT,
    );
</script>

<!-- Card Container -->
<div
    class="relative flex flex-col w-full h-full rounded-m3-card overflow-hidden group/card {getCardSurfaceClasses(surfaceStyle)} {className} @container"
    bind:clientHeight
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
>
    <!-- Background Graph (Visible when NOT expanded) -->
    {#if !isExpanded}
        <div class="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <HistoryGraph
                insideData={insideHistory?.points || []}
                outsideData={outsideHistory?.points || []}
                insideColor={color}
            />
        </div>
    {/if}

    {#if isCompact}
        <!-- Compact Row Layout (Height < 130px) -->
        <div
            class="relative z-10 flex items-center justify-between pl-[clamp(0.75rem,4cqmin,1.5rem)] pr-[clamp(2.75rem,12cqmin,4.5rem)] h-full gap-[clamp(0.5rem,4cqmin,1.5rem)]"
        >
            <!-- Status & Info -->
            <div class="flex items-center gap-[clamp(0.375rem,3cqmin,1rem)] min-w-0">
                <button
                    class="size-[clamp(2.5rem,20cqmin,4.25rem)] flex items-center justify-center rounded-full transition-colors shrink-0"
                    style:background-color={isActive
                        ? color
                            ? `color-mix(in srgb, ${color} 10%, transparent)`
                            : "var(--color-m3-primary-container)"
                        : "var(--color-m3-surface-container-high)"}
                    style:color={isActive
                        ? color || "var(--color-m3-on-primary-container)"
                        : "var(--color-m3-on-surface-variant)"}
                    onclick={cycleMode}
                    aria-label="Toggle heating mode"
                >
                    {#if iconOverride}
                        <DynamicIcon name={iconOverride} class="size-[58%]" />
                    {:else}
                        <HvacIconComponent class="size-[58%]" />
                    {/if}
                </button>
                <div class="flex flex-col min-w-0">
                    <span
                        class="text-[clamp(1rem,8cqmin,2rem)] text-m3-on-surface font-bold leading-none"
                    >
                        {formatTemperature(currentTemp)}
                    </span>
                    <span
                        class="text-[clamp(0.7rem,3.5cqmin,1rem)] text-m3-on-surface-variant truncate leading-tight"
                    >
                        {displayName}
                    </span>
                </div>
            </div>

            <!-- Controls -->
            <div class="flex items-center gap-[clamp(0.25rem,2cqmin,0.75rem)] shrink-0">
                <!-- Mini Stepper -->
                <div
                    class="flex items-center bg-m3-surface-container-high rounded-full p-[clamp(0.125rem,1cqmin,0.375rem)] border border-m3-outline/10"
                >
                    <button
                        class="size-[clamp(1.75rem,8cqmin,2.5rem)] flex items-center justify-center rounded-full hover:bg-m3-on-surface/10 text-m3-on-surface-variant text-[clamp(1rem,5cqmin,1.5rem)]"
                        onclick={decrementTemp}
                        aria-label="Decrease temperature"
                    >
                        −
                    </button>
                    <span
                        class="text-[clamp(0.875rem,4cqmin,1.125rem)] text-m3-on-surface font-bold min-w-[clamp(2.25rem,10cqmin,3.25rem)] text-center"
                    >
                        {targetTemp !== null ? targetTemp.toFixed(1) : "--"}
                    </span>
                    <button
                        class="size-[clamp(1.75rem,8cqmin,2.5rem)] flex items-center justify-center rounded-full hover:bg-m3-on-surface/10 text-m3-on-surface-variant text-[clamp(1rem,5cqmin,1.5rem)]"
                        onclick={incrementTemp}
                        aria-label="Increase temperature"
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
            <div class="flex justify-between items-start px-[clamp(0.75rem,4cqmin,1.5rem)] pt-[clamp(0.75rem,4cqmin,1.5rem)] pb-[clamp(0.375rem,2.5cqmin,1rem)] gap-[clamp(0.5rem,3cqmin,1.25rem)]">
                <!-- Inside Temperature -->
                <div class="flex items-center gap-[clamp(0.375rem,3cqmin,1rem)] min-w-0">
                    <div
                        class="flex items-center justify-center size-[clamp(2.5rem,22cqmin,4.75rem)] rounded-full shrink-0"
                        style:background-color={color
                            ? `color-mix(in srgb, ${color} 10%, transparent)`
                            : "var(--color-m3-secondary-container)"}
                        style:color={color || "var(--color-m3-secondary)"}
                    >
                        <HvacIconComponent class="size-[58%]" />
                    </div>
                    <div class="flex flex-col">
                        <span
                            class="text-[clamp(1.2rem,6cqmin,3rem)] text-m3-on-surface font-medium"
                        >
                            {formatTemperature(currentTemp)}
                        </span>
                        <span
                            class="text-[clamp(0.8rem,3cqmin,1.2rem)] text-m3-on-surface-variant"
                        >
                            {displayName}
                        </span>
                    </div>
                </div>

                <!-- Outside Temperature -->
                {#if secondaryEntityId && outsideTemp !== null}
                    <div class="flex items-center gap-[clamp(0.375rem,3cqmin,1rem)] min-w-0">
                        <div class="text-m3-primary">
                            <IconCloud class="size-[clamp(1rem,5cqmin,1.75rem)]" />
                        </div>
                        <div class="flex flex-col items-end">
                            <span
                                class="text-[clamp(0.875rem,4cqmin,1.25rem)] text-m3-on-surface font-medium"
                            >
                                {formatTemperature(outsideTemp)}
                            </span>
                            <span
                                class="text-[clamp(0.625rem,2.8cqmin,0.8125rem)] text-m3-on-surface-variant truncate"
                            >
                                {secondaryDisplayName}
                            </span>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- History Graph (Only in Expanded Mode) -->
            {#if isExpanded}
                <div class="w-full flex-1 min-h-[clamp(5rem,24cqmin,9rem)] relative">
                    <HistoryGraph
                        insideData={insideHistory?.points || []}
                        outsideData={outsideHistory?.points || []}
                        insideColor={color}
                    />
                </div>
            {/if}

            <!-- Control Footer -->
            <div
                class="flex items-center justify-between px-[clamp(0.625rem,3.5cqmin,1.25rem)] py-[clamp(0.625rem,3.5cqmin,1.25rem)] border-t border-m3-outline-variant/30 mt-auto gap-[clamp(0.375rem,3cqmin,1rem)]"
            >
                <!-- Temperature Stepper -->
                <div
                    class="flex items-center gap-[clamp(0.25rem,2cqmin,0.75rem)] bg-m3-surface-container-high rounded-full px-[clamp(0.375rem,2.5cqmin,0.875rem)] py-[clamp(0.25rem,1.6cqmin,0.625rem)]"
                >
                    <button
                        class="size-[clamp(1.75rem,8cqmin,2.5rem)] flex items-center justify-center rounded-full text-m3-on-surface-variant hover:bg-m3-on-surface/10 transition-colors"
                        onclick={decrementTemp}
                        aria-label="Decrease temperature"
                    >
                        <span class="text-xl font-medium">−</span>
                    </button>
                    <span
                        class="text-[clamp(1rem,5cqmin,1.375rem)] font-bold text-m3-on-surface min-w-[clamp(3rem,12cqmin,4.5rem)] text-center"
                    >
                        {targetTemp !== null ? targetTemp.toFixed(1) : "--"}
                    </span>
                    <button
                        class="size-[clamp(1.75rem,8cqmin,2.5rem)] flex items-center justify-center rounded-full text-m3-on-surface-variant hover:bg-m3-on-surface/10 transition-colors"
                        onclick={incrementTemp}
                        aria-label="Increase temperature"
                    >
                        <span class="text-xl font-medium">+</span>
                    </button>
                </div>

                <!-- Mode Controls -->
                <div class="flex items-center gap-[clamp(0.25rem,2cqmin,0.75rem)]">
                    <!-- HVAC Mode Button -->
                    <button
                        class="size-[clamp(2.25rem,10cqmin,3.75rem)] flex items-center justify-center rounded-full transition-colors"
                        style:background-color={isActive
                            ? color
                                ? `color-mix(in srgb, ${color} 10%, transparent)`
                                : "var(--color-m3-primary-container)"
                            : "var(--color-m3-surface-container-high)"}
                        style:color={isActive
                            ? color || "var(--color-m3-on-primary-container)"
                            : "var(--color-m3-on-surface-variant)"}
                        onclick={cycleMode}
                        aria-label="Toggle heating mode"
                    >
                        {#if iconOverride}
                            <DynamicIcon name={iconOverride} class="size-[58%]" />
                        {:else}
                            <IconFire class="size-[58%]" />
                        {/if}
                    </button>

                    <!-- Power Button -->
                    <button
                        class="size-[clamp(2.25rem,10cqmin,3.75rem)] flex items-center justify-center rounded-full bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-on-surface/10 transition-colors"
                        onclick={togglePower}
                        aria-label="Toggle power"
                    >
                        <IconPower class="size-[58%]" />
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Edit FAB (Visible on Hover) -->
    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity hover:brightness-110 z-20"
        onclick={openConfig}
        title="Edit Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</div>
