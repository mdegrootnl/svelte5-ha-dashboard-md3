<script lang="ts">
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { haStore, getDomain } from "$lib";
    import type { NavigationCardShortcut } from "$lib/types/dashboard";
    import IconEdit from "~icons/material-symbols/edit";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";

    interface Props {
        id?: string;
        name: string;
        path?: string;
        icon?: string;
        iconType?: "icon" | "image";
        imageUrl?: string;
        color?: string;
        backgroundColor?: string;
        shortcuts?: NavigationCardShortcut[];
        entityId?: string;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        name = $bindable(),
        path = $bindable(),
        icon = $bindable(),
        iconType = $bindable(),
        imageUrl = $bindable(),
        color = $bindable(),
        backgroundColor = $bindable(),
        shortcuts = $bindable(),
        entityId = $bindable(""),
        ondelete,
        class: className = "",
    }: Props = $props();

    // Base styles
    const baseStyles =
        "relative flex w-full h-full min-h-20 rounded-m3-md overflow-hidden transition-all duration-200 select-none group";

    // Dynamic background and text colors
    let cardStyle = $derived.by(() => {
        let styles = "";
        if (backgroundColor) {
            styles += `background-color: ${backgroundColor}; `;
        } else {
            styles +=
                "background-color: var(--color-m3-surface-container-highest); ";
        }
        styles += "color: var(--color-m3-on-surface); ";
        return styles;
    });

    // Check if any shortcut is active
    let anyShortcutActive = $derived.by(() => {
        if (!shortcuts || shortcuts.length === 0) return false;
        return shortcuts.some((s) => {
            const entity = haStore.getEntity(s.entityId);
            return entity?.state === "on";
        });
    });

    // Icon container styles
    let iconContainerStyle = $derived.by(() => {
        const baseColor = anyShortcutActive
            ? color || "var(--color-m3-primary)"
            : color || "var(--color-m3-on-surface-variant)";
        const opacity = anyShortcutActive ? "25%" : "15%";
        return `background-color: color-mix(in srgb, ${baseColor} ${opacity}, transparent); color: ${baseColor};`;
    });

    // Get entity state for a shortcut
    function getShortcutState(entityId: string): boolean {
        const entity = haStore.getEntity(entityId);
        return entity?.state === "on";
    }

    // Get icon for shortcut (custom or domain-based)
    function getShortcutIcon(shortcut: NavigationCardShortcut): string {
        if (shortcut.icon) return shortcut.icon;
        const domain = getDomain(shortcut.entityId);
        switch (domain) {
            case "light":
                return "lightbulb";
            case "switch":
                return "toggle_on";
            case "cover":
                return "blinds";
            case "media_player":
                return "tv";
            case "fan":
                return "mode_fan";
            case "climate":
                return "thermostat";
            default:
                return "power_settings_new";
        }
    }

    // Toggle a single shortcut entity
    function toggleShortcut(entityId: string, e: Event) {
        e.preventDefault();
        e.stopPropagation();
        const domain = getDomain(entityId);
        haStore.callService(domain, "toggle", { entity_id: entityId });
    }

    // Toggle ALL shortcut entities
    function toggleAllShortcuts(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        if (!shortcuts || shortcuts.length === 0) return;

        // If any is on, turn all off. Otherwise, turn all on.
        const targetState = anyShortcutActive ? "turn_off" : "turn_on";

        for (const shortcut of shortcuts) {
            const domain = getDomain(shortcut.entityId);
            haStore.callService(domain, targetState, {
                entity_id: shortcut.entityId,
            });
        }

        // Also toggle main entity if it exists and is not already in shortcuts
        if (entityId && !shortcuts.some((s) => s.entityId === entityId)) {
            const domain = getDomain(entityId);
            haStore.callService(domain, targetState, {
                entity_id: entityId,
            });
        }
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        e.preventDefault();
        cardEditorStore.open({
            id: id,
            type: "navigation",
            entityId: "",
            name: name || "",
            path: path || "",
            icon: icon || "",
            iconType: iconType || "icon",
            imageUrl: imageUrl || "",
            color: color || "",
            backgroundColor: backgroundColor || "",
            shortcuts: shortcuts || [],
            onSave: (newConfig) => {
                if (newConfig.type === "navigation") {
                    name = newConfig.name || "";
                    path = newConfig.path || "";
                    icon = newConfig.icon || "";
                    iconType = newConfig.iconType || "icon";
                    imageUrl = newConfig.imageUrl || "";
                    color = newConfig.color || "";
                    backgroundColor = newConfig.backgroundColor || "";
                    shortcuts = (newConfig as any).shortcuts || [];
                }
            },
            onDelete: ondelete,
        });
    }

    function handleCardClick() {
        // Navigation happens via the <a> href - this is just for the button interactivity
    }
