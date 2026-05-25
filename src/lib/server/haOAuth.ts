import type { AuthData } from "home-assistant-js-websocket";

export const HA_OAUTH_STATE_COOKIE = "ha_dashboard_oauth_state";

const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_STATE_LENGTH = 256;
const MAX_CODE_LENGTH = 4096;

export interface HaOAuthState {
    state: string;
    hassUrl: string;
    clientId: string;
    redirectUri: string;
    returnTo: string;
    createdAt: number;
}

export function sanitizeHomeAssistantOrigin(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 2048) return null;

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return null;
    }

    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    return parsed.origin;
}

export function sanitizeLocalReturnPath(value: unknown, fallback = "/settings"): string {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 2048) return fallback;
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;

    try {
        const parsed = new URL(trimmed, "http://dashboard.local");
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return fallback;
    }
}

export function createHaOAuthState(params: {
    state: string;
    hassUrl: string;
    clientId: string;
    redirectUri: string;
    returnTo?: string;
    now?: number;
}): HaOAuthState {
    return {
        state: params.state,
        hassUrl: params.hassUrl,
        clientId: params.clientId,
        redirectUri: params.redirectUri,
        returnTo: sanitizeLocalReturnPath(params.returnTo),
        createdAt: params.now ?? Date.now(),
    };
}

export function encodeHaOAuthState(state: HaOAuthState): string {
    return Buffer.from(JSON.stringify(state), "utf-8").toString("base64url");
}

export function decodeHaOAuthState(value: string | undefined | null, now = Date.now()): HaOAuthState | null {
    if (!value || value.length > 4096) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf-8"));
    } catch {
        return null;
    }

    if (!parsed || typeof parsed !== "object") return null;
    const input = parsed as Partial<HaOAuthState>;

    if (typeof input.state !== "string" || !input.state || input.state.length > MAX_STATE_LENGTH) return null;
    if (typeof input.clientId !== "string" || !input.clientId || input.clientId.length > 512) return null;
    if (typeof input.redirectUri !== "string" || !input.redirectUri || input.redirectUri.length > 2048) return null;
    if (typeof input.createdAt !== "number" || !Number.isFinite(input.createdAt)) return null;
    if (now - input.createdAt > STATE_TTL_MS || input.createdAt - now > 60_000) return null;

    const hassUrl = sanitizeHomeAssistantOrigin(input.hassUrl);
    if (!hassUrl) return null;

    return {
        state: input.state,
        hassUrl,
        clientId: input.clientId,
        redirectUri: input.redirectUri,
        returnTo: sanitizeLocalReturnPath(input.returnTo),
        createdAt: input.createdAt,
    };
}

export function buildHaAuthorizeUrl(oauthState: HaOAuthState): string {
    const authorizeUrl = new URL("/auth/authorize", oauthState.hassUrl);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("redirect_uri", oauthState.redirectUri);
    authorizeUrl.searchParams.set("client_id", oauthState.clientId);
    authorizeUrl.searchParams.set("state", oauthState.state);
    return authorizeUrl.toString();
}

export function callbackBasePrefix(pathname: string, marker: string) {
    return pathname.split(marker)[0] || "";
}

export function validateOAuthCallback(params: {
    code: string | null;
    state: string | null;
    stored: HaOAuthState | null;
}) {
    const code = params.code?.trim() ?? "";
    const state = params.state?.trim() ?? "";
    if (!code || code.length > MAX_CODE_LENGTH || !state || state.length > MAX_STATE_LENGTH) {
        return { ok: false as const, error: "Missing Home Assistant authorization callback data." };
    }
    if (!params.stored || params.stored.state !== state) {
        return { ok: false as const, error: "Home Assistant authorization state did not match." };
    }
    return { ok: true as const, code, state: params.stored };
}

export async function exchangeHaAuthCode(params: {
    fetch: typeof globalThis.fetch;
    hassUrl: string;
    clientId: string;
    code: string;
}): Promise<AuthData> {
    const body = new URLSearchParams({
        client_id: params.clientId,
        code: params.code,
        grant_type: "authorization_code",
    });

    const response = await params.fetch(new URL("/auth/token", params.hassUrl), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    if (!response.ok) {
        throw new Error(`Home Assistant token exchange failed: ${response.status}`);
    }

    const token = await response.json().catch(() => null) as Partial<AuthData> | null;
    if (!token || typeof token.access_token !== "string" || typeof token.refresh_token !== "string") {
        throw new Error("Home Assistant token exchange returned an invalid token response.");
    }

    const expiresIn = typeof token.expires_in === "number" && Number.isFinite(token.expires_in)
        ? token.expires_in
        : 1800;

    return {
        hassUrl: params.hassUrl,
        clientId: params.clientId,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_in: expiresIn,
        expires: Date.now() + expiresIn * 1000,
    };
}

export async function revokeHaRefreshToken(params: {
    fetch: typeof globalThis.fetch;
    hassUrl: string;
    refreshToken: string;
}): Promise<void> {
    const hassUrl = sanitizeHomeAssistantOrigin(params.hassUrl);
    const refreshToken = typeof params.refreshToken === "string" ? params.refreshToken.trim() : "";
    if (!hassUrl || !refreshToken) return;

    const body = new URLSearchParams({ token: refreshToken });
    await params.fetch(new URL("/auth/revoke", hassUrl), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
}
