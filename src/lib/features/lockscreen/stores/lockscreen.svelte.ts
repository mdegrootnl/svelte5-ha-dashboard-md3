import { browser } from '$app/environment';
import { type LockScreenConfig, DEFAULT_CONFIG } from '$lib/types/config';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('LockScreenStore');
const STORAGE_KEY = 'lockscreen-config';
const SYNC_DEBOUNCE_MS = 2000;

export class LockScreenStore {
    // Configuration
    enabled = $state(true);
    timeout = $state(300); // 5 minutes
    backgroundLandscape = $state('');
    backgroundPortrait = $state('');

    // State
    isLocked = $state(false);
    lastActivity = $state(Date.now());

    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    private syncTimer: ReturnType<typeof setTimeout> | null = null;
    private activityListeners: (() => void)[] = [];

    constructor() {
        if (browser) {
            this.setupActivityListeners();
            this.resetTimer();
        }
    }

    init(config?: LockScreenConfig) {
        if (!config) {
            // Try to load from local storage or use defaults
            const localConfig = this.loadFromLocalStorage();
            if (localConfig) {
                this.applyServerConfig(localConfig);
            } else {
                this.applyServerConfig(DEFAULT_CONFIG.lockScreen!);
            }
        } else {
            this.applyServerConfig(config);
        }

        if (!this.enabled) {
            this.isLocked = false;
        }

        this.resetTimer();
    }

    applyServerConfig(config: LockScreenConfig) {
        this.enabled = config.enabled;
        this.timeout = config.timeout;
        this.backgroundLandscape = config.backgroundLandscape;
        this.backgroundPortrait = config.backgroundPortrait;

        if (!this.enabled) {
            this.isLocked = false;
        }
    }

    private setupActivityListeners() {
        if (!browser) return;

        const reset = () => this.resetTimer();

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        events.forEach(event => {
            window.addEventListener(event, reset, { passive: true });
            this.activityListeners.push(() => window.removeEventListener(event, reset));
        });

        // Loop to check idle status periodically rather than relying solely on setTimeouts which might drift or be cleared aggressively
        // Actually, setTimeout is fine for this.
    }

    resetTimer() {
        this.lastActivity = Date.now();

        if (this.isLocked) {
            // If already locked, activity unlocks it? No, explicit unlock required usually.
            // But the requirement says "When we are not actually doing something... we will go back to the lock screen"
            // Usually touching the screen unlocks a digital photo frame style lockscreen, or at least shows controls.
            // For now, let's keep `isLocked` separate from just "timer reset". 
            // Unlocking is an explicit action (clicking the lockscreen).
            return;
        }

        if (this.idleTimer) clearTimeout(this.idleTimer);

        if (this.enabled && this.timeout > 0) {
            this.idleTimer = setTimeout(() => {
                this.lock();
            }, this.timeout * 1000);
        }
    }

    lock() {
        if (!this.enabled) return;
        this.isLocked = true;
        logger.info('Lock screen activated due to inactivity');
    }

    unlock() {
        this.isLocked = false;
        this.resetTimer();
        logger.info('Lock screen unlocked by user');
    }

    updateConfig(config: Partial<LockScreenConfig>) {
        if (config.enabled !== undefined) this.enabled = config.enabled;
        if (config.timeout !== undefined) this.timeout = config.timeout;
        if (config.backgroundLandscape !== undefined) this.backgroundLandscape = config.backgroundLandscape;
        if (config.backgroundPortrait !== undefined) this.backgroundPortrait = config.backgroundPortrait;

        if (!this.enabled) {
            this.isLocked = false;
        }

        this.saveToLocalStorage();
        this.scheduleSyncToServer();
        this.resetTimer(); // Re-eval timeout
    }

    private loadFromLocalStorage(): LockScreenConfig | null {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            logger.error('Failed to load from localStorage', e);
        }
        return null;
    }

    private saveToLocalStorage() {
        if (!browser) return;
        const config: LockScreenConfig = {
            enabled: this.enabled,
            timeout: this.timeout,
            backgroundLandscape: this.backgroundLandscape,
            backgroundPortrait: this.backgroundPortrait
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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

        const config = {
            lockScreen: {
                enabled: this.enabled,
                timeout: this.timeout,
                backgroundLandscape: this.backgroundLandscape,
                backgroundPortrait: this.backgroundPortrait
            }
        };

        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            logger.info('Lockscreen config synced to server');
        } catch (e) {
            logger.error('Failed to sync to server', e);
        }
    }

    destroy() {
        if (browser) {
            this.activityListeners.forEach(cleanup => cleanup());
            if (this.idleTimer) clearTimeout(this.idleTimer);
            if (this.syncTimer) clearTimeout(this.syncTimer);
        }
    }
}

export const lockScreenStore = new LockScreenStore();
