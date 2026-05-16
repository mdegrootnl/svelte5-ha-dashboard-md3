/**
 * Grid Layout Utilities
 * Pure functions for grid layout calculations and collision detection
 */

import type { DashboardItem, Breakpoint, GridConfig, DashboardCardType } from '$lib/types/dashboard';
import { createDefaultItemLayout } from '$lib/types/dashboard';
import { generateUUID } from '$lib/utils/uuid';
import { normalizeDashboardItem } from './dashboardDefaults';

/**
 * Layout bounds for collision checking
 */
export interface LayoutBounds {
    colStart: number;
    colSpan: number;
    rowStart: number;
    rowSpan: number;
}

/**
 * Check if two layout rectangles overlap
 */
export function layoutsOverlap(a: LayoutBounds, b: LayoutBounds): boolean {
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
 * Get the layout for an item based on breakpoint
 */
export function getItemLayout(item: DashboardItem, breakpoint: Breakpoint): LayoutBounds {
    return breakpoint === 'desktop' ? item.layout.desktop : item.layout.mobile;
}

/**
 * Find all items that overlap with a given item
 */
export function findOverlappingItems(
    items: DashboardItem[],
    targetItemId: string,
    breakpoint: Breakpoint
): DashboardItem[] {
    const targetItem = items.find(i => i.id === targetItemId);
    if (!targetItem) return [];

    const targetLayout = getItemLayout(targetItem, breakpoint);

    return items.filter(item => {
        if (item.id === targetItemId) return false;
        return layoutsOverlap(targetLayout, getItemLayout(item, breakpoint));
    });
}

/**
 * Resolve collisions by pushing overlapping items down
 * Returns the modified items array (mutates in place)
 */
export function resolveLayoutCollisions(
    items: DashboardItem[],
    movedItemId: string,
    breakpoint: Breakpoint
): void {
    const movedItem = items.find(i => i.id === movedItemId);
    if (!movedItem) return;

    const movedLayout = getItemLayout(movedItem, breakpoint);
    const overlappingItems = findOverlappingItems(items, movedItemId, breakpoint);

    if (overlappingItems.length === 0) return;

    // Calculate where the moved item ends (in rows)
    const movedRowEnd = movedLayout.rowStart + movedLayout.rowSpan;

    // Push each overlapping item down
    for (const item of overlappingItems) {
        const layout = getItemLayout(item, breakpoint);

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
        resolveLayoutCollisions(items, item.id, breakpoint);
    }
}

/**
 * Pack items into grid using bento-box algorithm
 * Returns items with updated layouts
 */
export function packItemsIntoGrid(
    items: DashboardItem[],
    columnCount: number,
    breakpoint: Breakpoint
): void {
    // Sort items by current position
    const sortedItems = [...items].sort((a, b) => {
        const layoutA = getItemLayout(a, breakpoint);
        const layoutB = getItemLayout(b, breakpoint);
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
    for (const item of sortedItems) {
        const layout = getItemLayout(item, breakpoint);
        const pos = getNextPosition(layout.colSpan);

        if (breakpoint === 'desktop') {
            item.layout.desktop.colStart = pos.col;
            item.layout.desktop.rowStart = pos.row;
        } else {
            item.layout.mobile.colStart = pos.col;
            item.layout.mobile.rowStart = pos.row;
        }
    }
}

/**
 * Calculate maximum row used by items
 */
export function getMaxRow(items: DashboardItem[], breakpoint: Breakpoint | 'all'): number {
    let maxRow = 1;
    for (const item of items) {
        if (breakpoint === 'all') {
            const desktopEnd = item.layout.desktop.rowStart + item.layout.desktop.rowSpan;
            const mobileEnd = item.layout.mobile.rowStart + item.layout.mobile.rowSpan;
            maxRow = Math.max(maxRow, desktopEnd, mobileEnd);
        } else {
            const layout = getItemLayout(item, breakpoint);
            maxRow = Math.max(maxRow, layout.rowStart + layout.rowSpan);
        }
    }
    return maxRow;
}

/**
 * Ensure grid has explicit row tracks
 */
export function ensureExplicitRows(
    config: GridConfig,
    rowIndex: number | null = null,
    gridHeight: number | null = null
): void {
    if (config.rows !== "implicit") {
        // If already explicit but too short for the target rowIndex, expand it
        if (rowIndex !== null && (config.rows as any[]).length < rowIndex) {
            const currentTracks = config.rows as any[];
            const defaultHeight = config.rowHeight ?? 80;
            const newTracksCount = rowIndex - currentTracks.length;

            const newTracks = Array.from({ length: newTracksCount }, () => ({
                id: generateUUID(),
                type: "row" as const,
                size: defaultHeight
            }));

            config.rows = [...currentTracks, ...newTracks];
        }
        return;
    }

    const defaultHeight = config.rowHeight ?? 80;
    let maxRow = getMaxRow(config.items, 'all');

    // Calculate how many rows fit in the current canvas
    let minRows = 12;
    if (gridHeight && defaultHeight > 0) {
        minRows = Math.ceil(gridHeight / defaultHeight);
    }

    // Ensure we cover items, the target row, and fill the canvas
    maxRow = Math.max(maxRow, rowIndex || 0, minRows);

    // Create explicit tracks
    config.rows = Array.from({ length: maxRow }, () => ({
        id: generateUUID(),
        type: "row" as const,
        size: defaultHeight
    }));
}

/**
 * Helper for creating a new dashboard item with proper defaults
 */
export function createNewItem(
    cardType: DashboardCardType,
    itemConfig: any,
    rowStart: number
): DashboardItem {
    const layout = createDefaultItemLayout(1, cardType, itemConfig.cardSize || 'standard');
    layout.desktop.rowStart = rowStart;
    layout.mobile.rowStart = rowStart;

    return normalizeDashboardItem({
        id: generateUUID(),
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
        activeTabIndex: 0,
        hours_to_show: itemConfig.hours_to_show,
        aggregate_func: itemConfig.aggregate_func,
        chartType: itemConfig.chartType,
        graphEntities: itemConfig.graphEntities,
        // Navigation properties
        path: itemConfig.path || "",
        iconType: itemConfig.iconType || "icon",
        imageUrl: itemConfig.imageUrl || "",
        imageAttribution: itemConfig.imageAttribution,
        icon: itemConfig.icon || "",
        shortcuts: itemConfig.shortcuts || [],
        options: itemConfig.options
    });
}
