import {
    getAuth,
    type Auth,
    ERR_HASS_HOST_REQUIRED
} from 'home-assistant-js-websocket';
import { StorageProvider } from '../utils/storageProvider';
import { createLogger } from '../utils/logger';

const logger = createLogger('HAAuthService');

/**
 * Service for managing Home Assistant authentication.
 */
export class HAAuthService {
    /**
     * Attempt to initialize authentication from stored tokens.
     */
    static async initialize(): Promise<Auth | null> {
        try {
            const auth = await getAuth({
                saveTokens: (tokens) => StorageProvider.saveTokens(tokens),
                loadTokens: async () => StorageProvider.loadTokens()
            });
            return auth;
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
            const auth = await getAuth({
                hassUrl,
                saveTokens: (tokens) => StorageProvider.saveTokens(tokens),
                loadTokens: async () => StorageProvider.loadTokens()
            });
            return auth;
        } catch (err) {
            logger.error("Login failed:", err);
            throw err;
        }
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

        if (path.startsWith('/api/uploads/')) {
            return { path, shouldProxy: false };
        }

        return { path, shouldProxy: true };
    }

    static getProxiedUrl(path: string | null, baseUrl: string | null, token: string | undefined): string | null {
        if (!path) return null;
        if (!token || !baseUrl) return path;

        // Debug logging for MA images
        if (path.includes('music_assistant') || path.includes('mass')) {
            logger.debug('Proxying MA URL:', { input: path });
        }

        const normalized = this.normalizeResourcePath(path, baseUrl);
        if (!normalized.shouldProxy) return normalized.path;

        const proxied = `/api/ha-proxy?path=${encodeURIComponent(normalized.path)}`;
        if (path.includes('music_assistant')) logger.debug('Proxied result:', proxied);
        return proxied;
    }

    static async fetchProxiedBlobUrl(path: string | null, baseUrl: string | null, token: string | undefined): Promise<string | null> {
        if (!path) return null;
        if (!token || !baseUrl) return path;

        const normalized = this.normalizeResourcePath(path, baseUrl);
        if (!normalized.shouldProxy) return normalized.path;

        const response = await fetch(`/api/ha-proxy?path=${encodeURIComponent(normalized.path)}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-ha-url': baseUrl
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch proxied resource: ${response.status}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }
}
