import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { JsonStorageService } from '$lib/server/storage';
import type { AppConfig } from '$lib/types/config';
import { configEvents, CONFIG_CHANGED_EVENT } from '$lib/server/events';
import { AppConfigPartialSchema } from '$lib/domain/schemas';

export const GET: RequestHandler = async () => {
    const config = await JsonStorageService.load();
    return json(config);
};

export const POST: RequestHandler = async ({ request }) => {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = AppConfigPartialSchema.safeParse(body);
    if (!parsed.success) {
        return json({
            error: 'Invalid settings payload',
            issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message
            }))
        }, { status: 400 });
    }

    try {
        await JsonStorageService.savePartial(parsed.data as Partial<AppConfig>);

        configEvents.emit(CONFIG_CHANGED_EVENT);

        return json({ success: true });
    } catch (error) {
        console.error('Failed to save config:', error);
        return json({ error: 'Failed to save config' }, { status: 500 });
    }
};
