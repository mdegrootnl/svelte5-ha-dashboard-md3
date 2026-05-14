import type {
    CollectionCardOptions,
    EnergyCardOptions,
    EntityQueryConfig,
    HADeviceRegistryEntry,
    HAEntity,
    HAEntityRegistryEntry,
    WeatherCardOptions,
} from '$lib/types';
import type { HAArea, HAFloor } from '$lib/types/dashboard';
import { getDomain, getEntityName } from '$lib/utils/entity';

export interface InventoryContext {
    states: Record<string, HAEntity>;
    entities: HAEntityRegistryEntry[];
    devices?: HADeviceRegistryEntry[];
    areas?: HAArea[];
    floors?: HAFloor[];
}

export interface ResolvedEntity {
    entityId: string;
    domain: string;
    name: string;
    state: string;
    unit?: string;
    deviceClass?: string;
    areaId?: string | null;
    labels: string[];
    hidden: boolean;
    diagnostic: boolean;
    lastChanged?: string;
}

const ACTIVE_STATES = new Set(['on', 'open', 'playing', 'home', 'active', 'locked', 'above_horizon']);
const BAD_STATES = new Set(['unavailable', 'unknown']);

function includesAny(source: string[] | undefined, candidates: Array<string | null | undefined>): boolean {
    if (!source || source.length === 0) return true;
    return candidates.some((candidate) => !!candidate && source.includes(candidate));
}

function getDeviceAreaId(deviceId: string | null, devices: HADeviceRegistryEntry[] = []) {
    if (!deviceId) return null;
    return devices.find((device) => device.id === deviceId)?.area_id ?? null;
}

export function getEntityAreaId(entry: HAEntityRegistryEntry | undefined, devices: HADeviceRegistryEntry[] = []) {
    return entry?.area_id ?? getDeviceAreaId(entry?.device_id ?? null, devices);
}

export function toResolvedEntities(context: InventoryContext): ResolvedEntity[] {
    const registryById = new Map(context.entities.map((entry) => [entry.entity_id, entry]));

    return Object.values(context.states).map((entity) => {
        const entry = registryById.get(entity.entity_id);
        const domain = getDomain(entity.entity_id);
        const deviceLabels = entry?.device_id
            ? (context.devices?.find((device) => device.id === entry.device_id)?.labels ?? [])
            : [];
        const labels = Array.from(new Set([...(entry?.labels ?? []), ...deviceLabels]));

        return {
            entityId: entity.entity_id,
            domain,
            name: getEntityName(entity.entity_id, entity.attributes),
            state: entity.state,
            unit: typeof entity.attributes.unit_of_measurement === 'string'
                ? entity.attributes.unit_of_measurement
                : undefined,
            deviceClass: typeof entity.attributes.device_class === 'string'
                ? entity.attributes.device_class
                : undefined,
            areaId: getEntityAreaId(entry, context.devices),
            labels,
            hidden: !!entry?.hidden_by || !!entry?.disabled_by,
            diagnostic: entry?.entity_category === 'diagnostic',
            lastChanged: entity.last_changed,
        };
    });
}

export function resolveEntityQuery(context: InventoryContext, query: EntityQueryConfig = {}): ResolvedEntity[] {
    const floors = new Set(query.floorIds ?? []);
    const areaIdsFromFloors = new Set(
        floors.size === 0
            ? []
            : (context.areas ?? [])
                .filter((area) => area.floor_id && floors.has(area.floor_id))
                .map((area) => area.area_id)
    );
    const explicitAreas = new Set(query.areaIds ?? []);

    let results = toResolvedEntities(context).filter((entity) => {
        if (!query.includeHidden && entity.hidden) return false;
        if (!query.includeDiagnostic && entity.diagnostic) return false;
        if (!includesAny(query.domains, [entity.domain])) return false;
        if (!includesAny(query.deviceClasses, [entity.deviceClass])) return false;
        if (!includesAny(query.states, [entity.state])) return false;
        if (!includesAny(query.labels, entity.labels)) return false;

        if (explicitAreas.size > 0 && !explicitAreas.has(entity.areaId ?? '')) return false;
        if (areaIdsFromFloors.size > 0 && !areaIdsFromFloors.has(entity.areaId ?? '')) return false;

        return true;
    });

    const sort = query.sort ?? 'name';
    results = results.sort((a, b) => {
        if (sort === 'domain') return `${a.domain}:${a.name}`.localeCompare(`${b.domain}:${b.name}`);
        if (sort === 'state') return `${a.state}:${a.name}`.localeCompare(`${b.state}:${b.name}`);
        if (sort === 'last_changed') return (b.lastChanged ?? '').localeCompare(a.lastChanged ?? '');
        return a.name.localeCompare(b.name);
    });

    return typeof query.limit === 'number' ? results.slice(0, query.limit) : results;
}

