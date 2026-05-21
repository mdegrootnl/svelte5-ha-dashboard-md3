import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
    MusicLibraryService,
    MusicLibrarySettingsPatchSchema,
} from "$lib/server/musicLibrary";
import { configEvents, CONFIG_CHANGED_EVENT } from "$lib/server/events";

export const PATCH: RequestHandler = async ({ request }) => {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = MusicLibrarySettingsPatchSchema.safeParse(body);
    if (!parsed.success) {
        return json({
            error: "Invalid music library settings payload",
            issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            })),
        }, { status: 400 });
    }

    try {
        const result = await MusicLibraryService.patchSettings(parsed.data);
        if (result.changed) {
            configEvents.emit(CONFIG_CHANGED_EVENT);
        }
        return json({ musicLibrary: result.musicLibrary });
    } catch (error) {
        console.error("Failed to update music library settings:", error);
        return json({ error: "Failed to update music library settings" }, { status: 500 });
    }
};
