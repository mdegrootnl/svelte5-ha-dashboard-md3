import { describe, expect, it } from 'vitest';
import { AppConfigPartialSchema, DashboardItemSchema } from './schemas';

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

    it('accepts floor-backed room sources', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'room',
            options: {
                room: {
                    source: 'floor',
                    floorId: 'ground_floor',
                },
            },
        }) as typeof baseItem & { options: { room: { floorId: string } } };

        expect(parsed.options.room.floorId).toBe('ground_floor');
    });

    it('accepts smart card entity mappings and custom actions', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'remote',
            options: {
                button: {
                    display: 'compact',
                    control: 'brightness',
                    showState: true,
                    stateColor: false,
                    actions: [
                        {
                            id: 'movie',
                            label: 'Movie',
                            domain: 'scene',
                            service: 'turn_on',
                            entityId: 'scene.movie',
                        },
                    ],
                },
                energy: {
                    source: 'manual',
                    solarPowerEntityId: 'sensor.solar_power',
                },
                weather: {
                    source: 'manual',
                    weatherEntityId: 'weather.home',
                },
                remote: {
                    preset: 'android_tv',
                    mediaPlayerEntityId: 'media_player.tv',
                    actions: [
                        {
                            id: 'up',
                            label: 'Up',
                            domain: 'remote',
                            service: 'send_command',
                            serviceData: { command: 'DPAD_UP' },
                        },
                    ],
                },
                device_panel: {
                    preset: 'cover',
                    entityId: 'cover.blinds',
                    actions: [
                        {
                            id: 'close',
                            service: 'close_cover',
                        },
                    ],
                },
            },
        }) as typeof baseItem & {
            options: {
                button: { control: string };
                remote: { mediaPlayerEntityId: string };
                device_panel: { entityId: string };
            };
        };

        expect(parsed.options.button.control).toBe('brightness');
        expect(parsed.options.remote.mediaPlayerEntityId).toBe('media_player.tv');
        expect(parsed.options.device_panel.entityId).toBe('cover.blinds');
    });
});

describe('AppConfigPartialSchema theme options', () => {
    it('accepts configured card radius values', () => {
        const parsed = AppConfigPartialSchema.parse({
            theme: {
                cardRadius: 18,
            },
        });

        expect(parsed.theme?.cardRadius).toBe(18);
    });

    it('rejects card radius values outside the supported range', () => {
        expect(() =>
            AppConfigPartialSchema.parse({
                theme: {
                    cardRadius: 99,
                },
            }),
        ).toThrow();
    });
});
