<!--
  MusicSearch.svelte
  Search input component with debounced search functionality
-->
<script lang="ts">
    import { maStore } from "../stores/maStore.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import Search from "~icons/material-symbols/search";
    import Close from "~icons/material-symbols/close";

    interface Props {
        onSearch?: (query: string) => void;
    }

    let { onSearch }: Props = $props();

    let query = $state("");
    let searchTimeout: ReturnType<typeof setTimeout> | null = null;

    // Debounced search
    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        query = target.value;

        if (searchTimeout) clearTimeout(searchTimeout);

        if (query.trim()) {
            searchTimeout = setTimeout(() => {
                onSearch?.(query);
            }, 300);
        }
    }

    function clearSearch() {
        query = "";
        onSearch?.("");
    }
</script>

<div class="relative">
    <div class="relative flex items-center">
        <Search
            class="absolute left-4 w-5 h-5 text-m3-on-surface-variant pointer-events-none"
        />
        <input
            type="text"
            placeholder={themeStore.t("music.search.placeholder")}
            value={query}
            oninput={handleInput}
            class="w-full h-12 pl-12 pr-12 rounded-full bg-m3-surface-container-high
                text-m3-body-large text-m3-on-surface placeholder:text-m3-on-surface-variant/60
                border-none outline-none focus:ring-2 focus:ring-m3-primary transition-shadow"
        />
        {#if query}
            <button
                onclick={clearSearch}
                class="absolute right-4 w-6 h-6 rounded-full bg-m3-on-surface-variant/20
                    flex items-center justify-center hover:bg-m3-on-surface-variant/30 transition-colors"
                aria-label={themeStore.t("music.search.clear")}
            >
                <Close class="w-4 h-4 text-m3-on-surface-variant" />
            </button>
        {/if}
    </div>
</div>
