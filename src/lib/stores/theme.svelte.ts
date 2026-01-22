import {
    argbFromHex,
    hexFromArgb,
    themeFromSourceColor,
    Blend,
    sourceColorFromImage,
    type Theme
} from '@material/material-color-utilities';
import { browser } from '$app/environment';
import { type ThemeConfig, type NavigationItem, DEFAULT_CONFIG } from '$lib/types/config';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('ThemeStore');
const STORAGE_KEY = 'theme-config';
const SYNC_DEBOUNCE_MS = 2000;

export class ThemeStore {
    // Source color for the theme (default: M3 Blue)
    // Source color for the theme (default: M3 Blue)
    sourceColor = $state('#6750A4');
    // Dark mode toggle
    isDark = $state(false);
    // Navigation style preference
    navigationStyle = $state<'standard' | 'modern'>('standard');
    // Navigation items
    navigationItems = $state<NavigationItem[]>(DEFAULT_CONFIG.theme.navigationItems);

    // Debounce timer for server sync
    private syncTimer: ReturnType<typeof setTimeout> | null = null;

    // Derived theme object using material-color-utilities
    theme = $derived.by(() => {
        const argb = argbFromHex(this.sourceColor);
        return themeFromSourceColor(argb);
    });

    constructor() {
        // Effect to apply variables to the document root
        $effect.root(() => {
            $effect(() => {
                if (!browser) return;
                this.applyToDocument();
            });
        });
    }

    /**
     * Initialize from server config (called on page load)
     * Server is the source of truth - always use it.
     */
    init(config: ThemeConfig) {
        // Skip if already initialized with same values
        if (this.sourceColor === config.sourceColor && this.isDark === config.isDark) {
            return;
        }

        this.sourceColor = config.sourceColor;
        this.isDark = config.isDark;
        // Default to standard if missing (migration safety)
        this.navigationStyle = config.navigationStyle ?? 'standard';

        // Load items or fall back to filtered defaults (in case of deep merge issues)
        if (config.navigationItems && Array.isArray(config.navigationItems) && config.navigationItems.length > 0) {
            this.navigationItems = config.navigationItems;
        } else {
            this.navigationItems = DEFAULT_CONFIG.theme.navigationItems;
        }

        // Don't save to localStorage here - only save on user-initiated changes
    }

