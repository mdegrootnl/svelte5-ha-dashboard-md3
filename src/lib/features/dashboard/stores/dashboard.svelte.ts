import { browser } from '$app/environment';
import {
    type Breakpoint,
    type ViewportProfile,
    type DashboardGenerationState,
    type DashboardPage,
    type GridConfig,
    type RoomDashboardConfig,
    createDefaultGridConfig,
    type HAArea,
    profileToLegacyBreakpoint,
} from '$lib/types/dashboard';
import { haStore, HAStore } from '$lib/stores/ha.svelte';
import { haRegistryStore } from '$lib/stores/haRegistry.svelte';
import { createLogger } from '$lib/utils/logger';
import { perfCount } from '$lib/utils/perf';
import { generateUUID } from '$lib/utils/uuid';
import {
    normalizeDashboardConfigs,
    normalizeRoomDashboardConfig,
} from '../utils/dashboardDefaults';

const logger = createLogger('DashboardStore');
const STORAGE_KEY = 'dashboard-config';
const SYNC_DEBOUNCE_MS = 2000;

type GeneratedConfigTarget = {
    generationState?: DashboardGenerationState;
};

function markGeneratedTargetModified(target: GeneratedConfigTarget | null | undefined) {
    if (target?.generationState === 'generated') {
        target.generationState = 'user_modified';
    }
}

function markGridTreeModified(grid: GridConfig) {
    markGeneratedTargetModified(grid);
    for (const item of grid.items) {
        markGeneratedTargetModified(item);
        if (item.cardType === 'tabs' && item.tabs) {
            for (const childGrid of item.tabs) {
                markGridTreeModified(childGrid);
            }
        }
    }
}

function markGridTreeModifiedById(grid: GridConfig, gridId: string): boolean {
    if (grid.id === gridId) {
        markGridTreeModified(grid);
        return true;
    }

    for (const item of grid.items) {
        if (item.cardType !== 'tabs' || !item.tabs) continue;

        for (const childGrid of item.tabs) {
            if (markGridTreeModifiedById(childGrid, gridId)) {
                markGeneratedTargetModified(item);
                markGeneratedTargetModified(grid);
                return true;
            }
        }
    }

    return false;
}

function markItemModifiedInGrid(grid: GridConfig, itemId: string): boolean {
    for (const item of grid.items) {
        if (item.id === itemId) {
            markGeneratedTargetModified(item);
            markGeneratedTargetModified(grid);
            return true;
        }

        if (item.cardType === 'tabs' && item.tabs) {
            for (const childGrid of item.tabs) {
                if (markItemModifiedInGrid(childGrid, itemId)) {
                    markGeneratedTargetModified(item);
                    markGeneratedTargetModified(grid);
                    return true;
                }
            }
        }
    }

    return false;
}

function setItemGenerationStateInGrid(
    grid: GridConfig,
    itemId: string,
    state: DashboardGenerationState,
): boolean {
    for (const item of grid.items) {
        if (item.id === itemId) {
            item.generationState = state;
            markGeneratedTargetModified(grid);
            return true;
        }

        if (item.cardType === 'tabs' && item.tabs) {
            for (const childGrid of item.tabs) {
                if (setItemGenerationStateInGrid(childGrid, itemId, state)) {
                    markGeneratedTargetModified(item);
                    markGeneratedTargetModified(grid);
                    return true;
                }
            }
        }
    }

    return false;
}

function markGridModifiedInGrid(grid: GridConfig, gridId: string): boolean {
    if (grid.id === gridId) {
        markGeneratedTargetModified(grid);
        return true;
    }

    for (const item of grid.items) {
        if (item.cardType !== 'tabs' || !item.tabs) continue;

        for (const childGrid of item.tabs) {
            if (markGridModifiedInGrid(childGrid, gridId)) {
                markGeneratedTargetModified(item);
                markGeneratedTargetModified(grid);
                return true;
            }
        }
    }

    return false;
}

function setGridGenerationStateInGrid(
    grid: GridConfig,
    gridId: string,
    state: DashboardGenerationState,
): boolean {
    if (grid.id === gridId) {
        grid.generationState = state;
        return true;
    }

    for (const item of grid.items) {
        if (item.cardType !== 'tabs' || !item.tabs) continue;

        for (const childGrid of item.tabs) {
            if (setGridGenerationStateInGrid(childGrid, gridId, state)) {
                markGeneratedTargetModified(item);
                markGeneratedTargetModified(grid);
                return true;
            }
        }
    }

    return false;
}

