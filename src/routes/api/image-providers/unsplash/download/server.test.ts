import { describe, expect, it, vi } from 'vitest';

const getUnsplashAccessKey = vi.fn();

vi.mock('$lib/server/imageProviderSettings', () => ({
    ImageProviderSettingsService: {
        getUnsplashAccessKey,
    },
}));

const { POST } = await import('./+server');

function createRequest(body: unknown) {
    return new Request('http://localhost/api/image-providers/unsplash/download', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('/api/image-providers/unsplash/download', () => {
    it('returns a friendly unavailable response when no key is configured', async () => {
        getUnsplashAccessKey.mockResolvedValueOnce('');
        const fetchMock = vi.fn();

        const response = await POST({
            request: createRequest({
                downloadLocation: 'https://api.unsplash.com/photos/photo-kitchen/download',
            }),
            fetch: fetchMock,
        } as any);

        await expect(response.json()).resolves.toEqual({
            error: 'Unsplash API key is not configured.',
        });
        expect(response.status).toBe(503);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects non-Unsplash download locations before calling the provider', async () => {
        getUnsplashAccessKey.mockResolvedValueOnce('unsplash-secret');
        const fetchMock = vi.fn();

        const response = await POST({
            request: createRequest({
                downloadLocation: 'https://example.com/not-unsplash',
            }),
            fetch: fetchMock,
        } as any);

        await expect(response.json()).resolves.toEqual({
            error: 'Invalid Unsplash download location.',
        });
        expect(response.status).toBe(400);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('tracks valid downloads with the Authorization header', async () => {
        getUnsplashAccessKey.mockResolvedValueOnce('unsplash-secret');
        const fetchMock = vi.fn(async (_endpoint: string, _init: RequestInit) =>
            new Response(JSON.stringify({ url: 'https://images.unsplash.com/download.jpg' }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        );

        const response = await POST({
            request: createRequest({
                downloadLocation: 'https://api.unsplash.com/photos/photo-kitchen/download',
            }),
            fetch: fetchMock,
        } as any);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [endpoint, init] = fetchMock.mock.calls[0];
        expect(endpoint).toBe('https://api.unsplash.com/photos/photo-kitchen/download');
        expect(endpoint).not.toContain('unsplash-secret');
        expect(init.headers).toEqual({
            Authorization: 'Client-ID unsplash-secret',
            'Accept-Version': 'v1',
        });
        await expect(response.json()).resolves.toEqual({ ok: true });
    });
});
