// Dashboard Store - Manages grid configuration persistence and state
import { browser } from '$app/environment';
import type {
    GridConfig,
    DashboardItem,
    DashboardHierarchy,
    HAFloor,
    HAArea,
    Breakpoint,
    RoomDashboardConfig
} from '$lib/types/dashboard';
import { createDefaultGridConfig } from '$lib/types/dashboard';
import { haStore, HAStore } from './ha.svelte';
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

    // HA hierarchy (floors/areas)
    hierarchy = $state<DashboardHierarchy>({
        floors: [],
        areas: [],
        floorAreas: {}
    });

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
     * Load saved configurations from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Migrate old GridConfigs to RoomDashboardConfigs
                this.savedConfigs = Object.entries(parsed).reduce((acc, [key, val]: [string, any]) => {
                    let config = val;

                    // Migration: Convert GridConfig -> RoomDashboardConfig
                    if (val.items && !val.tabs) {
                        const tabId = crypto.randomUUID();
                        // Assume the old grid is the "Lights" or main tab
                        config = {
                            id: val.id,
                            activeTabId: tabId,
                            tabs: [
                                { ...val, id: tabId, name: 'Lights' },
                                createDefaultGridConfig('Climate'),
                                createDefaultGridConfig('Media'),
                                createDefaultGridConfig('Other')
                            ]
                        };
                    }

                    // Repair: Ensure safe defaults
                    if (!config.tabs || config.tabs.length === 0) {
                        // Empty or broken config? Re-initialize with standard tabs
                        const tabId = crypto.randomUUID();
                        config.tabs = [
                            { ...(config as any), id: tabId, name: 'Lights', icon: 'lightbulb', items: (config as any).items || [] },
                            { ...createDefaultGridConfig('Climate'), icon: 'thermostat' },
                            { ...createDefaultGridConfig('Media'), icon: 'music_note' },
                            { ...createDefaultGridConfig('Other'), icon: 'grid_view' }
                        ];
                        config.activeTabId = tabId;
                    } else {
                        // Fix invalid activeTabId
                        if (!config.tabs.find((t: any) => t.id === config.activeTabId)) {
                            config.activeTabId = config.tabs[0].id;
                        }

                        // Repair items: Ensure required fields exist
                        config.tabs.forEach((tab: any) => {
                            if (tab.items) {
                                tab.items.forEach((item: any) => {
                                    if (item.name === undefined) item.name = "";
                                    if (item.secondaryEntityId === undefined) item.secondaryEntityId = "";
                                    if (item.secondaryName === undefined) item.secondaryName = "";
                                    if (item.domainFilter === undefined) item.domainFilter = "";
                                });
                            }
                        });
                    }

                    acc[key] = config;
                    return acc;
                }, {} as Record<string, RoomDashboardConfig>);
            }

            const hierarchyStored = localStorage.getItem(HIERARCHY_STORAGE_KEY);
            if (hierarchyStored) {
                this.hierarchy = JSON.parse(hierarchyStored);
            }
        } catch (err) {
            logger.error('Failed to load dashboard configs:', err);
        }
    }

    /**
     * Save current configurations to localStorage
     */
    saveToStorage() {
        if (!browser) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.savedConfigs));
            localStorage.setItem(HIERARCHY_STORAGE_KEY, JSON.stringify(this.hierarchy));
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
            // No need to save active tab state permanently? 
            // Maybe yes, so user returns to same tab.
            this.saveToStorage();
        }
    }

    /**
     * Fetch floors and areas from Home Assistant
     */
    async fetchHierarchy(): Promise<DashboardHierarchy> {
        if (!this.ha.connection) {
            logger.warn('No HA connection, cannot fetch hierarchy');
            return this.hierarchy;
        }

        this.loading = true;

        try {
            // Fetch floors via WebSocket
            const floorsResult = await this.ha.connection.sendMessagePromise({
                type: 'config/floor_registry/list'
            }) as HAFloor[];

            // Fetch areas via WebSocket
            const areasResult = await this.ha.connection.sendMessagePromise({
                type: 'config/area_registry/list'
            }) as HAArea[];

            // Build floor -> areas mapping
            const floorAreas: Record<string, string[]> = {};
            for (const area of areasResult) {
                const floorId = area.floor_id || 'unassigned';
                if (!floorAreas[floorId]) {
                    floorAreas[floorId] = [];
                }
                floorAreas[floorId].push(area.area_id);
            }

            this.hierarchy = {
                floors: floorsResult || [],
                areas: areasResult || [],
                floorAreas
            };

            this.saveToStorage();
            logger.debug('Fetched hierarchy:', this.hierarchy);

        } catch (err) {
            logger.error('Failed to fetch hierarchy:', err);
        } finally {
            this.loading = false;
        }

        return this.hierarchy;
    }

    /**
     * Get areas for a specific floor
     */
    getAreasForFloor(floorId: string): HAArea[] {
        const areaIds = this.hierarchy.floorAreas[floorId] || [];
        return this.hierarchy.areas.filter(a => areaIds.includes(a.area_id));
    }

    /**
     * Get entities for an area
     * Note: Requires entity_registry which includes area assignments
     */
    async getEntitiesForArea(areaId: string): Promise<string[]> {
        if (!this.ha.connection) return [];

        try {
            const entities = await this.ha.connection.sendMessagePromise({
                type: 'config/entity_registry/list'
            }) as Array<{ entity_id: string; area_id?: string }>;

            return entities
                .filter(e => e.area_id === areaId)
                .map(e => e.entity_id);
        } catch (err) {
            logger.error('Failed to fetch entities for area:', err);
            return [];
        }
    }
}

export const dashboardStore = new DashboardStore(haStore);
