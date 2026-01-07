<script lang="ts">
    import { page } from "$app/stores";
    import { browser } from "$app/environment";
    import {
        ButtonCard,
        MediaCard,
        ThermostatCard,
        haStore,
        PageShell,
        GridContainer,
        GridItem,
        GridOverlay,
        GridConfigDialog,
        dashboardStore,
        dashboardEditorStore,
        generateDashboardFromHA,
        generateDashboardForArea,
        type GridConfig,
    } from "$lib";
    import Lightbulb from "~icons/material-symbols/lightbulb";
    import IconRefresh from "~icons/material-symbols/refresh";
    import IconEdit from "~icons/material-symbols/edit";
    import IconCheck from "~icons/material-symbols/check";
    import IconAutoFix from "~icons/material-symbols/auto-fix-high";
    import IconDelete from "~icons/material-symbols/delete";
    import IconGridView from "~icons/material-symbols/grid-view";
    import NavigationHub from "$lib/components/layout/NavigationHub.svelte";

    let { data } = $props();

    // Floor and Room params from route
    let floor = $derived($page.params.floor || null);
    let room = $derived($page.params.room || null);

    // Get or generate grid config
    let gridConfig = $state<GridConfig | null>(null);

    // Grid container element reference for position calculations
    let gridContainerEl = $state<HTMLElement>();

    // Grid config dialog visibility
    let isGridConfigOpen = $state(false);

    // Responsive breakpoint detection
    function updateBreakpoint() {
        if (browser) {
            dashboardStore.setBreakpoint(
                window.innerWidth < 768 ? "mobile" : "desktop",
            );
        }
    }

    // Initialize on mount
    $effect(() => {
        if (browser) {
            updateBreakpoint();
        }
    });

    // Update grid dimensions when container resizes using ResizeObserver
    $effect(() => {
        const config = gridConfig;
        const container = gridContainerEl;
        if (!browser || !container || !config) return;

        const updateDimensions = () => {
            const rect = container.getBoundingClientRect();
            const columnCount =
                dashboardStore.breakpoint === "desktop"
                    ? config.columns.desktop
                    : config.columns.mobile;
            dashboardEditorStore.updateGridDimensions(
                rect,
                columnCount,
                config.gap,
            );
        };

        // Initial update
        updateDimensions();

        // Watch for resizes
        const observer = new ResizeObserver(updateDimensions);
        observer.observe(container);

        return () => observer.disconnect();
    });

    // Generate dashboard when HA connects
    $effect(() => {
        if (haStore.connected && Object.keys(haStore.states).length > 0) {
            // Try to load existing config
            const configId = room
                ? `dashboard_${floor}_${room}`
                : floor
                  ? `dashboard_floor_${floor}`
                  : "dashboard_home";

            const existing = dashboardStore.loadConfig(configId);

            if (existing) {
                gridConfig = existing;
            } else {
                // Auto-generate from HA entities
                let generated: GridConfig;

                if (room) {
                    // Filter entities by Area ID using Registry
                    // We need to map roomId (area_id) -> entity_ids
                    const areaEntities = haStore.entityRegistry
                        .filter((e) => e.area_id === room)
                        .map((e) => e.entity_id);

                    // Also include entities from devices in this area?
                    // For now, just direct area assignment.
                    generated = generateDashboardForArea(
                        room, // Area Name (TODO: Lookup friendly name)
                        areaEntities,
                        haStore.states,
                    );
                } else if (floor) {
                    // TODO: Aggregate all areas on this floor
                    generated = generateDashboardFromHA(
                        haStore.states,
                        `Floor: ${floor}`,
                    );
                } else {
                    generated = generateDashboardFromHA(
                        haStore.states,
                        "Home Dashboard",
                    );
                }

                generated.id = configId;
                dashboardStore.setConfig(generated);
                gridConfig = generated;
            }
        }
    });

    // Sync gridConfig with store changes
    $effect(() => {
        if (dashboardStore.config) {
            gridConfig = dashboardStore.config;
        }
    });

    // Derive info
    let connectedEntities = $derived(Object.keys(haStore.states).length);
    let isEditing = $derived(dashboardEditorStore.isEditing);
    let selectedItemId = $derived(dashboardEditorStore.selectedItemId);

    // Regenerate dashboard
    function regenerateDashboard() {
        if (!haStore.connected) return;

        const configId = room
            ? `dashboard_${floor}_${room}`
            : floor
              ? `dashboard_floor_${floor}`
              : "dashboard_home";

        let generated: GridConfig;

        if (room) {
            const areaEntities = haStore.entityRegistry
                .filter((e) => e.area_id === room)
                .map((e) => e.entity_id);

            generated = generateDashboardForArea(
                room,
                areaEntities,
                haStore.states,
            );
        } else {
            generated = generateDashboardFromHA(
                haStore.states,
                floor ? `Floor: ${floor}` : "Home Dashboard",
            );
        }
        generated.id = configId;
        dashboardStore.setConfig(generated);
        gridConfig = generated;
    }

    // Toggle edit mode
    function toggleEditMode() {
        dashboardEditorStore.toggleEditMode();
    }

    // Auto-arrange items
    function autoArrange() {
        dashboardEditorStore.autoArrange(dashboardStore.breakpoint);
    }

    // Delete selected item
    function deleteSelected() {
        dashboardEditorStore.deleteSelectedItem();
    }

    // Handle global pointer move for drag/resize
    function handlePointerMove(e: PointerEvent) {
        if (dashboardEditorStore.isDragging) {
            dashboardEditorStore.updateDragPosition(
                e.clientX,
                e.clientY,
                dashboardStore.breakpoint,
            );
        } else if (dashboardEditorStore.isResizing) {
            dashboardEditorStore.updateResize(
                e.clientX,
                e.clientY,
                dashboardStore.breakpoint,
            );
        }
    }

    // Handle global pointer up for drag/resize
    function handlePointerUp(e: PointerEvent) {
        if (dashboardEditorStore.isDragging) {
            dashboardEditorStore.endDrag(dashboardStore.breakpoint);
        } else if (dashboardEditorStore.isResizing) {
            dashboardEditorStore.endResize(dashboardStore.breakpoint);
        }
    }

    // Handle click on grid background to deselect
    function handleGridClick(e: MouseEvent) {
        if (isEditing && e.target === e.currentTarget) {
            dashboardEditorStore.clearSelection();
        }
    }
