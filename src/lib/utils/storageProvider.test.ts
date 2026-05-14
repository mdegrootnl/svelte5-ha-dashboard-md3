import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageProvider } from './storageProvider';

// Mock SvelteKit's $app/environment
vi.mock('$app/environment', () => ({
    browser: true
}));

describe('StorageProvider', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should save and load tokens', () => {
        const tokens = {
            hassUrl: 'http://test',
            clientId: null,
            expires: Date.now() + 3600,
            refresh_token: 'test_refresh',
            access_token: 'test_token',
            expires_in: 1800
        };
        StorageProvider.saveTokens(tokens);

        const loaded = StorageProvider.loadTokens();
        expect(loaded).toEqual(tokens);
    });

    it('should return null for non-existent tokens', () => {
        expect(StorageProvider.loadTokens()).toBeNull();
    });

    it('should save and load last URL', () => {
        const url = 'http://192.168.1.10:8123';
        StorageProvider.saveLastUrl(url);

        expect(StorageProvider.loadLastUrl()).toBe(url);
    });

    it('should clear storage', () => {
        StorageProvider.saveTokens({
            hassUrl: 'http://test',
            clientId: null,
            expires: Date.now() + 3600,
            refresh_token: 'test_refresh',
            access_token: 'test_token',
            expires_in: 1800
        });
        StorageProvider.saveLastUrl('http://test');

        StorageProvider.clear();

        expect(StorageProvider.loadTokens()).toBeNull();
        expect(StorageProvider.loadLastUrl()).toBeNull();
    });
});
