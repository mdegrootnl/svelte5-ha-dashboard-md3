import type { Connection } from 'home-assistant-js-websocket';
import type { HADeviceRegistryEntry, HAEntityRegistryEntry } from '../types';
import type { HAArea, HAFloor } from '../types/dashboard';
import { createLogger } from '../utils/logger';

const logger = createLogger('HARegistryStore');

export class HARegistryStore {
    areas = $state<HAArea[]>([]);
    floors = $state<HAFloor[]>([]);
    entityRegistry = $state<HAEntityRegistryEntry[]>([]);
    deviceRegistry = $state<HADeviceRegistryEntry[]>([]);
    loading = $state(false);
    version = $state(0);

    /**
     * Map of floor_id to area_ids.
     */
    floorAreas = $derived.by(() => {
        const mapping: Record<string, string[]> = {};
        for (const area of this.areas) {
            const floorId = area.floor_id || 'unassigned';
            if (!mapping[floorId]) {
                mapping[floorId] = [];
            }
            mapping[floorId].push(area.area_id);
        }
        return mapping;
    });

    async fetch(connection: Connection | null) {
        if (!connection) return;

        this.loading = true;
        try {
            logger.debug("Fetching registries...");
            const [areas, floors, entityRegistry, deviceRegistry] = await Promise.all([
                connection.sendMessagePromise<HAArea[]>({ type: 'config/area_registry/list' }),
                connection.sendMessagePromise<HAFloor[]>({ type: 'config/floor_registry/list' }),
                connection.sendMessagePromise<HAEntityRegistryEntry[]>({ type: 'config/entity_registry/list' }),
                connection.sendMessagePromise<HADeviceRegistryEntry[]>({ type: 'config/device_registry/list' })
            ]);

            this.areas = areas ?? [];
            this.floors = floors ?? [];
            this.entityRegistry = entityRegistry ?? [];
            this.deviceRegistry = deviceRegistry ?? [];
            this.version += 1;
            logger.debug(`Registries loaded: ${this.areas.length} areas, ${this.floors.length} floors, ${this.entityRegistry.length} entities, ${this.deviceRegistry.length} devices.`);
        } catch (err) {
            logger.error("Failed to fetch registries:", err);
        } finally {
            this.loading = false;
        }
    }
}

export const haRegistryStore = new HARegistryStore();
