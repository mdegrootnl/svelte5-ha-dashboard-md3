import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AhSettingsService } from "$lib/server/ahSettings";

export const POST: RequestHandler = async () => {
    await AhSettingsService.clearRuntime();
    return json({ success: true, settings: await AhSettingsService.getStatus() });
};
