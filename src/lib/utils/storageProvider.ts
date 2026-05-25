import { browser } from '$app/environment';
import { createLogger } from '../utils/logger';
import type { AuthData } from 'home-assistant-js-websocket';
import { withBase } from '$lib/utils/appBase';

const logger = createLogger('StorageProvider');

const KEYS = {
    TOKENS: 'hass_tokens',
    LAST_URL: 'last_hass_url'
};

/** Home Assistant authentication tokens */
export type HATokens = AuthData;

export interface HASessionInfo {
    connected: boolean;
    hassUrl: string | null;
}

export interface HAAuthStartResponse {
    authorizeUrl: string;
}

/** Weather store configuration */
export interface WeatherConfig {
    weatherEntityId?: string;
    aqiEntityId?: string;
}

/**
 * Encapsulates all persistent storage interactions.
 */
export class StorageProvider {
    private static sessionUrl() {
        return this.apiUrl('/api/ha-session');
    }

    private static apiUrl(pathname: string) {
        const path = withBase(pathname);
        if (typeof window !== 'undefined' && window.location?.origin && path?.startsWith('/')) {
            return new URL(path, window.location.origin).toString();
        }
        return path;
    }

    /**
     * Save Home Assistant tokens.
     */
    static saveTokens(tokens: HATokens | null): void {
        if (!browser) return;

        if (tokens) {
            void this.saveTokensToServer(tokens);
            return;
        }

        this.clearLegacyTokenStorage();
        void this.clearServerSession();
    }

    /**
     * Load Home Assistant tokens.
     */
    static async loadTokens(): Promise<HATokens | null> {
        if (!browser) return null;

        const serverSession = await this.loadSessionInfo();
        if (serverSession.connected) {
            this.clearLegacyTokenStorage();
            return null;
        }

        const legacyTokens = this.loadLegacyTokens();
        if (legacyTokens) {
            await this.saveTokensToServer(legacyTokens);
            this.clearLegacyTokenStorage();
            return null;
        }

        return null;
    }

    static async saveTokensToServer(tokens: HATokens): Promise<void> {
        if (!browser) return;
        try {
            const response = await fetch(this.sessionUrl(), {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokens }),
            });

            if (!response.ok) {
                throw new Error(`Session save failed: ${response.status}`);
            }

            this.clearLegacyTokenStorage();
        } catch (e) {
            logger.error('Failed to save tokens to server session', e);
        }
    }

    static async loadSessionInfo(): Promise<HASessionInfo> {
        if (!browser) return { connected: false, hassUrl: null };
        try {
            const response = await fetch(this.sessionUrl(), {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) return { connected: false, hassUrl: null };

            const body = await response.json() as Partial<HASessionInfo>;
            return {
                connected: body.connected === true,
                hassUrl: typeof body.hassUrl === 'string' ? body.hassUrl : null,
            };
        } catch {
            return { connected: false, hassUrl: null };
        }
    }

    static async loadTokensFromServer(): Promise<HATokens | null> {
        return null;
    }

    static async startServerAuth(hassUrl: string): Promise<HAAuthStartResponse> {
        if (!browser) {
            throw new Error('Home Assistant login can only start in the browser');
        }

        const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const response = await fetch(this.apiUrl('/api/ha-session/auth/start'), {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ hassUrl, returnTo }),
        });

        const body = await response.json().catch(() => ({})) as Partial<HAAuthStartResponse> & { error?: string };
        if (!response.ok || typeof body.authorizeUrl !== 'string') {
            throw new Error(body.error || `Home Assistant auth start failed: ${response.status}`);
        }

        return { authorizeUrl: body.authorizeUrl };
    }

    static async migrateLegacyTokensToServer(): Promise<HASessionInfo | null> {
        if (!browser) return null;
        const legacyTokens = this.loadLegacyTokens();
        if (!legacyTokens) return null;

        await this.saveTokensToServer(legacyTokens);
        this.clearLegacyTokenStorage();
        return {
            connected: true,
            hassUrl: legacyTokens.hassUrl,
        };
    }

    static async clearServerSession(): Promise<void> {
        if (!browser) return;
        try {
            await fetch(this.sessionUrl(), {
                method: 'DELETE',
                credentials: 'same-origin',
            });
        } catch (e) {
            logger.error('Failed to clear server session', e);
        } finally {
            this.clearLegacyTokenStorage();
        }
    }

    private static loadLegacyTokens(): HATokens | null {
        try {
            const tokens = localStorage.getItem(KEYS.TOKENS);
            return tokens ? JSON.parse(tokens) as HATokens : null;
        } catch (e) {
            logger.error('Failed to load tokens', e);
            return null;
        }
    }

    private static clearLegacyTokenStorage(): void {
        try {
            localStorage.removeItem(KEYS.TOKENS);
        } catch (e) {
            logger.error('Failed to clear legacy token storage', e);
        }
    }

    /**
     * Save the last successfully used Home Assistant URL.
     */
    static saveLastUrl(url: string): void {
        if (!browser) return;
        localStorage.setItem(KEYS.LAST_URL, url);
    }

    /**
     * Load the last successfully used Home Assistant URL.
     */
    static loadLastUrl(): string | null {
        if (!browser) return null;
        return localStorage.getItem(KEYS.LAST_URL);
    }

    /**
     * Clear all Home Assistant related storage.
     */
    static clear(): void {
        if (!browser) return;
        this.clearLegacyTokenStorage();
        void this.clearServerSession();
        localStorage.removeItem(KEYS.LAST_URL);
    }

    /**
     * Save Weather Configuration.
     */
    static saveWeatherConfig(config: WeatherConfig): void {
        if (!browser) return;
        try {
            localStorage.setItem('weather_config', JSON.stringify(config));
        } catch (e) {
            logger.error('Failed to save weather config', e);
        }
    }

    /**
     * Load Weather Configuration.
     */
    static loadWeatherConfig(): WeatherConfig | null {
        if (!browser) return null;
        try {
            const config = localStorage.getItem('weather_config');
            return config ? JSON.parse(config) as WeatherConfig : null;
        } catch (e) {
            logger.error('Failed to load weather config', e);
            return null;
        }
    }
}
