import { render, screen, fireEvent } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CardConfigSheet from './CardConfigSheet.svelte';
import { cardEditorStore } from '$lib/features/dashboard/stores/cardEditor.svelte';

vi.mock('$lib/stores/ha.svelte', () => ({
    haStore: {
        getEntity: vi.fn().mockReturnValue({
            state: '12.4',
            attributes: {
                friendly_name: 'Energy Today',
                unit_of_measurement: 'kWh',
            },
        }),
        connected: false,
        auth: null,
        callService: vi.fn(),
        getHistory: vi.fn(),
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
});