</script>

<a href={path} class="{baseStyles} {className} @container" style={cardStyle}>
    {#if iconType === "image" && imageUrl}
        <!-- Full-bleed Image Mode -->
        <img
            src={imageUrl}
            alt={name}
            class="absolute inset-0 w-full h-full object-cover z-0"
        />
        <!-- Dark overlay for visibility -->
        <div class="absolute inset-0 bg-black/40 z-10"></div>
        <!-- Content overlay -->
        <div
            class="relative z-20 flex w-full h-full p-[4cqmin] pointer-events-none"
        >
            <!-- Left side: Label + Icon -->
            <div class="flex flex-col flex-1 justify-between min-w-0">
                <span
                    class="text-[9cqmin] font-bold leading-tight text-white drop-shadow-lg"
                >
                    {name || "Navigate"}
                </span>
                <!-- Center icon (toggles all) -->
                <button
                    class="flex items-center justify-center size-[35cqmin] rounded-full bg-white/20 backdrop-blur-sm cursor-pointer active:scale-95 transition-transform pointer-events-auto"
                    onclick={toggleAllShortcuts}
                    title="Toggle all"
                >
                    <DynamicIcon
                        name={icon || "link"}
                        class="size-[55%] text-white drop-shadow-lg"
                    />
                </button>
            </div>

            <!-- Right side: Shortcut buttons -->
            {#if shortcuts && shortcuts.length > 0}
                <div
                    class="flex flex-col gap-[2cqmin] justify-center items-center pointer-events-auto"
                >
                    {#each shortcuts as shortcut (shortcut.id)}
                        {@const isActive = getShortcutState(shortcut.entityId)}
                        <button
                            class="flex items-center justify-center size-[12cqmin] rounded-full transition-all duration-200 cursor-pointer active:scale-90
                                   {isActive
                                ? 'bg-white text-m3-primary'
                                : 'bg-white/20 text-white'}"
                            style={isActive && shortcut.color
                                ? `color: ${shortcut.color} !important;`
                                : ""}
                            onclick={(e) =>
                                toggleShortcut(shortcut.entityId, e)}
                            title={shortcut.entityId}
                        >
                            <DynamicIcon
                                name={getShortcutIcon(shortcut)}
                                class="size-[55%]"
                            />
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {:else}
        <!-- Icon Mode (original layout) -->
        <div class="relative z-10 flex w-full h-full px-[4cqmin] gap-[4cqmin]">
            <!-- Left section: Icon + Text -->
            <div
                class="flex items-center flex-1 gap-[4cqmin] pointer-events-none"
            >
                <!-- Icon Circle (toggles all) -->
                <button
                    class="flex items-center justify-center size-[18cqmin] rounded-full shrink-0 transition-all duration-200 overflow-hidden cursor-pointer active:scale-95 pointer-events-auto"
                    style={iconContainerStyle}
                    onclick={toggleAllShortcuts}
                    title="Toggle all"
                >
                    <DynamicIcon name={icon || "link"} class="size-[60%]" />
                </button>

                <!-- Text Stack -->
                <div
                    class="flex flex-col flex-1 justify-center min-w-0 pointer-events-none"
                >
                    <span
                        class="text-[clamp(11px,5cqmin,18px)] font-bold leading-tight truncate"
                    >
                        {name || "Navigate"}
                    </span>
                    <span
                        class="text-[clamp(10px,4cqmin,14px)] opacity-70 leading-tight truncate"
                    >
                        {path || "Set path..."}
                    </span>
                </div>
            </div>

            <!-- Right side: Shortcut buttons -->
            {#if shortcuts && shortcuts.length > 0}
                <div class="flex gap-[2cqmin] items-center pointer-events-auto">
                    {#each shortcuts as shortcut (shortcut.id)}
                        {@const isActive = getShortcutState(shortcut.entityId)}
                        <button
                            class="flex items-center justify-center size-[8cqmin] rounded-full transition-all duration-200 cursor-pointer active:scale-90
                                       {isActive
                                ? 'bg-m3-primary text-m3-on-primary'
                                : 'bg-m3-surface-container-highest text-m3-on-surface'}"
                            style={isActive && shortcut.color
                                ? `background-color: ${shortcut.color} !important; color: white !important;`
                                : ""}
                            onclick={(e) =>
                                toggleShortcut(shortcut.entityId, e)}
                            title={shortcut.entityId}
                        >
                            <DynamicIcon
                                name={getShortcutIcon(shortcut)}
                                class="size-[60%]"
                            />
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}

    <!-- Edit FAB -->
    <button
        class="absolute top-1 right-1 p-1.5 rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-30 hover:brightness-110 pointer-events-auto"
        onclick={openConfig}
        title="Edit Navigation"
    >
        <IconEdit class="size-4" />
    </button>
</a>
