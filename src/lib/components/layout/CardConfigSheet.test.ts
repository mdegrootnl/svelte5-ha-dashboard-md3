import { render, screen, fireEvent } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CardConfigSheet from './CardConfigSheet.svelte';
import { cardEditorStore } from '$lib/features/dashboard/stores/cardEditor.svelte';
import { themeStore } from '$lib/stores/theme.svelte';

vi.mock('$lib/stores/ha.svelte', () => ({
    haStore: {
        getEntity: vi.fn().mockReturnValue({
            state: '12.4',
            attributes: {
                friendly_name: 'Energy Today',
                unit_of_measurement: 'kWh',
            },
        }),
        getStatesView: vi.fn().mockReturnValue({}),
        getEntityIdsSnapshot: vi.fn().mockReturnValue([]),
        statesVersion: 0,
        overridesVersion: 0,
        connected: false,
        auth: null,
        callService: vi.fn(),
        getHistory: vi.fn(),
        getStatistics: vi.fn(),
    },
}));

vi.mock('$lib/stores/haRegistry.svelte', () => ({
    haRegistryStore: {
        areas: [],
        floors: [],
    },
}));

describe('CardConfigSheet', () => {
    beforeEach(() => {
        themeStore.language = 'en';
        vi.clearAllMocks();
        cardEditorStore.close();
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
                                    height: 160,
                                    x: 0,
                                    y: 0,
                                    top: 0,
                                    right: 320,
                                    bottom: 160,
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

    it('persists the selected graph chart type', async () => {
        const onSave = vi.fn();
        render(CardConfigSheet);

        cardEditorStore.openConfig({
            type: 'graph',
            entityId: 'sensor.energy_today',
            name: 'Energy Today',
            chartType: 'area',
            onSave,
        });

        const select = (await screen.findByLabelText('Chart Type')) as HTMLSelectElement;
        expect(select.value).toBe('area');

        await fireEvent.change(select, { target: { value: 'bar' } });
        await fireEvent.click(screen.getByText('Save'));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                chartType: 'bar',
            }),
        );
    });

    it('persists per-series graph chart type overrides', async () => {
        const onSave = vi.fn();
        render(CardConfigSheet);

        cardEditorStore.openConfig({
            type: 'graph',
            entityId: 'sensor.energy_today',
            name: 'Energy Today',
            chartType: 'bar',
            graphEntities: [
                {
                    entity_id: 'sensor.temperature',
                    name: 'Temperature',
                    chartType: 'line',
                },
            ],
            onSave,
        });

        const selects = (await screen.findAllByLabelText('Chart Type')) as HTMLSelectElement[];
        expect(selects[0].value).toBe('bar');
        expect(selects[1].value).toBe('line');

        await fireEvent.change(selects[1], { target: { value: 'step' } });
        await fireEvent.click(screen.getByText('Save'));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                graphEntities: [
                    expect.objectContaining({
                        chartType: 'step',
                    }),
                ],
            }),
        );
    });

    it('persists graph analytics options', async () => {
        const onSave = vi.fn();
        render(CardConfigSheet);

        cardEditorStore.openConfig({
            type: 'graph',
            entityId: 'sensor.energy_today',
            name: 'Energy Today',
            dataSource: 'history',
            comparisonMode: 'none',
            scaleMode: 'absolute',
            showAnalytics: false,
            color_thresholds: [{ value: 25, label: 'High' }],
            rangeBands: [{ min: 10, max: 20, label: 'Normal' }],
            onSave,
        });

        const dataSource = (await screen.findByLabelText('Data Source')) as HTMLSelectElement;
        const statisticsPeriod = screen.getByLabelText('Statistics Period') as HTMLSelectElement;
        const scaleMode = screen.getByLabelText('Scale Mode') as HTMLSelectElement;
        await fireEvent.change(dataSource, { target: { value: 'statistics' } });
        await fireEvent.change(statisticsPeriod, { target: { value: 'day' } });
        await fireEvent.change(scaleMode, { target: { value: 'normalized' } });
        await fireEvent.click(screen.getByLabelText('Compare previous period'));
        await fireEvent.click(screen.getByLabelText('Show analytics callout'));
        await fireEvent.click(screen.getByText('Save'));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                dataSource: 'statistics',
                statisticsPeriod: 'day',
                scaleMode: 'normalized',
                comparisonMode: 'previous_period',
                showAnalytics: true,
                color_thresholds: [expect.objectContaining({ value: 25 })],
                rangeBands: [expect.objectContaining({ min: 10, max: 20 })],
            }),
        );
    });

    it('persists energy card mode and pinned device sensors', async () => {
        const onSave = vi.fn();
        render(CardConfigSheet);

        cardEditorStore.openConfig({
            type: 'energy',
            entityId: '',
            name: 'Energy',
            options: {
                energy: {
                    source: 'auto',
                    mode: 'overview',
                },
            },
            onSave,
        });

        await fireEvent.click(await screen.findByText('Devices'));
        await fireEvent.click(screen.getByText('Add'));
        const picker = screen.getByLabelText('Device Energy Sensor') as HTMLInputElement;
        await fireEvent.input(picker, { target: { value: 'sensor.dishwasher_energy' } });
        await fireEvent.click(screen.getByText('Save'));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                options: expect.objectContaining({
                    energy: expect.objectContaining({
                        mode: 'devices',
                        deviceEntityIds: ['sensor.dishwasher_energy'],
                    }),
                }),
            }),
        );
    });

    it('persists energy source history range', async () => {
        const onSave = vi.fn();
        render(CardConfigSheet);

        cardEditorStore.openConfig({
            type: 'energy',
            entityId: '',
            name: 'Energy',
            options: {
                energy: {
                    source: 'auto',
                    mode: 'sources',
                },
            },
            onSave,
        });

        await fireEvent.click(await screen.findByText('30 days'));
        await fireEvent.click(screen.getByText('Save'));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                options: expect.objectContaining({
                    energy: expect.objectContaining({
                        mode: 'sources',
                        historyRange: '30d',
                    }),
                }),
            }),
        );
    });
});
