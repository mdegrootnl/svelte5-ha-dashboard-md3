import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ImageProviderSettingsService } from '$lib/server/imageProviderSettings';

export const GET: RequestHandler = async () => {
    const providers = await ImageProviderSettingsService.getStatus();
    return json({ providers });
};

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const input = body as {
        unsplashAccessKey?: unknown;
        pexelsApiKey?: unknown;
    };

    const updates: {
        unsplashAccessKey?: string | null;
        pexelsApiKey?: string | null;
    } = {};

    if ('unsplashAccessKey' in input) {
        if (input.unsplashAccessKey !== null && typeof input.unsplashAccessKey !== 'string') {
            return json({ error: 'Unsplash key must be a string or null.' }, { status: 400 });
        }
        updates.unsplashAccessKey = input.unsplashAccessKey;
    }

    if ('pexelsApiKey' in input) {
        if (input.pexelsApiKey !== null && typeof input.pexelsApiKey !== 'string') {
            return json({ error: 'Pexels key must be a string or null.' }, { status: 400 });
        }
        updates.pexelsApiKey = input.pexelsApiKey;
    }

    await ImageProviderSettingsService.saveRuntime(updates);
    const providers = await ImageProviderSettingsService.getStatus();
    return json({ success: true, providers });
};
