import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MealieSettingsService } from '$lib/server/mealieSettings';

export const GET: RequestHandler = async ({ fetch }) => {
    const { baseUrl, apiToken } = await MealieSettingsService.getCredentials();
    if (!baseUrl) {
        return json({ ok: false, error: 'Mealie URL is not configured' }, { status: 503 });
    }

    try {
        const aboutResponse = await fetch(new URL('/api/app/about', baseUrl));
        const about = await aboutResponse.json().catch(() => null);

        if (!aboutResponse.ok) {
            return json({ ok: false, error: 'Mealie did not respond correctly', status: aboutResponse.status }, { status: 502 });
        }

        if (!apiToken) {
            return json({
                ok: false,
                error: 'Mealie URL is reachable, but the API token is missing',
                about,
            }, { status: 401 });
        }

        const userResponse = await fetch(new URL('/api/users/self', baseUrl), {
            headers: { authorization: `Bearer ${apiToken}` },
        });
        const user = await userResponse.json().catch(() => null);

        if (!userResponse.ok) {
            return json({ ok: false, error: 'Mealie token was rejected', status: userResponse.status, about }, { status: 401 });
        }

        return json({
            ok: true,
            about,
            user: {
                email: user?.email,
                group: user?.group,
                household: user?.household,
            },
        });
    } catch (error) {
        return json({
            ok: false,
            error: error instanceof Error ? error.message : 'Failed to reach Mealie',
        }, { status: 502 });
    }
};
