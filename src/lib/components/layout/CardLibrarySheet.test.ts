import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CardLibrarySheet from './CardLibrarySheet.svelte';
import { cardEditorStore } from '$lib/features/dashboard/stores/cardEditor.svelte';
import { themeStore } from '$lib/stores/theme.svelte';
import type { CardConfig } from '$lib/types';

const smartCardCases = [
    {
        name: 'Room',
        type: 'room',
        options: { room: { source: 'auto' } },
    },
    {
        name: 'Collection',
        type: 'collection',
        options: { collection: { mode: 'auto', showState: true } },
    },
    {
        name: 'Energy',
        type: 'energy',
        options: { energy: { source: 'auto' } },
    },
    {
        name: 'Calendar',
        type: 'calendar',
        options: { calendar: { source: 'auto', daysToShow: 7, maxEvents: 4 } },
    },
    {
        name: 'Weather',
        type: 'weather',
        options: { weather: { source: 'auto' } },
    },
    {
        name: 'Presence',
        type: 'presence',
        options: { presence: { source: 'auto', maxPeople: 4, showGuestMode: true, showEta: true } },
    },
    {
        name: 'Camera',
        type: 'camera',
        options: { camera: { source: 'auto', refreshSeconds: 10 } },
    },
    {
        name: 'Security',
        type: 'security',
        options: { security: { source: 'auto', showAlarmControls: true, maxItems: 5 } },
    },
    {
        name: 'Locks',
        type: 'lock',
        options: { lock: { source: 'auto', showLockAll: true, showUnlockControls: false, maxItems: 6 } },
    },
    {
        name: 'Covers',
        type: 'cover',
        options: { cover: { source: 'auto', showGroupControls: true, showPosition: true, maxItems: 5 } },
    },
    {
        name: 'Air',
        type: 'air',
        options: { air: { source: 'auto', showPowerControls: true, showSpeed: true, showHumidity: true, maxItems: 5 } },
    },
    {
        name: 'Updates',
        type: 'update',
        options: { update: { source: 'auto', showCheckControl: true, showInstallControls: true, showVersions: true, showReleaseNotes: true, maxItems: 5 } },
    },
    {
        name: 'To-do & Shopping',
        type: 'todo',
        options: { todo: { source: 'auto', showAddControl: true, showCompleted: false, showDueDates: true, maxItems: 6 } },
    },
    {
        name: 'Vacuums',
        type: 'vacuum',
        options: { vacuum: { source: 'auto', showGroupControls: true, showBattery: true, showFanSpeed: true, showCleaningStats: true, showMap: true, maxItems: 4 } },
    },
    {
        name: 'Remote',
        type: 'remote',
        options: { remote: { preset: 'tv' } },
    },
    {
        name: 'Device Panel',
        type: 'device_panel',
        options: { device_panel: { preset: 'auto' } },
    },
] as const;

describe('CardLibrarySheet', () => {
    beforeEach(() => {
        cardEditorStore.close();
        themeStore.language = 'en';
    });

    it('groups cards with source-pattern labels', async () => {
        render(CardLibrarySheet);
        cardEditorStore.openLibrary();
        await tick();

        expect(screen.getByText('Core Controls')).toBeInTheDocument();
        expect(screen.getByText('Smart Summaries')).toBeInTheDocument();
        expect(screen.getByText('Specialist Controls')).toBeInTheDocument();
        expect(screen.getByText('Inspired by Auto Entities')).toBeInTheDocument();
    });

    it.each(smartCardCases.map((card) => [card.name, card] as const))(
        'opens %s with the expected default options',
        async (_label, { name, type, options }) => {
            const onSave = vi.fn();
            cardEditorStore.config = {
                entityId: '',
                name: '',
                onSave,
            };

            render(CardLibrarySheet);
            cardEditorStore.openLibrary();
            await tick();

            await fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));

            expect(cardEditorStore.mode).toBe('config');
            expect(cardEditorStore.config.type).toBe(type);
            expect(cardEditorStore.config.options).toEqual(options);

            cardEditorStore.save(cardEditorStore.config as CardConfig);
            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type }));
        },
    );

    it('opens the utility trend graph with normalized defaults', async () => {
        render(CardLibrarySheet);
        cardEditorStore.openLibrary();
        await tick();

        await fireEvent.click(screen.getByRole('button', { name: /Utility Trends Graph/ }));

        expect(cardEditorStore.mode).toBe('config');
        expect(cardEditorStore.config).toEqual(
            expect.objectContaining({
                type: 'graph',
                name: 'Utility Trends',
                chartType: 'line',
                dataSource: 'statistics',
                statisticsPeriod: 'day',
                comparisonMode: 'previous_period',
                scaleMode: 'normalized',
            }),
        );
    });
});
