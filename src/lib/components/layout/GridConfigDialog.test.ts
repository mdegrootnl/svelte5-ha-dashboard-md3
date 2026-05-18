import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GridConfigDialog from './GridConfigDialog.svelte';
import { dashboardEditorStore } from '$lib/features/dashboard/stores/dashboardEditor.svelte';
import { dashboardStore } from '$lib/features/dashboard/stores/dashboard.svelte';
import { haRegistryStore } from '$lib/stores/haRegistry.svelte';
import { themeStore } from '$lib/stores/theme.svelte';
import { createDefaultGridConfig, type GridConfig } from '$lib/types/dashboard';

function createTestGrid(name = 'Home Overview'): GridConfig {
    const grid = createDefaultGridConfig(name, 'home');
    grid.id = 'dashboard_home';
    return grid;
}

describe('GridConfigDialog', () => {
    beforeEach(() => {
        themeStore.language = 'en';
        dashboardStore.setViewportProfile('desktopEdit');
        haRegistryStore.areas = [];
        vi.spyOn(dashboardEditorStore, 'updateGridConfig').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('applies generated preview backgrounds from grid settings', async () => {
        render(GridConfigDialog, {
            props: {
                open: true,
                config: createTestGrid(),
            },
        });

        await fireEvent.click(screen.getByRole('checkbox'));
        await fireEvent.click(await screen.findByRole('button', { name: 'Generated' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() => {
            expect(dashboardEditorStore.updateGridConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    background: expect.objectContaining({
                        enabled: true,
                        source: 'generated_preview',
                        imageUrl: '/api/room-previews/home?audience=neutral',
                    }),
                }),
            );
        });
    });

    it('applies Home Assistant area picture backgrounds when an area picture exists', async () => {
        const grid = createDefaultGridConfig('Keuken', 'kitchen');
        grid.generatedBy = {
            recipe: 'room',
            sourceType: 'area',
            sourceId: 'keuken',
            generatedAt: '2026-05-17T00:00:00.000Z',
            reason: 'test',
            version: 1,
        };
        haRegistryStore.areas = [
            {
                area_id: 'keuken',
                name: 'Keuken',
                icon: 'mdi:silverware-fork-knife',
                floor_id: 'begane_grond',
                picture: '/api/ha-proxy?path=%2Flocal%2Fkitchen.jpg',
            },
        ];

        render(GridConfigDialog, {
            props: {
                open: true,
                config: grid,
            },
        });

        await fireEvent.click(screen.getByRole('checkbox'));
        await fireEvent.click(await screen.findByRole('button', { name: 'HA Area' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() => {
            expect(dashboardEditorStore.updateGridConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    background: expect.objectContaining({
                        enabled: true,
                        source: 'ha_area_picture',
                        imageUrl: '/api/ha-proxy?path=%2Flocal%2Fkitchen.jpg',
                    }),
                }),
            );
        });
    });
});
