import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AhSettingsService } from "$lib/server/ahSettings";
import {ahOwner} from '$lib/server/ahOwner';

export const POST: RequestHandler = async () => {
    if(await ahOwner())return json({error:'AH beheren via Boodschappenhulp'},{status:409});
    await AhSettingsService.clearRuntime();
    return json({ success: true, settings: await AhSettingsService.getStatus() });
};