export function createCollectionQuery(options: CollectionCardOptions = {}): EntityQueryConfig {
    const threshold = options.threshold ?? 25;
    const mode = options.mode ?? 'auto';

    if (mode === 'lights_on') {
        return { domains: ['light', 'switch', 'fan'], states: ['on'], sort: 'domain', limit: options.query?.limit ?? 12 };
    }
    if (mode === 'unavailable') {
        return { states: ['unavailable', 'unknown'], includeDiagnostic: true, sort: 'domain', limit: options.query?.limit ?? 12 };
    }
    if (mode === 'updates') {
        return { domains: ['update'], states: ['on'], sort: 'name', limit: options.query?.limit ?? 12 };
    }
    if (mode === 'low_battery') {
        return { domains: ['sensor', 'binary_sensor'], deviceClasses: ['battery'], includeDiagnostic: true, sort: 'state', limit: options.query?.limit ?? 12 };
    }

    return options.query ?? { domains: ['light', 'switch', 'sensor', 'binary_sensor'], limit: 12 };
}

export function filterLowBattery(entities: ResolvedEntity[], threshold = 25): ResolvedEntity[] {
    return entities.filter((entity) => {
        if (entity.deviceClass !== 'battery') return false;
        const numeric = Number(entity.state);
        if (!Number.isFinite(numeric)) return BAD_STATES.has(entity.state);
        return numeric <= threshold;
    });
}

function findFirstEntityId(context: InventoryContext, terms: string[], domains?: string[], deviceClasses?: string[]) {
    const candidates = resolveEntityQuery(context, { domains, deviceClasses, includeDiagnostic: true, limit: 100 });
    const normalizedTerms = terms.map((term) => term.toLowerCase());
    return candidates.find((entity) => {
        const haystack = `${entity.entityId} ${entity.name} ${entity.deviceClass ?? ''}`.toLowerCase();
        return normalizedTerms.some((term) => haystack.includes(term));
    })?.entityId;
}

export function buildSmartEnergyOptions(context: InventoryContext, current: EnergyCardOptions = {}): EnergyCardOptions {
    return {
        source: current.source ?? 'auto',
        gridImportEntityId: current.gridImportEntityId ?? findFirstEntityId(context, ['grid import', 'net afname', 'import'], ['sensor'], ['power', 'energy']),
        gridExportEntityId: current.gridExportEntityId ?? findFirstEntityId(context, ['grid export', 'net teruglevering', 'export'], ['sensor'], ['power', 'energy']),
        solarPowerEntityId: current.solarPowerEntityId ?? findFirstEntityId(context, ['solar', 'pv', 'fronius', 'zonne'], ['sensor'], ['power']),
        homePowerEntityId: current.homePowerEntityId ?? findFirstEntityId(context, ['home power', 'house power', 'load', 'verbruik'], ['sensor'], ['power']),
        batteryPowerEntityId: current.batteryPowerEntityId ?? findFirstEntityId(context, ['battery', 'accu'], ['sensor'], ['power', 'energy']),
        todayEnergyEntityId: current.todayEnergyEntityId ?? findFirstEntityId(context, ['today', 'daily', 'dag'], ['sensor'], ['energy']),
        gasEntityId: current.gasEntityId ?? findFirstEntityId(context, ['gas'], ['sensor'], ['gas', 'energy']),
        waterEntityId: current.waterEntityId ?? findFirstEntityId(context, ['water'], ['sensor'], ['water']),
    };
}

export function buildSmartWeatherOptions(context: InventoryContext, current: WeatherCardOptions = {}): WeatherCardOptions {
    return {
        source: current.source ?? 'auto',
        weatherEntityId: current.weatherEntityId ?? findFirstEntityId(context, ['weather.'], ['weather']),
        temperatureEntityId: current.temperatureEntityId ?? findFirstEntityId(context, ['outdoor', 'outside', 'buiten'], ['sensor'], ['temperature']),
        humidityEntityId: current.humidityEntityId ?? findFirstEntityId(context, ['humidity', 'vocht'], ['sensor'], ['humidity']),
        rainEntityId: current.rainEntityId ?? findFirstEntityId(context, ['rain', 'regen', 'precipitation'], ['sensor'], ['precipitation']),
        windEntityId: current.windEntityId ?? findFirstEntityId(context, ['wind'], ['sensor'], ['wind_speed']),
    };
}

export function isActiveState(state: string): boolean {
    return ACTIVE_STATES.has(state);
}
