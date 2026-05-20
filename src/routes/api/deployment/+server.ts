import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDeploymentInfo } from "$lib/server/deployment";

export const GET: RequestHandler = async ({ request, url }) => {
    return json(getDeploymentInfo(request, url));
};
