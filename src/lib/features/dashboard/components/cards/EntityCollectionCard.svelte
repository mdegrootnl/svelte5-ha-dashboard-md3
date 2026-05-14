<script lang="ts">
    import { cardEditorStore, createCollectionQuery, filterLowBattery, getDomain, haRegistryStore, haStore, resolveEntityQuery, type ResolvedEntity } from "$lib";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { CollectionCardOptions } from "$lib/types";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
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
        options = $bindable({ mode: "auto", showState: true }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let context = $derived({
        states: haStore.states,
        entities: haRegistryStore.entityRegistry,
        devices: haRegistryStore.deviceRegistry,
        areas: haRegistryStore.areas,
        floors: haRegistryStore.floors,
    });

    let title = $derived(name || modeLabel(options?.mode));
    let resolvedEntities = $derived.by(() => {
        if (options?.entityIds && options.entityIds.length > 0) {
            const manualQuery = { ...options.query, limit: options.query?.limit ?? 12 };
            const all = resolveEntityQuery(context, manualQuery);
            return options.entityIds
                .map((id) => all.find((item) => item.entityId === id))
                .filter((item): item is ResolvedEntity => !!item);
        }

        const query = createCollectionQuery(options);
        const results = resolveEntityQuery(context, query);
        return options?.mode === "low_battery"
            ? filterLowBattery(results, options?.threshold ?? 25)
            : results;
    });

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
            case "custom":
                return "Collection";
            default:
                return "Smart Collection";
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
    class="relative h-full w-full rounded-m3-md bg-m3-surface-container-highest text-m3-on-surface overflow-hidden group @container {className}"
    style={`container-type: size;${backgroundColor ? ` background-color: ${backgroundColor};` : ""}`}
>
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
                <h3 class="text-[clamp(14px,5cqmin,20px)] font-bold leading-tight truncate">
                    {title}
                </h3>
                <p class="text-[clamp(10px,3.4cqmin,13px)] text-m3-on-surface-variant">
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
                    <span class="flex-1 truncate text-[clamp(11px,3.8cqmin,14px)]">
                        {entity.name}
                    </span>
                    {#if options?.showState !== false}
                        <span class="shrink-0 text-[clamp(10px,3.4cqmin,12px)] text-m3-on-surface-variant">
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

    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Collection Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>
