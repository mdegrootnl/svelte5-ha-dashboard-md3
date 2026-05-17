<script lang="ts">
    import { executeCardAction } from "$lib/domain/cardActions";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { inventoryStore } from "$lib/stores/inventory.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { CardAction, RemoteCardOptions } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import {
        getCardSurfaceClasses,
        getCardSurfaceStyle,
    } from "$lib/features/dashboard/utils/cardSurface";
    import { getDomain } from "$lib/utils/entity";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: RemoteCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("remote_gen"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ preset: "tv" }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let smartOptions = $derived(inventoryStore.smartRemoteOptions(options, entityId));
    let controlledEntityId = $derived(smartOptions.mediaPlayerEntityId || smartOptions.remoteEntityId || entityId);
    let controlledEntity = $derived(controlledEntityId ? haStore.getEntity(controlledEntityId) : null);
    let remoteEntity = $derived(smartOptions.remoteEntityId ? haStore.getEntity(smartOptions.remoteEntityId) : null);
    let controlledLabel = $derived(getEntityLabel(controlledEntityId, controlledEntity));
    let remoteLabel = $derived(getEntityLabel(smartOptions.remoteEntityId ?? "", remoteEntity));
    let stateLabel = $derived(controlledEntity?.state ?? remoteEntity?.state ?? "");

    const defaultActions: CardAction[] = [
        { id: "power", icon: "power_settings_new", label: "Power", service: "toggle" },
        { id: "up", icon: "keyboard_arrow_up", label: "Up", domain: "remote", service: "send_command", serviceData: { command: "DPAD_UP" } },
        { id: "left", icon: "keyboard_arrow_left", label: "Left", domain: "remote", service: "send_command", serviceData: { command: "DPAD_LEFT" } },
        { id: "select", icon: "check", label: "Select", domain: "remote", service: "send_command", serviceData: { command: "DPAD_CENTER" } },
        { id: "right", icon: "keyboard_arrow_right", label: "Right", domain: "remote", service: "send_command", serviceData: { command: "DPAD_RIGHT" } },
        { id: "down", icon: "keyboard_arrow_down", label: "Down", domain: "remote", service: "send_command", serviceData: { command: "DPAD_DOWN" } },
        { id: "volume_down", icon: "volume_down", label: "Volume down", domain: "media_player", service: "volume_down" },
        { id: "volume_up", icon: "volume_up", label: "Volume up", domain: "media_player", service: "volume_up" },
    ];

    let actions = $derived(smartOptions.actions && smartOptions.actions.length > 0 ? smartOptions.actions : defaultActions);

    function getEntityLabel(id: string, entity: ReturnType<typeof haStore.getEntity> | null) {
        const friendlyName = entity?.attributes.friendly_name;
        if (typeof friendlyName === "string" && friendlyName.length > 0) return friendlyName;
        return id;
    }

    function fallbackForAction(action: CardAction) {
        if (action.domain === "remote") {
            return smartOptions.remoteEntityId || (getDomain(controlledEntityId) === "remote" ? controlledEntityId : "");
        }
        if (action.domain === "media_player") {
            return smartOptions.mediaPlayerEntityId || (getDomain(controlledEntityId) === "media_player" ? controlledEntityId : "");
        }
        return controlledEntityId;
    }

    function canRunAction(action: CardAction) {
        return !!action.entityId || !!fallbackForAction(action);
    }

    function runAction(action: CardAction, e: Event) {
        e.stopPropagation();
        if (!canRunAction(action)) return;
        executeCardAction(action, fallbackForAction(action));
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "remote",
            options: { remote: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "remote_gen";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { remote?: RemoteCardOptions })?.remote || options;
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
                style:background-color={color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--color-m3-primary-container)"}
                style:color={color || "var(--color-m3-primary)"}
            >
                <DynamicIcon name={icon || "remote_gen"} class="size-[58%]" />
            </div>
            <div class="min-w-0">
                <h3 class="text-[clamp(0.95rem,max(6.5cqb,1.8cqi),1.35rem)] font-bold leading-tight truncate">
                    {name || controlledLabel || "Remote"}
                </h3>
                <p
                    class="text-[clamp(0.8125rem,max(4.8cqb,1.2cqi),0.95rem)] text-m3-on-surface-variant truncate"
                    title={controlledEntityId ? `Controls ${controlledEntityId}` : "No controlled entity selected"}
                >
                    {controlledLabel ? `Controls ${controlledLabel}` : "No controlled entity"}
                    {stateLabel ? ` - ${stateLabel}` : ""}
                </p>
                {#if remoteLabel && smartOptions.remoteEntityId && smartOptions.remoteEntityId !== controlledEntityId}
                    <p
                        class="text-[clamp(0.75rem,max(4.2cqb,1.1cqi),0.875rem)] text-m3-on-surface-variant/80 truncate"
                        title={`Remote entity ${smartOptions.remoteEntityId}`}
                    >
                        via {remoteLabel}
                    </p>
                {/if}
            </div>
        </header>

        <div class="grid grid-cols-4 justify-items-center gap-[clamp(0.25rem,2.4cqmin,0.75rem)] mt-auto min-h-0">
            {#each actions.slice(0, 8) as action (action.id)}
                <button
                    class="size-[clamp(2rem,min(16cqb,14cqi),3.25rem)] rounded-m3-full bg-m3-surface-container-high text-m3-on-surface flex items-center justify-center hover:bg-m3-surface-container transition-colors active:scale-95 disabled:opacity-40 disabled:hover:bg-m3-surface-container-high disabled:active:scale-100"
                    onclick={(e) => runAction(action, e)}
                    disabled={!canRunAction(action)}
                    title={canRunAction(action)
                        ? `${action.label || action.id} - ${action.entityId || fallbackForAction(action)}`
                        : `${action.label || action.id} unavailable`}
                >
                    <DynamicIcon name={action.icon || "radio_button_unchecked"} class="size-[50%]" />
                </button>
            {/each}
        </div>
    </div>

    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Remote Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>
