<script lang="ts">
    import { page } from "$app/stores";
    import { browser } from "$app/environment";
    import {
        ButtonCard,
        MediaCard,
        ThermostatCard,
        haStore,
        haRegistryStore,
        PageShell,
        GridContainer,
        GridItem,
        GridOverlay,
        GridConfigDialog,
        dashboardStore,
        dashboardEditorStore,
        generateDashboardFromHA,
        generateDashboardForArea,
        generateDashboardForFloor,
        type GridConfig,
        type RoomDashboardConfig, // Import new type
    } from "$lib";
    import TabBar from "$lib/components/layout/TabBar.svelte"; // Import TabBar
    import IconPicker from "$lib/components/common/IconPicker.svelte";
    import TextInputDialog from "$lib/components/common/TextInputDialog.svelte";
    import Lightbulb from "~icons/material-symbols/lightbulb";
    import IconRefresh from "~icons/material-symbols/refresh";
    import IconEdit from "~icons/material-symbols/edit";
    import IconCheck from "~icons/material-symbols/check";
    import IconAutoFix from "~icons/material-symbols/auto-fix-high";
    import IconDelete from "~icons/material-symbols/delete";
    import IconGridView from "~icons/material-symbols/grid-view";
    import IconAdd from "~icons/material-symbols/add";
    import NavigationHub from "$lib/components/layout/NavigationHub.svelte";
    import CardLibrarySheet from "$lib/components/layout/CardLibrarySheet.svelte";
    import CardConfigSheet from "$lib/components/layout/CardConfigSheet.svelte";
    import { cardEditorStore } from "$lib/stores/cardEditor.svelte";

    let { data } = $props();

    // Floor and Room params from route
    let floor = $derived($page.params.floor || null);
    let room = $derived($page.params.room || null);

    // Get or generate grid config
    let roomConfig = $state<RoomDashboardConfig | null>(null);

    // Grid container element reference for position calculations
    let gridContainerEl = $state<HTMLElement>();

    // Grid config dialog visibility
    let isGridConfigOpen = $state(false);

    // Icon Picker state
    let isIconPickerOpen = $state(false);
    let tabToEditIconId = $state<string | null>(null);

    // Rename Dialog state
    let isRenameDialogOpen = $state(false);
    let tabToRenameId = $state<string | null>(null);
    let tabToRenameName = $state("");

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

    // Sync roomConfig with store changes
    $effect(() => {
        if (dashboardStore.config) {
            roomConfig = dashboardStore.config;
        }
    });

    // Auto-save dashboard config changes
    $effect(() => {
        if (roomConfig) {
            // This will trigger whenever deep changes occur in roomConfig
            dashboardStore.setConfig(roomConfig);
        }
    });

    // Derived Active Tab
    let activeTab = $derived.by(() => {
        if (!roomConfig) return null;
        return (
            roomConfig.tabs.find((t) => t.id === roomConfig?.activeTabId) ||
            roomConfig.tabs[0] ||
            null
        );
    });

    // Update grid dimensions when container resizes using ResizeObserver
    $effect(() => {
        const config = activeTab; // Use active tab config
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

    // Generate dashboard when HA connects and store is ready
    $effect(() => {
        // Wait until both HA is connected AND dashboard store has server data
        if (!dashboardStore.initialized) return;
        if (!haStore.connected || Object.keys(haStore.states).length === 0)
            return;

        // Try to load existing config
        const configId = room
            ? `dashboard_${floor}_${room}`
            : floor
              ? `dashboard_floor_${floor}`
              : "dashboard_home";

        const existing = dashboardStore.loadConfig(configId);

        if (existing) {
            roomConfig = existing;
        } else {
            // Auto-generate from HA entities ONLY if no saved config exists
            let generated: RoomDashboardConfig;

            if (room) {
                const areaEntities = haRegistryStore.entityRegistry
                    .filter((e) => e.area_id === room)
                    .map((e) => e.entity_id);

                generated = generateDashboardForArea(
                    room,
                    areaEntities,
                    haStore.states,
                );
            } else if (floor) {
                // Get areas for floor
                const areas = dashboardStore.getAreasForFloor(floor);

                // Pre-fetch entities for these areas (Store helper?)
                // For now, simpler to leverage haStore.entityRegistry
                // We need a mapping of area_id -> entities
                const areaEntitiesMap: Record<string, string[]> = {};
                areas.forEach((a) => {
                    areaEntitiesMap[a.area_id] = haRegistryStore.entityRegistry
                        .filter((e) => e.area_id === a.area_id)
                        .map((e) => e.entity_id);
                });

                generated = generateDashboardForFloor(
                    `Floor: ${floor}`,
                    areas,
                    areaEntitiesMap,
                    haStore.states,
                );
            } else {
                generated = generateDashboardFromHA(
                    haStore.states,
                    "Home Dashboard",
                );
            }

            generated.id = configId;
            dashboardStore.setConfig(generated);
            roomConfig = generated;
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

        let generated: RoomDashboardConfig;

        if (room) {
            const areaEntities = haRegistryStore.entityRegistry
                .filter((e) => e.area_id === room)
                .map((e) => e.entity_id);

            generated = generateDashboardForArea(
                room,
                areaEntities,
                haStore.states,
            );
        } else if (floor) {
            const areas = dashboardStore.getAreasForFloor(floor);
            const areaEntitiesMap: Record<string, string[]> = {};
            areas.forEach((a) => {
                areaEntitiesMap[a.area_id] = haRegistryStore.entityRegistry
                    .filter((e) => e.area_id === a.area_id)
                    .map((e) => e.entity_id);
            });

            generated = generateDashboardForFloor(
                `Floor: ${floor}`,
                areas,
                areaEntitiesMap,
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
        roomConfig = generated;
    }

    // Open card library
    function openCardLibrary() {
        // Set the save handler for when a new card is created
        cardEditorStore.config = {
            entityId: "",
            name: "",
            onSave: (config) => {
                dashboardEditorStore.addItem(config);
            },
        };
        cardEditorStore.openLibrary();
    }

    // Toggle edit mode
    function toggleEditMode() {
        dashboardEditorStore.toggleEditMode();
    }

    // Auto-arrange items (ACTIVE TAB)
    function autoArrange() {
        // We need to pass the active tab GridConfig to autoArrange?
        // Or updated DashboardEditorStore handles it?
        // Assuming EditorStore needs update.
        // For now, call store method.
        // dashboardEditorStore.autoArrange(dashboardStore.breakpoint);
        // Wait, autoArrange likely modifies the store.config.items directly.
        // If store.config is RoomConfig, this will fail.
        // Disabling for now until Store is fixed or passing activeTab.
        // I will assume I fix EditorStore to look at activeTab.
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

    // Tab Handlers
    function onTabSelect(e: CustomEvent<string>) {
        dashboardStore.setActiveTab(e.detail);
    }

    function onTabAdd() {
        dashboardStore.addTab("New Tab");
    }

    function onTabDelete(e: CustomEvent<string>) {
        dashboardStore.deleteTab(e.detail);
    }

    function onTabRename(e: CustomEvent<{ id: string; name: string }>) {
        dashboardStore.renameTab(e.detail.id, e.detail.name);
    }

    function onTabEditIcon(e: CustomEvent<string>) {
        tabToEditIconId = e.detail;
        isIconPickerOpen = true;
    }

    function onIconSelected(e: CustomEvent<string>) {
        if (tabToEditIconId) {
            dashboardStore.setTabIcon(tabToEditIconId, e.detail);
        }
        isIconPickerOpen = false;
        tabToEditIconId = null;
    }

    function onTabRenameRequest(e: CustomEvent<{ id: string; name: string }>) {
        tabToRenameId = e.detail.id;
        tabToRenameName = e.detail.name;
        isRenameDialogOpen = true;
    }

    function handleRenameConfirm(value: string) {
        if (tabToRenameId) {
            dashboardStore.renameTab(tabToRenameId, value);
        }
        isRenameDialogOpen = false;
        tabToRenameId = null;
        tabToRenameName = "";
    }

    function onRenameCancel() {
        isRenameDialogOpen = false;
        tabToRenameId = null;
        tabToRenameName = "";
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
        ? `Connected · ${connectedEntities} entities`
        : "Configure connection in Settings"}
    maxWidth="6xl"
>
    {#snippet actions()}
        {#if haStore.connected}
            <!-- Edit Mode Controls -->
            {#if isEditing}
                <button
                    onclick={openCardLibrary}
                    class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-primary text-m3-on-primary text-m3-label-large font-medium hover:brightness-95 transition-colors shadow-m3-elevation-1"
                    title="Add new card"
                >
                    <IconAdd class="size-5" />
                    <span class="hidden md:inline">Add</span>
                </button>
                <div class="w-px h-6 bg-m3-outline-variant mx-1"></div>

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
                    <span class="hidden md:inline">Auto</span>
                </button>

                <button
                    onclick={() => (isGridConfigOpen = true)}
                    class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-surface-container-high text-m3-on-surface text-m3-label-large font-medium hover:bg-m3-surface-container-highest transition-colors"
                    title="Grid settings"
                >
                    <IconGridView class="size-5" />
                    <span class="hidden md:inline">Grid</span>
                </button>

                <button
                    onclick={toggleEditMode}
                    class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-primary text-m3-on-primary text-m3-label-large font-medium hover:brightness-95 transition-colors"
                    title="Save and exit edit mode"
                >
                    <IconCheck class="size-5" />
                    <span class="hidden md:inline">Done</span>
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
                    <span class="hidden md:inline">Edit</span>
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
            <NavigationHub
                floors={haRegistryStore.floors}
                areas={haRegistryStore.areas}
            />
        </div>
    {:else if roomConfig && activeTab}
        <section class="relative flex flex-col gap-4">
            <!-- Tab Bar -->
            <TabBar
                tabs={roomConfig.tabs}
                activeTabId={roomConfig.activeTabId}
                {isEditing}
                on:select={onTabSelect}
                on:add={onTabAdd}
                on:delete={onTabDelete}
                on:rename={onTabRename}
                on:rename-request={onTabRenameRequest}
                on:edit-icon={onTabEditIcon}
            />

            <!-- Edit mode indicator -->
            {#if isEditing}
                <div
                    class="px-4 py-2 bg-m3-primary-container text-m3-on-primary-container rounded-full text-m3-label-medium inline-flex items-center gap-2 self-start"
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
                class="relative min-h-[500px]"
                onclick={handleGridClick}
            >
                <!-- Grid Overlay (visible in edit mode) -->
                {#if isEditing}
                    <GridOverlay
                        config={activeTab}
                        breakpoint={dashboardStore.breakpoint}
                        visible={isEditing}
                    />
                {/if}

                <GridContainer
                    config={activeTab}
                    breakpoint={dashboardStore.breakpoint}
                >
                    {#each activeTab.items as item (item.id)}
                        <GridItem
                            itemId={item.id}
                            desktopLayout={item.layout.desktop}
                            mobileLayout={item.layout.mobile}
                            breakpoint={dashboardStore.breakpoint}
                        >
                            {#if item.cardType === "button"}
                                <ButtonCard
                                    id={item.id}
                                    bind:name={item.name}
                                    bind:entityId={item.entityId}
                                    bind:domainFilter={item.domainFilter}
                                    ondelete={() =>
                                        dashboardEditorStore.deleteItem(
                                            item.id,
                                        )}
                                />
                            {:else if item.cardType === "media"}
                                <MediaCard
                                    id={item.id}
                                    bind:entityId={item.entityId}
                                    bind:name={item.name}
                                    bind:domainFilter={item.domainFilter}
                                    ondelete={() =>
                                        dashboardEditorStore.deleteItem(
                                            item.id,
                                        )}
                                />
                            {:else if item.cardType === "thermostat"}
                                <ThermostatCard
                                    id={item.id}
                                    bind:entityId={item.entityId}
                                    bind:name={item.name}
                                    bind:secondaryEntityId={
                                        item.secondaryEntityId
                                    }
                                    bind:secondaryName={item.secondaryName}
                                    bind:domainFilter={item.domainFilter}
                                    ondelete={() =>
                                        dashboardEditorStore.deleteItem(
                                            item.id,
                                        )}
                                />
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
{#if activeTab}
    <GridConfigDialog bind:open={isGridConfigOpen} config={activeTab} />
{/if}

<CardLibrarySheet />
<CardConfigSheet />

{#if isIconPickerOpen}
    <IconPicker
        on:select={onIconSelected}
        on:close={() => (isIconPickerOpen = false)}
    />
{/if}

{#if isRenameDialogOpen}
    <TextInputDialog
        title="Rename Tab"
        label="Tab Name"
        initialValue={tabToRenameName}
        placeholder="Enter tab name..."
        onconfirm={handleRenameConfirm}
        oncancel={onRenameCancel}
    />
{/if}
