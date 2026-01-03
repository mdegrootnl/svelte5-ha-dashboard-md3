<script lang="ts">
    import { type Snippet } from "svelte";
    import IconEdit from "~icons/material-symbols/edit";
    import { haStore } from "$lib/stores/ha.svelte";

    type CardVariant = "switch" | "slider";

    interface Props {
        title: string;
        state?: string;
        icon?: any; // Expecting a Material Symbol component
        isActive?: boolean;
        variant?: CardVariant;
        value?: number; // 0-100 for slider
        color?: string; // Optional color override
        onclick?: () => void;
        class?: string;

        // Smart/Config Props
        entityId?: string;
        name?: string;
    }

    let {
        title = $bindable(),
        state: displayState = $bindable(""),
        icon: Icon = $bindable(),
        isActive = $bindable(false),
        variant = $bindable("switch"),
        value = $bindable(0),
        color,
        onclick,
        class: className = "",
        entityId = $bindable(""),
        name = $bindable(""),
    }: Props = $props();

    // -- State Logic --
    // If entityId is present, we try to derive values from HA Store

    let entity = $derived(entityId ? haStore.getEntity(entityId) : null);

    // Helpers to detect capabilities
    function supportsBrightness(attr: any) {
        // Method 1: supported_color_modes contains 'brightness' or other color modes
        if (attr.supported_color_modes) {
            return attr.supported_color_modes.some((mode: string) =>
                [
                    "brightness",
                    "hs",
                    "xy",
                    "rgb",
                    "rgbw",
                    "color_temp",
                ].includes(mode),
            );
        }
        // Method 2: supported_features bit 1 (1) is brightness.
        // We'll trust supported_color_modes first as per modern HA, but fallback to features.
        // Bitwise check: (supported_features & 1) !== 0
        return (attr.supported_features & 1) !== 0;
    }

    $effect(() => {
        if (entity) {
            // Update Title
            if (!name) {
                title =
                    entity.attributes.friendly_name || entityId || "Unknown";
            } else {
                title = name;
            }

            // Auto-detect Slider capability
            // If it's a light and supports brightness, verify if we should switch to slider
            if (
                entity.entity_id.startsWith("light.") &&
                supportsBrightness(entity.attributes)
            ) {
                // Only switch if not already (to avoid loops if binding fights back, though strictly it should be fine)
                if (variant !== "slider") {
                    variant = "slider";
                }
            }

            // Update State & Active
            if (entity.state === "on") {
                isActive = true;
                displayState = "On";
                // Only update value from state if NOT "slider" or NOT dragging
                // If it IS a slider, we handle value below
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
            // IMPORTANT: Do NOT update value while dragging to prevent "fighting"
            if (
                variant === "slider" &&
                entity.attributes.brightness &&
                !isDragging
            ) {
                const pct = Math.round(
                    (entity.attributes.brightness / 255) * 100,
                );
                value = pct;
            }
        }
    });

    // -- Styling --

    // Base styles: Standard card rounding (rounded-m3-md), fixed height (h-20 approx), transition
    const baseStyles =
        "relative flex w-full h-20 rounded-m3-md overflow-hidden transition-all duration-200 select-none group";

    // Dynamic background styles
    let backgroundStyles = $derived.by(() => {
        if (variant === "switch") {
            // Switch: Surface Container High (inactive) vs Primary/Color (active)
            if (isActive) {
                return "bg-m3-primary-container text-m3-on-primary-container shadow-inner";
            } else {
                return "bg-m3-surface-container-highest text-m3-on-surface";
            }
        } else {
            // Slider: Always Surface Container High background, Progress bar handled separately
            return "bg-m3-surface-container-highest text-m3-on-surface";
        }
    });

    let interactiveStyles = $derived(
        onclick || variant === "switch"
            ? "cursor-pointer active:brightness-95 md:hover:brightness-95"
            : "",
    );

    // Icon container styles
    let iconStyles = $derived.by(() => {
        if (isActive && variant === "switch") {
            return "bg-m3-on-primary/20 text-m3-on-primary";
        }
        if (isActive && variant === "slider") {
            return "bg-m3-primary/20 text-m3-primary";
        }
        return "bg-m3-on-surface/10 text-m3-on-surface-variant";
    });

    // -- Config Dialog --
    // We now use the global store to open the dialog
    import { cardEditorStore } from "$lib/stores/cardEditor.svelte";

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            entityId: entityId || "",
            name: name || "",
            icon: "",
            onSave: (newConfig) => {
                console.log("Saving config:", newConfig);
                entityId = newConfig.entityId;
                name = newConfig.name;
                // Icon string handling...
            },
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

        if (didMove) {
            // Calculate new percentage based on card width
            // We need a ref to the card element
            if (cardElement) {
                const rect = cardElement.getBoundingClientRect();
                const x = e.clientX - rect.left;
                let pct = Math.round((x / rect.width) * 100);
                // Clamp
                pct = Math.max(0, Math.min(100, pct));

                value = pct; // Visual update

                // Throttled service call (e.g., max once every 200ms)
                const now = Date.now();
                if (now - lastCallTime > 200) {
                    handleBrightnessChange(value);
                    lastCallTime = now;
                }
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

    function handleToggle() {
        if (onclick) {
            onclick();
            // Do NOT return here. We want both custom callback AND entity logic if applicable.
        }
        if (entityId) {
            const domain = entityId.split(".")[0];
            haStore.callService(domain, "toggle", { entity_id: entityId });
        }
    }

    function handleBrightnessChange(val: number) {
        if (entityId) {
            const domain = entityId.split(".")[0];
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
    class="{baseStyles} {backgroundStyles} {interactiveStyles} {className}"
    onclick={handleSwitchClick}
    onpointerdown={handlePointerDown}
    role="button"
    tabindex="0"
    style="touch-action: none;"
>
    <!-- Slider Progress Background (Visual) -->
    {#if variant === "slider"}
        <!-- Active Track: Primary Color -->
        <div
            class="absolute inset-y-0 left-0 transition-all duration-75"
            style="width: {value}%; background-color: var(--color-m3-primary-container); opacity: {isActive
                ? '1'
                : '0'};"
        ></div>
        <!-- Inactive/Background Track is handled by container bg-surface-container-highest -->
    {/if}

    <!-- Content Layer -->
    <div
        class="relative z-10 flex items-center w-full h-full px-4 gap-4 pointer-events-none"
    >
        <!-- Icon Circle -->
        <div
            class="flex items-center justify-center w-10 h-10 rounded-full {iconStyles} shrink-0 transition-colors duration-200"
        >
            {#if Icon}
                <Icon class="size-6" />
            {/if}
        </div>

        <!-- Text Stack -->
        <div class="flex flex-col flex-1 justify-center min-w-0">
            <span class="text-sm font-bold leading-tight truncate">
                {title}
            </span>
            <!-- Always render state span to maintain vertical alignment, just hide it if slider -->
            <span
                class="text-xs opacity-70 leading-tight truncate transition-opacity"
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
        class="absolute top-1 right-1 p-1.5 rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-30 hover:brightness-110 pointer-events-auto"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title="Edit Card"
    >
        <IconEdit class="size-4" />
    </button>
</div>
