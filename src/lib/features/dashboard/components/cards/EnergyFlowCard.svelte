<script lang="ts">
    import { buildSmartEnergyOptions, cardEditorStore, haRegistryStore, haStore } from "$lib";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { EnergyCardOptions } from "$lib/types";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        options?: EnergyCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("electric_bolt"),
        color = $bindable(),
        backgroundColor = $bindable(),
        options = $bindable({ source: "auto" }),
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

    let smartOptions = $derived(buildSmartEnergyOptions(context, options));
    let title = $derived(name || "Energy Flow");

    function value(entityId?: string) {
        if (!entityId) return "--";
        const entity = haStore.getEntity(entityId);
        if (!entity) return "--";
        const unit = typeof entity.attributes.unit_of_measurement === "string" ? entity.attributes.unit_of_measurement : "";
        return `${entity.state}${unit}`;
    }

    function node(label: string, iconName: string, entityId?: string) {
        return {
            label,
            iconName,
            value: value(entityId),
            missing: !entityId,
        };
    }

    let nodes = $derived([
        node("Solar", "solar_power", smartOptions.solarPowerEntityId),
        node("Home", "home", smartOptions.homePowerEntityId || entityId),
        node("Grid", "power", smartOptions.gridImportEntityId || smartOptions.gridExportEntityId),
        node("Battery", "battery_charging_full", smartOptions.batteryPowerEntityId),
    ]);

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "energy",
            options: { energy: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "electric_bolt";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { energy?: EnergyCardOptions })?.energy || options;
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
                style:background-color={color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--color-m3-tertiary-container)"}
                style:color={color || "var(--color-m3-tertiary)"}
            >
                <DynamicIcon name={icon || "electric_bolt"} class="size-[58%]" />
            </div>
            <div class="min-w-0">
                <h3 class="text-[clamp(14px,5cqmin,20px)] font-bold leading-tight truncate">
                    {title}
                </h3>
                <p class="text-[clamp(10px,3.4cqmin,13px)] text-m3-on-surface-variant">
                    {value(smartOptions.todayEnergyEntityId)} today
                </p>
            </div>
        </header>

        <div class="grid grid-cols-2 gap-[clamp(0.25rem,2.4cqmin,0.75rem)] flex-1 min-h-0">
            {#each nodes as item (item.label)}
                <div
                    class="relative rounded-m3-md bg-m3-surface-container-high p-[clamp(0.5rem,3cqmin,1rem)] flex flex-col justify-between min-h-0 overflow-hidden"
                    class:opacity-55={item.missing}
                >
                    <div class="flex items-center justify-between gap-[clamp(0.25rem,2cqmin,0.625rem)]">
                        <span class="text-[clamp(0.625rem,2.9cqmin,0.8125rem)] text-m3-on-surface-variant truncate">{item.label}</span>
                        <DynamicIcon name={item.iconName} class="size-[clamp(0.875rem,3.4cqmin,1.25rem)] text-m3-on-surface-variant" />
                    </div>
                    <span class="text-[clamp(14px,5cqmin,22px)] font-bold truncate">
                        {item.value}
                    </span>
                </div>
            {/each}
        </div>

        <div class="flex items-center gap-[clamp(0.25rem,2cqmin,0.75rem)] text-[clamp(0.625rem,2.9cqmin,0.8125rem)] text-m3-on-surface-variant">
            <span>Gas {value(smartOptions.gasEntityId)}</span>
            <span class="text-m3-outline">/</span>
            <span>Water {value(smartOptions.waterEntityId)}</span>
        </div>
    </div>

    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Energy Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>
