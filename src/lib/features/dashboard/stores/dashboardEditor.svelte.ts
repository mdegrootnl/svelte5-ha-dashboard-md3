// Dashboard Editor Store - Manages edit mode state and operations
import { browser } from '$app/environment';
import type {
    DashboardItem,
    GridConfig,
    Breakpoint,
    ViewportProfile,
    DashboardCardType,
    RoomDashboardConfig,
    ItemLayout,
    GridTrack
} from '$lib/types/dashboard';
import {
    VIEWPORT_PROFILES,
    createDefaultItemLayout,
    ensureItemLayoutProfiles,
    getGridColumnsForProfile,
    getItemLayoutForProfile,
    profileToLegacyBreakpoint,
    setItemLayoutForProfile,
    syncLegacyLayoutFromProfile,
} from '$lib/types/dashboard';
import { dashboardStore } from './dashboard.svelte';
import { generateUUID } from '$lib/utils/uuid';
import {
    type LayoutTarget,
    createNewItem,
    ensureExplicitRows,
    getItemLayout,
    getMaxRow,
    isViewportProfile,
    layoutsOverlap,
    packItemsIntoGrid,
    resolveLayoutCollisions,
} from '../utils/gridUtils';
import { findGridById, gridContainsGridId, isGridDescendantOfItem } from '../utils/gridNavigation';
import {
    shiftLayoutRowsForAdd,
    shiftLayoutRowsForRemove,
    normalizeGridSelection
} from '../utils/gridEditUtils';
import { normalizeDashboardItem } from '../utils/dashboardDefaults';

/** Config object passed when creating a new dashboard item from editor selection */
interface ItemCreationConfig {
    type?: string;
    entityId?: string;
    name?: string;
    cardSize?: 'condensed' | 'standard' | 'poster';
    secondaryEntityId?: string;
    secondaryName?: string;
    domainFilter?: string;
    subtitle?: string;
    alignment?: DashboardItem['alignment'];
    tabs?: GridConfig[];
    hours_to_show?: number;
    aggregate_func?: 'avg' | 'min' | 'max' | 'last';
    chartType?: DashboardItem['chartType'];
    graphEntities?: DashboardItem['graphEntities'];
    comparisonMode?: DashboardItem['comparisonMode'];
    dataSource?: DashboardItem['dataSource'];
    statisticsPeriod?: DashboardItem['statisticsPeriod'];
    scaleMode?: DashboardItem['scaleMode'];
    showAnalytics?: DashboardItem['showAnalytics'];
    color_thresholds?: DashboardItem['color_thresholds'];
    rangeBands?: DashboardItem['rangeBands'];
    path?: string;
    iconType?: 'icon' | 'image';
    imageUrl?: string;
    imageAttribution?: DashboardItem['imageAttribution'];
    icon?: string;
    shortcuts?: { id: string; entityId: string; icon?: string; color?: string }[];
    options?: DashboardItem['options'];
}

function normalizeAlignment(alignment: unknown): DashboardItem['alignment'] {
    return alignment === 'center' || alignment === 'end' ? alignment : 'start';
}

function normalizeCardType(type: string | undefined): DashboardCardType {
    switch (type) {
        case "thermostat":
        case "media":
        case "title":
        case "tabs":
        case "graph":
        case "navigation":
        case "room":
        case "collection":
        case "energy":
        case "calendar":
        case "weather":
        case "remote":
        case "device_panel":
        case "presence":
        case "security":
        case "lock":
        case "cover":
        case "air":
        case "update":
        case "todo":
        case "vacuum":
        case "camera":
            return type;
        default:
            return "button";
    }
}

function getGridColumnCount(config: GridConfig, target: LayoutTarget) {
    return isViewportProfile(target)
        ? getGridColumnsForProfile(config, target)
        : target === 'desktop'
          ? config.columns.desktop
          : config.columns.mobile;
}

