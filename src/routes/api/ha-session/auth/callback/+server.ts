import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { HA_SESSION_COOKIE, HaSessionService } from "$lib/server/haSession";
import {
    decodeHaOAuthState,
    exchangeHaAuthCode,
    HA_OAUTH_STATE_COOKIE,
    sanitizeLocalReturnPath,
    validateOAuthCallback,
} from "$lib/server/haOAuth";

const SESSION_MAX_AGE = 60 * 24 * 60 * 60;

function sessionCookieOptions(url: URL) {
    return {
        path: "/",
        httpOnly: true,
        sameSite: "lax" as const,
        secure: url.protocol === "https:",
        maxAge: SESSION_MAX_AGE,
    };
}

function stateCookieDeleteOptions(url: URL) {
    return {
        path: "/",
        secure: url.protocol === "https:",
        sameSite: "lax" as const,
    };
}

function appendLoginStatus(path: string, status: "success" | "error") {
    const target = new URL(sanitizeLocalReturnPath(path), "http://dashboard.local");
    target.searchParams.set("haLogin", status);
    return `${target.pathname}${target.search}${target.hash}`;
}

export const GET: RequestHandler = async ({ cookies, fetch, url }) => {
    const stored = decodeHaOAuthState(cookies.get(HA_OAUTH_STATE_COOKIE));
    cookies.delete(HA_OAUTH_STATE_COOKIE, stateCookieDeleteOptions(url));

    const callback = validateOAuthCallback({
        code: url.searchParams.get("code"),
        state: url.searchParams.get("state"),
        stored,
    });

    if (!callback.ok) {
        throw redirect(303, appendLoginStatus(stored?.returnTo ?? "/settings", "error"));
    }

    try {
        const tokens = await exchangeHaAuthCode({
            fetch,
            hassUrl: callback.state.hassUrl,
            clientId: callback.state.clientId,
            code: callback.code,
        });

        const sessionId = await HaSessionService.saveTokens(tokens, cookies.get(HA_SESSION_COOKIE));
        cookies.set(HA_SESSION_COOKIE, sessionId, sessionCookieOptions(url));
        throw redirect(303, appendLoginStatus(callback.state.returnTo, "success"));
    } catch (error) {
        if (error && typeof error === "object" && "status" in error && "location" in error) {
            throw error;
        }
        console.error("Home Assistant OAuth callback failed:", error);
        throw redirect(303, appendLoginStatus(callback.state.returnTo, "error"));
    }
};
