<script lang="ts">
    import { type Component } from "svelte";
    import { type SvelteComponent } from "svelte";

    // Support both direct component or string (if we had a resolver, but simplified here to component or slot)
    // Actually, let's just support passing a component reference like Button does, or just wrapping an icon.
    // BUT the usage in +page.svelte was `icon="settings"`.
    // Let's change +page.svelte to pass a component to be type-safe and consistent.

    interface Props {
        icon: Component<any>;
        onclick?: () => void;
        variant?: "standard" | "filled" | "tonal" | "outlined";
        selected?: boolean; // For toggle behavior
        class?: string;
        disabled?: boolean;
        title?: string;
    }

    let {
        icon: Icon,
        onclick,
        variant = "standard",
        selected = false,
        class: className = "",
        disabled = false,
        title,
    }: Props = $props();

    const baseStyles =
        "touch-target relative flex items-center justify-center rounded-full transition-colors duration-200 disabled:opacity-38 disabled:cursor-not-allowed";

    let variantStyles = $derived({
        standard: selected
            ? "text-m3-primary bg-m3-primary/12"
            : "text-m3-on-surface-variant hover:bg-m3-on-surface-variant/8 active:bg-m3-on-surface-variant/12",
        filled: "bg-m3-primary text-m3-on-primary hover:bg-m3-primary/92 active:bg-m3-primary/88",
        tonal: "bg-m3-secondary-container text-m3-on-secondary-container hover:bg-m3-secondary-container/92",
        outlined:
            "border border-m3-outline text-m3-on-surface hover:bg-m3-on-surface/8",
    });
</script>

<button
    class="{baseStyles} {variantStyles[variant]} {className}"
    onclick={!disabled ? onclick : undefined}
    {disabled}
    {title}
>
    {#if Icon}
        <Icon class="size-6" />
    {/if}
</button>
