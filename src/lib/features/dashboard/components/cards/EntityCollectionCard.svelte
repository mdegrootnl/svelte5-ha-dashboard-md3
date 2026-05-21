<script lang="ts">
    import {
        resolveCollectionEntities,
        type ResolvedEntity,
    } from "$lib/domain/haInventory";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import { entityDetailStore } from "$lib/features/dashboard/stores/entityDetail.svelte";
    import { inventoryStore } from "$lib/stores/inventory.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { formatEntityStateLabel, getDomain } from "$lib/utils/entity";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { CollectionCardOptions } from "$lib/types";
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
        options?: CollectionCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("filter_alt"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ mode: "auto", showState: true }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let presentation = $derived(options?.presentation ?? "list");
    let isSummary = $derived(presentation === "summary");
    let title = $derived(name || (isSummary ? summaryModeLabel(options?.mode) : modeLabel(options?.mode)));
    let accentColor = $derived(color || modeAccent(options?.mode));
    let resolvedEntities = $derived.by(() => {
        if (options?.entityIds && options.entityIds.length > 0) {
            return inventoryStore.getEntities(options.entityIds);
        }

        return resolveCollectionEntities(inventoryStore.index, options);
    });
    let summaryAccentColor = $derived(
        resolvedEntities.length === 0 ? "var(--color-m3-outline)" : accentColor,
    );
    let summaryPreviewEntities = $derived(resolvedEntities.slice(0, 3));
    let summaryRemainingCount = $derived(
        Math.max(0, resolvedEntities.length - summaryPreviewEntities.length),
    );
    let summaryStatus = $derived(summaryStatusLabel(options?.mode, resolvedEntities.length));
    let summaryDetail = $derived(
        resolvedEntities.length === 0
            ? themeStore.t("collection.summary.empty")
            : resolvedEntities
                  .slice(0, 2)
                  .map((entity) => {
                      const stateLabel = formatEntityState(entity);
                      return stateLabel ? `${entity.name} - ${stateLabel}` : entity.name;
                  })
                  .join(", "),
    );

    function modeKey(mode: CollectionCardOptions["mode"] = "auto") {
        switch (mode) {
            case "lights_on":
                return "lightsOn";
            case "low_battery":
                return "lowBattery";
            case "unavailable":
                return "unavailable";
            case "updates":
                return "updates";
            case "openings":
                return "openings";
            case "motion":
                return "motion";
            case "media_playing":
                return "mediaPlaying";
            case "security":
                return "security";
            case "custom":
                return "custom";
            default:
                return "auto";
        }
    }

    function modeLabel(mode: CollectionCardOptions["mode"] = "auto") {
        return themeStore.t(`collection.mode.${modeKey(mode)}`);
    }

    function summaryModeLabel(mode: CollectionCardOptions["mode"] = "auto") {
        return themeStore.t(`collection.summaryMode.${modeKey(mode)}`);
    }

    function summaryStatusLabel(mode: CollectionCardOptions["mode"] = "auto", count: number) {
        if (count === 0) return themeStore.t("collection.status.clear");
        return themeStore.t(`collection.status.${modeKey(mode)}`, { count });
    }

    function domainIcon(domain: string) {
        switch (domain) {
            case "light":
                return "lightbulb";
            case "switch":
                return "toggle_on";
            case "fan":
                return "mode_fan";
            case "cover":
                return "blinds";
            case "climate":
                return "thermostat";
            case "media_player":
                return "play_circle";
            case "sensor":
                return "sensors";
            case "binary_sensor":
                return "radio_button_checked";
            case "calendar":
                return "event";
            default:
                return "devices";
        }
    }

    function getEntityIcon(entity: ResolvedEntity) {
        if (entity.domain === "update") return "system_update_alt";
        return domainIcon(entity.domain || getDomain(entity.entityId));
    }

    function formatEntityState(entity: ResolvedEntity) {
        return formatEntityStateLabel(entity.state, {
            entityId: entity.entityId,
            domain: entity.domain,
            deviceClass: entity.deviceClass,
            unit: entity.unit,
            language: themeStore.language,
        });
    }

    function formatEntityTitle(entity: ResolvedEntity, stateLabel: string) {
        return stateLabel ? `${entity.name} - ${stateLabel}` : entity.name;
    }

    function modeAccent(mode = "auto") {
        switch (mode) {
            case "security":
            case "unavailable":
                return "var(--color-m3-error)";
            case "openings":
            case "low_battery":
            case "updates":
                return "var(--color-m3-tertiary)";
            case "motion":
                return "var(--color-m3-secondary)";
            case "media_playing":
            case "lights_on":
                return "var(--color-m3-primary)";
            default:
                return "var(--color-m3-secondary)";
        }
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "collection",
            options: { collection: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "filter_alt";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { collection?: CollectionCardOptions })?.collection || options;
            },
            onDelete: ondelete,
        });
    }

    function openDetails(e: Event) {
        if (dashboardEditorStore.isEditing || resolvedEntities.length === 0) return;
        e.stopPropagation();
        entityDetailStore.openEntities({
            title,
            sourceLabel: summaryStatus,
            entityIds: resolvedEntities.map((entity) => entity.entityId),
        });
    }

    function openEntityDetails(entity: ResolvedEntity, e: Event) {
        if (dashboardEditorStore.isEditing) return;
        e.stopPropagation();
        entityDetailStore.openEntities({
            title,
            sourceLabel: summaryStatus,
            entityIds: resolvedEntities.map((item) => item.entityId),
            selectedEntityId: entity.entityId,
        });
    }

