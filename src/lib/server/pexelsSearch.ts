import type { DashboardImageAttribution } from '$lib/types/dashboard';

export interface PexelsPhoto {
    id: number;
    url: string;
    photographer?: string | null;
    photographer_url?: string | null;
    avg_color?: string | null;
    alt?: string | null;
    src: {
        tiny?: string;
        medium?: string;
        large?: string;
        landscape?: string;
        portrait?: string;
        large2x?: string;
    };
}

export interface NormalizedProviderImageResult {
    id: string;
    thumbUrl: string;
    imageUrl: string;
    description: string;
    color?: string;
    attribution: DashboardImageAttribution;
}

export function mapPexelsPhoto(photo: PexelsPhoto, orientation: 'landscape' | 'portrait'): NormalizedProviderImageResult | null {
    const imageUrl = orientation === 'portrait'
        ? photo.src.portrait || photo.src.large2x || photo.src.large || photo.src.medium || ''
        : photo.src.landscape || photo.src.large2x || photo.src.large || photo.src.medium || '';

    if (!imageUrl) return null;

    return {
        id: String(photo.id),
        thumbUrl: photo.src.tiny || photo.src.medium || imageUrl,
        imageUrl,
        description: photo.alt || '',
        color: photo.avg_color || undefined,
        attribution: {
            provider: 'pexels',
            sourceName: 'Pexels',
            sourceUrl: photo.url,
            authorName: photo.photographer || 'Pexels photographer',
            authorUrl: photo.photographer_url || undefined,
            photoId: String(photo.id),
            licenseUrl: 'https://www.pexels.com/license/',
        },
    };
}

export function mapPexelsPhotos(photos: PexelsPhoto[] = [], orientation: 'landscape' | 'portrait') {
    return photos
        .map((photo) => mapPexelsPhoto(photo, orientation))
        .filter((result): result is NormalizedProviderImageResult => Boolean(result));
}
