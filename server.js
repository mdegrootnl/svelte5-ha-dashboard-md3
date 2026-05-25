import http from 'node:http';
import process from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import {
    isPermittedAddonWebSocketOrigin,
    proxyAddonWebSocket,
} from './server/addonWebSocketProxy.js';
import { proxyStandaloneWebSocket } from './server/standaloneWebSocketProxy.js';

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

function isStandaloneWebSocketPath(req) {
    const parsed = parseRequestUrl(req);
    return parsed.pathname === '/api/ha-websocket';
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

const { handler } = await import(pathToFileURL(resolve('./build/handler.js')).href);
const httpServer = http.createServer((req, res) => {
    prepareIngressRequest(req);
    handler(req, res);
});
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (req, socket, head) => {
    prepareIngressRequest(req);

    if (isAddonDeployment() && isAddonWebSocketPath(req)) {
        if (!isPermittedAddonWebSocketOrigin(req)) {
            closeUpgrade(socket, 403, 'Forbidden');
            return;
        }

        wss.handleUpgrade(req, socket, head, (client) => {
            proxyAddonWebSocket(client);
        });
        return;
    }

    if (!isAddonDeployment() && isStandaloneWebSocketPath(req)) {
        if (!isPermittedAddonWebSocketOrigin(req)) {
            closeUpgrade(socket, 403, 'Forbidden');
            return;
        }

        wss.handleUpgrade(req, socket, head, (client) => {
            void proxyStandaloneWebSocket(client, req);
        });
        return;
    }

    {
        closeUpgrade(socket, 404, 'Not Found');
        return;
    }
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