function syncLayoutTarget(item: DashboardItem, target: LayoutTarget) {
    if (isViewportProfile(target)) {
        syncLegacyLayoutFromProfile(item, target);
    }
}

/**
 * Dashboard Editor Store - Controls interactive editing of dashboard layouts
 */
export class DashboardEditorStore {
    // Edit mode toggle
    isEditing = $state(false);

    // Currently selected item
    selectedItemId = $state<string | null>(null);

    // Drag state
    isDragging = $state(false);
    dragItemId = $state<string | null>(null);
    dragGhostPosition = $state<{ col: number; row: number } | null>(null);

    // Resize state
    isResizing = $state(false);
    resizeItemId = $state<string | null>(null);
    resizeDirection = $state<'right' | 'bottom' | 'corner' | null>(null);

    // Grid info for calculations
    private gridElement: HTMLElement | null = null;
    private gridRect: DOMRect | null = null;
    private cellWidth = 0;
    private cellHeight = 80;
    private gridPadding = 16;
    private gridColumnGap = 16;
    private gridRowGap = 16;

    /**
     * Toggle edit mode
     */
    toggleEditMode() {
        this.isEditing = !this.isEditing;
        if (!this.isEditing) {
            this.clearSelection();
            this.cancelDrag();
        }
    }

    /**
     * Enable edit mode
     */
    enterEditMode() {
        this.isEditing = true;
    }

    /**
     * Exit edit mode and save
     */
    exitEditMode() {
        this.isEditing = false;
        this.clearSelection();
        this.clearGridSelection();
        this.cancelDrag();
        // Config is auto-saved via dashboardStore
    }

    /**
     * Select an item for editing
     */
    selectItem(itemId: string) {
        this.selectedItemId = itemId;
        // If we select an existing item, clear any grid selection
        this.clearGridSelection();
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedItemId = null;
        this.clearGridSelection();
    }

    // Grid Region Selection
    isSelectingGrid = $state(false);
    gridSelection = $state<{ gridId: string; start: { col: number; row: number }; end: { col: number; row: number } } | null>(null);

    startGridSelection(gridId: string, col: number, row: number) {
        if (!this.isEditing) return;
        this.isSelectingGrid = true;
        this.selectedItemId = null; // Clear item selection when starting grid selection
        this.gridSelection = {
            gridId,
            start: { col, row },
            end: { col, row }
        };
    }

    updateGridSelection(col: number, row: number) {
        if (!this.isSelectingGrid || !this.gridSelection) return;
        this.gridSelection.end = { col, row };
    }

    endGridSelection() {
        this.isSelectingGrid = false;
        // Normalize selection so start is top-left and end is bottom-right
        if (this.gridSelection) {
            const normalized = normalizeGridSelection(this.gridSelection.start, this.gridSelection.end);
            this.gridSelection = {
                gridId: this.gridSelection.gridId,
                start: { col: normalized.col, row: normalized.row },
                end: { col: normalized.col + normalized.colSpan - 1, row: normalized.row + normalized.rowSpan - 1 }
            };
        }
    }

    clearGridSelection() {
        this.isSelectingGrid = false;
        this.gridSelection = null;
    }

    /**
     * Helper to get normalized selection dimensions
     */
    getSelectionDimensions(): { col: number; row: number; colSpan: number; rowSpan: number } | null {
        if (!this.gridSelection) return null;

        const minCol = Math.min(this.gridSelection.start.col, this.gridSelection.end.col);
        const maxCol = Math.max(this.gridSelection.start.col, this.gridSelection.end.col);
        const minRow = Math.min(this.gridSelection.start.row, this.gridSelection.end.row);
        const maxRow = Math.max(this.gridSelection.start.row, this.gridSelection.end.row);

        return {
            col: minCol,
            row: minRow,
            colSpan: maxCol - minCol + 1,
            rowSpan: maxRow - minRow + 1
        };
    }

