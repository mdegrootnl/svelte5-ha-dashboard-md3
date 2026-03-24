import { describe, it, expect } from 'vitest';
import {
    normalizeGridSelection,
    shiftLayoutRowsForAdd,
    shiftLayoutRowsForRemove
} from './gridEditUtils';
import type { ItemLayout } from '$lib/types/dashboard';

describe('gridEditUtils', () => {
    describe('normalizeGridSelection', () => {
        it('normalizes selection where start is already top-left', () => {
            const result = normalizeGridSelection(
                { col: 1, row: 1 },
                { col: 3, row: 2 }
            );
            expect(result).toEqual({ col: 1, row: 1, colSpan: 3, rowSpan: 2 });
        });

        it('normalizes selection where start is bottom-right (reversed)', () => {
            const result = normalizeGridSelection(
                { col: 5, row: 4 },
                { col: 2, row: 1 }
            );
            expect(result).toEqual({ col: 2, row: 1, colSpan: 4, rowSpan: 4 });
        });
    });

    describe('shiftLayoutRowsForAdd', () => {
        it('increments rowStart when layout starts at or after rowIndex', () => {
            const layout: ItemLayout = { colStart: 1, colSpan: 2, rowStart: 5, rowSpan: 2 };
            shiftLayoutRowsForAdd(layout, 3);
            expect(layout.rowStart).toBe(6);
            expect(layout.rowSpan).toBe(2);
        });

        it('increments rowSpan when layout spans across rowIndex', () => {
            const layout: ItemLayout = { colStart: 1, colSpan: 2, rowStart: 2, rowSpan: 3 };
            shiftLayoutRowsForAdd(layout, 3);
            expect(layout.rowStart).toBe(2);
            expect(layout.rowSpan).toBe(4);
        });

        it('does nothing when layout is entirely before rowIndex', () => {
            const layout: ItemLayout = { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2 };
            shiftLayoutRowsForAdd(layout, 4);
            expect(layout.rowStart).toBe(1);
            expect(layout.rowSpan).toBe(2);
        });
    });

    describe('shiftLayoutRowsForRemove', () => {
        it('decrements rowStart when layout starts after rowIndex', () => {
            const layout: ItemLayout = { colStart: 1, colSpan: 2, rowStart: 6, rowSpan: 2 };
            shiftLayoutRowsForRemove(layout, 3);
            expect(layout.rowStart).toBe(5);
            expect(layout.rowSpan).toBe(2);
        });

        it('decrements rowSpan when layout spans across rowIndex', () => {
            const layout: ItemLayout = { colStart: 1, colSpan: 2, rowStart: 2, rowSpan: 4 };
            shiftLayoutRowsForRemove(layout, 3);
            expect(layout.rowStart).toBe(2);
            expect(layout.rowSpan).toBe(3);
        });

        it('does nothing when layout is entirely before rowIndex', () => {
            const layout: ItemLayout = { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2 };
            shiftLayoutRowsForRemove(layout, 3);
            expect(layout.rowStart).toBe(1);
            expect(layout.rowSpan).toBe(2);
        });
    });
});
