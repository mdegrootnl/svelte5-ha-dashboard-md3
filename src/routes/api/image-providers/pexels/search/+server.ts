import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ImageProviderSettingsService } from '$lib/server/imageProviderSettings';
import { mapPexelsPhotos, type PexelsPhoto } from '$lib/server/pexelsSearch';

const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

interface PexelsSearchResponse {
    photos?: PexelsPhoto[];
}

export const GET: RequestHandler = async ({ url, fetch }) => {
    const apiKey = await ImageProviderSettingsService.getPexelsApiKey();
    if (!apiKey) {
        return json({ error: 'Pexels API key is not configured.' }, { status: 503 });
    }

    const query = url.searchParams.get('query')?.trim();
    const orientation = url.searchParams.get('orientation') === 'portrait' ? 'portrait' : 'landscape';

    if (!query) {
        return json({ error: 'Search query is required.' }, { status: 400 });
    }

    const endpoint = new URL(PEXELS_API_URL);
    endpoint.searchParams.set('query', query);
    endpoint.searchParams.set('orientation', orientation);
    endpoint.searchParams.set('per_page', '12');

    const response = await fetch(endpoint, {
        headers: {
            Authorization: apiKey,
        },
    });

    if (!response.ok) {
        const status = response.status === 429 ? 429 : 502;
        return json({ error: 'Pexels search is unavailable.' }, { status });
    }

    const data = (await response.json()) as PexelsSearchResponse;
    const results = mapPexelsPhotos(data.photos, orientation);

    return json({ results });
};
