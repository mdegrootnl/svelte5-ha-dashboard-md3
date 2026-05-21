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
    import type { UpdateCardOptions } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import IconEdit from "~icons/material-symbols/edit";

    type UpdateTone = "empty" | "attention" | "clear" | "skipped" | "offline";
    type UpdateAction = "install" | "skip" | "clearSkipped";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: UpdateCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("system_update_alt"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({
            source: "auto",
            showCheckControl: true,
            showInstallControls: true,
            showVersions: true,
            showReleaseNotes: true,
            maxItems: 5,
        }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let smartOptions = $derived(inventoryStore.smartUpdateOptions(options, entityId));
    let maxItems = $derived(Math.max(1, smartOptions.maxItems ?? 5));
    let title = $derived(name || themeStore.t("updateCard.defaultTitle"));
    let updateEntities = $derived(inventoryStore.getEntities(smartOptions.entityIds ?? []));
    let allEntityIds = $derived(updateEntities.map((entity) => entity.entityId));
    let availableCount = $derived(updateEntities.filter(isUpdateAvailable).length);
    let currentCount = $derived(updateEntities.filter(isCurrent).length);
    let skippedCount = $derived(updateEntities.filter(isSkipped).length);
    let offlineCount = $derived(updateEntities.filter(isOffline).length);
    let tone = $derived<UpdateTone>(
        updateEntities.length === 0
            ? "empty"
            : availableCount > 0
              ? "attention"
              : skippedCount > 0
                ? "skipped"
                : offlineCount > 0
                  ? "offline"
                  : "clear",
    );
    let accentColor = $derived(color || toneColor(tone));
    let statusLabel = $derived(themeStore.t(`updateCard.status.${tone}`));
    let detailSourceLabel = $derived(
        themeStore.t("updateCard.summary", {
            available: availableCount,
            current: currentCount,
        }),
    );
    let sortedUpdates = $derived.by(() =>
        [...updateEntities].sort((a, b) => {
            const scoreDelta = updatePriority(b) - updatePriority(a);
            if (scoreDelta !== 0) return scoreDelta;
            return a.name.localeCompare(b.name);
        }),
    );
    let visibleUpdates = $derived(sortedUpdates.slice(0, maxItems));
    let remainingCount = $derived(Math.max(0, updateEntities.length - visibleUpdates.length));
    let checkableIds = $derived(updateEntities.filter((entity) => !isOffline(entity)).map((entity) => entity.entityId));

    function liveAttributes(entity: ResolvedEntity) {
        return haStore.getEntity(entity.entityId)?.attributes ?? {};
    }

    function textAttribute(entity: ResolvedEntity, keys: string[]) {
        const attributes = liveAttributes(entity);
        for (const key of keys) {
            const value = attributes[key];
            if (typeof value === "string" && value.trim()) return value.trim();
        }
        return undefined;
    }

    function isUpdateAvailable(entity: ResolvedEntity) {
        return entity.state === "on";
    }

    function isOffline(entity: ResolvedEntity) {
        return ["unavailable", "unknown"].includes(entity.state);
    }

    function isSkipped(entity: ResolvedEntity) {
        return Boolean(textAttribute(entity, ["skipped_version"]));
    }

    function isCurrent(entity: ResolvedEntity) {
        return !isUpdateAvailable(entity) && !isSkipped(entity) && !isOffline(entity);
    }

    function canControl(entity: ResolvedEntity) {
        return entity.domain === "update" && !isOffline(entity);
    }

    function updatePriority(entity: ResolvedEntity) {
        if (isUpdateAvailable(entity)) return 5;
        if (isSkipped(entity)) return 4;
        if (isOffline(entity)) return 3;
        return 1;
    }

    function versionText(entity: ResolvedEntity) {
        const installed = textAttribute(entity, ["installed_version"]);
        const latest = textAttribute(entity, ["latest_version"]);
        const skipped = textAttribute(entity, ["skipped_version"]);
        if (skipped) return themeStore.t("updateCard.detail.skippedVersion", { version: skipped });
        if (installed && latest && installed !== latest) return `${installed} -> ${latest}`;
        if (latest) return themeStore.t("updateCard.detail.latestVersion", { version: latest });
        if (installed) return themeStore.t("updateCard.detail.installedVersion", { version: installed });
        return "";
    }

    function releaseText(entity: ResolvedEntity) {
        return textAttribute(entity, ["release_summary", "release_notes", "title"]);
    }

    function stateLabel(entity: ResolvedEntity) {
        if (isOffline(entity)) return themeStore.t("common.unavailable");
        if (isUpdateAvailable(entity)) return themeStore.t("updateCard.state.available");
        if (isSkipped(entity)) return themeStore.t("updateCard.state.skipped");
        return themeStore.t("updateCard.state.current");
    }

    function formatDetail(entity: ResolvedEntity) {
        const details: string[] = [];
        if (smartOptions.showVersions !== false) {
            const version = versionText(entity);
            if (version) details.push(version);
        }
        if (smartOptions.showReleaseNotes !== false) {
            const release = releaseText(entity);
            if (release) details.push(release);
        }
        return details.length > 0 ? `${stateLabel(entity)} - ${details.join(" - ")}` : stateLabel(entity);
    }

    function rowIcon(entity: ResolvedEntity) {
        if (isOffline(entity)) return "error";
        if (isUpdateAvailable(entity)) return "new_releases";
        if (isSkipped(entity)) return "skip_next";
        return "verified";
    }

    function toneColor(value: UpdateTone) {
        if (value === "attention") return "var(--color-m3-tertiary)";
        if (value === "skipped") return "var(--color-m3-secondary)";
        if (value === "offline") return "var(--color-m3-error)";
        if (value === "clear") return "var(--color-m3-primary)";
        return "var(--color-m3-outline)";
    }

    function primaryAction(entity: ResolvedEntity): UpdateAction | undefined {
        if (!canControl(entity) || smartOptions.showInstallControls === false) return undefined;
        if (isUpdateAvailable(entity)) return "install";
        if (isSkipped(entity)) return "clearSkipped";
        return undefined;
    }

    function actionLabel(action: UpdateAction) {
        return themeStore.t(`updateCard.controls.${action}`);
    }

    function callUpdate(entity: ResolvedEntity, action: UpdateAction, e: Event) {
        e.stopPropagation();
        if (!canControl(entity)) return;
        const service = action === "clearSkipped" ? "clear_skipped" : action;
        haStore.callService("update", service, { entity_id: entity.entityId });
    }

    function checkUpdates(e: Event) {
        e.stopPropagation();
        if (checkableIds.length === 0) return;
        haStore.callService("homeassistant", "update_entity", {
            entity_id: checkableIds,
        });
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "update",
            options: { update: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "system_update_alt";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { update?: UpdateCardOptions })?.update ?? options;
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
    data-testid="update-card"
    class="relative h-full w-full overflow-hidden rounded-m3-card text-m3-on-surface group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
    aria-label={title}
>
    <div class="update-card">
        <header class="update-card__header">
            <div
                class="update-card__icon"
                style:background-color={`color-mix(in srgb, ${accentColor} 18%, transparent)`}
                style:color={accentColor}
            >
                <DynamicIcon name={icon || "system_update_alt"} class="size-[58%]" />
            </div>
            <div class="min-w-0 flex-1">
                <h3 class="update-card__title">{title}</h3>
                <p class="update-card__status" style:color={accentColor}>{statusLabel}</p>
            </div>
            <div class="update-card__badge" style:color={accentColor}>
                {availableCount}
            </div>
        </header>

        <div class="update-card__metrics">
            <span>{themeStore.t("updateCard.metric.available", { count: availableCount })}</span>
            <span>{themeStore.t("updateCard.metric.current", { count: currentCount })}</span>
            <span>{themeStore.t("updateCard.metric.skipped", { count: skippedCount + offlineCount })}</span>
        </div>

        {#if smartOptions.showCheckControl !== false && checkableIds.length > 0}
            <div class="update-card__controls">
                <button type="button" onclick={checkUpdates}>
                    <DynamicIcon name="refresh" class="size-4" />
                    <span>{themeStore.t("updateCard.controls.check")}</span>
                </button>
            </div>
        {/if}

        <div class="update-card__rows">
            {#if visibleUpdates.length > 0}
                {#each visibleUpdates as update (update.entityId)}
                    {@const action = primaryAction(update)}
                    <div
                        class="update-card__row"
                        class:update-card__row--attention={isUpdateAvailable(update)}
                        class:update-card__row--skipped={isSkipped(update)}
                        class:update-card__row--offline={isOffline(update)}
                    >
                        <button type="button" class="update-card__row-main" onclick={(e) => openDetails(update, e)}>
                            <DynamicIcon name={rowIcon(update)} class="size-5 shrink-0" />
                            <span class="update-card__row-body">
                                <span class="update-card__row-title">{update.name}</span>
                                <span class="update-card__row-subtitle">{formatDetail(update)}</span>
                            </span>
                        </button>
                        {#if action}
                            <button
                                type="button"
                                class="update-card__row-action"
                                onclick={(e) => callUpdate(update, action, e)}
                            >
                                {actionLabel(action)}
                            </button>
                        {/if}
                    </div>
                {/each}
                {#if remainingCount > 0}
                    <p class="update-card__more">
                        {themeStore.t("updateCard.moreItems", { count: remainingCount })}
                    </p>
                {/if}
            {:else}
                <div class="update-card__empty">
                    <DynamicIcon name="system_update_alt" class="size-7" />
                    <span>{themeStore.t("updateCard.noEntities")}</span>
                </div>
            {/if}
        </div>
    </div>

    <button
        class="touch-edit-control absolute right-[clamp(0.25rem,2cqmin,0.75rem)] top-[clamp(0.25rem,2cqmin,0.75rem)] z-30 rounded-full bg-m3-primary-container p-[clamp(0.25rem,1.7cqmin,0.5rem)] text-m3-on-primary-container opacity-0 shadow-sm transition-opacity hover:brightness-110 group-hover/card:opacity-100"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title={themeStore.t("updateCard.editTitle")}
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>

    <EntityDetailButton
        entityIds={allEntityIds}
        selectedEntityId={visibleUpdates[0]?.entityId}
        {title}
        sourceLabel={detailSourceLabel}
    />
</article>

<style>
    .update-card {
        display: flex;
        height: 100%;
        min-height: 0;
        flex-direction: column;
        gap: clamp(0.45rem, 2.5cqmin, 0.8rem);
        padding: clamp(0.625rem, 4cqmin, 1.25rem);
    }

    .update-card__header {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: clamp(0.5rem, 3cqmin, 1rem);
        padding-right: clamp(2rem, 7cqi, 3rem);
    }

    .update-card__icon {
        display: flex;
        width: clamp(2.4rem, 18cqmin, 4rem);
        height: clamp(2.4rem, 18cqmin, 4rem);
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
    }

    .update-card__title,
    .update-card__status,
    .update-card__row-title,
    .update-card__row-subtitle {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .update-card__title {
        font-size: clamp(0.95rem, max(5.4cqb, 1.8cqi), 1.3rem);
        font-weight: 800;
        line-height: 1.1;
    }

    .update-card__status {
        font-size: clamp(0.75rem, 3.4cqmin, 0.9rem);
        font-weight: 700;
    }

    .update-card__badge {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-surface-container-high);
        padding: 0.25rem 0.55rem;
        font-size: clamp(0.75rem, 3cqmin, 0.9rem);
        font-weight: 800;
    }

    .update-card__metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .update-card__metrics span,
    .update-card__more {
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

    .update-card__controls {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
    }

    .update-card__controls button {
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

    .update-card__controls button:hover {
        filter: brightness(1.06);
    }

    .update-card__rows {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .update-card__row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.45rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container-high);
        padding: clamp(0.3rem, 1.4cqmin, 0.45rem);
    }

    .update-card__row--attention {
        background: color-mix(in srgb, var(--color-m3-tertiary) 16%, var(--color-m3-surface-container-high));
    }

    .update-card__row--skipped {
        background: color-mix(in srgb, var(--color-m3-secondary) 13%, var(--color-m3-surface-container-high));
    }

    .update-card__row--offline {
        background: color-mix(in srgb, var(--color-m3-error) 14%, var(--color-m3-surface-container-high));
    }

    .update-card__row-main {
        display: flex;
        min-width: 0;
        flex: 1;
        align-items: center;
        gap: 0.55rem;
        text-align: left;
        color: var(--color-m3-on-surface);
    }

    .update-card__row-body {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 0.05rem;
    }

    .update-card__row-title {
        font-size: clamp(0.75rem, 3.1cqmin, 0.9rem);
        font-weight: 800;
    }

    .update-card__row-subtitle {
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.625rem, 2.6cqmin, 0.78rem);
    }

    .update-card__row-action {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-secondary-container);
        padding: 0.35rem 0.65rem;
        color: var(--color-m3-on-secondary-container);
        font-size: clamp(0.625rem, 2.4cqmin, 0.78rem);
        font-weight: 800;
    }

    .update-card__more {
        margin-top: auto;
        text-align: left;
    }

    .update-card__empty {
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
        .update-card__metrics {
            display: none;
        }
    }

    @container (max-height: 235px) {
        .update-card__controls {
            display: none;
        }
    }
</style>
