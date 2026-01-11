import {
    getAuth,
    createConnection,
    createLongLivedTokenAuth,
    subscribeEntities,
    subscribeConfig,
    type Auth,
    type Connection,
    type HassEntities,
    type HassConfig,
    ERR_HASS_HOST_REQUIRED,
    callService
} from 'home-assistant-js-websocket';
import { browser } from '$app/environment';
import type { HistoryData, HistoryDataPoint, HAEntityRegistryEntry, HAAreaRegistryEntry, HAFloorRegistryEntry } from '$lib/types';
import type { HAArea, HAFloor } from '$lib/types/dashboard';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('HAStore');

// Connection states for UI feedback
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'expired' | 'error';

export class HAStore {
    connection = $state<Connection | null>(null);
    auth = $state<Auth | null>(null);
    url = $state<string | null>(null);
    states = $state<HassEntities>({});
    config = $state<HassConfig | null>(null);
    areas = $state<HAArea[]>([]);
    floors = $state<HAFloor[]>([]);
    entityRegistry = $state<HAEntityRegistryEntry[]>([]);
    error = $state<string | null>(null);
    connected = $derived(!!this.connection);
    user = $state<string | null>(null);

    // Connection state tracking for UI feedback
    connectionState = $state<ConnectionState>('disconnected');
    connectionError = $state<string | null>(null);

    // History cache: key is "entityIds:startTime", value is HistoryData[]
    private historyCache = new Map<string, { data: HistoryData[], timestamp: number }>();

    constructor() {
        if (browser) {
            this.init();
        }
    }

    async init() {

        // Fall through to OAuth flow
        try {
            const auth = await getAuth({ saveTokens: this.saveTokens.bind(this), loadTokens: this.loadTokens.bind(this) });
            if (auth) {
                this.auth = auth;
                await this.connect(auth);
            }
        } catch (err) {
            if (err !== ERR_HASS_HOST_REQUIRED) {
                logger.error("HA Init Error:", err);
            }
            // Expected if no auth saved
        }
    }

    async login(host: string, port: string = "8123") {
        let hassUrl = host.trim();

        // Ensure there is a protocol
        if (!hassUrl.startsWith("http")) {
            hassUrl = `https://${hassUrl}`;
        }

        // Strip trailing slash before appending port
        hassUrl = hassUrl.replace(/\/$/, "");

        // Append port if it's missing from the host string
        if (port && port.trim() !== "" && !hassUrl.match(/:\d+$/)) {
            hassUrl = `${hassUrl}:${port.trim()}`;
        }

        logger.info("Connecting to Home Assistant at:", hassUrl);
        this.connectionState = 'connecting';
        this.connectionError = null;

        try {
            this.error = null;
            const auth = await getAuth({
                hassUrl,
                saveTokens: this.saveTokens.bind(this),
                loadTokens: this.loadTokens.bind(this)
            });
            this.auth = auth;
            await this.connect(auth);
            return true;
        } catch (err) {
            this.connectionState = 'error';
            this.connectionError = err instanceof Error ? `${err.name}: ${err.message}` : 'Login failed';
            this.error = this.connectionError;
            logger.error("HA Login Error:", err);
            throw err;
        }
    }


    async connect(auth: Auth) {
        this.connectionState = 'connecting';

        try {
            this.error = null;
            const connection = await createConnection({ auth });
            this.connection = connection;
            this.url = auth.data.hassUrl;

            // Persist the successful URL to a dedicated key for settings page recovery
            if (browser && this.url) {
                localStorage.setItem('last_hass_url', this.url);
            }

            this.connectionState = 'connected';
            this.connectionError = null;

            // Listen for connection close/error
            connection.addEventListener('ready', () => {
                this.connectionState = 'connected';
                this.connectionError = null;
            });

            connection.addEventListener('disconnected', () => {
                // Don't set this.connection = null immediately, as the library will try to reconnect
                this.connectionState = 'connecting';
                this.connectionError = 'Connection lost. Attempting to reconnect...';
            });

            connection.addEventListener('reconnect-error', () => {
                this.connection = null;
                this.connectionState = 'error';
                this.connectionError = 'Failed to reconnect to Home Assistant.';
            });

            // Subscribe to all entities
            subscribeEntities(connection, (states) => {
                this.states = states;
            });

            // Subscribe to configuration (location, units, etc.)
            subscribeConfig(connection, (config) => {
                logger.debug("Config received:", config.latitude, config.longitude);
                this.config = config;
            });

            // Fetch Registries (Areas/Floors)
            this.fetchRegistries();

            // Get user info if available (simplified)
            // In a real app we'd fetch config/user
        } catch (err) {
            this.connectionState = 'error';
            this.connectionError = err instanceof Error ? err.message : 'Connection failed';
            this.error = this.connectionError;
            logger.error("HA Connection Error:", err);
            throw err;
        }
    }

    getEntity(entityId: string) {
        return this.states[entityId];
    }

    async disconnect() {
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
        this.auth = null;
        this.connectionState = 'disconnected';
        this.connectionError = null;
        // Clear stored tokens
        localStorage.removeItem('hass_tokens');
    }

    /**
     * Clear connection error state (for reconnect UI)
     */
    clearError() {
        this.connectionError = null;
        if (this.connectionState === 'error' || this.connectionState === 'expired') {
            this.connectionState = 'disconnected';
        }
    }

    // Custom Token Storage to ensure persistence
    saveTokens(tokens: any) {
        if (browser) {
            localStorage.setItem('hass_tokens', JSON.stringify(tokens));
        }
    }

