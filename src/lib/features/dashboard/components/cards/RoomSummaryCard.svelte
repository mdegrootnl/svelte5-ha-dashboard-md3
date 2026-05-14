<script lang="ts">
    import { cardEditorStore, executeCardAction, getDomain, getEntityName, haRegistryStore, haStore, isActiveState, resolveEntityQuery } from "$lib";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { RoomCardOptions } from "$lib/types";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        options?: RoomCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("meeting_room"),
        color = $bindable(),
        backgroundColor = $bindable(),
        options = $bindable({ source: "auto" }),
        ondelete,
        class: className = "",
    }: Props = $props();

    type StoreEntity = NonNullable<ReturnType<typeof haStore.getEntity>>;
    type RoomSection = NonNullable<RoomCardOptions["sections"]>[number];

    const DEFAULT_ROOM_DOMAINS = ["light", "switch", "fan", "cover", "climate", "media_player", "sensor", "binary_sensor"];
    const DEFAULT_ROOM_SECTIONS: RoomSection[] = ["lights", "climate", "media", "covers", "sensors", "health"];

    function isStoreEntity(item: ReturnType<typeof haStore.getEntity>): item is StoreEntity {
        return !!item;
    }

    let context = $derived({
        states: haStore.states,
        entities: haRegistryStore.entityRegistry,
        devices: haRegistryStore.deviceRegistry,
        areas: haRegistryStore.areas,
        floors: haRegistryStore.floors,
    });

    let areaName = $derived.by(() => {
        const area = haRegistryStore.areas.find((item) => item.area_id === options?.areaId);
        return name || area?.name || "Room";
    });

    let roomEntities = $derived.by(() => {
        const manualIds = options?.entityIds ?? [];
        if (manualIds.length > 0) {
            return manualIds
                .map((item) => haStore.getEntity(item))
                .filter(isStoreEntity);
        }

        const query =
            options?.source === "query"
                ? {
                      domains: DEFAULT_ROOM_DOMAINS,
                      limit: 12,
                      ...(options.query ?? {}),
                  }
                : {
                      domains: DEFAULT_ROOM_DOMAINS,
                      areaIds: options?.areaId ? [options.areaId] : undefined,
                      floorIds: options?.floorId ? [options.floorId] : undefined,
                      limit: options?.query?.limit ?? 12,
                  };

        return resolveEntityQuery(context, query).map((item) => haStore.getEntity(item.entityId)).filter(isStoreEntity);
    });

    let enabledSections = $derived(options?.sections && options.sections.length > 0 ? options.sections : DEFAULT_ROOM_SECTIONS);
    let activeCount = $derived(roomEntities.filter((item) => isActiveState(item.state)).length);
    let problemCount = $derived(roomEntities.filter((item) => item.state === "unavailable" || item.state === "unknown").length);
    let climate = $derived(roomEntities.find((item) => getDomain(item.entity_id) === "climate"));
    let media = $derived(roomEntities.find((item) => getDomain(item.entity_id) === "media_player"));
    let highlights = $derived(roomEntities.filter((item) => sectionIncludesDomain(getDomain(item.entity_id))).slice(0, 5));

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
            default:
                return "devices";
        }
    }

    function entityIcon(entity: StoreEntity) {
        const configuredIcon = entity.attributes.icon;
        if (typeof configuredIcon === "string" && !configuredIcon.startsWith("mdi:")) {
            return configuredIcon;
        }
        return domainIcon(getDomain(entity.entity_id));
    }

    function sectionIncludesDomain(domain: string) {
        if (["light", "switch", "fan"].includes(domain)) return enabledSections.includes("lights");
        if (domain === "cover") return enabledSections.includes("covers");
        if (domain === "climate") return enabledSections.includes("climate");
        if (domain === "media_player") return enabledSections.includes("media");
        if (["sensor", "binary_sensor"].includes(domain)) return enabledSections.includes("sensors");
        return true;
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "room",
            options: { room: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "meeting_room";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { room?: RoomCardOptions })?.room || options;
            },
            onDelete: ondelete,
        });
    }

    function runAction(actionId: string, e: Event) {
        e.stopPropagation();
        const action = options?.actions?.find((item) => item.id === actionId);
        if (action) executeCardAction(action, entityId);
    }
</script>

<article
    class="relative h-full w-full rounded-m3-card bg-m3-surface-container-highest text-m3-on-surface overflow-hidden group @container {className}"
    style={`container-type: size;${backgroundColor ? ` background-color: ${backgroundColor};` : ""}`}
