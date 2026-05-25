<script lang="ts">
    import { type Snippet } from "svelte";
    import Card from "$lib/components/md3/Card.svelte";

    interface Props {
        title: string;
        icon?: string;
        children: Snippet;
        class?: string;
    }

    let { title, icon, children, class: className = "" }: Props = $props();
</script>

<Card
    variant="filled"
    class="relative p-4 flex flex-col items-center justify-between aspect-square md:aspect-auto md:h-[220px] overflow-hidden {className}"
>
    <!-- Header -->
    <div class="w-full flex items-center gap-2 mb-2 z-10">
        {#if icon}
            <span class="material-symbols-outlined text-[20px] text-m3-primary"
                >{icon}</span
            >
        {/if}
        <span
            class="truncate text-m3-label-large font-medium text-m3-on-surface-variant"
            >{title}</span
        >
    </div>

    <!-- Content Area (Graphics + Value) -->
    <div
        class="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center"
    >
        {@render children()}
    </div>
</Card>
