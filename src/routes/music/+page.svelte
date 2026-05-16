<script lang="ts">
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import { maStore } from "$lib/features/music/stores/maStore.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import Card from "$lib/components/md3/Card.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import MusicNowPlaying from "$lib/features/music/components/MusicNowPlaying.svelte";
    import MusicMiniPlayer from "$lib/features/music/components/MusicMiniPlayer.svelte";
    import MusicBrowser from "$lib/features/music/components/MusicBrowser.svelte";
    import MusicSearch from "$lib/features/music/components/MusicSearch.svelte";
    import MusicPlayerSelector from "$lib/features/music/components/MusicPlayerSelector.svelte";
    import type { MAMediaItem } from "$lib/types/musicAssistant";

    import AlertIcon from "~icons/material-symbols/warning";
    import SettingsIcon from "~icons/material-symbols/settings";
    import OpenInNew from "~icons/material-symbols/open-in-new";
    import Refresh from "~icons/material-symbols/refresh";

    // Tabs for navigation
    type Tab = "home" | "browse" | "radio" | "library" | "search";
    let activeTab = $state<Tab>("home");

    // Show full Now Playing overlay
    let showFullPlayer = $state(false);

    // Search query for the search tab
    let currentSearchQuery = $state("");

    // Retry check integration
    async function retryCheck() {
        await maStore.checkIntegration();
    }

    // Show mini player when there's an active player (even if idle)
    let showMiniPlayer = $derived(
        maStore.activePlayerId && maStore.players[maStore.activePlayerId],
    );

    // Apply default player on mount
    $effect(() => {
        maStore.initializePlayer(true);
    });
</script>

