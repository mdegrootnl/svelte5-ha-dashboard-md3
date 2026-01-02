<script lang="ts">
    import { type Component, type Snippet } from "svelte";

    type FabVariant = "surface" | "primary" | "secondary" | "tertiary";
    type FabSize = "small" | "standard" | "large";

    interface Props {
        variant?: FabVariant;
        size?: FabSize;
        icon: Component;
        label?: Snippet; // Use label for Extended FAB
        onclick?: () => void;
        class?: string;
        extended?: boolean; // Convenience prop if only label is checked, but explicit helps
    }

    let {
        variant = "primary",
        size = "standard",
        icon: Icon,
        label,
        onclick,
        class: className = "",
    }: Props = $props();

    const baseStyles =
        "relative inline-flex items-center justify-center rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg active:shadow-sm cursor-pointer";

    // Size map (container size + icon size preference)
    // Small: 40x40, rounded-xl (12dp? no usually m3 is consistent container shape usually)
    // Update: M3 Small FAB is 40dp, Standard 56dp, Large 96dp.
    const sizeStyles: Record<FabSize, string> = {
        small: "w-10 h-10 rounded-m3-lg",
        standard: "w-14 h-14 rounded-m3-xl",
        large: "w-24 h-24 rounded-m3-xl", // Large usually larger radius
    };

    // Color variants
    const colorStyles: Record<FabVariant, string> = {
        primary:
            "bg-m3-primary-container text-m3-on-primary-container hover:brightness-95",
        surface:
            "bg-m3-surface-container-high text-m3-primary hover:bg-m3-surface-container-highest",
        secondary:
            "bg-m3-secondary-container text-m3-on-secondary-container hover:brightness-95",
        tertiary:
            "bg-m3-tertiary-container text-m3-on-tertiary-container hover:brightness-95",
    };

    // Extended FAB logic
    // If label is present, it's extended. Standard height (56dp), dynamic width.
    let isExtended = $derived(!!label);

    // Override shapes if extended
    let finalShape = $derived(
        isExtended ? "h-14 px-4 rounded-m3-xl gap-2 w-auto" : sizeStyles[size],
    );
</script>

<button
    class="{baseStyles} {colorStyles[variant]} {finalShape} {className}"
    {onclick}
>
    <!-- Icon -->
    <span
        class="{size === 'large'
            ? 'w-9 h-9'
            : 'w-6 h-6'} flex items-center justify-center"
    >
        <Icon />
    </span>

    <!-- Label (Extended only) -->
    {#if isExtended && label}
        <span class="text-m3-label-large font-medium pr-1">
            {@render label()}
        </span>
    {/if}
</button>
