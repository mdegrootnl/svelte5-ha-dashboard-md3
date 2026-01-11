import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { JsonStorageService } from '$lib/server/storage';
import type { AppConfig } from '$lib/types/config';
import { configEvents, CONFIG_CHANGED_EVENT } from '$lib/server/events';

export const GET: RequestHandler = async () => {
    const config = await JsonStorageService.load();
    return json(config);
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const newConfig = await request.json() as AppConfig;

        // Basic validation could go here

        await JsonStorageService.savePartial(newConfig);

        // Notify listeners
        console.log('[API] Saving config and emitting change event...');
        configEvents.emit(CONFIG_CHANGED_EVENT);
        console.log('[API] Event emitted.');

        return json({ success: true });
    } catch (error) {
        console.error('Failed to save config:', error);
        return json({ error: 'Failed to save config' }, { status: 500 });
    }
};
