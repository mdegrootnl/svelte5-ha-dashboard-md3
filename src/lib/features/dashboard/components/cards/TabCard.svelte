<script lang="ts">
    import type {
        GridConfig,
        TabCardConfig,
    } from "$lib/types/dashboard";
    import DashboardCardRenderer from "./DashboardCardRenderer.svelte";

    import GridContainer from "$lib/components/layout/GridContainer.svelte";
    import GridItem from "$lib/components/layout/GridItem.svelte";
    import GridOverlay from "$lib/components/layout/GridOverlay.svelte";
    import GridConfigDialog from "$lib/components/layout/GridConfigDialog.svelte";
    import { dashboardStore } from "$lib/features/dashboard/stores/dashboard.svelte";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import IconEdit from "~icons/material-symbols/edit";
    import IconCheck from "~icons/material-symbols/check";
    import IconAdd from "~icons/material-symbols/add";
    import IconClose from "~icons/material-symbols/close";
    import IconSettings from "~icons/material-symbols/settings";
    import IconGridView from "~icons/material-symbols/grid-view";
    import { createDefaultGridConfig } from "$lib/types/dashboard";
    import { fade } from "svelte/transition";
    import TextInputDialog from "$lib/components/common/TextInputDialog.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";

    interface Props {
        config: TabCardConfig;
    }

    let { config = $bindable() }: Props = $props();

    // Local state for active tab (with fallback)
    let activeIndex = $derived(config.activeTabIndex ?? 0);

    // Ensure tabs array exists
    let tabs = $derived(config.tabs || []);

    // Get current grid config
    let currentGrid = $derived(tabs[activeIndex]);

    // Editor state
    let isGlobalEditing = $derived(dashboardEditorStore.isEditing);

    // Check if we are focusing on the *current* tab's grid
    let isFocused = $derived(
        currentGrid && dashboardEditorStore.focusedGridId === currentGrid.id,
    );

    function enterFocus(e: MouseEvent) {
        e.stopPropagation();
        if (currentGrid) {
            dashboardEditorStore.enterGrid(currentGrid.id);
        }
    }

    function exitFocus(e: MouseEvent) {
        e.stopPropagation();
        dashboardEditorStore.exitGrid();
    }

    function switchTab(index: number, e: MouseEvent) {
        e.stopPropagation(); // Prevent drag start if clicking tab header
        config.activeTabIndex = index;

        // If we were focused on the previous tab, switch focus to new tab
        if (isFocused && tabs[index]) {
            dashboardEditorStore.enterGrid(tabs[index].id);
        }
    }

    // Accepts Event to handle both MouseEvent and KeyboardEvent
    function addTab(e: Event) {
        e.stopPropagation();
        const newTab = createDefaultGridConfig(`Tab ${tabs.length + 1}`);
        if (!config.tabs) config.tabs = [];
        config.tabs.push(newTab);
        config.activeTabIndex = config.tabs.length - 1;
    }

    // Accepts Event to handle both MouseEvent and KeyboardEvent
    function deleteTab(index: number, e: Event) {
        e.stopPropagation();
        if (!config.tabs) return;
        config.tabs.splice(index, 1);

        const currentActive = activeIndex;
        if (index < currentActive) {
            config.activeTabIndex = currentActive - 1;
        } else if (index === currentActive) {
            config.activeTabIndex = Math.max(
                0,
                Math.min(currentActive, config.tabs.length - 1),
            );
        }
    }

    // Rename Tab Logic
    let isRenameDialogOpen = $state(false);
    let isGridConfigOpen = $state(false);

    function openRenameDialog(e: Event) {
        e.stopPropagation();
        isRenameDialogOpen = true;
    }

    function handleRenameTab(newName: string) {
        if (!config.tabs || !currentGrid) return;
        // Directly mutate the specific tab's name
        config.tabs[activeIndex].name = newName;
        isRenameDialogOpen = false;
    }

    function handleAddCard(e: MouseEvent) {
        e.stopPropagation();
        cardEditorStore.config = {
            entityId: "",
            name: "",
            onSave: (newConfig) => {
                dashboardEditorStore.addItem(newConfig);
            },
        };
        cardEditorStore.openLibrary();
    }

    // Open Parent Config (for rename/delete of the TabCard itself)
    function openParentConfig(e: MouseEvent) {
        e.stopPropagation();
        cardEditorStore.open({
            id: config.id,
            entityId: config.entityId || "",
            name: config.name || "",
            domainFilter: config.domainFilter || "",
            type: "tabs",
            onSave: (newConfig) => {
                config.name = newConfig.name;
            },
            onDelete: () => {
                dashboardEditorStore.deleteItem(config.id);
            },
        });
    }

    // Derived for grid rendering
    let breakpoint = $derived(dashboardStore.breakpoint);
</script>

<div
    class="flex flex-col h-full w-full relative group transition-all duration-200"
    class:bg-m3-surface-container-low={isGlobalEditing}
    class:rounded-m3-card={isGlobalEditing}
    class:border={isGlobalEditing}
    class:border-m3-outline-variant={isGlobalEditing}
    class:border-dashed={isGlobalEditing}
