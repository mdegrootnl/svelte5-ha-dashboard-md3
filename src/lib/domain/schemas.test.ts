import { describe, expect, it } from 'vitest';
import { AppConfigPartialSchema, DashboardItemSchema, GraphCardConfigSchema, GridConfigSchema } from './schemas';
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
                    mode: 'sources',
                    historyRange: '30d',
                    solarPowerEntityId: 'sensor.solar_power',
                    deviceEntityIds: ['sensor.dishwasher_energy'],
                    hoursToShow: 48,
                },
            },
        }) as typeof baseItem & {
            options: {
                energy: {
                    solarPowerEntityId: string;
                    mode: string;
                    historyRange: string;
                    hoursToShow: number;
                };
            };
        };

        expect(parsed.cardType).toBe('energy');
        expect(parsed.options.energy.solarPowerEntityId).toBe('sensor.solar_power');
        expect(parsed.options.energy.mode).toBe('sources');
        expect(parsed.options.energy.historyRange).toBe('30d');
        expect(parsed.options.energy.hoursToShow).toBe(48);
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

    it('accepts presence card options', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'presence',
            options: {
                presence: {
                    source: 'auto',
                    maxPeople: 4,
                    showGuestMode: true,
                    showEta: true,
                },
            },
        }) as typeof baseItem & { options: { presence: { maxPeople: number } } };

        expect(parsed.cardType).toBe('presence');
        expect(parsed.options.presence.maxPeople).toBe(4);
    });

    it('accepts lock card options', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'lock',
            options: {
                lock: {
                    source: 'manual',
                    entityIds: ['lock.front_door'],
                    showLockAll: true,
                    showUnlockControls: false,
                    maxItems: 4,
                },
            },
        }) as typeof baseItem & { options: { lock: { entityIds: string[]; maxItems: number } } };

        expect(parsed.cardType).toBe('lock');
        expect(parsed.options.lock.entityIds).toEqual(['lock.front_door']);
        expect(parsed.options.lock.maxItems).toBe(4);
    });

    it('accepts cover card options', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'cover',
            options: {
                cover: {
                    source: 'manual',
                    entityIds: ['cover.kitchen_blinds'],
                    showGroupControls: true,
                    showPosition: true,
                    maxItems: 4,
                },
            },
        }) as typeof baseItem & { options: { cover: { entityIds: string[]; maxItems: number } } };

        expect(parsed.cardType).toBe('cover');
        expect(parsed.options.cover.entityIds).toEqual(['cover.kitchen_blinds']);
        expect(parsed.options.cover.maxItems).toBe(4);
    });

    it('accepts air card options', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'air',
            options: {
                air: {
                    source: 'manual',
                    entityIds: ['fan.ceiling_fan', 'humidifier.bedroom'],
                    showPowerControls: true,
                    showSpeed: true,
                    showHumidity: true,
                    maxItems: 4,
                },
            },
        }) as typeof baseItem & { options: { air: { entityIds: string[]; maxItems: number } } };

        expect(parsed.cardType).toBe('air');
        expect(parsed.options.air.entityIds).toEqual(['fan.ceiling_fan', 'humidifier.bedroom']);
        expect(parsed.options.air.maxItems).toBe(4);
    });

    it('accepts vacuum card options', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'vacuum',
            options: {
                vacuum: {
                    source: 'manual',
                    entityIds: ['vacuum.downstairs'],
                    showGroupControls: true,
                    showBattery: true,
                    showFanSpeed: true,
                    maxItems: 3,
                },
            },
        }) as typeof baseItem & { options: { vacuum: { entityIds: string[]; maxItems: number } } };

        expect(parsed.cardType).toBe('vacuum');
        expect(parsed.options.vacuum.entityIds).toEqual(['vacuum.downstairs']);
        expect(parsed.options.vacuum.maxItems).toBe(3);
    });

    it('accepts update card options', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'update',
            options: {
                update: {
                    source: 'manual',
                    entityIds: ['update.home_assistant_core', 'binary_sensor.addon_update'],
                    showCheckControl: true,
                    showInstallControls: true,
                    showVersions: true,
                    showReleaseNotes: true,
                    maxItems: 5,
                },
            },
        }) as typeof baseItem & { options: { update: { entityIds: string[]; maxItems: number } } };

        expect(parsed.cardType).toBe('update');
        expect(parsed.options.update.entityIds).toEqual(['update.home_assistant_core', 'binary_sensor.addon_update']);
        expect(parsed.options.update.maxItems).toBe(5);
    });

    it('accepts todo card options', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'todo',
            options: {
                todo: {
                    source: 'manual',
                    entityIds: ['todo.shopping_list'],
                    showAddControl: true,
                    showCompleted: false,
                    showDueDates: true,
                    maxItems: 6,
                },
            },
        }) as typeof baseItem & { options: { todo: { entityIds: string[]; maxItems: number } } };

        expect(parsed.cardType).toBe('todo');
        expect(parsed.options.todo.entityIds).toEqual(['todo.shopping_list']);
        expect(parsed.options.todo.maxItems).toBe(6);
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

    it('accepts graph chart types and keeps older graph items valid', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'graph',
            entityId: 'sensor.energy_today',
            chartType: 'bar',
            comparisonMode: 'previous_period',
            dataSource: 'statistics',
            statisticsPeriod: 'day',
            scaleMode: 'normalized',
            showAnalytics: true,
            color_thresholds: [{ value: 27, label: 'Warm' }],
            rangeBands: [{ min: 18, max: 24, label: 'Comfort' }],
            graphEntities: [
                {
                    entity_id: 'sensor.temperature',
                    chartType: 'line',
                },
            ],
        }) as typeof baseItem & {
            chartType: string;
            comparisonMode: string;
            dataSource: string;
            scaleMode: string;
            color_thresholds: Array<{ value: number }>;
            rangeBands: Array<{ max: number }>;
            graphEntities: Array<{ chartType: string }>;
        };

        expect(parsed.chartType).toBe('bar');
        expect(parsed.comparisonMode).toBe('previous_period');
        expect(parsed.dataSource).toBe('statistics');
        expect(parsed.scaleMode).toBe('normalized');
        expect(parsed.color_thresholds[0].value).toBe(27);
        expect(parsed.rangeBands[0].max).toBe(24);
        expect(parsed.graphEntities[0].chartType).toBe('line');

        const legacyParsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'graph',
            entityId: 'sensor.temperature',
        }) as typeof baseItem & { chartType?: string };

        expect(legacyParsed.chartType).toBeUndefined();
        expect(GraphCardConfigSchema.parse({}).chartType).toBe('area');
        expect(GraphCardConfigSchema.parse({}).dataSource).toBe('auto');
        expect(GraphCardConfigSchema.parse({}).comparisonMode).toBe('none');
        expect(GraphCardConfigSchema.parse({}).scaleMode).toBe('absolute');
    });

    it('accepts card surface style config and rejects invalid values', () => {
        expect(
            AppConfigPartialSchema.parse({
                theme: {
                    cardSurfaceStyle: 'glass',
                },
            }).theme?.cardSurfaceStyle,
        ).toBe('glass');

        const parsedGrid = GridConfigSchema.parse({
            id: 'grid-1',
            name: 'Kitchen',
            columns: { desktop: 12, mobile: 4 },
            rows: 'implicit',
            gap: 16,
            padding: 16,
            items: [],
            cardSurfaceStyle: 'soft',
        }) as { cardSurfaceStyle?: string };

        expect(parsedGrid.cardSurfaceStyle).toBe('soft');

        expect(() =>
            AppConfigPartialSchema.parse({
                theme: {
                    cardSurfaceStyle: 'neon',
                },
            }),
        ).toThrow();
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

    it('accepts credited Pexels navigation images', () => {
        const parsed = DashboardItemSchema.parse({
            ...baseItem,
            cardType: 'navigation',
            path: '/dashboard/ground/kitchen',
            iconType: 'image',
            imageUrl: 'https://images.pexels.com/photos/kitchen.jpeg',
            imageAttribution: {
                provider: 'pexels',
                sourceName: 'Pexels',
                sourceUrl: 'https://www.pexels.com/photo/kitchen/',
                authorName: 'Ada Lovelace',
                authorUrl: 'https://www.pexels.com/@ada',
                photoId: '123',
                licenseUrl: 'https://www.pexels.com/license/',
            },
            options: {
                navigation: {
                    imageSource: 'pexels',
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

        expect(parsed.imageAttribution.provider).toBe('pexels');
        expect(parsed.imageAttribution.authorName).toBe('Ada Lovelace');
        expect(parsed.options.navigation.imageSource).toBe('pexels');
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
                security: {
                    source: 'manual',
                    alarmEntityId: 'alarm_control_panel.home',
                    lockEntityIds: ['lock.front_door'],
                    openingEntityIds: ['binary_sensor.kitchen_window'],
                    motionEntityIds: ['binary_sensor.hall_motion'],
                    safetyEntityIds: ['binary_sensor.smoke'],
                    showAlarmControls: true,
                    maxItems: 5,
                },
            },
        }) as typeof baseItem & {
            options: {
                button: { control: string };
                remote: { mediaPlayerEntityId: string };
                device_panel: { entityId: string };
                security: { alarmEntityId: string };
            };
        };

        expect(parsed.options.button.control).toBe('brightness');
        expect(parsed.options.remote.mediaPlayerEntityId).toBe('media_player.tv');
        expect(parsed.options.device_panel.entityId).toBe('cover.blinds');
        expect(parsed.options.security.alarmEntityId).toBe('alarm_control_panel.home');
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
    it('accepts kiosk mode settings and rejects out-of-range values', () => {
        const parsed = AppConfigPartialSchema.parse({
            kiosk: {
                enabled: true,
                idleTimeout: 120,
                dimOnIdle: true,
                hideNavigationOnIdle: true,
                showScreensaver: true,
                hideEditControls: true,
                editUnlockMinutes: 10,
            },
        });

        expect(parsed.kiosk?.enabled).toBe(true);
        expect(parsed.kiosk?.idleTimeout).toBe(120);
        expect(parsed.kiosk?.showScreensaver).toBe(true);
        expect(parsed.kiosk?.editUnlockMinutes).toBe(10);

        expect(() =>
            AppConfigPartialSchema.parse({
                kiosk: {
                    idleTimeout: 1,
                },
            }),
        ).toThrow();
    });

    it('accepts English as an app language', () => {
        const parsed = AppConfigPartialSchema.parse({
            theme: {
                language: 'en',
            },
        });

        expect(parsed.theme?.language).toBe('en');
    });

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

    it('persists grid background image config through app config validation', () => {
        const tab = {
            id: 'tab-1',
            name: 'Overview',
            icon: 'home',
            columns: { desktop: 12, mobile: 4 },
            rows: 'implicit',
            gap: 16,
            padding: 16,
            rowHeight: 80,
            items: [],
            background: {
                enabled: true,
                source: 'pexels',
                imageUrl: 'https://images.pexels.com/photos/home.jpeg',
                accentColor: '#91a87c',
                objectPosition: 'center',
                scrimOpacity: 0.58,
                imageAttribution: {
                    provider: 'pexels',
                    sourceName: 'Pexels',
                    sourceUrl: 'https://www.pexels.com/photo/home/',
                    authorName: 'Ada Lovelace',
                    photoId: '123',
                    licenseUrl: 'https://www.pexels.com/license/',
                },
            },
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

        expect(dashboards?.dashboard_home.tabs[0].background?.source).toBe('pexels');
        expect(dashboards?.dashboard_home.tabs[0].background?.imageAttribution?.provider).toBe('pexels');
    });
});
