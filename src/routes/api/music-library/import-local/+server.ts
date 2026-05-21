import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
    MusicLibraryImportSchema,
    MusicLibraryService,
} from "$lib/server/musicLibrary";
import { configEvents, CONFIG_CHANGED_EVENT } from "$lib/server/events";

export const POST: RequestHandler = async ({ request }) => {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = MusicLibraryImportSchema.safeParse(body);
    if (!parsed.success) {
        return json({
            error: "Invalid local music library payload",
            issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            })),
        }, { status: 400 });
    }

    try {
        const result = await MusicLibraryService.importLocal(parsed.data);
        if (result.changed) {
            configEvents.emit(CONFIG_CHANGED_EVENT);
        }
        return json({ musicLibrary: result.musicLibrary, imported: result.changed });
    } catch (error) {
        console.error("Failed to import local music library:", error);
        return json({ error: "Failed to import local music library" }, { status: 500 });
    }
};
