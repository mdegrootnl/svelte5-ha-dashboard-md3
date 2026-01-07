<script>
    import { haStore } from "$lib/stores/ha.svelte";
    import IconEdit from "~icons/material-symbols/edit";
    import PowerOff from "~icons/material-symbols/power-off";
    import MusicNote from "~icons/material-symbols/music-note";
    import { cardEditorStore } from "$lib/stores/cardEditor.svelte";
    import MediaControls from "./media/MediaControls.svelte";
    import MediaVolume from "./media/MediaVolume.svelte";
    import MediaProgress from "./media/MediaProgress.svelte";

    // Props
    let {
        entityId = $bindable(),
        variant = "standard",
        background = "surface",
        name = $bindable(""),
    } = $props();

    // Derived State
    let entity = $derived(haStore.getEntity(entityId));
    let entityName = $derived(
        entity?.attributes?.friendly_name || "Media Player",
    );
    let title = $derived(name || entity?.attributes?.media_title || "No Media");
    let artist = $derived(
        entity?.attributes?.media_artist ||
            entity?.attributes?.media_album_name ||
            "",
    );
    let artworkSrc = $derived(entity?.attributes?.entity_picture || null);
    let entityState = $derived(entity?.state);
    let isOff = $derived(
        entityState === "off" ||
            entityState === "idle" ||
            entityState === "unavailable",
    );

    // Dynamic theme: only use dark if we have artwork and immersive background
    let currentTheme = $derived(
        background === "immersive" && artworkSrc && !isOff ? "dark" : "light",
    );

    // Responsive Logic
    let clientHeight = $state(0);
    // 1 row (<145px): Condensed
    // 2 rows (<220px): Standard
    // 3+ rows (>=220px): Poster
    let effectiveVariant = $derived(
        clientHeight < 145
            ? "condensed"
            : clientHeight < 220
              ? "standard"
              : "poster",
    );

    // Dynamic container class
    let containerClass = $derived(
        isOff
            ? "bg-m3-surface-container-low text-m3-on-surface overflow-hidden"
            : background === "immersive" && artworkSrc
              ? "relative overflow-hidden"
              : "bg-m3-surface-container-highest text-m3-on-surface overflow-hidden",
    );

    function turnOn() {
        haStore.callService("media_player", "turn_on", { entity_id: entityId });
    }

    /** @param {Event} e */
    function openConfig(e) {
        e.stopPropagation();
        cardEditorStore.open({
            entityId: entityId || "",
            name: name || "",
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
            },
        });
    }
</script>

<div
    class={`flex flex-col w-full shadow-sm transition-all ${containerClass} rounded-[var(--radius-m3-md)] relative group h-full`}
    bind:clientHeight
