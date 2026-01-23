import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import GraphCard from './GraphCard.svelte';
import { haStore } from '$lib/stores/ha.svelte';

// Mock haStore
vi.mock('$lib/stores/ha.svelte', () => ({
    haStore: {
        getEntity: vi.fn(),
        connected: true,
        auth: { accessToken: 'fake-token' },
        url: 'http://localhost:8123',
        callService: vi.fn(),
    }
}));

describe('GraphCard', () => {
    it('renders the graph card with entity name', () => {
        const mockEntity = {
            state: '22.5',
            attributes: {
                friendly_name: 'Living Room Temp',
                unit_of_measurement: '°C'
            }
        };
        (haStore.getEntity as any).mockReturnValue(mockEntity);

        render(GraphCard, {
            props: {
                entityId: 'sensor.living_room_temp',
                type: 'graph',
                name: ''
            }
        });

        expect(screen.getByText('Living Room Temp')).toBeDefined();
        expect(screen.getByText('22.5')).toBeDefined();
        expect(screen.getByText('°C')).toBeDefined();
    });

    it('renders with custom name', () => {
        const mockEntity = {
            state: '22.5',
            attributes: {
                friendly_name: 'Living Room Temp',
            }
        };
        (haStore.getEntity as any).mockReturnValue(mockEntity);

        render(GraphCard, {
            props: {
                entityId: 'sensor.living_room_temp',
                type: 'graph',
                name: 'My Custom Graph'
            }
        });

        expect(screen.getByText('My Custom Graph')).toBeDefined();
    });
});
