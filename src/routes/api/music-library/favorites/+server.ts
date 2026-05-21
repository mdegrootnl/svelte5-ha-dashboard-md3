import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
    MusicLibraryItemSchema,
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

    const parsed = MusicLibraryItemSchema.safeParse((body as { item?: unknown })?.item);
    if (!parsed.success) {
        return json({
            error: "Invalid favorite item",
            issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            })),
        }, { status: 400 });
    }

    try {
        const result = await MusicLibraryService.addFavorite(parsed.data);
        if (result.changed) {
            configEvents.emit(CONFIG_CHANGED_EVENT);
        }
        return json({ musicLibrary: result.musicLibrary });
    } catch (error) {
        console.error("Failed to add music favorite:", error);
        return json({ error: "Failed to add music favorite" }, { status: 500 });
    }
};
