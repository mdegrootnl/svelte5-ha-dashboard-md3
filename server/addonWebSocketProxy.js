import WebSocket from 'ws';

export const ADDON_BROWSER_TOKEN = '__dashboard_addon_browser__';
const DEFAULT_SUPERVISOR_WEBSOCKET_URL = 'ws://supervisor/core/websocket';

/**
 * @param {string | string[] | undefined} value
 */
function firstHeader(value) {
    return Array.isArray(value) ? value[0] : value;
}

/**
 * @param {string | undefined} value
 */
function parseList(value) {
    return (value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {NodeJS.ProcessEnv} [env]
 */
export function isPermittedAddonWebSocketOrigin(req, env = process.env) {
    const origin = firstHeader(req.headers.origin);
    if (!origin) return true;

    let parsedOrigin;
    try {
        parsedOrigin = new URL(origin);
    } catch {
        return false;
    }

    if (!['http:', 'https:'].includes(parsedOrigin.protocol)) return false;

    const explicitOrigins = new Set(parseList(env.DASHBOARD_WS_ALLOWED_ORIGINS));
    if (explicitOrigins.has(parsedOrigin.origin)) return true;

    const hostCandidates = [
        firstHeader(req.headers.host),
        firstHeader(req.headers['x-forwarded-host']),
        firstHeader(req.headers['x-original-host']),
    ].filter(Boolean);

    return hostCandidates.some((host) => parsedOrigin.host === host);
}

/**
 * @param {unknown} data
 * @param {boolean} isBinary
 * @param {string} supervisorToken
 */
function prepareInitialAuthFrame(data, isBinary, supervisorToken) {
    if (isBinary) return null;

    try {
        const parsed = JSON.parse(data?.toString() || '');
        if (parsed?.type === 'auth' && parsed.access_token === ADDON_BROWSER_TOKEN) {
            return JSON.stringify({ ...parsed, access_token: supervisorToken });
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
 * @param {import('ws').WebSocket} socket
 */
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
 * @param {import('ws').WebSocket} client
 * @param {{
 *   supervisorToken?: string;
 *   createUpstream?: () => import('ws').WebSocket;
 *   logger?: Pick<Console, 'error'>;
 * }} [options]
 */
export function proxyAddonWebSocket(client, options = {}) {
    const supervisorToken = options.supervisorToken ?? process.env.SUPERVISOR_TOKEN;
    if (!supervisorToken) {
        client.close(1011, 'Supervisor token unavailable');
        return;
    }

    const logger = options.logger || console;
    const createUpstream = options.createUpstream || (() => new WebSocket(DEFAULT_SUPERVISOR_WEBSOCKET_URL));
    const upstream = createUpstream();
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

    client.on('message', (data, isBinary) => {
        if (!authenticated) {
            const authFrame = prepareInitialAuthFrame(data, isBinary, supervisorToken);
            if (!authFrame) {
                closeBoth(1008, 'Invalid add-on websocket auth');
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
    });

    upstream.on('error', (error) => {
        logger.error('[Server] Supervisor websocket error:', error);
        closeBoth(1011, 'Supervisor websocket error');
    });

    client.on('error', () => closeBoth(1011, 'Client websocket error'));
    upstream.on('close', (code, reason) => closeBoth(code, reason.toString()));
    client.on('close', (code, reason) => closeBoth(code, reason.toString()));
}
