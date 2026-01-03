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

export class HAStore {
    connection = $state<Connection | null>(null);
    auth = $state<Auth | null>(null);
    url = $state<string | null>(null);
    states = $state<HassEntities>({});
    connected = $derived(!!this.connection);
    user = $state<string | null>(null);

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
            const auth = await getAuth({ hassUrl });
            this.auth = auth;
            await this.connect(auth);
            return true;
        } catch (err) {
            console.error("HA Login Error:", err);
            throw err;
        }
    }

    async connect(auth: Auth) {
        try {
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
}

export const haStore = new HAStore();
