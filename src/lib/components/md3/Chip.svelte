<script lang="ts">
    import { type Component, type Snippet } from "svelte";

    type ChipVariant = "assist" | "filter" | "input" | "suggestion";

    interface Props {
        variant?: ChipVariant;
        label: string;
        icon?: Component;
        selected?: boolean; // For filter chips
        onclick?: () => void;
        onclose?: () => void; // For input chips
        class?: string;
    }

    let {
        variant = "assist",
        label,
        icon: Icon,
        selected = false,
        onclick,
        onclose,
        class: className = "",
    }: Props = $props();

    const baseStyles =
        "relative inline-flex items-center justify-center h-8 px-4 rounded-m3-lg border transition-all duration-200 cursor-pointer min-w-16";

    // Variant styles
    // Assist: Surface, Outline border.
    // Filter: Surface, Outline border. Selected: Secondary Container, no border.
    // Input: Surface, Outline border.
    // Suggestion: Surface, Outline border. (Similar to Assist)

    let variantClasses = $derived.by(() => {
        if (variant === "filter" && selected) {
            return "bg-m3-secondary-container text-m3-on-secondary-container border-transparent hover:bg-m3-secondary-container/92";
        }
        return "bg-m3-surface text-m3-on-surface-variant border-m3-outline hover:bg-m3-on-surface-variant/8 active:bg-m3-on-surface-variant/12";
    });

    let padding = $derived(Icon || selected ? "pl-2 pr-4" : "px-4");
</script>

<button class="{baseStyles} {variantClasses} {padding} {className}" {onclick}>
    <!-- Leading Icon (or Checkmark for selected filter) -->
    {#if variant === "filter" && selected}
        <span class="w-4.5 h-4.5 mr-2">
            <!-- Icon: Check -->
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="w-full h-full"
                ><path
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                /></svg
            >
        </span>
    {:else if Icon}
        <span class="w-4.5 h-4.5 mr-2 text-m3-primary">
            <Icon />
        </span>
    {/if}

    <span class="text-m3-label-large font-medium">{label}</span>

    <!-- Trailing Icon (Close for Input) -->
    {#if variant === "input" && onclose}
        <span
            class="ml-2 w-4.5 h-4.5 text-m3-on-surface-variant hover:text-m3-on-surface rounded-full hover:bg-m3-on-surface-variant/10 flex items-center justify-center"
            onclick={(e) => {
                e.stopPropagation();
                onclose();
            }}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === "Enter" && onclose()}
        >
            <!-- Icon: Close -->
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="w-3 h-3"
                ><path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                /></svg
            >
        </span>
    {/if}
</button>
