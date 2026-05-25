import crypto from "node:crypto";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
    buildHaAuthorizeUrl,
    callbackBasePrefix,
    createHaOAuthState,
    encodeHaOAuthState,
    HA_OAUTH_STATE_COOKIE,
    sanitizeHomeAssistantOrigin,
    sanitizeLocalReturnPath,
} from "$lib/server/haOAuth";

const OAUTH_STATE_MAX_AGE = 10 * 60;
const START_ROUTE_MARKER = "/api/ha-session/auth/start";

function cookieOptions(url: URL) {
    return {
        path: "/",
        httpOnly: true,
        sameSite: "lax" as const,
        secure: url.protocol === "https:",
        maxAge: OAUTH_STATE_MAX_AGE,
    };
}

function noStore(response: Response) {
    response.headers.set("Cache-Control", "no-store");
    return response;
}

export const POST: RequestHandler = async ({ request, cookies, url }) => {
    const body = await request.json().catch(() => null) as {
        hassUrl?: unknown;
        returnTo?: unknown;
    } | null;

    const hassUrl = sanitizeHomeAssistantOrigin(body?.hassUrl);
    if (!hassUrl) {
        return noStore(json({ error: "Invalid Home Assistant URL" }, { status: 400 }));
    }

    const basePrefix = callbackBasePrefix(url.pathname, START_ROUTE_MARKER);
    const redirectUri = `${url.origin}${basePrefix}/api/ha-session/auth/callback`;
    const clientId = `${url.origin}/`;
    const state = createHaOAuthState({
        state: crypto.randomBytes(32).toString("hex"),
        hassUrl,
        clientId,
        redirectUri,
        returnTo: sanitizeLocalReturnPath(body?.returnTo),
    });

    cookies.set(HA_OAUTH_STATE_COOKIE, encodeHaOAuthState(state), cookieOptions(url));

    return noStore(json({
        authorizeUrl: buildHaAuthorizeUrl(state),
    }));
};
