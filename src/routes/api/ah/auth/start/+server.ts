import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { ahLoginUrl } from "$lib/server/ahAuthProxy";

export const POST: RequestHandler = async ({ url }) => {
    return json({ url: ahLoginUrl(url) });
};
