import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { ahLoginUrl } from "$lib/server/ahAuthProxy";
import {ahOwner} from '$lib/server/ahOwner';

export const POST: RequestHandler = async ({ url }) => {
    if(await ahOwner())return json({url:'https://boodschappen.degroot.ovh/bezorging'});
    return json({ url: ahLoginUrl(url) });
};
