import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
    HA_SESSION_COOKIE,
    HaSessionService,
    sanitizeHaTokens,
} from "$lib/server/haSession";
import { revokeHaRefreshToken } from "$lib/server/haOAuth";

const SESSION_MAX_AGE = 60 * 24 * 60 * 60;

function cookieOptions(url: URL) {
    return {
        path: "/",
        httpOnly: true,
        sameSite: "lax" as const,
        secure: url.protocol === "https:",
        maxAge: SESSION_MAX_AGE,
    };
}

function noStore(response: Response) {
    response.headers.set("Cache-Control", "no-store");
    return response;
}

export const GET: RequestHandler = async ({ cookies }) => {
    const session = await HaSessionService.getSessionInfo(cookies.get(HA_SESSION_COOKIE));
    return noStore(json(session));
};

export const POST: RequestHandler = async ({ request, cookies, url }) => {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !("tokens" in body)) {
        return noStore(json({ error: "Invalid JSON body" }, { status: 400 }));
    }

    const tokens = sanitizeHaTokens((body as { tokens?: unknown }).tokens);
    if (!tokens) {
        return noStore(json({ error: "Invalid Home Assistant tokens" }, { status: 400 }));
    }

    const sessionId = await HaSessionService.saveTokens(tokens, cookies.get(HA_SESSION_COOKIE));
    cookies.set(HA_SESSION_COOKIE, sessionId, cookieOptions(url));

    return noStore(json({ success: true }));
};

export const DELETE: RequestHandler = async ({ cookies, fetch, url }) => {
    const sessionId = cookies.get(HA_SESSION_COOKIE);
    const tokens = await HaSessionService.loadTokens(sessionId);
    if (tokens?.refresh_token) {
        await revokeHaRefreshToken({
            fetch,
            hassUrl: tokens.hassUrl,
            refreshToken: tokens.refresh_token,
        }).catch((error) => {
            console.warn("Home Assistant token revocation failed; clearing local session anyway.", error);
        });
    }

    await HaSessionService.clearSession(sessionId);
    cookies.delete(HA_SESSION_COOKIE, {
        path: "/",
        secure: url.protocol === "https:",
        sameSite: "lax",
    });

    return noStore(json({ success: true }));
};
