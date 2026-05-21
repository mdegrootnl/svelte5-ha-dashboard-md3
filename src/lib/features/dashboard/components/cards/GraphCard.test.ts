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
        getStatistics: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    }
}));

describe('GraphCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (haStore.getHistory as any).mockResolvedValue({ ok: true, value: [] });
        (haStore.getStatistics as any).mockResolvedValue({ ok: true, value: [] });
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

    it('renders analytics overlays and threshold callouts', async () => {
        const mockEntity = {
            state: '28',
            attributes: {
                friendly_name: 'Living Room Temp',
                unit_of_measurement: 'Â°C'
            }
        };
        (haStore.getEntity as any).mockReturnValue(mockEntity);

        render(GraphCard, {
            props: {
                entityId: 'sensor.living_room_temp',
                type: 'graph',
                name: 'Temperature',
                fetchHistory: false,
                layoutRows: 2,
                color_thresholds: [{ value: 20, label: 'Warm', color: 'red' }],
                rangeBands: [{ min: 18, max: 24, label: 'Comfort', color: 'green' }],
            }
        });

        await waitFor(() => {
            expect(screen.getByTestId('graph-analytics-callout')).toBeInTheDocument();
            expect(document.querySelector('[data-testid="chart-threshold-line"]')).toBeInTheDocument();
            expect(document.querySelector('[data-testid="chart-range-band"]')).toBeInTheDocument();
        });
    });

    it('renders normalized multi-series trends with a compact legend', async () => {
        (haStore.getEntity as any).mockImplementation((entityId: string) => ({
            state: entityId.includes('water') ? '126' : entityId.includes('gas') ? '1.2' : '8.4',
            attributes: {
                friendly_name: entityId.includes('water')
                    ? 'Water'
                    : entityId.includes('gas')
                      ? 'Gas'
                      : 'Energy',
                unit_of_measurement: entityId.includes('water')
                    ? 'L'
                    : entityId.includes('gas')
                      ? 'm3'
                      : 'kWh',
            },
        }));

        render(GraphCard, {
            props: {
                entityId: 'sensor.energy_today',
                type: 'graph',
                name: 'Utility Trends',
                chartType: 'line',
                scaleMode: 'normalized',
                fetchHistory: false,
                layoutRows: 3,
                color_thresholds: [{ value: 10, color: 'red' }],
                rangeBands: [{ min: 1, max: 2, color: 'green' }],
                graphEntities: [
                    {
                        entity_id: 'sensor.gas_today',
                        name: 'Gas',
                        color: 'var(--color-m3-graph-2)',
                    },
                    {
                        entity_id: 'sensor.water_today',
                        name: 'Water',
                        color: 'var(--color-m3-graph-3)',
                    },
                ],
            }
        });

        await waitFor(() => {
            expect(screen.getByTestId('graph-series-legend')).toBeInTheDocument();
            expect(screen.getByText('Gas')).toBeInTheDocument();
            expect(screen.getByText('Water')).toBeInTheDocument();
            expect(document.querySelector('[data-testid="chart-threshold-line"]')).not.toBeInTheDocument();
            expect(document.querySelector('[data-testid="chart-range-band"]')).not.toBeInTheDocument();
        });
    });

    it('tries recorder statistics for long ranges and falls back to history', async () => {
        const mockEntity = {
            state: '1200',
            attributes: {
                friendly_name: 'Solar Power',
                unit_of_measurement: 'W'
            }
        };
        (haStore.getEntity as any).mockReturnValue(mockEntity);
        (haStore.getHistory as any).mockResolvedValue({
            ok: true,
            value: [
                {
                    entityId: 'sensor.solar_power',
                    points: [
                        { timestamp: new Date('2026-05-21T08:00:00Z'), state: '900', value: 900 },
                        { timestamp: new Date('2026-05-21T09:00:00Z'), state: '1200', value: 1200 },
                    ],
                },
            ],
        });

        render(GraphCard, {
            props: {
                entityId: 'sensor.solar_power',
                type: 'graph',
                name: 'Solar',
                hours_to_show: 72,
                layoutRows: 2,
            }
        });

        await waitFor(() => {
            expect(haStore.getStatistics).toHaveBeenCalledWith(
                ['sensor.solar_power'],
                expect.any(Date),
                expect.any(Date),
                'hour',
            );
            expect(haStore.getHistory).toHaveBeenCalledWith(
                ['sensor.solar_power'],
                expect.any(Date),
                expect.any(Date),
            );
        });
    });

    it('loads a shifted previous-period comparison series', async () => {
        const mockEntity = {
            state: '22',
            attributes: {
                friendly_name: 'Living Room Temp',
                unit_of_measurement: 'Â°C'
            }
        };
        (haStore.getEntity as any).mockReturnValue(mockEntity);
        (haStore.getHistory as any)
            .mockResolvedValueOnce({
                ok: true,
                value: [
                    {
                        entityId: 'sensor.living_room_temp',
                        points: [
                            { timestamp: new Date('2026-05-21T08:00:00Z'), state: '20', value: 20 },
                            { timestamp: new Date('2026-05-21T09:00:00Z'), state: '22', value: 22 },
                        ],
                    },
                ],
            })
            .mockResolvedValueOnce({
                ok: true,
                value: [
                    {
                        entityId: 'sensor.living_room_temp',
                        points: [
                            { timestamp: new Date('2026-05-20T08:00:00Z'), state: '18', value: 18 },
                            { timestamp: new Date('2026-05-20T09:00:00Z'), state: '19', value: 19 },
                        ],
                    },
                ],
            });

        render(GraphCard, {
            props: {
                entityId: 'sensor.living_room_temp',
                type: 'graph',
                name: 'Comparison',
                comparisonMode: 'previous_period',
                layoutRows: 3,
            }
        });

        await waitFor(() => {
            expect((haStore.getHistory as any).mock.calls.length).toBeGreaterThanOrEqual(2);
            expect(document.querySelector('path[stroke-dasharray]')).toBeInTheDocument();
            expect(screen.getByTestId('graph-metric-strip')).toBeInTheDocument();
            expect(screen.getByTestId('graph-comparison-delta')).toHaveTextContent('+14%');
        });
    });
});
