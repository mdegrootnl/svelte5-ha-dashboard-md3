import { describe, expect, it, vi } from 'vitest';

const getPexelsApiKey = vi.fn();

vi.mock('$lib/server/imageProviderSettings', () => ({
    ImageProviderSettingsService: {
        getPexelsApiKey,
    },
}));

const { GET } = await import('./+server');

describe('/api/image-providers/pexels/search', () => {
    it('returns a friendly unavailable response when no key is configured', async () => {
        getPexelsApiKey.mockResolvedValueOnce('');
        const fetchMock = vi.fn();

        const response = await GET({
            url: new URL('http://localhost/api/image-providers/pexels/search?query=kitchen'),
            fetch: fetchMock,
        } as any);

        await expect(response.json()).resolves.toEqual({
            error: 'Pexels API key is not configured.',
        });
        expect(response.status).toBe(503);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('searches Pexels with the Authorization header and normalized results', async () => {
        getPexelsApiKey.mockResolvedValueOnce('pexels-secret');
        const fetchMock = vi.fn(async (_endpoint: URL, _init: RequestInit) =>
            new Response(
                JSON.stringify({
                    photos: [
                        {
                            id: 123,
                            url: 'https://www.pexels.com/photo/kitchen-123/',
                            photographer: 'Ada Lovelace',
                            photographer_url: 'https://www.pexels.com/@ada',
                            avg_color: '#91a87c',
                            alt: 'Modern kitchen',
                            src: {
                                tiny: 'https://images.pexels.com/tiny.jpg',
                                landscape: 'https://images.pexels.com/landscape.jpg',
                            },
                        },
                    ],
                }),
                { status: 200, headers: { 'content-type': 'application/json' } },
            ),
        );

        const response = await GET({
            url: new URL('http://localhost/api/image-providers/pexels/search?query=kitchen&orientation=landscape'),
            fetch: fetchMock,
        } as any);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [endpoint, init] = fetchMock.mock.calls[0];
        expect(endpoint.toString()).toContain('https://api.pexels.com/v1/search?');
        expect(endpoint.toString()).not.toContain('pexels-secret');
        expect(init.headers).toEqual({ Authorization: 'pexels-secret' });

        await expect(response.json()).resolves.toMatchObject({
            results: [
                {
                    imageUrl: 'https://images.pexels.com/landscape.jpg',
                    color: '#91a87c',
                    attribution: {
                        provider: 'pexels',
                        authorName: 'Ada Lovelace',
                    },
                },
            ],
        });
    });
});
