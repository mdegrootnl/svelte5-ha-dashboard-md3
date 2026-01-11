import type { Connection } from 'home-assistant-js-websocket';
import type { HAEntityRegistryEntry, HAAreaRegistryEntry, HAFloorRegistryEntry } from '../types';
import type { HAArea, HAFloor } from '../types/dashboard';
import { createLogger } from '../utils/logger';

const logger = createLogger('HARegistryStore');

export class HARegistryStore {
    areas = $state<HAArea[]>([]);
    floors = $state<HAFloor[]>([]);
    entityRegistry = $state<HAEntityRegistryEntry[]>([]);
    loading = $state(false);

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
            const [areas, floors, entityRegistry] = await Promise.all([
                connection.sendMessagePromise<HAArea[]>({ type: 'config/area_registry/list' }),
                connection.sendMessagePromise<HAFloor[]>({ type: 'config/floor_registry/list' }),
                connection.sendMessagePromise<HAEntityRegistryEntry[]>({ type: 'config/entity_registry/list' })
            ]);

            this.areas = areas;
            this.floors = floors;
            this.entityRegistry = entityRegistry;
            logger.debug(`Registries loaded: ${areas.length} areas, ${floors.length} floors, ${entityRegistry.length} entities.`);
        } catch (err) {
            logger.error("Failed to fetch registries:", err);
        } finally {
            this.loading = false;
        }
    }
}

export const haRegistryStore = new HARegistryStore();
