import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

export const HA_SESSION_COOKIE = 'ha_dashboard_session';
const SESSION_FILE = 'ha-sessions.json';
const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

let saveLock = Promise.resolve();

/**
 * @typedef {{
 *   hassUrl: string;
 *   clientId: string | null;
 *   expires: number;
 *   refresh_token: string;
 *   access_token: string;
 *   expires_in: number;
 * }} HaSessionTokens
 *
 * @typedef {{
 *   tokens: HaSessionTokens;
 *   updatedAt: string;
 *   lastAccessedAt: string;
 * }} StoredHaSession
 *
 * @typedef {Record<string, StoredHaSession>} SessionFile
 */

function getDataDir() {
    const dataDir = process.env.DASHBOARD_DATA_DIR?.trim() || 'data';
    return path.isAbsolute(dataDir) ? dataDir : path.join(process.cwd(), dataDir);
}

function getSessionPath() {
    return path.join(getDataDir(), SESSION_FILE);
}

/**
 * @param {string | string[] | undefined} header
 * @returns {Record<string, string>}
 */
function parseCookies(header) {
    return String(header || '')
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separator = part.indexOf('=');
            if (separator <= 0) return cookies;
            const name = part.slice(0, separator).trim();
            const value = part.slice(separator + 1).trim();
            cookies[name] = decodeURIComponent(value);
            return cookies;
        }, /** @type {Record<string, string>} */ ({}));
}

/** @returns {Promise<SessionFile>} */
async function loadSessions() {
    try {
        const content = await fs.readFile(getSessionPath(), 'utf-8');
        const parsed = JSON.parse(content);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

/** @param {SessionFile} sessions */
async function saveSessions(sessions) {
    saveLock = saveLock.catch(() => undefined).then(async () => {
        await fs.mkdir(getDataDir(), { recursive: true });
        await fs.writeFile(getSessionPath(), JSON.stringify(sessions, null, 2), {
            encoding: 'utf-8',
            mode: 0o600,
        });
    });
    return saveLock;
}

/**
 * @param {StoredHaSession | undefined} session
 * @param {number} [now]
 */
function isExpired(session, now = Date.now()) {
    const lastAccessed = new Date(session?.lastAccessedAt || session?.updatedAt || '').getTime();
    return !Number.isFinite(lastAccessed) || now - lastAccessed > SESSION_TTL_MS;
}

/**
 * @param {unknown} value
 * @returns {HaSessionTokens | null}
 */
function sanitizeSessionTokens(value) {
    if (!value || typeof value !== 'object') return null;
    const input = /** @type {Record<string, unknown>} */ (value);
    if (typeof input.hassUrl !== 'string') return null;
    if (typeof input.access_token !== 'string' || !input.access_token.trim()) return null;
    if (typeof input.refresh_token !== 'string' || !input.refresh_token.trim()) return null;

    let hassUrl;
    try {
        hassUrl = new URL(input.hassUrl);
    } catch {
        return null;
    }

    if (!['http:', 'https:'].includes(hassUrl.protocol)) return null;

    const expires = Number(input.expires);
    const expiresIn = Number(input.expires_in);

    return {
        hassUrl: hassUrl.origin,
        clientId: typeof input.clientId === 'string' ? input.clientId : null,
        expires: Number.isFinite(expires) ? expires : 0,
        refresh_token: input.refresh_token.trim(),
        access_token: input.access_token.trim(),
        expires_in: Number.isFinite(expiresIn) ? expiresIn : 0,
    };
}

/**
 * @param {HaSessionTokens} tokens
 * @param {number} [now]
 */
function isFresh(tokens, now = Date.now()) {
    return Number.isFinite(tokens.expires) && tokens.expires - now > TOKEN_REFRESH_SKEW_MS;
}

/** @param {import('node:http').IncomingMessage} req */
function getSessionIdFromRequest(req) {
    const cookies = parseCookies(req.headers.cookie);
    return cookies[HA_SESSION_COOKIE] || '';
}

/**
 * @param {HaSessionTokens} tokens
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<HaSessionTokens>}
 */
async function refreshTokens(tokens, fetchImpl = globalThis.fetch) {
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
    });

    if (tokens.clientId) {
        body.set('client_id', tokens.clientId);
    }

    const response = await fetchImpl(new URL('/auth/token', tokens.hassUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!response.ok) {
        throw new Error(`Home Assistant token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    const accessToken = typeof data.access_token === 'string' ? data.access_token.trim() : '';
    const refreshToken = typeof data.refresh_token === 'string' && data.refresh_token.trim()
        ? data.refresh_token.trim()
        : tokens.refresh_token;
    const expiresIn = Number(data.expires_in);

    if (!accessToken || !Number.isFinite(expiresIn) || expiresIn < 0) {
        throw new Error('Home Assistant token refresh response was invalid');
    }

    return {
        ...tokens,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        expires: Date.now() + expiresIn * 1000,
    };
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {{ sessionId?: string; fetchImpl?: typeof fetch }} [options]
 */
export async function loadFreshHaSessionTokensFromRequest(req, options = {}) {
    const sessionId = options.sessionId || getSessionIdFromRequest(req);
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

    let tokens = sanitizeSessionTokens(session.tokens);
    if (!tokens) return null;

    if (!isFresh(tokens)) {
        tokens = await refreshTokens(tokens, options.fetchImpl);
        sessions[sessionId] = {
            ...session,
            tokens,
            updatedAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
        };
        await saveSessions(sessions);
    } else {
        session.lastAccessedAt = new Date().toISOString();
        await saveSessions(sessions);
    }

    return {
        sessionId,
        tokens,
    };
}

/** @param {string} hassUrl */
export function getHomeAssistantWebSocketUrl(hassUrl) {
    const url = new URL('/api/websocket', hassUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url;
}
