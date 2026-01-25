<!--
  MusicSection.svelte
  Reusable section wrapper with title and responsive grid
-->
<script lang="ts">
    import type { MAMediaItem } from "$lib/types/musicAssistant";
    import MusicCard from "./MusicCard.svelte";
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        items: MAMediaItem[];
        onPlay: (item: MAMediaItem) => void;
        rounded?: boolean; // For artist cards
    }

    let { title, items, onPlay, rounded = false }: Props = $props();
</script>

{#if items.length > 0}
    <section class="mb-8">
        <h3 class="text-m3-title-medium font-bold text-m3-on-surface mb-4">
            {title}
        </h3>
        <div
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
            {#each items as item (item.uri || item.item_id)}
                <MusicCard {item} {onPlay} {rounded} />
            {/each}
        </div>
    </section>
{/if}
