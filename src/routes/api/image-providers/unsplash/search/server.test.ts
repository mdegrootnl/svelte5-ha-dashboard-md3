import { describe, expect, it, vi } from 'vitest';

const getUnsplashAccessKey = vi.fn();

vi.mock('$lib/server/imageProviderSettings', () => ({
    ImageProviderSettingsService: {
        getUnsplashAccessKey,
    },
}));

const { GET } = await import('./+server');

describe('/api/image-providers/unsplash/search', () => {
    it('returns a friendly unavailable response when no key is configured', async () => {
        getUnsplashAccessKey.mockResolvedValueOnce('');
        const fetchMock = vi.fn();

        const response = await GET({
            url: new URL('http://localhost/api/image-providers/unsplash/search?query=kitchen'),
            fetch: fetchMock,
        } as any);

        await expect(response.json()).resolves.toEqual({
            error: 'Unsplash API key is not configured.',
        });
        expect(response.status).toBe(503);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('searches Unsplash with the Authorization header and normalized attribution', async () => {
        getUnsplashAccessKey.mockResolvedValueOnce('unsplash-secret');
        const fetchMock = vi.fn(async (_endpoint: URL, _init: RequestInit) =>
            new Response(
                JSON.stringify({
                    results: [
                        {
                            id: 'photo-kitchen',
                            description: 'Kitchen',
                            alt_description: 'Modern kitchen',
                            color: '#91a87c',
                            urls: {
                                small: 'https://images.unsplash.com/small.jpg',
                                regular: 'https://images.unsplash.com/regular.jpg',
                            },
                            links: {
                                html: 'https://unsplash.com/photos/photo-kitchen',
                                download_location: 'https://api.unsplash.com/photos/photo-kitchen/download',
                            },
                            user: {
                                name: 'Ada Lovelace',
                                links: {
                                    html: 'https://unsplash.com/@ada',
                                },
                            },
                        },
                    ],
                }),
                { status: 200, headers: { 'content-type': 'application/json' } },
            ),
        );

        const response = await GET({
            url: new URL('http://localhost/api/image-providers/unsplash/search?query=kitchen&orientation=landscape'),
            fetch: fetchMock,
        } as any);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [endpoint, init] = fetchMock.mock.calls[0];
        expect(endpoint.toString()).toContain('https://api.unsplash.com/search/photos?');
        expect(endpoint.toString()).not.toContain('unsplash-secret');
        expect(init.headers).toEqual({
            Authorization: 'Client-ID unsplash-secret',
            'Accept-Version': 'v1',
        });

        await expect(response.json()).resolves.toMatchObject({
            results: [
                {
                    id: 'photo-kitchen',
                    imageUrl: 'https://images.unsplash.com/regular.jpg',
                    color: '#91a87c',
                    attribution: {
                        provider: 'unsplash',
                        sourceName: 'Unsplash',
                        authorName: 'Ada Lovelace',
                        photoId: 'photo-kitchen',
                        downloadLocation: 'https://api.unsplash.com/photos/photo-kitchen/download',
                    },
                },
            ],
        });
    });
});
