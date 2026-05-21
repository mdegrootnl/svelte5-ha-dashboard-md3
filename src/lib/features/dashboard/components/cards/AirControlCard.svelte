<script lang="ts">
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import EntityDetailButton from "$lib/features/dashboard/components/EntityDetailButton.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import { entityDetailStore } from "$lib/features/dashboard/stores/entityDetail.svelte";
    import {
        getCardSurfaceClasses,
        getCardSurfaceStyle,
    } from "$lib/features/dashboard/utils/cardSurface";
    import { haStore } from "$lib/stores/ha.svelte";
    import { inventoryStore } from "$lib/stores/inventory.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import type { ResolvedEntity } from "$lib/domain/haInventory";
    import type { AirCardOptions } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import { formatEntityStateLabel } from "$lib/utils/entity";
    import IconEdit from "~icons/material-symbols/edit";

    type AirTone = "empty" | "active" | "clear" | "offline";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: AirCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("mode_fan"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ source: "auto", showPowerControls: true, showSpeed: true, showHumidity: true, maxItems: 5 }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let smartOptions = $derived(inventoryStore.smartAirOptions(options, entityId));
    let maxItems = $derived(Math.max(1, smartOptions.maxItems ?? 5));
    let title = $derived(name || themeStore.t("airCard.defaultTitle"));
    let airEntities = $derived(inventoryStore.getEntities(smartOptions.entityIds ?? []));
    let allEntityIds = $derived(airEntities.map((entity) => entity.entityId));
    let activeCount = $derived(airEntities.filter(isActive).length);
    let offCount = $derived(airEntities.filter(isOff).length);
    let offlineCount = $derived(airEntities.filter(isOffline).length);
    let tone = $derived<AirTone>(
        airEntities.length === 0
            ? "empty"
            : activeCount > 0
              ? "active"
              : offlineCount > 0
                ? "offline"
                : "clear",
    );
    let accentColor = $derived(color || toneColor(tone));
    let statusLabel = $derived(themeStore.t(`airCard.status.${tone}`));
    let detailSourceLabel = $derived(
        themeStore.t("airCard.summary", {
            active: activeCount,
            off: offCount,
        }),
    );
    let sortedAir = $derived.by(() =>
        [...airEntities].sort((a, b) => {
            const scoreDelta = airPriority(b) - airPriority(a);
            if (scoreDelta !== 0) return scoreDelta;
            return a.name.localeCompare(b.name);
        }),
    );
    let visibleAir = $derived(sortedAir.slice(0, maxItems));
    let remainingCount = $derived(Math.max(0, airEntities.length - visibleAir.length));
    let controllableAir = $derived(airEntities.filter((entity) => !isOffline(entity)));
    let boostableAir = $derived(controllableAir.filter((entity) => entity.domain === "fan"));

    function isActive(entity: ResolvedEntity) {
        return ["on", "auto", "cooling", "heating", "humidifying", "drying"].includes(entity.state);
    }

    function isOff(entity: ResolvedEntity) {
        return entity.state === "off";
    }

    function isOffline(entity: ResolvedEntity) {
        return ["unavailable", "unknown"].includes(entity.state);
    }

    function airPriority(entity: ResolvedEntity) {
        if (isActive(entity)) return 4;
        if (isOffline(entity)) return 3;
        return 1;
    }

    function liveAttributes(entity: ResolvedEntity) {
        return haStore.getEntity(entity.entityId)?.attributes ?? {};
    }

    function numberAttribute(entity: ResolvedEntity, keys: string[]) {
        const attributes = liveAttributes(entity);
        for (const key of keys) {
            const value = attributes[key];
            if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
        }
        return undefined;
    }

    function textAttribute(entity: ResolvedEntity, keys: string[]) {
        const attributes = liveAttributes(entity);
        for (const key of keys) {
            const value = attributes[key];
            if (typeof value === "string" && value.trim()) return value;
        }
        return undefined;
    }

    function formatState(entity: ResolvedEntity) {
        return formatEntityStateLabel(entity.state, {
            entityId: entity.entityId,
            domain: entity.domain,
            deviceClass: entity.deviceClass,
            unit: entity.unit,
            language: themeStore.language,
        });
    }

    function formatDetail(entity: ResolvedEntity) {
        const state = formatState(entity);
        const details: string[] = [];
        if (entity.domain === "fan" && smartOptions.showSpeed !== false) {
            const percentage = numberAttribute(entity, ["percentage"]);
            const preset = textAttribute(entity, ["preset_mode"]);
            if (typeof percentage === "number") details.push(`${percentage}%`);
            if (preset) details.push(preset);
        }
        if (entity.domain === "humidifier" && smartOptions.showHumidity !== false) {
            const current = numberAttribute(entity, ["current_humidity"]);
            const target = numberAttribute(entity, ["humidity", "target_humidity"]);
            if (typeof current === "number" && typeof target === "number") {
                details.push(`${current}% / ${target}%`);
            } else if (typeof current === "number") {
                details.push(`${current}%`);
            } else if (typeof target === "number") {
                details.push(themeStore.t("airCard.targetHumidity", { value: target }));
            }
        }
        return details.length > 0 ? `${state} - ${details.join(" - ")}` : state;
    }

    function rowIcon(entity: ResolvedEntity) {
        if (isOffline(entity)) return "error";
        if (entity.domain === "humidifier") return "humidity_high";
        return "mode_fan";
    }

    function toneColor(value: AirTone) {
        if (value === "active") return "var(--color-m3-tertiary)";
        if (value === "clear") return "var(--color-m3-primary)";
        if (value === "offline") return "var(--color-m3-error)";
        return "var(--color-m3-outline)";
    }

    function actionLabel(entity: ResolvedEntity) {
        return isActive(entity)
            ? themeStore.t("airCard.controls.turnOff")
            : themeStore.t("airCard.controls.turnOn");
    }

    function callPower(entity: ResolvedEntity, turnOn: boolean, e: Event) {
        e.stopPropagation();
        haStore.callService(entity.domain, turnOn ? "turn_on" : "turn_off", { entity_id: entity.entityId });
    }

    function callAll(turnOn: boolean, e: Event) {
        e.stopPropagation();
        for (const entity of controllableAir) {
            haStore.callService(entity.domain, turnOn ? "turn_on" : "turn_off", { entity_id: entity.entityId });
        }
    }

    function boostAll(e: Event) {
        e.stopPropagation();
        for (const entity of boostableAir) {
            haStore.callService("fan", "set_percentage", {
                entity_id: entity.entityId,
                percentage: 100,
            });
        }
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "air",
            options: { air: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "mode_fan";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { air?: AirCardOptions })?.air ?? options;
            },
            onDelete: ondelete,
        });
    }

    function openDetails(entity: ResolvedEntity, e: Event) {
        if (dashboardEditorStore.isEditing) return;
        e.stopPropagation();
        entityDetailStore.openEntities({
            title,
            sourceLabel: detailSourceLabel,
            entityIds: allEntityIds,
            selectedEntityId: entity.entityId,
        });
    }
