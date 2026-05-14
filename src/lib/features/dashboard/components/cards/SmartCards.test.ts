import { render, screen, fireEvent } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarAgendaCard from './CalendarAgendaCard.svelte';
import DevicePanelCard from './DevicePanelCard.svelte';
import EnergyFlowCard from './EnergyFlowCard.svelte';
import EntityCollectionCard from './EntityCollectionCard.svelte';
import RemotePanelCard from './RemotePanelCard.svelte';
import RoomSummaryCard from './RoomSummaryCard.svelte';
import WeatherOverviewCard from './WeatherOverviewCard.svelte';
import { haRegistryStore, haStore } from '$lib';

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
            'weather.home': state('weather.home', 'cloudy', {
                friendly_name: 'Home Weather',
                temperature: 16,
                temperature_unit: 'C',
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
        } as any;
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
        expect(screen.getByText('1800W')).toBeInTheDocument();
        expect(screen.getByText('900W')).toBeInTheDocument();

        render(WeatherOverviewCard, {
            props: {
                name: 'Outside',
                options: { source: 'manual', weatherEntityId: 'weather.home' },
            },
        });
        expect(screen.getByText('Outside')).toBeInTheDocument();
        expect(screen.getByText('cloudy')).toBeInTheDocument();

        render(CalendarAgendaCard, {
            props: {
                name: 'Agenda',
                options: { source: 'manual', entityIds: ['calendar.family'] },
            },
        });
        expect(screen.getByText('Football training')).toBeInTheDocument();
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
        expect(screen.getByText('on')).toBeInTheDocument();

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
        await fireEvent.click(screen.getByTitle('Volume'));
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
