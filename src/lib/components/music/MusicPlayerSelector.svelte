<script lang="ts">
    import { maStore, musicLibraryStore } from "$lib";
    import SpeakerIcon from "~icons/material-symbols/speaker";
    import ExpandMore from "~icons/material-symbols/expand-more";
    import Check from "~icons/material-symbols/check";
    import Star from "~icons/material-symbols/star";
    import StarBorder from "~icons/material-symbols/star-outline";

    let open = $state(false);
    let containerEl = $state<HTMLElement | null>(null);
    let openUp = $state(false);

    $effect(() => {
        if (open && containerEl) {
            const rect = containerEl.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // If space below is less than 300px, open upwards
            openUp = spaceBelow < 300;
        }
    });

    // Get available players
    let players = $derived(Object.values(maStore.players));
    let activePlayer = $derived(
        maStore.activePlayerId ? maStore.players[maStore.activePlayerId] : null,
    );

    function selectPlayer(playerId: string) {
        maStore.selectPlayer(playerId);
        open = false;
    }

    function toggleDropdown(e: MouseEvent) {
        e.stopPropagation();
        open = !open;
    }

    // Close on outside click
    function handleClickOutside() {
        if (open) open = false;
    }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="relative" bind:this={containerEl}>
    <button
        class="flex items-center gap-2 px-3 py-2 rounded-full bg-m3-surface-container-high text-m3-on-surface hover:bg-m3-surface-container-highest transition-colors text-m3-body-small"
        onclick={toggleDropdown}
        aria-expanded={open}
        aria-haspopup="listbox"
    >
        <SpeakerIcon class="w-4 h-4 text-m3-on-surface-variant" />
        <span class="truncate max-w-32">
            {activePlayer?.attributes?.friendly_name || "Select player"}
        </span>
        <ExpandMore
            class="w-4 h-4 text-m3-on-surface-variant transition-transform {open
                ? 'rotate-180'
                : ''}"
        />
    </button>

    {#if open && players.length > 0}
        <div
            class="absolute {openUp
                ? 'bottom-full mb-1'
                : 'top-full mt-1'} right-0 w-64 max-h-64 overflow-auto rounded-xl bg-m3-surface-container shadow-lg border border-m3-outline-variant z-50 transition-all duration-200"
            role="listbox"
        >
            {#each players as player}
                <div
                    class="group/item flex items-center gap-1 px-2 py-1 hover:bg-m3-surface-container-high transition-colors
                        {player.entity_id === maStore.activePlayerId
                        ? 'bg-m3-primary-container/30'
                        : ''}"
                >
                    <button
                        class="flex-1 flex items-center gap-3 px-2 py-2 text-left rounded-lg transition-colors"
                        onclick={() => selectPlayer(player.entity_id)}
                        role="option"
                        aria-selected={player.entity_id ===
                            maStore.activePlayerId}
                    >
                        <SpeakerIcon
                            class="w-5 h-5 {player.entity_id ===
                            maStore.activePlayerId
                                ? 'text-m3-on-primary-container'
                                : 'text-m3-on-surface-variant'}"
                        />
                        <div class="flex-1 min-w-0">
                            <p
                                class="text-m3-body-medium truncate {player.entity_id ===
                                maStore.activePlayerId
                                    ? 'text-m3-on-primary-container font-medium'
                                    : 'text-m3-on-surface'}"
                            >
                                {player.attributes?.friendly_name ||
                                    player.entity_id}
                            </p>
                            <p
                                class="text-m3-body-small text-m3-on-surface-variant capitalize"
                            >
                                {player.state}
                            </p>
                        </div>
                        {#if player.entity_id === maStore.activePlayerId}
                            <Check
                                class="w-5 h-5 text-m3-on-primary-container"
                            />
                        {/if}
                    </button>

                    <!-- Set Default Button -->
                    <button
                        class="p-2 rounded-full hover:bg-m3-surface-container-highest transition-colors group/star"
                        onclick={(e) => {
                            e.stopPropagation();
                            const isDefault =
                                musicLibraryStore.defaultPlayerId ===
                                player.entity_id;
                            musicLibraryStore.setDefaultPlayer(
                                isDefault ? undefined : player.entity_id,
                            );
                        }}
                        title={musicLibraryStore.defaultPlayerId ===
                        player.entity_id
                            ? "Remove as default"
                            : "Set as default"}
                    >
                        {#if musicLibraryStore.defaultPlayerId === player.entity_id}
                            <Star class="w-5 h-5 text-m3-primary" />
                        {:else}
                            <StarBorder
                                class="w-5 h-5 text-m3-on-surface-variant opacity-30 group-hover/star:opacity-100 transition-opacity"
                            />
                        {/if}
                    </button>
                </div>
            {/each}
        </div>
    {:else if open}
        <div
            class="absolute {openUp
                ? 'bottom-full mb-1'
                : 'top-full mt-1'} right-0 w-64 p-4 rounded-xl bg-m3-surface-container shadow-lg border border-m3-outline-variant z-50"
        >
            <p
                class="text-m3-body-medium text-m3-on-surface-variant text-center"
            >
                No players found
            </p>
        </div>
    {/if}
</div>
