import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageProvider } from './storageProvider';

// Mock SvelteKit's $app/environment
vi.mock('$app/environment', () => ({
    browser: true
}));

describe('StorageProvider', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('saves tokens to the server session instead of browser storage', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        const tokens = {
            hassUrl: 'http://test',
            clientId: null,
            expires: Date.now() + 3600,
            refresh_token: 'test_refresh',
            access_token: 'test_token',
            expires_in: 1800
        };

        await StorageProvider.saveTokensToServer(tokens);

        expect(localStorage.getItem('hass_tokens')).toBeNull();
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/ha-session'), expect.objectContaining({
            method: 'POST',
            credentials: 'same-origin',
            body: JSON.stringify({ tokens }),
        }));
    });

    it('loads server session status without exposing tokens to browser storage code', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ connected: true, hassUrl: 'http://test' }),
        }));

        await expect(StorageProvider.loadSessionInfo()).resolves.toEqual({
            connected: true,
            hassUrl: 'http://test',
        });
        await expect(StorageProvider.loadTokens()).resolves.toBeNull();
    });

    it('migrates legacy local tokens into the server session once', async () => {
        const tokens = {
            hassUrl: 'http://test',
            clientId: null,
            expires: Date.now() + 3600,
            refresh_token: 'test_refresh',
            access_token: 'test_token',
            expires_in: 1800
        };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: false })
            .mockResolvedValueOnce({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        localStorage.setItem('hass_tokens', JSON.stringify(tokens));

        await expect(StorageProvider.loadTokens()).resolves.toBeNull();

        expect(localStorage.getItem('hass_tokens')).toBeNull();
        expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/api/ha-session'), expect.objectContaining({
            method: 'POST',
            credentials: 'same-origin',
        }));
    });

    it('can migrate legacy tokens and return browser-safe session info', async () => {
        const tokens = {
            hassUrl: 'http://test',
            clientId: null,
            expires: Date.now() + 3600,
            refresh_token: 'test_refresh',
            access_token: 'test_token',
            expires_in: 1800
        };
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        localStorage.setItem('hass_tokens', JSON.stringify(tokens));

        await expect(StorageProvider.migrateLegacyTokensToServer()).resolves.toEqual({
            connected: true,
            hassUrl: 'http://test',
        });

        expect(localStorage.getItem('hass_tokens')).toBeNull();
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/ha-session'), expect.objectContaining({
            method: 'POST',
            credentials: 'same-origin',
        }));
    });

    it('starts server-owned Home Assistant OAuth without browser token storage', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                authorizeUrl: 'http://ha.local:8123/auth/authorize?state=state',
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        await expect(StorageProvider.startServerAuth('http://ha.local:8123')).resolves.toEqual({
            authorizeUrl: 'http://ha.local:8123/auth/authorize?state=state',
        });

        expect(localStorage.getItem('hass_tokens')).toBeNull();
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/ha-session/auth/start'), expect.objectContaining({
            method: 'POST',
            credentials: 'same-origin',
            body: expect.stringContaining('"hassUrl":"http://ha.local:8123"'),
        }));
    });

    it('should return null for non-existent tokens', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
        await expect(StorageProvider.loadTokens()).resolves.toBeNull();
    });

    it('should save and load last URL', () => {
        const url = 'http://192.168.1.10:8123';
        StorageProvider.saveLastUrl(url);

        expect(StorageProvider.loadLastUrl()).toBe(url);
    });

    it('should clear storage', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        localStorage.setItem('hass_tokens', 'some-data');
        StorageProvider.saveLastUrl('http://test');

        StorageProvider.clear();

        await expect(StorageProvider.loadTokens()).resolves.toBeNull();
        expect(StorageProvider.loadLastUrl()).toBeNull();
        expect(localStorage.getItem('hass_tokens')).toBeNull();
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/ha-session'), expect.objectContaining({
            method: 'DELETE',
            credentials: 'same-origin',
        }));
    });
});
