import { type Auth, ERR_HASS_HOST_REQUIRED } from 'home-assistant-js-websocket';
import { browser } from '$app/environment';
import { StorageProvider } from '../utils/storageProvider';
import { createLogger } from '../utils/logger';
import { ADDON_BROWSER_TOKEN, STANDALONE_BROWSER_TOKEN, type DeploymentInfo } from '$lib/shared/deployment';
import { makeAppWebSocketUrl, withBase } from '$lib/utils/appBase';

const logger = createLogger('HAAuthService');

/**
 * Service for managing Home Assistant authentication.
 */
export class HAAuthService {
    /**
     * Attempt to initialize authentication from stored tokens.
     */
    static async initialize(deployment?: DeploymentInfo): Promise<Auth | null> {
        if (deployment?.mode === 'ha-addon' && deployment.zeroConfigAvailable) {
            return this.createAddonAuth();
        }

        try {
            const session = await StorageProvider.loadSessionInfo();
            if (session.connected && session.hassUrl) {
                return this.createStandaloneProxyAuth(session.hassUrl);
            }

            const migrated = await StorageProvider.migrateLegacyTokensToServer();
            if (migrated?.connected && migrated.hassUrl) {
                return this.createStandaloneProxyAuth(migrated.hassUrl);
            }

            return null;
        } catch (err) {
            if (err !== ERR_HASS_HOST_REQUIRED) {
                logger.error("Auth Initialization Error:", err);
            }
            return null;
        }
    }

    /**
     * Start the login flow for a specific Home Assistant URL.
     */
    static async login(hassUrl: string): Promise<Auth> {
        logger.info("Starting login flow for:", hassUrl);
        try {
            const { authorizeUrl } = await StorageProvider.startServerAuth(hassUrl);
            this.redirectToAuthorizeUrl(authorizeUrl);
            return new Promise<Auth>(() => undefined);
        } catch (err) {
            logger.error("Login failed:", err);
            throw err;
        }
    }

    static redirectToAuthorizeUrl(authorizeUrl: string): void {
        if (!browser) return;
        window.location.assign(authorizeUrl);
    }

    static createAddonAuth(): Auth {
        const hassUrl = browser ? window.location.origin : 'http://localhost';

        return {
            data: {
                hassUrl,
                clientId: 'ha-dashboard-md3-addon',
                expires: Number.MAX_SAFE_INTEGER,
                refresh_token: '',
                access_token: ADDON_BROWSER_TOKEN,
                expires_in: Number.MAX_SAFE_INTEGER
            },
            get wsUrl() {
                return makeAppWebSocketUrl('/api/addon/core/websocket');
            },
            get accessToken() {
                return ADDON_BROWSER_TOKEN;
            },
            get expired() {
                return false;
            },
            refreshAccessToken: async () => undefined,
            revoke: async () => undefined
        } as Auth;
    }

    static createStandaloneProxyAuth(hassUrl: string): Auth {
        return {
            data: {
                hassUrl,
                clientId: 'ha-dashboard-md3-standalone-session',
                expires: Number.MAX_SAFE_INTEGER,
                refresh_token: '',
                access_token: STANDALONE_BROWSER_TOKEN,
                expires_in: Number.MAX_SAFE_INTEGER
            },
            get wsUrl() {
                return makeAppWebSocketUrl('/api/ha-websocket');
            },
            get accessToken() {
                return STANDALONE_BROWSER_TOKEN;
            },
            get expired() {
                return false;
            },
            refreshAccessToken: async () => undefined,
            revoke: async () => undefined
        } as Auth;
    }

    /**
     * Format a URL with protocol and port.
     */
    static formatUrl(host: string, port: string = "8123"): string {
        let url = host.trim();
        if (!url.startsWith("http")) {
            url = `https://${url}`;
        }
        url = url.replace(/\/$/, "");
        if (port && port.trim() !== "" && !url.match(/:\d+$/)) {
            url = `${url}:${port.trim()}`;
        }
        return url;
    }

    /**
     * Get a proxied URL for a Home Assistant resource.
     */
    private static normalizeResourcePath(path: string, baseUrl: string | null): { path: string; shouldProxy: boolean } {
        if (path.startsWith('http')) {
            if (!baseUrl || !path.startsWith(baseUrl)) {
                return { path, shouldProxy: false };
            }
            return { path: path.replace(baseUrl, '') || '/', shouldProxy: true };
        }

        if (path.startsWith('/api/uploads/') || path.startsWith('/api/room-previews/')) {
            return { path: withBase(path), shouldProxy: false };
        }

        return { path, shouldProxy: true };
    }

    static getProxiedUrl(path: string | null, baseUrl: string | null, token: string | undefined): string | null {
        if (!path) return null;
        if (!token || !baseUrl) return withBase(path);

        // Debug logging for MA images
        if (path.includes('music_assistant') || path.includes('mass')) {
            logger.debug('Proxying MA URL:', { input: path });
        }

        const normalized = this.normalizeResourcePath(path, baseUrl);
        if (!normalized.shouldProxy) return normalized.path;

        const proxied = withBase(`/api/ha-proxy?path=${encodeURIComponent(normalized.path)}`);
        if (path.includes('music_assistant')) logger.debug('Proxied result:', proxied);
        return proxied;
    }

    static async fetchProxiedBlobUrl(path: string | null, baseUrl: string | null, token: string | undefined): Promise<string | null> {
        if (!path) return null;
        if (!token || !baseUrl) return withBase(path);

        if (path.startsWith('/api/ha-proxy')) {
            const response = await fetch(withBase(path), {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch proxied resource: ${response.status}`);
            }

            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }

        const normalized = this.normalizeResourcePath(path, baseUrl);
        if (!normalized.shouldProxy) return normalized.path;

        const response = await fetch(withBase(`/api/ha-proxy?path=${encodeURIComponent(normalized.path)}`), {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch proxied resource: ${response.status}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }
}
