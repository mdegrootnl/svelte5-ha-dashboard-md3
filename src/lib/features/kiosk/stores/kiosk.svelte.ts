import { browser } from '$app/environment';
import { DEFAULT_CONFIG, type KioskConfig } from '$lib/types/config';
import { withBase } from '$lib/utils/appBase';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('KioskStore');
const STORAGE_KEY = 'kiosk-config';
const DEVICE_PROFILE_STORAGE_KEY = 'kiosk-device-profile';
const SYNC_DEBOUNCE_MS = 2000;

export type KioskDeviceDensity = 'compact' | 'comfortable' | 'spacious';
export type KioskDeviceNavigationMode = 'shared' | 'hidden';

export interface KioskDeviceProfile {
    density: KioskDeviceDensity;
    navigationMode: KioskDeviceNavigationMode;
}

const DEFAULT_DEVICE_PROFILE: KioskDeviceProfile = {
    density: 'comfortable',
    navigationMode: 'shared',
};

interface KioskStoreOptions {
    setupListeners?: boolean;
    now?: () => number;
}

export class KioskStore {
    enabled = $state(DEFAULT_CONFIG.kiosk!.enabled);
    idleTimeout = $state(DEFAULT_CONFIG.kiosk!.idleTimeout);
    dimOnIdle = $state(DEFAULT_CONFIG.kiosk!.dimOnIdle);
    hideNavigationOnIdle = $state(DEFAULT_CONFIG.kiosk!.hideNavigationOnIdle);
    showScreensaver = $state(DEFAULT_CONFIG.kiosk!.showScreensaver);
    hideEditControls = $state(DEFAULT_CONFIG.kiosk!.hideEditControls);
    editUnlockMinutes = $state(DEFAULT_CONFIG.kiosk!.editUnlockMinutes);

    deviceDensity = $state<KioskDeviceDensity>(DEFAULT_DEVICE_PROFILE.density);
    deviceNavigationMode = $state<KioskDeviceNavigationMode>(DEFAULT_DEVICE_PROFILE.navigationMode);

    isIdle = $state(false);
    lastActivity = $state(0);
    editUnlockedUntil = $state(0);

    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    private unlockTimer: ReturnType<typeof setTimeout> | null = null;
    private syncTimer: ReturnType<typeof setTimeout> | null = null;
    private activityListeners: Array<() => void> = [];
    private wakeSuppressionUntil = 0;
    private readonly now: () => number;

    constructor(options: KioskStoreOptions = {}) {
        this.now = options.now ?? Date.now;
        this.applyDeviceProfile(this.loadDeviceProfile() ?? DEFAULT_DEVICE_PROFILE);
        if (browser && options.setupListeners !== false) {
            this.setupActivityListeners();
        }
        this.resetIdleTimer();
    }

    init(config?: KioskConfig) {
        this.applyServerConfig(config ?? this.loadFromLocalStorage() ?? DEFAULT_CONFIG.kiosk!);
        this.resetIdleTimer();
    }

    applyServerConfig(config: KioskConfig) {
        this.enabled = config.enabled ?? DEFAULT_CONFIG.kiosk!.enabled;
        this.idleTimeout = this.normalizeIdleTimeout(config.idleTimeout);
        this.dimOnIdle = config.dimOnIdle ?? DEFAULT_CONFIG.kiosk!.dimOnIdle;
        this.hideNavigationOnIdle = config.hideNavigationOnIdle ?? DEFAULT_CONFIG.kiosk!.hideNavigationOnIdle;
        this.showScreensaver = config.showScreensaver ?? DEFAULT_CONFIG.kiosk!.showScreensaver;
        this.hideEditControls = config.hideEditControls ?? DEFAULT_CONFIG.kiosk!.hideEditControls;
        this.editUnlockMinutes = this.normalizeEditUnlockMinutes(config.editUnlockMinutes);
        this.resetIdleTimer();
    }

    get isDimmed() {
        return this.enabled && this.dimOnIdle && this.isIdle;
    }

    get isNavigationHidden() {
        return this.enabled && (
            this.deviceNavigationMode === 'hidden' ||
            (this.hideNavigationOnIdle && this.isIdle)
        );
    }

    get effectiveDensity() {
        return this.enabled ? this.deviceDensity : DEFAULT_DEVICE_PROFILE.density;
    }

