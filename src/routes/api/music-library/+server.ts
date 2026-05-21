import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { MusicLibraryService } from "$lib/server/musicLibrary";

export const GET: RequestHandler = async () => {
    const musicLibrary = await MusicLibraryService.load();
    return json({ musicLibrary });
};