<PageShell title="Music" description="Stream from Spotify, TuneIn, and more.">
    <!-- Error States -->
    {#if haStore.connectionState !== "connected"}
        <!-- HA Not Connected -->
        <div class="flex flex-col items-center justify-center h-full gap-6 p-8">
            <div
                class="w-20 h-20 rounded-full bg-m3-error-container flex items-center justify-center"
            >
                <AlertIcon class="w-10 h-10 text-m3-on-error-container" />
            </div>
            <div class="text-center">
                <h2 class="text-m3-headline-small text-m3-on-surface mb-2">
                    Home Assistant Not Connected
                </h2>
                <p
                    class="text-m3-body-medium text-m3-on-surface-variant max-w-md"
                >
                    Connect to Home Assistant in Settings to stream music.
                </p>
            </div>
            <a
                href="/settings"
                class="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full text-m3-label-large font-medium bg-m3-primary text-m3-on-primary hover:bg-m3-primary/92 transition-colors"
            >
                <SettingsIcon class="w-4 h-4" />
                Go to Settings
            </a>
        </div>
    {:else if maStore.integrationStatus === "checking"}
        <!-- Checking Integration -->
        <div class="flex flex-col items-center justify-center h-full gap-4 p-8">
            <div
                class="w-16 h-16 rounded-full bg-m3-surface-container-high flex items-center justify-center animate-pulse"
            >
                <Refresh
                    class="w-8 h-8 text-m3-on-surface-variant animate-spin"
                />
            </div>
            <p class="text-m3-body-medium text-m3-on-surface-variant">
                Checking Music Assistant...
            </p>
        </div>
    {:else if maStore.integrationStatus === "not_installed"}
        <!-- MA Not Installed -->
        <div class="flex flex-col items-center justify-center h-full gap-6 p-8">
            <div
                class="w-20 h-20 rounded-full bg-m3-tertiary-container flex items-center justify-center"
            >
                <AlertIcon class="w-10 h-10 text-m3-on-tertiary-container" />
            </div>
            <div class="text-center">
                <h2 class="text-m3-headline-small text-m3-on-surface mb-2">
                    Music Assistant Required
                </h2>
                <p
                    class="text-m3-body-medium text-m3-on-surface-variant max-w-md mb-4"
                >
                    Install the Music Assistant addon in Home Assistant to
                    stream music from Spotify, TuneIn, and more.
                </p>
            </div>
            <div class="flex gap-3">
                <a
                    href="https://music-assistant.io/installation/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full text-m3-label-large font-medium bg-m3-primary text-m3-on-primary hover:bg-m3-primary/92 transition-colors"
                >
                    <OpenInNew class="w-4 h-4" />
                    Installation Guide
                </a>
                <Button variant="outlined" onclick={retryCheck} icon={Refresh}>
                    Retry
                </Button>
            </div>
        </div>
    {:else if maStore.integrationStatus === "error"}
        <!-- Error State -->
        <div class="flex flex-col items-center justify-center h-full gap-6 p-8">
            <div
                class="w-20 h-20 rounded-full bg-m3-error-container flex items-center justify-center"
            >
                <AlertIcon class="w-10 h-10 text-m3-on-error-container" />
            </div>
            <div class="text-center">
                <h2 class="text-m3-headline-small text-m3-on-surface mb-2">
                    Connection Error
                </h2>
                <p
                    class="text-m3-body-medium text-m3-on-surface-variant max-w-md"
                >
                    {maStore.errorMessage ||
                        "Failed to connect to Music Assistant."}
                </p>
            </div>
            <Button variant="outlined" onclick={retryCheck} icon={Refresh}>
                Retry
            </Button>
        </div>
    {:else}
        <!-- Main Music UI -->
        <div class="flex flex-col h-full">
            <!-- Search Bar & Player Selector -->
            <div class="flex items-center gap-2 p-4 pb-2">
                <div class="flex-1">
                    <MusicSearch
                        onSearch={(q) => {
                            currentSearchQuery = q;
                            activeTab = "search";
                        }}
                    />
                </div>
                <MusicPlayerSelector />
            </div>

            <!-- Tab Navigation -->
            <nav class="flex gap-1 px-4 pb-2 overflow-x-auto">
                {#each [{ id: "home", label: "Home" }, { id: "browse", label: "Browse" }, { id: "radio", label: "Radio" }, { id: "library", label: "Library" }] as tab}
                    <button
                        class="px-4 py-2 rounded-full text-m3-label-large font-medium whitespace-nowrap transition-colors
                            {activeTab === tab.id
                            ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                            : 'text-m3-on-surface-variant hover:bg-m3-surface-container-highest'}"
                        onclick={() => (activeTab = tab.id as Tab)}
                    >
                        {tab.label}
                    </button>
                {/each}
            </nav>

            <!-- Tab Content -->
            <div class="flex-1 overflow-auto px-4 pb-24">
                {#if activeTab === "home"}
                    <MusicBrowser
                        section="home"
                        onPlay={(item: MAMediaItem) => maStore.play(item.uri)}
                    />
                {:else if activeTab === "browse"}
                    <MusicBrowser
                        section="browse"
                        onPlay={(item: MAMediaItem) => maStore.play(item.uri)}
                    />
                {:else if activeTab === "radio"}
                    <MusicBrowser
                        section="radio"
                        onPlay={(item: MAMediaItem) => maStore.play(item.uri)}
                    />
                {:else if activeTab === "library"}
                    <MusicBrowser
                        section="library"
                        onPlay={(item: MAMediaItem) => maStore.play(item.uri)}
                    />
                {:else if activeTab === "search"}
                    <MusicBrowser
                        section="search"
                        searchQuery={currentSearchQuery}
                        onPlay={(item: MAMediaItem) => maStore.play(item.uri)}
                    />
                {/if}
            </div>

            <!-- Mini Player (visible when a player is selected) -->
            {#if showMiniPlayer}
                <div
                    class="fixed bottom-0 left-0 right-0 md:left-20 z-40 pb-20 md:pb-0"
                >
                    <MusicMiniPlayer onclick={() => (showFullPlayer = true)} />
                </div>
            {/if}
        </div>

        <!-- Full Now Playing Overlay -->
        {#if showFullPlayer && maStore.nowPlaying}
            <MusicNowPlaying onClose={() => (showFullPlayer = false)} />
        {/if}
    {/if}
</PageShell>
