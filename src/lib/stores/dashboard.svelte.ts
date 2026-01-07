// Dashboard Store - Manages grid configuration persistence and state
import { browser } from '$app/environment';
import type {
    GridConfig,
    DashboardItem,
    DashboardHierarchy,
    HAFloor,
    HAArea,
    Breakpoint,
    createDefaultGridConfig
} from '$lib/types/dashboard';
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
    config = $state<GridConfig | null>(null);

    // All saved configurations (keyed by id)
    savedConfigs = $state<Record<string, GridConfig>>({});

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
                this.savedConfigs = JSON.parse(stored);
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
    setConfig(config: GridConfig) {
        this.config = config;
        this.savedConfigs[config.id] = config;
        this.saveToStorage();
    }

    /**
     * Load a configuration by ID
     */
    loadConfig(id: string): GridConfig | null {
        const config = this.savedConfigs[id];
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
