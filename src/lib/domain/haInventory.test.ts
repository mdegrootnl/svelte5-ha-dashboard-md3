import { describe, expect, it } from 'vitest';
import {
    buildSmartCalendarOptions,
    buildSmartDevicePanelOptions,
    buildSmartEnergyOptions,
    buildSmartRemoteOptions,
    createCollectionQuery,
    filterLowBattery,
    resolveEntityQuery,
} from './haInventory';
import type { HAEntity } from '$lib/types';
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
        'update.router': entity('update.router', 'on', { friendly_name: 'Router Update' }),
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
    ],
};

describe('haInventory', () => {
    it('resolves entities by floor through device area fallback', () => {
        const results = resolveEntityQuery(context, {
            floorIds: ['ground'],
            domains: ['light'],
        });

        expect(results.map((item) => item.entityId)).toEqual(['light.kitchen']);
    });

    it('filters low battery entities by threshold', () => {
        const query = createCollectionQuery({ mode: 'low_battery', threshold: 20 });
        const results = filterLowBattery(resolveEntityQuery(context, query), 20);

        expect(results.map((item) => item.entityId)).toEqual(['sensor.kitchen_battery']);
    });

    it('builds smart energy defaults from friendly names and device classes', () => {
        const options = buildSmartEnergyOptions(context);

        expect(options.solarPowerEntityId).toBe('sensor.solar_power');
        expect(options.homePowerEntityId).toBe('sensor.home_power');
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

    it('builds smart device panel defaults by preset', () => {
        const options = buildSmartDevicePanelOptions(context, { preset: 'cover' });

        expect(options.entityId).toBe('cover.blinds');
        expect(options.preset).toBe('cover');
    });
});
