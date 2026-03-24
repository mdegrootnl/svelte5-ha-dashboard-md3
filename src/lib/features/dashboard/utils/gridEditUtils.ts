/**
 * Grid Edit Utilities
 * Shared pure functions for drag, resize, and selection grid calculations.
 * Extracted from dashboardEditor.svelte.ts to reduce file size and avoid duplication.
 */

import type { ItemLayout } from '$lib/types/dashboard';

export interface GridDimensions {
    cellWidth: number;
    cellHeight: number;
    gridPadding: number;
    gridColumnGap: number;
    gridRowGap: number;
}

/**
 * Calculate the target grid cell from a mouse position during drag/resize.
 */
export function calculateGridCell(
    clientX: number,
    clientY: number,
    gridRect: DOMRect,
    layout: ItemLayout,
    columnCount: number,
    dimensions: GridDimensions
): { col: number; row: number } {
    const { cellWidth, cellHeight, gridPadding, gridColumnGap, gridRowGap } = dimensions;

    const relX = clientX - gridRect.left;
    const relY = clientY - gridRect.top;

    const targetCol = Math.max(1, Math.min(
        columnCount - layout.colSpan + 1,
        Math.floor((relX - gridPadding + (gridColumnGap / 2)) / (cellWidth + gridColumnGap)) + 1
    ));

    const targetRow = Math.max(1,
        Math.floor((relY - gridPadding + (gridRowGap / 2)) / (cellHeight + gridRowGap)) + 1
    );

    return { col: targetCol, row: targetRow };
}

/**
 * Calculate new column span during resize (right/corner direction).
 */
export function calculateResizeColSpan(
    clientX: number,
    gridRect: DOMRect,
    layout: ItemLayout,
    columnCount: number,
    dimensions: GridDimensions
): number {
    const { cellWidth, gridPadding, gridColumnGap } = dimensions;
    const relX = clientX - gridRect.left;
    const endCol = Math.floor((relX - gridPadding + (gridColumnGap / 2)) / (cellWidth + gridColumnGap)) + 1;
    return Math.max(1, Math.min(columnCount - layout.colStart + 1, endCol - layout.colStart + 1));
}

/**
 * Calculate new row span during resize (bottom/corner direction).
 */
export function calculateResizeRowSpan(
    clientY: number,
    gridRect: DOMRect,
    layout: ItemLayout,
    dimensions: GridDimensions
): number {
    const { cellHeight, gridPadding, gridRowGap } = dimensions;
    const relY = clientY - gridRect.top;
    const endRow = Math.floor((relY - gridPadding + (gridRowGap / 2)) / (cellHeight + gridRowGap)) + 1;
    return Math.max(1, endRow - layout.rowStart + 1);
}

/**
 * Normalize a grid selection so start is top-left and end is bottom-right.
 */
export function normalizeGridSelection(
    start: { col: number; row: number },
    end: { col: number; row: number }
): { col: number; row: number; colSpan: number; rowSpan: number } {
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    return {
        col: minCol,
        row: minRow,
        colSpan: maxCol - minCol + 1,
        rowSpan: maxRow - minRow + 1
    };
}

/**
 * Shift layout rows when adding a row at a specific index.
 */
export function shiftLayoutRowsForAdd(layout: ItemLayout, rowIndex: number): void {
    if (layout.rowStart >= rowIndex) {
        layout.rowStart += 1;
    } else if (layout.rowStart < rowIndex && (layout.rowStart + layout.rowSpan) > rowIndex) {
        layout.rowSpan += 1;
    }
}

/**
 * Shift layout rows when removing a row at a specific index.
 */
export function shiftLayoutRowsForRemove(layout: ItemLayout, rowIndex: number): void {
    if (layout.rowStart > rowIndex) {
        layout.rowStart -= 1;
    } else if (layout.rowStart < rowIndex && (layout.rowStart + layout.rowSpan) > rowIndex) {
        layout.rowSpan -= 1;
    }
}
