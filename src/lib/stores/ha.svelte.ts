import {
    getAuth,
    createConnection,
    subscribeEntities,
    subscribeConfig,
    type Auth,
    type Connection,
    type HassEntities,
    type HassConfig,
    ERR_HASS_HOST_REQUIRED,
    callService
} from 'home-assistant-js-websocket';
import { browser, dev } from '$app/environment';
import type { HistoryData } from '$lib/types';
import { HistoryService } from '$lib/domain/historyService';
import { HAAuthService } from '$lib/domain/haAuthService';
import { StorageProvider } from '$lib/utils/storageProvider';
import { haRegistryStore } from './haRegistry.svelte';
import { createLogger } from '$lib/utils/logger';
import { ok, err, type Result } from '$lib/utils/result';

const logger = createLogger('HAStore');

// Connection states for UI feedback
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'expired' | 'error';

export class HAStore {
    connection = $state<Connection | null>(null);
    auth = $state<Auth | null>(null);
    url = $state<string | null>(null);
    states = $state<HassEntities>({});
    config = $state<HassConfig | null>(null);
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
        try {
            logger.info('[HAStore] Initializing...');
            const auth = await HAAuthService.initialize();
            if (auth) {
                logger.info('[HAStore] Auth found, connecting...');
                this.auth = auth;
                await this.connect(auth);
            } else {
                logger.info('[HAStore] No auth found.');
            }
        } catch (err) {
            if (err !== ERR_HASS_HOST_REQUIRED) {
                logger.error("HA Init Error:", err);
            }
        }
    }

    async login(host: string, port: string = "8123") {
        const hassUrl = HAAuthService.formatUrl(host, port);
        logger.info("Connecting to Home Assistant at:", hassUrl);
        this.connectionState = 'connecting';
        this.connectionError = null;

        try {
            this.error = null;
            const auth = await HAAuthService.login(hassUrl);
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

            // Persist the successful URL
            if (browser && this.url) {
                StorageProvider.saveLastUrl(this.url);
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

            // Fetch Registries (Areas/Floors) via the dedicated store
            haRegistryStore.fetch(connection);

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
        StorageProvider.clear();
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

    async getLastUsedUrl(): Promise<string | null> {
        return StorageProvider.loadLastUrl();
    }

    async callService(domain: string, service: string, serviceData?: object, target?: object, returnResponse = false): Promise<Result<any, Error>> {
        if (!this.connection) return err(new Error("No connection"));

        try {
            if (returnResponse) {
                const response = await this.connection.sendMessagePromise({
                    type: 'call_service',
                    domain,
                    service,
                    service_data: serviceData,
                    target,
                    return_response: true
                });
                return ok(response);
            }

            await callService(this.connection, domain, service, serviceData, target);
            return ok(undefined);
        } catch (e) {
            let message = 'Unknown error';
            if (e instanceof Error) {
                message = e.message;
            } else if (typeof e === 'object' && e !== null) {
                // Handle WebSocket error objects which often have a 'message' or 'code' property
                message = (e as any).message || (e as any).code || JSON.stringify(e);
            } else {
                message = String(e);
            }

            const error = new Error(message);
            logger.error(`callService failed (${domain}.${service}):`, error);
            return err(error);
        }
    }

    /**
     * Fetch entity history from Home Assistant REST API
     * Uses caching to prevent excessive API calls (5 minute TTL)
     */
    async getHistory(
        entityIds: string[],
        startTime: Date,
        endTime: Date = new Date()
    ): Promise<Result<HistoryData[], Error>> {
        logger.debug("getHistory called. Auth:", !!this.auth, "URL:", this.url);
        if (!this.auth || !this.url) {
            const error = new Error("Missing auth or url");
            logger.warn("getHistory failed:", error.message);
            return err(error);
        }

        // Refresh token if expired (vital for OAuth sessions)
        if (this.auth.expired) {
            logger.debug("Token expired, refreshing...");
            try {
                await this.auth.refreshAccessToken();
                // Persist new tokens via StorageProvider callback (already handled in HAAuthService)
            } catch (err) {
                logger.error("Token refresh failed:", err);
                // Let the fetch proceed and fail naturally, or return empty?
                // Failing naturally allows the 401 logic elsewhere to trigger if needed.
            }
        }

        // Validate entity IDs to prevent injection
        const validEntityIds = entityIds.filter(id => /^[a-z_]+\.[a-z0-9_]+$/.test(id));
        if (validEntityIds.length === 0) return ok([]);

        const cacheKey = `${validEntityIds.sort().join(',')}:${startTime.toISOString()}`;
        const cached = this.historyCache.get(cacheKey);
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            return ok(cached.data);
        }

        try {
            logger.debug("Fetching history for:", validEntityIds);
            const start = startTime.toISOString();
            const end = endTime.toISOString();
            const filter = validEntityIds.join(',');

            // Use URLSearchParams to ensure proper encoding of all parameters
            const params = new URLSearchParams({
                timestamp: start,
                end_time: end,
                filter_entity_id: filter
            });

            // Use local proxy to avoid CORS issues in production and Vite proxy collisions
            const proxyUrl = `/ha-history?${params.toString()}`;
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
            const historyData = HistoryService.transformResponse(rawData, validEntityIds);

            // Update cache
            this.historyCache.set(cacheKey, { data: historyData, timestamp: Date.now() });

            return ok(historyData);
        } catch (e: unknown) {
            const error = e instanceof Error ? e : new Error(String(e));
            logger.error('Failed to fetch history:', error);
            return err(error);
        }
    }


    /**
     * Get a proxied URL for a Home Assistant resource (images, media, etc.)
     * This is required in production to bypass CSP and CORS.
     */
    getProxiedUrl(path: string | null): string | null {
        // Delegate to HAAuthService which is pure
        return HAAuthService.getProxiedUrl(path, this.url, this.auth?.accessToken);
    }

    /**
     * Clear history cache (useful when switching entities)
     */
    clearHistoryCache() {
        this.historyCache.clear();
    }
}

export const haStore = new HAStore();
