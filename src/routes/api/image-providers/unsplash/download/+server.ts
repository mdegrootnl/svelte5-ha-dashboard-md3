import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ImageProviderSettingsService } from '$lib/server/imageProviderSettings';

function isUnsplashDownloadLocation(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && url.hostname === 'api.unsplash.com'
            && /^\/photos\/[^/]+\/download$/.test(url.pathname);
    } catch {
        return false;
    }
}

export const POST: RequestHandler = async ({ request, fetch }) => {
    const accessKey = await ImageProviderSettingsService.getUnsplashAccessKey();
    if (!accessKey) {
        return json({ error: 'Unsplash API key is not configured.' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const downloadLocation = body.downloadLocation;

    if (!isUnsplashDownloadLocation(downloadLocation)) {
        return json({ error: 'Invalid Unsplash download location.' }, { status: 400 });
    }

    const response = await fetch(downloadLocation, {
        headers: {
            Authorization: `Client-ID ${accessKey}`,
            'Accept-Version': 'v1',
        },
    });

    if (!response.ok) {
        return json({ error: 'Unsplash download tracking failed.' }, { status: 502 });
    }

    return json({ ok: true });
};
