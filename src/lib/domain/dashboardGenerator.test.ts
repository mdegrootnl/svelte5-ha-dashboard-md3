import { describe, expect, it } from 'vitest';
import { generateDashboard } from './dashboardGenerator';
import type { HADeviceRegistryEntry, HAEntity, HAEntityRegistryEntry } from '$lib/types';
import type { DashboardItem, GridConfig, HAArea, HAFloor, RoomDashboardConfig } from '$lib/types/dashboard';
import type { InventoryContext } from './haInventory';

function entity(entity_id: string, state: string, attributes: HAEntity['attributes'] = {}): HAEntity {
    return {
        entity_id,
        state,
        attributes,
        last_changed: '2026-05-14T10:00:00Z',
        last_updated: '2026-05-14T10:00:00Z',
    };
}

function registry(entity_id: string, area_id: string | null, labels: string[] = []): HAEntityRegistryEntry {
    return {
        entity_id,
        name: entity_id,
        icon: null,
        platform: 'test',
        config_entry_id: null,
        device_id: null,
        area_id,
        disabled_by: null,
        hidden_by: null,
        entity_category: null,
        has_entity_name: true,
        original_name: entity_id,
        unique_id: entity_id,
        options: null,
        translation_key: null,
        labels,
    };
}

function registryWithDevice(
    entity_id: string,
    area_id: string | null,
    device_id: string,
    labels: string[] = [],
): HAEntityRegistryEntry {
    return {
        ...registry(entity_id, area_id, labels),
        device_id,
        unique_id: `${device_id}-${entity_id}`,
    };
}

