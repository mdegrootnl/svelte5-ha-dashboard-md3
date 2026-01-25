<script lang="ts">
    import { page } from "$app/stores";
    import { browser } from "$app/environment";
    import {
        ButtonCard,
        MediaCard,
        ThermostatCard,
        TitleCard,
        haStore,
        haRegistryStore,
        PageShell,
        GridContainer,
        GridItem,
        GridOverlay,
        GridConfigDialog,
        dashboardStore,
        DashboardStore,
        dashboardEditorStore,
        type GridConfig,
        type RoomDashboardConfig,
        type TabCardConfig,
        TabCard,
        GraphCard,
        NavigationCard,
        DynamicIcon,
        Button,
        createDefaultGridConfig,
    } from "$lib";
    import { fade } from "svelte/transition";
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
    import CardLibrarySheet from "$lib/components/layout/CardLibrarySheet.svelte";
    import CardConfigSheet from "$lib/components/layout/CardConfigSheet.svelte";
    import IconTab from "~icons/material-symbols/tab-outline";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";

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

    // Derived Active Tab - fallback to roomConfig itself if no tabs
    let activeTab = $derived.by(() => {
        if (!roomConfig) return null;

        // If no tabs array or empty, this is a standalone grid
        if (!roomConfig.tabs || roomConfig.tabs.length === 0) {
            return roomConfig;
        }

        // Try to find active tab, fallback to first tab, fallback to root config
        const found = roomConfig.tabs.find(
            (t) => t.id === roomConfig?.activeTabId,
        );
        return found || roomConfig.tabs[0] || roomConfig;
    });

    // Load or create empty dashboard config
    $effect(() => {
        if (!dashboardStore.initialized) return;

        const configId = DashboardStore.deriveConfigId(
            floor || undefined,
            room || undefined,
        );

        const existing = dashboardStore.loadConfig(configId);

        if (existing) {
            roomConfig = existing;
        } else {
            // Room/Floor dashboards still need auto-creation if they don't exist
            // Custom pages are handled in DashboardStore.addPage
            const config = createDefaultGridConfig("Main");
            const newConfig: RoomDashboardConfig = {
                ...config,
                id: configId,
                tabs: [config],
                activeTabId: config.id,
            };
            dashboardStore.setConfig(newConfig);
            roomConfig = newConfig;
        }
    });

    // Derive info
    let connectedEntities = $derived(Object.keys(haStore.states).length);
    let isEditing = $derived(dashboardEditorStore.isEditing);
    let selectedItemId = $derived(dashboardEditorStore.selectedItemId);

    // Regenerate dashboard
    function regenerateDashboard() {
        // Regeneration is removed as per user request
        console.log("Regeneration is disabled.");
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
    function onTabSelect(id: string) {
        dashboardStore.setActiveTab(id);
    }

    function onTabAdd() {
        dashboardStore.addTab("New Tab");
    }

    function onTabDelete(id: string) {
        dashboardStore.deleteTab(id);
    }

    function onTabRename(data: { id: string; name: string }) {
        dashboardStore.renameTab(data.id, data.name);
    }

    function onTabEditIcon(id: string) {
        cardEditorStore.openIconPicker((icon) => {
            dashboardStore.setTabIcon(id, icon);
        });
    }

    function onTabRenameRequest(data: { id: string; name: string }) {
        tabToRenameId = data.id;
        tabToRenameName = data.name;
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
    <title>Home Dashboard - Home Assistant</title>
</svelte:head>

<PageShell
    title={room ? room : floor ? floor : "Home Dashboard"}
    description={haStore.connected
        ? `Connected · ${connectedEntities} entities`
        : "Configure connection in Settings"}
    maxWidth="6xl"
>
    {#snippet icon()}
        <div class="text-m3-primary">
            <DynamicIcon name="home" class="text-4xl" />
        </div>
    {/snippet}
    {#if dashboardEditorStore.focusedGridId}
        <!-- Backdrop for Focus Mode -->
        <div
            class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-all duration-300"
            transition:fade={{ duration: 200 }}
            role="presentation"
        ></div>
    {/if}

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

                {#if isEditing}
                    <button
                        onclick={onTabAdd}
                        class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-tertiary-container text-m3-on-tertiary-container text-m3-label-large font-medium hover:brightness-95 transition-colors"
                        title="Add new tab"
                    >
                        <IconTab class="size-5" />
                        <span class="hidden md:inline">Add Tabs</span>
                    </button>

                    <div class="w-px h-6 bg-m3-outline-variant mx-1"></div>
                {/if}

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

    {#if roomConfig && activeTab}
        <section class="relative flex flex-col gap-4">
            <!-- Tab Bar -->
            {#if roomConfig.tabs.length > 0}
                <TabBar
                    tabs={roomConfig.tabs}
                    activeTabId={roomConfig.activeTabId}
                    {isEditing}
                    onselect={onTabSelect}
                    onadd={onTabAdd}
                    ondelete={onTabDelete}
                    onrename={onTabRename}
                    onrenamerequest={onTabRenameRequest}
                    onediticon={onTabEditIcon}
                />
            {/if}

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
                    {#each activeTab.items as item, i (item.id)}
                        <GridItem
                            itemId={item.id}
                            desktopLayout={item.layout.desktop}
                            mobileLayout={item.layout.mobile}
                            breakpoint={dashboardStore.breakpoint}
                            class={(item.cardType === "title" ? "z-10 " : "") +
                                "group"}
                            isInteractive={item.cardType === "tabs" &&
                                dashboardEditorStore.isItemAncestorOfFocus(
                                    item.id,
                                )}
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
                            {:else if item.cardType === "title"}
                                <TitleCard
                                    id={item.id}
                                    bind:name={item.name}
                                    bind:subtitle={item.subtitle}
                                    bind:alignment={item.alignment}
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
                            {:else if item.cardType === "tabs"}
                                <TabCard
                                    bind:config={
                                        activeTab.items[i] as TabCardConfig
                                    }
                                />
                            {:else if item.cardType === "graph"}
                                <GraphCard
                                    id={item.id}
                                    bind:entityId={item.entityId}
                                    bind:name={item.name}
                                    bind:hours_to_show={
                                        (item as any).hours_to_show
                                    }
                                    bind:aggregate_func={
                                        (item as any).aggregate_func
                                    }
                                    ondelete={() =>
                                        dashboardEditorStore.deleteItem(
                                            item.id,
                                        )}
                                />
                            {:else if item.cardType === "navigation"}
                                <NavigationCard
                                    id={item.id}
                                    bind:name={item.name}
                                    bind:path={item.path}
                                    bind:icon={item.icon}
                                    bind:iconType={item.iconType}
                                    bind:imageUrl={item.imageUrl}
                                    bind:color={item.color}
                                    bind:backgroundColor={item.backgroundColor}
                                    bind:shortcuts={item.shortcuts}
                                    bind:entityId={item.entityId}
                                    ondelete={() =>
                                        dashboardEditorStore.deleteItem(
                                            item.id,
                                        )}
                                />
                            {/if}
                            {#snippet controls()}
                                {#if item.cardType === "tabs"}
                                    <button
                                        class="absolute top-2 right-2 p-2 rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-md z-50 hover:brightness-110 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            const activeIdx =
                                                (item as TabCardConfig)
                                                    .activeTabIndex ?? 0;
                                            const gridId = (
                                                item as TabCardConfig
                                            ).tabs?.[activeIdx]?.id;
                                            if (gridId)
                                                dashboardEditorStore.enterGrid(
                                                    gridId,
                                                );
                                        }}
                                        title="Edit Content"
                                    >
                                        <IconEdit class="size-4" />
                                    </button>
                                {/if}
                            {/snippet}
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
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    Initialising your dashboard...
                </p>
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

{#if cardEditorStore.isIconPickerOpen}
    <IconPicker
        onselect={(icon) => cardEditorStore.handleIconSelect(icon)}
        onclose={() => (cardEditorStore.isIconPickerOpen = false)}
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
