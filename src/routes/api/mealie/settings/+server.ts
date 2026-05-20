import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MealieSettingsService, sanitizeMealieBaseUrl } from '$lib/server/mealieSettings';

export const GET: RequestHandler = async () => {
    return json({ settings: await MealieSettingsService.getStatus() });
};

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const input = body as {
        baseUrl?: unknown;
        apiToken?: unknown;
    };

    const updates: {
        baseUrl?: string | null;
        apiToken?: string | null;
    } = {};

    if ('baseUrl' in input) {
        if (input.baseUrl !== null && typeof input.baseUrl !== 'string') {
            return json({ error: 'Mealie URL must be a string or null.' }, { status: 400 });
        }

        if (input.baseUrl !== null && !sanitizeMealieBaseUrl(input.baseUrl)) {
            return json({ error: 'Enter a valid http:// or https:// Mealie URL.' }, { status: 400 });
        }

        updates.baseUrl = input.baseUrl;
    }

    if ('apiToken' in input) {
        if (input.apiToken !== null && typeof input.apiToken !== 'string') {
            return json({ error: 'Mealie token must be a string or null.' }, { status: 400 });
        }
        updates.apiToken = input.apiToken;
    }

    await MealieSettingsService.saveRuntime(updates);
    return json({ success: true, settings: await MealieSettingsService.getStatus() });
};