    /**
     * Create item from current selection
     * Note: This will be called by UI to trigger the actual item creation
     */
    createItemFromSelection(itemConfig: ItemCreationConfig, breakpoint: LayoutTarget) {
        if (!this.gridSelection) return;

        const dims = this.getSelectionDimensions();
        if (!dims) return;

        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        const cardType = normalizeCardType(itemConfig.type);

        // Place at the calculated max row for the respective breakpoint
        const desktopRow = getMaxRow(config.items, 'desktop');
        const mobileRow = getMaxRow(config.items, 'mobile');

        // Create base layout
        const layout = createDefaultItemLayout(1, cardType, itemConfig.cardSize || 'standard');

        const legacyTarget = isViewportProfile(breakpoint)
            ? profileToLegacyBreakpoint(breakpoint)
            : breakpoint;

        // Override with selection dimensions for the current layout target.
        if (legacyTarget === 'desktop') {
            layout.desktop = {
                colStart: dims.col,
                colSpan: dims.colSpan,
                rowStart: dims.row,
                rowSpan: dims.rowSpan
            };
            layout.mobile.rowStart = mobileRow;
        } else {
            layout.mobile = {
                colStart: dims.col,
                colSpan: dims.colSpan,
                rowStart: dims.row,
                rowSpan: dims.rowSpan
            };
            layout.desktop.rowStart = desktopRow;
        }

        const newItem = normalizeDashboardItem({
            id: generateUUID(),
            cardType,
            entityId: itemConfig.entityId || "",
            name: itemConfig.name || "",
            layout,
            secondaryEntityId: itemConfig.secondaryEntityId || "",
            secondaryName: itemConfig.secondaryName || "",
            domainFilter: itemConfig.domainFilter || "",
            subtitle: itemConfig.subtitle || "",
            alignment: normalizeAlignment(itemConfig.alignment),
            tabs: itemConfig.tabs,
            activeTabIndex: 0,
            hours_to_show: itemConfig.hours_to_show,
            aggregate_func: itemConfig.aggregate_func,
            chartType: itemConfig.chartType,
            graphEntities: itemConfig.graphEntities,
            comparisonMode: itemConfig.comparisonMode,
            dataSource: itemConfig.dataSource,
            statisticsPeriod: itemConfig.statisticsPeriod,
            scaleMode: itemConfig.scaleMode,
            showAnalytics: itemConfig.showAnalytics,
            color_thresholds: itemConfig.color_thresholds,
            rangeBands: itemConfig.rangeBands,
            // Navigation properties
            path: itemConfig.path || "",
            iconType: itemConfig.iconType || "icon",
            imageUrl: itemConfig.imageUrl || "",
            icon: itemConfig.icon || "",
            shortcuts: itemConfig.shortcuts || [],
            options: itemConfig.options
        });

        if (isViewportProfile(breakpoint)) {
            setItemLayoutForProfile(newItem, breakpoint, {
                colStart: dims.col,
                colSpan: dims.colSpan,
                rowStart: dims.row,
                rowSpan: dims.rowSpan,
            });
        }

        config.items.push(newItem);

        // CRITICAL: Resolve collisions so existing items bounce away
        this.resolveCollisions(newItem.id, breakpoint);

        dashboardStore.markGridModified(config.id);
        dashboardStore.setConfig(root);
        this.clearGridSelection();
        this.selectItem(newItem.id);
    }

    /**
     * Update grid dimensions for position calculations
     */
    updateGridDimensions(
        rect: DOMRect,
        columnCount: number,
        colGap: number,
        rowGap: number,
        rowHeight: number,
        padding: number,
        element?: HTMLElement
    ) {
        this.gridRect = rect;
        if (element) this.gridElement = element;

        // Calculate scale factor by comparing physical width to CSS width
        // This is critical if the dashboard is scaled (e.g. via transform: scale)
        let scale = 1;
        if (element && element.offsetWidth > 0) {
            scale = rect.width / element.offsetWidth;
        }

        // Apply scale to all CSS-based inputs to get physical viewport units
        this.gridPadding = padding * scale;
        this.gridColumnGap = colGap * scale;
        this.gridRowGap = rowGap * scale;
        this.cellHeight = rowHeight * scale;

        // Calculate cell width in physical viewport units
        // contentWidth is total physical width minus double physical padding
        const contentWidth = rect.width - (this.gridPadding * 2);
        this.cellWidth = (contentWidth - (this.gridColumnGap * (columnCount - 1))) / columnCount;
    }

