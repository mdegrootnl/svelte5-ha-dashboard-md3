import {
    getAuth,
    createConnection,
    subscribeEntities,
    type Auth,
    type Connection,
    type HassEntities,
    ERR_HASS_HOST_REQUIRED,
    callService
} from 'home-assistant-js-websocket';
import { browser } from '$app/environment';
import type { HistoryData, HistoryDataPoint } from '$lib/types';

export class HAStore {
    connection = $state<Connection | null>(null);
    auth = $state<Auth | null>(null);
    url = $state<string | null>(null);
    states = $state<HassEntities>({});
    error = $state<string | null>(null);
    connected = $derived(!!this.connection);
    user = $state<string | null>(null);

    // History cache: key is "entityIds:startTime", value is HistoryData[]
    private historyCache = new Map<string, { data: HistoryData[], timestamp: number }>();

    constructor() {
        if (browser) {
            this.init();
        }
    }

    async init() {
        try {
            // Try to load saved auth
            const auth = await getAuth({ saveTokens: this.saveTokens.bind(this), loadTokens: this.loadTokens.bind(this) });
            if (auth) {
                this.auth = auth;
                await this.connect(auth);
            }
        } catch (err) {
            if (err !== ERR_HASS_HOST_REQUIRED) {
                console.error("HA Init Error:", err);
            }
            // Expected if no auth saved
        }
    }

    async login(host: string, port: string = "8123") {
        const protocol = host.startsWith("http") ? "" : "https://";
        const hassUrl = `${protocol}${host}:${port}`;

        try {
            this.error = null;
            const auth = await getAuth({ hassUrl });
            this.auth = auth;
            await this.connect(auth);
            return true;
        } catch (err) {
            this.error = err instanceof Error ? err.message : 'Login failed';
            console.error("HA Login Error:", err);
            throw err;
        }
    }

    async connect(auth: Auth) {
        try {
            this.error = null;
            const connection = await createConnection({ auth });
            this.connection = connection;
            this.url = auth.data.hassUrl;

            // Subscribe to all entities
            subscribeEntities(connection, (states) => {
                this.states = states;
            });

            // Get user info if available (simplified)
            // In a real app we'd fetch config/user
        } catch (err) {
            this.error = err instanceof Error ? err.message : 'Connection failed';
            console.error("HA Connection Error:", err);
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
        // In a real implementation we might want to revoke tokens or clear storage
        localStorage.removeItem('hass_tokens');
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

    async callService(domain: string, service: string, serviceData?: object) {
        if (!this.connection) return;
        return callService(this.connection, domain, service, serviceData);
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
        console.log("[HA Debug] getHistory called. Auth:", !!this.auth, "URL:", this.url);
        if (!this.auth || !this.url) {
            console.warn("[HA Debug] Missing auth or url, returning empty history.");
            return [];
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
            console.log("[HA Debug] Fetching history for:", validEntityIds);
            const start = startTime.toISOString();
            const end = endTime.toISOString();
            const filter = validEntityIds.join(',');
            // In dev mode, use relative URL to go through Vite proxy
            const { dev } = await import('$app/environment');
            const baseUrl = dev ? '' : this.url;
            const url = `${baseUrl}/api/history/period/${start}?end_time=${end}&filter_entity_id=${filter}`;
            console.log("[HA Debug] Request URL:", url);

            const response = await fetch(
                url,
                {
                    headers: {
                        Authorization: `Bearer ${this.auth.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error("[HA Debug] Response not OK:", response.status, response.statusText);
                throw new Error(`History fetch failed: ${response.status}`);
            }

            const rawData = await response.json();
            console.log("[HA Debug] Raw history data length:", rawData.length);
            const historyData = this.transformHistoryResponse(rawData, validEntityIds);

            // Update cache
            this.historyCache.set(cacheKey, { data: historyData, timestamp: Date.now() });

            return historyData;
        } catch (err) {
            console.error('Failed to fetch history:', err);
            return [];
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
