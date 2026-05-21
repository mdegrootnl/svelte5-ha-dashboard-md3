import {
    buildSmartAirOptions,
    buildSmartCalendarOptions,
    buildSmartCoverOptions,
    buildSmartDevicePanelOptions,
    buildSmartEnergyOptions,
    buildSmartLockOptions,
    buildSmartRemoteOptions,
    buildSmartSecurityOptions,
    buildSmartTodoOptions,
    buildSmartUpdateOptions,
    buildSmartVacuumOptions,
    buildSmartWeatherOptions,
    createInventoryIndex,
    type InventoryIndex,
} from '$lib/domain/haInventory';
import type {
    AirCardOptions,
    CalendarCardOptions,
    CoverCardOptions,
    DevicePanelCardOptions,
    EnergyCardOptions,
    EntityQueryConfig,
    LockCardOptions,
    RemoteCardOptions,
    SecurityCardOptions,
    TodoCardOptions,
    UpdateCardOptions,
    VacuumCardOptions,
    WeatherCardOptions,
} from '$lib/types';
import { perfCount } from '$lib/utils/perf';
import { haRegistryStore } from './haRegistry.svelte';
import { haStore } from './ha.svelte';

export class InventoryStore {
    index = $derived.by(() => {
        haStore.statesVersion;
        haStore.overridesVersion;
        haRegistryStore.version;
        const context = {
            states: haStore.getStatesView(),
            entities: haRegistryStore.entityRegistry,
            devices: haRegistryStore.deviceRegistry,
            areas: haRegistryStore.areas,
            floors: haRegistryStore.floors,
        };
        return createInventoryIndex(context);
    });

    query(query: EntityQueryConfig = {}) {
        perfCount('inventoryStore.query');
        return this.index.query(query);
    }

    getEntities(entityIds: string[]) {
        perfCount('inventoryStore.getEntities');
        return this.index.getEntities(entityIds);
    }

    findFirst(terms: string[], domains?: string[], deviceClasses?: string[]) {
        perfCount('inventoryStore.findFirst');
        return this.index.findFirstEntityId(terms, domains, deviceClasses);
    }

    smartEnergyOptions(current: EnergyCardOptions = {}) {
        perfCount('smartCard.energy.recompute');
        return buildSmartEnergyOptions(this.index as InventoryIndex, current);
    }

    smartWeatherOptions(current: WeatherCardOptions = {}) {
        perfCount('smartCard.weather.recompute');
        return buildSmartWeatherOptions(this.index as InventoryIndex, current);
    }

    smartCalendarOptions(current: CalendarCardOptions = {}, fallbackEntityId = '') {
        perfCount('smartCard.calendar.recompute');
        return buildSmartCalendarOptions(this.index as InventoryIndex, current, fallbackEntityId);
    }

    smartRemoteOptions(current: RemoteCardOptions = {}, fallbackEntityId = '') {
        perfCount('smartCard.remote.recompute');
        return buildSmartRemoteOptions(this.index as InventoryIndex, current, fallbackEntityId);
    }

    smartDevicePanelOptions(current: DevicePanelCardOptions = {}, fallbackEntityId = '') {
        perfCount('smartCard.devicePanel.recompute');
        return buildSmartDevicePanelOptions(this.index as InventoryIndex, current, fallbackEntityId);
    }

    smartSecurityOptions(current: SecurityCardOptions = {}, fallbackEntityId = '') {
        perfCount('smartCard.security.recompute');
        return buildSmartSecurityOptions(this.index as InventoryIndex, current, fallbackEntityId);
    }

    smartLockOptions(current: LockCardOptions = {}, fallbackEntityId = '') {
        perfCount('smartCard.lock.recompute');
        return buildSmartLockOptions(this.index as InventoryIndex, current, fallbackEntityId);
    }

    smartCoverOptions(current: CoverCardOptions = {}, fallbackEntityId = '') {
        perfCount('smartCard.cover.recompute');
        return buildSmartCoverOptions(this.index as InventoryIndex, current, fallbackEntityId);
    }

    smartAirOptions(current: AirCardOptions = {}, fallbackEntityId = '') {
        perfCount('smartCard.air.recompute');
        return buildSmartAirOptions(this.index as InventoryIndex, current, fallbackEntityId);
    }

    smartVacuumOptions(current: VacuumCardOptions = {}, fallbackEntityId = '') {
        perfCount('smartCard.vacuum.recompute');
        return buildSmartVacuumOptions(this.index as InventoryIndex, current, fallbackEntityId);
    }

    smartUpdateOptions(current: UpdateCardOptions = {}, fallbackEntityId = '') {
        perfCount('smartCard.update.recompute');
        return buildSmartUpdateOptions(this.index as InventoryIndex, current, fallbackEntityId);
    }

    smartTodoOptions(current: TodoCardOptions = {}, fallbackEntityId = '') {
        perfCount('smartCard.todo.recompute');
        return buildSmartTodoOptions(this.index as InventoryIndex, current, fallbackEntityId);
    }
}

export const inventoryStore = new InventoryStore();