    // Grid focus state for nested editing
    focusedGridId = $state<string | null>(null);

    /**
     * Enter a specific grid context
     */
    enterGrid(gridId: string) {
        this.focusedGridId = gridId;
        this.clearSelection();
    }

    /**
     * Exit the current grid context (go up one level or to root)
     */
    exitGrid() {
        // For now, simpler implementation: just clear focus (return to root active tab)
        // Ideally we would push/pop a stack, but user interaction is likely "Back to Dashboard"
        this.focusedGridId = null;
        this.clearSelection();
    }

    /**
     * Helper to get the currently active grid configuration (tab)
     */
    private getActiveGrid(): { root: RoomDashboardConfig; tab: GridConfig } | null {
        const root = dashboardStore.config;
        if (!root) return null;

        // If no tabs, the root config itself acts as the active grid
        if (root.tabs.length === 0) {
            return { root, tab: root };
        }

        const activeRootTab = root.tabs.find(t => t.id === root.activeTabId);
        if (!activeRootTab) return null;

        // If no specific grid is focused, return the root active tab
        if (!this.focusedGridId) {
            return { root, tab: activeRootTab };
        }

        // Otherwise search for the focused grid
        const found = this.findGridRecursive(activeRootTab, this.focusedGridId);
        if (found) {
            return { root, tab: found };
        }

        // Fallback if not found (e.g. invalid ID), reset focus
        this.focusedGridId = null;
        return { root, tab: activeRootTab };
    }

    /**
     * Return the grid currently targeted by editing controls.
     * When a nested tab card is focused this is the nested grid, otherwise it is
     * the active root dashboard tab.
     */
    getActiveGridConfig(): GridConfig | null {
        const root = dashboardStore.config;
        if (!root) return null;

        if (root.tabs.length === 0) {
            return root;
        }

        const activeRootTab = root.tabs.find(t => t.id === root.activeTabId);
        if (!activeRootTab) return null;

        if (!this.focusedGridId) {
            return activeRootTab;
        }

        return this.findGridRecursive(activeRootTab, this.focusedGridId) ?? activeRootTab;
    }

    /**
     * Check if a specific item contains the currently focused grid (recursively)
     * Used to highlight the parent card when editing its nested content
     */
    isItemAncestorOfFocus(itemId: string): boolean {
        if (!this.focusedGridId) return false;

        const root = dashboardStore.config;
        if (!root) return false;
        const activeRootTab = root.tabs.find(t => t.id === root.activeTabId);
        if (!activeRootTab) return false;

        return isGridDescendantOfItem(activeRootTab, itemId, this.focusedGridId);
    }

    /**
     * Helper to find a grid by ID (delegates to utility)
     */
    private findGridRecursive(currentGrid: GridConfig, targetId: string): GridConfig | null {
        return findGridById(currentGrid, targetId);
    }

    /**
     * Start dragging an item
     */
    startDrag(itemId: string) {
        if (!this.isEditing) return;
        this.isDragging = true;
        this.dragItemId = itemId;
        this.selectItem(itemId);
    }