>
    <!-- Tab Bar (Floating Pills) -->
    <div
        class="flex items-center justify-center gap-2 w-full overflow-x-auto no-scrollbar py-2"
        onclick={(e) => e.stopPropagation()}
        role="tablist"
        tabindex="-1"
        onkeydown={() => {}}
    >
        {#each tabs as tab, i}
            <button
                role="tab"
                aria-selected={activeIndex === i}
                class="
                    relative flex items-center gap-2 px-4 py-2 rounded-m3-card text-sm font-medium transition-all whitespace-nowrap border select-none
                    {activeIndex === i
                    ? 'bg-m3-primary text-m3-on-primary border-transparent shadow-md'
                    : 'bg-m3-surface-container-highest/50 border-transparent text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}
                "
                onclick={(e) => switchTab(i, e)}
            >
                <DynamicIcon name={tab.icon || "grid_view"} class="size-4" />
                <span>{tab.name}</span>

                {#if isGlobalEditing && !isFocused && tabs.length > 1}
                    <div
                        role="button"
                        tabindex="0"
                        class="ml-1 p-0.5 rounded-full hover:bg-m3-on-surface/10 text-m3-on-surface-variant/50 hover:text-m3-on-surface-variant"
                        onclick={(e) => deleteTab(i, e)}
                        onkeydown={(e) => e.key === "Enter" && deleteTab(i, e)}
                        title="Delete Tab"
                    >
                        <IconClose class="size-3" />
                    </div>
                {/if}
                {#if isFocused && activeIndex === i}
                    <div
                        role="button"
                        tabindex="0"
                        class="ml-1 p-0.5 rounded-full hover:bg-m3-on-primary/20 text-m3-on-primary/70 hover:text-m3-on-primary transition-colors"
                        onclick={openRenameDialog}
                        onkeydown={(e) =>
                            e.key === "Enter" && openRenameDialog(e)}
                        title="Rename Tab"
                    >
                        <IconEdit class="size-3" />
                    </div>
                {/if}
            </button>
        {/each}

        {#if isGlobalEditing}
            <button
                class="flex items-center justify-center size-8 rounded-m3-card bg-m3-surface-container-highest/50 border border-transparent text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface transition-colors"
                onclick={addTab}
                title="Add Tab"
            >
                <IconAdd class="size-5" />
            </button>
        {/if}
    </div>

    <!-- Content Area -->
    <div
        class="flex-1 relative overflow-y-auto p-2 transition-all duration-300"
        class:pl-10={isFocused}
    >
        {#if currentGrid}
            <!-- Wrapper to align Overlay and Container when padding shifts -->
            <div class="relative min-h-full w-full">
                <!-- 
                    When focused, we pass the nested grid to the generic container.
                    We flag it as nested so it knows how to behave.
                -->
                <!-- Grid Overlay (visible when focused) -->
                {#if isFocused}
                    <GridOverlay
                        config={currentGrid}
                        {breakpoint}
                        visible={isFocused}
                    />
                {/if}

                <GridContainer config={currentGrid} isNested={true}>
                    {#each currentGrid.items as item, i (item.id)}
                        <GridItem
                            itemId={item.id}
                            desktopLayout={item.layout.desktop}
                            mobileLayout={item.layout.mobile}
                            {breakpoint}
                            class={(item.cardType === "title" ? "z-10 " : "") +
                                "group"}
                            isInteractive={item.cardType === "tabs" &&
                                dashboardEditorStore.isItemAncestorOfFocus(
                                    item.id,
                                )}
                        >
                            <DashboardCardRenderer
                                bind:item={currentGrid.items[i]}
                                ondelete={(id) =>
                                    dashboardEditorStore.deleteItem(id)}
                            />
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

            <!-- Focus Toolbar (Floating) -->
            {#if isFocused}
                <div
                    class="absolute top-4 right-4 z-50 flex items-center gap-2 pointer-events-auto"
                >
                    <!-- Add Card Button -->
                    <button
                        class="flex items-center gap-2 px-4 py-2 bg-m3-primary-container text-m3-on-primary-container rounded-m3-card shadow-lg hover:brightness-110 transition-all font-medium"
                        onclick={handleAddCard}
                        title="Add Card"
                    >
                        <IconAdd class="size-4" />
                        <span class="hidden md:inline">Add</span>
                    </button>

                    <!-- Grid Settings Button -->
                    <button
                        class="flex items-center justify-center p-2 bg-m3-surface-container-high text-m3-on-surface rounded-m3-card shadow-lg hover:bg-m3-surface-container-highest transition-all"
                        onclick={(e) => {
                            e.stopPropagation();
                            isGridConfigOpen = true;
                        }}
                        title="Grid Settings"
                    >
                        <IconGridView class="size-4" />
                    </button>

                    <div class="w-px h-6 bg-m3-outline-variant mx-1"></div>

                    <!-- Settings Button (Parent Card Config) -->
                    <button
                        class="flex items-center justify-center p-2 bg-m3-surface-container-high text-m3-on-surface rounded-m3-card shadow-lg hover:bg-m3-surface-container-highest transition-all"
                        onclick={openParentConfig}
                        title="Card Settings"
                    >
                        <IconSettings class="size-4" />
                    </button>
                    <!-- Done Button -->
                    <button
                        class="flex items-center gap-2 px-4 py-2 bg-m3-primary text-m3-on-primary rounded-m3-card shadow-lg hover:brightness-110 transition-all font-medium"
                        onclick={exitFocus}
                    >
                        <IconCheck class="size-4" />
                        <span>Done</span>
                    </button>
                </div>
            {/if}
        {:else}
            <div
                class="flex items-center justify-center h-full text-m3-on-surface-variant/50"
            >
                No tabs configured
            </div>
        {/if}
    </div>
</div>

<!-- Rename Dialog -->
{#if isRenameDialogOpen && currentGrid}
    <TextInputDialog
        title="Rename Tab"
        label="Tab Name"
        initialValue={currentGrid.name}
        onconfirm={handleRenameTab}
        oncancel={() => (isRenameDialogOpen = false)}
    />
{/if}

<!-- Grid Config Dialog -->
{#if currentGrid}
    <GridConfigDialog bind:open={isGridConfigOpen} config={currentGrid} />
{/if}

<style>
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
