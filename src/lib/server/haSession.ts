import fs from "fs/promises";
import crypto from "node:crypto";
import path from "path";
import type { AuthData } from "home-assistant-js-websocket";
import { getResolvedDataDir } from "$lib/server/dataDir";
import { getConfiguredHomeAssistantInternalOrigin } from "$lib/server/haOAuth";

export const HA_SESSION_COOKIE = "ha_dashboard_session";

const CONFIG_FILE = "ha-sessions.json";
const MAX_TOKEN_LENGTH = 8192;
const SESSION_ID_BYTES = 32;
const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000;

interface StoredHaSession {
    tokens: AuthData;
    updatedAt: string;
    lastAccessedAt: string;
}

type SessionFile = Record<string, StoredHaSession>;

export interface HaSessionInfo {
    connected: boolean;
    hassUrl: string | null;
}

let saveLock: Promise<void> = Promise.resolve();

function getConfigPath() {
    return path.join(getResolvedDataDir(), CONFIG_FILE);
}

async function ensureDir() {
    await fs.mkdir(getResolvedDataDir(), { recursive: true });
}

function sanitizeToken(value: unknown) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_TOKEN_LENGTH) return undefined;
    return trimmed;
}

function sanitizeFiniteNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : undefined;
}

export function sanitizeHaTokens(value: unknown): AuthData | null {
    if (!value || typeof value !== "object") return null;
    const input = value as Partial<AuthData>;

    if (typeof input.hassUrl !== "string") return null;

    let hassUrl: URL;
    try {
        hassUrl = new URL(input.hassUrl);
    } catch {
        return null;
    }

    if (!["http:", "https:"].includes(hassUrl.protocol)) return null;

    const accessToken = sanitizeToken(input.access_token);
    const refreshToken = sanitizeToken(input.refresh_token);
    const expires = sanitizeFiniteNumber(input.expires);
    const expiresIn = sanitizeFiniteNumber(input.expires_in);

    if (!accessToken || !refreshToken || expires === undefined || expiresIn === undefined) {
        return null;
    }

    const clientId = typeof input.clientId === "string" && input.clientId.length <= 512
        ? input.clientId
        : null;

    return {
        hassUrl: getConfiguredHomeAssistantInternalOrigin() ?? hassUrl.origin,
        clientId,
        expires,
        refresh_token: refreshToken,
        access_token: accessToken,
        expires_in: expiresIn,
    };
}

export function createHaSessionId() {
    return crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
}

function isExpired(session: StoredHaSession, now = Date.now()) {
    const lastAccessed = new Date(session.lastAccessedAt || session.updatedAt).getTime();
    return !Number.isFinite(lastAccessed) || now - lastAccessed > SESSION_TTL_MS;
}

async function loadSessions(): Promise<SessionFile> {
    try {
        await ensureDir();
        const content = await fs.readFile(getConfigPath(), "utf-8");
        const parsed = JSON.parse(content) as SessionFile;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

async function saveSessions(sessions: SessionFile) {
    saveLock = saveLock.catch(() => undefined).then(async () => {
        await ensureDir();
        await fs.writeFile(getConfigPath(), JSON.stringify(sessions, null, 2), {
            encoding: "utf-8",
            mode: 0o600,
        });
    });
    return saveLock;
}

export class HaSessionService {
    static async loadTokens(sessionId: string | undefined | null): Promise<AuthData | null> {
        if (!sessionId) return null;
        const sessions = await loadSessions();
        const session = sessions[sessionId];
        if (!session || isExpired(session)) {
            if (session) {
                delete sessions[sessionId];
                await saveSessions(sessions);
            }
            return null;
        }

        session.lastAccessedAt = new Date().toISOString();
        await saveSessions(sessions);
        return sanitizeHaTokens(session.tokens);
    }

    static async getSessionInfo(sessionId: string | undefined | null): Promise<HaSessionInfo> {
        const tokens = await this.loadTokens(sessionId);
        return {
            connected: Boolean(tokens),
            hassUrl: tokens?.hassUrl ?? null,
        };
    }

    static async saveTokens(tokens: AuthData, sessionId?: string | null) {
        const sanitized = sanitizeHaTokens(tokens);
        if (!sanitized) {
            throw new Error("Invalid Home Assistant tokens");
        }

        const sessions = await loadSessions();
        const nextSessionId = sessionId && sessions[sessionId] ? sessionId : createHaSessionId();
        const now = new Date().toISOString();

        sessions[nextSessionId] = {
            tokens: sanitized,
            updatedAt: now,
            lastAccessedAt: now,
        };

        await saveSessions(sessions);
        return nextSessionId;
    }

    static async clearSession(sessionId: string | undefined | null) {
        if (!sessionId) return;
        const sessions = await loadSessions();
        delete sessions[sessionId];
        await saveSessions(sessions);
    }

    static async getSessionCount() {
        const sessions = await loadSessions();
        return Object.keys(sessions).length;
    }
}

export async function loadHaSessionTokensFromCookie(
    cookies: { get(name: string): string | undefined | null } | undefined | null,
) {
    return HaSessionService.loadTokens(cookies?.get(HA_SESSION_COOKIE));
}
