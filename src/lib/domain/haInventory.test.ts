import { describe, expect, it } from 'vitest';
import {
    buildSmartAirOptions,
    buildSmartCalendarOptions,
    buildSmartCoverOptions,
    buildSmartDevicePanelOptions,
    buildSmartEnergyOptions,
    buildSmartLockOptions,
    buildSmartRemoteOptions,
    buildSmartSecurityOptions,
    buildSmartTodoOptions,
    buildSmartUpdateOptions,
    buildSmartVacuumOptions,
    buildSmartWeatherOptions,
    createInventoryIndex,
    createCollectionQuery,
    filterLowBattery,
    resolveCollectionEntities,
    resolveEntityQuery,
} from './haInventory';
import type { HAEntity, HAEntityRegistryEntry } from '$lib/types';
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

function registry(entity_id: string, name: string, area_id: string | null = null): HAEntityRegistryEntry {
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
        labels: [],
    };
}

const context: InventoryContext = {
    states: {
        'light.kitchen': entity('light.kitchen', 'on', { friendly_name: 'Kitchen Light' }),
        'sensor.kitchen_battery': entity('sensor.kitchen_battery', '12', {
            friendly_name: 'Kitchen Battery',
            device_class: 'battery',
            unit_of_measurement: '%',
        }),
        'sensor.solar_power': entity('sensor.solar_power', '2300', {
            friendly_name: 'Fronius Solar Power',
            device_class: 'power',
            unit_of_measurement: 'W',
        }),
        'sensor.home_power': entity('sensor.home_power', '1200', {
            friendly_name: 'Home Power',
            device_class: 'power',
            unit_of_measurement: 'W',
        }),
        'calendar.family': entity('calendar.family', 'on', {
            friendly_name: 'Family Calendar',
            message: 'Dinner',
        }),
        'media_player.tv': entity('media_player.tv', 'on', {
            friendly_name: 'Living Room TV',
        }),
        'remote.android_tv': entity('remote.android_tv', 'on', {
            friendly_name: 'Android TV Remote',
        }),
        'cover.blinds': entity('cover.blinds', 'closed', {
            friendly_name: 'Kitchen Blinds',
        }),
        'binary_sensor.kitchen_window': entity('binary_sensor.kitchen_window', 'on', {
            friendly_name: 'Kitchen Window',
            device_class: 'window',
        }),
        'binary_sensor.kitchen_motion': entity('binary_sensor.kitchen_motion', 'on', {
            friendly_name: 'Kitchen Motion',
            device_class: 'motion',
        }),
        'binary_sensor.water_leak': entity('binary_sensor.water_leak', 'on', {
            friendly_name: 'Water Leak',
            device_class: 'moisture',
        }),
        'binary_sensor.addon_update': entity('binary_sensor.addon_update', 'on', {
            friendly_name: 'Add-on Update',
            device_class: 'update',
        }),
        'update.router': entity('update.router', 'on', { friendly_name: 'Router Update' }),
        'todo.shopping_list': entity('todo.shopping_list', '4', { friendly_name: 'Shopping List' }),
        'todo.house_tasks': entity('todo.house_tasks', '2', { friendly_name: 'House Tasks' }),
    },
    areas: [
        { area_id: 'kitchen', name: 'Kitchen', floor_id: 'ground', icon: undefined },
    ],
    floors: [
        { floor_id: 'ground', name: 'Ground', level: 0, icon: undefined },
    ],
    devices: [
        {
            id: 'device-kitchen',
            area_id: 'kitchen',
            config_entries: [],
            configuration_url: null,
            connections: [],
            disabled_by: null,
            entry_type: null,
            hw_version: null,
            identifiers: [],
            labels: ['room'],
            manufacturer: null,
            model: null,
            name_by_user: null,
            name: 'Kitchen device',
            serial_number: null,
            sw_version: null,
            via_device_id: null,
        },
    ],
    entities: [
        {
            entity_id: 'light.kitchen',
            name: 'Kitchen Light',
            icon: null,
            platform: 'test',
            config_entry_id: null,
            device_id: 'device-kitchen',
            area_id: null,
            disabled_by: null,
            hidden_by: null,
            entity_category: null,
            has_entity_name: true,
            original_name: 'Kitchen Light',
            unique_id: 'light-kitchen',
            options: null,
            translation_key: null,
            labels: [],
        },
        {
            entity_id: 'sensor.kitchen_battery',
            name: 'Kitchen Battery',
            icon: null,
            platform: 'test',
            config_entry_id: null,
            device_id: 'device-kitchen',
            area_id: null,
            disabled_by: null,
            hidden_by: null,
            entity_category: 'diagnostic',
            has_entity_name: true,
            original_name: 'Kitchen Battery',
            unique_id: 'battery-kitchen',
            options: null,
            translation_key: null,
            labels: [],
        },
        {
            entity_id: 'sensor.solar_power',
            name: 'Solar Power',
            icon: null,
            platform: 'test',
            config_entry_id: null,
            device_id: null,
            area_id: null,
            disabled_by: null,
            hidden_by: null,
            entity_category: null,
            has_entity_name: true,
            original_name: 'Solar Power',
            unique_id: 'solar-power',
            options: null,
            translation_key: null,
            labels: [],
        },
        {
            entity_id: 'sensor.home_power',
            name: 'Home Power',
            icon: null,
            platform: 'test',
            config_entry_id: null,
            device_id: null,
            area_id: null,
            disabled_by: null,
            hidden_by: null,
            entity_category: null,
            has_entity_name: true,
            original_name: 'Home Power',
            unique_id: 'home-power',
            options: null,
            translation_key: null,
            labels: [],
        },
        {
            entity_id: 'update.router',
            name: 'Router Update',
            icon: null,
            platform: 'test',
            config_entry_id: null,
            device_id: null,
            area_id: null,
            disabled_by: null,
            hidden_by: null,
            entity_category: null,
            has_entity_name: true,
            original_name: 'Router Update',
            unique_id: 'router-update',
            options: null,
            translation_key: null,
            labels: [],
        },
        registry('binary_sensor.kitchen_window', 'Kitchen Window', 'kitchen'),
        registry('binary_sensor.kitchen_motion', 'Kitchen Motion', 'kitchen'),
        registry('binary_sensor.water_leak', 'Water Leak'),
        registry('binary_sensor.addon_update', 'Add-on Update'),
        registry('todo.shopping_list', 'Shopping List'),
        registry('todo.house_tasks', 'House Tasks'),
    ],
};

