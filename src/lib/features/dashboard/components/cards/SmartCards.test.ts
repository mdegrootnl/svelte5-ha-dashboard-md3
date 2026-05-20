import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarAgendaCard from './CalendarAgendaCard.svelte';
import CameraCard from './CameraCard.svelte';
import DevicePanelCard from './DevicePanelCard.svelte';
import EnergyFlowCard from './EnergyFlowCard.svelte';
import EntityCollectionCard from './EntityCollectionCard.svelte';
import RemotePanelCard from './RemotePanelCard.svelte';
import RoomSummaryCard from './RoomSummaryCard.svelte';
import WeatherOverviewCard from './WeatherOverviewCard.svelte';
import { dashboardEditorStore, haRegistryStore, haStore, themeStore } from '$lib';
import { inventoryStore } from '$lib/stores/inventory.svelte';

function state(entity_id: string, value: string, attributes = {}) {
    return {
        entity_id,
        state: value,
        attributes,
        last_changed: '2026-05-14T10:00:00Z',
        last_updated: '2026-05-14T10:00:00Z',
        context: { id: entity_id, parent_id: null, user_id: null },
    };
}

describe('smart dashboard cards', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        haRegistryStore.entityRegistry = [];
        haRegistryStore.deviceRegistry = [];
        haRegistryStore.areas = [];
        haRegistryStore.floors = [];
        haStore.states = {
            'light.table': state('light.table', 'on', { friendly_name: 'Table Lamp' }),
            'sensor.battery': state('sensor.battery', '12', {
                friendly_name: 'Remote Battery',
                device_class: 'battery',
                unit_of_measurement: '%',
            }),
            'sensor.solar_power': state('sensor.solar_power', '1800', {
                friendly_name: 'Solar Power',
                device_class: 'power',
                unit_of_measurement: 'W',
            }),
            'sensor.home_power': state('sensor.home_power', '900', {
                friendly_name: 'Home Power',
                device_class: 'power',
                unit_of_measurement: 'W',
            }),
            'sensor.dishwasher_energy': state('sensor.dishwasher_energy', '2.4', {
                friendly_name: 'Dishwasher Energy',
                device_class: 'energy',
                unit_of_measurement: 'kWh',
            }),
            'weather.home': state('weather.home', 'cloudy', {
                friendly_name: 'Home Weather',
                temperature: 16,
                temperature_unit: 'C',
                humidity: 77,
                wind_speed: 14,
                wind_speed_unit: 'km/h',
            }),
            'sensor.home_humidity': state('sensor.home_humidity', 'unknown', {
                friendly_name: 'Home Humidity',
                device_class: 'humidity',
                unit_of_measurement: '%',
            }),
            'calendar.family': state('calendar.family', 'on', {
                friendly_name: 'Family',
                message: 'Football training',
                start_time: '2026-05-14T18:00:00Z',
            }),
            'remote.android_tv': state('remote.android_tv', 'on', {
                friendly_name: 'Android TV Remote',
            }),
            'media_player.tv': state('media_player.tv', 'on', {
                friendly_name: 'TV',
            }),
            'cover.blinds': state('cover.blinds', 'open', {
                friendly_name: 'Blinds',
            }),
            'binary_sensor.hall_motion': state('binary_sensor.hall_motion', 'on', {
                friendly_name: 'Hall Motion',
                device_class: 'motion',
            }),
            'camera.front_door': state('camera.front_door', 'recording', {
                friendly_name: 'Front Door Camera',
                entity_picture: '/api/camera_proxy/camera.front_door',
            }),
            'camera.garden': state('camera.garden', 'idle', {
                friendly_name: 'Garden Camera',
            }),
        } as any;
        haStore.entityCount = Object.keys(haStore.states).length;
        haStore.connected = false;
        haStore.auth = null;
        haStore.statesVersion += 1;
        haRegistryStore.version += 1;
        dashboardEditorStore.isEditing = false;
        themeStore.language = 'en';
    });

    it('renders a room summary from manual entities', () => {
        render(RoomSummaryCard, {
            props: {
                name: 'Living Room',
                options: { source: 'manual', entityIds: ['light.table'] },
            },
        });

        expect(screen.getByText('Living Room')).toBeInTheDocument();
        expect(screen.getByText('Table Lamp')).toBeInTheDocument();
    });

    it('renders an auto collection for low batteries', () => {
        render(EntityCollectionCard, {
            props: {
                name: 'Needs Attention',
                options: { mode: 'low_battery', threshold: 25 },
            },
        });

        expect(screen.getByText('Remote Battery')).toBeInTheDocument();
        expect(screen.getByText('12%')).toBeInTheDocument();
    });

    it('renders a compact summary collection', () => {
        render(EntityCollectionCard, {
            props: {
                name: 'Attention',
                options: { mode: 'lights_on', presentation: 'summary' },
            },
        });

        expect(screen.getByText('Attention')).toBeInTheDocument();
        expect(screen.getByText('1 on')).toBeInTheDocument();
        expect(screen.getByText('Table Lamp')).toBeInTheDocument();
        expect(screen.getByText('On')).toBeInTheDocument();
    });

    it('renders empty summary collections with a neutral clear state', () => {
        render(EntityCollectionCard, {
            props: {
                name: 'Security',
                options: { mode: 'security', presentation: 'summary' },
            },
        });

        const clearBadge = screen.getByText('Clear');
        expect(screen.getByText('Nothing needs attention')).toBeInTheDocument();
        expect(clearBadge.getAttribute('style')).toContain('var(--color-m3-outline)');
    });

    it('resolves manual collection entities without the broad query helper', () => {
        const querySpy = vi.spyOn(inventoryStore, 'query');
        render(EntityCollectionCard, {
            props: {
                name: 'Manual',
                options: { source: 'manual', mode: 'custom', entityIds: ['light.table'] },
            },
        });

        expect(screen.getByText('Table Lamp')).toBeInTheDocument();
        expect(querySpy).not.toHaveBeenCalled();
    });

    it('renders attention collection modes from live inventory', () => {
        render(EntityCollectionCard, {
            props: {
                name: 'Open Now',
                options: { mode: 'openings' },
            },
        });
        expect(screen.getByText('Blinds')).toBeInTheDocument();

        render(EntityCollectionCard, {
            props: {
                name: 'Activity',
                options: { mode: 'motion' },
            },
        });
        expect(screen.getByText('Hall Motion')).toBeInTheDocument();
    });

    it('renders only active cameras in the camera card', async () => {
        vi.spyOn(haStore, 'fetchProxiedBlobUrl').mockResolvedValue('/camera-front.jpg');

        render(CameraCard, {
            props: {
                name: 'Active Cameras',
                options: {
                    source: 'manual',
                    entityIds: ['camera.front_door', 'camera.garden'],
                    refreshSeconds: 10,
                },
            },
        });

        expect(screen.getByText('Active Cameras')).toBeInTheDocument();
        expect(screen.getByText('Front Door Camera')).toBeInTheDocument();
        expect(screen.queryByText('Garden Camera')).not.toBeInTheDocument();
        expect(screen.getAllByTestId('camera-tile')).toHaveLength(1);

        await waitFor(() =>
            expect(screen.getByAltText('Front Door Camera')).toBeInTheDocument(),
        );
    });

    it('hides inactive camera cards outside edit mode', () => {
        const inactiveRender = render(CameraCard, {
            props: {
                name: 'Active Cameras',
                options: { source: 'manual', entityIds: ['camera.garden'] },
            },
        });

        expect(screen.queryByTestId('camera-card')).not.toBeInTheDocument();
        inactiveRender.unmount();

        dashboardEditorStore.isEditing = true;
        render(CameraCard, {
            props: {
                name: 'Active Cameras',
                options: { source: 'manual', entityIds: ['camera.garden'] },
            },
        });

        expect(screen.getByTestId('camera-card')).toBeInTheDocument();
        expect(screen.getAllByText('No active cameras').length).toBeGreaterThan(0);
    });

    it('renders energy, weather, and calendar data', () => {
        render(EnergyFlowCard, {
            props: {
                name: 'Energy',
                options: {
                    source: 'manual',
                    solarPowerEntityId: 'sensor.solar_power',
                    homePowerEntityId: 'sensor.home_power',
                },
            },
        });
        expect(screen.getByText(/1[,.]8 kW/)).toBeInTheDocument();
        expect(screen.getByText('900 W')).toBeInTheDocument();

        render(WeatherOverviewCard, {
            props: {
                name: 'Outside',
                options: { source: 'manual', weatherEntityId: 'weather.home', humidityEntityId: 'sensor.home_humidity' },
            },
        });
        expect(screen.getByText('Outside')).toBeInTheDocument();
        expect(screen.getByText('cloudy')).toBeInTheDocument();
        expect(screen.getAllByText('77%').length).toBeGreaterThan(0);
        expect(screen.getAllByText('14km/h').length).toBeGreaterThan(0);

        render(CalendarAgendaCard, {
            props: {
                name: 'Agenda',
                options: { source: 'manual', entityIds: ['calendar.family'] },
            },
        });
        expect(screen.getByText('Football training')).toBeInTheDocument();
    });

    it('renders energy balance and device modes', () => {
        render(EnergyFlowCard, {
            props: {
                name: 'Energy Balance',
                options: {
                    source: 'manual',
                    mode: 'balance',
                    solarPowerEntityId: 'sensor.solar_power',
                    homePowerEntityId: 'sensor.home_power',
                },
            },
        });
        expect(screen.getByText('Grid Balance')).toBeInTheDocument();
        expect(screen.getByText('Solar Self-use')).toBeInTheDocument();

        render(EnergyFlowCard, {
            props: {
                name: 'Energy Devices',
                options: {
                    source: 'manual',
                    mode: 'devices',
                    deviceEntityIds: ['sensor.dishwasher_energy'],
                },
            },
        });
        expect(screen.getByText('Top Consumers')).toBeInTheDocument();
        expect(screen.getByText('Dishwasher Energy')).toBeInTheDocument();
    });

    it('uses daily recorder statistics for aggregate energy source ranges', async () => {
        const statisticsSpy = vi.spyOn(haStore, 'getStatistics').mockResolvedValue({
            ok: true,
            value: [
                {
                    entityId: 'sensor.solar_power',
                    points: [
                        {
                            timestamp: new Date('2026-05-14T00:00:00Z'),
                            state: '1200',
                            value: 1200,
                        },
                    ],
                },
            ],
        });
        vi.spyOn(haStore, 'getHistory').mockResolvedValue({ ok: true, value: [] });
        haStore.connected = true;
        haStore.auth = { accessToken: 'token' } as any;

        render(EnergyFlowCard, {
            props: {
                name: 'Sources',
                options: {
                    source: 'manual',
                    mode: 'sources',
                    historyRange: '7d',
                    solarPowerEntityId: 'sensor.solar_power',
                },
            },
        });

        await vi.waitFor(() =>
            expect(statisticsSpy).toHaveBeenCalledWith(
                expect.arrayContaining(['sensor.solar_power']),
                expect.any(Date),
                expect.any(Date),
                'day',
            ),
        );
    });

    it('auto-discovers calendar, remote, and device entities from HA state', () => {
        render(CalendarAgendaCard, {
            props: {
                name: 'Auto Agenda',
                options: { source: 'auto' },
            },
        });
        expect(screen.getByText('Football training')).toBeInTheDocument();

        render(RemotePanelCard, {
            props: {
                name: '',
                options: { preset: 'android_tv' },
            },
        });
        expect(screen.getByText('TV')).toBeInTheDocument();
        expect(screen.getByText(/Controls TV - on/)).toBeInTheDocument();
        expect(screen.getByText(/via Android TV Remote/)).toBeInTheDocument();

        render(DevicePanelCard, {
            props: {
                name: '',
                options: { preset: 'cover' },
            },
        });
        expect(screen.getByText('Blinds')).toBeInTheDocument();
        expect(screen.getByText('cover - open')).toBeInTheDocument();
    });

    it('maps remote and device panel actions to HA services', async () => {
        const callService = vi.spyOn(haStore, 'callService').mockResolvedValue({ ok: true, value: undefined });

        render(RemotePanelCard, {
            props: {
                name: 'TV Remote',
                entityId: 'media_player.tv',
                options: {
                    actions: [{ id: 'volume', icon: 'volume_up', label: 'Volume', domain: 'media_player', service: 'volume_up' }],
                },
            },
        });
        await fireEvent.click(screen.getByTitle(/Volume - media_player.tv/));
        expect(callService).toHaveBeenCalledWith('media_player', 'volume_up', {
            entity_id: 'media_player.tv',
        });

        render(DevicePanelCard, {
            props: {
                name: 'Blinds',
                entityId: 'cover.blinds',
                options: { preset: 'cover', entityId: 'cover.blinds' },
            },
        });
        await fireEvent.click(screen.getByTitle('Close'));
        expect(callService).toHaveBeenCalledWith('cover', 'close_cover', {
            entity_id: 'cover.blinds',
        });
    });
});
