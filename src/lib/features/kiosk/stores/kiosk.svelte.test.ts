import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, type KioskConfig } from '$lib/types/config';
import { KioskStore } from './kiosk.svelte';

const enabledConfig: KioskConfig = {
    ...DEFAULT_CONFIG.kiosk!,
    enabled: true,
    idleTimeout: 5,
    dimOnIdle: true,
    hideNavigationOnIdle: true,
    showScreensaver: true,
    hideEditControls: true,
    editUnlockMinutes: 2,
};

describe('KioskStore', () => {
    let store: KioskStore | null = null;
    let now = 0;

    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
        now = 1_000;
    });

    afterEach(() => {
        store?.destroy();
        store = null;
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('marks the shell as dimmed and navigation-hidden after kiosk idle timeout', () => {
        store = new KioskStore({ setupListeners: false, now: () => now });
        store.applyServerConfig(enabledConfig);

        expect(store.isIdle).toBe(false);
        expect(store.isDimmed).toBe(false);
        expect(store.isNavigationHidden).toBe(false);

        vi.advanceTimersByTime(5_000);

        expect(store.isIdle).toBe(true);
        expect(store.isDimmed).toBe(true);
        expect(store.isNavigationHidden).toBe(true);

        now += 6_000;
        store.markActivity();

        expect(store.isIdle).toBe(false);
        expect(store.isDimmed).toBe(false);
    });

    it('locks touch edit controls until editing is temporarily unlocked', () => {
        store = new KioskStore({ setupListeners: false, now: () => now });
        store.applyServerConfig(enabledConfig);

        expect(store.isEditLocked).toBe(true);

        store.unlockEditing(1);

        expect(store.isEditingUnlocked).toBe(true);
        expect(store.isEditLocked).toBe(false);

        now += 60_000;
        vi.advanceTimersByTime(60_000);

        expect(store.isEditingUnlocked).toBe(false);
        expect(store.isEditLocked).toBe(true);
    });

    it('consumes the first idle touch as a wake gesture and suppresses the follow-up click', () => {
        store = new KioskStore({ setupListeners: false, now: () => now });
        store.applyServerConfig(enabledConfig);

        vi.advanceTimersByTime(5_000);

        expect(store.isIdle).toBe(true);
        expect(store.consumeWakeGesture()).toBe(true);
        expect(store.isIdle).toBe(false);
        expect(store.consumeSuppressedClick()).toBe(true);
        expect(store.consumeSuppressedClick()).toBe(false);
    });

    it('treats active touch gestures as normal activity', () => {
        store = new KioskStore({ setupListeners: false, now: () => now });
        store.applyServerConfig(enabledConfig);

        expect(store.consumeWakeGesture()).toBe(false);
        expect(store.isIdle).toBe(false);
        expect(store.consumeSuppressedClick()).toBe(false);
    });

    it('keeps the idle screensaver enabled when older cached kiosk config omits it', () => {
        store = new KioskStore({ setupListeners: false, now: () => now });

        store.applyServerConfig({
            ...enabledConfig,
            showScreensaver: undefined,
        } as unknown as KioskConfig);

        expect(store.showScreensaver).toBe(true);
    });

    it('persists user kiosk settings locally and syncs them to the backend', async () => {
        store = new KioskStore({ setupListeners: false, now: () => now });

        store.updateConfig({
            enabled: true,
            idleTimeout: 90,
            showScreensaver: false,
            keepAwake: true,
            hideEditControls: false,
        });

        const cached = JSON.parse(localStorage.getItem('kiosk-config') ?? '{}') as KioskConfig;
        expect(cached.enabled).toBe(true);
        expect(cached.idleTimeout).toBe(90);
        expect(cached.showScreensaver).toBe(false);
        expect(cached.keepAwake).toBe(true);
        expect(cached.hideEditControls).toBe(false);

        vi.advanceTimersByTime(2_000);
        await Promise.resolve();

        expect(fetch).toHaveBeenCalledWith('/api/settings', expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"kiosk"'),
        }));
    });

    it('requests and releases a screen wake lock when keep awake is enabled', async () => {
        const release = vi.fn(async () => undefined);
        const addEventListener = vi.fn();
        const request = vi.fn(async () => ({
            released: false,
            release,
            addEventListener,
        }));
        vi.stubGlobal('navigator', {
            ...navigator,
            wakeLock: { request },
        });

        store = new KioskStore({ setupListeners: false, now: () => now });
        store.updateConfig({
            enabled: true,
            keepAwake: true,
        });

        await vi.waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
        expect(store.canUseWakeLock).toBe(true);
        expect(store.wakeLockActive).toBe(true);
        expect(store.wakeLockError).toBeNull();
        expect(addEventListener).toHaveBeenCalledWith('release', expect.any(Function));

        store.updateConfig({ enabled: false });

        await vi.waitFor(() => expect(release).toHaveBeenCalled());
        expect(store.wakeLockActive).toBe(false);
    });

    it('marks keep awake as unsupported when the browser has no wake lock API', async () => {
        vi.stubGlobal('navigator', {
            ...navigator,
            wakeLock: undefined,
        });

        const activeStore = new KioskStore({ setupListeners: false, now: () => now });
        store = activeStore;
        activeStore.applyServerConfig({
            ...enabledConfig,
            keepAwake: true,
        });

        await vi.waitFor(() => expect(activeStore.wakeLockError).toBe('unsupported'));
        expect(activeStore.canUseWakeLock).toBe(false);
        expect(activeStore.wakeLockActive).toBe(false);
    });

    it('keeps per-device profile local without syncing shared backend config', () => {
        store = new KioskStore({ setupListeners: false, now: () => now });

        store.updateDeviceProfile({
            density: 'spacious',
            navigationMode: 'hidden',
        });

        const cached = JSON.parse(localStorage.getItem('kiosk-device-profile') ?? '{}') as {
            density?: string;
            navigationMode?: string;
        };

        expect(cached.density).toBe('spacious');
        expect(cached.navigationMode).toBe('hidden');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('lets this device hide navigation whenever kiosk mode is enabled', () => {
        store = new KioskStore({ setupListeners: false, now: () => now });
        store.applyServerConfig({
            ...enabledConfig,
            hideNavigationOnIdle: false,
        });

        store.updateDeviceProfile({ navigationMode: 'hidden' });

        expect(store.isIdle).toBe(false);
        expect(store.isNavigationHidden).toBe(true);

        store.updateConfig({ enabled: false });

        expect(store.isNavigationHidden).toBe(false);
    });

    it('normalizes invalid cached per-device profile values', () => {
        localStorage.setItem('kiosk-device-profile', JSON.stringify({
            density: 'tiny',
            navigationMode: 'surprise',
        }));

        store = new KioskStore({ setupListeners: false, now: () => now });

        expect(store.deviceDensity).toBe('comfortable');
        expect(store.deviceNavigationMode).toBe('shared');
    });
});
