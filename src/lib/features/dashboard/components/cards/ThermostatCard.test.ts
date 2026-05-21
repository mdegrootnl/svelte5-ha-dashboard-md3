import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import ThermostatCard from './ThermostatCard.svelte';
import { dashboardEditorStore } from '$lib/features/dashboard/stores/dashboardEditor.svelte';
import { haStore } from '$lib/stores/ha.svelte';
import { entityDetailStore } from '$lib/features/dashboard/stores/entityDetail.svelte';
import { themeStore } from '$lib/stores/theme.svelte';
import type { HassEntity } from 'home-assistant-js-websocket';

// Mock the haStore
vi.mock('$lib/stores/ha.svelte', () => ({
    haStore: {
        getEntity: vi.fn(),
        callService: vi.fn(),
        getHistory: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    },
}));

vi.mock('$lib/features/dashboard/stores/cardEditor.svelte', () => ({
    cardEditorStore: {
        open: vi.fn(),
    },
}));

// Helper to create mock HassEntity
function createMockEntity(overrides: Partial<HassEntity> & { entity_id: string; state: string }): HassEntity {
    return {
        entity_id: overrides.entity_id,
        state: overrides.state,
        attributes: overrides.attributes || {},
        last_changed: overrides.last_changed || new Date().toISOString(),
        last_updated: overrides.last_updated || new Date().toISOString(),
        context: overrides.context || { id: '1', parent_id: null, user_id: null },
    };
}

describe('ThermostatCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dashboardEditorStore.isEditing = false;
        entityDetailStore.reset();
        themeStore.language = 'en';
    });

    it('renders with entity data', () => {
        vi.mocked(haStore.getEntity).mockReturnValue(createMockEntity({
            entity_id: 'climate.living_room',
            state: 'heat',
            attributes: {
                friendly_name: 'Living Room',
                current_temperature: 21.5,
                temperature: 22,
                hvac_mode: 'heat',
                hvac_action: 'heating',
                min_temp: 5,
                max_temp: 35,
                target_temp_step: 0.5,
            },
        }));

        render(ThermostatCard, { props: { entityId: 'climate.living_room', secondaryEntityId: '', name: '', secondaryName: '', domainFilter: '' } });

        expect(screen.getByText('21.5 °C')).toBeInTheDocument();
        expect(screen.getByText('Living Room')).toBeInTheDocument();
    });

    it('renders fallback when no entity data', () => {
        vi.mocked(haStore.getEntity).mockReturnValue(undefined as unknown as HassEntity);

        render(ThermostatCard, { props: { entityId: 'climate.nonexistent', secondaryEntityId: '', name: '', secondaryName: '', domainFilter: '' } });

        // Should show -- for missing temperature (appears twice: header and target)
        const dashElements = screen.getAllByText('--');
        expect(dashElements.length).toBeGreaterThan(0);
    });

    it('displays custom name when provided', () => {
        vi.mocked(haStore.getEntity).mockReturnValue(createMockEntity({
            entity_id: 'climate.living_room',
            state: 'heat',
            attributes: {
                friendly_name: 'Living Room',
                current_temperature: 21.5,
                temperature: 22,
            },
        }));

        render(ThermostatCard, {
            props: { entityId: 'climate.living_room', name: 'Binnen', secondaryEntityId: '', secondaryName: '', domainFilter: '' }
        });

        expect(screen.getByText('Binnen')).toBeInTheDocument();
    });

    it('displays secondary entity when configured', () => {
        vi.mocked(haStore.getEntity).mockImplementation((id: string) => {
            if (id === 'climate.living_room') {
                return createMockEntity({
                    entity_id: 'climate.living_room',
                    state: 'heat',
                    attributes: {
                        friendly_name: 'Living Room',
                        current_temperature: 21.5,
                        temperature: 22,
                    },
                });
            }
            if (id === 'sensor.outdoor_temp') {
                return createMockEntity({
                    entity_id: 'sensor.outdoor_temp',
                    state: '5.2',
                    attributes: { friendly_name: 'Outdoor' },
                });
            }
            return undefined as unknown as HassEntity;
        });

        render(ThermostatCard, {
            props: {
                entityId: 'climate.living_room',
                secondaryEntityId: 'sensor.outdoor_temp',
                name: '',
                secondaryName: 'Buiten',
                domainFilter: ''
            }
        });

        expect(screen.getByText('21.5 °C')).toBeInTheDocument();
        expect(screen.getByText('5.2 °C')).toBeInTheDocument();
        expect(screen.getByText('Buiten')).toBeInTheDocument();
    });

    it('has temperature control buttons', () => {
        vi.mocked(haStore.getEntity).mockReturnValue(createMockEntity({
            entity_id: 'climate.living_room',
            state: 'heat',
            attributes: {
                current_temperature: 21.5,
                temperature: 22,
            },
        }));

        render(ThermostatCard, { props: { entityId: 'climate.living_room', secondaryEntityId: '', name: '', secondaryName: '', domainFilter: '' } });

        expect(screen.getByLabelText('Decrease temperature')).toBeInTheDocument();
        expect(screen.getByLabelText('Increase temperature')).toBeInTheDocument();
    });

    it('has mode control buttons', () => {
        vi.mocked(haStore.getEntity).mockReturnValue(createMockEntity({
            entity_id: 'climate.living_room',
            state: 'heat',
            attributes: {
                current_temperature: 21.5,
                temperature: 22,
                hvac_mode: 'heat',
            },
        }));

        render(ThermostatCard, { props: { entityId: 'climate.living_room', secondaryEntityId: '', name: '', secondaryName: '', domainFilter: '' } });

        expect(screen.getByLabelText('Toggle heating mode')).toBeInTheDocument();
        expect(screen.getByLabelText('Toggle power')).toBeInTheDocument();
    });

    it('applies custom class', () => {
        vi.mocked(haStore.getEntity).mockReturnValue(createMockEntity({
            entity_id: 'climate.living_room',
            state: 'heat',
            attributes: {
                current_temperature: 21.5,
                temperature: 22,
            },
        }));

        const { container } = render(ThermostatCard, {
            props: { entityId: 'climate.living_room', class: 'custom-class', secondaryEntityId: '', name: '', secondaryName: '', domainFilter: '' }
        });

        expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('opens entity details with primary and secondary entities', async () => {
        vi.mocked(haStore.getEntity).mockImplementation((id: string) => {
            if (id === 'climate.living_room') {
                return createMockEntity({
                    entity_id: 'climate.living_room',
                    state: 'heat',
                    attributes: {
                        friendly_name: 'Living Room',
                        current_temperature: 21.5,
                        temperature: 22,
                    },
                });
            }
            if (id === 'sensor.outdoor_temp') {
                return createMockEntity({
                    entity_id: 'sensor.outdoor_temp',
                    state: '5.2',
                    attributes: { friendly_name: 'Outdoor' },
                });
            }
            return undefined as unknown as HassEntity;
        });

        render(ThermostatCard, {
            props: {
                entityId: 'climate.living_room',
                secondaryEntityId: 'sensor.outdoor_temp',
                name: '',
                secondaryName: 'Outdoor',
                domainFilter: '',
            },
        });

        await fireEvent.click(screen.getByTitle('Open details'));

        expect(entityDetailStore.open).toBe(true);
        expect(entityDetailStore.selectedEntityId).toBe('climate.living_room');
        expect(entityDetailStore.entityIds).toEqual([
            'climate.living_room',
            'sensor.outdoor_temp',
        ]);
    });
});
