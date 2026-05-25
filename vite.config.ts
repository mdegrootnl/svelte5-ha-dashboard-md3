import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig, type Plugin } from 'vite';
import { WebSocketServer } from 'ws';
import {
	isPermittedAddonWebSocketOrigin,
	proxyAddonWebSocket
} from './server/addonWebSocketProxy.js';
import { proxyStandaloneWebSocket } from './server/standaloneWebSocketProxy.js';

const INGRESS_PATH_PATTERN = /^\/api\/hassio_ingress\/[^/?#]+/;

function normalizedUpgradePath(rawUrl: string | undefined) {
	const raw = rawUrl || '/';
	const normalized = /^\/{2,}/.test(raw) ? `/${raw.replace(/^\/+/, '')}` : raw;
	const parsed = new URL(normalized, 'http://dashboard.local');
	const ingressPath = parsed.pathname.match(INGRESS_PATH_PATTERN)?.[0] || '';
	const pathname = ingressPath
		? parsed.pathname.slice(ingressPath.length) || '/'
		: parsed.pathname;

	return pathname;
}

function closeUpgrade(socket: import('node:net').Socket, status: number, message: string) {
	socket.write(
		`HTTP/1.1 ${status} ${message}\r\n` +
			'Connection: close\r\n' +
			'Content-Type: text/plain\r\n' +
			`Content-Length: ${Buffer.byteLength(message)}\r\n\r\n` +
			message
	);
	socket.destroy();
}

function dashboardDevWebSocketProxy(): Plugin {
	return {
		name: 'dashboard-dev-websocket-proxy',
		configureServer(server) {
			const httpServer = server.httpServer;
			if (!httpServer) return;

			const wss = new WebSocketServer({ noServer: true });

			httpServer.on('upgrade', (req, socket, head) => {
				const pathname = normalizedUpgradePath(req.url);
				const isAddonDeployment =
					process.env.DASHBOARD_DEPLOYMENT === 'ha-addon' || Boolean(process.env.SUPERVISOR_TOKEN);
				const shouldHandleAddon = isAddonDeployment && pathname === '/api/addon/core/websocket';
				const shouldHandleStandalone = !isAddonDeployment && pathname === '/api/ha-websocket';

				if (!shouldHandleAddon && !shouldHandleStandalone) return;

				if (!isPermittedAddonWebSocketOrigin(req)) {
					closeUpgrade(socket, 403, 'Forbidden');
					return;
				}

				wss.handleUpgrade(req, socket, head, (client) => {
					if (shouldHandleAddon) {
						proxyAddonWebSocket(client);
						return;
					}

					void proxyStandaloneWebSocket(client, req);
				});
			});
		}
	};
}

export default defineConfig({
	plugins: [dashboardDevWebSocketProxy(), tailwindcss(), sveltekit(), Icons({ compiler: 'svelte' })],
	optimizeDeps: {
		include: [
			'@internationalized/date',
			'@material/material-color-utilities',
			'bits-ui',
			'd3-scale',
			'd3-shape',
			'home-assistant-js-websocket',
			'leaflet',
			'zod'
		]
	},
	server: {
		watch: {
			ignored: ['**/build/**', '**/.svelte-kit/output/**', '**/coverage/**']
		}
	}
});
