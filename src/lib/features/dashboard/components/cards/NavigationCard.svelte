<script lang="ts">
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { getDomain } from "$lib/utils/entity";
    import type {
        DashboardCardSurfaceStyle,
        DashboardImageAttribution,
        NavigationCardShortcut,
    } from "$lib/types/dashboard";
    import {
        getCardSurfaceClasses,
        getCardSurfaceStyle,
    } from "$lib/features/dashboard/utils/cardSurface";
    import IconEdit from "~icons/material-symbols/edit";
    import IconInfo from "~icons/material-symbols/info";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import AuthenticatedImage from "$lib/components/common/AuthenticatedImage.svelte";
    import { withBase } from "$lib/utils/appBase";

    interface Props {
        id?: string;
        name: string;
        subtitle?: string;
        path?: string;
        icon?: string;
        iconType?: "icon" | "image";
        imageUrl?: string;
        imageAttribution?: DashboardImageAttribution;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        shortcuts?: NavigationCardShortcut[];
        entityId?: string;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        name = $bindable(),
        subtitle = $bindable(),
        path = $bindable(),
        icon = $bindable(),
        iconType = $bindable(),
        imageUrl = $bindable(),
        imageAttribution = $bindable(),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        shortcuts = $bindable(),
        entityId = $bindable(""),
        ondelete,
        class: className = "",
    }: Props = $props();

    // Base styles
    const baseStyles =
        "relative flex w-full h-full min-h-20 rounded-m3-card overflow-hidden transition-all duration-200 select-none group/card hover:border-m3-outline-variant/50";
    const summarySeparatorPattern = /\s+(?:-|\u00b7|\u00c2\u00b7)\s+/;

    // Dynamic background and text colors
    let cardStyle = $derived.by(() => {
        let styles = "";
        if (backgroundColor) {
            styles += getCardSurfaceStyle(surfaceStyle, backgroundColor);
        }
        styles += "color: var(--dashboard-card-readable-color, var(--color-m3-on-surface)); ";
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

    // Style for a shortcut icon
    function getShortcutStyle(isActive: boolean, customColor?: string) {
        // Background is now unified (20% opacity)
        const bgColor = isActive
            ? customColor || color || "var(--color-m3-primary)"
            : color || "var(--color-m3-on-surface-variant)";

        // Icon color changes based on state
        const iconColor = isActive
            ? customColor || color || "var(--color-m3-primary)"
            : "var(--color-m3-on-surface-variant)";

        return `background-color: color-mix(in srgb, ${bgColor} 20%, transparent); color: ${iconColor};`;
    }

    // Icon container styles
    let iconContainerStyle = $derived.by(() => {
        return getShortcutStyle(anyShortcutActive);
    });
    let displaySubtitle = $derived(subtitle || path || "Set path...");
    let subtitleParts = $derived.by(() =>
        displaySubtitle
            .replaceAll("\u00c2\u00b7", "\u00b7")
            .split(summarySeparatorPattern)
            .map((part) => part.trim())
            .filter(Boolean),
    );
    let attributionLabel = $derived.by(() => {
        if (!imageAttribution) return "";
        if (imageAttribution.provider === "unsplash") {
            return `Photo by ${imageAttribution.authorName || "Unsplash photographer"} on Unsplash`;
        }
        if (imageAttribution.authorName && imageAttribution.sourceName) {
            return `Photo by ${imageAttribution.authorName} on ${imageAttribution.sourceName}`;
        }
        return imageAttribution.sourceName || "";
    });
    let attributionUrl = $derived(
        imageAttribution?.sourceUrl || imageAttribution?.authorUrl || "",
    );
    let showAttribution = $derived(
        iconType === "image" && Boolean(imageUrl) && Boolean(attributionLabel),
    );

    // Get entity state for a shortcut
    function getShortcutState(entityId: string): boolean {
        const entity = haStore.getEntity(entityId);
        if (!entity) return false;

        const state = entity.state;
        return (
            state === "on" ||
            state === "open" ||
            state === "playing" ||
            state === "home" ||
            state === "above_horizon" ||
            state === "active" ||
            state === "locked"
        );
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
            subtitle: subtitle || "",
            path: path || "",
            icon: icon || "",
            iconType: iconType || "icon",
            imageUrl: imageUrl || "",
            imageAttribution,
            color: color || "",
            backgroundColor: backgroundColor || "",
            shortcuts: shortcuts || [],
            onSave: (newConfig) => {
                if (newConfig.type === "navigation") {
                    name = newConfig.name || "";
                    subtitle = (newConfig as any).subtitle || "";
                    path = newConfig.path || "";
                    icon = newConfig.icon || "";
                    iconType = newConfig.iconType || "icon";
                    imageUrl = newConfig.imageUrl || "";
                    imageAttribution = (newConfig as any).imageAttribution;
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

    function openAttribution(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        if (attributionUrl) {
            window.open(attributionUrl, "_blank", "noopener,noreferrer");
        }
    }
</script>

<a
    href={withBase(path || "#")}
    class="{baseStyles} {getCardSurfaceClasses(surfaceStyle)} {className} @container"
    class:readable-image-surface={iconType === "image" && Boolean(imageUrl)}
    style="container-type: size; {cardStyle}"
>
    {#if iconType === "image" && imageUrl}
        <!-- Full-bleed Image Mode -->
        <AuthenticatedImage
            src={imageUrl}
            alt={name}
            class="absolute inset-0 z-0 h-full w-full object-cover"
        />
        <div class="readable-edge-gradient-top absolute inset-x-0 top-0 z-10 h-[40%]"></div>
        <div class="readable-edge-gradient-bottom absolute inset-x-0 bottom-0 z-10 h-[58%]"></div>
        <div
            class="pointer-events-none relative z-20 flex h-full min-h-0 w-full flex-col justify-between gap-[clamp(0.45rem,3cqb,1.25rem)] p-[clamp(0.65rem,4cqmin,1.35rem)]"
        >
            <div class="flex min-w-0 items-start justify-between gap-[clamp(0.5rem,2.5cqmin,1rem)]">
                {#if dashboardEditorStore.isEditing}
                    <div
                        class="flex items-center justify-center size-[clamp(2.75rem,22cqmin,4.5rem)] rounded-full bg-white/12 backdrop-blur-[2px]"
                    >
                        <DynamicIcon
                            name={icon || "link"}
                            class="size-[58%] drop-shadow-lg {anyShortcutActive
                                ? ''
                                : 'text-white/70'}"
                            style={anyShortcutActive
                                ? `color: ${color || "var(--color-m3-primary)"}; `
                                : ""}
                        />
                    </div>
                {:else}
                    <button
                        class="flex items-center justify-center size-[clamp(2.75rem,22cqmin,4.5rem)] rounded-full cursor-pointer active:scale-95 transition-all duration-200 pointer-events-auto bg-white/12 backdrop-blur-[2px]"
                        onclick={toggleAllShortcuts}
                        title="Toggle all"
                    >
                        <DynamicIcon
                            name={icon || "link"}
                            class="size-[58%] drop-shadow-lg {anyShortcutActive
                                ? ''
                                : 'text-white/70'}"
                            style={anyShortcutActive
                                ? `color: ${color || "var(--color-m3-primary)"}; `
                                : ""}
                        />
                    </button>
                {/if}

                <div
                    class="flex max-w-[72%] shrink-0 flex-wrap items-start justify-end gap-[clamp(0.35rem,2cqmin,0.65rem)] pointer-events-auto"
                >
                    {#if shortcuts && shortcuts.length > 0 && !dashboardEditorStore.isEditing}
                        {#each shortcuts.slice(0, 3) as shortcut (shortcut.id)}
                            {@const isActive = getShortcutState(shortcut.entityId)}
                            <button
                                class="flex items-center justify-center size-[clamp(2rem,13cqmin,2.75rem)] flex-shrink-0 rounded-full transition-all duration-200 cursor-pointer active:scale-90 bg-white/12 backdrop-blur-[2px]"
                                onclick={(e) =>
                                    toggleShortcut(shortcut.entityId, e)}
                                title={shortcut.entityId}
                            >
                                <DynamicIcon
                                    name={getShortcutIcon(shortcut)}
                                    class="size-[58%] {isActive ? '' : 'text-white/70'}"
                                    style={isActive
                                        ? `color: ${shortcut.color || color || "var(--color-m3-primary)"}; `
                                        : ""}
                                />
                            </button>
                        {/each}
                    {/if}
                    <button
                        type="button"
                        class="touch-edit-control flex-shrink-0 size-[clamp(2rem,13cqmin,2.75rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity hover:brightness-110"
                        onclick={openConfig}
                        onpointerdown={(e) => e.stopPropagation()}
                        title="Edit Navigation"
                    >
                        <IconEdit class="size-[58%]" />
                    </button>
                </div>
            </div>

            <div
                class="readable-label-stack readable-on-image min-w-0"
                style:padding-left={showAttribution
                    ? "clamp(1.85rem,7cqmin,2.35rem)"
                    : "0"}
            >
                <span
                    class="block truncate text-[clamp(1rem,max(5.6cqb,1.9cqi),1.55rem)] font-bold leading-tight"
                >
                    {name || "Navigate"}
                </span>
                {#if subtitleParts.length > 0}
                    <div class="mt-[clamp(0.15rem,1.5cqmin,0.5rem)] flex min-w-0 flex-wrap gap-[clamp(0.2rem,1.5cqmin,0.5rem)] overflow-hidden">
                        {#each subtitleParts.slice(0, 3) as part}
                            <span
                                class="readable-chip max-w-full truncate rounded-m3-full px-[clamp(0.45rem,2cqmin,0.75rem)] py-[clamp(0.1rem,0.8cqmin,0.25rem)] text-[clamp(0.7rem,max(4.2cqb,1.1cqi),0.9rem)]"
                            >
                                {part}
                            </span>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {:else}
        <div
            class="relative z-10 flex h-full min-h-0 w-full flex-col justify-between gap-[clamp(0.45rem,3cqb,1.25rem)] p-[clamp(0.65rem,4cqmin,1.35rem)]"
        >
            <div class="flex min-w-0 items-start justify-between gap-[clamp(0.5rem,2.5cqmin,1rem)]">
                {#if dashboardEditorStore.isEditing}
                    <div
                        class="flex items-center justify-center size-[clamp(2.75rem,22cqmin,4.5rem)] rounded-full shrink-0 overflow-hidden"
                        style={iconContainerStyle}
                    >
                        <DynamicIcon name={icon || "link"} class="size-[60%]" />
                    </div>
                {:else}
                    <button
                        class="flex items-center justify-center size-[clamp(2.75rem,22cqmin,4.5rem)] rounded-full shrink-0 transition-all duration-200 overflow-hidden cursor-pointer active:scale-95 pointer-events-auto"
                        style={iconContainerStyle}
                        onclick={toggleAllShortcuts}
                        title="Toggle all"
                    >
                        <DynamicIcon name={icon || "link"} class="size-[60%]" />
                    </button>
                {/if}

                <div class="flex max-w-[72%] shrink-0 flex-wrap items-start justify-end gap-[clamp(0.35rem,2cqmin,0.65rem)] pointer-events-auto">
                    {#if shortcuts && shortcuts.length > 0 && !dashboardEditorStore.isEditing}
                        {#each shortcuts.slice(0, 3) as shortcut (shortcut.id)}
                            {@const isActive = getShortcutState(shortcut.entityId)}
                            <button
                                class="flex items-center justify-center size-[clamp(2rem,13cqmin,2.75rem)] rounded-full transition-all duration-200 cursor-pointer active:scale-90 overflow-hidden"
                                style={getShortcutStyle(isActive, shortcut.color)}
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
                    {/if}
                    <button
                        type="button"
                        class="touch-edit-control flex-shrink-0 size-[clamp(2rem,13cqmin,2.75rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity hover:brightness-110"
                        onclick={openConfig}
                        onpointerdown={(e) => e.stopPropagation()}
                        title="Edit Navigation"
                    >
                        <IconEdit class="size-[58%]" />
                    </button>
                </div>
            </div>

            <div class="min-w-0 pointer-events-none">
                <span
                    class="block truncate text-[clamp(1rem,max(5.6cqb,1.9cqi),1.55rem)] font-bold leading-tight"
                >
                    {name || "Navigate"}
                </span>
                {#if subtitleParts.length > 1}
                    <div class="mt-[clamp(0.15rem,1.2cqmin,0.55rem)] flex min-w-0 flex-wrap gap-[clamp(0.2rem,1cqmin,0.5rem)] overflow-hidden">
                        {#each subtitleParts.slice(0, 3) as part}
                            <span
                                class="max-w-full truncate rounded-m3-full bg-m3-surface-container-high px-[clamp(0.45rem,2cqmin,0.75rem)] py-[clamp(0.1rem,0.6cqmin,0.25rem)] text-[clamp(0.7rem,max(4.2cqb,1.1cqi),0.9rem)] text-m3-on-surface-variant"
                            >
                                {part}
                            </span>
                        {/each}
                    </div>
                {:else}
                    <span
                        class="mt-[clamp(0.15rem,1cqmin,0.45rem)] block truncate text-[clamp(0.78rem,max(4.4cqb,1.25cqi),1rem)] leading-tight opacity-75"
                    >
                        {displaySubtitle}
                    </span>
                {/if}
            </div>
        </div>
    {/if}

    {#if showAttribution}
        <button
            type="button"
            class="group/credit absolute bottom-[clamp(0.6rem,3cqmin,1rem)] left-[clamp(0.6rem,3cqmin,1rem)] z-30 flex size-[clamp(1.55rem,6cqmin,2rem)] items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary pointer-events-auto"
            onclick={openAttribution}
            aria-label={attributionUrl
                ? `${attributionLabel}. Open attribution link.`
                : attributionLabel}
        >
            <IconInfo class="size-[62%]" />
            <span
                class="pointer-events-none absolute bottom-full left-0 mb-2 max-w-[min(16rem,70cqw)] rounded-m3-sm bg-m3-inverse-surface px-3 py-2 text-left text-m3-label-small text-m3-inverse-on-surface opacity-0 shadow-m3-2 transition-opacity group-hover/credit:opacity-100 group-focus-visible/credit:opacity-100"
            >
                {attributionLabel}
            </span>
        </button>
    {/if}

</a>