function forEachRootGrid(config: RoomDashboardConfig, visit: (grid: GridConfig) => boolean) {
    if (visit(config)) return true;

    for (const tab of config.tabs) {
        if (visit(tab)) return true;
    }

    return false;
}

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

    // Current resolved viewport profile. `breakpoint` remains as a legacy
    // compatibility field for older renderer/editor paths.
    viewportProfile = $state<ViewportProfile>("desktopEdit");

    viewportProfileOverride = $state<ViewportProfile | "auto">("auto");

    // Track if store has been initialized with server data
    initialized = $state(false);

    private ha: HAStore;

    // Debounce timer for server sync
    private syncTimer: ReturnType<typeof setTimeout> | null = null;
    private lastInitConfigs: Record<string, RoomDashboardConfig> | null = null;
    private lastInitPages: DashboardPage[] | null = null;

    constructor(ha: HAStore) {
        this.ha = ha;
    }

    /**
     * Initialize from server config (called on page load)
     * Server is the source of truth - always use it.
     */
    init(configs: Record<string, RoomDashboardConfig>, pages: DashboardPage[] = []) {
        if (this.initialized && this.lastInitConfigs === configs && this.lastInitPages === pages) {
            return;
        }

        this.applyServerConfig(configs, pages);
        this.initialized = true;
        this.lastInitConfigs = configs;
        this.lastInitPages = pages;

        // Don't save to localStorage here - only save on user-initiated changes
    }

    applyServerConfig(configs: Record<string, RoomDashboardConfig>, pages: DashboardPage[] = []) {
        const activeConfigId = this.config?.id;
        this.savedConfigs = normalizeDashboardConfigs(configs);
        this.pages = pages;

        if (activeConfigId && this.savedConfigs[activeConfigId]) {
            this.config = this.savedConfigs[activeConfigId];
        }
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
        if (this.config) {
            this.savedConfigs[this.config.id] = this.config;
        }
        perfCount('dashboard.persistCalls');
        this.saveToLocalStorage();
        this.scheduleSyncToServer();
    }

    /**
     * Set the active configuration
     */
    setConfig(config: RoomDashboardConfig) {
        const normalized = normalizeRoomDashboardConfig(config);
        this.config = normalized;
        this.savedConfigs[normalized.id] = normalized;
        this.persistChanges();
    }

    /**
     * Save multiple generated configurations in one persistence pass.
     */
    setConfigs(configs: RoomDashboardConfig[], activeConfigId?: string) {
        for (const config of configs) {
            const normalized = normalizeRoomDashboardConfig(config);
            this.savedConfigs[normalized.id] = normalized;
        }

        const activeConfig = activeConfigId
            ? this.savedConfigs[activeConfigId]
            : this.savedConfigs[configs[0]?.id];
        if (activeConfig) {
            this.config = activeConfig;
        }

        this.persistChanges();
    }

    /**
     * Mark generated metadata as user-modified without persisting immediately.
     * Callers should follow with their normal setConfig/persist path.
     */
    markItemModified(itemId: string, config = this.config) {
        if (!config) return;

        const found = forEachRootGrid(config, (grid) =>
            markItemModifiedInGrid(grid, itemId),
        );

        if (found) {
            markGeneratedTargetModified(config);
        }
    }

    /**
     * Mark a generated grid or the current dashboard root as user-modified.
     */
    markGridModified(gridId?: string, config = this.config) {
        if (!config) return;

        if (!gridId || config.id === gridId) {
            markGeneratedTargetModified(config);
            return;
        }

        const found = forEachRootGrid(config, (grid) =>
            markGridModifiedInGrid(grid, gridId),
        );

        if (found) {
            markGeneratedTargetModified(config);
        }
    }

    /**
     * Mark every generated item in a grid as user-modified.
     * Useful for bulk layout operations such as auto-arrange.
     */
    markGridItemsModified(gridId: string, config = this.config) {
        if (!config) return;

        const found = forEachRootGrid(config, (grid) =>
            markGridTreeModifiedById(grid, gridId),
        );

        if (found) {
            markGeneratedTargetModified(config);
        }
    }

    /**
     * Explicitly pin or unpin a generated card. Pinning makes future generation
     * merges preserve the card even if a later recipe would replace it.
     */
    setItemGenerationState(itemId: string, state: DashboardGenerationState) {
        if (!this.config) return;

        const found = forEachRootGrid(this.config, (grid) =>
            setItemGenerationStateInGrid(grid, itemId, state),
        );

        if (found) {
            markGeneratedTargetModified(this.config);
            this.persistChanges();
        }
    }

    /**
     * Explicitly pin or unpin a generated grid/tab.
     */
    setGridGenerationState(gridId: string | undefined, state: DashboardGenerationState) {
        if (!this.config) return;

        if (!gridId || this.config.id === gridId) {
            this.config.generationState = state;
            this.persistChanges();
            return;
        }

        const found = forEachRootGrid(this.config, (grid) =>
            setGridGenerationStateInGrid(grid, gridId, state),
        );

        if (found) {
            markGeneratedTargetModified(this.config);
            this.persistChanges();
        }
    }

    /**
     * Load a configuration by ID
     */
    loadConfig(id: string): RoomDashboardConfig | null {
        let config = this.savedConfigs[id];

        if (config) {
            normalizeRoomDashboardConfig(config);
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

    /**
     * Update the resolved viewport profile and keep the legacy breakpoint in sync.
     */
    setViewportProfile(profile: ViewportProfile) {
        this.viewportProfile = profile;
        this.breakpoint = profileToLegacyBreakpoint(profile);
    }

    /**
     * Update auto-detected profile unless the user has overridden it in edit mode.
     */
    setAutoViewportProfile(profile: ViewportProfile) {
        if (this.viewportProfileOverride !== "auto") return;
        this.setViewportProfile(profile);
    }

    /**
     * Override the active layout profile while editing, or return to auto mode.
     */
    setViewportProfileOverride(profile: ViewportProfile | "auto") {
        this.viewportProfileOverride = profile;
        if (profile !== "auto") {
            this.setViewportProfile(profile);
        }
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
        this.markGridModified(this.config.id);
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

        this.markGridModified(this.config.id);
        this.persistChanges();
    }

    renameTab(tabId: string, name: string) {
        if (!this.config) return;
        const tab = this.config.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.name = name;
            this.markGridModified(tab.id);
            this.persistChanges();
        }
    }

    setTabIcon(tabId: string, icon: string) {
        if (!this.config) return;
        const tab = this.config.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.icon = icon;
            this.markGridModified(tab.id);
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
            this.savedConfigs[configId] = normalizeRoomDashboardConfig(newConfig);
        }

        this.persistChanges();
        return newPage;
    }

    updatePage(id: string, updates: Partial<DashboardPage>) {
        const index = this.pages.findIndex(p => p.id === id);
        if (index !== -1) {
            const previousPage = this.pages[index];
            const previousConfigId = DashboardStore.deriveConfigIdFromPath(previousPage.path);
            const nextPage = { ...previousPage, ...updates };
            const nextConfigId = DashboardStore.deriveConfigIdFromPath(nextPage.path);

            if (previousConfigId !== nextConfigId && this.savedConfigs[previousConfigId]) {
                const movedConfig = normalizeRoomDashboardConfig({
                    ...this.savedConfigs[previousConfigId],
                    id: nextConfigId,
                    name: updates.name ?? this.savedConfigs[previousConfigId].name,
                    icon: updates.icon ?? this.savedConfigs[previousConfigId].icon,
                });

                if (!this.savedConfigs[nextConfigId]) {
                    this.savedConfigs[nextConfigId] = movedConfig;
                    delete this.savedConfigs[previousConfigId];
                }

                if (this.config?.id === previousConfigId) {
                    this.config = this.savedConfigs[nextConfigId] ?? movedConfig;
                }
            }

            if (this.savedConfigs[nextConfigId]) {
                this.savedConfigs[nextConfigId].name = updates.name ?? this.savedConfigs[nextConfigId].name;
                this.savedConfigs[nextConfigId].icon = updates.icon ?? this.savedConfigs[nextConfigId].icon;
            }

            this.pages[index] = nextPage;
            this.persistChanges();
        }
    }

    deletePage(id: string, deleteConfig = false) {
        const page = this.pages.find(p => p.id === id);
        if (deleteConfig && page) {
            const configId = DashboardStore.deriveConfigIdFromPath(page.path);
            delete this.savedConfigs[configId];
            if (this.config?.id === configId) {
                this.config = null;
            }
        }

        this.pages = this.pages.filter(p => p.id !== id);
        this.persistChanges();
    }

    updateDashboardMetadata(id: string, updates: Pick<Partial<RoomDashboardConfig>, 'name' | 'icon'>) {
        const config = this.savedConfigs[id];
        if (!config) return;

        config.name = updates.name ?? config.name;
        config.icon = updates.icon ?? config.icon;

        if (this.config?.id === id) {
            this.config = config;
        }

        this.persistChanges();
    }
}

export const dashboardStore = new DashboardStore(haStore);
