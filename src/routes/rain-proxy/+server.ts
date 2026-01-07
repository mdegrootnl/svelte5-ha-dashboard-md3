import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');

    if (!lat || !lon) {
        throw error(400, 'Missing lat/lon parameters');
    }

    try {
        const targetUrl = `https://gadgets.buienradar.nl/data/raintext/?lat=${lat}&lon=${lon}`;
        // console.log('[API Proxy] Fetching:', targetUrl);
        const res = await fetch(targetUrl);

        if (!res.ok) {
            throw error(res.status, 'Buienradar unavailable');
        }

        const text = await res.text();
        return new Response(text, {
            headers: {
                'Content-Type': 'text/plain',
                'Cache-Control': 'public, max-age=300' // Cache for 5 mins
            }
        });
    } catch (err) {
        // console.error('[API Proxy] Error:', err);
        throw error(500, 'Internal Server Error');
    }
};
