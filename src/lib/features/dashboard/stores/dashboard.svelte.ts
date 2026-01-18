import { browser } from '$app/environment';
import {
    type Breakpoint,
    type RoomDashboardConfig,
    createDefaultGridConfig,
    type HAArea
} from '$lib/types/dashboard';
import { haStore, HAStore } from '$lib/stores/ha.svelte';
import { haRegistryStore } from '$lib/stores/haRegistry.svelte';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('DashboardStore');
const STORAGE_KEY = 'dashboard-config';
const SYNC_DEBOUNCE_MS = 2000;

/**
 * Dashboard Store - Manages grid configurations and HA hierarchy
 */
export class DashboardStore {
    // Current active configuration
    config = $state<RoomDashboardConfig | null>(null);

    // All saved configurations (keyed by id)
    savedConfigs = $state<Record<string, RoomDashboardConfig>>({});

    // Loading state
    loading = $state(false);

    // Current breakpoint
    breakpoint = $state<Breakpoint>("desktop");

    // Track if store has been initialized with server data
    initialized = $state(false);

    private ha: HAStore;

    // Debounce timer for server sync
    private syncTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(ha: HAStore) {
        this.ha = ha;
    }

    /**
     * Initialize from server config (called on page load)
     * Server is the source of truth - always use it.
     */
    init(configs: Record<string, RoomDashboardConfig>) {
        // Skip if already initialized with same data
        if (this.initialized && JSON.stringify(this.savedConfigs) === JSON.stringify(configs)) {
            return;
        }

        this.savedConfigs = configs;
        this.initialized = true;

        // Don't save to localStorage here - only save on user-initiated changes
    }

    /**
     * Load config from localStorage
     */
    private loadFromLocalStorage(): Record<string, RoomDashboardConfig> | null {
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

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.savedConfigs));
        } catch (e) {
            logger.error('Failed to save to localStorage:', e);
        }
    }

    /**
     * Schedule server sync (debounced)
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
            dashboards: this.savedConfigs
        };

        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            logger.info('Dashboards synced to server');
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
                    dashboards: this.savedConfigs
                };
                navigator.sendBeacon('/api/settings', JSON.stringify(config));
            }
        }
    }

    /**
     * Helper to save changes
     */
    private persistChanges() {
        this.saveToLocalStorage();
        this.scheduleSyncToServer();
    }

    /**
     * Set the active configuration
     */
    setConfig(config: RoomDashboardConfig) {
        this.config = config;
        this.savedConfigs[config.id] = config;
        this.persistChanges();
    }

    /**
     * Load a configuration by ID
     */
    loadConfig(id: string): RoomDashboardConfig | null {
        let config = this.savedConfigs[id];

        if (config) {
            this.config = config;
        }
        return config || null;
    }

    /**
     * Delete a configuration
     */
    deleteConfig(id: string) {
        delete this.savedConfigs[id];
        if (this.config?.id === id) {
            this.config = null;
        }
        this.persistChanges();
    }

    /**
     * Update the current breakpoint
     */
    setBreakpoint(bp: Breakpoint) {
        this.breakpoint = bp;
    }

    // --- Tab Management ---

    addTab(name: string) {
        if (!this.config) return;

        const newTab = createDefaultGridConfig(name);
        this.config.tabs.push(newTab);
        this.config.activeTabId = newTab.id;
        this.persistChanges();
    }

    deleteTab(tabId: string) {
        if (!this.config) return;

        const index = this.config.tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        this.config.tabs = this.config.tabs.filter(t => t.id !== tabId);

        if (this.config.activeTabId === tabId) {
            if (this.config.tabs.length > 0) {
                const newIndex = Math.max(0, index - 1);
                this.config.activeTabId = this.config.tabs[newIndex].id;
            } else {
                this.config.activeTabId = "";
            }
        }

        this.persistChanges();
    }

    renameTab(tabId: string, name: string) {
        if (!this.config) return;
        const tab = this.config.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.name = name;
            this.persistChanges();
        }
    }

    setTabIcon(tabId: string, icon: string) {
        if (!this.config) return;
        const tab = this.config.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.icon = icon;
            this.persistChanges();
        }
    }

    setActiveTab(tabId: string) {
        if (!this.config) return;
        if (this.config.tabs.find(t => t.id === tabId)) {
            this.config.activeTabId = tabId;
            this.persistChanges();
        }
    }

    /**
     * Get areas for a specific floor (Proxy to haRegistryStore)
     */
    getAreasForFloor(floorId: string): HAArea[] {
        const areaIds = haRegistryStore.floorAreas[floorId] || [];
        return haRegistryStore.areas.filter(a => areaIds.includes(a.area_id));
    }
}

export const dashboardStore = new DashboardStore(haStore);
