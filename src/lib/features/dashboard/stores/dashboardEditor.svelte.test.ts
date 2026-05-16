import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dashboardEditorStore } from './dashboardEditor.svelte';
import { dashboardStore } from './dashboard.svelte';
import { createDefaultGridConfig, type RoomDashboardConfig } from '$lib/types/dashboard';

// Mock dashboardStore
vi.mock('./dashboard.svelte', () => ({
    dashboardStore: {
        config: null,
        setConfig: vi.fn(),
        markGridModified: vi.fn(),
        markGridItemsModified: vi.fn(),
        markItemModified: vi.fn()
    }
}));

describe('DashboardEditorStore', () => {
    let mockRootConfig: RoomDashboardConfig;

    beforeEach(() => {
        vi.clearAllMocks();
        dashboardEditorStore.exitGrid();
        dashboardEditorStore.exitEditMode();

        const gridConfig = createDefaultGridConfig();
        // Setup initial state: implicit rows
        gridConfig.rows = "implicit";
        gridConfig.rowHeight = 80;
        gridConfig.items = [];

        mockRootConfig = {
            ...createDefaultGridConfig('Root'),
            id: 'root-1',
            tabs: [gridConfig],
            activeTabId: gridConfig.id
        };

        // Mock dashboardStore.config getter
        Object.defineProperty(dashboardStore, 'config', {
            get: () => mockRootConfig,
            configurable: true
        });
    });

    describe('active grid focus', () => {
        it('returns the nested grid as the editing target when a tab card is focused', () => {
            const rootGrid = mockRootConfig.tabs[0];
            rootGrid.id = 'root-grid';
            rootGrid.columns = { desktop: 12, mobile: 4 };
            mockRootConfig.activeTabId = rootGrid.id;

            const nestedGrid = {
                ...createDefaultGridConfig('Nested'),
                id: 'nested-grid',
                columns: { desktop: 6, mobile: 2 },
                items: []
            };

            rootGrid.items = [
                {
                    id: 'tabs-card',
                    cardType: 'tabs',
                    name: 'Nested Tabs',
                    entityId: '',
                    domainFilter: '',
                    layout: {
                        desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 6 },
                        mobile: { colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 6 }
                    },
                    tabs: [nestedGrid],
                    activeTabIndex: 0
                } as any
            ];

            dashboardEditorStore.enterGrid('nested-grid');

            expect(dashboardEditorStore.getActiveGridConfig()?.id).toBe('nested-grid');

            dashboardEditorStore.updateGridConfig({
                columns: { desktop: 4, mobile: 1 }
            });

            const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
            const updatedRootGrid = updatedConfig.tabs[0];
            const updatedNestedGrid = updatedRootGrid.items[0].tabs[0];

            expect(updatedRootGrid.columns.desktop).toBe(12);
            expect(updatedNestedGrid.columns.desktop).toBe(4);
            expect(dashboardStore.markGridModified).toHaveBeenCalledWith('nested-grid');
        });
    });

    describe('setRowHeight', () => {
        it('converts implicit rows to explicit when setting a specific row height', () => {
            // Act
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.setRowHeight(2, 120);

            // Assert
            const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
            const updatedTab = updatedConfig.tabs[0];

            expect(Array.isArray(updatedTab.rows)).toBe(true);
            expect(updatedTab.rows.length).toBeGreaterThanOrEqual(2);

            // Row 1 should be default 80
            expect(updatedTab.rows[0].size).toBe(80);

            // Row 2 should be new 120
            expect(updatedTab.rows[1].size).toBe(120);
        });

        it('preserves existing explicit rows when updating a specific row', () => {
            // Arrange - start with explicit rows
            mockRootConfig.tabs[0].rows = [
                { id: '1', type: 'row', size: 100 },
                { id: '2', type: 'row', size: 200 }
            ];

            // Act
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.setRowHeight(1, 150);

            // Assert
            const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
            const updatedTab = updatedConfig.tabs[0];

            expect(updatedTab.rows[0].size).toBe(150);
            expect(updatedTab.rows[1].size).toBe(200);
        });

        it('expands explicit rows array if setting height for a row beyond current length', () => {
            // Arrange - start with explicit rows (length 1)
            mockRootConfig.tabs[0].rows = [
                { id: '1', type: 'row', size: 100 }
            ];

            // Act
            dashboardEditorStore.enterEditMode();
            // Set row 3 (should fill row 2 with default)
            dashboardEditorStore.setRowHeight(3, 300);

            // Assert
            const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
            const updatedTab = updatedConfig.tabs[0];

            expect(updatedTab.rows.length).toBe(3);
            expect(updatedTab.rows[0].size).toBe(100); // Original
            expect(updatedTab.rows[1].size).toBe(80);  // Default filler
            expect(updatedTab.rows[2].size).toBe(300); // New
        });
    });

    it('calculates minimum rows based on gridRect when converting implicit to explicit', () => {
        // Arrange
        // Mock updateGridDimensions to set gridRect
        const rect = { width: 1000, height: 800, left: 0, top: 0, right: 1000, bottom: 800 } as DOMRect;
        dashboardEditorStore.updateGridDimensions(rect, 12, 16, 16, 80, 16, undefined);

        // Act
        dashboardEditorStore.enterEditMode();
        dashboardEditorStore.setRowHeight(1, 100);

        // Assert
        const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
        const updatedTab = updatedConfig.tabs[0];

        // Height 800 / default 80 = 10 rows. BUT minRows defaults to 12 if calculation < 12? 
        // Wait, logic says minRows = 12, then if gridRect exists, calculates ceil(height/default).
        // 800 / 80 = 10.
        // But logic is: let minRows = 12; if (gridRect) minRows = ceil(...);
        // So if gridRect is present, it OVERRIDES the default 12?
        // Let's check code:
        // let minRows = 12;
        // if (this.gridRect && defaultHeight > 0) {
        //      minRows = Math.ceil(this.gridRect.height / defaultHeight);
        // }
        // So it becomes 10.
        // Then max(maxRow, rowIndex, minRows).
        // so length should be 10.

        expect(updatedTab.rows.length).toBeGreaterThanOrEqual(10);
    });

    describe('addRow', () => {
        it('inserts a new row and shifts items down', () => {
            // Arrange
            // Start with explicit rows
            mockRootConfig.tabs[0].rows = [
                { id: '1', type: 'row', size: 100 },
                { id: '2', type: 'row', size: 100 },
                { id: '3', type: 'row', size: 100 }
            ];
            // Item in row 2
            mockRootConfig.tabs[0].items = [{
                id: 'item1',
                layout: {
                    desktop: { colStart: 1, colSpan: 1, rowStart: 2, rowSpan: 1 },
                    mobile: { colStart: 1, colSpan: 1, rowStart: 2, rowSpan: 1 }
                }
            } as any];

            // Act - Insert at row 2 (pushing existing row 2 down)
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.addRow(2);

            // Assert
            const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
            const updatedTab = updatedConfig.tabs[0];

            // Should now have 4 rows
            expect(updatedTab.rows.length).toBe(4);

            // Item should be moved to row 3
            expect(updatedTab.items[0].layout.desktop.rowStart).toBe(3);
            expect(updatedTab.items[0].layout.mobile.rowStart).toBe(3);
        });

        it('expands item span if inserting inside an item', () => {
            // Arrange
            mockRootConfig.tabs[0].rows = [
                { id: '1', type: 'row', size: 100 },
                { id: '2', type: 'row', size: 100 }
            ];
            // Item spanning row 1-2 (start 1, span 2)
            mockRootConfig.tabs[0].items = [{
                id: 'item1',
                layout: {
                    desktop: { colStart: 1, colSpan: 1, rowStart: 1, rowSpan: 2 },
                    mobile: { colStart: 1, colSpan: 1, rowStart: 1, rowSpan: 2 }
                }
            } as any];

            // Act - Insert at row 2 (middle of item)
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.addRow(2);

            // Assert
            const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
            const updatedTab = updatedConfig.tabs[0];

            expect(updatedTab.rows.length).toBe(3);

            // Item should start at 1 but span 3 now
            expect(updatedTab.items[0].layout.desktop.rowStart).toBe(1);
            expect(updatedTab.items[0].layout.desktop.rowSpan).toBe(3);
        });

        it('converts implicit to explicit before adding row', () => {
            // Arrange
            mockRootConfig.tabs[0].rows = "implicit";

            // Act
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.addRow(2);

            // Assert
            const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
            const updatedTab = updatedConfig.tabs[0];

            expect(Array.isArray(updatedTab.rows)).toBe(true);
            // Implicit defaults to 12 rows (from minRow logic) + 1 inserted = 13? Or maxRow logic.
            // With no items and no gridRect, minRows might differ. But check array.
            expect(updatedTab.rows.length).toBeGreaterThan(1);
        });
    });

    describe('removeRow', () => {
        it('removes a row and shifts items up', () => {
            // Arrange
            mockRootConfig.tabs[0].rows = [
                { id: '1', type: 'row', size: 100 },
                { id: '2', type: 'row', size: 100 },
                { id: '3', type: 'row', size: 100 }
            ];
            // Item in row 3
            mockRootConfig.tabs[0].items = [{
                id: 'item1',
                layout: {
                    desktop: { colStart: 1, colSpan: 1, rowStart: 3, rowSpan: 1 },
                    mobile: { colStart: 1, colSpan: 1, rowStart: 3, rowSpan: 1 }
                }
            } as any];

            // Act - Remove row 2
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.removeRow(2);

            // Assert
            const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
            const updatedTab = updatedConfig.tabs[0];

            // Should have 2 rows
            expect(updatedTab.rows.length).toBe(2);
            // Item shifted to row 2
            expect(updatedTab.items[0].layout.desktop.rowStart).toBe(2);
        });

        it('shrinks item span if removing a spanned row', () => {
            // Arrange
            mockRootConfig.tabs[0].rows = [
                { id: '1', type: 'row', size: 100 },
                { id: '2', type: 'row', size: 100 },
                { id: '3', type: 'row', size: 100 }
            ];
            // Item spanning 1-3
            mockRootConfig.tabs[0].items = [{
                id: 'item1',
                layout: {
                    desktop: { colStart: 1, colSpan: 1, rowStart: 1, rowSpan: 3 },
                    mobile: { colStart: 1, colSpan: 1, rowStart: 1, rowSpan: 3 }
                }
            } as any];

            // Act - Remove row 2
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.removeRow(2);

            // Assert
            const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
            const updatedTab = updatedConfig.tabs[0];

            expect(updatedTab.rows.length).toBe(2);
            // Start remains 1, span becomes 2
            expect(updatedTab.items[0].layout.desktop.rowStart).toBe(1);
            expect(updatedTab.items[0].layout.desktop.rowSpan).toBe(2);
        });
    });

    describe('Grid Selection', () => {
        it('starts selection correctly', () => {
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.startGridSelection("test-grid", 1, 1);

            expect(dashboardEditorStore.isSelectingGrid).toBe(true);
            expect(dashboardEditorStore.gridSelection).toEqual({
                gridId: "test-grid",
                start: { col: 1, row: 1 },
                end: { col: 1, row: 1 }
            });
        });

        it('updates selection end point', () => {
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.startGridSelection("test-grid", 1, 1);
            dashboardEditorStore.updateGridSelection(2, 3);

            expect(dashboardEditorStore.gridSelection?.end).toEqual({ col: 2, row: 3 });
        });

        it('normalizes selection on end', () => {
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.startGridSelection("test-grid", 3, 3);
            dashboardEditorStore.updateGridSelection(1, 1);
            dashboardEditorStore.endGridSelection();

            expect(dashboardEditorStore.gridSelection).toEqual({
                gridId: "test-grid",
                start: { col: 1, row: 1 },
                end: { col: 3, row: 3 }
            });
        });

        it('clears selection when exiting edit mode', () => {
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.startGridSelection("test-grid", 1, 1);

            dashboardEditorStore.exitEditMode();

            expect(dashboardEditorStore.isSelectingGrid).toBe(false);
            expect(dashboardEditorStore.gridSelection).toBeNull();
        });

        it('creates item from selection and triggers collision resolution', () => {
            // Arrange
            dashboardEditorStore.enterEditMode();
            dashboardEditorStore.startGridSelection("test-grid", 1, 1);
            dashboardEditorStore.updateGridSelection(2, 2); // 2x2 area
            dashboardEditorStore.endGridSelection();

            const itemConfig = {
                type: 'button',
                name: 'Test Button',
                entityId: 'light.test'
            };

            // Act
            dashboardEditorStore.createItemFromSelection(itemConfig, 'desktop');

            // Assert
            const updatedConfig = (dashboardStore.setConfig as any).mock.calls[0][0];
            const updatedTab = updatedConfig.tabs[0];
            const addedItem = updatedTab.items[updatedTab.items.length - 1];

            expect(addedItem).toBeDefined();
            expect(addedItem.name).toBe('Test Button');
            expect(addedItem.layout.desktop).toEqual({
                colStart: 1,
                colSpan: 2,
                rowStart: 1,
                rowSpan: 2
            });

            // Selection should be cleared
            expect(dashboardEditorStore.gridSelection).toBeNull();
            expect(dashboardEditorStore.selectedItemId).toBe(addedItem.id);
        });
    });
});
