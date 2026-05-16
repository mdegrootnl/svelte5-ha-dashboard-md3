import { describe, expect, it } from 'vitest';
import {
    createDefaultGridConfig,
    createDefaultItemLayout,
    type DashboardItem,
    type GridConfig,
    type RoomDashboardConfig,
} from '$lib/types/dashboard';
import { mergeGeneratedConfigWithExisting } from './generationMerge';

function createDashboard(id: string, tab: GridConfig): RoomDashboardConfig {
    return {
        ...createDefaultGridConfig('Root'),
        id,
        tabs: [tab],
        activeTabId: tab.id,
    };
}

function createItem(
    id: string,
    name: string,
    rowStart: number,
    generationState?: DashboardItem['generationState'],
    generated = false,
): DashboardItem {
    return {
        id,
        name,
        cardType: 'button',
        entityId: `light.${id}`,
        domainFilter: 'light',
        secondaryEntityId: '',
        secondaryName: '',
        layout: {
            desktop: { ...createDefaultItemLayout(1, 'button').desktop, rowStart },
            mobile: { ...createDefaultItemLayout(1, 'button').mobile, rowStart },
        },
        generatedBy: generated
            ? {
                  recipe: 'room',
                  sourceType: 'area',
                  sourceId: 'kitchen',
                  generatedAt: '2026-05-15T12:00:00Z',
                  reason: 'test',
                  version: 1,
              }
            : undefined,
        generationState,
    };
}

function createGeneratedTab(name = 'Kitchen') {
    const tab = createDefaultGridConfig(name);
    tab.generatedBy = {
        recipe: 'room',
        sourceType: 'area',
        sourceId: 'kitchen',
        generatedAt: '2026-05-15T12:00:00Z',
        reason: 'generated tab',
        version: 1,
    };
    tab.generationState = 'generated';
    tab.items = [createItem('fresh', 'Fresh Light', 1, 'generated', true)];
    return tab;
}

describe('generationMerge', () => {
    it('preserves user-modified generated items below fresh generated cards', () => {
        const generated = createDashboard('dashboard_ground_kitchen', createGeneratedTab());
        const existingTab = createGeneratedTab();
        existingTab.items = [
            createItem('old-generated', 'Old Generated', 1, 'generated', true),
            createItem('edited', 'Edited Light', 1, 'user_modified', true),
        ];
        const existing = createDashboard('dashboard_ground_kitchen', existingTab);

        const result = mergeGeneratedConfigWithExisting(generated, existing);
        const names = result.config.tabs[0].items.map((item) => item.name);

        expect(names).toContain('Fresh Light');
        expect(names).toContain('Edited Light');
        expect(names).not.toContain('Old Generated');
        expect(result.summary.preservedItems).toBe(1);
        expect(
            result.config.tabs[0].items.find((item) => item.id === 'edited')?.layout.desktop
                .rowStart,
        ).toBeGreaterThan(1);
    });

    it('can clean edited generated items while preserving pinned and manual cards', () => {
        const generated = createDashboard('dashboard_ground_kitchen', createGeneratedTab());
        const existingTab = createGeneratedTab();
        existingTab.items = [
            createItem('edited', 'Edited Generated', 1, 'user_modified', true),
            createItem('pinned', 'Pinned Generated', 2, 'pinned', true),
            createItem('manual', 'Manual Card', 3),
        ];
        const existing = createDashboard('dashboard_ground_kitchen', existingTab);

        const result = mergeGeneratedConfigWithExisting(generated, existing, {
            preserveUserModifiedGeneratedItems: false,
        });
        const names = result.config.tabs[0].items.map((item) => item.name);

        expect(names).toContain('Fresh Light');
        expect(names).not.toContain('Edited Generated');
        expect(names).toContain('Pinned Generated');
        expect(names).toContain('Manual Card');
        expect(result.summary.preservedItems).toBe(2);
    });

    it('keeps manual tabs as separate tabs during re-generation', () => {
        const generated = createDashboard('dashboard_home', createGeneratedTab('Overview'));
        const manualTab = createDefaultGridConfig('Manual Notes');
        manualTab.items = [createItem('manual', 'Manual Card', 1)];
        const existing = createDashboard('dashboard_home', manualTab);

        const result = mergeGeneratedConfigWithExisting(generated, existing);

        expect(result.config.tabs.map((tab) => tab.name)).toContain('Manual Notes');
        expect(result.summary.preservedTabs).toBe(1);
    });
});
