<script lang="ts">
    import { type Component, type Snippet } from "svelte";

    type ButtonVariant = "filled" | "tonal" | "outlined" | "text" | "elevated";

    interface Props {
        variant?: ButtonVariant;
        children: Snippet;
        onclick?: () => void;
        class?: string;
        disabled?: boolean;
        icon?: Component; // Leading icon support
    }

    let {
        variant = "filled",
        children,
        onclick,
        class: className = "",
        disabled = false,
        icon: Icon,
    }: Props = $props();

    const baseStyles =
        "relative inline-flex items-center justify-center gap-2 h-10 px-6 rounded-m3-full text-m3-label-large font-medium transition-all duration-200 disabled:opacity-38 disabled:cursor-not-allowed overflow-hidden";

    // Variant-specific styles map
    const variantStyles: Record<ButtonVariant, string> = {
        filled: "bg-m3-primary text-m3-on-primary hover:bg-m3-primary/92 active:bg-m3-primary/88 disabled:bg-m3-on-surface/12 disabled:text-m3-on-surface/[0.38]",
        tonal: "bg-m3-secondary-container text-m3-on-secondary-container hover:bg-m3-secondary-container/92 active:bg-m3-secondary-container/88 disabled:bg-m3-on-surface/12 disabled:text-m3-on-surface/[0.38]",
        outlined:
            "bg-transparent text-m3-primary border border-m3-outline hover:bg-m3-primary/8 active:bg-m3-primary/12 focus:border-m3-primary disabled:border-m3-on-surface/12 disabled:text-m3-on-surface/[0.38]",
        text: "bg-transparent text-m3-primary hover:bg-m3-primary/8 active:bg-m3-primary/12 px-3 min-w-[64px] disabled:text-m3-on-surface/[0.38]",
        elevated:
            "bg-m3-surface-container-low text-m3-primary shadow-sm hover:bg-m3-primary/8 hover:shadow active:bg-m3-primary/12 active:shadow-none disabled:bg-m3-on-surface/12 disabled:text-m3-on-surface/[0.38] disabled:shadow-none",
    };

    // Icon padding adjustments
    let padding = $derived(
        variant === "text" ? "pl-3 pr-4" : Icon ? "pl-4 pr-6" : "",
    );
</script>

<button
    class="{baseStyles} {variantStyles[
        variant
    ]} {padding} {className} touch-manipulation cursor-pointer"
    onclick={() => !disabled && onclick?.()}
    {disabled}
>
    <!-- Ripple overlay could go here, relying on CSS hover/active states for now -->

    {#if Icon}
        <span class="w-4.5 h-4.5"><Icon /></span>
    {/if}

    {@render children()}
</button>
