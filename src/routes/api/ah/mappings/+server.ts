import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AhMappingsService } from "$lib/server/ahMappings";

export const GET: RequestHandler = async () => {
    return json({ mappings: await AhMappingsService.load() });
};