</script>

<article
    data-testid="air-card"
    class="relative h-full w-full overflow-hidden rounded-m3-card text-m3-on-surface group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
    aria-label={title}
>
    <div class="air-card">
        <header class="air-card__header">
            <div
                class="air-card__icon"
                style:background-color={`color-mix(in srgb, ${accentColor} 18%, transparent)`}
                style:color={accentColor}
            >
                <DynamicIcon name={icon || "mode_fan"} class="size-[58%]" />
            </div>
            <div class="min-w-0 flex-1">
                <h3 class="air-card__title">{title}</h3>
                <p class="air-card__status" style:color={accentColor}>{statusLabel}</p>
            </div>
            <div class="air-card__badge" style:color={accentColor}>
                {airEntities.length}
            </div>
        </header>

        <div class="air-card__metrics">
            <span>{themeStore.t("airCard.metric.active", { count: activeCount })}</span>
            <span>{themeStore.t("airCard.metric.off", { count: offCount })}</span>
            <span>{themeStore.t("airCard.metric.offline", { count: offlineCount })}</span>
        </div>

        {#if smartOptions.showPowerControls !== false && controllableAir.length > 0}
            <div class="air-card__controls">
                <button type="button" onclick={(e) => callAll(true, e)}>
                    <DynamicIcon name="power_settings_new" class="size-4" />
                    <span>{themeStore.t("airCard.controls.turnOn")}</span>
                </button>
                <button type="button" onclick={(e) => callAll(false, e)}>
                    <DynamicIcon name="power_off" class="size-4" />
                    <span>{themeStore.t("airCard.controls.turnOff")}</span>
                </button>
                {#if boostableAir.length > 0}
                    <button type="button" onclick={boostAll}>
                        <DynamicIcon name="airwave" class="size-4" />
                        <span>{themeStore.t("airCard.controls.boost")}</span>
                    </button>
                {/if}
            </div>
        {/if}

        <div class="air-card__rows">
            {#if visibleAir.length > 0}
                {#each visibleAir as air (air.entityId)}
                    <div
                        class="air-card__row"
                        class:air-card__row--active={isActive(air)}
                        class:air-card__row--offline={isOffline(air)}
                    >
                        <button type="button" class="air-card__row-main" onclick={(e) => openDetails(air, e)}>
                            <DynamicIcon name={rowIcon(air)} class="size-5 shrink-0" />
                            <span class="air-card__row-body">
                                <span class="air-card__row-title">{air.name}</span>
                                <span class="air-card__row-subtitle">{formatDetail(air)}</span>
                            </span>
                        </button>
                        {#if !isOffline(air)}
                            <button
                                type="button"
                                class="air-card__row-action"
                                onclick={(e) => callPower(air, !isActive(air), e)}
                            >
                                {actionLabel(air)}
                            </button>
                        {/if}
                    </div>
                {/each}
                {#if remainingCount > 0}
                    <p class="air-card__more">
                        {themeStore.t("airCard.moreItems", { count: remainingCount })}
                    </p>
                {/if}
            {:else}
                <div class="air-card__empty">
                    <DynamicIcon name="mode_fan" class="size-7" />
                    <span>{themeStore.t("airCard.noEntities")}</span>
                </div>
            {/if}
        </div>
    </div>

    <button
        class="touch-edit-control absolute right-[clamp(0.25rem,2cqmin,0.75rem)] top-[clamp(0.25rem,2cqmin,0.75rem)] z-30 rounded-full bg-m3-primary-container p-[clamp(0.25rem,1.7cqmin,0.5rem)] text-m3-on-primary-container opacity-0 shadow-sm transition-opacity hover:brightness-110 group-hover/card:opacity-100"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title={themeStore.t("airCard.editTitle")}
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>

    <EntityDetailButton
        entityIds={allEntityIds}
        selectedEntityId={visibleAir[0]?.entityId}
        {title}
        sourceLabel={detailSourceLabel}
    />
</article>

<style>
    .air-card {
        display: flex;
        height: 100%;
        min-height: 0;
        flex-direction: column;
        gap: clamp(0.45rem, 2.5cqmin, 0.8rem);
        padding: clamp(0.625rem, 4cqmin, 1.25rem);
    }

    .air-card__header {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: clamp(0.5rem, 3cqmin, 1rem);
        padding-right: clamp(2rem, 7cqi, 3rem);
    }

    .air-card__icon {
        display: flex;
        width: clamp(2.4rem, 18cqmin, 4rem);
        height: clamp(2.4rem, 18cqmin, 4rem);
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
    }

    .air-card__title,
    .air-card__status,
    .air-card__row-title,
    .air-card__row-subtitle {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .air-card__title {
        font-size: clamp(0.95rem, max(5.4cqb, 1.8cqi), 1.3rem);
        font-weight: 800;
        line-height: 1.1;
    }

    .air-card__status {
        font-size: clamp(0.75rem, 3.4cqmin, 0.9rem);
        font-weight: 700;
    }

    .air-card__badge {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-surface-container-high);
        padding: 0.25rem 0.55rem;
        font-size: clamp(0.75rem, 3cqmin, 0.9rem);
        font-weight: 800;
    }

    .air-card__metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .air-card__metrics span,
    .air-card__more {
        min-width: 0;
        overflow: hidden;
        border-radius: 999px;
        background: var(--color-m3-surface-container-high);
        padding: 0.35rem 0.55rem;
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.625rem, 2.6cqmin, 0.8125rem);
        font-weight: 700;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .air-card__controls {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.4rem;
    }

    .air-card__controls button {
        display: flex;
        min-width: 0;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-primary);
        padding: 0.5rem 0.45rem;
        color: var(--color-m3-on-primary);
        font-size: clamp(0.62rem, 2.5cqmin, 0.82rem);
        font-weight: 800;
        transition: filter 140ms ease;
    }

    .air-card__controls button:hover {
        filter: brightness(1.06);
    }

    .air-card__controls span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .air-card__rows {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .air-card__row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.45rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container-high);
        padding: clamp(0.3rem, 1.4cqmin, 0.45rem);
    }

    .air-card__row--active {
        background: color-mix(in srgb, var(--color-m3-tertiary) 15%, var(--color-m3-surface-container-high));
    }

    .air-card__row--offline {
        background: color-mix(in srgb, var(--color-m3-error) 14%, var(--color-m3-surface-container-high));
    }

    .air-card__row-main {
        display: flex;
        min-width: 0;
        flex: 1;
        align-items: center;
        gap: 0.55rem;
        text-align: left;
        color: var(--color-m3-on-surface);
    }

    .air-card__row-body {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 0.05rem;
    }

    .air-card__row-title {
        font-size: clamp(0.75rem, 3.1cqmin, 0.9rem);
        font-weight: 800;
    }

    .air-card__row-subtitle {
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.625rem, 2.6cqmin, 0.78rem);
    }

    .air-card__row-action {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-secondary-container);
        padding: 0.35rem 0.65rem;
        color: var(--color-m3-on-secondary-container);
        font-size: clamp(0.625rem, 2.4cqmin, 0.78rem);
        font-weight: 800;
    }

    .air-card__more {
        margin-top: auto;
        text-align: left;
    }

    .air-card__empty {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        color: var(--color-m3-on-surface-variant);
        text-align: center;
        font-size: clamp(0.75rem, 3cqmin, 0.9rem);
        font-weight: 700;
    }

    @container (max-height: 175px) {
        .air-card__metrics {
            display: none;
        }
    }

    @container (max-height: 235px) {
        .air-card__controls {
            display: none;
        }
    }
</style>
