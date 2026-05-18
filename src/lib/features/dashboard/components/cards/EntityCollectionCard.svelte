<script lang="ts">
    import {
        resolveCollectionEntities,
        type ResolvedEntity,
    } from "$lib/domain/haInventory";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { inventoryStore } from "$lib/stores/inventory.svelte";
    import { getDomain } from "$lib/utils/entity";
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
    let summaryStatus = $derived(
        resolvedEntities.length === 0
            ? "Clear"
            : `${resolvedEntities.length} item${resolvedEntities.length === 1 ? "" : "s"}`,
    );
    let summaryDetail = $derived(
        resolvedEntities.length === 0
            ? "Nothing needs attention"
            : resolvedEntities
                  .slice(0, 2)
                  .map((entity) => entity.name)
                  .join(" - "),
    );

    function modeLabel(mode = "auto") {
        switch (mode) {
            case "lights_on":
                return "Active Devices";
            case "low_battery":
                return "Low Batteries";
            case "unavailable":
                return "Unavailable";
            case "updates":
                return "Updates";
            case "openings":
                return "Openings";
            case "motion":
                return "Motion & Presence";
            case "media_playing":
                return "Media Playing";
            case "security":
                return "Security Alerts";
            case "custom":
                return "Collection";
            default:
                return "Smart Collection";
        }
    }

    function summaryModeLabel(mode = "auto") {
        switch (mode) {
            case "lights_on":
                return "Active";
            case "low_battery":
                return "Batteries";
            case "unavailable":
                return "Offline";
            case "updates":
                return "Updates";
            case "openings":
                return "Open";
            case "motion":
                return "Motion";
            case "media_playing":
                return "Media";
            case "security":
                return "Security";
            case "custom":
                return "Collection";
            default:
                return "Smart";
        }
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
</script>

<article
    class="relative h-full w-full rounded-m3-card text-m3-on-surface overflow-hidden group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
>
    {#if isSummary}
        <div class="collection-summary">
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
                <p class="collection-summary__detail text-m3-on-surface-variant">
                    {summaryDetail}
                </p>
            </div>
            <div
                class="collection-summary__status shrink-0 rounded-m3-full font-semibold"
                style:background-color={`color-mix(in srgb, ${summaryAccentColor} 14%, transparent)`}
                style:color={summaryAccentColor}
            >
                {summaryStatus}
            </div>
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
                        {resolvedEntities.length} item{resolvedEntities.length === 1 ? "" : "s"}
                    </p>
                </div>
            </header>

            <div class="flex-1 min-h-0 flex flex-col gap-[clamp(0.25rem,1.8cqmin,0.625rem)] overflow-hidden">
                {#each resolvedEntities.slice(0, 6) as entity (entity.entityId)}
                    <div class="flex items-center gap-[clamp(0.25rem,2cqmin,0.75rem)] min-h-0 rounded-m3-sm bg-m3-surface-container-high px-[clamp(0.375rem,2.5cqmin,0.875rem)] py-[clamp(0.3125rem,2cqmin,0.75rem)]">
                        <DynamicIcon
                            name={getEntityIcon(entity)}
                            class="size-[clamp(0.875rem,3.4cqmin,1.25rem)] shrink-0 text-m3-on-surface-variant"
                        />
                        <span class="flex-1 truncate text-[clamp(0.8125rem,max(4.8cqb,1.2cqi),0.95rem)]">
                            {entity.name}
                        </span>
                        {#if options?.showState !== false}
                            <span class="shrink-0 text-[clamp(0.75rem,max(4.2cqb,1.1cqi),0.875rem)] text-m3-on-surface-variant">
                                {entity.state}{entity.unit || ""}
                            </span>
                        {/if}
                    </div>
                {:else}
                    <div class="flex-1 flex items-center justify-center text-center text-[clamp(0.75rem,3.2cqmin,0.95rem)] text-m3-on-surface-variant px-[clamp(0.5rem,3cqmin,1rem)]">
                        Nothing matches this collection
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <button
        class="touch-edit-control absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Collection Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>

<style>
    .collection-summary {
        display: flex;
        height: 100%;
        min-width: 0;
        align-items: center;
        gap: clamp(0.625rem, 4cqi, 1.25rem);
        padding: clamp(0.75rem, 4cqi, 1.25rem);
    }

    .collection-summary__icon {
        width: clamp(3rem, 18cqi, 4.5rem);
        height: clamp(3rem, 18cqi, 4.5rem);
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
        overflow: hidden;
        font-size: clamp(0.8125rem, 3.2cqi, 0.95rem);
        line-height: 1.25;
        text-overflow: ellipsis;
        white-space: nowrap;
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
            align-items: flex-start;
            flex-direction: column;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.625rem;
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

    @container (max-height: 96px) {
        .collection-summary {
            position: static;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            gap: clamp(0.625rem, 3cqi, 1rem);
            padding: clamp(0.625rem, 3cqi, 1rem);
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
