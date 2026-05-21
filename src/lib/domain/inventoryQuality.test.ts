import { describe, expect, it } from 'vitest';
import {
    buildInventoryQualityReport,
    getInventoryAreaSource,
    summarizeInventoryAreaSources,
} from './inventoryQuality';
import type { ResolvedEntity } from './haInventory';

function entity(
    entityId: string,
    overrides: Partial<ResolvedEntity> = {},
): ResolvedEntity {
    const domain = entityId.split('.')[0] ?? 'sensor';

    return {
        entityId,
        domain,
        name: entityId,
        state: 'on',
        labels: [],
        hidden: false,
        diagnostic: false,
        ...overrides,
    };
}

describe('inventory quality helpers', () => {
    it('categorizes area source provenance for generated-dashboard review', () => {
        expect(
            getInventoryAreaSource(
                entity('light.kitchen', {
                    areaId: 'kitchen',
                    areaSource: 'entity_registry',
                }),
            ),
        ).toBe('entity_registry');
        expect(
            getInventoryAreaSource(
                entity('light.device_area', {
                    areaId: 'kitchen',
                    areaSource: 'device_registry',
                }),
            ),
        ).toBe('device_registry');
        expect(
            getInventoryAreaSource(
                entity('light.name_area', {
                    areaId: 'kitchen',
                    areaSource: 'name_inference',
                }),
            ),
        ).toBe('name_inference');
        expect(getInventoryAreaSource(entity('light.unassigned'))).toBe('unassigned');
    });

    it('summarizes entity area source counts', () => {
        const summary = summarizeInventoryAreaSources([
            entity('light.entity_area', {
                areaId: 'kitchen',
                areaSource: 'entity_registry',
            }),
            entity('light.device_area', {
                areaId: 'kitchen',
                areaSource: 'device_registry',
            }),
            entity('light.name_area', {
                areaId: 'kitchen',
                areaSource: 'name_inference',
            }),
            entity('light.unassigned'),
        ]);

        expect(summary).toEqual({
            total: 4,
            entityRegistry: 1,
            deviceRegistry: 1,
            nameInference: 1,
            unassigned: 1,
        });
    });

    it('builds review issue groups for fragile or hidden inventory signals', () => {
        const report = buildInventoryQualityReport([
            entity('light.kitchen', {
                areaId: 'kitchen',
                areaSource: 'entity_registry',
            }),
            entity('sensor.kitchen_temperature', {
                areaId: 'kitchen',
                areaSource: 'name_inference',
            }),
            entity('sensor.unassigned_temperature'),
            entity('sensor.rssi', { diagnostic: true }),
            entity('sensor.broken', { state: 'unavailable' }),
        ]);

        expect(report).toMatchObject({
            total: 5,
            entityRegistry: 1,
            nameInference: 1,
            unassigned: 3,
        });
        expect(report.issueGroups).toEqual(
            expect.arrayContaining([
                {
                    id: 'name_inferred_area',
                    severity: 'warning',
                    entityIds: ['sensor.kitchen_temperature'],
                },
                {
                    id: 'missing_area',
                    severity: 'warning',
                    entityIds: ['sensor.unassigned_temperature', 'sensor.broken'],
                },
                {
                    id: 'diagnostic_or_hidden',
                    severity: 'info',
                    entityIds: ['sensor.rssi'],
                },
                {
                    id: 'hidden_runtime_state',
                    severity: 'info',
                    entityIds: ['sensor.broken'],
                },
            ]),
        );
    });
});
