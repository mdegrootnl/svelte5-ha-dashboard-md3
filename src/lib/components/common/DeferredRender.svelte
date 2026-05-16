<script lang="ts">
    import { browser } from "$app/environment";
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
        placeholder?: Snippet;
        class?: string;
        rootMargin?: string;
    }

    let {
        children,
        placeholder,
        class: className = "",
        rootMargin = "180px",
    }: Props = $props();

    let root = $state<HTMLElement>();
    let shouldRender = $state(false);

    $effect(() => {
        if (!browser) return;
        if (shouldRender) return;
        if (!root) return;

        if (!("IntersectionObserver" in window)) {
            shouldRender = true;
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;
                shouldRender = true;
                observer.disconnect();
            },
            { rootMargin },
        );

        observer.observe(root);

        return () => observer.disconnect();
    });
</script>

<div bind:this={root} class={className}>
    {#if shouldRender}
        {@render children()}
    {:else if placeholder}
        {@render placeholder()}
    {:else}
        <div
            class="h-full min-h-24 rounded-m3-card bg-m3-surface-container-high animate-pulse"
            aria-hidden="true"
        ></div>
    {/if}
</div>