describe('haInventory', () => {
    it('resolves entities by floor through device area fallback', () => {
        const results = resolveEntityQuery(context, {
            floorIds: ['ground'],
            domains: ['light'],
        });

        expect(results.map((item) => item.entityId)).toEqual(['light.kitchen']);
        expect(results[0]?.areaSource).toBe('device_registry');
    });

    it('infers area from entity and friendly names when registry area data is missing', () => {
        const weakContext: InventoryContext = {
            ...context,
            states: {
                ...context.states,
                'sensor.kitchen_temperature': entity('sensor.kitchen_temperature', '21.5', {
                    friendly_name: 'Kitchen Temperature',
                    device_class: 'temperature',
                }),
            },
            entities: [
                ...context.entities,
                registry('sensor.kitchen_temperature', 'Kitchen Temperature'),
            ],
        };

        const results = resolveEntityQuery(weakContext, {
            areaIds: ['kitchen'],
            domains: ['sensor'],
            deviceClasses: ['temperature'],
        });

        expect(results.map((item) => item.entityId)).toEqual(['sensor.kitchen_temperature']);
        expect(results[0]?.areaSource).toBe('name_inference');
    });

    it('does not infer generic home area names for global entities', () => {
        const homeContext: InventoryContext = {
            states: {
                'sensor.home_power': entity('sensor.home_power', '1200', {
                    friendly_name: 'Home Power',
                    device_class: 'power',
                }),
            },
            areas: [
                { area_id: 'home', name: 'Home', floor_id: 'ground', icon: undefined },
            ],
            floors: context.floors,
            devices: [],
            entities: [registry('sensor.home_power', 'Home Power')],
        };

        const results = resolveEntityQuery(homeContext, {
            areaIds: ['home'],
            domains: ['sensor'],
        });

        expect(results).toEqual([]);
    });

    it('filters low battery entities by threshold', () => {
        const query = createCollectionQuery({ mode: 'low_battery', threshold: 20 });
        const results = filterLowBattery(resolveEntityQuery(context, query), 20);

        expect(results.map((item) => item.entityId)).toEqual(['sensor.kitchen_battery']);
    });

    it('resolves attention collection modes with shared inventory filtering', () => {
        expect(resolveCollectionEntities(context, { mode: 'openings' }).map((item) => item.entityId)).toEqual([
            'binary_sensor.kitchen_window',
        ]);
        expect(resolveCollectionEntities(context, { mode: 'motion' }).map((item) => item.entityId)).toEqual([
            'binary_sensor.kitchen_motion',
        ]);
        expect(resolveCollectionEntities(context, { mode: 'media_playing' }).map((item) => item.entityId)).toEqual([]);
        expect(resolveCollectionEntities(context, { mode: 'security' }).map((item) => item.entityId)).toEqual([
            'binary_sensor.water_leak',
        ]);
        expect(resolveCollectionEntities(context, { mode: 'updates' }).map((item) => item.entityId)).toEqual([
            'binary_sensor.addon_update',
            'update.router',
        ]);
    });

    it('deduplicates backing media players with the same visible room player name', () => {
        const mediaContext: InventoryContext = {
            ...context,
            states: {
                ...context.states,
                'media_player.chromecastaudio1471': entity('media_player.chromecastaudio1471', 'playing', {
                    friendly_name: 'Kitchen',
                }),
                'media_player.kitchen': entity('media_player.kitchen', 'playing', {
                    friendly_name: 'Kitchen',
                }),
            },
            entities: [
                ...context.entities,
                registry('media_player.chromecastaudio1471', 'Kitchen Cast', 'kitchen'),
                registry('media_player.kitchen', 'Kitchen', 'kitchen'),
            ],
        };

        expect(
            resolveCollectionEntities(mediaContext, {
                mode: 'media_playing',
                query: { areaIds: ['kitchen'] },
            }).map((item) => item.entityId),
        ).toEqual(['media_player.kitchen']);
    });

    it('resolves manual collection entities by indexed ids', () => {
        const index = createInventoryIndex(context);

        expect(resolveCollectionEntities(index, {
            source: 'manual',
            mode: 'custom',
            entityIds: ['sensor.kitchen_battery', 'missing.entity'],
        }).map((item) => item.entityId)).toEqual(['sensor.kitchen_battery']);
    });

    it('builds smart energy defaults from friendly names and device classes', () => {
        const options = buildSmartEnergyOptions(context);

        expect(options.solarPowerEntityId).toBe('sensor.solar_power');
        expect(options.homePowerEntityId).toBe('sensor.home_power');
        expect(options.mode).toBe('overview');
        expect(options.historyRange).toBeUndefined();
        expect(options.hoursToShow).toBe(24);
    });

    it('prefers usable weather providers and skips unusable helper sensors', () => {
        const weatherContext: InventoryContext = {
            ...context,
            states: {
                ...context.states,
                'weather.broken': entity('weather.broken', 'unavailable', {
                    friendly_name: 'Broken Weather',
                }),
                'weather.home': entity('weather.home', 'cloudy', {
                    friendly_name: 'Home Weather',
                    temperature: 15,
                    humidity: 77,
                    wind_speed: 12,
                    wind_speed_unit: 'km/h',
                }),
                'sensor.home_humidity': entity('sensor.home_humidity', 'unknown', {
                    friendly_name: 'Home Humidity',
                    device_class: 'humidity',
                    unit_of_measurement: '%',
                }),
                'sensor.home_wind': entity('sensor.home_wind', 'unavailable', {
                    friendly_name: 'Home Wind',
                    device_class: 'wind_speed',
                    unit_of_measurement: 'km/h',
                }),
            },
            entities: [
                ...context.entities,
                registry('weather.broken', 'Broken Weather'),
                registry('weather.home', 'Home Weather'),
                registry('sensor.home_humidity', 'Home Humidity'),
                registry('sensor.home_wind', 'Home Wind'),
            ],
        };

        const options = buildSmartWeatherOptions(weatherContext);

        expect(options.weatherEntityId).toBe('weather.home');
        expect(options.humidityEntityId).toBeUndefined();
        expect(options.windEntityId).toBeUndefined();
    });

    it('builds smart calendar defaults without requiring manual entity ids', () => {
        const options = buildSmartCalendarOptions(context);

        expect(options.entityIds).toEqual(['calendar.family']);
        expect(options.daysToShow).toBe(7);
        expect(options.maxEvents).toBe(4);
    });

    it('builds smart remote defaults from remote and media player domains', () => {
        const options = buildSmartRemoteOptions(context);

        expect(options.remoteEntityId).toBe('remote.android_tv');
        expect(options.mediaPlayerEntityId).toBe('media_player.tv');
    });

    it('does not auto-fill missing remote targets in manual mode', () => {
        const options = buildSmartRemoteOptions(
            context,
            { source: 'manual', remoteEntityId: 'remote.android_tv' },
            'remote.android_tv',
        );

        expect(options.remoteEntityId).toBe('remote.android_tv');
        expect(options.mediaPlayerEntityId).toBeUndefined();
    });

    it('builds smart device panel defaults by preset', () => {
        const options = buildSmartDevicePanelOptions(context, { preset: 'cover' });

        expect(options.entityId).toBe('cover.blinds');
        expect(options.preset).toBe('cover');
    });

    it('builds smart cover defaults from cover entities', () => {
        const options = buildSmartCoverOptions(context);

        expect(options.entityIds).toEqual(['cover.blinds']);
        expect(options.showGroupControls).toBe(true);
        expect(options.showPosition).toBe(true);
        expect(options.maxItems).toBe(5);
    });

    it('builds smart air defaults from fan and humidifier entities', () => {
        const airContext: InventoryContext = {
            ...context,
            states: {
                ...context.states,
                'fan.kitchen_fan': entity('fan.kitchen_fan', 'on', {
                    friendly_name: 'Kitchen Fan',
                    percentage: 66,
                }),
                'humidifier.bedroom': entity('humidifier.bedroom', 'off', {
                    friendly_name: 'Bedroom Humidifier',
                    current_humidity: 42,
                    humidity: 48,
                }),
            },
            entities: [
                ...context.entities,
                registry('fan.kitchen_fan', 'Kitchen Fan'),
                registry('humidifier.bedroom', 'Bedroom Humidifier'),
            ],
        };

        const options = buildSmartAirOptions(airContext);

        expect(options.entityIds).toEqual(['humidifier.bedroom', 'fan.kitchen_fan']);
        expect(options.showPowerControls).toBe(true);
        expect(options.showSpeed).toBe(true);
        expect(options.showHumidity).toBe(true);
        expect(options.maxItems).toBe(5);
    });

    it('builds smart vacuum defaults from vacuum entities', () => {
        const vacuumContext: InventoryContext = {
            ...context,
            states: {
                ...context.states,
                'vacuum.downstairs': entity('vacuum.downstairs', 'cleaning', {
                    friendly_name: 'Downstairs Vacuum',
                    battery_level: 78,
                    fan_speed: 'Turbo',
                }),
                'vacuum.upstairs': entity('vacuum.upstairs', 'docked', {
                    friendly_name: 'Upstairs Vacuum',
                    battery_level: 100,
                }),
            },
            entities: [
                ...context.entities,
                registry('vacuum.downstairs', 'Downstairs Vacuum'),
                registry('vacuum.upstairs', 'Upstairs Vacuum'),
            ],
        };

        const options = buildSmartVacuumOptions(vacuumContext);

        expect(options.entityIds).toEqual(['vacuum.downstairs', 'vacuum.upstairs']);
        expect(options.showGroupControls).toBe(true);
        expect(options.showBattery).toBe(true);
        expect(options.showFanSpeed).toBe(true);
        expect(options.maxItems).toBe(4);
    });

    it('builds smart security defaults from alarms, locks, openings, motion, and safety sensors', () => {
        const securityContext: InventoryContext = {
            ...context,
            states: {
                ...context.states,
                'alarm_control_panel.home': entity('alarm_control_panel.home', 'disarmed', {
                    friendly_name: 'Home Alarm',
                }),
                'lock.front_door': entity('lock.front_door', 'locked', {
                    friendly_name: 'Front Door',
                }),
                'binary_sensor.smoke': entity('binary_sensor.smoke', 'off', {
                    friendly_name: 'Smoke Detector',
                    device_class: 'smoke',
                }),
            },
            entities: [
                ...context.entities,
                registry('alarm_control_panel.home', 'Home Alarm'),
                registry('lock.front_door', 'Front Door'),
                registry('binary_sensor.smoke', 'Smoke Detector'),
            ],
        };

        const options = buildSmartSecurityOptions(securityContext);

        expect(options.alarmEntityId).toBe('alarm_control_panel.home');
        expect(options.lockEntityIds).toEqual(['lock.front_door']);
        expect(options.openingEntityIds).toContain('binary_sensor.kitchen_window');
        expect(options.motionEntityIds).toContain('binary_sensor.kitchen_motion');
        expect(options.safetyEntityIds).toEqual(expect.arrayContaining([
            'binary_sensor.smoke',
            'binary_sensor.water_leak',
        ]));
        expect(options.showAlarmControls).toBe(true);
    });

    it('builds smart lock defaults from lock entities', () => {
        const lockContext: InventoryContext = {
            ...context,
            states: {
                ...context.states,
                'lock.front_door': entity('lock.front_door', 'unlocked', {
                    friendly_name: 'Front Door',
                }),
                'lock.back_door': entity('lock.back_door', 'locked', {
                    friendly_name: 'Back Door',
                }),
            },
            entities: [
                ...context.entities,
                registry('lock.front_door', 'Front Door'),
                registry('lock.back_door', 'Back Door'),
            ],
        };

        const options = buildSmartLockOptions(lockContext);

        expect(options.entityIds).toEqual(['lock.back_door', 'lock.front_door']);
        expect(options.showLockAll).toBe(true);
        expect(options.showUnlockControls).toBe(false);
        expect(options.maxItems).toBe(6);
    });

    it('builds smart update defaults from update entities and update sensors', () => {
        const options = buildSmartUpdateOptions(context);

        expect(options.entityIds).toEqual(['binary_sensor.addon_update', 'update.router']);
        expect(options.showCheckControl).toBe(true);
        expect(options.showInstallControls).toBe(true);
        expect(options.showVersions).toBe(true);
        expect(options.showReleaseNotes).toBe(true);
        expect(options.maxItems).toBe(5);
    });

    it('builds smart todo defaults and prioritizes shopping lists', () => {
        const options = buildSmartTodoOptions(context);

        expect(options.entityIds).toEqual(['todo.shopping_list', 'todo.house_tasks']);
        expect(options.showAddControl).toBe(true);
        expect(options.showCompleted).toBe(false);
        expect(options.showDueDates).toBe(true);
        expect(options.maxItems).toBe(6);
    });

    it('returns equivalent query results through the indexed inventory API', () => {
        const index = createInventoryIndex(context);
        const queries = [
            { domains: ['light'], areaIds: ['kitchen'] },
            { domains: ['sensor'], deviceClasses: ['battery'], includeDiagnostic: true },
            { domains: ['update'], states: ['on'], sort: 'name' as const },
            { floorIds: ['ground'], limit: 5 },
        ];

        for (const query of queries) {
            expect(index.query(query).map((item) => item.entityId)).toEqual(
                resolveEntityQuery(context, query).map((item) => item.entityId),
            );
        }
    });

    it('builds identical smart options from an inventory index', () => {
        const index = createInventoryIndex(context);

        expect(buildSmartEnergyOptions(index)).toEqual(buildSmartEnergyOptions(context));
        expect(buildSmartCalendarOptions(index)).toEqual(buildSmartCalendarOptions(context));
        expect(buildSmartRemoteOptions(index)).toEqual(buildSmartRemoteOptions(context));
        expect(buildSmartWeatherOptions(index)).toEqual(buildSmartWeatherOptions(context));
        expect(buildSmartSecurityOptions(index)).toEqual(buildSmartSecurityOptions(context));
        expect(buildSmartLockOptions(index)).toEqual(buildSmartLockOptions(context));
        expect(buildSmartAirOptions(index)).toEqual(buildSmartAirOptions(context));
        expect(buildSmartUpdateOptions(index)).toEqual(buildSmartUpdateOptions(context));
        expect(buildSmartTodoOptions(index)).toEqual(buildSmartTodoOptions(context));
        expect(buildSmartVacuumOptions(index)).toEqual(buildSmartVacuumOptions(context));
        expect(buildSmartDevicePanelOptions(index, { preset: 'cover' })).toEqual(
            buildSmartDevicePanelOptions(context, { preset: 'cover' }),
        );
    });
});
