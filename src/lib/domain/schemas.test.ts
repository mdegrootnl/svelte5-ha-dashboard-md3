import { describe, expect, it } from 'vitest';
import { DashboardItemSchema } from './schemas';

const baseItem = {
    id: 'card-1',
    name: 'Energy',
    entityId: '',
    cardType: 'energy',
    layout: {
        desktop: { colStart: 1, colSpan: 6, rowStart: 1, rowSpan: 2 },
        mobile: { colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 2 },
    },
    secondaryEntityId: '',
    secondaryName: '',
    domainFilter: '',
};

describe('DashboardItemSchema card options', () => {
    it('accepts the new card families with keyed options', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            options: {
                energy: {
                    source: 'auto',
                    solarPowerEntityId: 'sensor.solar_power',
                },
            },
        }) as typeof baseItem & { options: { energy: { solarPowerEntityId: string } } };

        expect(parsed.cardType).toBe('energy');
        expect(parsed.options.energy.solarPowerEntityId).toBe('sensor.solar_power');
    });

    it('rejects invalid smart source values', () => {
        expect(() =>
            DashboardItemSchema.parse({
                ...baseItem,
                cardType: 'room',
                options: {
                    room: {
                        source: 'magic',
                    },
                },
            }),
        ).toThrow();
    });
});
