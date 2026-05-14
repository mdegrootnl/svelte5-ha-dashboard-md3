<script lang="ts">
    import { buildSmartRemoteOptions, cardEditorStore, executeCardAction, haRegistryStore, haStore } from "$lib";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { CardAction, RemoteCardOptions } from "$lib/types";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
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
        options = $bindable({ preset: "tv" }),
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

    let smartOptions = $derived(buildSmartRemoteOptions(context, options, entityId));
    let targetEntityId = $derived(smartOptions.mediaPlayerEntityId || smartOptions.remoteEntityId || entityId);
    let entity = $derived(targetEntityId ? haStore.getEntity(targetEntityId) : null);

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

    function fallbackForAction(action: CardAction) {
        if (action.domain === "remote") return smartOptions.remoteEntityId || targetEntityId;
        if (action.domain === "media_player") return smartOptions.mediaPlayerEntityId || targetEntityId;
        return targetEntityId;
    }

    function runAction(action: CardAction, e: Event) {
        e.stopPropagation();
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
    class="relative h-full w-full rounded-m3-card bg-m3-surface-container-highest text-m3-on-surface overflow-hidden group @container {className}"
    style={`container-type: size;${backgroundColor ? ` background-color: ${backgroundColor};` : ""}`}
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
                <h3 class="text-[clamp(14px,5cqmin,20px)] font-bold leading-tight truncate">
                    {name || entity?.attributes.friendly_name || "Remote"}
                </h3>
                <p class="text-[clamp(10px,3.4cqmin,13px)] text-m3-on-surface-variant truncate">
                    {entity?.state || smartOptions.preset || "tv"}
                </p>
            </div>
        </header>

        <div class="grid grid-cols-4 gap-[clamp(0.25rem,2.4cqmin,0.75rem)] mt-auto">
            {#each actions.slice(0, 8) as action (action.id)}
                <button
                    class="aspect-square rounded-m3-full bg-m3-surface-container-high text-m3-on-surface flex items-center justify-center hover:bg-m3-surface-container transition-colors active:scale-95"
                    onclick={(e) => runAction(action, e)}
                    title={action.label || action.id}
                >
                    <DynamicIcon name={action.icon || "radio_button_unchecked"} class="size-[50%]" />
                </button>
            {/each}
        </div>
    </div>

    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Remote Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>
