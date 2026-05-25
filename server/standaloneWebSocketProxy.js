import WebSocket from 'ws';
import {
    getHomeAssistantWebSocketUrl,
    loadFreshHaSessionTokensFromRequest,
} from './haSessionStore.js';

export const STANDALONE_BROWSER_TOKEN = '__dashboard_ha_session__';

/** @param {import('ws').WebSocket} socket */
function canClose(socket) {
    return socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING;
}

/**
 * The ws library may report reserved received close codes such as 1005/1006.
 * Those codes must not be sent back in an outgoing close frame.
 * @param {number | undefined} code
 */
function canSendCloseCode(code) {
    return code === 1000 ||
        (typeof code === 'number' && code >= 1001 && code <= 1014 && ![1004, 1005, 1006].includes(code)) ||
        (typeof code === 'number' && code >= 3000 && code <= 4999);
}

/**
 * @param {import('ws').WebSocket} socket
 * @param {number | undefined} code
 * @param {string | undefined} reason
 */
function closeSocket(socket, code, reason = '') {
    if (!canClose(socket)) return;
    if (canSendCloseCode(code)) {
        socket.close(code, reason);
        return;
    }

    socket.close();
}

/**
 * @param {unknown} data
 * @param {boolean} isBinary
 * @param {string} accessToken
 */
function prepareInitialAuthFrame(data, isBinary, accessToken) {
    if (isBinary) return null;

    try {
        const parsed = JSON.parse(data?.toString() || '');
        if (parsed?.type === 'auth' && parsed.access_token === STANDALONE_BROWSER_TOKEN) {
            return JSON.stringify({ ...parsed, access_token: accessToken });
        }
    } catch {
        return null;
    }

    return null;
}

/**
 * @param {unknown} data
 * @param {boolean} isBinary
 */
function isAuthRequiredFrame(data, isBinary) {
    if (isBinary) return false;

    try {
        const parsed = JSON.parse(data?.toString() || '');
        return parsed?.type === 'auth_required';
    } catch {
        return false;
    }
}

/**
 * @param {unknown} data
 * @param {boolean} isBinary
 */
function isAuthOkFrame(data, isBinary) {
    if (isBinary) return false;

    try {
        const parsed = JSON.parse(data?.toString() || '');
        return parsed?.type === 'auth_ok';
    } catch {
        return false;
    }
}

/**
 * @param {import('ws').WebSocket} client
 * @param {import('node:http').IncomingMessage} req
 * @param {{
 *   resolveSession?: (req: import('node:http').IncomingMessage) => Promise<{ tokens?: { hassUrl?: string; access_token?: string } } | null>;
 *   createUpstream?: (url: string) => import('ws').WebSocket;
 *   logger?: Pick<Console, 'error'>;
 * }} [options]
 */
export async function proxyStandaloneWebSocket(client, req, options = {}) {
    const logger = options.logger || console;
    /** @type {Array<[import('ws').RawData | string, boolean]>} */
    const earlyClientFrames = [];
    /** @type {((data: import('ws').RawData | string, isBinary: boolean) => void) | null} */
    let handleClientMessage = null;

    client.on('message', (data, isBinary) => {
        if (!handleClientMessage) {
            earlyClientFrames.push([data, isBinary]);
            return;
        }

        handleClientMessage(data, isBinary);
    });

    let session;

    try {
        session = options.resolveSession
            ? await options.resolveSession(req)
            : await loadFreshHaSessionTokensFromRequest(req);
    } catch (error) {
        logger.error('[Server] Home Assistant websocket session failed:', error);
        client.close(1011, 'Home Assistant session unavailable');
        return;
    }

    const tokens = session?.tokens;
    if (!tokens?.access_token || !tokens?.hassUrl) {
        client.close(1008, 'Home Assistant session unavailable');
        return;
    }

    const accessToken = tokens.access_token;
    const upstreamUrl = String(getHomeAssistantWebSocketUrl(tokens.hassUrl));
    /** @type {(url: string) => import('ws').WebSocket} */
    const createUpstream = options.createUpstream || ((url) => new WebSocket(url));
    const upstream = createUpstream(upstreamUrl);
    /** @type {Array<[import('ws').RawData | string, boolean]>} */
    const queued = [];
    /** @type {Array<[import('ws').RawData | string, boolean]>} */
    const deferredClientFrames = [];
    let authenticated = false;
    let upstreamReadyForAuth = false;
    let upstreamAuthenticated = false;
    /** @type {string | null} */
    let pendingInitialAuthFrame = null;
    let closed = false;

    /**
     * @param {number} [code]
     * @param {string} [reason]
     */
    function closeBoth(code = 1000, reason = '') {
        if (closed) return;
        closed = true;
        closeSocket(client, code, reason);
        closeSocket(upstream, code, reason);
    }

    /**
     * @param {import('ws').RawData | string} data
     * @param {boolean} isBinary
     */
    function sendUpstream(data, isBinary) {
        if (upstream.readyState === WebSocket.OPEN) {
            upstream.send(data, { binary: isBinary });
            return;
        }
        queued.push([data, isBinary]);
    }

    /** @param {string} authFrame */
    function sendInitialAuth(authFrame) {
        if (!upstreamReadyForAuth) {
            pendingInitialAuthFrame = authFrame;
            return;
        }

        sendUpstream(authFrame, false);
    }

    function flushDeferredClientFrames() {
        for (const [data, isBinary] of deferredClientFrames.splice(0)) {
            sendUpstream(data, isBinary);
        }
    }

    upstream.on('open', () => {
        for (const [data, isBinary] of queued.splice(0)) {
            upstream.send(data, { binary: isBinary });
        }
    });

    upstream.on('message', (data, isBinary) => {
        if (isAuthRequiredFrame(data, isBinary)) {
            upstreamReadyForAuth = true;
        }
        if (isAuthOkFrame(data, isBinary)) {
            upstreamAuthenticated = true;
        }

        if (client.readyState === WebSocket.OPEN) {
            client.send(data, { binary: isBinary });
        }

        if (upstreamReadyForAuth && pendingInitialAuthFrame) {
            const authFrame = pendingInitialAuthFrame;
            pendingInitialAuthFrame = null;
            sendUpstream(authFrame, false);
        }
        if (upstreamAuthenticated) {
            flushDeferredClientFrames();
        }
    });

    handleClientMessage = (data, isBinary) => {
        if (!authenticated) {
            const authFrame = prepareInitialAuthFrame(data, isBinary, accessToken);
            if (!authFrame) {
                closeBoth(1008, 'Invalid Home Assistant websocket auth');
                return;
            }

            authenticated = true;
            sendInitialAuth(authFrame);
            return;
        }

        if (!upstreamAuthenticated) {
            deferredClientFrames.push([data, isBinary]);
            return;
        }

        sendUpstream(data, isBinary);
    };

    for (const [data, isBinary] of earlyClientFrames.splice(0)) {
        handleClientMessage(data, isBinary);
    }

    upstream.on('error', (error) => {
        logger.error('[Server] Home Assistant websocket error:', error);
        closeBoth(1011, 'Home Assistant websocket error');
    });

    client.on('error', () => closeBoth(1011, 'Client websocket error'));
    upstream.on('close', (code, reason) => closeBoth(code, reason.toString()));
    client.on('close', (code, reason) => closeBoth(code, reason.toString()));
}
