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
    import type { LockCardOptions } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import { formatEntityStateLabel } from "$lib/utils/entity";
    import IconEdit from "~icons/material-symbols/edit";

    type LockTone = "empty" | "warning" | "busy" | "clear" | "offline";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: LockCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("lock"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ source: "auto", showLockAll: true, showUnlockControls: false, maxItems: 6 }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let smartOptions = $derived(inventoryStore.smartLockOptions(options, entityId));
    let maxItems = $derived(Math.max(1, smartOptions.maxItems ?? 6));
    let title = $derived(name || themeStore.t("lockCard.defaultTitle"));
    let lockEntities = $derived(inventoryStore.getEntities(smartOptions.entityIds ?? []));
    let allEntityIds = $derived(lockEntities.map((entity) => entity.entityId));
    let lockedCount = $derived(lockEntities.filter(isLocked).length);
    let unlockedCount = $derived(lockEntities.filter(isUnlocked).length);
    let offlineCount = $derived(lockEntities.filter(isOffline).length);
    let busyCount = $derived(lockEntities.filter(isChanging).length);
    let tone = $derived<LockTone>(
        lockEntities.length === 0
            ? "empty"
            : unlockedCount > 0
              ? "warning"
              : busyCount > 0
                ? "busy"
                : offlineCount > 0
                  ? "offline"
                  : "clear",
    );
    let accentColor = $derived(color || toneColor(tone));
    let statusLabel = $derived(themeStore.t(`lockCard.status.${tone}`));
    let detailSourceLabel = $derived(
        themeStore.t("lockCard.summary", {
            locked: lockedCount,
            unlocked: unlockedCount,
        }),
    );
    let sortedLocks = $derived.by(() =>
        [...lockEntities].sort((a, b) => {
            const scoreDelta = lockPriority(b) - lockPriority(a);
            if (scoreDelta !== 0) return scoreDelta;
            return a.name.localeCompare(b.name);
        }),
    );
    let visibleLocks = $derived(sortedLocks.slice(0, maxItems));
    let remainingCount = $derived(Math.max(0, lockEntities.length - visibleLocks.length));
    let lockableEntities = $derived(lockEntities.filter((entity) => isUnlocked(entity) || isOpen(entity)));

    function isLocked(entity: ResolvedEntity) {
        return entity.state === "locked";
    }

    function isUnlocked(entity: ResolvedEntity) {
        return ["unlocked", "open"].includes(entity.state);
    }

    function isOpen(entity: ResolvedEntity) {
        return entity.state === "open";
    }

    function isChanging(entity: ResolvedEntity) {
        return ["locking", "unlocking", "opening"].includes(entity.state);
    }

    function isOffline(entity: ResolvedEntity) {
        return ["unavailable", "unknown", "jammed"].includes(entity.state);
    }

    function lockPriority(entity: ResolvedEntity) {
        if (isUnlocked(entity) || isOffline(entity)) return 4;
        if (isChanging(entity)) return 3;
        return 1;
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

    function rowIcon(entity: ResolvedEntity) {
        if (isUnlocked(entity) || isOpen(entity)) return "lock_open";
        if (isChanging(entity)) return "sync_lock";
        if (isOffline(entity)) return "lock_alert";
        return "lock";
    }

    function toneColor(value: LockTone) {
        if (value === "warning") return "var(--color-m3-error)";
        if (value === "busy") return "var(--color-m3-tertiary)";
        if (value === "clear") return "var(--color-m3-primary)";
        return "var(--color-m3-outline)";
    }

    function actionFor(entity: ResolvedEntity): "lock" | "unlock" | undefined {
        if (isUnlocked(entity) || isOpen(entity)) return "lock";
        if (smartOptions.showUnlockControls && isLocked(entity)) return "unlock";
        return undefined;
    }

    function callLock(entityId: string, service: "lock" | "unlock", e: Event) {
        e.stopPropagation();
        haStore.callService("lock", service, { entity_id: entityId });
    }

    function lockAll(e: Event) {
        e.stopPropagation();
        for (const entity of lockableEntities) {
            haStore.callService("lock", "lock", { entity_id: entity.entityId });
        }
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "lock",
            options: { lock: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "lock";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { lock?: LockCardOptions })?.lock ?? options;
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
    data-testid="lock-card"
    class="relative h-full w-full overflow-hidden rounded-m3-card text-m3-on-surface group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
    aria-label={title}
>
    <div class="lock-card">
        <header class="lock-card__header">
            <div
                class="lock-card__icon"
                style:background-color={`color-mix(in srgb, ${accentColor} 18%, transparent)`}
                style:color={accentColor}
            >
                <DynamicIcon name={icon || "lock"} class="size-[58%]" />
            </div>
            <div class="min-w-0 flex-1">
                <h3 class="lock-card__title">{title}</h3>
                <p class="lock-card__status" style:color={accentColor}>{statusLabel}</p>
            </div>
            <div class="lock-card__badge" style:color={accentColor}>
                {lockEntities.length}
            </div>
        </header>

        <div class="lock-card__metrics">
            <span>{themeStore.t("lockCard.metric.locked", { count: lockedCount })}</span>
            <span>{themeStore.t("lockCard.metric.unlocked", { count: unlockedCount })}</span>
            <span>{themeStore.t("lockCard.metric.offline", { count: offlineCount })}</span>
        </div>

        {#if smartOptions.showLockAll !== false && lockableEntities.length > 0}
            <button type="button" class="lock-card__lock-all" onclick={lockAll}>
                <DynamicIcon name="lock" class="size-4" />
                <span>{themeStore.t("lockCard.controls.lockAll", { count: lockableEntities.length })}</span>
            </button>
        {/if}

        <div class="lock-card__rows">
            {#if visibleLocks.length > 0}
                {#each visibleLocks as lock (lock.entityId)}
                    {@const action = actionFor(lock)}
                    <div
                        class="lock-card__row"
                        class:lock-card__row--warning={isUnlocked(lock)}
                        class:lock-card__row--offline={isOffline(lock)}
                    >
                        <button type="button" class="lock-card__row-main" onclick={(e) => openDetails(lock, e)}>
                            <DynamicIcon name={rowIcon(lock)} class="size-5 shrink-0" />
                            <span class="lock-card__row-body">
                                <span class="lock-card__row-title">{lock.name}</span>
                                <span class="lock-card__row-subtitle">{formatState(lock)}</span>
                            </span>
                        </button>
                        {#if action}
                            <button
                                type="button"
                                class="lock-card__row-action"
                                onclick={(e) => callLock(lock.entityId, action, e)}
                            >
                                {themeStore.t(`lockCard.controls.${action}`)}
                            </button>
                        {/if}
                    </div>
                {/each}
                {#if remainingCount > 0}
                    <p class="lock-card__more">
                        {themeStore.t("lockCard.moreItems", { count: remainingCount })}
                    </p>
                {/if}
            {:else}
                <div class="lock-card__empty">
                    <DynamicIcon name="lock" class="size-7" />
                    <span>{themeStore.t("lockCard.noEntities")}</span>
                </div>
            {/if}
        </div>
    </div>

    <button
        class="touch-edit-control absolute right-[clamp(0.25rem,2cqmin,0.75rem)] top-[clamp(0.25rem,2cqmin,0.75rem)] z-30 rounded-full bg-m3-primary-container p-[clamp(0.25rem,1.7cqmin,0.5rem)] text-m3-on-primary-container opacity-0 shadow-sm transition-opacity hover:brightness-110 group-hover/card:opacity-100"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title={themeStore.t("lockCard.editTitle")}
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>

    <EntityDetailButton
        entityIds={allEntityIds}
        selectedEntityId={visibleLocks[0]?.entityId}
        {title}
        sourceLabel={detailSourceLabel}
    />
</article>

<style>
    .lock-card {
        display: flex;
        height: 100%;
        min-height: 0;
        flex-direction: column;
        gap: clamp(0.45rem, 2.5cqmin, 0.8rem);
        padding: clamp(0.625rem, 4cqmin, 1.25rem);
    }

    .lock-card__header {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: clamp(0.5rem, 3cqmin, 1rem);
        padding-right: clamp(2rem, 7cqi, 3rem);
    }

    .lock-card__icon {
        display: flex;
        width: clamp(2.4rem, 18cqmin, 4rem);
        height: clamp(2.4rem, 18cqmin, 4rem);
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
    }

    .lock-card__title,
    .lock-card__status,
    .lock-card__row-title,
    .lock-card__row-subtitle {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .lock-card__title {
        font-size: clamp(0.95rem, max(5.4cqb, 1.8cqi), 1.3rem);
        font-weight: 800;
        line-height: 1.1;
    }

    .lock-card__status {
        font-size: clamp(0.75rem, 3.4cqmin, 0.9rem);
        font-weight: 700;
    }

    .lock-card__badge {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-surface-container-high);
        padding: 0.25rem 0.55rem;
        font-size: clamp(0.75rem, 3cqmin, 0.9rem);
        font-weight: 800;
    }

    .lock-card__metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .lock-card__metrics span,
    .lock-card__more {
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

    .lock-card__lock-all {
        display: flex;
        min-width: 0;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-primary);
        padding: 0.55rem 0.75rem;
        color: var(--color-m3-on-primary);
        font-size: clamp(0.7rem, 2.8cqmin, 0.9rem);
        font-weight: 800;
        transition: filter 140ms ease;
    }

    .lock-card__lock-all:hover {
        filter: brightness(1.06);
    }

    .lock-card__rows {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .lock-card__row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.45rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container-high);
        padding: clamp(0.3rem, 1.4cqmin, 0.45rem);
    }

    .lock-card__row--warning {
        background: color-mix(in srgb, var(--color-m3-error) 14%, var(--color-m3-surface-container-high));
    }

    .lock-card__row--offline {
        background: color-mix(in srgb, var(--color-m3-outline) 14%, var(--color-m3-surface-container-high));
    }

    .lock-card__row-main {
        display: flex;
        min-width: 0;
        flex: 1;
        align-items: center;
        gap: 0.55rem;
        text-align: left;
        color: var(--color-m3-on-surface);
    }

    .lock-card__row-body {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 0.05rem;
    }

    .lock-card__row-title {
        font-size: clamp(0.75rem, 3.1cqmin, 0.9rem);
        font-weight: 800;
    }

    .lock-card__row-subtitle {
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.625rem, 2.6cqmin, 0.78rem);
    }

    .lock-card__row-action {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-secondary-container);
        padding: 0.35rem 0.65rem;
        color: var(--color-m3-on-secondary-container);
        font-size: clamp(0.625rem, 2.4cqmin, 0.78rem);
        font-weight: 800;
    }

    .lock-card__more {
        margin-top: auto;
        text-align: left;
    }

    .lock-card__empty {
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
        .lock-card__metrics {
            display: none;
        }
    }
</style>