    /**
     * Load config from localStorage
     */
    private loadFromLocalStorage(): ThemeConfig | null {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            logger.error('Failed to load from localStorage:', e);
        }
        return null;
    }

    /**
     * Save config to localStorage (immediate)
     */
    private saveToLocalStorage() {
        if (!browser) return;

        const config: ThemeConfig = {
            sourceColor: this.sourceColor,
            isDark: this.isDark,
            navigationStyle: this.navigationStyle,
            navigationItems: this.navigationItems
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            logger.error('Failed to save to localStorage:', e);
        }
    }

    /**
     * Sync config to server (debounced)
     */
    private scheduleSyncToServer() {
        if (!browser) return;

        // Clear any pending sync
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
        }

        // Schedule new sync
        this.syncTimer = setTimeout(() => {
            this.syncToServer();
        }, SYNC_DEBOUNCE_MS);
    }

    /**
     * Actually sync to server
     */
    async syncToServer() {
        if (!browser) return;

        const config = {
            theme: {
                sourceColor: this.sourceColor,
                isDark: this.isDark,
                navigationStyle: this.navigationStyle,
                navigationItems: this.navigationItems
            }
        };

        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            logger.info('Theme synced to server');
        } catch (e) {
            logger.error('Failed to sync to server:', e);
        }
    }

    /**
     * Flush any pending sync (call on page unload)
     */
    flushSync() {
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
            // Use sendBeacon for reliable unload sync
            if (browser && navigator.sendBeacon) {
                const config = {
                    theme: {
                        sourceColor: this.sourceColor,
                        isDark: this.isDark,
                        navigationStyle: this.navigationStyle,
                        navigationItems: this.navigationItems
                    }
                };
                navigator.sendBeacon('/api/settings', JSON.stringify(config));
            }
        }
    }

    async setSourceFromImage(image: HTMLImageElement) {
        const argb = await sourceColorFromImage(image);
        this.sourceColor = hexFromArgb(argb);
        this.saveToLocalStorage();
        this.scheduleSyncToServer();
    }

    toggleDark() {
        this.isDark = !this.isDark;
        this.saveToLocalStorage();
        this.scheduleSyncToServer();
    }

    setSourceColor(color: string) {
        this.sourceColor = color;
        this.saveToLocalStorage();
        this.scheduleSyncToServer();
    }

    setNavigationStyle(style: 'standard' | 'modern') {
        this.navigationStyle = style;
        this.saveToLocalStorage();
        this.scheduleSyncToServer();
    }

    setNavigationItems(items: NavigationItem[]) {
        this.navigationItems = items;
        this.saveToLocalStorage();
        this.scheduleSyncToServer();
    }

    // Apply the current theme to CSS variables
    private applyToDocument() {
        const scheme = this.isDark ? this.theme.schemes.dark : this.theme.schemes.light;
        const root = document.documentElement;

        // Toggle dark class for Tailwind dark mode
        if (this.isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Sets a CSS variable, e.g. --color-m3-primary
        const set = (name: string, argb: number) => {
            root.style.setProperty(`--color-m3-${name}`, hexFromArgb(argb));
        };

        // Core Palette
        set('primary', scheme.primary);
        set('on-primary', scheme.onPrimary);
        set('primary-container', scheme.primaryContainer);
        set('on-primary-container', scheme.onPrimaryContainer);

        set('secondary', scheme.secondary);
        set('on-secondary', scheme.onSecondary);
        set('secondary-container', scheme.secondaryContainer);
        set('on-secondary-container', scheme.onSecondaryContainer);

        set('tertiary', scheme.tertiary);
        set('on-tertiary', scheme.onTertiary);
        set('tertiary-container', scheme.tertiaryContainer);
        set('on-tertiary-container', scheme.onTertiaryContainer);

        set('error', scheme.error);
        set('on-error', scheme.onError);
        set('error-container', scheme.errorContainer);
        set('on-error-container', scheme.onErrorContainer);

        set('background', scheme.background);
        set('on-background', scheme.onBackground);

        set('surface', scheme.surface);
        set('on-surface', scheme.onSurface);
        set('surface-variant', scheme.surfaceVariant);
        set('on-surface-variant', scheme.onSurfaceVariant);

        set('outline', scheme.outline);
        set('outline-variant', scheme.outlineVariant);

        set('inverse-surface', scheme.inverseSurface);
        set('inverse-on-surface', scheme.inverseOnSurface);
        set('inverse-primary', scheme.inversePrimary);

        // Surface Containers (Manual mapping from Palettes as they might be missing in Scheme)
        const neutral = this.theme.palettes.neutral;

        if (this.isDark) {
            // Dark Mode Tones with Contrast Boost & Surface Tinting
            const primaryArg = scheme.primary;
            const tint = (tone: number) => Blend.cam16Ucs(neutral.tone(tone), primaryArg, 0.05);

            set('surface-container-lowest', tint(4));
            set('surface-container-low', tint(11));
            set('surface-container', tint(14));
            set('surface-container-high', tint(19));
            set('surface-container-highest', tint(24));
        } else {
            // Light Mode Tones
            set('surface-container-lowest', neutral.tone(100));
            set('surface-container-low', neutral.tone(96));
            set('surface-container', neutral.tone(94));
            set('surface-container-high', neutral.tone(92));
            set('surface-container-highest', neutral.tone(90));
        }
    }
}

// Global instance
export const themeStore = new ThemeStore();
