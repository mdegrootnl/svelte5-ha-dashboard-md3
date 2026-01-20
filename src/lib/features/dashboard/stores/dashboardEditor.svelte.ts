// Dashboard Editor Store - Manages edit mode state and operations
import { browser } from '$app/environment';
import type {
    DashboardItem,
    GridConfig,
    Breakpoint,
    DashboardCardType,
    RoomDashboardConfig
} from '$lib/types/dashboard';
import { createDefaultItemLayout } from '$lib/types/dashboard';
import { dashboardStore } from './dashboard.svelte';

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
    private gridRect: DOMRect | null = null;
    private cellWidth = 0;
    private cellHeight = 80; // Default row height

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
            const minCol = Math.min(this.gridSelection.start.col, this.gridSelection.end.col);
            const maxCol = Math.max(this.gridSelection.start.col, this.gridSelection.end.col);
            const minRow = Math.min(this.gridSelection.start.row, this.gridSelection.end.row);
            const maxRow = Math.max(this.gridSelection.start.row, this.gridSelection.end.row);

            this.gridSelection = {
                gridId: this.gridSelection.gridId,
                start: { col: minCol, row: minRow },
                end: { col: maxCol, row: maxRow }
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
    createItemFromSelection(itemConfig: any, breakpoint: Breakpoint) {
        if (!this.gridSelection) return;

        const dims = this.getSelectionDimensions();
        if (!dims) return;

        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        let cardType: DashboardCardType = "button";
        if (itemConfig.type === "thermostat") cardType = "thermostat";
        if (itemConfig.type === "media") cardType = "media";
        if (itemConfig.type === "title") cardType = "title";
        if (itemConfig.type === "tabs") cardType = "tabs";

        // Create base layout
        const layout = createDefaultItemLayout(1, cardType, itemConfig.cardSize || 'standard');

        // Override with selection dimensions for the current breakpoint
        if (breakpoint === 'desktop') {
            layout.desktop = {
                colStart: dims.col,
                colSpan: dims.colSpan,
                rowStart: dims.row,
                rowSpan: dims.rowSpan
            };

            // For mobile, find the next available row to avoid overlap
            let maxRowMobile = 1;
            for (const item of config.items) {
                const mLayout = item.layout.mobile;
                maxRowMobile = Math.max(maxRowMobile, mLayout.rowStart + mLayout.rowSpan);
            }
            layout.mobile.rowStart = maxRowMobile;
        } else {
            layout.mobile = {
                colStart: dims.col,
                colSpan: dims.colSpan,
                rowStart: dims.row,
                rowSpan: dims.rowSpan
            };

            // For desktop, find the next available row
            let maxRowDesktop = 1;
            for (const item of config.items) {
                const dLayout = item.layout.desktop;
                maxRowDesktop = Math.max(maxRowDesktop, dLayout.rowStart + dLayout.rowSpan);
            }
            layout.desktop.rowStart = maxRowDesktop;
        }

        const newItem: DashboardItem = {
            id: crypto.randomUUID(),
            cardType,
            entityId: itemConfig.entityId || "",
            name: itemConfig.name || "",
            layout,
            secondaryEntityId: itemConfig.secondaryEntityId || "",
            secondaryName: itemConfig.secondaryName || "",
            domainFilter: itemConfig.domainFilter || "",
            subtitle: itemConfig.subtitle || "",
            alignment: itemConfig.alignment || "start",
            tabs: itemConfig.tabs,
            activeTabIndex: 0
        };

        config.items.push(newItem);

        // CRITICAL: Resolve collisions so existing items bounce away
        this.resolveCollisions(newItem.id, breakpoint);

        dashboardStore.setConfig(root);
        this.clearGridSelection();
        this.selectItem(newItem.id);
    }

    /**
     * Update grid dimensions for position calculations
     */
    updateGridDimensions(rect: DOMRect, columnCount: number, gap: number) {
        this.gridRect = rect;
        this.cellWidth = (rect.width - (gap * (columnCount - 1))) / columnCount;
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
     * Check if a specific item contains the currently focused grid (recursively)
     * Used to highlight the parent card when editing its nested content
     */
    isItemAncestorOfFocus(itemId: string): boolean {
        if (!this.focusedGridId) return false;

        const root = dashboardStore.config;
        if (!root) return false;
        const activeRootTab = root.tabs.find(t => t.id === root.activeTabId);
        if (!activeRootTab) return false;

        return this.isGridDescendantOfItem(activeRootTab, itemId, this.focusedGridId);
    }

    private isGridDescendantOfItem(contextGrid: GridConfig, targetItemId: string, searchedGridId: string): boolean {
        for (const item of contextGrid.items) {
            // Case 1: We found the target item. Check if the grid is inside it.
            if (item.id === targetItemId) {
                if (item.cardType !== 'tabs' || !item.tabs) return false;

                for (const tab of item.tabs) {
                    if (tab.id === searchedGridId) return true;
                    if (this.gridContainsGrid(tab, searchedGridId)) return true;
                }
                return false;
            }

            // Case 2: This is not the item, but it might contain the item. Recurse.
            if (item.cardType === 'tabs' && item.tabs) {
                for (const tab of item.tabs) {
                    if (this.isGridDescendantOfItem(tab, targetItemId, searchedGridId)) return true;
                }
            }
        }
        return false;
    }

    private gridContainsGrid(parentGrid: GridConfig, searchedGridId: string): boolean {
        for (const item of parentGrid.items) {
            if (item.cardType === 'tabs' && item.tabs) {
                for (const tab of item.tabs) {
                    if (tab.id === searchedGridId) return true;
                    if (this.gridContainsGrid(tab, searchedGridId)) return true;
                }
            }
        }
        return false;
    }

    /**
     * Recursively find a grid config by ID
     */
    private findGridRecursive(currentGrid: GridConfig, targetId: string): GridConfig | null {
        if (currentGrid.id === targetId) return currentGrid;

        for (const item of currentGrid.items) {
            if (item.cardType === 'tabs' && item.tabs) {
                // Check each tab in the tab card
                for (const tab of item.tabs) {
                    const found = this.findGridRecursive(tab, targetId);
                    if (found) return found;
                }
            }
        }
        return null;
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
    updateDragPosition(clientX: number, clientY: number, breakpoint: Breakpoint) {
        if (!this.isDragging || !this.gridRect || !this.dragItemId) return;

        const context = this.getActiveGrid();
        if (!context) return;
        const { tab: config } = context;

        const item = config.items.find(i => i.id === this.dragItemId);
        if (!item) return;

        const layout = breakpoint === 'desktop' ? item.layout.desktop : item.layout.mobile;
        const columnCount = breakpoint === 'desktop' ? config.columns.desktop : config.columns.mobile;

        // Calculate relative position in grid
        const relX = clientX - this.gridRect.left;
        const relY = clientY - this.gridRect.top;

        // Calculate target column (1-indexed)
        const targetCol = Math.max(1, Math.min(
            columnCount - layout.colSpan + 1,
            Math.floor(relX / (this.cellWidth + config.gap)) + 1
        ));

        // Calculate target row (1-indexed)
        const targetRow = Math.max(1, Math.floor(relY / (this.cellHeight + config.gap)) + 1);

        this.dragGhostPosition = { col: targetCol, row: targetRow };
    }

    /**
     * End drag and apply position
     */
    endDrag(breakpoint: Breakpoint) {
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
    moveItem(itemId: string, newCol: number, newRow: number, breakpoint: Breakpoint) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        const item = config.items.find(i => i.id === itemId);
        if (!item) return;

        // Update the appropriate layout
        if (breakpoint === 'desktop') {
            item.layout.desktop.colStart = newCol;
            item.layout.desktop.rowStart = newRow;
        } else {
            item.layout.mobile.colStart = newCol;
            item.layout.mobile.rowStart = newRow;
        }

        // Resolve any collisions caused by the move
        this.resolveCollisions(itemId, breakpoint);

        // Save updated config
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
    updateResize(clientX: number, clientY: number, breakpoint: Breakpoint) {
        if (!this.isResizing || !this.gridRect || !this.resizeItemId) return;

        const context = this.getActiveGrid();
        if (!context) return;
        const { tab: config } = context;

        const item = config.items.find(i => i.id === this.resizeItemId);
        if (!item) return;

        const layout = breakpoint === 'desktop' ? item.layout.desktop : item.layout.mobile;
        const columnCount = breakpoint === 'desktop' ? config.columns.desktop : config.columns.mobile;

        // Calculate relative position
        const relX = clientX - this.gridRect.left;
        const relY = clientY - this.gridRect.top;

        // Calculate new spans based on direction
        if (this.resizeDirection === 'right' || this.resizeDirection === 'corner') {
            const endCol = Math.floor(relX / (this.cellWidth + config.gap)) + 1;
            const newColSpan = Math.max(1, Math.min(
                columnCount - layout.colStart + 1,
                endCol - layout.colStart + 1
            ));

            if (breakpoint === 'desktop') {
                item.layout.desktop.colSpan = newColSpan;
            } else {
                item.layout.mobile.colSpan = newColSpan;
            }
        }

        if (this.resizeDirection === 'bottom' || this.resizeDirection === 'corner') {
            const endRow = Math.floor(relY / (this.cellHeight + config.gap)) + 1;
            let newRowSpan = Math.max(1, endRow - layout.rowStart + 1);


            if (breakpoint === 'desktop') {
                item.layout.desktop.rowSpan = newRowSpan;
            } else {
                item.layout.mobile.rowSpan = newRowSpan;
            }
        }
    }

    /**
     * End resize and save - resolves collisions by pushing overlapping items down
     */
    endResize(breakpoint: Breakpoint) {
        if (!this.resizeItemId) {
            this.cancelResize();
            return;
        }

        // Resolve any collisions caused by the resize
        this.resolveCollisions(this.resizeItemId, breakpoint);

        const context = this.getActiveGrid();
        if (context) {
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
    resolveCollisions(movedItemId: string, breakpoint: Breakpoint) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { tab: config } = context;

        const movedItem = config.items.find(i => i.id === movedItemId);
        if (!movedItem) return;

        const movedLayout = breakpoint === 'desktop'
            ? movedItem.layout.desktop
            : movedItem.layout.mobile;

        // Find all items that overlap with the moved/resized item
        const overlappingItems = config.items.filter(item => {
            if (item.id === movedItemId) return false;

            const layout = breakpoint === 'desktop'
                ? item.layout.desktop
                : item.layout.mobile;

            return this.itemsOverlap(movedLayout, layout);
        });

        if (overlappingItems.length === 0) return;

        // Calculate where the moved item ends (in rows)
        const movedRowEnd = movedLayout.rowStart + movedLayout.rowSpan;

        // Push each overlapping item down
        for (const item of overlappingItems) {
            const layout = breakpoint === 'desktop'
                ? item.layout.desktop
                : item.layout.mobile;

            // Only push down if the item starts before or at where the moved item ends
            if (layout.rowStart < movedRowEnd) {
                if (breakpoint === 'desktop') {
                    item.layout.desktop.rowStart = movedRowEnd;
                } else {
                    item.layout.mobile.rowStart = movedRowEnd;
                }
            }
        }

        // Recursively resolve collisions for items that were pushed down
        for (const item of overlappingItems) {
            this.resolveCollisions(item.id, breakpoint);
        }
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
    resizeItem(itemId: string, newColSpan: number, newRowSpan: number, breakpoint: Breakpoint) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        const item = config.items.find(i => i.id === itemId);
        if (!item) return;

        const columnCount = breakpoint === 'desktop' ? config.columns.desktop : config.columns.mobile;
        const layout = breakpoint === 'desktop' ? item.layout.desktop : item.layout.mobile;

        // Ensure span doesn't exceed grid bounds
        const maxColSpan = columnCount - layout.colStart + 1;

        if (breakpoint === 'desktop') {
            item.layout.desktop.colSpan = Math.min(newColSpan, maxColSpan);
            item.layout.desktop.rowSpan = newRowSpan;
        } else {
            item.layout.mobile.colSpan = Math.min(newColSpan, maxColSpan);
            item.layout.mobile.rowSpan = newRowSpan;
        }

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
        dashboardStore.setConfig(root);
        this.clearSelection();
    }

    /**
     * Auto-arrange items to fill gaps (simple pack from top-left)
     */
    autoArrange(breakpoint: Breakpoint) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        const columnCount = breakpoint === 'desktop' ? config.columns.desktop : config.columns.mobile;

        // Sort items by current position
        const items = [...config.items].sort((a, b) => {
            const layoutA = breakpoint === 'desktop' ? a.layout.desktop : a.layout.mobile;
            const layoutB = breakpoint === 'desktop' ? b.layout.desktop : b.layout.mobile;
            return (layoutA.rowStart * 100 + layoutA.colStart) - (layoutB.rowStart * 100 + layoutB.colStart);
        });

        // Track grid occupancy
        const occupancy: boolean[][] = [];

        function getNextPosition(colSpan: number): { col: number; row: number } {
            let row = 0;

            while (true) {
                if (!occupancy[row]) {
                    occupancy[row] = new Array(columnCount).fill(false);
                }

                for (let col = 0; col <= columnCount - colSpan; col++) {
                    let fits = true;
                    for (let c = col; c < col + colSpan; c++) {
                        if (occupancy[row][c]) {
                            fits = false;
                            break;
                        }
                    }

                    if (fits) {
                        for (let c = col; c < col + colSpan; c++) {
                            occupancy[row][c] = true;
                        }
                        return { col: col + 1, row: row + 1 };
                    }
                }

                row++;
            }
        }

        // Reposition each item
        for (const item of items) {
            const layout = breakpoint === 'desktop' ? item.layout.desktop : item.layout.mobile;
            const pos = getNextPosition(layout.colSpan);

            if (breakpoint === 'desktop') {
                item.layout.desktop.colStart = pos.col;
                item.layout.desktop.rowStart = pos.row;
            } else {
                item.layout.mobile.colStart = pos.col;
                item.layout.mobile.rowStart = pos.row;
            }
        }

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

        dashboardStore.setConfig(root);
    }

    /**
     * Update grid configuration (dimensions, gaps, padding, row height)
     */
    updateGridConfig(updates: Partial<Pick<GridConfig,
        'columns' | 'gap' | 'padding' | 'rowHeight' | 'rowGap' | 'columnGap' | 'rows'
    >>) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        Object.assign(config, updates);
        dashboardStore.setConfig(root);
    }

    /**
     * Update a specific row height
     */
    setRowHeight(rowIndex: number, height: number) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        // If currently implicit, convert to explicit tracks
        if (config.rows === "implicit") {
            const defaultHeight = config.rowHeight ?? 80;

            // Find the maximum row index used by any item to ensure we don't shrink the grid
            let maxRow = 0;
            for (const item of config.items) {
                const desktopEnd = item.layout.desktop.rowStart + item.layout.desktop.rowSpan;
                const mobileEnd = item.layout.mobile.rowStart + item.layout.mobile.rowSpan;
                maxRow = Math.max(maxRow, desktopEnd, mobileEnd);
            }

            // Calculate how many rows fit in the current canvas to prevent visual collapse
            // Default to at least 12 rows (approx 1 screen height at 80px)
            let minRows = 12;
            if (this.gridRect && defaultHeight > 0) {
                minRows = Math.ceil(this.gridRect.height / defaultHeight);
            }

            // Ensure we cover items, the edited row, and fill the canvas
            maxRow = Math.max(maxRow, rowIndex, minRows);

            // Create explicit tracks
            config.rows = Array.from({ length: maxRow }, () => ({
                id: crypto.randomUUID(),
                type: "row",
                size: defaultHeight
            }));
        }

        // Ensure the array is long enough if we're editing a row beyond the current explicit definition
        if ((config.rows as any[]).length < rowIndex) {
            const currentTracks = config.rows as any[];
            const defaultHeight = config.rowHeight ?? 80;
            const newTracksCount = rowIndex - currentTracks.length;

            const newTracks = Array.from({ length: newTracksCount }, () => ({
                id: crypto.randomUUID(),
                type: "row",
                size: defaultHeight
            }));

            config.rows = [...currentTracks, ...newTracks];
        }

        // Update the specific track
        const track = (config.rows as any[])[rowIndex - 1];
        if (track) {
            track.size = height;
        }

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

        // Ensure explicit rows
        if (config.rows === "implicit") {
            // Use same conversion logic as setRowHeight but we don't need to expand for a specific index yet
            let maxRow = 0;
            for (const item of config.items) {
                const desktopEnd = item.layout.desktop.rowStart + item.layout.desktop.rowSpan;
                const mobileEnd = item.layout.mobile.rowStart + item.layout.mobile.rowSpan;
                maxRow = Math.max(maxRow, desktopEnd, mobileEnd);
            }

            let minRows = 12;
            if (this.gridRect && defaultHeight > 0) {
                minRows = Math.ceil(this.gridRect.height / defaultHeight);
            }
            // Ensure we cover items and canvas
            maxRow = Math.max(maxRow, minRows);

            config.rows = Array.from({ length: maxRow }, () => ({
                id: crypto.randomUUID(),
                type: "row",
                size: defaultHeight
            }));
        }

        // Insert new track
        const newTrack = {
            id: crypto.randomUUID(),
            type: "row" as const,
            size: height ?? defaultHeight
        };

        const currentTracks = config.rows as any[];
        // rowIndex is 1-based. To insert AT rowIndex:
        // If rowIndex is 1, insert at 0.
        // If rowIndex is N, insert at N-1.
        // Special case: if rowIndex > length, fill gaps.
        if (rowIndex > currentTracks.length + 1) {
            const fillCount = rowIndex - 1 - currentTracks.length;
            const fillers = Array.from({ length: fillCount }, () => ({
                id: crypto.randomUUID(),
                type: "row",
                size: defaultHeight
            }));
            currentTracks.push(...fillers);
        }

        // Splice insertion
        // If we want to add row 1, we splice at index 0.
        const insertIndex = Math.max(0, rowIndex - 1);
        currentTracks.splice(insertIndex, 0, newTrack);

        // Shift items
        // If inserted at row 2 (index 1), row 2 becomes row 3.
        // Items starting at row >= 2 need to move +1.
        // Items starting before 2 but ending after 2 need span +1.
        for (const item of config.items) {
            // Helper for updating a layout
            const shiftLayout = (layout: any) => {
                if (layout.rowStart >= rowIndex) {
                    layout.rowStart += 1;
                } else if (layout.rowStart < rowIndex && (layout.rowStart + layout.rowSpan) > rowIndex) {
                    // Spans across the insertion point
                    layout.rowSpan += 1;
                }
            };

            shiftLayout(item.layout.desktop);
            shiftLayout(item.layout.mobile);
        }

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
        const defaultHeight = config.rowHeight ?? 80;

        // Ensure explicit rows
        if (config.rows === "implicit") {
            // Use same conversion logic as setRowHeight
            let maxRow = 0;
            for (const item of config.items) {
                const desktopEnd = item.layout.desktop.rowStart + item.layout.desktop.rowSpan;
                const mobileEnd = item.layout.mobile.rowStart + item.layout.mobile.rowSpan;
                maxRow = Math.max(maxRow, desktopEnd, mobileEnd);
            }

            let minRows = 12;
            if (this.gridRect && defaultHeight > 0) {
                minRows = Math.ceil(this.gridRect.height / defaultHeight);
            }
            // Ensure we cover items and canvas
            maxRow = Math.max(maxRow, minRows);

            config.rows = Array.from({ length: maxRow }, () => ({
                id: crypto.randomUUID(),
                type: "row",
                size: defaultHeight
            }));
        }

        const currentTracks = config.rows as any[];

        // Remove track
        // rowIndex is 1-based.
        if (rowIndex > currentTracks.length) return; // Can't remove non-existent

        currentTracks.splice(rowIndex - 1, 1);

        // Shift items
        for (const item of config.items) {
            // Helper for updating a layout
            const shiftLayout = (layout: any) => {
                if (layout.rowStart > rowIndex) {
                    // Started after deleted row, move up
                    layout.rowStart -= 1;
                } else if (layout.rowStart < rowIndex && (layout.rowStart + layout.rowSpan) > rowIndex) {
                    // Spanning across the deleted row
                    layout.rowSpan -= 1;
                }
                // If rowStart == rowIndex, it now effectively starts at the same visual position 
                // (which becomes the old rowIndex + 1 track, now shifted to rowIndex).
                // So no change needed for rowStart.
            };

            shiftLayout(item.layout.desktop);
            shiftLayout(item.layout.mobile);
        }

        dashboardStore.setConfig(root);
    }

    /**
     * Update a specific column width
     * Note: Currently only supports uniform columns, so this updates the total column count
     * or suggests changing the layout if we want non-uniform columns.
     * For now, we'll use this to update the uniform column count if the user tries to "resize"
     */
    setColumnWidth(colIndex: number, width: number, breakpoint: Breakpoint) {
        // Implementation for non-uniform columns would go here.
        // For now, let's keep it simple and maybe just log or handle uniform updates.
        console.log(`Setting column ${colIndex} width to ${width}px for ${breakpoint}`);
    }

    addItem(itemConfig: Partial<DashboardItem> & { type?: string; name?: string; cardSize?: 'condensed' | 'standard' | 'poster'; subtitle?: string; alignment?: string }) {
        const context = this.getActiveGrid();
        if (!context) return;
        const { root, tab: config } = context;

        // Map generic type to card cards
        let cardType: DashboardCardType = "button";
        if (itemConfig.type === "thermostat") cardType = "thermostat";
        if (itemConfig.type === "media") cardType = "media";
        if (itemConfig.type === "title") cardType = "title";
        if (itemConfig.type === "tabs") cardType = "tabs";

        // Find next available row
        let maxRow = 1;
        for (const item of config.items) {
            const layout = item.layout.desktop;
            maxRow = Math.max(maxRow, layout.rowStart + layout.rowSpan);
        }
        // Correction: above loop was using item.layout.desktop correctly in original code but I see 'maxRow = Math.max(maxRow, layout.rowStart + layout.rowSpan);' 
        // I will stick to original logic but ensure I copy it correctly.
        // Re-reading original logic:
        // for (const item of config.items) {
        //    const layout = item.layout.desktop;
        //    maxRow = Math.max(maxRow, layout.rowStart + layout.rowSpan);
        // }

        // Create default layout at the new row with appropriate size
        const layout = createDefaultItemLayout(1, cardType, itemConfig.cardSize || 'standard');
        // Place at the bottom
        layout.desktop.rowStart = maxRow;
        layout.mobile.rowStart = maxRow;

        // DashboardItem type should now have 'name'
        const newItem: DashboardItem = {
            id: crypto.randomUUID(),
            cardType,
            entityId: itemConfig.entityId || "",
            name: itemConfig.name || "",
            layout,
            // Optional thermostat-specific fields (default to empty string)
            secondaryEntityId: itemConfig.secondaryEntityId || "",
            secondaryName: itemConfig.secondaryName || "",
            domainFilter: itemConfig.domainFilter || "",
            subtitle: itemConfig.subtitle || "",
            alignment: itemConfig.alignment as "start" | "center" | "end" || "start"
        };

        config.items.push(newItem);
        dashboardStore.setConfig(root);
    }
}

export const dashboardEditorStore = new DashboardEditorStore();