</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<article
    class="relative h-full w-full rounded-m3-card text-m3-on-surface overflow-hidden group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    class:cursor-pointer={!dashboardEditorStore.isEditing && resolvedEntities.length > 0}
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
    onclick={openDetails}
>
    {#if isSummary}
        <div class="collection-summary">
            <div class="collection-summary__header">
                <div
                    class="collection-summary__icon flex shrink-0 items-center justify-center rounded-m3-full"
                    style:background-color={`color-mix(in srgb, ${summaryAccentColor} 18%, transparent)`}
                    style:color={summaryAccentColor}
                >
                    <DynamicIcon name={icon || "filter_alt"} class="size-[54%]" />
                </div>
                <div class="collection-summary__body min-w-0 flex-1">
                    <h3 class="collection-summary__title">
                        {title}
                    </h3>
                    {#if summaryPreviewEntities.length > 0}
                        <p class="collection-summary__detail text-m3-on-surface-variant">
                            {summaryDetail}
                        </p>
                    {/if}
                </div>
                <div
                    class="collection-summary__status shrink-0 rounded-m3-full font-semibold"
                    style:background-color={`color-mix(in srgb, ${summaryAccentColor} 14%, transparent)`}
                    style:color={summaryAccentColor}
                >
                    {summaryStatus}
                </div>
            </div>
            {#if summaryPreviewEntities.length > 0}
                <div class="collection-summary__entities" aria-label={themeStore.t("collection.matchingEntities")}>
                    {#each summaryPreviewEntities as entity (entity.entityId)}
                        {@const stateLabel = formatEntityState(entity)}
                        <button
                            type="button"
                            class="collection-summary__entity"
                            title={formatEntityTitle(entity, stateLabel)}
                            onclick={(e) => openEntityDetails(entity, e)}
                        >
                            <DynamicIcon
                                name={getEntityIcon(entity)}
                                class="collection-summary__entity-icon shrink-0 text-m3-on-surface-variant"
                            />
                            <span class="collection-summary__entity-name">
                                {entity.name}
                            </span>
                            {#if options?.showState !== false && stateLabel}
                                <span class="collection-summary__entity-state">
                                    {stateLabel}
                                </span>
                            {/if}
                        </button>
                    {/each}
                    {#if summaryRemainingCount > 0}
                        <div class="collection-summary__more" title={themeStore.t("collection.moreItems", { count: summaryRemainingCount })}>
                            +{summaryRemainingCount}
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="collection-summary__empty text-m3-on-surface-variant">
                    {summaryDetail}
                </div>
            {/if}
        </div>
    {:else}
        <div class="h-full flex flex-col p-[clamp(0.625rem,4cqmin,1.5rem)] gap-[clamp(0.375rem,3cqmin,1rem)]">
            <header class="flex items-center gap-[clamp(0.375rem,3cqmin,1rem)]">
                <div
                    class="size-[clamp(2.5rem,24cqmin,4.75rem)] rounded-m3-full flex items-center justify-center shrink-0"
                    style:background-color={color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--color-m3-secondary-container)"}
                    style:color={color || "var(--color-m3-secondary)"}
                >
                    <DynamicIcon name={icon || "filter_alt"} class="size-[58%]" />
                </div>
                <div class="min-w-0">
                    <h3 class="text-[clamp(0.95rem,max(6.5cqb,1.8cqi),1.35rem)] font-bold leading-tight truncate">
                        {title}
                    </h3>
                    <p class="text-[clamp(0.8125rem,max(4.8cqb,1.2cqi),0.95rem)] text-m3-on-surface-variant">
                        {themeStore.t(resolvedEntities.length === 1 ? "collection.itemCount" : "collection.itemCountPlural", { count: resolvedEntities.length })}
                    </p>
                </div>
            </header>

            <div class="flex-1 min-h-0 flex flex-col gap-[clamp(0.25rem,1.8cqmin,0.625rem)] overflow-hidden">
                {#each resolvedEntities.slice(0, 6) as entity (entity.entityId)}
                    <button
                        type="button"
                        class="flex items-center gap-[clamp(0.25rem,2cqmin,0.75rem)] min-h-0 rounded-m3-sm bg-m3-surface-container-high px-[clamp(0.375rem,2.5cqmin,0.875rem)] py-[clamp(0.3125rem,2cqmin,0.75rem)] text-left text-m3-on-surface hover:brightness-95"
                        onclick={(e) => openEntityDetails(entity, e)}
                    >
                        <DynamicIcon
                            name={getEntityIcon(entity)}
                            class="size-[clamp(0.875rem,3.4cqmin,1.25rem)] shrink-0 text-m3-on-surface-variant"
                        />
                        <span class="flex-1 truncate text-[clamp(0.8125rem,max(4.8cqb,1.2cqi),0.95rem)]">
                            {entity.name}
                        </span>
                        {#if options?.showState !== false}
                            <span class="shrink-0 text-[clamp(0.75rem,max(4.2cqb,1.1cqi),0.875rem)] text-m3-on-surface-variant">
                                {formatEntityState(entity)}
                            </span>
                        {/if}
                    </button>
                {:else}
                    <div class="flex-1 flex items-center justify-center text-center text-[clamp(0.75rem,3.2cqmin,0.95rem)] text-m3-on-surface-variant px-[clamp(0.5rem,3cqmin,1rem)]">
                        {themeStore.t("collection.empty")}
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <button
        class="touch-edit-control collection-edit-button rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity z-20 hover:brightness-110"
        class:collection-edit-button--summary={isSummary}
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title={themeStore.t("collection.editTitle")}
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>

<style>
    .collection-summary {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-width: 0;
        justify-content: center;
        gap: clamp(0.5rem, 2.8cqi, 0.875rem);
        padding: clamp(0.75rem, 3.5cqi, 1.25rem);
        padding-right: clamp(4rem, 14cqi, 5.25rem);
    }

    .collection-summary__header {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: clamp(0.625rem, 3.5cqi, 1.125rem);
    }

    .collection-edit-button {
        position: absolute;
        top: clamp(0.25rem, 2cqmin, 0.75rem);
        right: clamp(0.25rem, 2cqmin, 0.75rem);
        padding: clamp(0.25rem, 1.7cqmin, 0.5rem);
    }

    .collection-edit-button--summary {
        top: 50%;
        transform: translateY(-50%);
    }

    .collection-summary__icon {
        width: clamp(2.75rem, 14cqi, 4.5rem);
        height: clamp(2.75rem, 14cqi, 4.5rem);
    }

    .collection-summary__body {
        display: flex;
        min-height: 0;
        flex-direction: column;
        justify-content: center;
    }

    .collection-summary__title {
        overflow: hidden;
        font-size: clamp(1rem, 4.2cqi, 1.25rem);
        font-weight: 700;
        line-height: 1.12;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .collection-summary__detail {
        display: none;
        overflow: hidden;
        font-size: clamp(0.8125rem, 3.2cqi, 0.95rem);
        line-height: 1.25;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .collection-summary__entities {
        display: grid;
        min-width: 0;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
        gap: clamp(0.25rem, 1.4cqi, 0.5rem);
    }

    .collection-summary__entity,
    .collection-summary__more,
    .collection-summary__empty {
        min-height: clamp(1.875rem, 8cqb, 2.375rem);
        border-radius: 0.5rem;
        background: var(--color-m3-surface-container-high);
    }

    .collection-summary__entity {
        display: flex;
        min-width: 0;
        align-items: center;
        border: 0;
        gap: clamp(0.375rem, 1.6cqi, 0.625rem);
        padding: clamp(0.25rem, 1.2cqi, 0.375rem) clamp(0.5rem, 2cqi, 0.75rem);
        color: var(--color-m3-on-surface);
        text-align: left;
        cursor: pointer;
    }

    .collection-summary__entity-icon {
        width: clamp(0.875rem, 3cqi, 1.125rem);
        height: clamp(0.875rem, 3cqi, 1.125rem);
    }

    .collection-summary__entity-name {
        min-width: 0;
        flex: 1;
        overflow: hidden;
        font-size: clamp(0.75rem, 2.9cqi, 0.875rem);
        font-weight: 600;
        line-height: 1.2;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .collection-summary__entity-state {
        max-width: 42%;
        overflow: hidden;
        border-radius: 999px;
        background: var(--color-m3-surface-container-highest);
        padding: 0.125rem 0.375rem;
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.6875rem, 2.3cqi, 0.75rem);
        font-weight: 700;
        line-height: 1.2;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .collection-summary__more,
    .collection-summary__empty {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem 0.625rem;
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.75rem, 2.6cqi, 0.875rem);
        font-weight: 700;
        line-height: 1.2;
    }

    .collection-summary__empty {
        justify-content: flex-start;
    }

    .collection-summary__status {
        padding: clamp(0.25rem, 1.5cqi, 0.5rem) clamp(0.5rem, 3cqi, 0.875rem);
        font-size: clamp(0.8125rem, 2.8cqi, 1rem);
        line-height: 1.1;
        white-space: nowrap;
    }

    @container (max-width: 260px) {
        .collection-summary {
            position: relative;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.625rem;
            padding-right: 3.875rem;
        }

        .collection-summary__header {
            align-items: flex-start;
            flex-direction: column;
            gap: 0.5rem;
        }

        .collection-summary__icon {
            width: 3rem;
            height: 3rem;
        }

        .collection-summary__body {
            width: 100%;
        }

        .collection-summary__status {
            position: absolute;
            top: 0.625rem;
            right: 0.625rem;
        }

        .collection-summary__detail {
            display: block;
        }

        .collection-summary__entities,
        .collection-summary__empty {
            display: none;
        }
    }

    @container (max-width: 220px) {
        .collection-summary__title {
            display: -webkit-box;
            overflow: hidden;
            white-space: normal;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            line-clamp: 2;
        }

        .collection-summary__detail {
            display: none;
        }
    }

    @container (max-height: 140px) {
        .collection-summary {
            position: static;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            gap: clamp(0.625rem, 3cqi, 1rem);
            padding: clamp(0.625rem, 3cqi, 1rem);
            padding-right: clamp(3.75rem, 11cqi, 4.75rem);
        }

        .collection-summary__header {
            flex: 1;
            gap: clamp(0.625rem, 3cqi, 1rem);
        }

        .collection-summary__icon {
            width: clamp(2.75rem, 12cqi, 3.5rem);
            height: clamp(2.75rem, 12cqi, 3.5rem);
        }

        .collection-summary__body {
            width: auto;
        }

        .collection-summary__title {
            display: block;
            overflow: hidden;
            font-size: clamp(1rem, 3.4cqi, 1.125rem);
            line-height: 1.15;
            text-overflow: ellipsis;
            white-space: nowrap;
            -webkit-line-clamp: unset;
            line-clamp: unset;
        }

        .collection-summary__detail {
            display: block;
        }

        .collection-summary__entities,
        .collection-summary__empty {
            display: none;
        }

        .collection-summary__status {
            position: static;
            margin-left: auto;
            padding: 0.25rem 0.625rem;
            font-size: clamp(0.8125rem, 2.5cqi, 0.9375rem);
        }
    }
</style>
