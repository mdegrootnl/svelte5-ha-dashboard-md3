import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardGenerationSheet from './DashboardGenerationSheet.svelte';
import { haRegistryStore, haStore, themeStore } from '$lib';
import type { HAEntity, HAEntityRegistryEntry } from '$lib/types';
import {
    createDefaultGridConfig,
    createDefaultItemLayout,
    type DashboardItem,
    type GridConfig,
    type RoomDashboardConfig,
} from '$lib/types/dashboard';
import { dashboardStore } from '$lib/features/dashboard/stores/dashboard.svelte';

function entity(entity_id: string, state: string, attributes: HAEntity['attributes'] = {}): HAEntity {
    return {
        entity_id,
        state,
        attributes,
        last_changed: '2026-05-14T10:00:00Z',
        last_updated: '2026-05-14T10:00:00Z',
    };
}

function registryEntity(
    entity_id: string,
    name: string,
    area_id: string | null = null,
    labels: string[] = [],
): HAEntityRegistryEntry {
    return {
        entity_id,
        name,
        icon: null,
        platform: 'test',
        config_entry_id: null,
        device_id: null,
        area_id,
        disabled_by: null,
        hidden_by: null,
        entity_category: null,
        has_entity_name: true,
        original_name: name,
        unique_id: entity_id,
        options: null,
        translation_key: null,
        labels,
    };
}

function getGridItems(grid: GridConfig): DashboardItem[] {
    return grid.items.flatMap((item) => [
        item,
        ...(item.tabs?.flatMap((tab) => getGridItems(tab)) ?? []),
    ]);
}

function getAllItems(config: RoomDashboardConfig): DashboardItem[] {
    return config.tabs.flatMap((tab) => getGridItems(tab));
}

function getTabSurface(config: RoomDashboardConfig) {
    const surface = getAllItems(config).find((item) => item.cardType === 'tabs');
    expect(surface?.tabs?.length).toBeGreaterThan(0);
    return surface as DashboardItem & { tabs: GridConfig[] };
}

function getNestedTab(config: RoomDashboardConfig, name: string) {
    return getTabSurface(config).tabs.find((tab) => tab.name === name);
}

function getNestedItems(config: RoomDashboardConfig, name?: string): DashboardItem[] {
    if (!name) return getTabSurface(config).tabs.flatMap((tab) => getGridItems(tab));
    return getNestedTab(config, name)?.items ?? [];
}

function getAllEntityIds(config: RoomDashboardConfig) {
    return getAllItems(config).flatMap((item) => [
        item.entityId,
        ...(item.shortcuts?.map((shortcut) => shortcut.entityId) ?? []),
        ...(item.options?.collection?.entityIds ?? []),
    ]);
}

function createManualDashboardConfig(id = 'dashboard_home'): RoomDashboardConfig {
    const tab = createDefaultGridConfig('Manual');
    tab.items.push({
        id: 'manual-card',
        cardType: 'button',
        entityId: 'light.manual',
        name: 'Manual Card',
        domainFilter: 'light',
        secondaryEntityId: '',
        secondaryName: '',
        layout: createDefaultItemLayout(1, 'button'),
    });

    return {
        ...createDefaultGridConfig('Root'),
        id,
        tabs: [tab],
        activeTabId: tab.id,
    };
}

function createGeneratedDashboardWithEditedCard(id = 'dashboard_home'): RoomDashboardConfig {
    const tab = createDefaultGridConfig('Overview');
    const generatedBy = {
        recipe: 'house' as const,
        sourceType: 'house' as const,
        sourceId: 'house',
        generatedAt: '2026-05-15T12:00:00Z',
        reason: 'existing generated dashboard',
        version: 1,
    };
    tab.generatedBy = generatedBy;
    tab.generationState = 'generated';
    tab.items.push({
        id: 'edited-generated-card',
        cardType: 'button',
        entityId: 'light.edited_generated',
        name: 'Edited Generated Card',
        domainFilter: 'light',
        secondaryEntityId: '',
        secondaryName: '',
        layout: createDefaultItemLayout(1, 'button'),
        generatedBy,
        generationState: 'user_modified',
    });
    tab.items.push({
        id: 'manual-card',
        cardType: 'button',
        entityId: 'light.manual',
        name: 'Manual Card',
        domainFilter: 'light',
        secondaryEntityId: '',
        secondaryName: '',
        layout: createDefaultItemLayout(1, 'button'),
    });

    return {
        ...createDefaultGridConfig('Root'),
        id,
        generatedBy,
        generationState: 'generated',
        tabs: [tab],
        activeTabId: tab.id,
    };
}

