<script lang="ts">
    import { haStore } from "$lib/stores/ha.svelte";
    import IconEdit from "~icons/material-symbols/edit";
    import PowerOff from "~icons/material-symbols/power-off";
    import MusicNote from "~icons/material-symbols/music-note";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import MediaControls from "./media/MediaControls.svelte";
    import MediaVolume from "./media/MediaVolume.svelte";
    import MediaProgress from "./media/MediaProgress.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import AuthenticatedImage from "$lib/components/common/AuthenticatedImage.svelte";

    // Props
    interface Props {
        id?: string;
        entityId: string;
        name: string;
        domainFilter: string;
        ondelete?: () => void;
        variant?: "standard" | "condensed" | "poster";
        background?: "surface" | "immersive";
        class?: string;
        color?: string;
        backgroundColor?: string;
        icon?: string | any;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        domainFilter = $bindable(""),
        ondelete,
        variant = "standard",
        background: backgroundProp = "surface",
        class: className = "",
        color = $bindable(),
        backgroundColor = $bindable(),
        icon: iconProp = $bindable(),
    }: Props = $props();

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

    // Default to immersive for posters if background not explicitly set to something else
    let effectiveBackground = $derived(
        effectiveVariant === "poster" && backgroundProp === "surface"
            ? "immersive"
            : backgroundProp,
    );

    // Dynamic theme: only use dark if we have artwork and immersive background
    let currentTheme = $derived(
        effectiveBackground === "immersive" && artworkSrc && !isOff
            ? "dark"
            : "light",
    );

    // Dynamic container class
    let containerClass = $derived(
        isOff
            ? "bg-m3-surface-container-low text-m3-on-surface overflow-hidden"
            : effectiveBackground === "immersive" && artworkSrc
              ? "relative overflow-hidden"
              : "bg-m3-surface-container-highest text-m3-on-surface overflow-hidden",
    );

    function turnOn() {
        haStore.callService("media_player", "turn_on", { entity_id: entityId });
    }

    /** @param {Event} e */
    function openConfig(e: MouseEvent) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId: entityId || "",
            name: name || "",
            icon: typeof iconProp === "string" ? iconProp : "",
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                iconProp = newConfig.icon || "";
            },
            onDelete: ondelete,
        });
    }
</script>

<div
    class={`flex flex-col w-full shadow-sm transition-all ${containerClass} rounded-m3-card relative group h-full @container`}
    bind:clientHeight
    style={`container-type: size;${backgroundColor &&
    (isOff || effectiveBackground !== "immersive" || !artworkSrc)
        ? ` background-color: ${backgroundColor};`
        : ""}`}
