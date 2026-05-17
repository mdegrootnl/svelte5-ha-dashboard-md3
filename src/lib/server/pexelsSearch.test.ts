import { describe, expect, it } from 'vitest';
import { mapPexelsPhoto, mapPexelsPhotos } from './pexelsSearch';

describe('Pexels image mapping', () => {
    it('maps photos to normalized dashboard image results with attribution and avg color', () => {
        const result = mapPexelsPhoto({
            id: 123,
            url: 'https://www.pexels.com/photo/kitchen-123/',
            photographer: 'Ada Lovelace',
            photographer_url: 'https://www.pexels.com/@ada',
            avg_color: '#91a87c',
            alt: 'Modern kitchen',
            src: {
                tiny: 'https://images.pexels.com/tiny.jpg',
                medium: 'https://images.pexels.com/medium.jpg',
                landscape: 'https://images.pexels.com/landscape.jpg',
                portrait: 'https://images.pexels.com/portrait.jpg',
            },
        }, 'landscape');

        expect(result).toMatchObject({
            id: '123',
            thumbUrl: 'https://images.pexels.com/tiny.jpg',
            imageUrl: 'https://images.pexels.com/landscape.jpg',
            description: 'Modern kitchen',
            color: '#91a87c',
            attribution: {
                provider: 'pexels',
                sourceName: 'Pexels',
                sourceUrl: 'https://www.pexels.com/photo/kitchen-123/',
                authorName: 'Ada Lovelace',
                authorUrl: 'https://www.pexels.com/@ada',
                photoId: '123',
                licenseUrl: 'https://www.pexels.com/license/',
            },
        });
    });

    it('drops photos that do not have a usable source image', () => {
        const results = mapPexelsPhotos([
            {
                id: 1,
                url: 'https://www.pexels.com/photo/missing/',
                src: {},
            },
        ], 'portrait');

        expect(results).toEqual([]);
    });
});
