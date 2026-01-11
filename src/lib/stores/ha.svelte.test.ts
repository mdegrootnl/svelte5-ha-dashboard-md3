import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HAStore } from './ha.svelte';
import * as haWS from 'home-assistant-js-websocket';

// Mock the WS library specifically for this test to control return values
vi.mock('home-assistant-js-websocket', () => ({
    getAuth: vi.fn(),
    createConnection: vi.fn(),
    subscribeEntities: vi.fn(),
    subscribeConfig: vi.fn(),
    callService: vi.fn(),
    ERR_HASS_HOST_REQUIRED: 'ERR_HASS_HOST_REQUIRED'
}));

describe('HAStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // Prevent constructor init from doing anything by default
        vi.mocked(haWS.getAuth).mockResolvedValue(null as any);
    });

    it('should have initial state', () => {
        const store = new HAStore();
        expect(store.connection).toBeNull();
        expect(store.auth).toBeNull();
        expect(store.states).toEqual({});
        expect(store.connected).toBe(false);
        expect(store.connectionState).toBe('disconnected');
        expect(store.connectionError).toBeNull();
    });

    it('should load tokens from localStorage', async () => {
        const store = new HAStore();
        const tokens = { access_token: 'abc' };
        localStorage.setItem('hass_tokens', JSON.stringify(tokens));

        const loaded = await store.loadTokens();
        expect(loaded).toEqual(tokens);
    });

    it('should save tokens to localStorage', () => {
        const store = new HAStore();
        const tokens = { access_token: 'abc' };
        store.saveTokens(tokens);

        expect(localStorage.getItem('hass_tokens')).toBe(JSON.stringify(tokens));
    });

    it('should login and connect', async () => {
        const store = new HAStore();
        const mockAuth = { data: { hassUrl: 'https://localhost:8123' } };
        const mockConnection = { close: vi.fn(), addEventListener: vi.fn() };

        vi.mocked(haWS.getAuth).mockResolvedValue(mockAuth as any);
        vi.mocked(haWS.createConnection).mockResolvedValue(mockConnection as any);

        await store.login('localhost');

        expect(haWS.getAuth).toHaveBeenCalledWith(expect.objectContaining({ hassUrl: 'https://localhost:8123' }));
        // Svelte 5 proxies mean we should check content rather than identity
        expect(store.auth).toEqual(mockAuth);
        expect(store.connection).toEqual(mockConnection);
        expect(store.url).toBe('https://localhost:8123');
        expect(store.connectionState).toBe('connected');
        expect(haWS.subscribeEntities).toHaveBeenCalled();
    });


    it('should set connection state to error on failed login', async () => {
        const store = new HAStore();
        vi.mocked(haWS.getAuth).mockRejectedValue(new Error('Invalid credentials'));

        await expect(store.login('localhost')).rejects.toThrow('Invalid credentials');

        expect(store.connectionState).toBe('error');
        expect(store.connectionError).toBe('Invalid credentials');
    });


    it('should clear error state with clearError', () => {
        const store = new HAStore();
        store.connectionState = 'error' as any;
        store.connectionError = 'Some error';

        store.clearError();

        expect(store.connectionState).toBe('disconnected');
        expect(store.connectionError).toBeNull();
    });

    it('should get entity by ID', () => {
        const store = new HAStore();
        const entity = { entity_id: 'light.test', state: 'on', attributes: {} };
        store.states = { 'light.test': entity as any };

        expect(store.getEntity('light.test')).toEqual(entity);
        expect(store.getEntity('non.existent')).toBeUndefined();
    });

    it('should disconnect and clear state', async () => {
        const store = new HAStore();
        const mockConnection = { close: vi.fn() };
        store.connection = mockConnection as any;
        store.auth = { some: 'data' } as any;
        store.connectionState = 'connected' as any;
        localStorage.setItem('hass_tokens', 'some-data');

        await store.disconnect();

        expect(mockConnection.close).toHaveBeenCalled();
        expect(store.connection).toBeNull();
        expect(store.auth).toBeNull();
        expect(store.connectionState).toBe('disconnected');
        expect(localStorage.getItem('hass_tokens')).toBeNull();
    });

    it('should call HA service', async () => {
        const store = new HAStore();
        const mockConnection = {};
        store.connection = mockConnection as any;

        await store.callService('light', 'turn_on', { entity_id: 'light.test' });

        expect(haWS.callService).toHaveBeenCalledWith(mockConnection, 'light', 'turn_on', { entity_id: 'light.test' }, undefined);
    });

    it('should not call service if not connected', async () => {
        const store = new HAStore();
        await store.callService('light', 'turn_on');
        expect(haWS.callService).not.toHaveBeenCalled();
    });
});

