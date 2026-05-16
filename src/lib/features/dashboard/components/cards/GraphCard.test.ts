import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, it, expect, vi } from 'vitest';
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
        getHistory: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    }
}));

describe('GraphCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal(
            'ResizeObserver',
            class ResizeObserver {
                private callback: ResizeObserverCallback;

                constructor(callback: ResizeObserverCallback) {
                    this.callback = callback;
                }

                observe(target: Element) {
                    this.callback(
                        [
                            {
                                target,
                                contentRect: {
                                    width: 320,
                                    height: 96,
                                    x: 0,
                                    y: 0,
                                    top: 0,
                                    right: 320,
                                    bottom: 96,
                                    left: 0,
                                    toJSON: () => ({}),
                                },
                            } as ResizeObserverEntry,
                        ],
                        this,
                    );
                }

                unobserve() {}
                disconnect() {}
            },
        );
    });

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

    it('renders demo chart data without requesting HA history', async () => {
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
                name: 'Demo Graph',
                fetchHistory: false,
                layoutRows: 2,
            }
        });

        await waitFor(() => {
            expect(document.querySelector('path[stroke]')).toBeInTheDocument();
            expect(document.querySelector('path[fill^="url"]')).toBeInTheDocument();
        });
        expect(haStore.getHistory).not.toHaveBeenCalled();
    });

    it('renders bar chart data when chartType is bar', async () => {
        const mockEntity = {
            state: '5.2',
            attributes: {
                friendly_name: 'Rain Total',
                unit_of_measurement: 'mm'
            }
        };
        (haStore.getEntity as any).mockReturnValue(mockEntity);

        render(GraphCard, {
            props: {
                entityId: 'sensor.rain_total',
                type: 'graph',
                name: 'Rain',
                chartType: 'bar',
                fetchHistory: false,
                layoutRows: 2,
            }
        });

        await waitFor(() => {
            expect(document.querySelector('rect')).toBeInTheDocument();
        });
        expect(document.querySelector('path[stroke]')).not.toBeInTheDocument();
    });

    it('falls back to a current-state line when HA history is empty', async () => {
        const mockEntity = {
            state: '22.5',
            attributes: {
                friendly_name: 'Living Room Temp',
                unit_of_measurement: '°C'
            }
        };
        (haStore.getEntity as any).mockReturnValue(mockEntity);
        (haStore.getHistory as any).mockResolvedValue({ ok: true, value: [] });

        render(GraphCard, {
            props: {
                entityId: 'sensor.living_room_temp',
                type: 'graph',
                name: 'Fallback Graph',
                layoutRows: 2,
            }
        });

        await waitFor(() => {
            expect(document.querySelector('path[stroke]')).toBeInTheDocument();
        });
        expect(haStore.getHistory).toHaveBeenCalledWith(
            ['sensor.living_room_temp'],
            expect.any(Date),
            expect.any(Date),
        );
    });
});
