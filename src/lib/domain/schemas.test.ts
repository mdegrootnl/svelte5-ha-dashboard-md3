import { describe, expect, it } from 'vitest';
import { AppConfigPartialSchema, DashboardItemSchema } from './schemas';
import type { RoomDashboardConfig } from '$lib/types/dashboard';

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

    it('accepts attention collection modes', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'collection',
            options: {
                collection: {
                    mode: 'openings',
                    showState: true,
                    presentation: 'summary',
                },
            },
        }) as typeof baseItem & { options: { collection: { mode: string; presentation: string } } };

        expect(parsed.options.collection.mode).toBe('openings');
        expect(parsed.options.collection.presentation).toBe('summary');
    });

    it('accepts navigation visual profile options', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'navigation',
            path: '/dashboard/ground/kitchen',
            iconType: 'image',
            imageUrl: '/api/image/serve/kitchen-preview/512x512',
            options: {
                navigation: {
                    source: 'area',
                    areaId: 'kitchen',
                    visualKind: 'kitchen',
                    visualAudience: 'family',
                    visualPromptSeed: 'stylish modern kitchen, warm functional lighting',
                    imageSource: 'ha_area_picture',
                },
            },
        }) as typeof baseItem & {
            options: {
                navigation: {
                    visualKind: string;
                    imageSource: string;
                };
            };
        };

        expect(parsed.options.navigation.visualKind).toBe('kitchen');
        expect(parsed.options.navigation.imageSource).toBe('ha_area_picture');
    });

    it('accepts generated navigation preview image sources', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'navigation',
            path: '/dashboard/ground/living_room',
            iconType: 'image',
            imageUrl: '/api/room-previews/living_room?audience=family',
            options: {
                navigation: {
                    source: 'area',
                    areaId: 'living_room',
                    visualKind: 'living_room',
                    visualAudience: 'family',
                    visualPromptSeed: 'stylish modern living room',
                    imageSource: 'generated_preview',
                },
            },
        }) as typeof baseItem & {
            options: {
                navigation: {
                    imageSource: string;
                };
            };
        };

        expect(parsed.options.navigation.imageSource).toBe('generated_preview');
    });

    it('accepts credited Unsplash navigation images', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'navigation',
            path: '/dashboard/ground/kitchen',
            iconType: 'image',
            imageUrl: 'https://images.unsplash.com/photo-kitchen',
            imageAttribution: {
                provider: 'unsplash',
                sourceName: 'Unsplash',
                sourceUrl: 'https://unsplash.com/photos/photo-kitchen',
                authorName: 'Ada Lovelace',
                authorUrl: 'https://unsplash.com/@ada',
                photoId: 'photo-kitchen',
                licenseUrl: 'https://unsplash.com/license',
                downloadLocation: 'https://api.unsplash.com/photos/photo-kitchen/download',
            },
            options: {
                navigation: {
                    imageSource: 'unsplash',
                },
            },
        }) as typeof baseItem & {
            imageAttribution: {
                provider: string;
                authorName: string;
            };
            options: {
                navigation: {
                    imageSource: string;
                };
            };
        };

        expect(parsed.imageAttribution.provider).toBe('unsplash');
        expect(parsed.imageAttribution.authorName).toBe('Ada Lovelace');
        expect(parsed.options.navigation.imageSource).toBe('unsplash');
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

    it('accepts generation metadata on generated cards', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            generatedBy: {
                recipe: 'room',
                sourceType: 'area',
                sourceId: 'kitchen',
                generatedAt: '2026-05-14T10:00:00.000Z',
                reason: 'Room recipe selected this card',
                version: 1,
            },
            generationState: 'generated',
        }) as typeof baseItem & { generationState: string };

        expect(parsed.generationState).toBe('generated');
    });
});

describe('AppConfigPartialSchema theme options', () => {
    it('accepts configured radius values', () => {
        const parsed = AppConfigPartialSchema.parse({
            theme: {
                cardRadius: 18,
                tabPillRadius: 24,
            },
        });

        expect(parsed.theme?.cardRadius).toBe(18);
        expect(parsed.theme?.tabPillRadius).toBe(24);
    });

    it('rejects radius values outside the supported range', () => {
        expect(() =>
            AppConfigPartialSchema.parse({
                theme: {
                    cardRadius: 99,
                },
            }),
        ).toThrow();

        expect(() =>
            AppConfigPartialSchema.parse({
                theme: {
                    tabPillRadius: 99,
                },
            }),
        ).toThrow();
    });

    it('persists generated dashboard metadata through app config validation', () => {
        const generatedBy = {
            recipe: 'house',
            sourceType: 'house',
            sourceId: 'house',
            generatedAt: '2026-05-14T10:00:00.000Z',
            reason: 'Generated house overview',
            version: 1,
        };
        const tab = {
            id: 'tab-1',
            name: 'Overview',
            icon: 'home',
            columns: { desktop: 12, mobile: 4 },
            rows: 'implicit',
            gap: 16,
            padding: 16,
            rowHeight: 80,
            items: [{ ...baseItem, generatedBy, generationState: 'generated' }],
            generatedBy,
            generationState: 'generated',
        };

        const parsed = AppConfigPartialSchema.parse({
            dashboards: {
                dashboard_home: {
                    ...tab,
                    id: 'dashboard_home',
                    tabs: [tab],
                    activeTabId: 'tab-1',
                },
            },
        });

        const dashboards = parsed.dashboards as Record<string, RoomDashboardConfig> | undefined;

        expect(dashboards?.dashboard_home.tabs[0].items[0].generationState).toBe('generated');
    });
});
