import http from 'node:http';
import process from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';

const ADDON_BROWSER_TOKEN = '__dashboard_addon_browser__';
const INGRESS_PATH_PATTERN = /^\/api\/hassio_ingress\/[^/?#]+/;

if (!process.env.BODY_SIZE_LIMIT) {
    process.env.BODY_SIZE_LIMIT = '30M';
    console.log('[Server] Defaulting BODY_SIZE_LIMIT to 30M');
}

function firstHeader(value) {
    return Array.isArray(value) ? value[0] : value;
}

function normalizeIngressPath(value) {
    if (!value) return '';
    let path = String(value).trim();
    if (!path) return '';

    try {
        if (/^https?:\/\//i.test(path)) {
            path = new URL(path).pathname;
        }
    } catch {
        return '';
    }

    if (!path.startsWith('/')) path = `/${path}`;
    path = path.replace(/\/+$/, '');
    return path === '/' ? '' : path;
}

function detectIngressPath(pathname) {
    return normalizeIngressPath(pathname.match(INGRESS_PATH_PATTERN)?.[0] || '');
}

function normalizeRequestUrl(value) {
    const raw = value || '/';
    if (/^\/{2,}/.test(raw)) {
        const normalizedPath = raw.replace(/^\/+/, '');
        return `/${normalizedPath}`;
    }
    return raw;
}

function parseRequestUrl(req) {
    const normalizedUrl = normalizeRequestUrl(req.url);
    req.url = normalizedUrl;
    return new URL(normalizedUrl, 'http://dashboard.local');
}

function prepareIngressRequest(req) {
    const parsed = parseRequestUrl(req);
    const pathPrefix = detectIngressPath(parsed.pathname);
    const headerPrefix = normalizeIngressPath(
        firstHeader(req.headers['x-dashboard-ingress-path']) ||
        firstHeader(req.headers['x-ingress-path']),
    );
    const ingressPath = headerPrefix || pathPrefix;

    if (ingressPath) {
        req.headers['x-dashboard-ingress-path'] = ingressPath;
        req.headers['x-ingress-path'] ||= ingressPath;
    }

    if (pathPrefix) {
        const strippedPath = parsed.pathname === pathPrefix
            ? '/'
            : parsed.pathname.slice(pathPrefix.length) || '/';
        req.url = `${strippedPath === '/' ? '/dashboard' : strippedPath}${parsed.search}`;
        return;
    }

    if (ingressPath && parsed.pathname === '/') {
        req.url = `/dashboard${parsed.search}`;
    }
}

function isAddonDeployment() {
    return process.env.DASHBOARD_DEPLOYMENT === 'ha-addon' || Boolean(process.env.SUPERVISOR_TOKEN);
}

function isAddonWebSocketPath(req) {
    const parsed = parseRequestUrl(req);
    return parsed.pathname === '/api/addon/core/websocket';
}

function closeUpgrade(socket, status, message) {
    socket.write(
        `HTTP/1.1 ${status} ${message}\r\n` +
        'Connection: close\r\n' +
        'Content-Type: text/plain\r\n' +
        `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n` +
        message,
    );
    socket.destroy();
}

function proxyAddonWebSocket(client) {
    const supervisorToken = process.env.SUPERVISOR_TOKEN;
    if (!supervisorToken) {
        client.close(1011, 'Supervisor token unavailable');
        return;
    }

    const upstream = new WebSocket('ws://supervisor/core/websocket');
    const queued = [];
    let closed = false;

    function closeBoth(code = 1000, reason = '') {
        if (closed) return;
        closed = true;
        if (client.readyState === WebSocket.OPEN) client.close(code, reason);
        if (upstream.readyState === WebSocket.OPEN) upstream.close(code, reason);
    }

    function sendUpstream(data, isBinary) {
        if (upstream.readyState === WebSocket.OPEN) {
            upstream.send(data, { binary: isBinary });
            return;
        }
        queued.push([data, isBinary]);
    }

    upstream.on('open', () => {
        for (const [data, isBinary] of queued.splice(0)) {
            upstream.send(data, { binary: isBinary });
        }
    });

    upstream.on('message', (data, isBinary) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data, { binary: isBinary });
        }
    });

    client.on('message', (data, isBinary) => {
        if (!isBinary) {
            try {
                const parsed = JSON.parse(data.toString());
                if (parsed?.type === 'auth' && parsed.access_token === ADDON_BROWSER_TOKEN) {
                    sendUpstream(
                        JSON.stringify({ ...parsed, access_token: supervisorToken }),
                        false,
                    );
                    return;
                }
            } catch {
                // Non-JSON frames are forwarded unchanged.
            }
        }

        sendUpstream(data, isBinary);
    });

    upstream.on('error', (error) => {
        console.error('[Server] Supervisor websocket error:', error);
        closeBoth(1011, 'Supervisor websocket error');
    });

    client.on('error', () => closeBoth(1011, 'Client websocket error'));
    upstream.on('close', (code, reason) => closeBoth(code, reason.toString()));
    client.on('close', (code, reason) => closeBoth(code, reason.toString()));
}

const { handler } = await import(pathToFileURL(resolve('./build/handler.js')).href);
const httpServer = http.createServer((req, res) => {
    prepareIngressRequest(req);
    handler(req, res);
});
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (req, socket, head) => {
    prepareIngressRequest(req);

    if (!isAddonDeployment() || !isAddonWebSocketPath(req)) {
        closeUpgrade(socket, 404, 'Not Found');
        return;
    }

    wss.handleUpgrade(req, socket, head, (client) => {
        proxyAddonWebSocket(client);
    });
});

const path = process.env.SOCKET_PATH || undefined;
const host = process.env.HOST || '0.0.0.0';
const port = path ? undefined : Number(process.env.PORT || 3000);

function listen() {
    if (path) {
        httpServer.listen({ path }, () => {
            console.log(`Listening on socket ${path}`);
        });
        return;
    }

    httpServer.listen({ host, port }, () => {
        console.log(`Listening on http://${host}:${port}`);
    });
}

function shutdown(signal) {
    console.log(`[Server] ${signal} received, shutting down`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 30_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

listen();
