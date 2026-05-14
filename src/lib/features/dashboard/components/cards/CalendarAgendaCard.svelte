<script lang="ts">
    import { cardEditorStore, haRegistryStore, haStore, resolveEntityQuery } from "$lib";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { CalendarCardOptions } from "$lib/types";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        options?: CalendarCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("calendar_month"),
        color = $bindable(),
        backgroundColor = $bindable(),
        options = $bindable({ source: "auto", maxEvents: 4, daysToShow: 7 }),
        ondelete,
        class: className = "",
    }: Props = $props();

    type StoreEntity = NonNullable<ReturnType<typeof haStore.getEntity>>;

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

    let calendarIds = $derived.by(() => {
        if (options?.entityIds && options.entityIds.length > 0) return options.entityIds;
        if (entityId) return [entityId];
        return resolveEntityQuery(context, { domains: ["calendar"], limit: options?.maxEvents ?? 4 })
            .map((item) => item.entityId);
    });

    let calendars = $derived(
        calendarIds.map((id) => haStore.getEntity(id)).filter(isStoreEntity),
    );

    function eventTitle(entity: StoreEntity) {
        return String(entity.attributes.message || entity.attributes.friendly_name || entity.entity_id);
    }

    function eventTime(entity: StoreEntity) {
        const start = entity.attributes.start_time || entity.attributes.start;
        if (typeof start !== "string") return entity.state;
        return new Date(start).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "calendar",
            options: { calendar: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "calendar_month";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { calendar?: CalendarCardOptions })?.calendar || options;
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
                style:background-color={color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--color-m3-primary-container)"}
                style:color={color || "var(--color-m3-primary)"}
            >
                <DynamicIcon name={icon || "calendar_month"} class="size-[58%]" />
            </div>
            <div class="min-w-0">
                <h3 class="text-[clamp(14px,5cqmin,20px)] font-bold leading-tight truncate">
                    {name || "Agenda"}
                </h3>
                <p class="text-[clamp(10px,3.4cqmin,13px)] text-m3-on-surface-variant">
                    Next {options?.daysToShow ?? 7} days
                </p>
            </div>
        </header>

        <div class="flex-1 min-h-0 flex flex-col gap-[clamp(0.25rem,2cqmin,0.75rem)] overflow-hidden">
            {#each calendars.slice(0, options?.maxEvents ?? 4) as calendar (calendar.entity_id)}
                <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.5rem,3cqmin,1rem)] flex items-center gap-[clamp(0.375rem,3cqmin,1rem)] min-h-0">
                    <div class="size-[clamp(2rem,14cqmin,3.25rem)] rounded-m3-full bg-m3-secondary-container text-m3-on-secondary-container flex items-center justify-center shrink-0">
                        <DynamicIcon name="event" class="size-[58%]" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <span class="block text-[clamp(0.75rem,3.5cqmin,1rem)] font-medium truncate">{eventTitle(calendar)}</span>
                        <span class="block text-[clamp(0.625rem,2.9cqmin,0.8125rem)] text-m3-on-surface-variant truncate">{eventTime(calendar)}</span>
                    </div>
                </div>
            {:else}
                <div class="flex-1 flex items-center justify-center text-center text-[clamp(0.75rem,3.2cqmin,0.95rem)] text-m3-on-surface-variant px-[clamp(0.5rem,3cqmin,1rem)]">
                    No calendar entities found
                </div>
            {/each}
        </div>
    </div>

    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Calendar Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>
