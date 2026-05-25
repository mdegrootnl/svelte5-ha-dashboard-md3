import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function parseCoordinate(value: string | null, min: number, max: number) {
    if (value === null || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
    return parsed;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
    const lat = parseCoordinate(url.searchParams.get('lat'), -90, 90);
    const lon = parseCoordinate(url.searchParams.get('lon'), -180, 180);

    if (lat === null || lon === null) {
        throw error(400, 'Invalid lat/lon parameters');
    }

    const targetUrl = new URL('https://gadgets.buienradar.nl/data/raintext/');
    targetUrl.searchParams.set('lat', String(lat));
    targetUrl.searchParams.set('lon', String(lon));

    let res: Response;
    try {
        res = await fetch(targetUrl);
    } catch {
        throw error(502, 'Buienradar unavailable');
    }

    if (!res.ok) {
        throw error(res.status, 'Buienradar unavailable');
    }

    const text = await res.text();
    return new Response(text, {
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=300'
        }
    });
};
