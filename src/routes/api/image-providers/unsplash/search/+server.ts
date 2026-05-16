import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';
const APPLICATION_NAME = 'ha_dashboard';

interface UnsplashPhoto {
    id: string;
    description?: string | null;
    alt_description?: string | null;
    color?: string | null;
    urls: {
        small: string;
        regular: string;
    };
    links: {
        html: string;
        download_location: string;
    };
    user: {
        name?: string | null;
        links?: {
            html?: string | null;
        };
    };
}

interface UnsplashSearchResponse {
    results?: UnsplashPhoto[];
}

function withUtm(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    try {
        const target = new URL(url);
        target.searchParams.set('utm_source', APPLICATION_NAME);
        target.searchParams.set('utm_medium', 'referral');
        return target.toString();
    } catch {
        return undefined;
    }
}

export const GET: RequestHandler = async ({ url, fetch }) => {
    const accessKey = env.UNSPLASH_ACCESS_KEY?.trim();
    if (!accessKey) {
        return json({ error: 'Unsplash API key is not configured.' }, { status: 503 });
    }

    const query = url.searchParams.get('query')?.trim();
    const orientation = url.searchParams.get('orientation') === 'portrait' ? 'portrait' : 'landscape';

    if (!query) {
        return json({ error: 'Search query is required.' }, { status: 400 });
    }

    const endpoint = new URL(UNSPLASH_API_URL);
    endpoint.searchParams.set('query', query);
    endpoint.searchParams.set('orientation', orientation);
    endpoint.searchParams.set('per_page', '12');
    endpoint.searchParams.set('content_filter', 'high');

    const response = await fetch(endpoint, {
        headers: {
            Authorization: `Client-ID ${accessKey}`,
            'Accept-Version': 'v1',
        },
    });

    if (!response.ok) {
        const status = response.status === 429 ? 429 : 502;
        return json({ error: 'Unsplash search is unavailable.' }, { status });
    }

    const data = (await response.json()) as UnsplashSearchResponse;
    const results = (data.results ?? []).map((photo) => ({
        id: photo.id,
        thumbUrl: photo.urls.small,
        imageUrl: photo.urls.regular,
        description: photo.alt_description || photo.description || '',
        color: photo.color || undefined,
        attribution: {
            provider: 'unsplash',
            sourceName: 'Unsplash',
            sourceUrl: withUtm(photo.links.html),
            authorName: photo.user.name || 'Unsplash photographer',
            authorUrl: withUtm(photo.user.links?.html),
            photoId: photo.id,
            licenseUrl: 'https://unsplash.com/license',
            downloadLocation: photo.links.download_location,
        },
    }));

    return json({ results });
};
