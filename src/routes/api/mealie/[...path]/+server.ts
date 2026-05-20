import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MealieProxyError, proxyMealieRequest } from '$lib/server/mealieProxy';

async function proxy({ params, request, url, fetch }: Parameters<RequestHandler>[0]) {
    try {
        return await proxyMealieRequest({
            path: params.path,
            request,
            url,
            fetch,
        });
    } catch (error) {
        if (error instanceof MealieProxyError) {
            return json({ error: error.message }, { status: error.status });
        }

        console.error('Mealie proxy failed:', error);
        return json({ error: 'Failed to proxy Mealie request' }, { status: 500 });
    }
}

export const GET: RequestHandler = proxy;
export const POST: RequestHandler = proxy;
export const PUT: RequestHandler = proxy;
export const PATCH: RequestHandler = proxy;
export const DELETE: RequestHandler = proxy;