    async loadTokens() {
        if (browser) {
            const tokens = localStorage.getItem('hass_tokens');
            return tokens ? JSON.parse(tokens) : null;
        }
        return null;
    }

    /**
     * Get the last successfully used URL from storage
     */
    async getLastUsedUrl(): Promise<string | null> {
        if (browser) {
            const dedicated = localStorage.getItem('last_hass_url');
            if (dedicated) return dedicated;
        }
        const tokens = await this.loadTokens();
        return tokens?.hassUrl || null;
    }

    async callService(domain: string, service: string, serviceData?: object, target?: object, returnResponse = false) {
        if (!this.connection) return;

        if (returnResponse) {
            return this.connection.sendMessagePromise({
                type: 'call_service',
                domain,
                service,
                service_data: serviceData,
                target,
                return_response: true
            });
        }

        return callService(this.connection, domain, service, serviceData, target);
    }

    /**
     * Fetch entity history from Home Assistant REST API
     * Uses caching to prevent excessive API calls (5 minute TTL)
     */
    async getHistory(
        entityIds: string[],
        startTime: Date,
        endTime: Date = new Date()
    ): Promise<HistoryData[]> {
        logger.debug("getHistory called. Auth:", !!this.auth, "URL:", this.url);
        if (!this.auth || !this.url) {
            logger.warn("Missing auth or url, returning empty history.");
            return [];
        }

        // Refresh token if expired (vital for OAuth sessions)
        if (this.auth.expired) {
            logger.debug("Token expired, refreshing...");
            try {
                await this.auth.refreshAccessToken();
                // Persist new tokens if using OAuth
                this.saveTokens(this.auth.data);
            } catch (err) {
                logger.error("Token refresh failed:", err);
                // Let the fetch proceed and fail naturally, or return empty?
                // Failing naturally allows the 401 logic elsewhere to trigger if needed.
            }
        }

        // Validate entity IDs to prevent injection
        const validEntityIds = entityIds.filter(id => /^[a-z_]+\.[a-z0-9_]+$/.test(id));
        if (validEntityIds.length === 0) return [];

        const cacheKey = `${validEntityIds.sort().join(',')}:${startTime.toISOString()}`;
        const cached = this.historyCache.get(cacheKey);
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            return cached.data;
        }

        try {
            logger.debug("Fetching history for:", validEntityIds);
            const start = startTime.toISOString();
            const end = endTime.toISOString();
            const filter = validEntityIds.join(',');
            // Use local proxy to avoid CORS issues in production and Vite proxy collisions
            const { dev } = await import('$app/environment');
            const proxyUrl = `/ha-history?timestamp=${start}&end_time=${end}&filter_entity_id=${filter}`;
            logger.debug("Request URL (Proxy):", proxyUrl);

            const response = await fetch(
                proxyUrl,
                {
                    headers: {
                        Authorization: `Bearer ${this.auth.accessToken}`,
                        'Content-Type': 'application/json',
                        'x-ha-url': this.url
                    }
                }
            );

            if (!response.ok) {
                logger.error("Response not OK:", response.status, response.statusText);
                throw new Error(`History fetch failed: ${response.status}`);
            }

            const rawData = await response.json();
            logger.debug("Raw history data length:", rawData.length);
            const historyData = this.transformHistoryResponse(rawData, validEntityIds);

            // Update cache
            this.historyCache.set(cacheKey, { data: historyData, timestamp: Date.now() });

            return historyData;
        } catch (err) {
            logger.error('Failed to fetch history:', err);
            return [];
        }
    }

    /**
     * Fetch Area and Floor registries to build navigation structure
     */
    async fetchRegistries() {
        if (!this.connection) return;
        try {
            logger.debug("Fetching registries...");
            // Use parallel requests for speed
            const [areas, floors, entityRegistry] = await Promise.all([
                this.connection.sendMessagePromise<HAArea[]>({ type: 'config/area_registry/list' }),
                this.connection.sendMessagePromise<HAFloor[]>({ type: 'config/floor_registry/list' }),
                this.connection.sendMessagePromise<HAEntityRegistryEntry[]>({ type: 'config/entity_registry/list' })
            ]);

            this.areas = areas;
            this.floors = floors;
            this.entityRegistry = entityRegistry;
            logger.debug(`Registries loaded: ${areas.length} areas, ${floors.length} floors, ${entityRegistry.length} entities.`);
        } catch (err) {
            logger.error("Failed to fetch registries:", err);
        }
    }

    /**
     * Transform HA history response to typed HistoryData format
     */
    private transformHistoryResponse(rawData: any[][], entityIds: string[]): HistoryData[] {
        return rawData.map((entityHistory, index) => {
            const entityId = entityIds[index] || entityHistory[0]?.entity_id || 'unknown';
            const isClimate = entityId.startsWith('climate.');

            const points: HistoryDataPoint[] = entityHistory.map((entry: any) => {
                let val: number;

                if (isClimate) {
                    val = parseFloat(entry.attributes?.current_temperature);
                    // Fallback to state if attribute missing (though unlikely for climate)
                    if (isNaN(val)) val = parseFloat(entry.state);
                } else {
                    val = parseFloat(entry.state);
                }

                return {
                    timestamp: new Date(entry.last_changed || entry.last_updated),
                    state: entry.state,
                    value: isNaN(val) ? null : val
                };
            });

            return {
                entityId,
                points
            };
        });
    }

    /**
     * Clear history cache (useful when switching entities)
     */
    clearHistoryCache() {
        this.historyCache.clear();
    }
}

export const haStore = new HAStore();
