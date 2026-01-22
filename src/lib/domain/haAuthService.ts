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
                loadTokens: () => StorageProvider.loadTokens()
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
                loadTokens: () => StorageProvider.loadTokens()
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
    static getProxiedUrl(path: string | null, baseUrl: string | null, token: string | undefined): string | null {
        if (!path) return null;
        if (!token || !baseUrl) return path;

        // Debug logging for MA images
        if (path.includes('music_assistant') || path.includes('mass')) {
            logger.debug('Proxying MA URL:', { input: path });
        }

        // If it's an absolute URL, check if it's our HA URL
        if (path.startsWith('http')) {
            // If it's not our HA URL, return as is (CSP now allows it)
            if (!baseUrl || !path.startsWith(baseUrl)) {
                return path;
            }

            // It IS our HA URL but absolute, we should still proxy it to add the token
            // Strip the base URL to make it relative for the proxy
            path = path.replace(baseUrl, '');
        }

        const proxied = `/api/ha-proxy?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}&url=${encodeURIComponent(baseUrl)}`;
        if (path.includes('music_assistant')) logger.debug('Proxied result:', proxied);
        return proxied;
    }
}
