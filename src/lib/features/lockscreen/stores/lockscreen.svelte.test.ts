import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, type LockScreenConfig } from '$lib/types/config';
import { LockScreenStore } from './lockscreen.svelte';

const enabledConfig: LockScreenConfig = {
    ...DEFAULT_CONFIG.lockScreen!,
    enabled: true,
    timeout: 30,
};

describe('LockScreenStore', () => {
    let store: LockScreenStore | null = null;

    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    });

    afterEach(() => {
        store?.destroy();
        store = null;
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('starts usable after initialization and locks only after the idle timeout', () => {
        store = new LockScreenStore();
        store.init(enabledConfig);

        expect(store.enabled).toBe(true);
        expect(store.isLocked).toBe(false);

        vi.advanceTimersByTime(29_000);
        expect(store.isLocked).toBe(false);

        vi.advanceTimersByTime(1_000);
        expect(store.isLocked).toBe(true);
    });

    it('does not lock when disabled by server config', () => {
        store = new LockScreenStore();
        store.init({
            ...enabledConfig,
            enabled: false,
        });

        vi.advanceTimersByTime(60_000);

        expect(store.enabled).toBe(false);
        expect(store.isLocked).toBe(false);
    });

    it('disabling the lock screen unlocks an active overlay', () => {
        store = new LockScreenStore();
        store.init(enabledConfig);
        store.lock();

        expect(store.isLocked).toBe(true);

        store.updateConfig({ enabled: false });

        expect(store.isLocked).toBe(false);
    });

    it('unlocking restarts the idle timer', () => {
        store = new LockScreenStore();
        store.init(enabledConfig);

        vi.advanceTimersByTime(30_000);
        expect(store.isLocked).toBe(true);

        store.unlock();
        expect(store.isLocked).toBe(false);

        vi.advanceTimersByTime(29_000);
        expect(store.isLocked).toBe(false);

        vi.advanceTimersByTime(1_000);
        expect(store.isLocked).toBe(true);
    });
});
