/**
 * Grid Navigation Utilities
 * Pure functions for traversing nested grid structures
 */

import type { GridConfig } from '$lib/types/dashboard';

/**
 * Recursively find a grid config by ID within the grid tree
 */
export function findGridById(currentGrid: GridConfig, targetId: string): GridConfig | null {
    if (currentGrid.id === targetId) return currentGrid;

    for (const item of currentGrid.items) {
        if (item.cardType === 'tabs' && item.tabs) {
            // Check each tab in the tab card
            for (const tab of item.tabs) {
                const found = findGridById(tab, targetId);
                if (found) return found;
            }
        }
    }
    return null;
}

/**
 * Check if a parent grid contains a specific grid ID (recursively)
 */
export function gridContainsGridId(parentGrid: GridConfig, searchedGridId: string): boolean {
    for (const item of parentGrid.items) {
        if (item.cardType === 'tabs' && item.tabs) {
            for (const tab of item.tabs) {
                if (tab.id === searchedGridId) return true;
                if (gridContainsGridId(tab, searchedGridId)) return true;
            }
        }
    }
    return false;
}

/**
 * Check if a specific grid ID is a descendant of an item
 * Used to highlight parent cards when editing nested content
 */
export function isGridDescendantOfItem(
    contextGrid: GridConfig,
    targetItemId: string,
    searchedGridId: string
): boolean {
    for (const item of contextGrid.items) {
        // Case 1: We found the target item. Check if the grid is inside it.
        if (item.id === targetItemId) {
            if (item.cardType !== 'tabs' || !item.tabs) return false;

            for (const tab of item.tabs) {
                if (tab.id === searchedGridId) return true;
                if (gridContainsGridId(tab, searchedGridId)) return true;
            }
            return false;
        }

        // Case 2: This is not the item, but it might contain the item. Recurse.
        if (item.cardType === 'tabs' && item.tabs) {
            for (const tab of item.tabs) {
                if (isGridDescendantOfItem(tab, targetItemId, searchedGridId)) return true;
            }
        }
    }
    return false;
}

/**
 * Get all grid IDs in a tree (for debugging/testing)
 */
export function getAllGridIds(grid: GridConfig): string[] {
    const ids: string[] = [grid.id];

    for (const item of grid.items) {
        if (item.cardType === 'tabs' && item.tabs) {
            for (const tab of item.tabs) {
                ids.push(...getAllGridIds(tab));
            }
        }
    }

    return ids;
}