</script>

<svelte:window
    onresize={updateBreakpoint}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
/>

<svelte:head>
    <title
        >{floor ? `${floor} - Dashboard` : "Dashboard"} - Home Assistant</title
    >
</svelte:head>

<PageShell
    title={room ? room : floor ? floor : "Dashboard"}
    description={haStore.connected
        ? `Connected · ${connectedEntities} entities · ${gridConfig?.items.length || 0} cards`
        : "Configure connection in Settings"}
    maxWidth="6xl"
>
    {#snippet actions()}
        {#if haStore.connected}
            <!-- Edit Mode Controls -->
            {#if isEditing}
                <!-- Selected item actions -->
                {#if selectedItemId}
                    <button
                        onclick={deleteSelected}
                        class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-error-container text-m3-on-error-container text-m3-label-large font-medium hover:brightness-95 transition-colors"
                        title="Delete selected card"
                    >
                        <IconDelete class="size-5" />
                    </button>
                {/if}

                <button
                    onclick={autoArrange}
                    class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-tertiary-container text-m3-on-tertiary-container text-m3-label-large font-medium hover:brightness-95 transition-colors"
                    title="Auto-arrange cards"
                >
                    <IconAutoFix class="size-5" />
                    Auto
                </button>

                <button
                    onclick={() => (isGridConfigOpen = true)}
                    class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-surface-container-high text-m3-on-surface text-m3-label-large font-medium hover:bg-m3-surface-container-highest transition-colors"
                    title="Grid settings"
                >
                    <IconGridView class="size-5" />
                    Grid
                </button>

                <button
                    onclick={toggleEditMode}
                    class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-primary text-m3-on-primary text-m3-label-large font-medium hover:brightness-95 transition-colors"
                    title="Save and exit edit mode"
                >
                    <IconCheck class="size-5" />
                    Done
                </button>
            {:else}
                <button
                    onclick={regenerateDashboard}
                    class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-surface-container-high text-m3-on-surface text-m3-label-large font-medium hover:bg-m3-surface-container-highest transition-colors"
                    title="Regenerate dashboard from entities"
                >
                    <IconRefresh class="size-5" />
                </button>

                <button
                    onclick={toggleEditMode}
                    class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-m3-label-large font-medium hover:brightness-95 transition-colors"
                    title="Edit dashboard layout"
                >
                    <IconEdit class="size-5" />
                    Edit
                </button>
            {/if}
        {:else}
            <a
                href="/settings"
                class="inline-flex items-center justify-center h-10 px-6 rounded-full bg-m3-primary text-m3-on-primary text-m3-label-large font-medium hover:bg-m3-primary/92 transition-colors"
            >
                Connect
            </a>
        {/if}
    {/snippet}

    {#if !floor && !room && haStore.connected}
        <div class="max-w-7xl mx-auto w-full p-4 md:p-8 pb-20">
            <div class="mb-8">
                <h2 class="text-m3-display-small text-m3-on-surface mb-2">
                    Welcome Home
                </h2>
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    Select a room to view its dashboard.
                </p>
            </div>
            <NavigationHub floors={haStore.floors} areas={haStore.areas} />
        </div>
    {:else if gridConfig && gridConfig.items.length > 0}
        <section class="relative">
            <!-- Edit mode indicator -->
            {#if isEditing}
                <div
                    class="mb-4 px-4 py-2 bg-m3-primary-container text-m3-on-primary-container rounded-full text-m3-label-medium inline-flex items-center gap-2"
                >
                    <IconEdit class="size-4" />
                    Edit Mode — Click cards to select, drag to move, use handles
                    to resize
                </div>
            {/if}

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                bind:this={gridContainerEl}
                class="relative"
                onclick={handleGridClick}
            >
                <!-- Grid Overlay (visible in edit mode) - inside container for alignment -->
                {#if isEditing && gridConfig}
                    <GridOverlay
                        config={gridConfig}
                        breakpoint={dashboardStore.breakpoint}
                        visible={isEditing}
                    />
                {/if}

                <GridContainer
                    config={gridConfig}
                    breakpoint={dashboardStore.breakpoint}
                >
                    {#each gridConfig.items as item (item.id)}
                        <GridItem
                            itemId={item.id}
                            desktopLayout={item.layout.desktop}
                            mobileLayout={item.layout.mobile}
                            breakpoint={dashboardStore.breakpoint}
                        >
                            {#if item.cardType === "button"}
                                <ButtonCard
                                    title="Loading..."
                                    entityId={item.entityId}
                                    icon={Lightbulb}
                                />
                            {:else if item.cardType === "media"}
                                <MediaCard
                                    entityId={item.entityId}
                                    variant="standard"
                                />
                            {:else if item.cardType === "thermostat"}
                                <ThermostatCard entityId={item.entityId} />
                            {/if}
                        </GridItem>
                    {/each}
                </GridContainer>
            </div>
        </section>
    {:else if haStore.connected}
        <section>
            <div
                class="bg-m3-surface-container-high rounded-m3-lg p-8 text-center"
            >
                <p class="text-m3-body-large text-m3-on-surface-variant mb-4">
                    No entities found to display. Connect to Home Assistant and
                    add some devices.
                </p>
                <button
                    onclick={regenerateDashboard}
                    class="inline-flex items-center justify-center h-10 px-6 gap-2 rounded-full bg-m3-primary text-m3-on-primary text-m3-label-large font-medium hover:bg-m3-primary/92 transition-colors"
                >
                    <IconRefresh class="size-5" />
                    Try Regenerating
                </button>
            </div>
        </section>
    {:else}
        <section>
            <div
                class="bg-m3-surface-container-high rounded-m3-lg p-6 text-center"
            >
                <p class="text-m3-body-large text-m3-on-surface-variant mb-4">
                    Connect to Home Assistant to auto-generate your dashboard.
                </p>
                <a
                    href="/settings"
                    class="inline-flex items-center justify-center h-10 px-6 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-m3-label-large font-medium hover:bg-m3-secondary-container/92 transition-colors"
                >
                    Go to Settings
                </a>
            </div>
        </section>
    {/if}
</PageShell>

<!-- Grid Config Dialog -->
<GridConfigDialog bind:open={isGridConfigOpen} config={gridConfig} />
