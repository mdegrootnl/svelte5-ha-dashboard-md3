import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MiniChart from './MiniChart.svelte';

const startTime = new Date('2026-05-16T10:00:00.000Z');
const endTime = new Date('2026-05-16T13:00:00.000Z');
const series = [
    {
        color: 'var(--color-m3-primary)',
        data: [
            { timestamp: startTime, value: 2 },
            { timestamp: new Date('2026-05-16T11:00:00.000Z'), value: 6 },
            { timestamp: new Date('2026-05-16T12:00:00.000Z'), value: 4 },
            { timestamp: endTime, value: 8 },
        ],
    },
];

describe('MiniChart', () => {
    beforeEach(() => {
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
                                    height: 120,
                                    x: 0,
                                    y: 0,
                                    top: 0,
                                    right: 320,
                                    bottom: 120,
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

    it('renders an area chart with line and fill paths', async () => {
        const { container } = render(MiniChart, {
            props: { series, startTime, endTime, chartType: 'area' },
        });

        await waitFor(() => {
            expect(container.querySelector('path[stroke]')).toBeInTheDocument();
            expect(container.querySelector('path[fill^="url"]')).toBeInTheDocument();
        });
    });

    it('renders a line chart without a fill path', async () => {
        const { container } = render(MiniChart, {
            props: { series, startTime, endTime, chartType: 'line' },
        });

        await waitFor(() => {
            expect(container.querySelector('path[stroke]')).toBeInTheDocument();
            expect(container.querySelector('path[fill^="url"]')).not.toBeInTheDocument();
        });
    });

    it('renders a stepped line for step charts', async () => {
        const { container } = render(MiniChart, {
            props: { series, startTime, endTime, chartType: 'step' },
        });

        await waitFor(() => {
            const path = container.querySelector('path[stroke]');
            expect(path).toBeInTheDocument();
            expect(path?.getAttribute('d')).not.toContain('C');
        });
    });

    it('renders bars for bar charts', async () => {
        const { container } = render(MiniChart, {
            props: { series, startTime, endTime, chartType: 'bar' },
        });

        await waitFor(() => {
            expect(container.querySelectorAll('rect').length).toBe(series[0].data.length);
        });
        expect(container.querySelector('path[stroke]')).not.toBeInTheDocument();
    });

    it('can render mixed bar and line series together', async () => {
        const { container } = render(MiniChart, {
            props: {
                series: [
                    { ...series[0], chartType: 'bar' },
                    {
                        color: 'var(--color-m3-secondary)',
                        chartType: 'line',
                        data: series[0].data.map((point) => ({
                            ...point,
                            value:
                                point.value === null
                                    ? null
                                    : point.value + 2,
                        })),
                    },
                ],
                startTime,
                endTime,
                chartType: 'area',
            },
        });

        await waitFor(() => {
            expect(container.querySelector('rect')).toBeInTheDocument();
            expect(container.querySelector('path[stroke]')).toBeInTheDocument();
        });
    });
});
