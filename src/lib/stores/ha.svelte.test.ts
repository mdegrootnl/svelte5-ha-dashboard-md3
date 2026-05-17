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
        vi.unstubAllGlobals();
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

    it('should login and connect', async () => {
        const store = new HAStore();
        const mockAuth = { data: { hassUrl: 'https://localhost:8123' }, expired: false };
        const mockConnection = { close: vi.fn(), addEventListener: vi.fn(), sendMessagePromise: vi.fn() };

        vi.mocked(haWS.getAuth).mockResolvedValue(mockAuth as any);
        vi.mocked(haWS.createConnection).mockResolvedValue(mockConnection as any);

        await store.login('localhost');

        expect(haWS.getAuth).toHaveBeenCalledWith(expect.objectContaining({ hassUrl: 'https://localhost:8123' }));
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
        expect(store.connectionError).toBe('Error: Invalid credentials');
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

    it('diffs incoming entity snapshots in place and tracks entityCount', () => {
        const store = new HAStore();
        const first = { entity_id: 'light.test', state: 'off', attributes: {} };
        const second = { entity_id: 'sensor.temp', state: '20', attributes: {} };

        (store as any).applyEntitySnapshot({
            'light.test': first,
            'sensor.temp': second,
        });

        const statesRef = store.states;
        const versionAfterInitial = store.statesVersion;
        expect(store.entityCount).toBe(2);
        expect(store.getLiveEntity('light.test')?.state).toBe(first.state);

        (store as any).applyEntitySnapshot({
            'light.test': first,
            'sensor.temp': second,
        });

        expect(store.states).toBe(statesRef);
        expect(store.statesVersion).toBe(versionAfterInitial);

        const changed = { entity_id: 'light.test', state: 'on', attributes: {} };
        (store as any).applyEntitySnapshot({
            'light.test': changed,
        });

        expect(store.states).toBe(statesRef);
        expect(store.entityCount).toBe(1);
        expect(store.getLiveEntity('sensor.temp')).toBeUndefined();
        expect(store.getEntity('light.test')?.state).toBe('on');
        expect(store.statesVersion).toBe(versionAfterInitial + 1);
    });

    it('returns compatibility snapshots without exposing live state mutation', () => {
        const store = new HAStore();
        const liveEntity = { entity_id: 'light.test', state: 'off', attributes: {} };
        const overrideEntity = { entity_id: 'light.test', state: 'on', attributes: {} };
        store.states = { 'light.test': liveEntity as any };
        store.patchEntityOverrides({ 'light.test': overrideEntity as any });

        const snapshot = store.getStatesSnapshot();
        delete snapshot['light.test'];

        expect(store.hasEntity('light.test')).toBe(true);
        expect(store.getEntity('light.test')?.state).toBe('on');
        expect(store.getLiveEntity('light.test')?.state).toBe('off');
        expect(store.getEntityIdsSnapshot()).toEqual(['light.test']);
    });

    it('should prefer scoped entity overrides without mutating live states', () => {
        const store = new HAStore();
        const liveEntity = { entity_id: 'light.test', state: 'off', attributes: {} };
        const overrideEntity = { entity_id: 'light.test', state: 'on', attributes: {} };
        store.states = { 'light.test': liveEntity as any };

        store.patchEntityOverrides({ 'light.test': overrideEntity as any });

        expect(store.states['light.test'].state).toBe('off');
        expect(store.getEntity('light.test')?.state).toBe('on');
        expect(store.effectiveStates['light.test'].state).toBe('on');

        store.clearEntityOverrides(['light.test']);
        expect(store.getEntity('light.test')?.state).toBe('off');
    });

    it('should disconnect and clear state', async () => {
        const store = new HAStore();
        const mockConnection = { close: vi.fn() };
        store.connection = mockConnection as any;
        store.auth = { some: 'data' } as any;
        store.connectionState = 'connected' as any;

        // Populate storage manually (since we aren't mocking StorageProvider yet)
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

    it('rounds history cache keys and reuses fresh cached data', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-15T10:10:00Z'));
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue([
                [
                    {
                        entity_id: 'sensor.temp',
                        state: '21',
                        last_changed: '2026-05-15T10:00:00Z',
                    },
                ],
            ]),
        });
        vi.stubGlobal('fetch', fetchMock);

        const store = new HAStore();
        store.auth = { accessToken: 'token', expired: false } as any;
        store.url = 'http://homeassistant.local:8123';

        const first = await store.getHistory(
            ['sensor.temp'],
            new Date('2026-05-15T10:02:30Z'),
            new Date('2026-05-15T10:08:30Z'),
        );
        const second = await store.getHistory(
            ['sensor.temp'],
            new Date('2026-05-15T10:04:59Z'),
            new Date('2026-05-15T10:09:59Z'),
        );

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const url = String(fetchMock.mock.calls[0][0]);
        expect(url).toContain('timestamp=2026-05-15T10%3A00%3A00.000Z');
        expect(url).toContain('end_time=2026-05-15T10%3A05%3A00.000Z');

        vi.useRealTimers();
    });

    it('deduplicates in-flight history requests and refetches after TTL', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-15T10:10:00Z'));

        let resolveJson!: (value: unknown) => void;
        const jsonPromise = new Promise((resolve) => {
            resolveJson = resolve;
        });
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn(() => jsonPromise),
        });
        vi.stubGlobal('fetch', fetchMock);

        const store = new HAStore();
        store.auth = { accessToken: 'token', expired: false } as any;
        store.url = 'http://homeassistant.local:8123';

        const endTime = new Date('2026-05-15T10:10:00Z');
        const first = store.getHistory(['sensor.temp'], new Date('2026-05-15T10:00:00Z'), endTime);
        const second = store.getHistory(['sensor.temp'], new Date('2026-05-15T10:00:30Z'), endTime);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        resolveJson([
            [
                {
                    entity_id: 'sensor.temp',
                    state: '22',
                    last_changed: '2026-05-15T10:00:00Z',
                },
            ],
        ]);
        await expect(Promise.all([first, second])).resolves.toEqual([
            expect.objectContaining({ ok: true }),
            expect.objectContaining({ ok: true }),
        ]);

        vi.setSystemTime(new Date('2026-05-15T10:16:00Z'));
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue([[]]),
        });
        await store.getHistory(['sensor.temp'], new Date('2026-05-15T10:00:00Z'), endTime);
        expect(fetchMock).toHaveBeenCalledTimes(2);

        vi.useRealTimers();
    });

    it('preserves history error handling for failed responses', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Server Error',
            json: vi.fn().mockResolvedValue({ message: 'boom' }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const store = new HAStore();
        store.auth = { accessToken: 'token', expired: false } as any;
        store.url = 'http://homeassistant.local:8123';

        const result = await store.getHistory(['sensor.temp'], new Date('2026-05-15T10:00:00Z'));

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.message).toContain('History fetch failed: 500 - boom');
        }
    });

    it('fetches and caches recorder statistics over websocket', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-15T10:30:00Z'));
        const sendMessagePromise = vi.fn().mockResolvedValue({
            'sensor.solar_power': [
                {
                    start: '2026-05-15T09:00:00Z',
                    mean: 1200,
                },
                {
                    start: '2026-05-15T10:00:00Z',
                    state: '1800',
                },
            ],
        });

        const store = new HAStore();
        store.connection = { sendMessagePromise } as any;

        const first = await store.getStatistics(
            ['sensor.solar_power'],
            new Date('2026-05-15T09:10:00Z'),
            new Date('2026-05-15T10:25:00Z'),
        );
        const second = await store.getStatistics(
            ['sensor.solar_power'],
            new Date('2026-05-15T09:15:00Z'),
            new Date('2026-05-15T10:45:00Z'),
        );

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
        expect(sendMessagePromise).toHaveBeenCalledTimes(1);
        expect(sendMessagePromise).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'recorder/statistics_during_period',
                statistic_ids: ['sensor.solar_power'],
                period: 'hour',
            }),
        );
        if (first.ok) {
            expect(first.value[0].points.map((point) => point.value)).toEqual([1200, 1800]);
        }

        vi.useRealTimers();
    });
});
