import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AhSettingsService } from "$lib/server/ahSettings";

export const GET: RequestHandler = async () => {
    return json({ settings: await AhSettingsService.getStatus() });
};
