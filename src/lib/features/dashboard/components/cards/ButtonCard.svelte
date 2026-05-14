<script lang="ts">
    import {
        type CardVariant,
        haStore,
        cardEditorStore,
        supportsBrightness,
        getDomain,
        getEntityName,
        calculatePercentage,
        shouldThrottle,
    } from "$lib";
    import IconEdit from "~icons/material-symbols/edit";
    import IconLightbulb from "~icons/material-symbols/lightbulb";
    import IconThermostat from "~icons/material-symbols/thermostat";
    import IconToggleOn from "~icons/material-symbols/toggle-on";
    import IconSensors from "~icons/material-symbols/sensors";
    import IconPlayCircle from "~icons/material-symbols/play-circle";
    import IconDevices from "~icons/material-symbols/devices";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";

    interface Props {
        id?: string;
        title?: string;
        state?: string;
        isActive?: boolean;
        variant?: CardVariant;
        value?: number; // 0-100 for slider
        icon?: string | any; // Material Symbol component or name string
        color?: string; // Optional color override
        backgroundColor?: string; // Optional background override
        onclick?: () => void;
        class?: string;

        // Smart/Config Props
        entityId: string;
        name: string;
        domainFilter: string;
        ondelete?: () => void;
    }

    let {
        id,
        title = $bindable(),
        state: displayState = $bindable(""),
        icon: iconProp = $bindable(),
        isActive = $bindable(false),
        variant = $bindable("switch"),
        value = $bindable(0),
        color = $bindable(),
        backgroundColor = $bindable(),
        onclick,
        class: className = "",
        entityId = $bindable(""),
        name = $bindable(""),
        domainFilter = $bindable(""),
        ondelete,
    }: Props = $props();

    // -- State Logic --
    // If entityId is present, we try to derive values from HA Store

    let entity = $derived(entityId ? haStore.getEntity(entityId) : null);

    $effect(() => {
        if (entity) {
            // Update Title
            title = name || getEntityName(entityId!, entity.attributes);

            // Auto-detect Slider capability
            if (
                entity.entity_id.startsWith("light.") &&
                supportsBrightness(entity.attributes)
            ) {
                if (variant !== "slider") {
                    variant = "slider";
                }
            }

            // Update State & Active
            if (entity.state === "on") {
                isActive = true;
                displayState = "On";
                if (variant === "switch") value = 100;
            } else if (entity.state === "off") {
                isActive = false;
                displayState = "Off";
                if (variant === "switch") value = 0;
            } else {
                displayState = entity.state;
                isActive =
                    entity.state !== "unavailable" &&
                    entity.state !== "unknown";
            }

            // Slider value from brightness if available
            if (
                variant === "slider" &&
                entity.attributes.brightness &&
                !isDragging
            ) {
                value = Math.round((entity.attributes.brightness / 255) * 100);
            }
        }
    });

    // -- Icon Logic --
    let effectiveIcon = $derived.by(() => {
        if (iconProp) return iconProp;

        if (entityId) {
            const domain = getDomain(entityId);
            switch (domain) {
                case "light":
                    return IconLightbulb;
                case "climate":
                    return IconThermostat;
                case "switch":
                case "input_boolean":
                    return IconToggleOn;
                case "sensor":
                case "binary_sensor":
                    return IconSensors;
                case "media_player":
                    return IconPlayCircle;
                default:
                    return IconDevices;
            }
        }

        return null;
    });

    // -- Styling --

    // Base styles: Standard card rounding (rounded-m3-md), flexible height (min-h-20), transition
    const baseStyles =
        "relative flex w-full h-full min-h-20 rounded-m3-md overflow-hidden transition-all duration-200 select-none group";

    // Dynamic background and text colors
    let cardStyle = $derived.by(() => {
        let styles = "";

        // Background
        if (backgroundColor) {
            styles += `background-color: ${backgroundColor}; `;
        } else if (isActive && variant === "switch") {
            const activeColor = color || "var(--color-m3-primary)";
            styles += `background-color: color-mix(in srgb, ${activeColor} 15%, transparent); `;
            styles += `box-shadow: inset 0 0 0 1px color-mix(in srgb, ${activeColor} 20%, transparent); `;
        } else {
            styles +=
                "background-color: var(--color-m3-surface-container-highest); ";
        }

        // Foreground (active state enhancement)
        if (isActive && variant === "switch") {
            const fgColor = color || "var(--color-m3-primary)";
            styles += `color: ${fgColor}; `;
        } else {
            styles += "color: var(--color-m3-on-surface); ";
        }

        return styles;
    });

    let interactiveStyles = $derived(
        onclick || variant === "switch"
            ? "cursor-pointer active:scale-[0.98] transition-transform"
            : "",
    );

    // Icon container styles - using color-mix for themed background
    let iconContainerStyle = $derived.by(() => {
        const baseColor = isActive
            ? color || "var(--color-m3-primary)"
            : "var(--color-m3-on-surface-variant)";

        const opacity = isActive ? "20%" : "10%";
        return `background-color: color-mix(in srgb, ${baseColor} ${opacity}, transparent); color: ${baseColor};`;
    });

    // -- Config Dialog --

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id: id,
            entityId: entityId || "",
            name: name || "",
            domainFilter: domainFilter || "",
            color: color,
            backgroundColor: backgroundColor,
            icon: typeof iconProp === "string" ? iconProp : "",
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                iconProp = newConfig.icon || "";
            },
            onDelete: ondelete,
        });
    }

    // -- Interaction --

    let isDragging = $state(false);
    let startX = 0;
    let startValue = 0;
    let didMove = false; // To distinguish click vs drag

    function handlePointerDown(e: PointerEvent) {
        if (variant !== "slider") return;

        // Prevent default text selection
        e.preventDefault();

        isDragging = true;
        startX = e.clientX;
        // visual start
        didMove = false;

        // If the user clicked directly on a specific point, maybe we SHOULD jump?
        // User asked: "Single clicking should turn off or on". "Click process... change percentage".
        // Use a threshold. If we move > 5px, it's a slide. If we just Up, it's a toggle.
        // We do NOT update value on Down.
    }

    let lastCallTime = 0;

    function handlePointerMove(e: PointerEvent) {
        if (!isDragging) return;

        const delta = e.clientX - startX;

        // Threshold check
        if (Math.abs(delta) > 5) {
            didMove = true;
        }

        if (didMove && cardElement) {
            value = calculatePercentage(e.clientX, cardElement);

            // Throttled service call
            if (!shouldThrottle(lastCallTime)) {
                handleBrightnessChange(value);
                lastCallTime = Date.now();
            }
        }
    }

    function handlePointerUp(e: PointerEvent) {
        if (!isDragging) return;
        isDragging = false;

        if (!didMove) {
            // It was a tap -> Toggle
            handleToggle();
        } else {
            // Finalize the drag value
            handleBrightnessChange(value);
        }
    }

    let lastToggleTime = 0;
    const TOGGLE_THROTTLE_MS = 500; // Prevent rapid toggle clicks

    function handleToggle() {
        // Rate limit toggle to prevent server flooding
        if (Date.now() - lastToggleTime < TOGGLE_THROTTLE_MS) {
            return;
        }
        lastToggleTime = Date.now();

        if (onclick) {
            onclick();
        }
        if (entityId) {
            const domain = getDomain(entityId);
            if (domain === "cover") {
                const service =
                    entity?.state === "open" || entity?.state === "opening"
                        ? "close_cover"
                        : "open_cover";
                haStore.callService(domain, service, { entity_id: entityId });
            } else if (domain === "button") {
                haStore.callService(domain, "press", { entity_id: entityId });
            } else if (domain === "scene" || domain === "script") {
                haStore.callService(domain, "turn_on", { entity_id: entityId });
            } else {
                haStore.callService(domain, "toggle", { entity_id: entityId });
            }
        }
    }

    function handleBrightnessChange(val: number) {
        if (entityId) {
            const domain = getDomain(entityId);
            if (domain === "light") {
                if (val === 0) {
                    haStore.callService(domain, "turn_off", {
                        entity_id: entityId,
                    });
                } else {
                    haStore.callService(domain, "turn_on", {
                        entity_id: entityId,
                        brightness_pct: val,
                    });
                }
            }
        }
    }

    // Explicit generic click handler for Switch mode
    function handleSwitchClick() {
        if (variant === "switch") handleToggle();
    }

    let cardElement: HTMLElement;
