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
    import type { CoverCardOptions } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import { formatEntityStateLabel } from "$lib/utils/entity";
    import IconEdit from "~icons/material-symbols/edit";

    type CoverTone = "empty" | "warning" | "busy" | "clear" | "offline";
    type CoverAction = "open" | "stop" | "close";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: CoverCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("blinds"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ source: "auto", showGroupControls: true, showPosition: true, maxItems: 5 }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let smartOptions = $derived(inventoryStore.smartCoverOptions(options, entityId));
    let maxItems = $derived(Math.max(1, smartOptions.maxItems ?? 5));
    let title = $derived(name || themeStore.t("coverCard.defaultTitle"));
    let coverEntities = $derived(inventoryStore.getEntities(smartOptions.entityIds ?? []));
    let allEntityIds = $derived(coverEntities.map((entity) => entity.entityId));
    let openCount = $derived(coverEntities.filter(isOpen).length);
    let closedCount = $derived(coverEntities.filter(isClosed).length);
    let movingCount = $derived(coverEntities.filter(isMoving).length);
    let offlineCount = $derived(coverEntities.filter(isOffline).length);
    let tone = $derived<CoverTone>(
        coverEntities.length === 0
            ? "empty"
            : movingCount > 0
              ? "busy"
              : openCount > 0
                ? "warning"
                : offlineCount > 0
                  ? "offline"
                  : "clear",
    );
    let accentColor = $derived(color || toneColor(tone));
    let statusLabel = $derived(themeStore.t(`coverCard.status.${tone}`));
    let detailSourceLabel = $derived(
        themeStore.t("coverCard.summary", {
            open: openCount,
            closed: closedCount,
        }),
    );
    let sortedCovers = $derived.by(() =>
        [...coverEntities].sort((a, b) => {
            const scoreDelta = coverPriority(b) - coverPriority(a);
            if (scoreDelta !== 0) return scoreDelta;
            return a.name.localeCompare(b.name);
        }),
    );
    let visibleCovers = $derived(sortedCovers.slice(0, maxItems));
    let remainingCount = $derived(Math.max(0, coverEntities.length - visibleCovers.length));
    let controllableCovers = $derived(coverEntities.filter((entity) => !isOffline(entity)));

    function isOpen(entity: ResolvedEntity) {
        return ["open", "opening"].includes(entity.state);
    }

    function isClosed(entity: ResolvedEntity) {
        return entity.state === "closed";
    }

    function isMoving(entity: ResolvedEntity) {
        return ["opening", "closing"].includes(entity.state);
    }

    function isOffline(entity: ResolvedEntity) {
        return ["unavailable", "unknown"].includes(entity.state);
    }

    function coverPriority(entity: ResolvedEntity) {
        if (isMoving(entity)) return 5;
        if (isOpen(entity)) return 4;
        if (isOffline(entity)) return 3;
        return 1;
    }

    function currentPosition(entity: ResolvedEntity) {
        const value = haStore.getEntity(entity.entityId)?.attributes?.current_position;
        return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined;
    }

    function formatState(entity: ResolvedEntity) {
        const state = formatEntityStateLabel(entity.state, {
            entityId: entity.entityId,
            domain: entity.domain,
            deviceClass: entity.deviceClass,
            unit: entity.unit,
            language: themeStore.language,
        });
        const position = smartOptions.showPosition === false ? undefined : currentPosition(entity);
        return typeof position === "number" ? `${state} - ${position}%` : state;
    }

    function rowIcon(entity: ResolvedEntity) {
        if (isMoving(entity)) return "sync";
        if (isOpen(entity)) return "blinds";
        if (isOffline(entity)) return "error";
        return "blinds_closed";
    }

    function toneColor(value: CoverTone) {
        if (value === "warning") return "var(--color-m3-tertiary)";
        if (value === "busy") return "var(--color-m3-primary)";
        if (value === "clear") return "var(--color-m3-primary)";
        if (value === "offline") return "var(--color-m3-error)";
        return "var(--color-m3-outline)";
    }

    function actionFor(entity: ResolvedEntity): CoverAction | undefined {
        if (isOffline(entity)) return undefined;
        if (isMoving(entity)) return "stop";
        if (isClosed(entity)) return "open";
        return "close";
    }

    function serviceFor(action: CoverAction) {
        if (action === "open") return "open_cover";
        if (action === "stop") return "stop_cover";
        return "close_cover";
    }

    function callCover(entityId: string, action: CoverAction, e: Event) {
        e.stopPropagation();
        haStore.callService("cover", serviceFor(action), { entity_id: entityId });
    }

    function callAll(action: CoverAction, e: Event) {
        e.stopPropagation();
        for (const entity of controllableCovers) {
            haStore.callService("cover", serviceFor(action), { entity_id: entity.entityId });
        }
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "cover",
            options: { cover: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "blinds";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { cover?: CoverCardOptions })?.cover ?? options;
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
    data-testid="cover-card"
    class="relative h-full w-full overflow-hidden rounded-m3-card text-m3-on-surface group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
    aria-label={title}
>
    <div class="cover-card">
        <header class="cover-card__header">
            <div
                class="cover-card__icon"
                style:background-color={`color-mix(in srgb, ${accentColor} 18%, transparent)`}
                style:color={accentColor}
            >
                <DynamicIcon name={icon || "blinds"} class="size-[58%]" />
            </div>
            <div class="min-w-0 flex-1">
                <h3 class="cover-card__title">{title}</h3>
                <p class="cover-card__status" style:color={accentColor}>{statusLabel}</p>
            </div>
            <div class="cover-card__badge" style:color={accentColor}>
                {coverEntities.length}
            </div>
        </header>

        <div class="cover-card__metrics">
            <span>{themeStore.t("coverCard.metric.open", { count: openCount })}</span>
            <span>{themeStore.t("coverCard.metric.closed", { count: closedCount })}</span>
            <span>{themeStore.t("coverCard.metric.moving", { count: movingCount })}</span>
        </div>

        {#if smartOptions.showGroupControls !== false && controllableCovers.length > 0}
            <div class="cover-card__controls">
                <button type="button" onclick={(e) => callAll("open", e)}>
                    <DynamicIcon name="keyboard_arrow_up" class="size-4" />
                    <span>{themeStore.t("coverCard.controls.open")}</span>
                </button>
                <button type="button" onclick={(e) => callAll("stop", e)}>
                    <DynamicIcon name="stop" class="size-4" />
                    <span>{themeStore.t("coverCard.controls.stop")}</span>
                </button>
                <button type="button" onclick={(e) => callAll("close", e)}>
                    <DynamicIcon name="keyboard_arrow_down" class="size-4" />
                    <span>{themeStore.t("coverCard.controls.close")}</span>
                </button>
            </div>
        {/if}

        <div class="cover-card__rows">
            {#if visibleCovers.length > 0}
                {#each visibleCovers as cover (cover.entityId)}
                    {@const action = actionFor(cover)}
                    <div
                        class="cover-card__row"
                        class:cover-card__row--warning={isOpen(cover)}
                        class:cover-card__row--busy={isMoving(cover)}
                        class:cover-card__row--offline={isOffline(cover)}
                    >
                        <button type="button" class="cover-card__row-main" onclick={(e) => openDetails(cover, e)}>
                            <DynamicIcon name={rowIcon(cover)} class="size-5 shrink-0" />
                            <span class="cover-card__row-body">
                                <span class="cover-card__row-title">{cover.name}</span>
                                <span class="cover-card__row-subtitle">{formatState(cover)}</span>
                            </span>
                        </button>
                        {#if action}
                            <button
                                type="button"
                                class="cover-card__row-action"
                                onclick={(e) => callCover(cover.entityId, action, e)}
                            >
                                {themeStore.t(`coverCard.controls.${action}`)}
                            </button>
                        {/if}
                    </div>
                {/each}
                {#if remainingCount > 0}
                    <p class="cover-card__more">
                        {themeStore.t("coverCard.moreItems", { count: remainingCount })}
                    </p>
                {/if}
            {:else}
                <div class="cover-card__empty">
                    <DynamicIcon name="blinds" class="size-7" />
                    <span>{themeStore.t("coverCard.noEntities")}</span>
                </div>
            {/if}
        </div>
    </div>

    <button
        class="touch-edit-control absolute right-[clamp(0.25rem,2cqmin,0.75rem)] top-[clamp(0.25rem,2cqmin,0.75rem)] z-30 rounded-full bg-m3-primary-container p-[clamp(0.25rem,1.7cqmin,0.5rem)] text-m3-on-primary-container opacity-0 shadow-sm transition-opacity hover:brightness-110 group-hover/card:opacity-100"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title={themeStore.t("coverCard.editTitle")}
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>

    <EntityDetailButton
        entityIds={allEntityIds}
        selectedEntityId={visibleCovers[0]?.entityId}
        {title}
        sourceLabel={detailSourceLabel}
    />
</article>

<style>
    .cover-card {
        display: flex;
        height: 100%;
        min-height: 0;
        flex-direction: column;
        gap: clamp(0.45rem, 2.5cqmin, 0.8rem);
        padding: clamp(0.625rem, 4cqmin, 1.25rem);
    }

    .cover-card__header {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: clamp(0.5rem, 3cqmin, 1rem);
        padding-right: clamp(2rem, 7cqi, 3rem);
    }

    .cover-card__icon {
        display: flex;
        width: clamp(2.4rem, 18cqmin, 4rem);
        height: clamp(2.4rem, 18cqmin, 4rem);
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
    }

    .cover-card__title,
    .cover-card__status,
    .cover-card__row-title,
    .cover-card__row-subtitle {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .cover-card__title {
        font-size: clamp(0.95rem, max(5.4cqb, 1.8cqi), 1.3rem);
        font-weight: 800;
        line-height: 1.1;
    }

    .cover-card__status {
        font-size: clamp(0.75rem, 3.4cqmin, 0.9rem);
        font-weight: 700;
    }

    .cover-card__badge {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-surface-container-high);
        padding: 0.25rem 0.55rem;
        font-size: clamp(0.75rem, 3cqmin, 0.9rem);
        font-weight: 800;
    }

    .cover-card__metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .cover-card__metrics span,
    .cover-card__more {
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

    .cover-card__controls {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.4rem;
    }

    .cover-card__controls button {
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

    .cover-card__controls button:hover {
        filter: brightness(1.06);
    }

    .cover-card__controls span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .cover-card__rows {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .cover-card__row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.45rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container-high);
        padding: clamp(0.3rem, 1.4cqmin, 0.45rem);
    }

    .cover-card__row--warning {
        background: color-mix(in srgb, var(--color-m3-tertiary) 15%, var(--color-m3-surface-container-high));
    }

    .cover-card__row--busy {
        background: color-mix(in srgb, var(--color-m3-primary) 15%, var(--color-m3-surface-container-high));
    }

    .cover-card__row--offline {
        background: color-mix(in srgb, var(--color-m3-error) 14%, var(--color-m3-surface-container-high));
    }

    .cover-card__row-main {
        display: flex;
        min-width: 0;
        flex: 1;
        align-items: center;
        gap: 0.55rem;
        text-align: left;
        color: var(--color-m3-on-surface);
    }

    .cover-card__row-body {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 0.05rem;
    }

    .cover-card__row-title {
        font-size: clamp(0.75rem, 3.1cqmin, 0.9rem);
        font-weight: 800;
    }

    .cover-card__row-subtitle {
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.625rem, 2.6cqmin, 0.78rem);
    }

    .cover-card__row-action {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-secondary-container);
        padding: 0.35rem 0.65rem;
        color: var(--color-m3-on-secondary-container);
        font-size: clamp(0.625rem, 2.4cqmin, 0.78rem);
        font-weight: 800;
    }

    .cover-card__more {
        margin-top: auto;
        text-align: left;
    }

    .cover-card__empty {
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
        .cover-card__metrics {
            display: none;
        }
    }

    @container (max-height: 235px) {
        .cover-card__controls {
            display: none;
        }
    }
</style>
