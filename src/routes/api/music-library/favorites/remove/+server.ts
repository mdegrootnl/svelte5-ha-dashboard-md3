import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { z } from "zod";
import { MusicLibraryService } from "$lib/server/musicLibrary";
import { configEvents, CONFIG_CHANGED_EVENT } from "$lib/server/events";

const RemoveFavoriteSchema = z.object({
    uri: z.string().min(1),
}).strict();

export const POST: RequestHandler = async ({ request }) => {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = RemoveFavoriteSchema.safeParse(body);
    if (!parsed.success) {
        return json({
            error: "Invalid remove favorite payload",
            issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            })),
        }, { status: 400 });
    }

    try {
        const result = await MusicLibraryService.removeFavorite(parsed.data.uri);
        if (result.changed) {
            configEvents.emit(CONFIG_CHANGED_EVENT);
        }
        return json({ musicLibrary: result.musicLibrary });
    } catch (error) {
        console.error("Failed to remove music favorite:", error);
        return json({ error: "Failed to remove music favorite" }, { status: 500 });
    }
};
