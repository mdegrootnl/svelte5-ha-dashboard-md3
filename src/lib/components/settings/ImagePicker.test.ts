import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImagePicker from './ImagePicker.svelte';

vi.mock('$lib/utils/imageAccent', () => ({
    extractAccentColorFromImageUrl: vi.fn(async () => '#91a87c'),
}));

const pexelsResult = {
    id: '123',
    thumbUrl: 'https://images.pexels.com/thumb.jpg',
    imageUrl: 'https://images.pexels.com/large.jpg',
    description: 'Modern kitchen',
    color: '#91a87c',
    attribution: {
        provider: 'pexels',
        sourceName: 'Pexels',
        sourceUrl: 'https://www.pexels.com/photo/kitchen/',
        authorName: 'Ada Lovelace',
        authorUrl: 'https://www.pexels.com/@ada',
        photoId: '123',
        licenseUrl: 'https://www.pexels.com/license/',
    },
};

const unsplashResult = {
    id: 'photo-kitchen',
    thumbUrl: 'https://images.unsplash.com/thumb.jpg',
    imageUrl: 'https://images.unsplash.com/regular.jpg',
    description: 'Modern kitchen',
    color: '#91a87c',
    attribution: {
        provider: 'unsplash',
        sourceName: 'Unsplash',
        sourceUrl: 'https://unsplash.com/photos/photo-kitchen',
        authorName: 'Ada Lovelace',
        authorUrl: 'https://unsplash.com/@ada',
        photoId: 'photo-kitchen',
        licenseUrl: 'https://unsplash.com/license',
        downloadLocation: 'https://api.unsplash.com/photos/photo-kitchen/download',
    },
};

describe('ImagePicker', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('searches and selects Pexels images with attribution', async () => {
        const onchange = vi.fn();
        const fetchMock = vi.fn(async () =>
            new Response(JSON.stringify({ results: [pexelsResult] }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        render(ImagePicker, {
            props: {
                value: '',
                label: 'Background Image',
                enablePexels: true,
                searchHint: 'kitchen interior',
                onchange,
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/image-providers/pexels/search?query=kitchen+interior&orientation=landscape',
            );
        });

        await fireEvent.click(
            await screen.findByRole('button', {
                name: 'Use Pexels photo by Ada Lovelace',
            }),
        );

        expect(onchange).toHaveBeenCalled();
        expect(
            await screen.findByText('Selected Pexels photo by Ada Lovelace.'),
        ).toBeInTheDocument();
    });

    it('shows a friendly message when Pexels is unavailable', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                new Response(JSON.stringify({ error: 'Pexels API key is not configured.' }), {
                    status: 503,
                    headers: { 'content-type': 'application/json' },
                }),
            ),
        );

        render(ImagePicker, {
            props: {
                value: '',
                label: 'Background Image',
                enablePexels: true,
                searchHint: 'bedroom',
                onchange: undefined,
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        expect(await screen.findByText('Pexels API key is not configured.')).toBeInTheDocument();
    });

    it('searches and selects Unsplash images while tracking the download', async () => {
        const onchange = vi.fn();
        const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
            if (input.startsWith('/api/image-providers/unsplash/search')) {
                return new Response(JSON.stringify({ results: [unsplashResult] }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            if (input === '/api/image-providers/unsplash/download' && init?.method === 'POST') {
                return new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ error: 'Unexpected request' }), {
                status: 500,
                headers: { 'content-type': 'application/json' },
            });
        });
        vi.stubGlobal('fetch', fetchMock);

        render(ImagePicker, {
            props: {
                value: '',
                label: 'Background Image',
                enableUnsplash: true,
                searchHint: 'kitchen interior',
                onchange,
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        await fireEvent.click(
            await screen.findByRole('button', {
                name: 'Use Unsplash photo by Ada Lovelace',
            }),
        );

        expect(onchange).toHaveBeenCalled();
        expect(
            await screen.findByText('Selected Unsplash photo by Ada Lovelace.'),
        ).toBeInTheDocument();

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/image-providers/unsplash/download',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        downloadLocation: 'https://api.unsplash.com/photos/photo-kitchen/download',
                    }),
                }),
            );
        });
    });
});