>
    <div class="flex h-full flex-col gap-[clamp(0.375rem,4cqmin,1.25rem)] p-[clamp(0.625rem,5cqmin,1.75rem)]">
        <div class="flex items-start justify-between gap-[clamp(0.375rem,3cqmin,1rem)]">
            <div class="flex items-center gap-[clamp(0.375rem,3cqmin,1rem)] min-w-0">
                <div
                    class="size-[clamp(2.75rem,26cqmin,5.25rem)] rounded-m3-full flex items-center justify-center shrink-0"
                    style:background-color={color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--color-m3-primary-container)"}
                    style:color={color || "var(--color-m3-primary)"}
                >
                    <DynamicIcon name={icon || "meeting_room"} class="size-[58%]" />
                </div>
                <div class="min-w-0">
                    <h3 class="text-[clamp(15px,5cqmin,22px)] font-bold leading-tight truncate">
                        {areaName}
                    </h3>
                    <p class="text-[clamp(10px,3.4cqmin,13px)] text-m3-on-surface-variant truncate">
                        {activeCount} active - {roomEntities.length} entities
                    </p>
                </div>
            </div>
            {#if problemCount > 0}
                <span class="px-[clamp(0.375rem,2.6cqmin,0.75rem)] py-[clamp(0.125rem,1.4cqmin,0.375rem)] rounded-m3-full bg-m3-error-container text-m3-on-error-container text-[clamp(0.625rem,2.7cqmin,0.8125rem)] font-medium">
                    {problemCount}
                </span>
            {/if}
        </div>

        <div class="grid grid-cols-3 gap-[clamp(0.25rem,2.4cqmin,0.75rem)]">
            <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.8cqmin,0.875rem)]">
                <span class="block text-[clamp(0.625rem,2.8cqmin,0.8125rem)] text-m3-on-surface-variant">Climate</span>
                <span class="text-[clamp(0.75rem,3.8cqmin,1rem)] font-semibold truncate block">
                    {climate?.attributes.current_temperature ?? climate?.state ?? "--"}
                </span>
            </div>
            <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.8cqmin,0.875rem)]">
                <span class="block text-[clamp(0.625rem,2.8cqmin,0.8125rem)] text-m3-on-surface-variant">Media</span>
                <span class="text-[clamp(0.75rem,3.8cqmin,1rem)] font-semibold truncate block">
                    {media?.state ?? "--"}
                </span>
            </div>
            <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.8cqmin,0.875rem)]">
                <span class="block text-[clamp(0.625rem,2.8cqmin,0.8125rem)] text-m3-on-surface-variant">Health</span>
                <span class="text-[clamp(0.75rem,3.8cqmin,1rem)] font-semibold truncate block">
                    {problemCount === 0 ? "OK" : `${problemCount} issue${problemCount === 1 ? "" : "s"}`}
                </span>
            </div>
        </div>

        <div class="flex flex-wrap gap-[clamp(0.25rem,2.2cqmin,0.75rem)] min-h-0 overflow-hidden">
            {#each highlights as item (item.entity_id)}
                <span class="inline-flex items-center gap-[clamp(0.25rem,1.6cqmin,0.5rem)] max-w-full px-[clamp(0.375rem,2.5cqmin,0.875rem)] py-[clamp(0.125rem,1.4cqmin,0.375rem)] rounded-m3-full bg-m3-surface-container-high text-[clamp(0.625rem,2.9cqmin,0.8125rem)] text-m3-on-surface-variant">
                    <DynamicIcon name={entityIcon(item)} class="size-[clamp(0.75rem,3.2cqmin,1rem)] shrink-0" />
                    <span class="truncate">{getEntityName(item.entity_id, item.attributes)}</span>
                </span>
            {:else}
                <span class="text-m3-body-small text-m3-on-surface-variant">No room entities found</span>
            {/each}
        </div>

        {#if options?.actions && options.actions.length > 0}
            <div class="mt-auto flex gap-[clamp(0.25rem,2.4cqmin,0.75rem)]">
                {#each options.actions.slice(0, 4) as action (action.id)}
                    <button
                        class="size-[clamp(2.25rem,16cqmin,3.75rem)] rounded-m3-full bg-m3-secondary-container text-m3-on-secondary-container flex items-center justify-center hover:brightness-95"
                        onclick={(e) => runAction(action.id, e)}
                        title={action.label || action.id}
                    >
                        <DynamicIcon name={action.icon || "bolt"} class="size-[58%]" />
                    </button>
                {/each}
            </div>
        {/if}
    </div>

    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Room Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>
