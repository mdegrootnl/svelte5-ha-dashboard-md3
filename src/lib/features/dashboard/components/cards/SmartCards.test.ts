import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AirControlCard from './AirControlCard.svelte';
import CalendarAgendaCard from './CalendarAgendaCard.svelte';
import CameraCard from './CameraCard.svelte';
import CoverControlCard from './CoverControlCard.svelte';
import DevicePanelCard from './DevicePanelCard.svelte';
import EnergyFlowCard from './EnergyFlowCard.svelte';
import EntityCollectionCard from './EntityCollectionCard.svelte';
import EntityDetailSheet from '../EntityDetailSheet.svelte';
import LockStatusCard from './LockStatusCard.svelte';
import NavigationCard from './NavigationCard.svelte';
import PresenceSummaryCard from './PresenceSummaryCard.svelte';
import RemotePanelCard from './RemotePanelCard.svelte';
import RoomSummaryCard from './RoomSummaryCard.svelte';
import SecurityStatusCard from './SecurityStatusCard.svelte';
import TodoListCard from './TodoListCard.svelte';
import UpdateStatusCard from './UpdateStatusCard.svelte';
import VacuumControlCard from './VacuumControlCard.svelte';
import WeatherOverviewCard from './WeatherOverviewCard.svelte';
import { dashboardEditorStore, entityDetailStore, haRegistryStore, haStore, themeStore } from '$lib';
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
                current_position: 80,
            }),
            'alarm_control_panel.home': state('alarm_control_panel.home', 'disarmed', {
                friendly_name: 'Home Alarm',
            }),
            'lock.front_door': state('lock.front_door', 'unlocked', {
                friendly_name: 'Front Door Lock',
            }),
            'binary_sensor.kitchen_window': state('binary_sensor.kitchen_window', 'on', {
                friendly_name: 'Kitchen Window',
                device_class: 'window',
            }),
            'binary_sensor.hall_motion': state('binary_sensor.hall_motion', 'on', {
                friendly_name: 'Hall Motion',
                device_class: 'motion',
            }),
            'binary_sensor.smoke': state('binary_sensor.smoke', 'off', {
                friendly_name: 'Smoke Detector',
                device_class: 'smoke',
            }),
            'camera.front_door': state('camera.front_door', 'recording', {
                friendly_name: 'Front Door Camera',
                entity_picture: '/api/camera_proxy/camera.front_door',
            }),
            'camera.garden': state('camera.garden', 'idle', {
                friendly_name: 'Garden Camera',
            }),
            'person.mila': state('person.mila', 'home', {
                friendly_name: 'Mila',
            }),
            'person.sam': state('person.sam', 'work', {
                friendly_name: 'Sam',
            }),
            'zone.work': state('zone.work', '1', {
                friendly_name: 'Office',
            }),
            'input_boolean.guest_mode': state('input_boolean.guest_mode', 'on', {
                friendly_name: 'Guest Mode',
            }),
            'sensor.sam_commute': state('sensor.sam_commute', '24', {
                friendly_name: 'Sam Commute',
                unit_of_measurement: 'min',
            }),
        } as any;
        haStore.entityCount = Object.keys(haStore.states).length;
        haStore.connected = false;
        haStore.auth = null;
        haStore.statesVersion += 1;
        haRegistryStore.version += 1;
        dashboardEditorStore.isEditing = false;
        entityDetailStore.reset();
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
        haStore.states = {
            ...haStore.states,
            'lock.front_door': state('lock.front_door', 'locked', {
                friendly_name: 'Front Door Lock',
            }),
            'binary_sensor.kitchen_window': state('binary_sensor.kitchen_window', 'off', {
                friendly_name: 'Kitchen Window',
                device_class: 'window',
            }),
            'binary_sensor.hall_motion': state('binary_sensor.hall_motion', 'off', {
                friendly_name: 'Hall Motion',
                device_class: 'motion',
            }),
        } as any;
        haStore.statesVersion += 1;

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

    it('opens the shared detail sheet from collection cards', async () => {
        render(EntityDetailSheet);
        render(EntityCollectionCard, {
            props: {
                name: 'Needs Attention',
                options: { mode: 'low_battery', threshold: 25 },
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: /Remote Battery/ }));

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText('Needs Attention')).toBeInTheDocument();
        expect(within(dialog).getByText('sensor.battery')).toBeInTheDocument();
        expect(within(dialog).getByText('12%')).toBeInTheDocument();
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

    it('renders household presence as a smart card', () => {
        render(PresenceSummaryCard, {
            props: {
                name: 'Presence',
                options: { source: 'auto', maxPeople: 4, showGuestMode: true, showEta: true },
            },
        });

        expect(screen.getByTestId('presence-card')).toBeInTheDocument();
        expect(screen.getByText('Presence')).toBeInTheDocument();
        expect(screen.getByText('Mila')).toBeInTheDocument();
        expect(screen.getByText('Sam')).toBeInTheDocument();
        expect(screen.getByText('Office')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders a dedicated security card with alarm actions and detail access', async () => {
        const callService = vi.spyOn(haStore, 'callService').mockResolvedValue({ ok: true, value: undefined });

        render(SecurityStatusCard, {
            props: {
                name: 'Security',
                options: { source: 'auto', showAlarmControls: true, maxItems: 5 },
            },
        });

        expect(screen.getByTestId('security-card')).toBeInTheDocument();
        expect(screen.getByText('Needs attention')).toBeInTheDocument();
        expect(screen.getByText('Front Door Lock')).toBeInTheDocument();
        expect(screen.getByText('Kitchen Window')).toBeInTheDocument();

        await fireEvent.click(screen.getByText('Away'));
        expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_away', {
            entity_id: 'alarm_control_panel.home',
        });

        await fireEvent.click(screen.getByRole('button', { name: /Front Door Lock/ }));
        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('lock.front_door');
        expect(entityDetailStore.entityIds).toEqual(expect.arrayContaining([
            'alarm_control_panel.home',
            'lock.front_door',
            'binary_sensor.kitchen_window',
            'binary_sensor.hall_motion',
            'binary_sensor.smoke',
        ]));
    });

    it('renders a dedicated lock card with lock-all and detail access', async () => {
        const callService = vi.spyOn(haStore, 'callService').mockResolvedValue({ ok: true, value: undefined });

        render(LockStatusCard, {
            props: {
                name: 'Locks',
                options: { source: 'auto', showLockAll: true, showUnlockControls: false, maxItems: 4 },
            },
        });

        expect(screen.getByTestId('lock-card')).toBeInTheDocument();
        expect(screen.getByText('Locks')).toBeInTheDocument();
        expect(screen.getByText('1 unlocked')).toBeInTheDocument();
        expect(screen.getByText('Front Door Lock')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: /Lock 1/ }));
        expect(callService).toHaveBeenCalledWith('lock', 'lock', {
            entity_id: 'lock.front_door',
        });

        await fireEvent.click(screen.getByRole('button', { name: /Front Door Lock/ }));
        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('lock.front_door');
        expect(entityDetailStore.entityIds).toEqual(['lock.front_door']);
    });

    it('renders a dedicated cover card with group controls and detail access', async () => {
        const callService = vi.spyOn(haStore, 'callService').mockResolvedValue({ ok: true, value: undefined });

        render(CoverControlCard, {
            props: {
                name: 'Covers',
                options: { source: 'auto', showGroupControls: true, showPosition: true, maxItems: 4 },
            },
        });

        expect(screen.getByTestId('cover-card')).toBeInTheDocument();
        expect(screen.getByText('Covers')).toBeInTheDocument();
        expect(screen.getByText('1 open')).toBeInTheDocument();
        expect(screen.getByText('Blinds')).toBeInTheDocument();
        expect(screen.getByText('Open - 80%')).toBeInTheDocument();

        await fireEvent.click(screen.getAllByRole('button', { name: /Close/ })[0]);
        expect(callService).toHaveBeenCalledWith('cover', 'close_cover', {
            entity_id: 'cover.blinds',
        });

        await fireEvent.click(screen.getByRole('button', { name: /Blinds/ }));
        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('cover.blinds');
        expect(entityDetailStore.entityIds).toEqual(['cover.blinds']);
    });

    it('renders a dedicated air card with boost controls and detail access', async () => {
        haStore.states = {
            ...haStore.states,
            'fan.ceiling_fan': state('fan.ceiling_fan', 'on', {
                friendly_name: 'Ceiling Fan',
                percentage: 66,
                preset_mode: 'auto',
            }),
            'humidifier.bedroom': state('humidifier.bedroom', 'off', {
                friendly_name: 'Bedroom Humidifier',
                current_humidity: 42,
                humidity: 48,
            }),
        } as any;
        haStore.entityCount = Object.keys(haStore.states).length;
        haStore.statesVersion += 1;
        const callService = vi.spyOn(haStore, 'callService').mockResolvedValue({ ok: true, value: undefined });

        render(AirControlCard, {
            props: {
                name: 'Air',
                options: { source: 'auto', showPowerControls: true, showSpeed: true, showHumidity: true, maxItems: 4 },
            },
        });

        expect(screen.getByTestId('air-card')).toBeInTheDocument();
        expect(screen.getByText('Air')).toBeInTheDocument();
        expect(screen.getByText('1 active')).toBeInTheDocument();
        expect(screen.getByText('Ceiling Fan')).toBeInTheDocument();
        expect(screen.getByText('Bedroom Humidifier')).toBeInTheDocument();
        expect(screen.getByText('On - 66% - auto')).toBeInTheDocument();
        expect(screen.getByText('Off - 42% / 48%')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: /Boost/ }));
        expect(callService).toHaveBeenCalledWith('fan', 'set_percentage', {
            entity_id: 'fan.ceiling_fan',
            percentage: 100,
        });

        await fireEvent.click(screen.getByRole('button', { name: /Ceiling Fan/ }));
        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('fan.ceiling_fan');
        expect(entityDetailStore.entityIds).toEqual(['humidifier.bedroom', 'fan.ceiling_fan']);
    });

    it('renders a dedicated vacuum card with dock controls and detail access', async () => {
        haStore.states = {
            ...haStore.states,
            'vacuum.downstairs': state('vacuum.downstairs', 'cleaning', {
                friendly_name: 'Downstairs Vacuum',
                battery_level: 78,
                fan_speed: 'Turbo',
            }),
            'vacuum.upstairs': state('vacuum.upstairs', 'docked', {
                friendly_name: 'Upstairs Vacuum',
                battery_level: 100,
            }),
        } as any;
        haStore.entityCount = Object.keys(haStore.states).length;
        haStore.statesVersion += 1;
        const callService = vi.spyOn(haStore, 'callService').mockResolvedValue({ ok: true, value: undefined });

        render(VacuumControlCard, {
            props: {
                name: 'Vacuums',
                options: { source: 'auto', showGroupControls: true, showBattery: true, showFanSpeed: true, maxItems: 4 },
            },
        });

        expect(screen.getByTestId('vacuum-card')).toBeInTheDocument();
        expect(screen.getByText('Vacuums')).toBeInTheDocument();
        expect(screen.getByText('1 active')).toBeInTheDocument();
        expect(screen.getByText('Downstairs Vacuum')).toBeInTheDocument();
        expect(screen.getByText('Upstairs Vacuum')).toBeInTheDocument();
        expect(screen.getByText('Cleaning - 78% - Turbo')).toBeInTheDocument();
        expect(screen.getByText('Docked - 100%')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'Dock' }));
        expect(callService).toHaveBeenCalledWith('vacuum', 'return_to_base', {
            entity_id: 'vacuum.downstairs',
        });

        await fireEvent.click(screen.getByRole('button', { name: /Downstairs Vacuum/ }));
        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('vacuum.downstairs');
        expect(entityDetailStore.entityIds).toEqual(['vacuum.downstairs', 'vacuum.upstairs']);
    });

    it('renders a dedicated update card with check and install controls', async () => {
        haStore.states = {
            ...haStore.states,
            'update.core': state('update.core', 'on', {
                friendly_name: 'Home Assistant Core',
                installed_version: '2026.4.1',
                latest_version: '2026.5.0',
                release_summary: 'New dashboard fixes',
            }),
            'update.router': state('update.router', 'off', {
                friendly_name: 'Router Firmware',
                installed_version: '1.0.0',
                latest_version: '1.0.0',
            }),
            'binary_sensor.addon_update': state('binary_sensor.addon_update', 'on', {
                friendly_name: 'Add-on Update',
                device_class: 'update',
            }),
        } as any;
        haStore.entityCount = Object.keys(haStore.states).length;
        haStore.statesVersion += 1;
        const callService = vi.spyOn(haStore, 'callService').mockResolvedValue({ ok: true, value: undefined });

        render(UpdateStatusCard, {
            props: {
                name: 'Updates',
                options: { source: 'auto', showCheckControl: true, showInstallControls: true, showVersions: true, showReleaseNotes: true, maxItems: 5 },
            },
        });

        expect(screen.getByTestId('update-card')).toBeInTheDocument();
        expect(screen.getByText('Updates')).toBeInTheDocument();
        expect(screen.getByText('2 available')).toBeInTheDocument();
        expect(screen.getByText('Home Assistant Core')).toBeInTheDocument();
        expect(screen.getByText('Add-on Update')).toBeInTheDocument();
        expect(screen.getByText('Update available - 2026.4.1 -> 2026.5.0 - New dashboard fixes')).toBeInTheDocument();

        await fireEvent.click(screen.getByRole('button', { name: 'Check updates' }));
        expect(callService).toHaveBeenCalledWith('homeassistant', 'update_entity', {
            entity_id: ['binary_sensor.addon_update', 'update.core', 'update.router'],
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Install' }));
        expect(callService).toHaveBeenCalledWith('update', 'install', {
            entity_id: 'update.core',
        });

        await fireEvent.click(screen.getByRole('button', { name: /Home Assistant Core/ }));
        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('update.core');
        expect(entityDetailStore.entityIds).toEqual(['binary_sensor.addon_update', 'update.core', 'update.router']);
    });

    it('renders a dedicated todo card with fetched items and list actions', async () => {
        haStore.states = {
            ...haStore.states,
            'todo.shopping_list': state('todo.shopping_list', '2', {
                friendly_name: 'Shopping List',
            }),
            'todo.house_tasks': state('todo.house_tasks', '1', {
                friendly_name: 'House Tasks',
            }),
        } as any;
        haStore.entityCount = Object.keys(haStore.states).length;
        haStore.statesVersion += 1;
        const callService = vi.spyOn(haStore, 'callService').mockImplementation(async (...args: any[]) => {
            const [, service] = args;
            if (service === 'get_items') {
                return {
                    ok: true,
                    value: {
                        response: {
                            'todo.shopping_list': {
                                items: [
                                    { uid: 'milk-1', summary: 'Buy milk', status: 'needs_action', due: '2026-05-21' },
                                    { uid: 'bread-1', summary: 'Bread', status: 'needs_action' },
                                ],
                            },
                            'todo.house_tasks': {
                                items: [
                                    { uid: 'trash-1', summary: 'Take out trash', status: 'needs_action' },
                                ],
                            },
                        },
                    },
                };
            }
            return { ok: true, value: undefined };
        });

        render(TodoListCard, {
            props: {
                name: 'To-do & Shopping',
                options: { source: 'auto', showAddControl: true, showCompleted: false, showDueDates: true, maxItems: 6 },
            },
        });

        expect(screen.getByTestId('todo-card')).toBeInTheDocument();
        expect(screen.getByText('To-do & Shopping')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('Buy milk')).toBeInTheDocument());
        expect(screen.getByText('Bread')).toBeInTheDocument();
        expect(screen.getByText('Take out trash')).toBeInTheDocument();

        await fireEvent.click(screen.getAllByRole('button', { name: 'Done' })[0]);
        expect(callService).toHaveBeenCalledWith('todo', 'update_item', {
            item: 'milk-1',
            status: 'completed',
        }, { entity_id: 'todo.shopping_list' });

        await fireEvent.input(screen.getByLabelText('New task'), { target: { value: 'Coffee beans' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        expect(callService).toHaveBeenCalledWith('todo', 'add_item', {
            item: 'Coffee beans',
        }, { entity_id: 'todo.shopping_list' });

        await fireEvent.click(screen.getByRole('button', { name: /Bread/ }));
        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('todo.shopping_list');
        expect(entityDetailStore.entityIds).toEqual(['todo.shopping_list', 'todo.house_tasks']);
    });

    it('does not refetch todo items for unrelated Home Assistant state updates', async () => {
        haStore.states = {
            ...haStore.states,
            'todo.shopping_list': state('todo.shopping_list', '2', {
                friendly_name: 'Shopping List',
            }),
        } as any;
        haStore.entityCount = Object.keys(haStore.states).length;
        haStore.statesVersion += 1;
        const callService = vi.spyOn(haStore, 'callService').mockResolvedValue({
            ok: true,
            value: {
                response: {
                    'todo.shopping_list': {
                        items: [{ uid: 'milk-1', summary: 'Buy milk', status: 'needs_action' }],
                    },
                },
            },
        });

        render(TodoListCard, {
            props: {
                name: 'To-do & Shopping',
                options: { source: 'auto', showAddControl: false, showCompleted: false, showDueDates: true, maxItems: 6 },
            },
        });

        const getItemCalls = () => callService.mock.calls.filter(([domain, service]) => domain === 'todo' && service === 'get_items');

        await waitFor(() => expect(screen.getByText('Buy milk')).toBeInTheDocument());
        expect(getItemCalls()).toHaveLength(1);

        haStore.states = {
            ...haStore.states,
            'light.table': state('light.table', 'off', { friendly_name: 'Table Lamp' }),
        } as any;
        haStore.statesVersion += 1;
        await tick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(getItemCalls()).toHaveLength(1);

        haStore.states = {
            ...haStore.states,
            'todo.shopping_list': {
                ...state('todo.shopping_list', '3', { friendly_name: 'Shopping List' }),
                last_changed: '2026-05-14T10:01:00Z',
            },
        } as any;
        haStore.statesVersion += 1;
        await tick();

        await waitFor(() => expect(getItemCalls()).toHaveLength(2));
    });

    it('hides room and navigation direct actions while editing the grid', () => {
        dashboardEditorStore.isEditing = true;

        render(NavigationCard, {
            props: {
                name: 'Kitchen',
                path: '/dashboard/kitchen',
                icon: 'kitchen',
                shortcuts: [{ id: 'table', entityId: 'light.table', icon: 'lightbulb' }],
            },
        });
        expect(screen.queryByTitle('Toggle all')).not.toBeInTheDocument();
        expect(screen.queryByTitle('light.table')).not.toBeInTheDocument();

        render(RoomSummaryCard, {
            props: {
                name: 'Kitchen',
                options: {
                    source: 'manual',
                    entityIds: ['light.table'],
                    actions: [{ id: 'all-off', label: 'All off', icon: 'power_settings_new', domain: 'light', service: 'turn_off' }],
                },
            },
        });
        expect(screen.queryByTitle('All off')).not.toBeInTheDocument();
    });

    it('opens room entity details with domain controls', async () => {
        const callService = vi.spyOn(haStore, 'callService').mockResolvedValue({ ok: true, value: undefined });

        render(EntityDetailSheet);
        render(RoomSummaryCard, {
            props: {
                name: 'Living Room',
                options: { source: 'manual', entityIds: ['light.table', 'cover.blinds'] },
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: /Blinds/ }));

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText('cover.blinds')).toBeInTheDocument();

        await fireEvent.click(within(dialog).getByText('Close').closest('button')!);
        expect(callService).toHaveBeenCalledWith('cover', 'close_cover', {
            entity_id: 'cover.blinds',
        });
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

    it('opens camera details for the active camera set', async () => {
        render(CameraCard, {
            props: {
                name: 'Active Cameras',
                options: {
                    source: 'manual',
                    entityIds: ['camera.front_door', 'camera.garden'],
                },
            },
        });

        await fireEvent.click(screen.getByTitle('Open details'));

        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('camera.front_door');
        expect(entityDetailStore.entityIds).toEqual(['camera.front_door']);
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

    it('opens detail sheets from remote and device panel cards', async () => {
        const remoteRender = render(RemotePanelCard, {
            props: {
                name: 'TV Remote',
                entityId: 'media_player.tv',
                options: {
                    remoteEntityId: 'remote.android_tv',
                    mediaPlayerEntityId: 'media_player.tv',
                },
            },
        });

        await fireEvent.click(screen.getByTitle('Open details'));

        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('media_player.tv');
        expect(entityDetailStore.entityIds).toEqual([
            'media_player.tv',
            'remote.android_tv',
        ]);

        remoteRender.unmount();
        entityDetailStore.reset();

        render(DevicePanelCard, {
            props: {
                name: 'Blinds',
                entityId: 'cover.blinds',
                options: { preset: 'cover', entityId: 'cover.blinds' },
            },
        });

        await fireEvent.click(screen.getByTitle('Open details'));

        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('cover.blinds');
        expect(entityDetailStore.entityIds).toEqual(['cover.blinds']);
    });
});
