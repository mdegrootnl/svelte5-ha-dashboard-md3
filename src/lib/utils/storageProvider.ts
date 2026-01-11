import { browser } from '$app/environment';
import { createLogger } from '../utils/logger';

const logger = createLogger('StorageProvider');

const KEYS = {
    TOKENS: 'hass_tokens',
    LAST_URL: 'last_hass_url'
};

/**
 * Encapsulates all persistent storage interactions.
 */
export class StorageProvider {
    /**
     * Save Home Assistant tokens.
     */
    static saveTokens(tokens: any): void {
        if (!browser) return;
        try {
            localStorage.setItem(KEYS.TOKENS, JSON.stringify(tokens));
        } catch (e) {
            logger.error('Failed to save tokens', e);
        }
    }

    /**
     * Load Home Assistant tokens.
     */
    static loadTokens(): any | null {
        if (!browser) return null;
        try {
            const tokens = localStorage.getItem(KEYS.TOKENS);
            return tokens ? JSON.parse(tokens) : null;
        } catch (e) {
            logger.error('Failed to load tokens', e);
            return null;
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
        localStorage.removeItem(KEYS.TOKENS);
        localStorage.removeItem(KEYS.LAST_URL);
    }
}
