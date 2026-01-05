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
            class="text-label-large font-medium text-m3-on-surface-variant truncate"
            >{title}</span
        >
    </div>

    <!-- Content Area (Graphics + Value) -->
    <div
        class="flex-1 w-full flex flex-col items-center justify-center relative"
    >
        {@render children()}
    </div>
</Card>