    /**
     * Update drag position (calculates target grid cell)
     */
    updateDragPosition(clientX: number, clientY: number, breakpoint: LayoutTarget) {
        if (!this.isDragging || !this.dragItemId) return;

        // Use fresh rect to account for scroll
        const rect = this.gridElement ? this.gridElement.getBoundingClientRect() : this.gridRect;
        if (!rect) return;

        const context = this.getActiveGrid();
        if (!context) return;
        const { tab: config } = context;

        const item = config.items.find(i => i.id === this.dragItemId);
        if (!item) return;

        const layout = getItemLayout(item, breakpoint);
        const columnCount = getGridColumnCount(config, breakpoint);

        // Calculate relative position in grid
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;

        // Snapping logic: Snap when mouse crosses the midpoint of a gap
        // Using Math.floor((rel - padding + gap/2) / (cell + gap)) + 1
        const targetCol = Math.max(1, Math.min(
            columnCount - layout.colSpan + 1,
            Math.floor((relX - this.gridPadding + (this.gridColumnGap / 2)) / (this.cellWidth + this.gridColumnGap)) + 1
        ));

        const targetRow = Math.max(1,
            Math.floor((relY - this.gridPadding + (this.gridRowGap / 2)) / (this.cellHeight + this.gridRowGap)) + 1
        );

        this.dragGhostPosition = { col: targetCol, row: targetRow };
    }

    /**
     * End drag and apply position
     */
    endDrag(breakpoint: LayoutTarget) {
        if (!this.isDragging || !this.dragItemId || !this.dragGhostPosition) {
            this.cancelDrag();
            return;
        }

        this.moveItem(this.dragItemId, this.dragGhostPosition.col, this.dragGhostPosition.row, breakpoint);
        this.cancelDrag();
    }

    /**
     * Cancel drag operation
     */
    cancelDrag() {
        this.isDragging = false;
        this.dragItemId = null;
        this.dragGhostPosition = null;
    }

    /**
     * Move an item to new grid position
     */
    moveItem(itemId: string, newCol: number, newRow: number, breakpoint: LayoutTarget) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        const item = config.items.find(i => i.id === itemId);
        if (!item) return;

        const layout = getItemLayout(item, breakpoint);
        layout.colStart = newCol;
        layout.rowStart = newRow;
        syncLayoutTarget(item, breakpoint);

        // Resolve any collisions caused by the move
        this.resolveCollisions(itemId, breakpoint);

