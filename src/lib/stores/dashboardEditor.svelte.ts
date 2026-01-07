// Dashboard Editor Store - Manages edit mode state and operations
import { browser } from '$app/environment';
import type {
    DashboardItem,
    ItemLayout,
    Breakpoint,
    GridConfig
} from '$lib/types/dashboard';
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
        this.cancelDrag();
        // Config is auto-saved via dashboardStore
    }

    /**
     * Select an item for editing
     */
    selectItem(itemId: string) {
        this.selectedItemId = itemId;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedItemId = null;
    }

    /**
     * Update grid dimensions for position calculations
     */
    updateGridDimensions(rect: DOMRect, columnCount: number, gap: number) {
        this.gridRect = rect;
        this.cellWidth = (rect.width - (gap * (columnCount - 1))) / columnCount;
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

        const config = dashboardStore.config;
        if (!config) return;

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
        const config = dashboardStore.config;
        if (!config) return;

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
        dashboardStore.setConfig(config);
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

        const config = dashboardStore.config;
        if (!config) return;

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

            // Constraint: Thermostat cards max 3 rows
            if (item.cardType === 'thermostat') {
                newRowSpan = Math.min(newRowSpan, 3);
            }

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
        if (!this.resizeItemId || !dashboardStore.config) {
            this.cancelResize();
            return;
        }

        // Resolve any collisions caused by the resize
        this.resolveCollisions(this.resizeItemId, breakpoint);

        dashboardStore.setConfig(dashboardStore.config);
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
        const config = dashboardStore.config;
        if (!config) return;

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
        const config = dashboardStore.config;
        if (!config) return;

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

        dashboardStore.setConfig(config);
    }

    /**
     * Delete the selected item
     */
    deleteSelectedItem() {
        if (!this.selectedItemId || !dashboardStore.config) return;

        const config = dashboardStore.config;
        config.items = config.items.filter(i => i.id !== this.selectedItemId);
        dashboardStore.setConfig(config);
        this.clearSelection();
    }

    /**
     * Auto-arrange items to fill gaps (simple pack from top-left)
     */
    autoArrange(breakpoint: Breakpoint) {
        const config = dashboardStore.config;
        if (!config) return;

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

        dashboardStore.setConfig(config);
    }

    /**
     * Update grid configuration (dimensions, gaps, padding, row height)
     */
    updateGridConfig(updates: Partial<Pick<GridConfig,
        'columns' | 'gap' | 'padding' | 'rowHeight' | 'rowGap' | 'columnGap' | 'rows'
    >>) {
        const config = dashboardStore.config;
        if (!config) return;

        Object.assign(config, updates);
        dashboardStore.setConfig(config);
    }
}

export const dashboardEditorStore = new DashboardEditorStore();