    get isEditingUnlocked() {
        return this.editUnlockedUntil > this.now();
    }

    get isEditLocked() {
        return this.enabled && this.hideEditControls && !this.isEditingUnlocked;
    }

    updateConfig(config: Partial<KioskConfig>) {
        if (config.enabled !== undefined) this.enabled = config.enabled;
        if (config.idleTimeout !== undefined) this.idleTimeout = this.normalizeIdleTimeout(config.idleTimeout);
        if (config.dimOnIdle !== undefined) this.dimOnIdle = config.dimOnIdle;
        if (config.hideNavigationOnIdle !== undefined) this.hideNavigationOnIdle = config.hideNavigationOnIdle;
        if (config.showScreensaver !== undefined) this.showScreensaver = config.showScreensaver;
        if (config.hideEditControls !== undefined) this.hideEditControls = config.hideEditControls;
        if (config.editUnlockMinutes !== undefined) {
            this.editUnlockMinutes = this.normalizeEditUnlockMinutes(config.editUnlockMinutes);
        }

        this.saveToLocalStorage();
        this.scheduleSyncToServer();
        this.resetIdleTimer();
    }

    updateDeviceProfile(profile: Partial<KioskDeviceProfile>) {
        this.applyDeviceProfile({
            density: profile.density ?? this.deviceDensity,
            navigationMode: profile.navigationMode ?? this.deviceNavigationMode,
        });
        this.saveDeviceProfile();
    }

    markActivity() {
        this.isIdle = false;
        this.resetIdleTimer();
    }

    consumeWakeGesture() {
        const shouldConsume = this.enabled && (this.isIdle || this.wakeSuppressionUntil > this.now());
        if (shouldConsume) {
            this.wakeSuppressionUntil = this.now() + 750;
        }

        this.markActivity();
        return shouldConsume;
    }

    consumeSuppressedClick() {
        const shouldConsume = this.enabled && this.wakeSuppressionUntil > this.now();
        if (shouldConsume) {
            this.wakeSuppressionUntil = 0;
            this.markActivity();
        }
        return shouldConsume;
    }

    unlockEditing(minutes = this.editUnlockMinutes) {
        this.editUnlockedUntil = this.now() + this.normalizeEditUnlockMinutes(minutes) * 60 * 1000;
        if (this.unlockTimer) clearTimeout(this.unlockTimer);
        this.unlockTimer = setTimeout(() => {
            this.lockEditing();
        }, Math.max(0, this.editUnlockedUntil - this.now()));
    }

    lockEditing() {
        this.editUnlockedUntil = 0;
        if (this.unlockTimer) {
            clearTimeout(this.unlockTimer);
            this.unlockTimer = null;
        }
    }

    resetIdleTimer() {
        this.lastActivity = this.now();
        this.isIdle = false;
        if (this.idleTimer) clearTimeout(this.idleTimer);

        if (!this.enabled || this.idleTimeout <= 0) return;

        this.idleTimer = setTimeout(() => {
            this.isIdle = true;
        }, this.idleTimeout * 1000);
    }