</script>

<svelte:window
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
/>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    bind:this={cardElement}
    class="{baseStyles} {interactiveStyles} {className} @container"
    onclick={handleSwitchClick}
    onpointerdown={handlePointerDown}
    role="button"
    tabindex="0"
    style="container-type: size; touch-action: none; {cardStyle}"
>
    <!-- Slider Progress Background (Visual) -->
    {#if variant === "slider"}
        <!-- Active Track -->
        <div
            class="absolute inset-y-0 left-0 transition-all duration-75"
            style="width: {value}%; background-color: {color ||
                'var(--color-m3-primary-container)'}; opacity: {isActive
                ? '0.4'
                : '0'};"
        ></div>
        <!-- Inactive/Background Track is handled by container bg-surface-container-highest -->
    {/if}

    <!-- Content Layer -->
    <div
        class="relative z-10 flex items-center w-full h-full px-[4cqmin] gap-[4cqmin] pointer-events-none"
    >
        <!-- Icon Circle -->
        <div
            class="flex items-center justify-center size-[clamp(2.5rem,24cqmin,4.75rem)] rounded-full shrink-0 transition-colors duration-200"
            style={iconContainerStyle}
        >
            {#if effectiveIcon}
                {#if typeof effectiveIcon === "string"}
                    <DynamicIcon name={effectiveIcon} class="size-[60%]" />
                {:else}
                    {@const IconComponent = effectiveIcon}
                    <IconComponent class="size-[60%]" />
                {/if}
            {/if}
        </div>

        <!-- Text Stack -->
        <div class="flex flex-col flex-1 justify-center min-w-0">
            <span
                class="text-[clamp(11px,5cqmin,18px)] font-bold leading-tight truncate"
            >
                {title}
            </span>
            <!-- Always render state span to maintain vertical alignment, just hide it if slider -->
            <span
                class="text-[clamp(10px,4cqmin,14px)] opacity-70 leading-tight truncate transition-opacity"
            >
                {#if variant === "slider" && isActive}
                    {displayState === "On" || !displayState.includes("%")
                        ? `On · ${value}%`
                        : displayState}
                {:else}
                    {displayState}
                {/if}
            </span>
        </div>
    </div>

    <!-- Edit FAB (Visible on Hover) -->
    <!-- z-30 to be above the slider input -->
    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-30 hover:brightness-110 pointer-events-auto"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title="Edit Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</div>
