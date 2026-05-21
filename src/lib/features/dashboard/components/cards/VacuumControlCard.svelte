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
    import type { VacuumCardOptions } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import { formatEntityStateLabel } from "$lib/utils/entity";
    import IconEdit from "~icons/material-symbols/edit";

    type VacuumTone = "empty" | "active" | "paused" | "clear" | "issue" | "offline";
    type VacuumAction = "start" | "pause" | "dock" | "stop";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: VacuumCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("cleaning_services"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ source: "auto", showGroupControls: true, showBattery: true, showFanSpeed: true, maxItems: 4 }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let smartOptions = $derived(inventoryStore.smartVacuumOptions(options, entityId));
    let maxItems = $derived(Math.max(1, smartOptions.maxItems ?? 4));
    let title = $derived(name || themeStore.t("vacuumCard.defaultTitle"));
    let vacuumEntities = $derived(inventoryStore.getEntities(smartOptions.entityIds ?? []));
    let allEntityIds = $derived(vacuumEntities.map((entity) => entity.entityId));
    let activeCount = $derived(vacuumEntities.filter(isActive).length);
    let dockedCount = $derived(vacuumEntities.filter(isDocked).length);
    let pausedCount = $derived(vacuumEntities.filter(isPaused).length);
    let issueCount = $derived(vacuumEntities.filter(isIssue).length);
    let offlineCount = $derived(vacuumEntities.filter(isOffline).length);
    let tone = $derived<VacuumTone>(
        vacuumEntities.length === 0
            ? "empty"
            : issueCount > 0
              ? "issue"
              : activeCount > 0
                ? "active"
                : pausedCount > 0
                  ? "paused"
                  : offlineCount > 0
                    ? "offline"
                    : "clear",
    );
    let accentColor = $derived(color || toneColor(tone));
    let statusLabel = $derived(themeStore.t(`vacuumCard.status.${tone}`));
    let detailSourceLabel = $derived(
        themeStore.t("vacuumCard.summary", {
            active: activeCount,
            docked: dockedCount,
        }),
    );
    let sortedVacuums = $derived.by(() =>
        [...vacuumEntities].sort((a, b) => {
            const scoreDelta = vacuumPriority(b) - vacuumPriority(a);
            if (scoreDelta !== 0) return scoreDelta;
            return a.name.localeCompare(b.name);
        }),
    );
    let visibleVacuums = $derived(sortedVacuums.slice(0, maxItems));
    let remainingCount = $derived(Math.max(0, vacuumEntities.length - visibleVacuums.length));
    let controllableVacuums = $derived(vacuumEntities.filter((entity) => !isOffline(entity)));

    function isActive(entity: ResolvedEntity) {
        return ["cleaning", "returning"].includes(entity.state);
    }

    function isDocked(entity: ResolvedEntity) {
        return ["docked", "idle"].includes(entity.state);
    }

    function isPaused(entity: ResolvedEntity) {
        return entity.state === "paused";
    }

    function isIssue(entity: ResolvedEntity) {
        const error = liveAttributes(entity).error;
        return entity.state === "error" || (typeof error === "string" && error.trim().length > 0);
    }

    function isOffline(entity: ResolvedEntity) {
        return ["unavailable", "unknown"].includes(entity.state);
    }

    function vacuumPriority(entity: ResolvedEntity) {
        if (isIssue(entity)) return 6;
        if (isActive(entity)) return 5;
        if (isPaused(entity)) return 4;
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
        const details: string[] = [];
        const error = textAttribute(entity, ["error"]);
        const battery = smartOptions.showBattery === false ? undefined : numberAttribute(entity, ["battery_level"]);
        const fanSpeed = smartOptions.showFanSpeed === false ? undefined : textAttribute(entity, ["fan_speed", "preset_mode"]);
        if (error) details.push(error);
        if (typeof battery === "number") details.push(`${battery}%`);
        if (fanSpeed) details.push(fanSpeed);
        return details.length > 0 ? `${formatState(entity)} - ${details.join(" - ")}` : formatState(entity);
    }

    function rowIcon(entity: ResolvedEntity) {
        if (isIssue(entity)) return "warning";
        if (isOffline(entity)) return "error";
        if (entity.state === "returning" || isDocked(entity)) return "home";
        if (isPaused(entity)) return "pause";
        return "cleaning_services";
    }

    function toneColor(value: VacuumTone) {
        if (value === "active") return "var(--color-m3-primary)";
        if (value === "paused") return "var(--color-m3-secondary)";
        if (value === "issue" || value === "offline") return "var(--color-m3-error)";
        if (value === "clear") return "var(--color-m3-tertiary)";
        return "var(--color-m3-outline)";
    }

    function actionFor(entity: ResolvedEntity): VacuumAction | undefined {
        if (isOffline(entity)) return undefined;
        if (entity.state === "returning") return "stop";
        if (isActive(entity)) return "pause";
        if (isIssue(entity)) return "dock";
        return "start";
    }

    function serviceFor(action: VacuumAction) {
        if (action === "dock") return "return_to_base";
        return action;
    }

    function actionLabel(action: VacuumAction) {
        return themeStore.t(`vacuumCard.controls.${action}`);
    }

    function callVacuum(entityId: string, action: VacuumAction, e: Event) {
        e.stopPropagation();
        haStore.callService("vacuum", serviceFor(action), { entity_id: entityId });
    }

    function callAll(action: VacuumAction, e: Event) {
        e.stopPropagation();
        for (const entity of controllableVacuums) {
            haStore.callService("vacuum", serviceFor(action), { entity_id: entity.entityId });
        }
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "vacuum",
            options: { vacuum: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "cleaning_services";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { vacuum?: VacuumCardOptions })?.vacuum ?? options;
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
    data-testid="vacuum-card"
    class="relative h-full w-full overflow-hidden rounded-m3-card text-m3-on-surface group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
    aria-label={title}
>
    <div class="vacuum-card">
        <header class="vacuum-card__header">
            <div
                class="vacuum-card__icon"
                style:background-color={`color-mix(in srgb, ${accentColor} 18%, transparent)`}
                style:color={accentColor}
            >
                <DynamicIcon name={icon || "cleaning_services"} class="size-[58%]" />
            </div>
            <div class="min-w-0 flex-1">
                <h3 class="vacuum-card__title">{title}</h3>
                <p class="vacuum-card__status" style:color={accentColor}>{statusLabel}</p>
            </div>
            <div class="vacuum-card__badge" style:color={accentColor}>
                {vacuumEntities.length}
            </div>
        </header>

        <div class="vacuum-card__metrics">
            <span>{themeStore.t("vacuumCard.metric.active", { count: activeCount })}</span>
            <span>{themeStore.t("vacuumCard.metric.docked", { count: dockedCount })}</span>
            <span>{themeStore.t("vacuumCard.metric.issue", { count: issueCount + offlineCount })}</span>
        </div>

        {#if smartOptions.showGroupControls !== false && controllableVacuums.length > 0}
            <div class="vacuum-card__controls">
                <button type="button" onclick={(e) => callAll("start", e)}>
                    <DynamicIcon name="play_arrow" class="size-4" />
                    <span>{themeStore.t("vacuumCard.controls.start")}</span>
                </button>
                <button type="button" onclick={(e) => callAll("pause", e)}>
                    <DynamicIcon name="pause" class="size-4" />
                    <span>{themeStore.t("vacuumCard.controls.pause")}</span>
                </button>
                <button type="button" onclick={(e) => callAll("dock", e)}>
                    <DynamicIcon name="home" class="size-4" />
                    <span>{themeStore.t("vacuumCard.controls.dock")}</span>
                </button>
            </div>
        {/if}

        <div class="vacuum-card__rows">
            {#if visibleVacuums.length > 0}
                {#each visibleVacuums as vacuum (vacuum.entityId)}
                    {@const action = actionFor(vacuum)}
                    <div
                        class="vacuum-card__row"
                        class:vacuum-card__row--active={isActive(vacuum)}
                        class:vacuum-card__row--paused={isPaused(vacuum)}
                        class:vacuum-card__row--issue={isIssue(vacuum) || isOffline(vacuum)}
                    >
                        <button type="button" class="vacuum-card__row-main" onclick={(e) => openDetails(vacuum, e)}>
                            <DynamicIcon name={rowIcon(vacuum)} class="size-5 shrink-0" />
                            <span class="vacuum-card__row-body">
                                <span class="vacuum-card__row-title">{vacuum.name}</span>
                                <span class="vacuum-card__row-subtitle">{formatDetail(vacuum)}</span>
                            </span>
                        </button>
                        {#if action}
                            <button
                                type="button"
                                class="vacuum-card__row-action"
                                onclick={(e) => callVacuum(vacuum.entityId, action, e)}
                            >
                                {actionLabel(action)}
                            </button>
                        {/if}
                    </div>
                {/each}
                {#if remainingCount > 0}
                    <p class="vacuum-card__more">
                        {themeStore.t("vacuumCard.moreItems", { count: remainingCount })}
                    </p>
                {/if}
            {:else}
                <div class="vacuum-card__empty">
                    <DynamicIcon name="cleaning_services" class="size-7" />
                    <span>{themeStore.t("vacuumCard.noEntities")}</span>
                </div>
            {/if}
        </div>
    </div>

    <button
        class="touch-edit-control absolute right-[clamp(0.25rem,2cqmin,0.75rem)] top-[clamp(0.25rem,2cqmin,0.75rem)] z-30 rounded-full bg-m3-primary-container p-[clamp(0.25rem,1.7cqmin,0.5rem)] text-m3-on-primary-container opacity-0 shadow-sm transition-opacity hover:brightness-110 group-hover/card:opacity-100"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title={themeStore.t("vacuumCard.editTitle")}
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>

    <EntityDetailButton
        entityIds={allEntityIds}
        selectedEntityId={visibleVacuums[0]?.entityId}
        {title}
        sourceLabel={detailSourceLabel}
    />
</article>

<style>
    .vacuum-card {
        display: flex;
        height: 100%;
        min-height: 0;
        flex-direction: column;
        gap: clamp(0.45rem, 2.5cqmin, 0.8rem);
        padding: clamp(0.625rem, 4cqmin, 1.25rem);
    }

    .vacuum-card__header {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: clamp(0.5rem, 3cqmin, 1rem);
        padding-right: clamp(2rem, 7cqi, 3rem);
    }

    .vacuum-card__icon {
        display: flex;
        width: clamp(2.4rem, 18cqmin, 4rem);
        height: clamp(2.4rem, 18cqmin, 4rem);
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
    }

    .vacuum-card__title,
    .vacuum-card__status,
    .vacuum-card__row-title,
    .vacuum-card__row-subtitle {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .vacuum-card__title {
        font-size: clamp(0.95rem, max(5.4cqb, 1.8cqi), 1.3rem);
        font-weight: 800;
        line-height: 1.1;
    }

    .vacuum-card__status {
        font-size: clamp(0.75rem, 3.4cqmin, 0.9rem);
        font-weight: 700;
    }

    .vacuum-card__badge {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-surface-container-high);
        padding: 0.25rem 0.55rem;
        font-size: clamp(0.75rem, 3cqmin, 0.9rem);
        font-weight: 800;
    }

    .vacuum-card__metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .vacuum-card__metrics span,
    .vacuum-card__more {
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

    .vacuum-card__controls {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.4rem;
    }

    .vacuum-card__controls button {
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

    .vacuum-card__controls button:hover {
        filter: brightness(1.06);
    }

    .vacuum-card__controls span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .vacuum-card__rows {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .vacuum-card__row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.45rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container-high);
        padding: clamp(0.3rem, 1.4cqmin, 0.45rem);
    }

    .vacuum-card__row--active {
        background: color-mix(in srgb, var(--color-m3-primary) 14%, var(--color-m3-surface-container-high));
    }

    .vacuum-card__row--paused {
        background: color-mix(in srgb, var(--color-m3-secondary) 13%, var(--color-m3-surface-container-high));
    }

    .vacuum-card__row--issue {
        background: color-mix(in srgb, var(--color-m3-error) 14%, var(--color-m3-surface-container-high));
    }

    .vacuum-card__row-main {
        display: flex;
        min-width: 0;
        flex: 1;
        align-items: center;
        gap: 0.55rem;
        text-align: left;
        color: var(--color-m3-on-surface);
    }

    .vacuum-card__row-body {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 0.05rem;
    }

    .vacuum-card__row-title {
        font-size: clamp(0.75rem, 3.1cqmin, 0.9rem);
        font-weight: 800;
    }

    .vacuum-card__row-subtitle {
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.625rem, 2.6cqmin, 0.78rem);
    }

    .vacuum-card__row-action {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-secondary-container);
        padding: 0.35rem 0.65rem;
        color: var(--color-m3-on-secondary-container);
        font-size: clamp(0.625rem, 2.4cqmin, 0.78rem);
        font-weight: 800;
    }

    .vacuum-card__more {
        margin-top: auto;
        text-align: left;
    }

    .vacuum-card__empty {
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
        .vacuum-card__metrics {
            display: none;
        }
    }

    @container (max-height: 235px) {
        .vacuum-card__controls {
            display: none;
        }
    }
</style>