>
    <!-- Immersive Background -->
    {#if effectiveBackground === "immersive" && artworkSrc && !isOff}
        <div class="absolute inset-0 z-0">
            <AuthenticatedImage
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
                class="flex items-center justify-between w-full h-full px-[clamp(0.75rem,4cqmin,1.5rem)] z-10 relative"
            >
                <div class="flex items-center gap-[clamp(0.5rem,3cqmin,1rem)] min-w-0">
                    <div
                        class="size-[clamp(1.75rem,9cqmin,3rem)] flex items-center justify-center shrink-0"
                    >
                        <DynamicIcon
                            name={iconProp || "power_off"}
                            class="size-full text-m3-on-surface-variant opacity-50"
                        />
                    </div>
                    <div class="flex flex-col min-w-0">
                        <span
                            class="text-[clamp(10px,3cqmin,14px)] uppercase tracking-wider text-m3-on-surface-variant truncate"
                            >{entityName}</span
                        >
                        <span
                            class="text-[clamp(14px,4.5cqmin,24px)] text-m3-on-surface-variant font-medium truncate"
                            >Powered Off</span
                        >
                    </div>
                </div>
                <button
                    class="px-[clamp(0.625rem,3cqmin,1rem)] py-[clamp(0.25rem,1.5cqmin,0.5rem)] rounded-full hover:shadow-md transition-all text-[clamp(0.75rem,3cqmin,0.9375rem)] font-medium shrink-0 ml-[clamp(0.25rem,2cqmin,0.75rem)]"
                    style:background-color={color || "var(--color-m3-primary)"}
                    style:color={color ? "white" : "var(--color-m3-on-primary)"}
                    onclick={turnOn}
                >
                    Turn On
                </button>
            </div>
        {:else}
            <!-- Standard Off State (Vertical) -->
            <div
                class="flex flex-col items-center justify-center h-full gap-[clamp(0.5rem,4cqmin,1.5rem)] z-10 relative p-[clamp(0.75rem,4cqmin,1.5rem)]"
            >
                <div class="size-[clamp(2.25rem,13cqmin,4rem)] flex items-center justify-center">
                    <DynamicIcon
                        name={iconProp || "power_off"}
                        class="size-full text-m3-on-surface-variant opacity-50"
                    />
                </div>
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
                    class="px-[clamp(0.875rem,4cqmin,1.5rem)] py-[clamp(0.375rem,2cqmin,0.75rem)] rounded-full hover:shadow-lg transition-all font-medium text-[clamp(0.8125rem,3.2cqmin,1rem)]"
                    style:background-color={color || "var(--color-m3-primary)"}
                    style:color={color ? "white" : "var(--color-m3-on-primary)"}
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
            <div class="pt-[clamp(0.625rem,3cqmin,1.25rem)] px-[clamp(0.75rem,4cqmin,1.5rem)] text-center">
                <p
                    class={`text-[clamp(0.625rem,2.6cqmin,0.8125rem)] uppercase tracking-widest leading-none ${currentTheme === "dark" ? "text-white/60" : "text-m3-on-surface-variant"}`}
                >
                    {entityName}
                </p>
            </div>

            <!-- Artwork Area -->
            <div class="flex-1 flex items-center justify-center p-[clamp(0.375rem,2cqmin,0.875rem)] min-h-0">
                {#if artworkSrc}
                    <AuthenticatedImage
                        src={artworkSrc}
                        alt="Cover"
                        class="h-full max-h-[70cqmin] aspect-square rounded-[var(--radius-m3-md)] object-cover shadow-2xl"
                    />
                {:else}
                    <div
                        class="h-full max-h-[62cqmin] aspect-square rounded-[var(--radius-m3-md)] bg-m3-on-surface/5 flex items-center justify-center border border-m3-on-surface/5"
                    >
                        <DynamicIcon
                            name={iconProp || "music_note"}
                            class="size-[38%] text-m3-on-surface-variant opacity-30"
                        />
                    </div>
                {/if}
            </div>

            <!-- Metadata and Controls -->
            <div
                class={`p-[clamp(0.625rem,3cqmin,1.25rem)] pt-0 ${currentTheme === "dark" ? "text-white" : "text-m3-on-surface"}`}
            >
                <div class="mb-[clamp(0.25rem,2cqmin,0.75rem)]">
                    <h3
                        class="text-[clamp(0.875rem,4cqmin,1.25rem)] truncate font-bold text-center leading-tight"
                    >
                        {title}
                    </h3>
                    <p
                        class={`text-[clamp(0.75rem,3cqmin,0.9375rem)] truncate text-center ${currentTheme === "dark" ? "text-white/70" : "text-m3-on-surface-variant"}`}
                    >
                        {artist || "Idle"}
                    </p>
                </div>

                <div class="mb-[clamp(0.25rem,2cqmin,0.75rem)]">
                    <MediaProgress {entityId} theme={currentTheme} {color} />
                </div>

                <div class="mb-[clamp(0.25rem,2cqmin,0.75rem)]">
                    <MediaControls {entityId} theme={currentTheme} {color} />
                </div>

                <div>
                    <MediaVolume {entityId} theme={currentTheme} {color} />
                </div>
            </div>
        </div>
    {:else if effectiveVariant === "condensed"}
        <!-- Condensed Variant: Slim row -->
        <div
            class="flex items-center gap-[3cqmin] p-[3cqmin] h-full overflow-hidden"
        >
            {#if artworkSrc}
                <AuthenticatedImage
                    src={artworkSrc}
                    alt="Cover"
                    class="size-[15cqmin] rounded-[var(--radius-m3-sm)] object-cover shadow-sm shrink-0"
                />
            {:else}
                <div
                    class="size-[15cqmin] rounded-[var(--radius-m3-sm)] bg-m3-surface-variant flex items-center justify-center shrink-0"
                >
                    <MusicNote
                        class="size-[50%] text-m3-on-surface-variant opacity-50"
                    />
                </div>
            {/if}

            <div class="flex-1 min-w-0">
                <p
                    class="text-[clamp(9px,3cqmin,12px)] uppercase tracking-tighter text-m3-on-surface-variant opacity-70 leading-none mb-1"
                >
                    {entityName}
                </p>
                <h3
                    class="text-[clamp(12px,4.5cqmin,18px)] truncate font-bold leading-none"
                >
                    {title}
                </h3>
                <p
                    class="text-[clamp(10px,3.5cqmin,14px)] text-m3-on-surface-variant truncate leading-tight"
                >
                    {artist || "Idle"}
                </p>
            </div>

            <div class="shrink-0">
                <MediaControls {entityId} compact={true} {color} />
            </div>
        </div>
    {:else}
        <!-- Standard Variant: Row layout -->
        <div class="flex flex-col h-full p-[clamp(0.625rem,3.5cqmin,1.25rem)] gap-[clamp(0.25rem,1.5cqmin,0.625rem)] overflow-hidden">
            <div class="flex items-start gap-[clamp(0.5rem,3cqmin,1rem)]">
                {#if artworkSrc}
                    <div class="relative group">
                        <AuthenticatedImage
                            src={artworkSrc}
                            alt="Cover"
                            class="size-[clamp(3rem,15cqmin,5.5rem)] rounded-[var(--radius-m3-md)] object-cover shadow-md shrink-0"
                        />
                    </div>
                {:else}
                    <div
                        class="size-[clamp(3rem,15cqmin,5.5rem)] rounded-[var(--radius-m3-md)] bg-m3-surface-container-highest flex items-center justify-center shrink-0 border border-m3-outline-variant/10"
                    >
                        <DynamicIcon
                            name={iconProp || "music_note"}
                            class="size-[50%] text-m3-on-surface-variant opacity-40"
                        />
                    </div>
                {/if}

                <div class="flex-1 min-w-0 pt-0.5">
                    <p
                        class="text-[clamp(9px,3cqmin,12px)] uppercase tracking-widest text-m3-on-surface-variant mb-0.5 font-medium"
                    >
                        {entityName}
                    </p>
                    <h3
                        class="text-[clamp(14px,5cqmin,24px)] truncate font-bold leading-tight"
                    >
                        {title}
                    </h3>
                    <p
                        class="text-[clamp(11px,4cqmin,16px)] text-m3-on-surface-variant truncate"
                    >
                        {artist || "Idle"}
                    </p>
                </div>
            </div>

            <div class="flex flex-col gap-[clamp(0.25rem,1.5cqmin,0.625rem)] mt-auto">
                {#if clientHeight >= 200}
                    <MediaProgress {entityId} {color} />
                {/if}
                <MediaControls {entityId} {color} />
                <MediaVolume {entityId} {color} />
            </div>
        </div>
    {/if}

    <!-- Edit FAB -->
    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary/10 text-m3-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-m3-primary hover:text-m3-on-primary backdrop-blur-sm"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title="Edit Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</div>