>
    <!-- Immersive Background -->
    {#if background === "immersive" && artworkSrc && !isOff}
        <div class="absolute inset-0 z-0">
            <img
                src={artworkSrc}
                alt=""
                class="w-full h-full object-cover opacity-70 blur-xl scale-110"
            />
            <div
                class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30"
            ></div>
        </div>
    {/if}

    <!-- Content -->
    {#if isOff}
        <!-- Off State -->
        {#if effectiveVariant === "condensed"}
            <!-- Compact Off State (Horizontal) -->
            <div
                class="flex items-center justify-between w-full h-full px-4 z-10 relative"
            >
                <div class="flex items-center gap-3 min-w-0">
                    <PowerOff
                        class="w-8 h-8 text-m3-on-surface-variant opacity-50 shrink-0"
                    />
                    <div class="flex flex-col min-w-0">
                        <span
                            class="text-[10px] uppercase tracking-wider text-m3-on-surface-variant truncate"
                            >{entityName}</span
                        >
                        <span
                            class="text-m3-body-medium text-m3-on-surface-variant font-medium truncate"
                            >Powered Off</span
                        >
                    </div>
                </div>
                <button
                    class="bg-m3-primary text-m3-on-primary px-4 py-1.5 rounded-full hover:shadow-md transition-all text-sm font-medium shrink-0 ml-2"
                    onclick={turnOn}
                >
                    Turn On
                </button>
            </div>
        {:else}
            <!-- Standard Off State (Vertical) -->
            <div
                class="flex flex-col items-center justify-center h-full gap-4 z-10 relative p-4"
            >
                <PowerOff
                    class="w-12 h-12 text-m3-on-surface-variant opacity-50"
                />
                <div class="text-center">
                    <p
                        class="text-m3-label-small text-m3-on-surface-variant uppercase tracking-wider mb-1"
                    >
                        {entityName}
                    </p>
                    <p
                        class="text-m3-body-large text-m3-on-surface-variant font-medium"
                    >
                        Powered Off
                    </p>
                </div>
                <button
                    class="bg-m3-primary text-m3-on-primary px-6 py-2 rounded-full hover:shadow-lg transition-all font-medium"
                    onclick={turnOn}
                >
                    Turn On
                </button>
            </div>
        {/if}
    {:else if effectiveVariant === "poster"}
        <!-- Poster Variant: Artwork with overlay content -->
        <div class="relative z-10 flex flex-col h-full">
            <!-- Header with Entity Name -->
            <div class="pt-4 px-4 text-center">
                <p
                    class={`text-[10px] uppercase tracking-widest leading-none ${currentTheme === "dark" ? "text-white/60" : "text-m3-on-surface-variant"}`}
                >
                    {entityName}
                </p>
            </div>

            <!-- Artwork Area -->
            <div class="flex-1 flex items-center justify-center p-2 min-h-0">
                {#if artworkSrc}
                    <img
                        src={artworkSrc}
                        alt="Cover"
                        class="h-full max-h-[200px] aspect-square rounded-[var(--radius-m3-md)] object-cover shadow-2xl"
                    />
                {:else}
                    <div
                        class="h-full max-h-[160px] aspect-square rounded-[var(--radius-m3-md)] bg-m3-on-surface/5 flex items-center justify-center border border-m3-on-surface/5"
                    >
                        <MusicNote
                            class="w-12 h-12 text-m3-on-surface-variant opacity-30"
                        />
                    </div>
                {/if}
            </div>

            <!-- Metadata and Controls -->
            <div
                class={`p-3 pt-0 ${currentTheme === "dark" ? "text-white" : "text-m3-on-surface"}`}
            >
                <div class="mb-2">
                    <h3
                        class="text-m3-title-medium truncate font-bold text-center leading-tight"
                    >
                        {title}
                    </h3>
                    <p
                        class={`text-m3-body-small truncate text-center ${currentTheme === "dark" ? "text-white/70" : "text-m3-on-surface-variant"}`}
                    >
                        {artist || "Idle"}
                    </p>
                </div>

                <div class="mb-2">
                    <MediaProgress {entityId} theme={currentTheme} />
                </div>

                <div class="mb-2">
                    <MediaControls {entityId} theme={currentTheme} />
                </div>

                <div>
                    <MediaVolume {entityId} theme={currentTheme} />
                </div>
            </div>
        </div>
    {:else if effectiveVariant === "condensed"}
        <!-- Condensed Variant: Slim row -->
        <div class="flex items-center gap-3 p-3 h-full overflow-hidden">
            {#if artworkSrc}
                <img
                    src={artworkSrc}
                    alt="Cover"
                    class="h-12 w-12 rounded-[var(--radius-m3-sm)] object-cover shadow-sm shrink-0"
                />
            {:else}
                <div
                    class="h-12 w-12 rounded-[var(--radius-m3-sm)] bg-m3-surface-variant flex items-center justify-center shrink-0"
                >
                    <MusicNote
                        class="w-6 h-6 text-m3-on-surface-variant opacity-50"
                    />
                </div>
            {/if}

            <div class="flex-1 min-w-0">
                <p
                    class="text-[10px] uppercase tracking-tighter text-m3-on-surface-variant opacity-70 leading-none mb-1"
                >
                    {entityName}
                </p>
                <h3 class="text-m3-title-small truncate font-bold leading-none">
                    {title}
                </h3>
                <p
                    class="text-m3-body-small text-m3-on-surface-variant truncate leading-tight"
                >
                    {artist || "Idle"}
                </p>
            </div>

            <div class="shrink-0">
                <MediaControls {entityId} compact={true} />
            </div>
        </div>
    {:else}
        <!-- Standard Variant: Row layout -->
        <div class="flex flex-col h-full p-3 gap-1 overflow-hidden">
            <div class="flex items-start gap-3">
                {#if artworkSrc}
                    <div class="relative group">
                        <img
                            src={artworkSrc}
                            alt="Cover"
                            class="h-14 w-14 rounded-[var(--radius-m3-md)] object-cover shadow-md shrink-0"
                        />
                    </div>
                {:else}
                    <div
                        class="h-14 w-14 rounded-[var(--radius-m3-md)] bg-m3-surface-container-highest flex items-center justify-center shrink-0 border border-m3-outline-variant/10"
                    >
                        <MusicNote
                            class="w-7 h-7 text-m3-on-surface-variant opacity-40"
                        />
                    </div>
                {/if}

                <div class="flex-1 min-w-0 pt-0.5">
                    <p
                        class="text-[9px] uppercase tracking-widest text-m3-on-surface-variant mb-0.5 font-medium"
                    >
                        {entityName}
                    </p>
                    <h3
                        class="text-m3-title-small truncate font-bold leading-tight"
                    >
                        {title}
                    </h3>
                    <p
                        class="text-m3-body-small text-m3-on-surface-variant truncate"
                    >
                        {artist || "Idle"}
                    </p>
                </div>
            </div>

            <div class="flex flex-col gap-1 mt-auto">
                {#if clientHeight >= 200}
                    <MediaProgress {entityId} />
                {/if}
                <MediaControls {entityId} />
                <MediaVolume {entityId} />
            </div>
        </div>
    {/if}

    <!-- Edit FAB -->
    <button
        class="absolute top-2 right-2 p-1.5 rounded-full bg-m3-primary/10 text-m3-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-m3-primary hover:text-m3-on-primary backdrop-blur-sm"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title="Edit Card"
    >
        <IconEdit class="w-4 h-4" />
    </button>
</div>
