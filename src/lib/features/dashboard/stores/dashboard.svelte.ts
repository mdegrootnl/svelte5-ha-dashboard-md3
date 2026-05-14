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
    /**
     * Derive configuration ID from path
     */
    static deriveConfigId(floor?: string, room?: string): string {
        if (!floor) return "dashboard_home";
        if (!room) return `dashboard_floor_${floor}`;
        return `dashboard_${floor}_${room}`;
    }

    /**
     * Derive configuration ID from a full path string
     */
    static deriveConfigIdFromPath(path: string): string {
        if (!path || path === "" || path === "/") return "dashboard_home";
        const parts = path.split("/").filter(p => p !== "");
        if (parts.length === 1) return `dashboard_floor_${parts[0]}`;
        return `dashboard_${parts[0]}_${parts[1]}`;
    }

    // Current active configuration
    config = $state<RoomDashboardConfig | null>(null);

    // All saved configurations (keyed by id)
    savedConfigs = $state<Record<string, RoomDashboardConfig>>({});

    // Custom dashboard pages/routes
    pages = $state<DashboardPage[]>([]);

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
    init(configs: Record<string, RoomDashboardConfig>, pages: DashboardPage[] = []) {
        // Skip if already initialized with same data
        const configsChanged = JSON.stringify(this.savedConfigs) !== JSON.stringify(configs);
        const pagesChanged = JSON.stringify(this.pages) !== JSON.stringify(pages);

        if (this.initialized && !configsChanged && !pagesChanged) {
            return;
        }

        this.savedConfigs = configs;
        this.pages = pages;
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
            dashboards: this.savedConfigs,
            pages: this.pages
        };

        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
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
            // Use fetch with keepalive for reliable unload sync
            if (browser) {
                const config = {
                    dashboards: this.savedConfigs,
                    pages: this.pages
                };
                fetch('/api/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(config),
                    keepalive: true
                });
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
            // Migration: Ensure all RoomDashboardConfig properties exist
            if (!config.tabs) {
                config.tabs = [];
                config.activeTabId = "";
            }
            if (!config.rows) {
                config.rows = "implicit";
                config.columns = config.columns || { desktop: 12, mobile: 4 };
                config.gap = config.gap ?? 16;
                config.padding = config.padding ?? 16;
                config.rowHeight = config.rowHeight ?? 80;
                config.items = config.items || [];
            }
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

        // If this is the first tab, migrate current root grid items into it
        if (this.config.tabs.length === 0) {
            newTab.items = [...this.config.items];
            this.config.items = [];

            // Sync grid settings if they were customized on the root
            newTab.columns = { ...this.config.columns };
            newTab.gap = this.config.gap;
            newTab.padding = this.config.padding;
            newTab.rowHeight = this.config.rowHeight;
        }

        this.config.tabs.push(newTab);
        this.config.activeTabId = newTab.id;
        this.persistChanges();
    }

    deleteTab(tabId: string) {
        if (!this.config) return;

        const index = this.config.tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        const tabToDelete = this.config.tabs[index];
        this.config.tabs = this.config.tabs.filter(t => t.id !== tabId);

        // If we just deleted the last tab, reset active tab ID
        if (this.config.tabs.length === 0) {
            this.config.activeTabId = "";
        } else if (this.config.activeTabId === tabId) {
            const newIndex = Math.max(0, index - 1);
            this.config.activeTabId = this.config.tabs[newIndex].id;
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

    // --- Page Management ---

    addPage(name: string, path: string, icon: string = "dashboard") {
        const newPage: DashboardPage = {
            id: generateUUID(),
            name,
            path,
            icon
        };
        this.pages.push(newPage);

        // Initialize configuration for the new page
        const configId = DashboardStore.deriveConfigIdFromPath(path);
        if (!this.savedConfigs[configId]) {
            const gridConfig = createDefaultGridConfig("Main");
            const newConfig: RoomDashboardConfig = {
                ...gridConfig,
                id: configId,
                tabs: [gridConfig],
                activeTabId: gridConfig.id
            };
            this.savedConfigs[configId] = newConfig;
        }

        this.persistChanges();
        return newPage;
    }

    updatePage(id: string, updates: Partial<DashboardPage>) {
        const index = this.pages.findIndex(p => p.id === id);
        if (index !== -1) {
            this.pages[index] = { ...this.pages[index], ...updates };
            this.persistChanges();
        }
    }

    deletePage(id: string) {
        this.pages = this.pages.filter(p => p.id !== id);
        this.persistChanges();
    }
}
import { generateUUID } from '$lib/utils/uuid';
import type { DashboardPage } from '$lib/types/dashboard';

export const dashboardStore = new DashboardStore(haStore);
