import { describe, expect, it } from 'vitest';
import {
    createGeneratedPreviewBackgroundForGrid,
    createHaAreaPictureBackgroundForGrid,
    findAreaForGridBackground,
} from './dashboardBackground';
import { createDefaultGridConfig, type HAArea } from '$lib/types/dashboard';

const areas: HAArea[] = [
    {
        area_id: 'keuken',
        name: 'Keuken',
        icon: 'mdi:silverware-fork-knife',
        floor_id: 'begane_grond',
        picture: '/api/ha-proxy?path=/local/kitchen.jpg',
    },
    {
        area_id: 'woonkamer',
        name: 'Woonkamer',
        icon: 'mdi:sofa',
        floor_id: 'begane_grond',
        picture: null,
    },
];

describe('dashboard background helpers', () => {
    it('finds areas from generated grid metadata first', () => {
        const grid = createDefaultGridConfig('Kitchen');
        grid.generatedBy = {
            recipe: 'room',
            sourceType: 'area',
            sourceId: 'keuken',
            generatedAt: '2026-05-17T00:00:00.000Z',
            reason: 'test',
            version: 1,
        };

        expect(findAreaForGridBackground(grid, areas)?.area_id).toBe('keuken');
    });

    it('creates Home Assistant area picture backgrounds when the area has a picture', () => {
        const grid = createDefaultGridConfig('Keuken');
        const background = createHaAreaPictureBackgroundForGrid(grid, areas);

        expect(background).toMatchObject({
            enabled: true,
            source: 'ha_area_picture',
            imageUrl: '/api/ha-proxy?path=/local/kitchen.jpg',
            imageAttribution: {
                provider: 'ha_area_picture',
                sourceName: 'Home Assistant area picture',
            },
        });
    });

    it('does not invent HA area pictures for areas without pictures', () => {
        const grid = createDefaultGridConfig('Woonkamer');

        expect(createHaAreaPictureBackgroundForGrid(grid, areas)).toBeUndefined();
    });

    it('creates room generated previews for area dashboards', () => {
        const grid = createDefaultGridConfig('Woonkamer');
        const background = createGeneratedPreviewBackgroundForGrid(grid, areas);

        expect(background).toMatchObject({
            enabled: true,
            source: 'generated_preview',
            imageUrl: '/api/room-previews/living_room?audience=family',
        });
    });

    it('creates neutral generated previews for house dashboards', () => {
        const grid = createDefaultGridConfig('Home Overview');
        grid.id = 'dashboard_home';
        const background = createGeneratedPreviewBackgroundForGrid(grid, areas);

        expect(background.imageUrl).toBe('/api/room-previews/home?audience=neutral');
    });
});
