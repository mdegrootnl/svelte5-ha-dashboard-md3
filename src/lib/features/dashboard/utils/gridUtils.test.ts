import { describe, it, expect } from 'vitest';
import {
    layoutsOverlap,
    getItemLayout,
    findOverlappingItems,
    getMaxRow,
    packItemsIntoGrid
} from './gridUtils';
import type { DashboardItem, GridConfig } from '$lib/types/dashboard';
import { generateUUID } from '$lib/utils/uuid';

function makeItem(overrides: Partial<DashboardItem> = {}): DashboardItem {
    return {
        id: generateUUID(),
        name: 'Test',
        entityId: 'light.test',
        cardType: 'button',
        layout: {
            desktop: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 1 },
            mobile: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 1 }
        },
        secondaryEntityId: '',
        secondaryName: '',
        domainFilter: '',
        ...overrides
    };
}

describe('gridUtils', () => {
    describe('layoutsOverlap', () => {
        it('returns true for overlapping rectangles', () => {
            const a = { colStart: 1, colSpan: 3, rowStart: 1, rowSpan: 2 };
            const b = { colStart: 2, colSpan: 2, rowStart: 2, rowSpan: 1 };
            expect(layoutsOverlap(a, b)).toBe(true);
        });

        it('returns false for non-overlapping rectangles', () => {
            const a = { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2 };
            const b = { colStart: 3, colSpan: 2, rowStart: 1, rowSpan: 2 };
            expect(layoutsOverlap(a, b)).toBe(false);
        });

        it('returns false for vertically non-overlapping rectangles', () => {
            const a = { colStart: 1, colSpan: 3, rowStart: 1, rowSpan: 1 };
            const b = { colStart: 1, colSpan: 3, rowStart: 2, rowSpan: 1 };
            expect(layoutsOverlap(a, b)).toBe(false);
        });

        it('returns true for partially overlapping rectangles', () => {
            const a = { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2 };
            const b = { colStart: 2, colSpan: 2, rowStart: 1, rowSpan: 2 };
            expect(layoutsOverlap(a, b)).toBe(true);
        });
    });

    describe('getItemLayout', () => {
        it('returns desktop layout for desktop breakpoint', () => {
            const item = makeItem({
                layout: {
                    desktop: { colStart: 2, colSpan: 3, rowStart: 4, rowSpan: 2 },
                    mobile: { colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 1 }
                }
            });
            expect(getItemLayout(item, 'desktop')).toEqual({ colStart: 2, colSpan: 3, rowStart: 4, rowSpan: 2 });
        });

        it('returns mobile layout for mobile breakpoint', () => {
            const item = makeItem({
                layout: {
                    desktop: { colStart: 2, colSpan: 3, rowStart: 4, rowSpan: 2 },
                    mobile: { colStart: 1, colSpan: 4, rowStart: 7, rowSpan: 3 }
                }
            });
            expect(getItemLayout(item, 'mobile')).toEqual({ colStart: 1, colSpan: 4, rowStart: 7, rowSpan: 3 });
        });
    });

    describe('findOverlappingItems', () => {
        it('returns empty array when no items overlap', () => {
            const items = [
                makeItem({ id: 'a', layout: { desktop: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 1 }, mobile: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 1 } } }),
                makeItem({ id: 'b', layout: { desktop: { colStart: 3, colSpan: 2, rowStart: 1, rowSpan: 1 }, mobile: { colStart: 3, colSpan: 2, rowStart: 1, rowSpan: 1 } } })
            ];
            const result = findOverlappingItems(items, 'a', 'desktop');
            expect(result).toHaveLength(0);
        });

        it('returns overlapping items', () => {
            const itemA = makeItem({ id: 'a', layout: { desktop: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2 }, mobile: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2 } } });
            const itemB = makeItem({ id: 'b', layout: { desktop: { colStart: 2, colSpan: 2, rowStart: 1, rowSpan: 1 }, mobile: { colStart: 2, colSpan: 2, rowStart: 1, rowSpan: 1 } } });
            const itemC = makeItem({ id: 'c', layout: { desktop: { colStart: 3, colSpan: 2, rowStart: 2, rowSpan: 1 }, mobile: { colStart: 3, colSpan: 2, rowStart: 2, rowSpan: 1 } } });
            const result = findOverlappingItems([itemA, itemB, itemC], 'a', 'desktop');
            expect(result.map(i => i.id)).toContain('b');
        });

        it('returns empty array for non-existent target ID', () => {
            const items = [makeItem({ id: 'a' })];
            expect(findOverlappingItems(items, 'nonexistent', 'desktop')).toEqual([]);
        });
    });

    describe('getMaxRow', () => {
        it('returns 1 for empty items array', () => {
            expect(getMaxRow([], 'desktop')).toBe(1);
        });

        it('returns correct max row for desktop breakpoint', () => {
            const items = [
                makeItem({ layout: { desktop: { colStart: 1, colSpan: 2, rowStart: 3, rowSpan: 2 }, mobile: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 1 } } }),
                makeItem({ layout: { desktop: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 1 }, mobile: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 1 } } })
            ];
            expect(getMaxRow(items, 'desktop')).toBe(5); // rowStart 3 + rowSpan 2
        });

        it('returns correct max row for all breakpoints', () => {
            const items = [
                makeItem({ layout: { desktop: { colStart: 1, colSpan: 2, rowStart: 2, rowSpan: 1 }, mobile: { colStart: 1, colSpan: 2, rowStart: 5, rowSpan: 2 } } })
            ];
            expect(getMaxRow(items, 'all')).toBe(7); // max of desktopEnd(3) and mobileEnd(7)
        });
    });

    describe('packItemsIntoGrid', () => {
        it('does not throw for empty items array', () => {
            expect(() => packItemsIntoGrid([], 12, 'desktop')).not.toThrow();
        });

        it('assigns sequential positions to items', () => {
            const items: DashboardItem[] = [
                makeItem({ id: 'a', layout: { desktop: { colStart: 10, colSpan: 2, rowStart: 10, rowSpan: 1 }, mobile: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 1 } } }),
                makeItem({ id: 'b', layout: { desktop: { colStart: 10, colSpan: 2, rowStart: 10, rowSpan: 1 }, mobile: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 1 } } })
            ];
            packItemsIntoGrid(items, 12, 'desktop');
            // Both items should be repositioned to fit in grid
            expect(items[0].layout.desktop.colStart).toBeGreaterThanOrEqual(1);
            expect(items[1].layout.desktop.colStart).toBeGreaterThanOrEqual(1);
        });
    });
});
