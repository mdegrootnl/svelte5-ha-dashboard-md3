<script lang="ts">
    import { type Snippet } from "svelte";

    type CardVariant = "elevated" | "filled" | "outlined";

    interface Props {
        variant?: CardVariant;
        children: Snippet;
        onclick?: () => void;
        class?: string;
    }

    let {
        variant = "elevated",
        children,
        onclick,
        class: className = "",
    }: Props = $props();

    const baseStyles =
        "relative flex flex-col rounded-m3-md transition-all duration-200 overflow-hidden";

    // Interactive styles if onclick is provided
    let interactiveStyles = $derived(
        onclick
            ? "cursor-pointer hover:bg-m3-on-surface/[0.08] active:bg-m3-on-surface/[0.12]"
            : "",
    );

    const variantStyles: Record<CardVariant, string> = {
        elevated: "bg-m3-surface-container-low shadow-sm hover:shadow-md",
        filled: "bg-m3-surface-container-highest border-none",
        outlined: "bg-m3-surface border border-m3-outline-variant",
    };

    // Note: MD3 Card has specific states.
    // Elevated: Surface Container Low, shadow-1. Hover: shadow-2.
    // Filled: Surface Container Highest.
    // Outlined: Surface, Outline Variant border.
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="{baseStyles} {variantStyles[
        variant
    ]} {interactiveStyles} {className} @container"
    {onclick}
>
    <!-- State Layer for interactions could be appended here -->
    {@render children()}
</div>
