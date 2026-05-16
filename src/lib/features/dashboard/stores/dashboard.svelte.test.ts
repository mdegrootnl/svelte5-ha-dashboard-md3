import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardStore } from './dashboard.svelte';
import { createDefaultGridConfig, type RoomDashboardConfig } from '$lib/types/dashboard';

function createRoomConfig(id = 'dashboard_home'): RoomDashboardConfig {
    const tab = createDefaultGridConfig('Main');
    return {
        ...createDefaultGridConfig('Root'),
        id,
        tabs: [tab],
        activeTabId: tab.id,
    };
}

function addGeneratedButton(config: RoomDashboardConfig) {
    const item = {
        id: 'generated-button',
        cardType: 'button',
        entityId: 'light.kitchen',
        name: 'Kitchen',
        domainFilter: 'light',
        secondaryEntityId: '',
        secondaryName: '',
        generationState: 'generated',
        layout: {
            desktop: { colStart: 1, colSpan: 3, rowStart: 1, rowSpan: 2 },
            mobile: { colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2 },
        },
    } as const;

    config.generationState = 'generated';
    config.tabs[0].generationState = 'generated';
    config.tabs[0].items.push(item as any);
    return item;
}

describe('DashboardStore', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
        vi.useFakeTimers();
        vi.clearAllMocks();
        localStorage.clear();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    });

    it('normalizes loaded defaults without persisting during init/load', () => {
        const store = new DashboardStore({} as any);
        const config = createRoomConfig();
        config.tabs[0].items.push({
            id: 'graph-1',
            cardType: 'graph',
            entityId: 'sensor.temp',
            name: '',
            domainFilter: '',
            secondaryEntityId: '',
            secondaryName: '',
            layout: {
                desktop: { colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 2 },
                mobile: { colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 2 },
            },
        } as any);

        store.init({ [config.id]: config }, []);
        const loaded = store.loadConfig(config.id);

        expect(loaded?.tabs[0].items[0].hours_to_show).toBe(24);
        expect(loaded?.tabs[0].items[0].aggregate_func).toBe('avg');
        expect(localStorage.getItem('dashboard-config')).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('persists explicit setConfig mutations once', () => {
        const store = new DashboardStore({} as any);
        const config = createRoomConfig();

        store.setConfig(config);

        expect(localStorage.getItem('dashboard-config')).toContain(config.id);
        vi.advanceTimersByTime(2000);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('persists tab edits through explicit store mutations', () => {
        const store = new DashboardStore({} as any);
        const config = createRoomConfig();
        store.setConfig(config);
        vi.clearAllMocks();

        store.addTab('Details');
        const addedTab = store.config!.tabs[store.config!.tabs.length - 1];
        store.renameTab(addedTab.id, 'Climate');

        const saved = JSON.parse(localStorage.getItem('dashboard-config') ?? '{}');
        expect(saved[config.id].tabs.at(-1).name).toBe('Climate');
    });

    it('marks generated items and parent grids as user-modified after card edits', () => {
        const store = new DashboardStore({} as any);
        const config = createRoomConfig();
        const item = addGeneratedButton(config);
        store.setConfig(config);
        vi.clearAllMocks();

        store.markItemModified(item.id);
        store.setConfig(store.config!);

        expect(store.config?.generationState).toBe('user_modified');
        expect(store.config?.tabs[0].generationState).toBe('user_modified');
        expect(store.config?.tabs[0].items[0].generationState).toBe('user_modified');
    });

    it('pins and unpins generated cards explicitly', () => {
        const store = new DashboardStore({} as any);
        const config = createRoomConfig();
        const item = addGeneratedButton(config);
        store.setConfig(config);
        vi.clearAllMocks();

        store.setItemGenerationState(item.id, 'pinned');

        expect(store.config?.generationState).toBe('user_modified');
        expect(store.config?.tabs[0].generationState).toBe('user_modified');
        expect(store.config?.tabs[0].items[0].generationState).toBe('pinned');
        expect(localStorage.getItem('dashboard-config')).toContain('"generationState":"pinned"');

        store.setItemGenerationState(item.id, 'user_modified');

        expect(store.config?.tabs[0].items[0].generationState).toBe('user_modified');
    });

    it('marks generated tabs as user-modified after tab rename', () => {
        const store = new DashboardStore({} as any);
        const config = createRoomConfig();
        config.generationState = 'generated';
        config.tabs[0].generationState = 'generated';
        store.setConfig(config);
        vi.clearAllMocks();

        store.renameTab(config.tabs[0].id, 'Comfort');

        expect(store.config?.generationState).toBe('user_modified');
        expect(store.config?.tabs[0].generationState).toBe('user_modified');
    });

    it('pins and unpins generated tabs explicitly', () => {
        const store = new DashboardStore({} as any);
        const config = createRoomConfig();
        config.generationState = 'generated';
        config.tabs[0].generationState = 'generated';
        store.setConfig(config);
        vi.clearAllMocks();

        store.setGridGenerationState(config.tabs[0].id, 'pinned');

        expect(store.config?.generationState).toBe('user_modified');
        expect(store.config?.tabs[0].generationState).toBe('pinned');
        expect(localStorage.getItem('dashboard-config')).toContain('"generationState":"pinned"');

        store.setGridGenerationState(config.tabs[0].id, 'user_modified');

        expect(store.config?.tabs[0].generationState).toBe('user_modified');
    });
});