    flushSync() {
        if (!this.syncTimer) return;
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
        if (browser) {
            fetch(withBase('/api/settings'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kiosk: this.toConfig() }),
                keepalive: true,
            });
        }
    }

    private setupActivityListeners() {
        const stopEvent = (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        };
        const wake = (event: Event) => {
            if (this.consumeWakeGesture()) {
                stopEvent(event);
            }
        };
        const suppressClick = (event: Event) => {
            if (this.consumeSuppressedClick()) {
                stopEvent(event);
                return;
            }
            this.markActivity();
        };
        const reset = () => this.markActivity();

        window.addEventListener('pointerdown', wake, { capture: true });
        window.addEventListener('mousedown', wake, { capture: true });
        window.addEventListener('touchstart', wake, { capture: true, passive: false });
        window.addEventListener('click', suppressClick, { capture: true });

        this.activityListeners.push(
            () => window.removeEventListener('pointerdown', wake, { capture: true }),
            () => window.removeEventListener('mousedown', wake, { capture: true }),
            () => window.removeEventListener('touchstart', wake, { capture: true }),
            () => window.removeEventListener('click', suppressClick, { capture: true }),
        );

        const events = ['mousemove', 'keydown', 'scroll'];

        for (const event of events) {
            window.addEventListener(event, reset, { passive: true });
            this.activityListeners.push(() => window.removeEventListener(event, reset));
        }
    }

    private loadFromLocalStorage(): KioskConfig | null {
        if (!browser) return null;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            logger.error('Failed to load kiosk config from localStorage', error);
            return null;
        }
    }

    private loadDeviceProfile(): KioskDeviceProfile | null {
        if (!browser) return null;
        try {
            const stored = localStorage.getItem(DEVICE_PROFILE_STORAGE_KEY);
            return stored ? this.normalizeDeviceProfile(JSON.parse(stored)) : null;
        } catch (error) {
            logger.error('Failed to load kiosk device profile from localStorage', error);
            return null;
        }
    }

    private saveToLocalStorage() {
        if (!browser) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.toConfig()));
        } catch (error) {
            logger.error('Failed to save kiosk config to localStorage', error);
        }
    }

    private saveDeviceProfile() {
        if (!browser) return;
        try {
            localStorage.setItem(DEVICE_PROFILE_STORAGE_KEY, JSON.stringify(this.toDeviceProfile()));
        } catch (error) {
            logger.error('Failed to save kiosk device profile to localStorage', error);
        }
    }

    private scheduleSyncToServer() {
        if (!browser) return;
        if (this.syncTimer) clearTimeout(this.syncTimer);

        this.syncTimer = setTimeout(() => {
            this.syncToServer();
        }, SYNC_DEBOUNCE_MS);
    }

    async syncToServer() {
        if (!browser) return;

        try {
            await fetch(withBase('/api/settings'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kiosk: this.toConfig() }),
            });
            logger.info('Kiosk config synced to server');
        } catch (error) {
            logger.error('Failed to sync kiosk config to server', error);
        }
    }

    destroy() {
        for (const cleanup of this.activityListeners) cleanup();
        this.activityListeners = [];
        if (this.idleTimer) clearTimeout(this.idleTimer);
        if (this.unlockTimer) clearTimeout(this.unlockTimer);
        if (this.syncTimer) clearTimeout(this.syncTimer);
    }

    private toConfig(): KioskConfig {
        return {
            enabled: this.enabled,
            idleTimeout: this.idleTimeout,
            dimOnIdle: this.dimOnIdle,
            hideNavigationOnIdle: this.hideNavigationOnIdle,
            showScreensaver: this.showScreensaver,
            hideEditControls: this.hideEditControls,
            editUnlockMinutes: this.editUnlockMinutes,
        };
    }

    private toDeviceProfile(): KioskDeviceProfile {
        return {
            density: this.deviceDensity,
            navigationMode: this.deviceNavigationMode,
        };
    }

    private applyDeviceProfile(profile: Partial<KioskDeviceProfile>) {
        const normalized = this.normalizeDeviceProfile(profile);
        this.deviceDensity = normalized.density;
        this.deviceNavigationMode = normalized.navigationMode;
    }

    private normalizeDeviceProfile(profile: Partial<KioskDeviceProfile> | null): KioskDeviceProfile {
        return {
            density: this.isDeviceDensity(profile?.density)
                ? profile.density
                : DEFAULT_DEVICE_PROFILE.density,
            navigationMode: this.isDeviceNavigationMode(profile?.navigationMode)
                ? profile.navigationMode
                : DEFAULT_DEVICE_PROFILE.navigationMode,
        };
    }

    private isDeviceDensity(value: unknown): value is KioskDeviceDensity {
        return value === 'compact' || value === 'comfortable' || value === 'spacious';
    }

    private isDeviceNavigationMode(value: unknown): value is KioskDeviceNavigationMode {
        return value === 'shared' || value === 'hidden';
    }

    private normalizeIdleTimeout(value: number) {
        if (!Number.isFinite(value)) return DEFAULT_CONFIG.kiosk!.idleTimeout;
        return Math.max(5, Math.min(3600, Math.round(value)));
    }

    private normalizeEditUnlockMinutes(value: number) {
        if (!Number.isFinite(value)) return DEFAULT_CONFIG.kiosk!.editUnlockMinutes;
        return Math.max(1, Math.min(120, Math.round(value)));
    }
}

export const kioskStore = new KioskStore();