describe('DashboardGenerationSheet', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        themeStore.language = 'en';
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            writable: true,
            value: 1280,
        });
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            writable: true,
            value: 800,
        });
        window.dispatchEvent(new Event('resize'));
        dashboardStore.config = null;
        dashboardStore.savedConfigs = {};
        haStore.states = {
            'light.kitchen': entity('light.kitchen', 'on', { friendly_name: 'Kitchen Light' }),
            'sensor.kitchen_temperature': entity('sensor.kitchen_temperature', '21', {
                friendly_name: 'Kitchen Temperature',
                device_class: 'temperature',
            }),
            'sensor.orphan_noise': entity('sensor.orphan_noise', '42', { friendly_name: 'Orphan Noise' }),
            'weather.home': entity('weather.home', 'sunny', { friendly_name: 'Home Weather' }),
        } as any;
        haStore.clearEntityOverrides();
        haRegistryStore.areas = [
            { area_id: 'kitchen', name: 'Kitchen', floor_id: 'ground', icon: 'kitchen' },
        ];
        haRegistryStore.floors = [
            { floor_id: 'ground', name: 'Ground', level: 0, icon: 'home' },
        ];
        haRegistryStore.deviceRegistry = [];
        haRegistryStore.entityRegistry = [
            {
                entity_id: 'light.kitchen',
                name: 'Kitchen Light',
                icon: null,
                platform: 'test',
                config_entry_id: null,
                device_id: null,
                area_id: null,
                disabled_by: null,
                hidden_by: null,
                entity_category: null,
                has_entity_name: true,
                original_name: 'Kitchen Light',
                unique_id: 'light-kitchen',
                options: null,
                translation_key: null,
                labels: ['dashboard-primary'],
            },
            {
                entity_id: 'sensor.kitchen_temperature',
                name: 'Kitchen Temperature',
                icon: null,
                platform: 'test',
                config_entry_id: null,
                device_id: null,
                area_id: 'kitchen',
                disabled_by: null,
                hidden_by: null,
                entity_category: null,
                has_entity_name: true,
                original_name: 'Kitchen Temperature',
                unique_id: 'kitchen-temperature',
                options: null,
                translation_key: null,
                labels: [],
            },
            {
                entity_id: 'sensor.orphan_noise',
                name: 'Orphan Noise',
                icon: null,
                platform: 'test',
                config_entry_id: null,
                device_id: null,
                area_id: null,
                disabled_by: null,
                hidden_by: null,
                entity_category: null,
                has_entity_name: true,
                original_name: 'Orphan Noise',
                unique_id: 'orphan-noise',
                options: null,
                translation_key: null,
                labels: [],
            },
            {
                entity_id: 'weather.home',
                name: 'Home Weather',
                icon: null,
                platform: 'test',
                config_entry_id: null,
                device_id: null,
                area_id: null,
                disabled_by: null,
                hidden_by: null,
                entity_category: null,
                has_entity_name: true,
                original_name: 'Home Weather',
                unique_id: 'weather-home',
                options: null,
                translation_key: null,
                labels: [],
            },
        ];
    });

    it('previews a generated dashboard and applies only on command', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        expect(screen.getByText('Generate Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Draft only')).toBeInTheDocument();
        expect(onapply).not.toHaveBeenCalled();

        await fireEvent.click(screen.getByText('Apply Draft'));

        expect(onapply).toHaveBeenCalledTimes(1);
        expect(onapply.mock.calls[0][0].id).toBe('dashboard_home');
        expect(onapply.mock.calls[0][1]).toHaveLength(1);
        expect(onapply.mock.calls[0][1][0].id).toBe('dashboard_ground_kitchen');
    });

    it('applies attention-first house and room sections from preview', async () => {
        const onapply = vi.fn();
        haStore.states = {
            ...haStore.states,
            'binary_sensor.kitchen_window': entity('binary_sensor.kitchen_window', 'on', {
                friendly_name: 'Kitchen Window',
                device_class: 'window',
            }),
            'binary_sensor.kitchen_motion': entity('binary_sensor.kitchen_motion', 'on', {
                friendly_name: 'Kitchen Motion',
                device_class: 'motion',
            }),
            'media_player.kitchen_tv': entity('media_player.kitchen_tv', 'playing', {
                friendly_name: 'Kitchen TV',
            }),
        } as any;
        haRegistryStore.entityRegistry = [
            ...haRegistryStore.entityRegistry,
            registryEntity('binary_sensor.kitchen_window', 'Kitchen Window', 'kitchen'),
            registryEntity('binary_sensor.kitchen_motion', 'Kitchen Motion', 'kitchen'),
            registryEntity('media_player.kitchen_tv', 'Kitchen TV', 'kitchen'),
        ];

        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await waitFor(() => {
            expect(screen.getByText('Apply Draft')).toBeEnabled();
        });
        expect(screen.getByText('Quality Hints')).toBeInTheDocument();

        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        const [roomConfig] = onapply.mock.calls[0][1] as RoomDashboardConfig[];
        const homeTab = getNestedTab(appliedConfig, 'Home') ?? appliedConfig.tabs[0];
        const securityTab = getNestedTab(appliedConfig, 'Security');
        const statisticsTab = getNestedTab(appliedConfig, 'Statistics');
        const maintenanceTab = getNestedTab(appliedConfig, 'Maintenance');
        const roomTab = getNestedTab(roomConfig, 'Room') ?? roomConfig.tabs[0];
        const roomMaintenanceTab = getNestedTab(roomConfig, 'Maintenance');
        const rootNames = homeTab.items.map((item) => item.name);
        const maintenanceModes = maintenanceTab?.items
            .map((item) => item.options?.collection?.mode)
            .filter(Boolean) ?? [];
        const securityEntityIds = securityTab
            ? getGridItems(securityTab)
                .map((item) => item.entityId)
                .filter(Boolean)
            : [];
        const roomSections = roomTab.items
            .filter((item) => item.cardType === 'title')
            .map((item) => item.name);
        const roomMaintenanceModes = roomMaintenanceTab?.items
            .map((item) => item.options?.collection?.mode)
            .filter(Boolean) ?? [];

        expect(rootNames).not.toContain('Attention');
        expect(rootNames).toContain('Rooms');
        expect(securityTab?.items.map((item) => item.name)).toContain('Home Security');
        expect(securityEntityIds).toEqual(
            expect.arrayContaining(['binary_sensor.kitchen_window', 'binary_sensor.kitchen_motion']),
        );
        expect(maintenanceTab?.items.map((item) => item.name)).toContain('Attention');
        expect(statisticsTab?.items.map((item) => item.name)).toContain('Context');
        expect(maintenanceModes).toEqual(
            expect.arrayContaining(['media_playing', 'lights_on']),
        );
        expect(roomSections).not.toContain('Attention');
        expect(roomSections).toContain('Primary Controls');
        expect(roomMaintenanceTab?.items.map((item) => item.name)).toContain('Attention');
        expect(roomMaintenanceModes).toEqual(expect.arrayContaining(['openings', 'motion', 'media_playing']));
    });

    it('renders house and room generation previews as nested tab surfaces', async () => {
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
            },
        });

        await waitFor(() => {
            expect(screen.getByText(/^Home$/)).toBeInTheDocument();
            expect(screen.getByText(/^Statistics$/)).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByText('Room Dashboard'));

        await waitFor(() => {
            expect(screen.getByText(/^Room$/)).toBeInTheDocument();
            expect(screen.getByText(/^Maintenance$/)).toBeInTheDocument();
        });
    });

    it('switches setup, preview, and review panels on compact viewports', async () => {
        window.innerWidth = 390;
        window.innerHeight = 844;
        window.dispatchEvent(new Event('resize'));

        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
            },
        });

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: 'Preview' })).toHaveAttribute(
                'aria-selected',
                'true',
            );
        });
        expect(screen.getByText('Draft only')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('tab', { name: 'Setup' }));
        await waitFor(() => {
            expect(screen.getByText('Recipe')).toBeInTheDocument();
            expect(screen.getByText('Card Families')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('tab', { name: 'Review' }));
        await waitFor(() => {
            expect(screen.getByText('Inventory Quality')).toBeInTheDocument();
            expect(screen.getByText('Entity Review')).toBeInTheDocument();
        });
    });

    it('preserves existing manual dashboard tabs in the generated draft', async () => {
        const onapply = vi.fn();
        dashboardStore.savedConfigs = {
            dashboard_home: createManualDashboardConfig('dashboard_home'),
        };

        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await waitFor(() => {
            expect(screen.getByText(/Preserved 0 user-modified\/manual cards and 1 manual tabs/)).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        expect(appliedConfig.tabs.map((tab) => tab.name)).toContain('Manual');
        expect(
            getAllItems(appliedConfig).map((item) => item.name),
        ).toContain('Manual Card');
    });

    it('cleans edited generated cards while preserving manual cards when requested', async () => {
        const onapply = vi.fn();
        dashboardStore.savedConfigs = {
            dashboard_home: createGeneratedDashboardWithEditedCard('dashboard_home'),
        };

        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                cleanGenerated: true,
                onapply,
            },
        });

        await waitFor(() => {
            expect(screen.getByText('Clean Generated')).toBeInTheDocument();
            expect(screen.getByText(/Clean regeneration is enabled/)).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByText('Apply Draft'));
        expect(onapply).not.toHaveBeenCalled();
        expect(screen.getByText(/Clean regeneration will replace edited generated cards/)).toBeInTheDocument();
        await fireEvent.click(screen.getByText('Confirm Clean Apply'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        const appliedNames = getAllItems(appliedConfig).map((item) => item.name);
        expect(appliedNames).not.toContain('Edited Generated Card');
        expect(appliedNames).toContain('Manual Card');
    });

    it('lets generated room dashboards be inspected and trimmed before applying', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Preview Kitchen' })).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Preview Kitchen' }));
        expect(screen.getByText('Generated room dashboard. Remove anything you do not want before applying.')).toBeInTheDocument();

        await fireEvent.click(screen.getAllByTitle('Remove from draft')[0]);
        await fireEvent.click(screen.getByText('Apply Draft'));

        const relatedConfig = onapply.mock.calls[0][1][0] as RoomDashboardConfig;
        const relatedCardNames = getAllItems(relatedConfig).map((item) => item.name);
        expect(relatedCardNames).not.toContain('Kitchen');
    });

    it('lets draft cards be reordered before applying', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Move Kitchen later' })).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Move Kitchen later' }));
        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        const rootNames = getNestedItems(appliedConfig, 'Home').map((item) => item.name);
        expect(rootNames.indexOf('Kitchen')).toBeGreaterThan(rootNames.indexOf('Living Room'));
    });

    it('lets draft card details be edited before applying', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Edit Kitchen draft details' })).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Edit Kitchen draft details' }));
        await fireEvent.input(screen.getByLabelText('Card name'), {
            target: { value: 'Cooking Zone' },
        });
        await fireEvent.input(screen.getByLabelText('Icon'), {
            target: { value: 'restaurant' },
        });
        await fireEvent.click(screen.getByText('Save Draft Changes'));
        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        const editedCard = getAllItems(appliedConfig).find(
            (item) => item.name === 'Cooking Zone',
        );
        expect(editedCard?.icon).toBe('restaurant');
        expect(editedCard?.generationState).toBe('user_modified');
    });

    it('lets generated draft cards be pinned before applying', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Pin Kitchen in draft' })).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Pin Kitchen in draft' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Edit Kitchen draft details' }));
        await fireEvent.input(screen.getByLabelText('Icon'), {
            target: { value: 'restaurant' },
        });
        await fireEvent.click(screen.getByText('Save Draft Changes'));
        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        const pinnedCard = getAllItems(appliedConfig).find((item) => item.name === 'Kitchen');
        expect(pinnedCard?.generationState).toBe('pinned');
        expect(pinnedCard?.icon).toBe('restaurant');
    });

    it('switches to a room recipe and allows draft card removal', async () => {
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_ground_kitchen',
                areaId: 'kitchen',
            },
        });

        await fireEvent.click(screen.getByText('Room Dashboard'));
        await waitFor(() => {
            expect(screen.getAllByText('Kitchen').length).toBeGreaterThan(0);
        });

        const removeButtons = screen.getAllByTitle('Remove from draft');
        await fireEvent.click(removeButtons[0]);

        expect(screen.getByText('Apply Draft')).toBeEnabled();
    });

    it('switches to a floor recipe and applies a floor dashboard with generated rooms', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await fireEvent.click(screen.getByText('Floor Overview'));
        await waitFor(() => {
            expect(screen.getAllByText('Ground').length).toBeGreaterThan(0);
        });

        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        const relatedConfigs = onapply.mock.calls[0][1] as RoomDashboardConfig[];
        expect(appliedConfig.id).toBe('dashboard_floor_ground');
        expect(appliedConfig.generatedBy?.recipe).toBe('floor');
        expect(getNestedItems(appliedConfig, 'Floor').map((item) => item.name)).toContain('Kitchen');
        expect(relatedConfigs).toHaveLength(1);
        expect(relatedConfigs[0].id).toBe('dashboard_ground_kitchen');
    });

    it('switches to an entity type recipe and applies a focused dashboard', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: /Entity Type/ }));
        await waitFor(() => {
            expect(screen.getAllByText('Lights').length).toBeGreaterThan(0);
        });

        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        expect(appliedConfig.id).toBe('dashboard_entity_light');
        expect(appliedConfig.generatedBy?.recipe).toBe('entity_type');
        expect(appliedConfig.tabs[0].items.map((item) => item.name)).toContain('Kitchen Light');
    });

    it('switches to a label recipe and applies a labeled dashboard', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: /^Label/ }));
        await waitFor(() => {
            expect(screen.getAllByText('Dashboard Primary').length).toBeGreaterThan(0);
        });

        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        expect(appliedConfig.id).toBe('dashboard_label_dashboard-primary');
        expect(appliedConfig.generatedBy?.recipe).toBe('label');
        expect(appliedConfig.tabs[0].items.map((item) => item.name)).toContain('Kitchen Light');
    });

    it('switches to a maintenance recipe and applies an attention dashboard', async () => {
        const onapply = vi.fn();
        haStore.states = {
            ...haStore.states,
            'sensor.kitchen_battery': entity('sensor.kitchen_battery', '12', {
                friendly_name: 'Kitchen Battery',
                device_class: 'battery',
            }),
        } as any;

        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: /Maintenance/ }));
        await waitFor(() => {
            expect(screen.getAllByText('Low Batteries').length).toBeGreaterThan(0);
        });

        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        expect(appliedConfig.id).toBe('dashboard_floor_maintenance');
        expect(appliedConfig.generatedBy?.recipe).toBe('maintenance');
        expect(appliedConfig.tabs[0].items.map((item) => item.name)).toContain('Low Batteries');
    });

    it('lets generated card families be disabled before applying', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Disable Weather cards' })).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Disable Weather cards' }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Enable Weather cards' })).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        expect(getAllItems(appliedConfig).map((item) => item.cardType)).not.toContain('weather');
        expect(getAllEntityIds(appliedConfig)).not.toContain('weather.home');
    });

    it('shows included and skipped entity review details with optional label filters', async () => {
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
            },
        });

        expect(screen.getByText('Entity Review')).toBeInTheDocument();
        expect(screen.getByText('Inventory Quality')).toBeInTheDocument();
        expect(screen.getByText('Entity registry')).toBeInTheDocument();
        expect(screen.getByText('Name inference')).toBeInTheDocument();
        expect(screen.getAllByText('No room source').length).toBeGreaterThan(0);
        expect(screen.getByText('Label Filters')).toBeInTheDocument();
        expect(screen.getByText('light.kitchen')).toBeInTheDocument();
        expect(screen.getByText('Entity area')).toBeInTheDocument();
        expect(screen.getByText('Name-inferred area')).toBeInTheDocument();

        const reviewSection = screen
            .getByText('Why the generator used or skipped entities.')
            .closest('section');
        expect(reviewSection).not.toBeNull();
        const review = within(reviewSection as HTMLElement);
        const qualitySection = screen
            .getByText('Generation confidence and cleanup opportunities.')
            .closest('section');
        expect(qualitySection).not.toBeNull();
        const quality = within(qualitySection as HTMLElement);
        expect(quality.getByText('Needs Review')).toBeInTheDocument();
        expect(quality.getByText('Suggestions')).toBeInTheDocument();
        expect(quality.getByText('Confidence')).toBeInTheDocument();
        expect(quality.getByLabelText(/Needs Review: \d+ affected entities/)).toBeInTheDocument();
        expect(quality.getByLabelText(/Suggestions: \d+ affected entities/)).toBeInTheDocument();
        expect(quality.getByText('Name Inferred Area')).toBeInTheDocument();

        await fireEvent.click(quality.getByRole('button', { name: 'Review Name Inferred Area entities' }));
        await waitFor(() => {
            expect(review.getByText('Name-inferred area')).toBeInTheDocument();
            expect(review.getByText('Name Inferred Area')).toBeInTheDocument();
            expect(review.getAllByText(/^Score /).length).toBeGreaterThan(0);
            expect(review.getByText('light.kitchen')).toBeInTheDocument();
            expect(review.queryByText('sensor.kitchen_temperature')).not.toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Show All sources entities' }));
        await waitFor(() => {
            expect(review.getByText('sensor.kitchen_temperature')).toBeInTheDocument();
        });
        await fireEvent.click(screen.getByText(/^Skipped/));

        await waitFor(() => {
            expect(review.getByText('sensor.orphan_noise')).toBeInTheDocument();
        });
        await fireEvent.click(quality.getByRole('button', { name: 'Review Low Importance Skips entities' }));

        await waitFor(() => {
            expect(review.getByText('sensor.orphan_noise')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByText('dashboard-primary'));
        await fireEvent.click(screen.getAllByText('Include')[0]);

        await waitFor(() => {
            expect(screen.queryByText('sensor.orphan_noise')).not.toBeInTheDocument();
        });
    });

    it('lets included entities be excluded before applying', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await waitFor(() => {
            expect(screen.getByText('light.kitchen')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Exclude light.kitchen from draft' }));

        await waitFor(() => {
            expect(screen.getByText('Excluded from Draft')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Restore light.kitchen to draft' })).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        const relatedConfigs = onapply.mock.calls[0][1] as RoomDashboardConfig[];
        const appliedEntityIds = [
            ...getAllEntityIds(appliedConfig),
            ...relatedConfigs.flatMap((config) => getAllEntityIds(config)),
        ];

        expect(appliedEntityIds).not.toContain('light.kitchen');
        expect(getAllItems(relatedConfigs[0]).map((item) => item.name)).toContain(
            'Kitchen Temperature',
        );
    });

    it('lets skipped entities be included before applying', async () => {
        const onapply = vi.fn();
        render(DashboardGenerationSheet, {
            props: {
                open: true,
                targetDashboardId: 'dashboard_home',
                onapply,
            },
        });

        await fireEvent.click(screen.getByText(/^Skipped/));

        await waitFor(() => {
            expect(screen.getByText('sensor.orphan_noise')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Include sensor.orphan_noise in draft' }));

        await waitFor(() => {
            expect(screen.getByText('Included in Draft')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Restore sensor.orphan_noise to automatic generation' })).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByText('Apply Draft'));

        const appliedConfig = onapply.mock.calls[0][0] as RoomDashboardConfig;
        const appliedEntityIds = getAllEntityIds(appliedConfig);
        const appliedCardNames = getAllItems(appliedConfig).map((item) => item.name);

        expect(appliedEntityIds).toContain('sensor.orphan_noise');
        expect(appliedCardNames).toContain('Pinned Entities');
    });
});
