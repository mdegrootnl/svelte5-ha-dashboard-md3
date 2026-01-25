<script lang="ts">
    import { untrack } from "svelte";
    import TabCard from "./TabCard.svelte";
    import type { TabCardConfig } from "$lib/types/dashboard";

    let { config: initialConfig }: { config: TabCardConfig } = $props();
    let config = $state(untrack(() => initialConfig));
</script>

<TabCard bind:config />
