<script lang="ts">
    import { page } from "$app/stores";
    import { browser } from "$app/environment";
    import { haStore } from "$lib/stores/ha.svelte";
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import GridContainer from "$lib/components/layout/GridContainer.svelte";
    import GridItem from "$lib/components/layout/GridItem.svelte";
    import GridOverlay from "$lib/components/layout/GridOverlay.svelte";
    import GridConfigDialog from "$lib/components/layout/GridConfigDialog.svelte";
    import { dashboardStore, DashboardStore } from "$lib/features/dashboard/stores/dashboard.svelte";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import { haRegistryStore } from "$lib/stores/haRegistry.svelte";
    import type {
        DashboardItem,
        GridConfig,
        RoomDashboardConfig,
        TabCardConfig,
    } from "$lib/types/dashboard";
    import { createDefaultGridConfig } from "$lib/types/dashboard";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import DashboardCardRenderer from "$lib/features/dashboard/components/cards/DashboardCardRenderer.svelte";
    import GenerationStateBadge from "$lib/features/dashboard/components/GenerationStateBadge.svelte";
    import { fade } from "svelte/transition";
    import type { Component } from "svelte";
    import TabBar from "$lib/components/layout/TabBar.svelte"; // Import TabBar
    import TextInputDialog from "$lib/components/common/TextInputDialog.svelte";
    import IconRefresh from "~icons/material-symbols/refresh";
    import IconEdit from "~icons/material-symbols/edit";
    import IconCheck from "~icons/material-symbols/check";
    import IconAutoFix from "~icons/material-symbols/auto-fix-high";
    import IconDelete from "~icons/material-symbols/delete";
    import IconGridView from "~icons/material-symbols/grid-view";
    import IconAdd from "~icons/material-symbols/add";
    import IconTab from "~icons/material-symbols/tab-outline";
    import IconPushPin from "~icons/material-symbols/push-pin";
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
    let CardLibrarySheetComponent = $state<Component<any> | null>(null);
    let CardConfigSheetComponent = $state<Component<any> | null>(null);
    let IconPickerComponent = $state<Component<any> | null>(null);
    let DashboardGenerationSheetComponent = $state<Component<any> | null>(null);
    let isGenerationSheetOpen = $state(false);
    let generationCleanGenerated = $state(false);

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

    $effect(() => {
        if (cardEditorStore.mode === "library" && !CardLibrarySheetComponent) {
            import("$lib/components/layout/CardLibrarySheet.svelte").then(
                (module) => {
                    CardLibrarySheetComponent = module.default;
                },
            );
        }

        if (cardEditorStore.mode === "config" && !CardConfigSheetComponent) {
            import("$lib/components/layout/CardConfigSheet.svelte").then(
                (module) => {
                    CardConfigSheetComponent = module.default;
                },
            );
        }

        if (cardEditorStore.isIconPickerOpen && !IconPickerComponent) {
            import("$lib/components/common/IconPicker.svelte").then(
                (module) => {
                    IconPickerComponent = module.default;
                },
            );
        }

        if (isGenerationSheetOpen && !DashboardGenerationSheetComponent) {
            import("$lib/components/layout/DashboardGenerationSheet.svelte").then(
                (module) => {
                    DashboardGenerationSheetComponent = module.default;
                },
            );
        }
    });

    // Sync roomConfig with store changes
    $effect(() => {
        if (dashboardStore.config) {
            roomConfig = dashboardStore.config;
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
    let isEditing = $derived(dashboardEditorStore.isEditing);
    let selectedItemId = $derived(dashboardEditorStore.selectedItemId);
    let currentDashboardId = $derived(
        DashboardStore.deriveConfigId(floor || undefined, room || undefined),
    );
    let routeAreaId = $derived.by(() => {
        if (!room) return null;
        const exact = haRegistryStore.areas.find((area) => area.area_id === room);
        if (exact) return exact.area_id;
        const normalizedRoom = room.toLowerCase().replaceAll("-", " ");
        return (
            haRegistryStore.areas.find(
                (area) => area.name.toLowerCase() === normalizedRoom,
            )?.area_id ?? null
        );
    });
    let routeArea = $derived(
        routeAreaId
            ? haRegistryStore.areas.find((area) => area.area_id === routeAreaId)
            : null,
    );
    let routeFloor = $derived.by(() => {
        if (routeArea?.floor_id) {
            return (
                haRegistryStore.floors.find(
                    (floorItem) => floorItem.floor_id === routeArea.floor_id,
                ) ?? null
            );
        }
        if (!floor) return null;
        const exact = haRegistryStore.floors.find(
            (floorItem) => floorItem.floor_id === floor,
        );
        if (exact) return exact;
        const normalizedFloor = floor.toLowerCase().replaceAll("-", " ");
        return (
            haRegistryStore.floors.find(
                (floorItem) => floorItem.name.toLowerCase() === normalizedFloor,
            ) ?? null
        );
    });
    let pageTitle = $derived(
        routeArea?.name ??
            (room
                ? formatRouteLabel(room)
                : routeFloor?.name ?? (floor ? formatRouteLabel(floor) : roomConfig?.name ?? "Home Dashboard")),
    );
    let pageIcon = $derived(
        normalizeHeaderIcon(
            routeArea?.icon ?? routeFloor?.icon ?? roomConfig?.icon,
            room ? "meeting_room" : floor ? "layers" : "home",
        ),
    );
    let selectedItem = $derived.by(() =>
        findItemInGrid(activeTab, selectedItemId),
    );
    let selectedItemCanPin = $derived(hasGenerationSource(selectedItem));
    let selectedItemIsPinned = $derived(
        selectedItem?.generationState === "pinned",
    );
    let activeTabCanPin = $derived(hasGenerationSource(activeTab));
    let activeTabIsPinned = $derived(activeTab?.generationState === "pinned");

    function hasGenerationSource(
        target:
            | { generatedBy?: unknown; generationState?: unknown }
            | null
            | undefined,
    ) {
        return Boolean(target?.generatedBy || target?.generationState);
    }

    function findItemInGrid(
        grid: GridConfig | null,
        itemId: string | null,
    ): DashboardItem | null {
        if (!grid || !itemId) return null;

        for (const item of grid.items) {
            if (item.id === itemId) return item;

            if (item.cardType === "tabs" && item.tabs) {
                for (const childGrid of item.tabs) {
                    const childItem = findItemInGrid(childGrid, itemId);
                    if (childItem) return childItem;
                }
            }
        }

        return null;
    }

    function openGenerationSheet(cleanGenerated = false) {
        generationCleanGenerated = cleanGenerated;
        isGenerationSheetOpen = true;
    }

    function formatRouteLabel(value: string) {
        return decodeURIComponent(value)
            .replace(/[-_]+/g, " ")
            .trim()
            .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
    }

    function normalizeHeaderIcon(icon: string | null | undefined, fallback: string) {
        if (!icon) return fallback;
        const normalized = icon.replace(/^mdi:/, "").replace(/-/g, "_");
        const materialMap: Record<string, string> = {
            chef_hat: "restaurant",
            countertop: "countertops",
            dining: "dining",
            dining_room: "dining",
            fridge: "kitchen",
            home_floor_0: "layers",
            home_floor_1: "layers",
            silverware_fork_knife: "restaurant",
            sofa: "chair",
            television: "tv",
        };
        return materialMap[normalized] ?? normalized;
    }

    function openCleanGenerationSheet() {
        openGenerationSheet(true);
    }

    function applyGeneratedDashboard(
        config: RoomDashboardConfig,
        relatedConfigs: RoomDashboardConfig[] = [],
    ) {
        dashboardStore.setConfigs([config, ...relatedConfigs], config.id);
        roomConfig = config;
        dashboardEditorStore.enterEditMode();
        isGenerationSheetOpen = false;
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

    function toggleSelectedItemPin() {
        if (!selectedItem) return;

        dashboardStore.setItemGenerationState(
            selectedItem.id,
            selectedItemIsPinned ? "user_modified" : "pinned",
        );
    }

    function toggleActiveTabPin() {
        if (!activeTab) return;

        dashboardStore.setGridGenerationState(
            activeTab.id,
            activeTabIsPinned ? "user_modified" : "pinned",
        );
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
    title={pageTitle}
    description={haStore.connected ? undefined : "Configure connection in Settings"}
    maxWidth="6xl"
>
    {#snippet icon()}
        <div class="flex size-10 items-center justify-center text-m3-primary">
            <DynamicIcon name={pageIcon} class="size-10" />
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
                    onclick={() => openGenerationSheet(false)}
                    class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-m3-label-large font-medium hover:brightness-95 transition-colors"
                    title="Generate dashboard draft"
                >
                    <IconRefresh class="size-5" />
                    <span class="hidden md:inline">Generate</span>
                </button>

                <button
                    onclick={openCleanGenerationSheet}
                    class="inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full bg-m3-error-container text-m3-on-error-container text-m3-label-large font-medium hover:brightness-95 transition-colors"
                    title="Clean generated cards and regenerate a preview"
                >
                    <IconDelete class="size-5" />
                    <span class="hidden md:inline">Clean</span>
                </button>

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
                    {#if selectedItemCanPin}
                        <button
                            onclick={toggleSelectedItemPin}
                            class={`inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full text-m3-label-large font-medium hover:brightness-95 transition-colors ${
                                selectedItemIsPinned
                                    ? "bg-m3-primary-container text-m3-on-primary-container"
                                    : "bg-m3-surface-container-high text-m3-on-surface"
                            }`}
                            title={selectedItemIsPinned
                                ? "Unpin selected generated card"
                                : "Pin selected generated card"}
                        >
                            <IconPushPin class="size-5" />
                            <span class="hidden md:inline"
                                >{selectedItemIsPinned
                                    ? "Unpin"
                                    : "Pin"}</span
                            >
                        </button>
                    {/if}

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

                {#if activeTabCanPin}
                    <button
                        onclick={toggleActiveTabPin}
                        class={`inline-flex items-center justify-center h-10 px-4 gap-2 rounded-full text-m3-label-large font-medium hover:brightness-95 transition-colors ${
                            activeTabIsPinned
                                ? "bg-m3-primary-container text-m3-on-primary-container"
                                : "bg-m3-surface-container-high text-m3-on-surface"
                        }`}
                        title={activeTabIsPinned
                            ? "Unpin current generated tab"
                            : "Pin current generated tab"}
                    >
                        <IconPushPin class="size-5" />
                        <span class="hidden md:inline"
                            >{activeTabIsPinned ? "Unpin Tab" : "Pin Tab"}</span
                        >
                    </button>
                {/if}

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
            {#if roomConfig.tabs.length > 1 || isEditing}
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
                {#if activeTabCanPin}
                    <GenerationStateBadge
                        state={activeTab.generationState ??
                            (activeTab.generatedBy ? "generated" : undefined)}
                        sourceReason={activeTab.generatedBy?.reason}
                    />
                {/if}
            {/if}

            {#if activeTab.items.length === 0}
                <div
                    class="rounded-m3-card border border-dashed border-m3-outline-variant bg-m3-surface-container-low p-6 text-center"
                >
                    <p class="text-m3-title-medium text-m3-on-surface">
                        This dashboard is empty.
                    </p>
                    <p
                        class="mt-1 text-m3-body-medium text-m3-on-surface-variant"
                    >
                        Generate a draft from Home Assistant inventory, preview
                        it, then apply only when it looks useful.
                    </p>
                    <button
                        type="button"
                        class="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-m3-primary px-5 text-m3-label-large text-m3-on-primary hover:brightness-95"
                        onclick={() => openGenerationSheet(false)}
                    >
                        <IconRefresh class="size-5" />
                        Generate Draft
                    </button>
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
                        {@const itemLayout =
                            dashboardStore.breakpoint === "desktop"
                                ? item.layout.desktop
                                : item.layout.mobile}
                        <GridItem
                            itemId={item.id}
                            desktopLayout={item.layout.desktop}
                            mobileLayout={item.layout.mobile}
                            breakpoint={dashboardStore.breakpoint}
                            class={(item.cardType === "title" ? "z-10 " : "") +
                                "group/grid-item"}
                            isInteractive={item.cardType === "tabs" &&
                                dashboardEditorStore.isItemAncestorOfFocus(
                                    item.id,
                                )}
                        >
                            <DashboardCardRenderer
                                bind:item={activeTab.items[i]}
                                layoutRows={itemLayout.rowSpan}
                                ondelete={(id) =>
                                    dashboardEditorStore.deleteItem(id)}
                            />
                            {#snippet controls()}
                                <GenerationStateBadge
                                    state={item.generationState ??
                                        (item.generatedBy
                                            ? "generated"
                                            : undefined)}
                                    sourceReason={item.generatedBy?.reason}
                                    class="absolute left-2 top-2 z-20 pointer-events-none"
                                />
                                {#if item.cardType === "tabs"}
                                    <button
                                        class="absolute top-2 right-2 p-2 rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-md z-50 hover:brightness-110 pointer-events-auto opacity-0 group-hover/grid-item:opacity-100 transition-opacity"
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

{#if CardLibrarySheetComponent && cardEditorStore.mode === "library"}
    <CardLibrarySheetComponent />
{/if}

{#if CardConfigSheetComponent && cardEditorStore.mode === "config"}
    <CardConfigSheetComponent />
{/if}

{#if IconPickerComponent && cardEditorStore.isIconPickerOpen}
    <IconPickerComponent
        onselect={(icon: string) => cardEditorStore.handleIconSelect(icon)}
        onclose={() => (cardEditorStore.isIconPickerOpen = false)}
    />
{/if}

{#if DashboardGenerationSheetComponent && isGenerationSheetOpen}
    <DashboardGenerationSheetComponent
        open={isGenerationSheetOpen}
        targetDashboardId={currentDashboardId}
        areaId={routeAreaId}
        cleanGenerated={generationCleanGenerated}
        onapply={applyGeneratedDashboard}
        onclose={() => (isGenerationSheetOpen = false)}
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