function diagnosticRegistry(entity_id: string, area_id: string | null): HAEntityRegistryEntry {
    return {
        ...registry(entity_id, area_id),
        entity_category: 'diagnostic',
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

function getNestedTabs(config: RoomDashboardConfig) {
    return getTabSurface(config).tabs;
}

function getNestedTab(config: RoomDashboardConfig, name: string) {
    return getNestedTabs(config).find((tab) => tab.name === name);
}

function getNestedItems(config: RoomDashboardConfig, name?: string): DashboardItem[] {
    if (!name) return getNestedTabs(config).flatMap((tab) => getGridItems(tab));
    return getNestedTab(config, name)?.items ?? [];
}

function getGeneratedEntityIds(config: RoomDashboardConfig) {
    return getAllItems(config).flatMap((item) => [
        item.entityId,
        ...(item.graphEntities?.map((entity) => entity.entity_id) ?? []),
        ...(item.shortcuts?.map((shortcut) => shortcut.entityId) ?? []),
        ...(item.options?.collection?.entityIds ?? []),
        ...(item.options?.camera?.entityIds ?? []),
        item.options?.security?.alarmEntityId,
        ...(item.options?.security?.lockEntityIds ?? []),
        ...(item.options?.security?.openingEntityIds ?? []),
        ...(item.options?.security?.motionEntityIds ?? []),
        ...(item.options?.security?.safetyEntityIds ?? []),
        ...(item.options?.lock?.entityIds ?? []),
        ...(item.options?.cover?.entityIds ?? []),
        ...(item.options?.air?.entityIds ?? []),
        ...(item.options?.update?.entityIds ?? []),
        ...(item.options?.todo?.entityIds ?? []),
        ...(item.options?.vacuum?.entityIds ?? []),
    ]);
}

const areas: HAArea[] = [
    {
        area_id: 'kitchen',
        name: 'Kitchen',
        floor_id: 'ground',
        icon: 'kitchen',
        picture: '/api/image/serve/kitchen-preview/512x512',
    },
    { area_id: 'living_room', name: 'Living Room', floor_id: 'ground', icon: 'chair' },
    { area_id: 'office', name: 'Werkkamer', floor_id: 'ground', icon: 'mdi:room' },
];

const floors: HAFloor[] = [
    { floor_id: 'ground', name: 'Ground Floor', level: 0, icon: 'home' },
];

const devices: HADeviceRegistryEntry[] = [];

const richContext: InventoryContext = {
    states: {
        'light.kitchen_table': entity('light.kitchen_table', 'on', { friendly_name: 'Kitchen Table Light' }),
        'switch.kitchen_outlet': entity('switch.kitchen_outlet', 'off', { friendly_name: 'Kitchen Outlet' }),
        'climate.kitchen': entity('climate.kitchen', 'heat', { friendly_name: 'Kitchen Climate' }),
        'cover.kitchen_blinds': entity('cover.kitchen_blinds', 'open', { friendly_name: 'Kitchen Blinds' }),
        'sensor.kitchen_temperature': entity('sensor.kitchen_temperature', '21.5', {
            friendly_name: 'Kitchen Temperature',
            device_class: 'temperature',
            unit_of_measurement: '°C',
        }),
        'sensor.kitchen_battery': entity('sensor.kitchen_battery', '12', {
            friendly_name: 'Kitchen Battery',
            device_class: 'battery',
            unit_of_measurement: '%',
        }),
        'binary_sensor.kitchen_motion': entity('binary_sensor.kitchen_motion', 'on', {
            friendly_name: 'Kitchen Motion',
            device_class: 'motion',
        }),
        'binary_sensor.kitchen_window': entity('binary_sensor.kitchen_window', 'off', {
            friendly_name: 'Kitchen Window',
            device_class: 'window',
        }),
        'binary_sensor.back_door': entity('binary_sensor.back_door', 'off', {
            friendly_name: 'Back Door',
            device_class: 'door',
        }),
        'binary_sensor.hall_motion': entity('binary_sensor.hall_motion', 'off', {
            friendly_name: 'Hall Motion',
            device_class: 'motion',
        }),
        'binary_sensor.office_presence': entity('binary_sensor.office_presence', 'off', {
            friendly_name: 'Office Presence',
            device_class: 'presence',
        }),
        'media_player.living_tv': entity('media_player.living_tv', 'playing', { friendly_name: 'Living TV' }),
        'remote.living_tv': entity('remote.living_tv', 'on', { friendly_name: 'Living Remote' }),
        'scene.good_night': entity('scene.good_night', 'unknown', { friendly_name: 'Good Night' }),
        'script.away_mode': entity('script.away_mode', 'off', { friendly_name: 'Away Mode' }),
        'scene.kitchen_cooking': entity('scene.kitchen_cooking', 'unknown', { friendly_name: 'Kitchen Cooking' }),
        'script.tv_off': entity('script.tv_off', 'off', { friendly_name: 'TV Off' }),
        'button.random_helper': entity('button.random_helper', 'off', { friendly_name: 'Random Helper' }),
        'button.dashboard_refresh': entity('button.dashboard_refresh', 'off', { friendly_name: 'Refresh Dashboard' }),
        'binary_sensor.water_leak': entity('binary_sensor.water_leak', 'on', {
            friendly_name: 'Water Leak',
            device_class: 'moisture',
        }),
        'camera.front_door': entity('camera.front_door', 'recording', {
            friendly_name: 'Front Door Camera',
            entity_picture: '/api/camera_proxy/camera.front_door',
        }),
        'camera.garden': entity('camera.garden', 'idle', {
            friendly_name: 'Garden Camera',
        }),
        'weather.home': entity('weather.home', 'sunny', { friendly_name: 'Home Weather' }),
        'sensor.solar_power': entity('sensor.solar_power', '2400', {
            friendly_name: 'Solar Power',
            device_class: 'power',
        }),
        'sensor.home_power': entity('sensor.home_power', '900', {
            friendly_name: 'Home Power',
            device_class: 'power',
        }),
        'sensor.energy_today': entity('sensor.energy_today', '8.4', {
            friendly_name: 'Energy Today',
            device_class: 'energy',
            unit_of_measurement: 'kWh',
        }),
        'sensor.gas_today': entity('sensor.gas_today', '1.2', {
            friendly_name: 'Gas Today',
            device_class: 'gas',
            unit_of_measurement: 'm3',
        }),
        'sensor.water_today': entity('sensor.water_today', '126', {
            friendly_name: 'Water Today',
            device_class: 'water',
            unit_of_measurement: 'L',
        }),
        'calendar.family': entity('calendar.family', 'on', { friendly_name: 'Family Calendar' }),
        'todo.shopping_list': entity('todo.shopping_list', '3', { friendly_name: 'Shopping List' }),
        'update.router': entity('update.router', 'on', { friendly_name: 'Router Update' }),
        'sensor.unavailable_device': entity('sensor.unavailable_device', 'unavailable', {
            friendly_name: 'Unavailable Device',
        }),
        'light.office_desk': entity('light.office_desk', 'off', { friendly_name: 'Desk Light' }),
    },
    entities: [
        registry('light.kitchen_table', 'kitchen'),
        registry('switch.kitchen_outlet', 'kitchen'),
        registry('climate.kitchen', 'kitchen'),
        registry('cover.kitchen_blinds', 'kitchen'),
        registry('sensor.kitchen_temperature', 'kitchen'),
        diagnosticRegistry('sensor.kitchen_battery', 'kitchen'),
        registry('binary_sensor.kitchen_motion', 'kitchen'),
        registry('binary_sensor.kitchen_window', 'kitchen'),
        registry('binary_sensor.back_door', 'living_room'),
        registry('binary_sensor.hall_motion', null),
        registry('binary_sensor.office_presence', 'office'),
        registry('media_player.living_tv', 'living_room'),
        registry('remote.living_tv', 'living_room'),
        registry('scene.good_night', null),
        registry('script.away_mode', null),
        registry('scene.kitchen_cooking', 'kitchen'),
        registry('script.tv_off', null),
        registry('button.random_helper', null),
        registry('button.dashboard_refresh', null, ['house_action']),
        registry('binary_sensor.water_leak', null),
        registry('camera.front_door', null),
        registry('camera.garden', null),
        registry('weather.home', null),
        registry('sensor.solar_power', null),
        registry('sensor.home_power', null),
        registry('sensor.energy_today', null),
        registry('sensor.gas_today', null),
        registry('sensor.water_today', null),
        registry('calendar.family', null),
        registry('todo.shopping_list', null),
        registry('update.router', null),
        registry('sensor.unavailable_device', null),
        registry('light.office_desk', 'office'),
    ],
    devices,
    areas,
    floors,
};

describe('dashboardGenerator', () => {
    it('creates a preview-only house dashboard from available entities', () => {
        const result = generateDashboard(richContext, {
            recipe: 'house',
            targetDashboardId: 'dashboard_home',
            applyMode: 'replace_draft',
        });

        expect(result.config.id).toBe('dashboard_home');
        expect(result.config.tabs).toHaveLength(1);
        expect(result.config.tabs[0].items.map((item) => item.cardType)).toContain('tabs');
        expect(getNestedTabs(result.config).map((tab) => tab.name)).toEqual(
            expect.arrayContaining(['Home', 'Security', 'Statistics', 'Media', 'Maintenance']),
        );
        expect(result.summary.cards).toBeGreaterThan(5);

        const homeItems = getNestedItems(result.config, 'Home');
        const statisticsItems = getNestedItems(result.config, 'Statistics');
        const allItems = getAllItems(result.config);
        const cardTypes = allItems.map((item) => item.cardType);
        expect(cardTypes).toContain('navigation');
        expect(cardTypes).not.toContain('room');
        expect(cardTypes).toContain('weather');
        expect(cardTypes).toContain('energy');
        expect(cardTypes).toContain('calendar');
        expect(cardTypes).toContain('todo');
        expect(cardTypes).toContain('collection');
        expect(cardTypes).toContain('security');
        expect(cardTypes).toContain('camera');
        const generatedTodo = allItems.find((item) => item.cardType === 'todo');
        expect(generatedTodo?.options?.todo?.entityIds).toEqual(['todo.shopping_list']);
        expect(generatedTodo?.options?.todo).toMatchObject({
            showAddControl: false,
            showCompleted: false,
            maxItems: 2,
        });
        expect(generatedTodo?.layout.desktop.rowSpan).toBe(2);
        const securityItems = getNestedItems(result.config, 'Security');
        const maintenanceItems = getNestedItems(result.config, 'Maintenance');
        const itemNames = homeItems.map((item) => item.name);
        expect(itemNames).toContain('Rooms');
        expect(itemNames).not.toContain('Attention');
        expect(homeItems.some((item) => item.cardType === 'collection')).toBe(false);
        expect(itemNames.indexOf('Quick Actions')).toBeGreaterThan(itemNames.indexOf('Rooms'));
        expect(itemNames).toContain('Good Night');
        expect(itemNames).toContain('Away Mode');
        expect(itemNames).toContain('Refresh Dashboard');
        expect(itemNames).not.toContain('Kitchen Cooking');
        expect(itemNames).not.toContain('TV Off');
        expect(itemNames).not.toContain('Random Helper');
        expect(statisticsItems.map((item) => item.name)).toContain('Context');
        const weatherItem = statisticsItems.find((item) => item.cardType === 'weather');
        expect(weatherItem?.layout.desktop.rowSpan).toBe(3);
        expect(weatherItem?.layout.mobile.rowSpan).toBe(3);
        const utilityTrend = statisticsItems.find((item) => item.name === 'Utility Trends');
        expect(utilityTrend).toMatchObject({
            cardType: 'graph',
            entityId: 'sensor.energy_today',
            chartType: 'line',
            dataSource: 'statistics',
            statisticsPeriod: 'day',
            comparisonMode: 'previous_period',
            scaleMode: 'normalized',
        });
        expect(utilityTrend?.graphEntities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ entity_id: 'sensor.gas_today' }),
                expect.objectContaining({ entity_id: 'sensor.water_today' }),
            ]),
        );
        const quickActions = homeItems.filter(
            (item) => item.cardType === 'button' && item.generatedBy?.sourceType === 'house',
        );
        expect(quickActions.every((item) => item.options?.button?.showState === false)).toBe(true);
        const collectionModes = allItems
            .map((item) => item.options?.collection?.mode)
            .filter(Boolean);
        const attentionPresentations = maintenanceItems
            .filter((item) => item.generatedBy?.sourceType === 'house' && item.cardType === 'collection')
            .map((item) => item.options?.collection?.presentation);
        const maintenanceCollectionModes = maintenanceItems
            .filter((item) => item.cardType === 'collection')
            .map((item) => item.options?.collection?.mode);
        expect(collectionModes).toEqual(
            expect.arrayContaining([
                'security',
                'openings',
                'motion',
                'media_playing',
                'lights_on',
                'low_battery',
                'unavailable',
                'updates',
            ]),
        );
        expect(maintenanceCollectionModes).toEqual(
            expect.arrayContaining(['security', 'openings', 'motion', 'media_playing', 'lights_on', 'low_battery', 'unavailable', 'updates']),
        );
        expect(attentionPresentations).toEqual(expect.arrayContaining(['summary']));
        const securityStatusCards = securityItems.filter((item) => item.cardType === 'button');
        expect(securityStatusCards.map((item) => item.entityId)).toEqual(
            expect.arrayContaining([
                'binary_sensor.water_leak',
                'binary_sensor.kitchen_motion',
                'binary_sensor.kitchen_window',
                'binary_sensor.back_door',
                'binary_sensor.hall_motion',
                'binary_sensor.office_presence',
            ]),
        );
        expect(securityStatusCards).toHaveLength(6);
        expect(securityStatusCards.every((item) => item.options?.button?.control === 'none')).toBe(true);
        const securityTitles = securityItems.filter((item) => item.cardType === 'title');
        expect(securityTitles.map((item) => item.name)).toEqual(
            expect.arrayContaining(['Home Security', 'Kitchen', 'Living Room', 'Werkkamer', 'Unassigned']),
        );
        expect(securityTitles.find((item) => item.name === 'Kitchen')?.subtitle).toBe('2 sensors');
        expect(securityTitles.find((item) => item.name === 'Unassigned')?.subtitle).toBe('2 sensors');
        const securityOrder = securityItems.map((item) => item.name);
        expect(securityOrder.indexOf('Kitchen')).toBeLessThan(securityOrder.indexOf('Kitchen Motion'));
        expect(securityOrder.indexOf('Kitchen Window')).toBeLessThan(securityOrder.indexOf('Living Room'));
        expect(securityOrder.indexOf('Living Room')).toBeLessThan(securityOrder.indexOf('Back Door'));
        expect(securityOrder.indexOf('Back Door')).toBeLessThan(securityOrder.indexOf('Werkkamer'));
        expect(securityOrder.indexOf('Werkkamer')).toBeLessThan(securityOrder.indexOf('Office Presence'));
        expect(securityOrder.indexOf('Office Presence')).toBeLessThan(securityOrder.indexOf('Unassigned'));
        expect(securityOrder.indexOf('Unassigned')).toBeLessThan(securityOrder.indexOf('Water Leak'));
        const cameraItems = securityItems.filter((item) => item.cardType === 'camera');
        expect(cameraItems).toHaveLength(1);
        expect(cameraItems[0]?.name).toBe('Active Cameras');
        expect(cameraItems[0]?.options?.camera?.entityIds).toEqual(
            expect.arrayContaining(['camera.front_door', 'camera.garden']),
        );
        expect(result.relatedConfigs).toHaveLength(3);
        expect(result.relatedConfigs?.map((config) => config.id)).toEqual(
            expect.arrayContaining(['dashboard_ground_kitchen', 'dashboard_ground_living_room', 'dashboard_ground_office']),
        );
        expect(
            result.relatedConfigs
                ?.find((config) => config.id === 'dashboard_ground_kitchen')
                ? getAllItems(result.relatedConfigs.find((config) => config.id === 'dashboard_ground_kitchen')!)
                    .map((item) => item.name)
                : [],
        ).toContain('Kitchen Cooking');
        expect(
            homeItems.find((item) => item.name === 'Kitchen')?.path,
        ).toBe('/dashboard/ground/kitchen');
        expect(homeItems.find((item) => item.name === 'Kitchen')?.icon).toBe('kitchen');
        expect(homeItems.find((item) => item.name === 'Kitchen')?.iconType).toBe('image');
        expect(homeItems.find((item) => item.name === 'Kitchen')?.imageUrl).toBe(
            '/api/image/serve/kitchen-preview/512x512',
        );
        expect(homeItems.find((item) => item.name === 'Kitchen')?.options?.navigation).toMatchObject({
            areaId: 'kitchen',
            visualKind: 'kitchen',
            visualAudience: 'family',
            imageSource: 'ha_area_picture',
        });
        expect(homeItems.find((item) => item.name === 'Kitchen')?.options?.navigation?.visualPromptSeed).toContain(
            'modern kitchen',
        );
        expect(homeItems.find((item) => item.name === 'Living Room')?.iconType).toBe('image');
        expect(homeItems.find((item) => item.name === 'Living Room')?.imageUrl).toBe(
            '/api/room-previews/living_room?audience=family',
        );
        expect(homeItems.find((item) => item.name === 'Living Room')?.options?.navigation).toMatchObject({
            areaId: 'living_room',
            visualKind: 'living_room',
            imageSource: 'generated_preview',
        });
        expect(homeItems.find((item) => item.name === 'Werkkamer')?.icon).toBe('desk');
        expect(homeItems.find((item) => item.name === 'Werkkamer')?.options?.navigation?.visualKind).toBe('office');
        expect(homeItems.find((item) => item.name === 'Kitchen')?.layout.desktop.colSpan).toBe(2);
        expect(homeItems.find((item) => item.name === 'Kitchen')?.layout.desktop.rowSpan).toBe(3);
        expect(homeItems.find((item) => item.name === 'Kitchen')?.layout.mobile.colSpan).toBe(2);
        expect(homeItems.find((item) => item.name === 'Kitchen')?.layout.mobile.rowSpan).toBe(2);
        expect(homeItems.find((item) => item.name === 'Living Room')?.layout.desktop.rowSpan).toBe(3);
        expect(homeItems.find((item) => item.name === 'Kitchen')?.subtitle).toContain(
            'open',
        );
        expect(homeItems.find((item) => item.name === 'Kitchen')?.subtitle).toContain(
            'control on',
        );
        expect(result.includedEntities.map((item) => item.entityId)).toContain('light.kitchen_table');
        expect(result.qualityHints.map((hint) => hint.code)).toContain('area_matched');
        expect(result.qualityHints.map((hint) => hint.code)).toContain('missing_area_picture');
        expect(
            result.qualityHints.find((hint) => hint.code === 'missing_area_picture')?.message,
        ).toContain('Living Room');
        expect(allItems.every((item) => item.generatedBy?.recipe === 'house')).toBe(true);
    });

    it('adds a dedicated lock card to generated house security when locks exist', () => {
        const result = generateDashboard(
            {
                ...richContext,
                states: {
                    ...richContext.states,
                    'lock.front_door': entity('lock.front_door', 'unlocked', {
                        friendly_name: 'Front Door Lock',
                    }),
                },
                entities: [
                    ...richContext.entities,
                    registry('lock.front_door', 'living_room'),
                ],
            },
            {
                recipe: 'house',
                targetDashboardId: 'dashboard_home',
                applyMode: 'replace_draft',
            },
        );

        const lockCard = getNestedItems(result.config, 'Security').find((item) => item.cardType === 'lock');

        expect(lockCard?.name).toBe('Locks');
        expect(lockCard?.options?.lock?.entityIds).toEqual(['lock.front_door']);
        expect(lockCard?.layout.desktop.rowSpan).toBe(3);
    });

    it('adds a household presence card to generated house dashboards when people exist', () => {
        const contextWithPresence = {
            ...richContext,
            states: {
                ...richContext.states,
                'person.mila': entity('person.mila', 'home', { friendly_name: 'Mila' }),
                'person.sam': entity('person.sam', 'work', { friendly_name: 'Sam' }),
                'zone.work': entity('zone.work', '1', { friendly_name: 'Office' }),
            },
            entities: [
                ...richContext.entities,
                registry('person.mila', null),
                registry('person.sam', null),
                registry('zone.work', null),
            ],
        };

        const result = generateDashboard(contextWithPresence, {
            recipe: 'house',
            targetDashboardId: 'dashboard_home',
            applyMode: 'replace_draft',
        });

        const homeItems = getNestedItems(result.config, 'Home');
        const itemNames = homeItems.map((item) => item.name);
        const presenceItem = homeItems.find((item) => item.cardType === 'presence');

        expect(presenceItem).toMatchObject({
            name: 'Presence',
            layout: {
                desktop: expect.objectContaining({ rowSpan: 1 }),
                mobile: expect.objectContaining({ rowSpan: 1 }),
            },
            options: {
                presence: {
                    maxPeople: 2,
                    showGuestMode: false,
                    showEta: false,
                },
            },
        });
        expect(itemNames).not.toContain('Attention');
        expect(itemNames.indexOf('Rooms')).toBeLessThan(itemNames.indexOf('Presence'));
        expect(result.includedEntities.map((entity) => entity.entityId)).toEqual(
            expect.arrayContaining(['person.mila', 'person.sam']),
        );
    });

    it('localizes generated dashboard tabs and system card names', () => {
        const result = generateDashboard(richContext, {
            recipe: 'house',
            targetDashboardId: 'dashboard_home',
            applyMode: 'replace_draft',
            language: 'nl',
        });

        expect(result.summary.title).toBe('Woningoverzicht');
        expect(getNestedTabs(result.config).map((tab) => tab.name)).toEqual(
            expect.arrayContaining(['Start', 'Beveiliging', 'Statistieken', 'Media', 'Onderhoud']),
        );
        expect(getNestedItems(result.config, 'Start').map((item) => item.name)).toEqual(
            expect.arrayContaining(['Ruimtes', 'Snelle acties']),
        );
        expect(getNestedItems(result.config, 'Onderhoud').map((item) => item.name)).toEqual(
            expect.arrayContaining(['Lage batterijen', 'Niet beschikbaar', 'Updates']),
        );
        expect(getNestedItems(result.config, 'Beveiliging').map((item) => item.name)).toEqual(
            expect.arrayContaining(['Woningbeveiliging', 'Actieve camera\'s']),
        );
    });

    it('keeps generated dashboard backgrounds disabled by default', () => {
        const result = generateDashboard(richContext, {
            recipe: 'house',
            targetDashboardId: 'dashboard_home',
            applyMode: 'replace_draft',
        });

        expect(result.config.tabs[0].background).toBeUndefined();
    });

    it('adds generated home backgrounds when background generation is enabled', () => {
        const result = generateDashboard(richContext, {
            recipe: 'house',
            targetDashboardId: 'dashboard_home',
            useBackgroundImages: true,
            applyMode: 'replace_draft',
        });

        expect(result.config.tabs[0].background).toMatchObject({
            enabled: true,
            source: 'generated_preview',
            imageUrl: '/api/room-previews/home?audience=neutral',
        });
    });

    it('adds room backgrounds preferring HA area pictures over generated previews', () => {
        const kitchen = generateDashboard(richContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            useBackgroundImages: true,
            applyMode: 'replace_draft',
        });
        const livingRoom = generateDashboard(richContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_living_room',
            areaId: 'living_room',
            useBackgroundImages: true,
            applyMode: 'replace_draft',
        });

        expect(kitchen.config.tabs[0].background).toMatchObject({
            enabled: true,
            source: 'ha_area_picture',
            imageUrl: '/api/image/serve/kitchen-preview/512x512',
        });
        expect(livingRoom.config.tabs[0].background).toMatchObject({
            enabled: true,
            source: 'generated_preview',
            imageUrl: '/api/room-previews/living_room?audience=family',
        });
    });

    it('does not create global smart cards when backing entities are missing', () => {
        const sparse = {
            ...richContext,
            states: {
                'light.kitchen_table': richContext.states['light.kitchen_table'],
            },
            entities: [registry('light.kitchen_table', 'kitchen')],
        };

        const result = generateDashboard(sparse, {
            recipe: 'house',
            targetDashboardId: 'dashboard_home',
            applyMode: 'replace_draft',
        });

        const cardTypes = getAllItems(result.config).map((item) => item.cardType);
        expect(cardTypes).toContain('navigation');
        expect(cardTypes).not.toContain('room');
        expect(result.relatedConfigs).toHaveLength(1);
        expect(cardTypes).not.toContain('weather');
        expect(cardTypes).not.toContain('energy');
        expect(cardTypes).not.toContain('calendar');
    });

    it('creates a floor dashboard with room navigation and related room dashboards', () => {
        const result = generateDashboard(richContext, {
            recipe: 'floor',
            targetDashboardId: 'dashboard_floor_ground',
            floorId: 'ground',
            applyMode: 'replace_draft',
        });

        expect(result.config.id).toBe('dashboard_floor_ground');
        expect(result.config.name).toBe('Ground Floor');
        expect(result.config.generatedBy?.sourceType).toBe('floor');
        expect(result.config.generatedBy?.sourceId).toBe('ground');

        expect(result.config.tabs).toHaveLength(1);
        expect(getNestedTabs(result.config).map((tab) => tab.name)).toEqual(
            expect.arrayContaining(['Floor', 'Statistics', 'Media', 'Maintenance']),
        );
        const rootItems = getNestedItems(result.config, 'Floor');
        const maintenanceItems = getNestedItems(result.config, 'Maintenance');
        expect(rootItems.map((item) => item.cardType)).toContain('navigation');
        expect(rootItems.find((item) => item.name === 'Kitchen')?.path).toBe('/dashboard/ground/kitchen');
        expect(rootItems.find((item) => item.name === 'Kitchen')?.iconType).toBe('image');
        expect(rootItems.find((item) => item.name === 'Kitchen')?.imageUrl).toBe(
            '/api/image/serve/kitchen-preview/512x512',
        );
        expect(rootItems.find((item) => item.name === 'Kitchen')?.options?.navigation?.imageSource).toBe(
            'ha_area_picture',
        );
        expect(rootItems.find((item) => item.name === 'Kitchen')?.subtitle).toContain('open');
        expect(rootItems.find((item) => item.name === 'Kitchen')?.layout.desktop.colSpan).toBe(2);
        expect(rootItems.find((item) => item.name === 'Kitchen')?.layout.desktop.rowSpan).toBe(3);
        expect(rootItems.find((item) => item.name === 'Living Room')?.path).toBe('/dashboard/ground/living_room');
        expect(rootItems.find((item) => item.name === 'Living Room')?.imageUrl).toBe(
            '/api/room-previews/living_room?audience=family',
        );
        expect(rootItems.find((item) => item.name === 'Living Room')?.options?.navigation?.imageSource).toBe(
            'generated_preview',
        );
        expect(rootItems.find((item) => item.name === 'Living Room')?.layout.desktop.rowSpan).toBe(3);
        const floorStatusCollections = maintenanceItems.filter(
            (item) => item.generatedBy?.sourceType === 'floor' && item.cardType === 'collection',
        );
        expect(floorStatusCollections.map((item) => item.options?.collection?.mode)).toEqual(
            expect.arrayContaining(['lights_on']),
        );
        expect(floorStatusCollections.map((item) => item.options?.collection?.presentation)).toEqual(
            expect.arrayContaining(['summary']),
        );
        expect(maintenanceItems.map((item) => item.options?.collection?.mode)).toEqual(
            expect.arrayContaining(['low_battery']),
        );
        expect(maintenanceItems.map((item) => item.options?.collection?.presentation)).toEqual(
            expect.arrayContaining(['list']),
        );
        expect(rootItems.every((item) => item.generatedBy?.recipe === 'floor')).toBe(true);
        expect(result.relatedConfigs).toHaveLength(3);
        expect(result.relatedConfigs?.map((config) => config.id)).toEqual(
            expect.arrayContaining(['dashboard_ground_kitchen', 'dashboard_ground_living_room', 'dashboard_ground_office']),
        );
        expect(result.summary.recipe).toBe('floor');
        expect(result.summary.relatedDashboards).toBe(3);
        expect(result.qualityHints.map((hint) => hint.code)).toContain('missing_area_picture');
    });

    it('creates an entity type dashboard for a selected domain', () => {
        const result = generateDashboard(richContext, {
            recipe: 'entity_type',
            targetDashboardId: 'dashboard_entity_light',
            entityDomain: 'light',
            applyMode: 'replace_draft',
        });

        expect(result.config.id).toBe('dashboard_entity_light');
        expect(result.config.name).toBe('Lights');
        expect(result.config.generatedBy?.sourceType).toBe('entity_type');
        expect(result.config.generatedBy?.sourceId).toBe('light');
        expect(result.config.tabs[0].items.map((item) => item.cardType)).toContain('button');
        expect(result.includedEntities.map((item) => item.entityId)).toContain('light.kitchen_table');
        expect(result.includedEntities.map((item) => item.entityId)).not.toContain('switch.kitchen_outlet');
    });

    it('creates an entity type collection for diagnostic device classes', () => {
        const result = generateDashboard(richContext, {
            recipe: 'entity_type',
            targetDashboardId: 'dashboard_entity_sensor_battery',
            entityDomain: 'sensor',
            entityDeviceClass: 'battery',
            applyMode: 'replace_draft',
        });

        const collection = result.config.tabs[0].items.find((item) => item.cardType === 'collection');
        expect(result.config.name).toBe('Battery Sensors');
        expect(collection?.options?.collection?.query?.deviceClasses).toEqual(['battery']);
        expect(result.includedEntities.map((item) => item.entityId)).toContain('sensor.kitchen_battery');
    });

    it('adds analytics defaults to generated graph sensor cards', () => {
        const result = generateDashboard(richContext, {
            recipe: 'entity_type',
            targetDashboardId: 'dashboard_entity_sensor_temperature',
            entityDomain: 'sensor',
            entityDeviceClass: 'temperature',
            applyMode: 'replace_draft',
        });

        const graphCard = result.config.tabs[0].items.find((item) => item.cardType === 'graph');
        expect(graphCard?.entityId).toBe('sensor.kitchen_temperature');
        expect(graphCard?.comparisonMode).toBe('previous_period');
        expect(graphCard?.dataSource).toBe('auto');
        expect(graphCard?.showAnalytics).toBe(true);
        expect(graphCard?.rangeBands?.[0]).toEqual(expect.objectContaining({ min: 18, max: 24 }));
        expect(graphCard?.color_thresholds?.[0]).toEqual(expect.objectContaining({ value: 27 }));
    });

    it('uses a dedicated update card for update entity dashboards', () => {
        const result = generateDashboard(richContext, {
            recipe: 'entity_type',
            targetDashboardId: 'dashboard_entity_update',
            entityDomain: 'update',
            applyMode: 'replace_draft',
        });

        const updateCard = result.config.tabs[0].items.find((item) => item.cardType === 'update');
        expect(result.config.name).toBe('Updates');
        expect(updateCard?.options?.update?.entityIds).toEqual(['update.router']);
        expect(result.config.tabs[0].items.some((item) => item.cardType === 'collection')).toBe(false);
    });

    it('creates a label dashboard from explicitly labeled entities', () => {
        const labeledContext: InventoryContext = {
            ...richContext,
            entities: richContext.entities.map((entry) =>
                ['light.kitchen_table', 'switch.kitchen_outlet'].includes(entry.entity_id)
                    ? { ...entry, labels: ['comfort'] }
                    : entry,
            ),
        };

        const result = generateDashboard(labeledContext, {
            recipe: 'label',
            targetDashboardId: 'dashboard_label_comfort',
            labelId: 'comfort',
            applyMode: 'replace_draft',
        });

        expect(result.config.id).toBe('dashboard_label_comfort');
        expect(result.config.name).toBe('Comfort');
        expect(result.config.generatedBy?.sourceType).toBe('label');
        expect(result.config.generatedBy?.sourceId).toBe('comfort');
        expect(result.includedEntities.map((item) => item.entityId)).toEqual(
            expect.arrayContaining(['light.kitchen_table', 'switch.kitchen_outlet']),
        );
        expect(result.includedEntities.map((item) => item.entityId)).not.toContain('climate.kitchen');
    });

    it('creates a maintenance dashboard from health and attention signals', () => {
        const result = generateDashboard(richContext, {
            recipe: 'maintenance',
            targetDashboardId: 'dashboard_floor_maintenance',
            applyMode: 'replace_draft',
        });

        const cardNames = result.config.tabs[0].items.map((item) => item.name);
        const included = result.includedEntities.map((item) => item.entityId);

        expect(result.config.name).toBe('Maintenance');
        expect(result.config.generatedBy?.sourceType).toBe('maintenance');
        expect(cardNames).toEqual(expect.arrayContaining(['Unavailable', 'Low Batteries', 'Updates']));
        expect(result.config.tabs[0].items.some((item) => item.cardType === 'update')).toBe(true);
        expect(result.config.tabs[0].items.find((item) => item.cardType === 'update')?.options?.update?.entityIds).toContain('update.router');
        expect(included).toEqual(
            expect.arrayContaining(['sensor.unavailable_device', 'sensor.kitchen_battery', 'update.router']),
        );
        expect(result.summary.recipe).toBe('maintenance');
    });

    it('creates a room dashboard without relying on high-quality labels', () => {
        const result = generateDashboard(richContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });

        expect(result.config.tabs).toHaveLength(1);
        expect(getNestedTabs(result.config).map((tab) => tab.name)).toEqual(
            expect.arrayContaining(['Room', 'Statistics', 'Maintenance']),
        );
        const tab = getNestedTab(result.config, 'Room')!;
        const statisticsTab = getNestedTab(result.config, 'Statistics')!;
        const maintenanceTab = getNestedTab(result.config, 'Maintenance')!;
        const allItems = getAllItems(result.config);
        expect(allItems.map((item) => item.cardType)).toEqual(
            expect.arrayContaining(['button', 'thermostat', 'cover', 'collection']),
        );
        const sectionNames = tab.items.filter((item) => item.cardType === 'title').map((item) => item.name);
        const maintenanceSectionNames = maintenanceTab.items.filter((item) => item.cardType === 'title').map((item) => item.name);
        expect(sectionNames).not.toContain('Kitchen');
        expect(sectionNames).not.toContain('Attention');
        expect(maintenanceSectionNames).toContain('Attention');
        expect(sectionNames.indexOf('Primary Controls')).toBeLessThan(sectionNames.indexOf('Comfort'));
        expect(maintenanceTab.items.map((item) => item.name)).toContain('Openings & Security');
        expect(statisticsTab.items.map((item) => item.name)).toContain('Readings');
        expect(sectionNames).not.toContain('Status');
        const attentionModes = new Set(['security', 'openings', 'motion', 'media_playing', 'low_battery', 'updates']);
        const attentionCollections = maintenanceTab.items.filter(
            (item) => item.cardType === 'collection' && attentionModes.has(item.options?.collection?.mode ?? ''),
        );
        expect(attentionCollections.map((item) => item.options?.collection?.presentation)).toEqual(
            expect.arrayContaining(['summary']),
        );
        expect(attentionCollections.every((item) => item.layout.desktop.rowSpan === 1)).toBe(true);
        const roomStatus = maintenanceTab.items.find((item) => item.name === 'Room Status');
        expect(roomStatus?.options?.collection?.entityIds).toContain('binary_sensor.kitchen_window');
        expect(roomStatus?.options?.collection?.presentation).toBe('list');
        expect(roomStatus?.layout.desktop.rowSpan).toBe(3);
        const primaryControls = tab.items.filter(
            (item) => item.cardType === 'button' && ['light', 'switch'].includes(item.domainFilter),
        );
        expect(primaryControls.filter((item) => item.layout.desktop.rowSpan > 1)).toHaveLength(1);
        expect(primaryControls.some((item) => item.layout.desktop.rowSpan === 1)).toBe(true);
        expect(tab.items.some((item) => item.cardType === 'button' && item.entityId === 'cover.kitchen_blinds')).toBe(false);
        const coverCard = tab.items.find((item) => item.cardType === 'cover' && item.entityId === 'cover.kitchen_blinds');
        expect(coverCard).toBeTruthy();
        expect(coverCard?.options?.cover?.entityIds).toEqual(['cover.kitchen_blinds']);
        expect(coverCard?.layout.desktop.rowSpan).toBe(3);
        expect(result.includedEntities.map((item) => item.entityId)).toContain('light.kitchen_table');
        expect(result.qualityHints.map((hint) => hint.code)).toContain('area_matched');
        expect(allItems.every((item) => item.generationState === 'generated')).toBe(true);
    });

    it('uses a dedicated air card for room fans and humidifiers', () => {
        const airContext: InventoryContext = {
            states: {
                'fan.kitchen_fan': entity('fan.kitchen_fan', 'on', {
                    friendly_name: 'Kitchen Fan',
                    percentage: 66,
                }),
                'humidifier.kitchen_humidifier': entity('humidifier.kitchen_humidifier', 'off', {
                    friendly_name: 'Kitchen Humidifier',
                    current_humidity: 42,
                    humidity: 48,
                }),
            },
            entities: [
                registry('fan.kitchen_fan', 'kitchen'),
                registry('humidifier.kitchen_humidifier', 'kitchen'),
            ],
            devices,
            areas,
            floors,
        };

        const result = generateDashboard(airContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });

        const roomTab = getNestedTab(result.config, 'Room')!;
        const airCard = roomTab.items.find((item) => item.cardType === 'air');

        expect(airCard).toBeTruthy();
        expect(airCard?.options?.air?.entityIds).toEqual(['fan.kitchen_fan', 'humidifier.kitchen_humidifier']);
        expect(airCard?.layout.desktop.rowSpan).toBe(3);
        expect(roomTab.items.some((item) => item.cardType === 'device_panel')).toBe(false);
        expect(getGeneratedEntityIds(result.config)).toEqual(
            expect.arrayContaining(['fan.kitchen_fan', 'humidifier.kitchen_humidifier']),
        );
    });

    it('uses a dedicated vacuum card for room robot vacuums', () => {
        const vacuumContext: InventoryContext = {
            states: {
                'vacuum.kitchen_robot': entity('vacuum.kitchen_robot', 'cleaning', {
                    friendly_name: 'Kitchen Robot',
                    battery_level: 78,
                    fan_speed: 'Turbo',
                }),
            },
            entities: [
                registry('vacuum.kitchen_robot', 'kitchen'),
            ],
            devices,
            areas,
            floors,
        };

        const result = generateDashboard(vacuumContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });

        const roomTab = getNestedTab(result.config, 'Room')!;
        const vacuumCard = roomTab.items.find((item) => item.cardType === 'vacuum');

        expect(vacuumCard).toBeTruthy();
        expect(vacuumCard?.options?.vacuum?.entityIds).toEqual(['vacuum.kitchen_robot']);
        expect(vacuumCard?.layout.desktop.rowSpan).toBe(3);
        expect(roomTab.items.some((item) => item.cardType === 'device_panel')).toBe(false);
        expect(getGeneratedEntityIds(result.config)).toContain('vacuum.kitchen_robot');
    });

    it('uses a dedicated todo card for todo entity dashboards', () => {
        const result = generateDashboard(richContext, {
            recipe: 'entity_type',
            targetDashboardId: 'dashboard_todo',
            entityDomain: 'todo',
            applyMode: 'replace_draft',
        });

        const todoCard = result.config.tabs[0].items.find((item) => item.cardType === 'todo');

        expect(todoCard).toBeTruthy();
        expect(todoCard?.options?.todo?.entityIds).toEqual(['todo.shopping_list']);
        expect(todoCard?.layout.desktop.rowSpan).toBe(3);
        expect(getGeneratedEntityIds(result.config)).toContain('todo.shopping_list');
    });

    it('uses weak-name area inference for room dashboards when area assignment is missing', () => {
        const weakAreaContext: InventoryContext = {
            states: {
                'light.kitchen_counter': entity('light.kitchen_counter', 'on', {
                    friendly_name: 'Kitchen Counter',
                }),
                'sensor.kitchen_temperature': entity('sensor.kitchen_temperature', '21.5', {
                    friendly_name: 'Kitchen Temperature',
                    device_class: 'temperature',
                }),
            },
            entities: [
                registry('light.kitchen_counter', null),
                registry('sensor.kitchen_temperature', null),
            ],
            devices,
            areas,
            floors,
        };

        const result = generateDashboard(weakAreaContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });

        const included = result.includedEntities.map((item) => item.entityId);
        const lightRef = result.includedEntities.find((item) => item.entityId === 'light.kitchen_counter');
        expect(included).toContain('light.kitchen_counter');
        expect(included).toContain('sensor.kitchen_temperature');
        expect(lightRef?.importanceScore).toBeGreaterThan(0);
        expect(lightRef?.importanceReasons).toContain('name-inferred area');
        expect(result.warnings).toEqual(
            expect.arrayContaining([
                expect.stringContaining('matched by entity or friendly name'),
            ]),
        );
        expect(getAllItems(result.config).map((item) => item.cardType)).toEqual(
            expect.arrayContaining(['button']),
        );
        expect(result.qualityHints.map((hint) => hint.code)).toContain('name_inferred_area');
    });

    it('keeps informational movement switches out of room controls', () => {
        const movementContext: InventoryContext = {
            ...richContext,
            states: {
                ...richContext.states,
                'switch.kitchen_movement_sensor': entity('switch.kitchen_movement_sensor', 'on', {
                    friendly_name: 'Kitchen Movement Sensor',
                }),
            },
            entities: [...richContext.entities, registry('switch.kitchen_movement_sensor', 'kitchen')],
        };

        const result = generateDashboard(movementContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });

        const roomItems = getNestedItems(result.config, 'Room');
        const maintenanceItems = getNestedItems(result.config, 'Maintenance');
        const primaryControls = roomItems.filter(
            (item) => item.cardType === 'button' && ['light', 'switch'].includes(item.domainFilter),
        );
        const roomStatus = maintenanceItems.find((item) => item.name === 'Room Status');

        expect(primaryControls.map((item) => item.entityId)).not.toContain('switch.kitchen_movement_sensor');
        expect(roomStatus?.options?.collection?.entityIds).toContain('switch.kitchen_movement_sensor');
    });

    it('suppresses low-importance noisy sensors in room dashboards', () => {
        const noisyContext: InventoryContext = {
            ...richContext,
            states: {
                ...richContext.states,
                'sensor.kitchen_rssi': entity('sensor.kitchen_rssi', '-67', {
                    friendly_name: 'Kitchen RSSI',
                    device_class: 'signal_strength',
                }),
            },
            entities: [...richContext.entities, registry('sensor.kitchen_rssi', 'kitchen')],
        };

        const result = generateDashboard(noisyContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });

        const generatedEntityIds = getGeneratedEntityIds(result.config);
        expect(generatedEntityIds).not.toContain('sensor.kitchen_rssi');
        expect(result.skippedEntities.map((item) => item.entityId)).toContain('sensor.kitchen_rssi');
        const skippedNoise = result.skippedEntities.find((item) => item.entityId === 'sensor.kitchen_rssi');
        expect(skippedNoise?.importanceReasons).toEqual(
            expect.arrayContaining(['noisy sensor class', 'noisy entity name']),
        );
        expect(result.qualityHints.map((hint) => hint.code)).toContain('skipped_low_importance');
    });

    it('does not add a remote card for speaker-only media players', () => {
        const speakerContext: InventoryContext = {
            states: {
                'media_player.kitchen_speaker': entity('media_player.kitchen_speaker', 'idle', {
                    friendly_name: 'Kitchen Speaker',
                }),
            },
            entities: [registry('media_player.kitchen_speaker', 'kitchen')],
            devices,
            areas,
            floors,
        };

        const result = generateDashboard(speakerContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });

        const cardTypes = getAllItems(result.config).map((item) => item.cardType);
        expect(cardTypes).toContain('media');
        expect(cardTypes).not.toContain('remote');
    });

    it('adds every available media player to generated media tabs', () => {
        const extraMediaPlayers = Array.from({ length: 10 }, (_, index) => {
            const number = index + 1;
            return {
                entityId: `media_player.kitchen_zone_${number}`,
                name: `Kitchen Zone ${number}`,
            };
        });
        const mediaContext: InventoryContext = {
            ...richContext,
            states: {
                ...richContext.states,
                'media_player.kitchen_speaker': entity('media_player.kitchen_speaker', 'off', {
                    friendly_name: 'Kitchen Speaker',
                }),
                ...Object.fromEntries(
                    extraMediaPlayers.map((mediaPlayer) => [
                        mediaPlayer.entityId,
                        entity(mediaPlayer.entityId, 'off', {
                            friendly_name: mediaPlayer.name,
                        }),
                    ]),
                ),
            },
            entities: [
                ...richContext.entities,
                registry('media_player.kitchen_speaker', 'kitchen'),
                ...extraMediaPlayers.map((mediaPlayer) =>
                    registry(mediaPlayer.entityId, 'kitchen'),
                ),
            ],
        };

        const houseResult = generateDashboard(mediaContext, {
            recipe: 'house',
            targetDashboardId: 'dashboard_home',
            applyMode: 'replace_draft',
        });
        const roomResult = generateDashboard(mediaContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });

        const houseMediaNames =
            getNestedItems(houseResult.config, 'Media').map((item) => item.name);
        const roomMediaNames =
            getNestedItems(roomResult.config, 'Media').map((item) => item.name);

        expect(houseMediaNames).toEqual(
            expect.arrayContaining([
                'Kitchen Speaker',
                'Living TV',
                ...extraMediaPlayers.map((mediaPlayer) => mediaPlayer.name),
            ]),
        );
        expect(roomMediaNames).toEqual(
            expect.arrayContaining([
                'Kitchen Speaker',
                ...extraMediaPlayers.map((mediaPlayer) => mediaPlayer.name),
            ]),
        );
    });

    it('deduplicates generated media cards that share the same Home Assistant device', () => {
        const mediaContext: InventoryContext = {
            ...richContext,
            states: {
                ...richContext.states,
                'media_player.living_tv_cast': entity('media_player.living_tv_cast', 'off', {
                    friendly_name: 'Living TV Cast',
                }),
            },
            entities: [
                ...richContext.entities.filter((entry) => entry.entity_id !== 'media_player.living_tv'),
                registryWithDevice('media_player.living_tv', 'living_room', 'device-living-tv'),
                registryWithDevice('media_player.living_tv_cast', 'living_room', 'device-living-tv'),
            ],
        };

        const houseResult = generateDashboard(mediaContext, {
            recipe: 'house',
            targetDashboardId: 'dashboard_home',
            applyMode: 'replace_draft',
        });
        const roomResult = generateDashboard(mediaContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_living_room',
            areaId: 'living_room',
            applyMode: 'replace_draft',
        });

        const houseMediaEntityIds = getNestedItems(houseResult.config, 'Media')
            .filter((item) => item.cardType === 'media')
            .map((item) => item.entityId);
        const roomMediaEntityIds = getNestedItems(roomResult.config, 'Media')
            .filter((item) => item.cardType === 'media')
            .map((item) => item.entityId);

        expect(houseMediaEntityIds).toContain('media_player.living_tv');
        expect(houseMediaEntityIds).not.toContain('media_player.living_tv_cast');
        expect(roomMediaEntityIds).toContain('media_player.living_tv');
        expect(roomMediaEntityIds).not.toContain('media_player.living_tv_cast');
        expect(houseResult.qualityHints.map((hint) => hint.code)).toContain('duplicate_media_player');
        expect(roomResult.qualityHints.map((hint) => hint.code)).toContain('duplicate_media_player');
    });

    it('skips duplicate room remotes when media already controls the same player', () => {
        const result = generateDashboard(richContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_living_room',
            areaId: 'living_room',
            applyMode: 'replace_draft',
        });

        const remoteCard = getAllItems(result.config)
            .find((item) => item.cardType === 'remote');
        expect(remoteCard).toBeUndefined();
        expect(result.qualityHints.map((hint) => hint.code)).toContain('duplicate_remote');
    });

    it('adds room remotes when they control a distinct target', () => {
        const context: InventoryContext = {
            ...richContext,
            states: {
                ...richContext.states,
                'remote.living_projector': entity('remote.living_projector', 'on', {
                    friendly_name: 'Living Projector',
                }),
            },
            entities: [
                ...richContext.entities,
                registry('remote.living_projector', 'living_room'),
            ],
        };

        const result = generateDashboard(context, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_living_room',
            areaId: 'living_room',
            applyMode: 'replace_draft',
        });

        const remoteCard = getAllItems(result.config)
            .find((item) => item.cardType === 'remote');
        expect(remoteCard?.name).toBe('Living Projector Remote');
        expect(remoteCard?.entityId).toBe('remote.living_projector');
        expect(remoteCard?.subtitle).toBe('Controls Living Projector');
        expect(remoteCard?.options?.remote?.remoteEntityId).toBe('remote.living_projector');
        expect(remoteCard?.options?.remote?.mediaPlayerEntityId).toBeUndefined();
    });

    it('uses Home Assistant light groups instead of member lights', () => {
        const context: InventoryContext = {
            states: {
                'light.kitchen_cabinets': entity('light.kitchen_cabinets', 'on', {
                    friendly_name: 'Kitchen Cabinets',
                    entity_id: ['light.kitchen_cabinet_1', 'light.kitchen_cabinet_2'],
                }),
                'light.kitchen_cabinet_1': entity('light.kitchen_cabinet_1', 'on', {
                    friendly_name: 'Kitchen Cabinet 1',
                }),
                'light.kitchen_cabinet_2': entity('light.kitchen_cabinet_2', 'on', {
                    friendly_name: 'Kitchen Cabinet 2',
                }),
            },
            entities: [
                registry('light.kitchen_cabinets', 'kitchen'),
                registry('light.kitchen_cabinet_1', 'kitchen'),
                registry('light.kitchen_cabinet_2', 'kitchen'),
            ],
            devices,
            areas,
            floors,
        };

        const result = generateDashboard(context, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });
        const generatedEntityIds = getGeneratedEntityIds(result.config);

        expect(generatedEntityIds).toContain('light.kitchen_cabinets');
        expect(generatedEntityIds).not.toContain('light.kitchen_cabinet_1');
        expect(generatedEntityIds).not.toContain('light.kitchen_cabinet_2');
        expect(result.qualityHints.map((hint) => hint.code)).toContain('used_ha_group');
    });

    it('keeps nested Home Assistant light subgroups while suppressing individual bulbs', () => {
        const context: InventoryContext = {
            states: {
                'light.kitchen': entity('light.kitchen', 'on', {
                    friendly_name: 'Kitchen',
                    entity_id: ['light.kitchen_cabinets', 'light.kitchen_ceiling', 'light.kitchen_table'],
                }),
                'light.kitchen_cabinets': entity('light.kitchen_cabinets', 'on', {
                    friendly_name: 'Kitchen Cabinets',
                    entity_id: ['light.kitchen_cabinet_1', 'light.kitchen_cabinet_2'],
                }),
                'light.kitchen_ceiling': entity('light.kitchen_ceiling', 'off', {
                    friendly_name: 'Kitchen Ceiling',
                    entity_id: ['light.kitchen_ceiling_1', 'light.kitchen_ceiling_2'],
                }),
                'light.kitchen_cabinet_1': entity('light.kitchen_cabinet_1', 'on', {
                    friendly_name: 'Kitchen Cabinet 1',
                }),
                'light.kitchen_cabinet_2': entity('light.kitchen_cabinet_2', 'on', {
                    friendly_name: 'Kitchen Cabinet 2',
                }),
                'light.kitchen_ceiling_1': entity('light.kitchen_ceiling_1', 'off', {
                    friendly_name: 'Kitchen Ceiling 1',
                }),
                'light.kitchen_ceiling_2': entity('light.kitchen_ceiling_2', 'off', {
                    friendly_name: 'Kitchen Ceiling 2',
                }),
                'light.kitchen_table': entity('light.kitchen_table', 'on', {
                    friendly_name: 'Kitchen Table',
                }),
            },
            entities: [
                registry('light.kitchen', 'kitchen'),
                registry('light.kitchen_cabinets', 'kitchen'),
                registry('light.kitchen_ceiling', 'kitchen'),
                registry('light.kitchen_cabinet_1', 'kitchen'),
                registry('light.kitchen_cabinet_2', 'kitchen'),
                registry('light.kitchen_ceiling_1', 'kitchen'),
                registry('light.kitchen_ceiling_2', 'kitchen'),
                registry('light.kitchen_table', 'kitchen'),
            ],
            devices,
            areas,
            floors,
        };

        const result = generateDashboard(context, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });
        const generatedEntityIds = getGeneratedEntityIds(result.config);

        expect(generatedEntityIds).toContain('light.kitchen');
        expect(generatedEntityIds).toContain('light.kitchen_cabinets');
        expect(generatedEntityIds).toContain('light.kitchen_ceiling');
        expect(generatedEntityIds).toContain('light.kitchen_table');
        expect(generatedEntityIds).not.toContain('light.kitchen_cabinet_1');
        expect(generatedEntityIds).not.toContain('light.kitchen_cabinet_2');
        expect(generatedEntityIds).not.toContain('light.kitchen_ceiling_1');
        expect(generatedEntityIds).not.toContain('light.kitchen_ceiling_2');

        const generatedLightControls = getAllItems(result.config).filter(
            (item) => item.cardType === 'button' && item.domainFilter === 'light',
        );
        expect(generatedLightControls.filter((item) => item.layout.desktop.rowSpan > 1)).toHaveLength(1);
        expect(generatedLightControls.filter((item) => item.layout.desktop.rowSpan === 1).length).toBeGreaterThan(1);
    });

    it('keeps individual lights that only belong to a room-wide light group', () => {
        const context: InventoryContext = {
            states: {
                'light.living_room': entity('light.living_room', 'on', {
                    friendly_name: 'Living Room',
                    entity_id: ['light.floor_lamp_1', 'light.floor_lamp_2'],
                }),
                'light.floor_lamp_1': entity('light.floor_lamp_1', 'on', {
                    friendly_name: 'Schemerlamp 1',
                }),
                'light.floor_lamp_2': entity('light.floor_lamp_2', 'off', {
                    friendly_name: 'Schemerlamp 2',
                }),
            },
            entities: [
                registry('light.living_room', 'living_room'),
                registry('light.floor_lamp_1', 'living_room'),
                registry('light.floor_lamp_2', 'living_room'),
            ],
            devices,
            areas,
            floors,
        };

        const result = generateDashboard(context, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_living_room',
            areaId: 'living_room',
            applyMode: 'replace_draft',
        });
        const generatedEntityIds = getGeneratedEntityIds(result.config);

        expect(generatedEntityIds).toContain('light.living_room');
        expect(generatedEntityIds).toContain('light.floor_lamp_1');
        expect(generatedEntityIds).toContain('light.floor_lamp_2');
        expect(result.qualityHints.map((hint) => hint.code)).not.toContain('used_ha_group');
    });

    it('hides unknown and unavailable sensors from normal room cards', () => {
        const context: InventoryContext = {
            ...richContext,
            states: {
                ...richContext.states,
                'sensor.kitchen_unknown_temperature': entity('sensor.kitchen_unknown_temperature', 'unknown', {
                    friendly_name: 'Kitchen Unknown Temperature',
                    device_class: 'temperature',
                }),
                'sensor.kitchen_unavailable_humidity': entity('sensor.kitchen_unavailable_humidity', 'unavailable', {
                    friendly_name: 'Kitchen Unavailable Humidity',
                    device_class: 'humidity',
                }),
            },
            entities: [
                ...richContext.entities,
                registry('sensor.kitchen_unknown_temperature', 'kitchen'),
                registry('sensor.kitchen_unavailable_humidity', 'kitchen'),
            ],
        };

        const result = generateDashboard(context, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });
        const generatedEntityIds = getGeneratedEntityIds(result.config);

        expect(generatedEntityIds).not.toContain('sensor.kitchen_unknown_temperature');
        expect(generatedEntityIds).not.toContain('sensor.kitchen_unavailable_humidity');
        expect(result.qualityHints.map((hint) => hint.code)).toContain('skipped_unavailable');
    });

    it('uses labels as optional filters when explicitly configured', () => {
        const labeledContext: InventoryContext = {
            ...richContext,
            entities: richContext.entities.map((entry) =>
                entry.entity_id === 'light.kitchen_table'
                    ? { ...entry, labels: ['dashboard-primary'] }
                    : entry,
            ),
        };

        const result = generateDashboard(labeledContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            includeLabels: ['dashboard-primary'],
            applyMode: 'replace_draft',
        });

        const included = result.includedEntities.map((item) => item.entityId);
        expect(included).toContain('light.kitchen_table');
        expect(included).not.toContain('switch.kitchen_outlet');
    });

    it('excludes explicit entity ids from generated drafts', () => {
        const result = generateDashboard(richContext, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            excludeEntityIds: ['light.kitchen_table'],
            applyMode: 'replace_draft',
        });

        const included = result.includedEntities.map((item) => item.entityId);
        const itemEntityIds = getGeneratedEntityIds(result.config);

        expect(included).not.toContain('light.kitchen_table');
        expect(itemEntityIds).not.toContain('light.kitchen_table');
        expect(included).toContain('switch.kitchen_outlet');
    });

    it('force-includes explicit entity ids that a room recipe would otherwise skip', () => {
        const context: InventoryContext = {
            ...richContext,
            states: {
                ...richContext.states,
                'number.kitchen_level': entity('number.kitchen_level', '3', {
                    friendly_name: 'Kitchen Level',
                }),
            },
            entities: [...richContext.entities, registry('number.kitchen_level', 'kitchen')],
        };

        const baseline = generateDashboard(context, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            applyMode: 'replace_draft',
        });
        expect(baseline.skippedEntities.map((item) => item.entityId)).toContain('number.kitchen_level');

        const result = generateDashboard(context, {
            recipe: 'room',
            targetDashboardId: 'dashboard_ground_kitchen',
            areaId: 'kitchen',
            includeEntityIds: ['number.kitchen_level'],
            applyMode: 'replace_draft',
        });

        const included = result.includedEntities.map((item) => item.entityId);
        const cardNames = getAllItems(result.config).map((item) => item.name);

        expect(included).toContain('number.kitchen_level');
        expect(result.skippedEntities.map((item) => item.entityId)).not.toContain('number.kitchen_level');
        expect(cardNames).toContain('Kitchen Level');
        expect(cardNames).toContain('Pinned Entities');
    });
});