        // Save updated config
        dashboardStore.markItemModified(itemId);
        dashboardStore.setConfig(root);
    }

    /**
     * Start resizing an item
     */
    startResize(itemId: string, direction: 'right' | 'bottom' | 'corner') {
        if (!this.isEditing) return;
        this.isResizing = true;
        this.resizeItemId = itemId;
        this.resizeDirection = direction;
        this.selectItem(itemId);
    }

    /**
     * Update resize preview
     */
    updateResize(clientX: number, clientY: number, breakpoint: LayoutTarget) {
        if (!this.isResizing || !this.resizeItemId) return;

        // Use fresh rect to account for scroll
        const rect = this.gridElement ? this.gridElement.getBoundingClientRect() : this.gridRect;
        if (!rect) return;

        const context = this.getActiveGrid();
        if (!context) return;
        const { tab: config } = context;

        const item = config.items.find(i => i.id === this.resizeItemId);
        if (!item) return;

        const layout = getItemLayout(item, breakpoint);
        const columnCount = getGridColumnCount(config, breakpoint);

        // Calculate relative position
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;

        // Calculate new spans based on direction
        // Snapping logic: Snap when mouse crosses the midpoint of a gap
        if (this.resizeDirection === 'right' || this.resizeDirection === 'corner') {
            const endCol = Math.floor((relX - this.gridPadding + (this.gridColumnGap / 2)) / (this.cellWidth + this.gridColumnGap)) + 1;
            const newColSpan = Math.max(1, Math.min(
                columnCount - layout.colStart + 1,
                endCol - layout.colStart + 1
            ));

            layout.colSpan = newColSpan;
            syncLayoutTarget(item, breakpoint);
        }

        if (this.resizeDirection === 'bottom' || this.resizeDirection === 'corner') {
            const endRow = Math.floor((relY - this.gridPadding + (this.gridRowGap / 2)) / (this.cellHeight + this.gridRowGap)) + 1;
            let newRowSpan = Math.max(1, endRow - layout.rowStart + 1);


            layout.rowSpan = newRowSpan;
            syncLayoutTarget(item, breakpoint);
        }
    }

    /**
     * End resize and save - resolves collisions by pushing overlapping items down
     */
    endResize(breakpoint: LayoutTarget) {
        if (!this.resizeItemId) {
            this.cancelResize();
            return;
        }

        // Resolve any collisions caused by the resize
        this.resolveCollisions(this.resizeItemId, breakpoint);

        const context = this.getActiveGrid();
        if (context) {
            dashboardStore.markItemModified(this.resizeItemId);
            dashboardStore.setConfig(context.root);
        }

        this.cancelResize();
    }

    /**
     * Check if two items overlap
     */
    private itemsOverlap(
        a: { colStart: number; colSpan: number; rowStart: number; rowSpan: number },
        b: { colStart: number; colSpan: number; rowStart: number; rowSpan: number }
    ): boolean {
        const aColEnd = a.colStart + a.colSpan - 1;
        const aRowEnd = a.rowStart + a.rowSpan - 1;
        const bColEnd = b.colStart + b.colSpan - 1;
        const bRowEnd = b.rowStart + b.rowSpan - 1;

        // Check if rectangles overlap
        return !(
            aColEnd < b.colStart ||
            bColEnd < a.colStart ||
            aRowEnd < b.rowStart ||
            bRowEnd < a.rowStart
        );
    }

    /**
     * Resolve collisions by pushing overlapping items down
     */
    resolveCollisions(movedItemId: string, breakpoint: LayoutTarget) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { tab: config } = context;

        resolveLayoutCollisions(config.items, movedItemId, breakpoint);
    }

    /**
     * Cancel resize operation
     */
    cancelResize() {
        this.isResizing = false;
        this.resizeItemId = null;
        this.resizeDirection = null;
    }

    /**
     * Resize an item's span
     */
    resizeItem(itemId: string, newColSpan: number, newRowSpan: number, breakpoint: LayoutTarget) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        const item = config.items.find(i => i.id === itemId);
        if (!item) return;

        const columnCount = getGridColumnCount(config, breakpoint);
        const layout = getItemLayout(item, breakpoint);

        // Ensure span doesn't exceed grid bounds
        const maxColSpan = columnCount - layout.colStart + 1;

        layout.colSpan = Math.min(newColSpan, maxColSpan);
        layout.rowSpan = newRowSpan;
        syncLayoutTarget(item, breakpoint);

        dashboardStore.markItemModified(itemId);
        dashboardStore.setConfig(root);
    }

    /**
     * Delete the selected item
     */
    deleteSelectedItem() {
        if (!this.selectedItemId) return;

        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        config.items = config.items.filter(i => i.id !== this.selectedItemId);
        dashboardStore.markGridModified(config.id);
        dashboardStore.setConfig(root);
        this.clearSelection();
    }

    /**
     * Auto-arrange items to fill gaps (simple pack from top-left)
     */
    autoArrange(breakpoint: LayoutTarget) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        const columnCount = getGridColumnCount(config, breakpoint);
        packItemsIntoGrid(config.items, columnCount, breakpoint);

        dashboardStore.markGridItemsModified(config.id);
        dashboardStore.setConfig(root);
    }

    /**
     * Delete an item by ID
     */
    deleteItem(itemId: string) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        const index = config.items.findIndex((item) => item.id === itemId);
        if (index === -1) return;

        config.items.splice(index, 1);

        if (this.selectedItemId === itemId) {
            this.selectedItemId = null;
        }

        dashboardStore.markGridModified(config.id);
        dashboardStore.setConfig(root);
    }

    /**
     * Update grid configuration (dimensions, gaps, padding, row height)
     */
    updateGridConfig(updates: Partial<Pick<GridConfig,
        'columns' | 'columnProfiles' | 'gap' | 'padding' | 'rowHeight' | 'rowGap' | 'columnGap' | 'rows' | 'background' | 'cardSurfaceStyle'
    >>) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        Object.assign(config, updates);
        dashboardStore.markGridModified(config.id);
        dashboardStore.setConfig(root);
    }

    /**
     * Update a specific row height
     */
    setRowHeight(rowIndex: number, height: number) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        ensureExplicitRows(config, rowIndex, this.gridRect?.height);

        // Update the specific track
        const track = (config.rows as GridTrack[])[rowIndex - 1];
        if (track) {
            track.size = height;
        }

        dashboardStore.markGridModified(config.id);
        dashboardStore.setConfig(root);
    }

    /**
     * Add a new row at the specified index
     * Shifts items down
     */
    addRow(rowIndex: number, height?: number) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;
        const defaultHeight = config.rowHeight ?? 80;

        ensureExplicitRows(config, null, this.gridRect?.height);

        // Insert new track
        const newTrack = {
            id: generateUUID(),
            type: "row" as const,
            size: height ?? defaultHeight
        };

        const currentTracks = config.rows as GridTrack[];

        // Fill gaps if necessary
        if (rowIndex > currentTracks.length + 1) {
            const fillCount = rowIndex - 1 - currentTracks.length;
            const fillers: GridTrack[] = Array.from({ length: fillCount }, () => ({
                id: generateUUID(),
                type: "row" as const,
                size: defaultHeight
            }));
            currentTracks.push(...fillers);
        }

        const insertIndex = Math.max(0, rowIndex - 1);
        currentTracks.splice(insertIndex, 0, newTrack);

        // Shift items
        for (const item of config.items) {
            ensureItemLayoutProfiles(item);
            shiftLayoutRowsForAdd(item.layout.desktop, rowIndex);
            shiftLayoutRowsForAdd(item.layout.mobile, rowIndex);
            for (const profile of VIEWPORT_PROFILES) {
                shiftLayoutRowsForAdd(getItemLayoutForProfile(item, profile), rowIndex);
            }
        }

        dashboardStore.markGridModified(config.id);
        dashboardStore.setConfig(root);
    }

    /**
     * Remove a row at the specified index
     * Shifts items up
     */
    removeRow(rowIndex: number) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        ensureExplicitRows(config, null, this.gridRect?.height);

        const currentTracks = config.rows as GridTrack[];
        if (rowIndex > currentTracks.length) return;

        currentTracks.splice(rowIndex - 1, 1);

        // Shift items
        for (const item of config.items) {
            ensureItemLayoutProfiles(item);
            shiftLayoutRowsForRemove(item.layout.desktop, rowIndex);
            shiftLayoutRowsForRemove(item.layout.mobile, rowIndex);
            for (const profile of VIEWPORT_PROFILES) {
                shiftLayoutRowsForRemove(getItemLayoutForProfile(item, profile), rowIndex);
            }
        }

        dashboardStore.markGridModified(config.id);
        dashboardStore.setConfig(root);
    }

    /**
     * Update a specific column width
     * Note: Currently only supports uniform columns, so this updates the total column count
     * or suggests changing the layout if we want non-uniform columns.
     * For now, we'll use this to update the uniform column count if the user tries to "resize"
     */
    setColumnWidth(colIndex: number, width: number, breakpoint: LayoutTarget) {
        // Implementation for non-uniform columns would go here.
        // For now, let's keep it simple and maybe just log or handle uniform updates.
        console.log(`Setting column ${colIndex} width to ${width}px for ${breakpoint}`);
    }

    addItem(itemConfig: Partial<DashboardItem> & { type?: string; name?: string; cardSize?: 'condensed' | 'standard' | 'poster'; subtitle?: string; alignment?: DashboardItem['alignment'] }) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        const cardType = normalizeCardType(itemConfig.type);

        const maxRow = getMaxRow(config.items, 'desktop');
        const newItem = createNewItem(cardType, itemConfig, maxRow);

        config.items.push(newItem);
        dashboardStore.markGridModified(config.id);
        dashboardStore.setConfig(root);
    }
}

export const dashboardEditorStore = new DashboardEditorStore();
