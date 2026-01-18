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
            const auth = await HAAuthService.initialize();
            if (auth) {
                this.auth = auth;
                await this.connect(auth);
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
                // Persist new tokens via StorageProvider callback (already handled in HAAuthService)
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
            const historyData = HistoryService.transformResponse(rawData, validEntityIds);

            // Update cache
            this.historyCache.set(cacheKey, { data: historyData, timestamp: Date.now() });

            return historyData;
        } catch (err) {
            logger.error('Failed to fetch history:', err);
            return [];
        }
    }


    /**
     * Get a proxied URL for a Home Assistant resource (images, media, etc.)
     * This is required in production to bypass CSP and CORS.
     */
    getProxiedUrl(path: string | null): string | null {
        if (!path) return null;
        if (!this.auth || !this.url) return path;

        // Debug logging for MA images
        if (path.includes('music_assistant') || path.includes('mass')) {
            logger.debug('Proxying MA URL:', { input: path });
        }

        // If it's an absolute URL, check if it's our HA URL
        if (path.startsWith('http')) {
            // If it's not our HA URL, return as is (CSP now allows it)
            if (!this.url || !path.startsWith(this.url)) {
                // logger.debug('Returning absolute URL as is:', path);
                return path;
            }

            // It IS our HA URL but absolute, we should still proxy it to add the token
            // Strip the base URL to make it relative for the proxy
            path = path.replace(this.url, '');
        }

        const proxied = `/api/ha-proxy?path=${encodeURIComponent(path)}&token=${encodeURIComponent(this.auth.accessToken)}&url=${encodeURIComponent(this.url)}`;
        if (path.includes('music_assistant')) logger.debug('Proxied result:', proxied);
        return proxied;
    }

    /**
     * Clear history cache (useful when switching entities)
     */
    clearHistoryCache() {
        this.historyCache.clear();
    }
}

export const haStore = new HAStore();
