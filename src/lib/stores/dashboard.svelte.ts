import { browser } from '$app/environment';
import {
    type HAFloor,
    type HAArea,
    type Breakpoint,
    type RoomDashboardConfig,
    createDefaultGridConfig
} from '$lib/types/dashboard';
import { RoomDashboardConfigSchema } from '$lib/domain/schemas';
import { ok, err, type Result } from '$lib/utils/result';
import { haStore, HAStore } from './ha.svelte';
import { haRegistryStore } from './haRegistry.svelte';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('DashboardStore');

const STORAGE_KEY = 'dashboard_configs';
const HIERARCHY_STORAGE_KEY = 'dashboard_hierarchy';

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

    private ha: HAStore;

    constructor(ha: HAStore) {
        this.ha = ha;
        if (browser) {
            this.loadFromStorage();
        }
    }

    /**
     * Load saved configurations from localStorage with strict validation.
     */
    loadFromStorage(): Result<void, Error> {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const rawParsed = JSON.parse(stored);
                const validatedConfigs: Record<string, RoomDashboardConfig> = {};

                for (const [id, rawConfig] of Object.entries(rawParsed)) {
                    // Try to validate/parse with Zod
                    const result = RoomDashboardConfigSchema.safeParse(rawConfig);
                    if (result.success) {
                        validatedConfigs[id] = result.data as RoomDashboardConfig;
                    } else {
                        logger.warn(`Config ${id} failed validation, attempting legacy migration`, result.error);
                        // Fallback to minimal legacy repair if needed, or skip
                    }
                }
                this.savedConfigs = validatedConfigs;
            }
            return ok(undefined);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            logger.error('Failed to load dashboard configs:', error);
            return err(error);
        }
    }

    /**
     * Save current configurations to localStorage
     */
    saveToStorage() {
        if (!browser) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.savedConfigs));
        } catch (err) {
            logger.error('Failed to save dashboard configs:', err);
        }
    }

    /**
     * Set the active configuration
     */
    setConfig(config: RoomDashboardConfig) {
        this.config = config;
        this.savedConfigs[config.id] = config;
        this.saveToStorage();
    }

    /**
     * Load a configuration by ID
     */
    loadConfig(id: string): RoomDashboardConfig | null {
        let config = this.savedConfigs[id];

        // Handle in-memory migration if somehow we got a GridConfig passed (not likley with types, but dependent on legacy calls)
        // But TS will enforce RoomDashboardConfig used in setConfig.
        // If loadConfig returns null, the consumer usually generates a new one.

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
        this.saveToStorage();
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
        this.config.activeTabId = newTab.id; // Switch to new tab
        this.saveToStorage();
    }

    deleteTab(tabId: string) {
        if (!this.config) return;

        const index = this.config.tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        // Don't delete the last tab? Or allow it and show empty state?
        // Let's allow it, but maybe ensure at least one tab exists if we want strictness.
        // For now, allow deleting.

        this.config.tabs = this.config.tabs.filter(t => t.id !== tabId);

        // If we deleted the active tab, switch to another
        if (this.config.activeTabId === tabId) {
            if (this.config.tabs.length > 0) {
                // Determine new active tab (previous or next)
                const newIndex = Math.max(0, index - 1);
                this.config.activeTabId = this.config.tabs[newIndex].id;
            } else {
                this.config.activeTabId = "";
            }
        }

        this.saveToStorage();
    }

    renameTab(tabId: string, name: string) {
        if (!this.config) return;
        const tab = this.config.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.name = name;
            this.saveToStorage();
        }
    }

    setTabIcon(tabId: string, icon: string) {
        if (!this.config) return;
        const tab = this.config.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.icon = icon;
            this.saveToStorage();
        }
    }

    setActiveTab(tabId: string) {
        if (!this.config) return;
        if (this.config.tabs.find(t => t.id === tabId)) {
            this.config.activeTabId = tabId;
            this.saveToStorage();
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
