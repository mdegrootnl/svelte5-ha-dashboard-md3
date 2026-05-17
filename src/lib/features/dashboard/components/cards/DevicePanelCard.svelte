<script lang="ts">
    import { executeCardAction } from "$lib/domain/cardActions";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { inventoryStore } from "$lib/stores/inventory.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { getDomain } from "$lib/utils/entity";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { CardAction, DevicePanelCardOptions } from "$lib/types";
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
        options?: DevicePanelCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("developer_board"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ preset: "auto" }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let smartOptions = $derived(inventoryStore.smartDevicePanelOptions(options, entityId));
    let targetEntityId = $derived(smartOptions.entityId || entityId || smartOptions.entityIds?.[0] || "");
    let entity = $derived(targetEntityId ? haStore.getEntity(targetEntityId) : null);
    let domain = $derived(targetEntityId ? getDomain(targetEntityId) : "");
    let preset = $derived(smartOptions.preset && smartOptions.preset !== "auto" ? smartOptions.preset : domain || "device");

    function domainIcon(domain: string) {
        switch (domain) {
            case "cover":
                return "blinds";
            case "fan":
                return "mode_fan";
            case "vacuum":
                return "cleaning_services";
            case "timer":
                return "timer";
            case "todo":
                return "checklist";
            case "switch":
                return "toggle_on";
            case "button":
                return "buttons_alt";
            default:
                return "developer_board";
        }
    }

    function defaultActions(): CardAction[] {
        if (preset === "cover") {
            return [
                { id: "open", icon: "keyboard_arrow_up", label: "Open", service: "open_cover" },
                { id: "stop", icon: "stop", label: "Stop", service: "stop_cover" },
                { id: "close", icon: "keyboard_arrow_down", label: "Close", service: "close_cover" },
            ];
        }
        if (preset === "fan" || preset === "purifier") {
            return [
                { id: "toggle", icon: "mode_fan", label: "Toggle", service: "toggle" },
                { id: "low", icon: "air", label: "Low", service: "set_percentage", serviceData: { percentage: 33 } },
                { id: "high", icon: "airwave", label: "High", service: "set_percentage", serviceData: { percentage: 100 } },
            ];
        }
        if (preset === "vacuum") {
            return [
                { id: "start", icon: "play_arrow", label: "Start", service: "start" },
                { id: "pause", icon: "pause", label: "Pause", service: "pause" },
                { id: "dock", icon: "home", label: "Dock", service: "return_to_base" },
            ];
        }
        if (preset === "timer") {
            return [
                { id: "start", icon: "play_arrow", label: "Start", service: "start" },
                { id: "pause", icon: "pause", label: "Pause", service: "pause" },
                { id: "cancel", icon: "close", label: "Cancel", service: "cancel" },
            ];
        }
        return [
            { id: "toggle", icon: "power_settings_new", label: "Toggle", service: "toggle" },
        ];
    }

    let actions = $derived(smartOptions.actions && smartOptions.actions.length > 0 ? smartOptions.actions : defaultActions());

    function runAction(action: CardAction, e: Event) {
        e.stopPropagation();
        executeCardAction({ ...action, domain: action.domain || domain }, targetEntityId);
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "device_panel",
            options: { device_panel: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "developer_board";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { device_panel?: DevicePanelCardOptions })?.device_panel || options;
            },
            onDelete: ondelete,
        });
    }
</script>

<article
    class="relative h-full w-full rounded-m3-card text-m3-on-surface overflow-hidden group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
>
    <div class="h-full flex flex-col p-[clamp(0.625rem,4cqmin,1.5rem)] gap-[clamp(0.375rem,3cqmin,1rem)]">
        <header class="flex items-center gap-[clamp(0.375rem,3cqmin,1rem)]">
            <div
                class="size-[clamp(2.5rem,24cqmin,4.75rem)] rounded-m3-full flex items-center justify-center shrink-0"
                style:background-color={color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--color-m3-tertiary-container)"}
                style:color={color || "var(--color-m3-tertiary)"}
            >
                <DynamicIcon name={icon || domainIcon(domain)} class="size-[58%]" />
            </div>
            <div class="min-w-0">
                <h3 class="text-[clamp(14px,5cqmin,20px)] font-bold leading-tight truncate">
                    {name || entity?.attributes.friendly_name || "Device"}
                </h3>
                <p class="text-[clamp(10px,3.4cqmin,13px)] text-m3-on-surface-variant truncate capitalize">
                    {preset} - {entity?.state || "not configured"}
                </p>
            </div>
        </header>

        <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.5cqmin,1rem)] flex-1 min-h-0">
            <div class="grid grid-cols-3 gap-[clamp(0.25rem,2cqmin,0.75rem)] h-full">
                {#each actions.slice(0, 6) as action (action.id)}
                    <button
                        class="rounded-m3-md bg-m3-surface-container-highest text-m3-on-surface flex flex-col items-center justify-center gap-[clamp(0.125rem,1.2cqmin,0.375rem)] hover:bg-m3-surface-container transition-colors active:scale-95 min-h-0 p-[clamp(0.25rem,1.5cqmin,0.625rem)]"
                        onclick={(e) => runAction(action, e)}
                        title={action.label || action.id}
                    >
                        <DynamicIcon name={action.icon || "radio_button_unchecked"} class="size-[clamp(1rem,5cqmin,1.75rem)]" />
                        <span class="text-[clamp(0.5625rem,2.8cqmin,0.8125rem)] truncate max-w-full px-[clamp(0.125rem,1cqmin,0.375rem)]">{action.label || action.id}</span>
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Device Panel"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>
