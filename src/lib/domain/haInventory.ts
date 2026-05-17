import type {
    CalendarCardOptions,
    CollectionCardOptions,
    DevicePanelCardOptions,
    EnergyCardOptions,
    EntityQueryConfig,
    HADeviceRegistryEntry,
    HAEntity,
    HAEntityRegistryEntry,
    RemoteCardOptions,
    WeatherCardOptions,
} from '$lib/types';
import type { HAArea, HAFloor } from '$lib/types/dashboard';
import { getDomain, getEntityName } from '$lib/utils/entity';
import { perfMeasure } from '$lib/utils/perf';

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
    deviceId?: string | null;
    unit?: string;
    deviceClass?: string;
    areaId?: string | null;
    areaSource?: 'entity_registry' | 'device_registry' | 'name_inference';
    labels: string[];
    hidden: boolean;
    diagnostic: boolean;
    lastChanged?: string;
}

export type InventorySource = InventoryContext | InventoryIndex;

const ACTIVE_STATES = new Set(['on', 'open', 'playing', 'home', 'active', 'locked', 'above_horizon']);
const BAD_STATES = new Set(['unavailable', 'unknown']);
const DEVICE_PANEL_DOMAINS = ['cover', 'fan', 'vacuum', 'timer', 'todo', 'switch', 'button'];
const OPENING_DEVICE_CLASSES = new Set(['door', 'window', 'opening', 'garage_door']);
const MOTION_DEVICE_CLASSES = new Set(['motion', 'occupancy', 'presence']);
const SECURITY_DEVICE_CLASSES = new Set(['smoke', 'moisture', 'gas', 'problem', 'safety', 'tamper']);
const OPENING_TERMS = ['door', 'window', 'opening', 'garage', 'gate', 'deur', 'raam', 'poort'];
const MOTION_TERMS = ['motion', 'presence', 'occupancy', 'beweging', 'aanwezig'];
const GENERIC_AREA_TOKENS = new Set([
    'area',
    'default',
    'floor',
    'general',
    'home',
    'house',
    'main',
    'room',
    'zone',
]);

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

function resolveEntityArea(
    entity: HAEntity,
    entry: HAEntityRegistryEntry | undefined,
    devices: HADeviceRegistryEntry[],
    areas: HAArea[],
    areaTokenOwners: Map<string, Set<string>>,
): Pick<ResolvedEntity, 'areaId' | 'areaSource'> {
    if (entry?.area_id) {
        return { areaId: entry.area_id, areaSource: 'entity_registry' };
    }

    const deviceAreaId = getDeviceAreaId(entry?.device_id ?? null, devices);
    if (deviceAreaId) {
        return { areaId: deviceAreaId, areaSource: 'device_registry' };
    }

    const inferredAreaId = inferEntityAreaId(entity, entry, areas, areaTokenOwners);
    if (inferredAreaId) {
        return { areaId: inferredAreaId, areaSource: 'name_inference' };
    }

    return { areaId: null };
}

function normalizeAreaText(value: string | null | undefined) {
    return (value ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function tokenizeAreaText(value: string | null | undefined) {
    return normalizeAreaText(value)
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !GENERIC_AREA_TOKENS.has(token));
}

function compactAreaText(value: string | null | undefined) {
    return normalizeAreaText(value).replace(/\s+/g, '');
}

function buildAreaTokenOwners(areas: HAArea[]) {
    const owners = new Map<string, Set<string>>();

    for (const area of areas) {
        const tokens = new Set([
            ...tokenizeAreaText(area.area_id),
            ...tokenizeAreaText(area.name),
        ]);

        for (const token of tokens) {
            const areaIds = owners.get(token) ?? new Set<string>();
            areaIds.add(area.area_id);
            owners.set(token, areaIds);
        }
    }

    return owners;
}

function inferEntityAreaId(
    entity: HAEntity,
    entry: HAEntityRegistryEntry | undefined,
    areas: HAArea[],
    areaTokenOwners: Map<string, Set<string>>,
) {
    if (areas.length === 0) return null;

    const haystack = [
        entity.entity_id,
        typeof entity.attributes.friendly_name === 'string' ? entity.attributes.friendly_name : '',
        entry?.name,
        entry?.original_name,
    ].join(' ');
    const haystackTokens = new Set(tokenizeAreaText(haystack));
    const matches = new Set<string>();

    for (const token of haystackTokens) {
        const owners = areaTokenOwners.get(token);
        if (owners?.size === 1) {
            matches.add([...owners][0]);
        }
    }

    if (matches.size === 1) {
        return [...matches][0];
    }

    if (matches.size > 1) {
        return null;
    }

    const compactHaystack = compactAreaText(haystack);
    for (const area of areas) {
        const aliases = new Set([
            compactAreaText(area.area_id),
            compactAreaText(area.name),
        ]);
        for (const alias of aliases) {
            if (alias.length >= 5 && !GENERIC_AREA_TOKENS.has(alias) && compactHaystack.includes(alias)) {
                return area.area_id;
            }
        }
    }

    return null;
}

function sortResolvedEntities(results: ResolvedEntity[], sort: EntityQueryConfig['sort'] = 'name') {
    return results.sort((a, b) => {
        if (sort === 'domain') return `${a.domain}:${a.name}`.localeCompare(`${b.domain}:${b.name}`);
        if (sort === 'state') return `${a.state}:${a.name}`.localeCompare(`${b.state}:${b.name}`);
        if (sort === 'last_changed') return (b.lastChanged ?? '').localeCompare(a.lastChanged ?? '');
        return a.name.localeCompare(b.name);
    });
}

function queryCacheKey(query: EntityQueryConfig = {}) {
    return JSON.stringify({
        domains: query.domains ?? [],
        deviceClasses: query.deviceClasses ?? [],
        areaIds: query.areaIds ?? [],
        floorIds: query.floorIds ?? [],
        labels: query.labels ?? [],
        states: query.states ?? [],
        includeHidden: query.includeHidden ?? false,
        includeDiagnostic: query.includeDiagnostic ?? false,
        limit: query.limit ?? null,
        sort: query.sort ?? 'name'
    });
}

export class InventoryIndex {
    readonly states: Record<string, HAEntity>;
    readonly entities: HAEntityRegistryEntry[];
    readonly devices: HADeviceRegistryEntry[];
    readonly areas: HAArea[];
    readonly floors: HAFloor[];
    readonly registryById: Map<string, HAEntityRegistryEntry>;
    readonly deviceById: Map<string, HADeviceRegistryEntry>;
    readonly floorAreaIds: Map<string, Set<string>>;
    readonly resolvedEntities: ResolvedEntity[];
    readonly resolvedById: Map<string, ResolvedEntity>;
    private byDomain = new Map<string, ResolvedEntity[]>();
    private byDeviceClass = new Map<string, ResolvedEntity[]>();
    private queryCache = new Map<string, ResolvedEntity[]>();

    constructor(context: InventoryContext) {
        this.states = context.states;
        this.entities = context.entities ?? [];
        this.devices = context.devices ?? [];
        this.areas = context.areas ?? [];
        this.floors = context.floors ?? [];

        this.registryById = new Map(this.entities.map((entry) => [entry.entity_id, entry]));
        this.deviceById = new Map(this.devices.map((device) => [device.id, device]));
        this.floorAreaIds = new Map();

        for (const area of this.areas) {
            if (!area.floor_id) continue;
            const areaIds = this.floorAreaIds.get(area.floor_id) ?? new Set<string>();
            areaIds.add(area.area_id);
            this.floorAreaIds.set(area.floor_id, areaIds);
        }

        const areaTokenOwners = buildAreaTokenOwners(this.areas);
        this.resolvedEntities = perfMeasure('inventory.buildIndex', () => Object.values(this.states).map((entity) => {
            const entry = this.registryById.get(entity.entity_id);
            const domain = getDomain(entity.entity_id);
            const { areaId, areaSource } = resolveEntityArea(
                entity,
                entry,
                this.devices,
                this.areas,
                areaTokenOwners,
            );
            const deviceLabels = entry?.device_id
                ? (this.deviceById.get(entry.device_id)?.labels ?? [])
                : [];
            const labels = Array.from(new Set([...(entry?.labels ?? []), ...deviceLabels]));

            const resolved = {
                entityId: entity.entity_id,
                domain,
                name: getEntityName(entity.entity_id, entity.attributes),
                state: entity.state,
                deviceId: entry?.device_id ?? null,
                unit: typeof entity.attributes.unit_of_measurement === 'string'
                    ? entity.attributes.unit_of_measurement
                    : undefined,
                deviceClass: typeof entity.attributes.device_class === 'string'
                    ? entity.attributes.device_class
                    : undefined,
                areaId,
                areaSource,
                labels,
                hidden: !!entry?.hidden_by || !!entry?.disabled_by,
                diagnostic: entry?.entity_category === 'diagnostic',
                lastChanged: entity.last_changed,
            };

            this.appendIndex(this.byDomain, domain, resolved);
            if (resolved.deviceClass) this.appendIndex(this.byDeviceClass, resolved.deviceClass, resolved);
            return resolved;
        }));
        this.resolvedById = new Map(this.resolvedEntities.map((entity) => [entity.entityId, entity]));
    }

    private appendIndex(map: Map<string, ResolvedEntity[]>, key: string, entity: ResolvedEntity) {
        const items = map.get(key);
        if (items) {
            items.push(entity);
        } else {
            map.set(key, [entity]);
        }
    }

    query(query: EntityQueryConfig = {}): ResolvedEntity[] {
        return perfMeasure('inventory.query', () => {
            const key = queryCacheKey(query);
            const cached = this.queryCache.get(key);
            if (cached) return cached;

            let candidates = this.resolvedEntities;
            if (query.domains && query.domains.length > 0) {
                candidates = query.domains.flatMap((domain) => this.byDomain.get(domain) ?? []);
            } else if (query.deviceClasses && query.deviceClasses.length > 0) {
                candidates = query.deviceClasses.flatMap((deviceClass) => this.byDeviceClass.get(deviceClass) ?? []);
            }

            const floors = new Set(query.floorIds ?? []);
            const areaIdsFromFloors = new Set<string>();
            for (const floorId of floors) {
                for (const areaId of this.floorAreaIds.get(floorId) ?? []) {
                    areaIdsFromFloors.add(areaId);
                }
            }
            const explicitAreas = new Set(query.areaIds ?? []);

            const filtered = candidates.filter((entity) => {
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

            const sorted = sortResolvedEntities([...filtered], query.sort);
            const result = typeof query.limit === 'number' ? sorted.slice(0, query.limit) : sorted;
            this.queryCache.set(key, result);
            return result;
        });
    }

    findFirstEntityId(terms: string[], domains?: string[], deviceClasses?: string[]) {
        const candidates = this.query({ domains, deviceClasses, includeDiagnostic: true, limit: 100 });
        const normalizedTerms = terms.map((term) => term.toLowerCase());
        return candidates.find((entity) => {
            const haystack = `${entity.entityId} ${entity.name} ${entity.deviceClass ?? ''}`.toLowerCase();
            return normalizedTerms.some((term) => haystack.includes(term));
        })?.entityId;
    }

    getEntity(entityId: string): ResolvedEntity | undefined {
        return this.resolvedById.get(entityId);
    }

    getEntities(entityIds: string[]): ResolvedEntity[] {
        return entityIds
            .map((entityId) => this.getEntity(entityId))
            .filter((entity): entity is ResolvedEntity => Boolean(entity));
    }
}

export function createInventoryIndex(context: InventoryContext): InventoryIndex {
    return new InventoryIndex(context);
}

function asInventoryIndex(source: InventorySource): InventoryIndex {
    return source instanceof InventoryIndex ? source : createInventoryIndex(source);
}

export function toResolvedEntities(context: InventorySource): ResolvedEntity[] {
    return asInventoryIndex(context).resolvedEntities;
}

export function resolveEntityQuery(context: InventorySource, query: EntityQueryConfig = {}): ResolvedEntity[] {
    return asInventoryIndex(context).query(query);
}

export function createCollectionQuery(options: CollectionCardOptions = {}): EntityQueryConfig {
    const mode = options.mode ?? 'auto';
    const base = options.query ?? {};

    if (mode === 'lights_on') {
        return { ...base, domains: ['light', 'switch', 'fan'], states: ['on'], sort: base.sort ?? 'domain', limit: base.limit ?? 12 };
    }
    if (mode === 'unavailable') {
        return { ...base, states: ['unavailable', 'unknown'], includeDiagnostic: true, sort: base.sort ?? 'domain', limit: base.limit ?? 12 };
    }
    if (mode === 'updates') {
        return { ...base, domains: ['update'], states: ['on'], sort: base.sort ?? 'name', limit: base.limit ?? 12 };
    }
    if (mode === 'low_battery') {
        return { ...base, domains: ['sensor', 'binary_sensor'], deviceClasses: ['battery'], includeDiagnostic: true, sort: base.sort ?? 'state', limit: base.limit ?? 12 };
    }
    if (mode === 'openings') {
        return { ...base, domains: ['binary_sensor', 'cover', 'lock'], sort: base.sort ?? 'domain', limit: base.limit ?? 12 };
    }
    if (mode === 'motion') {
        return { ...base, domains: ['binary_sensor', 'person', 'device_tracker'], sort: base.sort ?? 'last_changed', limit: base.limit ?? 12 };
    }
    if (mode === 'media_playing') {
        return { ...base, domains: ['media_player'], states: ['playing', 'paused'], sort: base.sort ?? 'last_changed', limit: base.limit ?? 12 };
    }
    if (mode === 'security') {
        return { ...base, domains: ['alarm_control_panel', 'lock', 'binary_sensor'], sort: base.sort ?? 'domain', limit: base.limit ?? 12 };
    }

    return options.query ?? { domains: ['light', 'switch', 'sensor', 'binary_sensor'], limit: 12 };
}

export function filterLowBattery(entities: ResolvedEntity[], threshold = 25): ResolvedEntity[] {
    return entities.filter((entity) => {
        if (entity.deviceClass !== 'battery') return false;
        const numeric = Number(entity.state);
        if (!Number.isFinite(numeric)) return false;
        return numeric <= threshold;
    });
}

function hasTerm(entity: ResolvedEntity, terms: string[]) {
    const haystack = `${entity.entityId} ${entity.name} ${entity.deviceClass ?? ''}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
}

function isActiveBinary(entity: ResolvedEntity) {
    return entity.domain === 'binary_sensor' && (entity.state === 'on' || entity.state === 'open');
}

function isOpeningEntity(entity: ResolvedEntity) {
    if (BAD_STATES.has(entity.state)) return false;
    if (entity.domain === 'cover') return ['open', 'opening'].includes(entity.state);
    if (entity.domain === 'lock') return ['unlocked', 'open', 'opening'].includes(entity.state);
    if (!isActiveBinary(entity)) return false;
    return OPENING_DEVICE_CLASSES.has(entity.deviceClass ?? '') || hasTerm(entity, OPENING_TERMS);
}

function isMotionEntity(entity: ResolvedEntity) {
    if (entity.domain === 'person' || entity.domain === 'device_tracker') return entity.state === 'home';
    if (!isActiveBinary(entity)) return false;
    return MOTION_DEVICE_CLASSES.has(entity.deviceClass ?? '') || hasTerm(entity, MOTION_TERMS);
}

function isSecurityEntity(entity: ResolvedEntity) {
    if (BAD_STATES.has(entity.state)) return false;
    if (entity.domain === 'lock') return ['unlocked', 'open', 'opening'].includes(entity.state);
    if (entity.domain === 'alarm_control_panel') return ['triggered', 'pending', 'arming'].includes(entity.state);
    if (!isActiveBinary(entity)) return false;
    return SECURITY_DEVICE_CLASSES.has(entity.deviceClass ?? '');
}

function normalizeCollectionText(value: string | undefined) {
    return (value ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function compactCollectionText(value: string | undefined) {
    return normalizeCollectionText(value).replace(/\s+/g, '');
}

function mediaPlayerDedupeKey(entity: ResolvedEntity) {
    const nameKey = compactCollectionText(entity.name || entity.entityId);
    return `${entity.areaId ?? 'global'}:${nameKey}`;
}

function mediaPlayerCanonicalScore(entity: ResolvedEntity) {
    const slug = compactCollectionText(entity.entityId.split('.')[1] ?? entity.entityId);
    const name = compactCollectionText(entity.name);
    let score = 0;

    if (entity.state === 'playing') score += 4;
    if (name && slug === name) score += 8;
    if (name && slug.includes(name)) score += 5;
    if (entity.areaSource === 'entity_registry') score += 3;
    if (entity.areaSource === 'device_registry') score += 2;
    if (/\d{3,}/.test(slug)) score -= 4;
    if (/(chromecast|cast|dlna|airplay|spotify)/.test(slug) && name && slug !== name) score -= 2;

    return score;
}

function preferMediaPlayer(candidate: ResolvedEntity, current: ResolvedEntity) {
    const candidateScore = mediaPlayerCanonicalScore(candidate);
    const currentScore = mediaPlayerCanonicalScore(current);
    if (candidateScore !== currentScore) return candidateScore > currentScore ? candidate : current;
    return candidate.entityId.localeCompare(current.entityId) < 0 ? candidate : current;
}

function dedupeMediaPlayingEntities(entities: ResolvedEntity[]) {
    const preferredByKey = new Map<string, ResolvedEntity>();

    for (const entity of entities) {
        const key = mediaPlayerDedupeKey(entity);
        const current = preferredByKey.get(key);
        preferredByKey.set(key, current ? preferMediaPlayer(entity, current) : entity);
    }

    const preferredIds = new Set(Array.from(preferredByKey.values()).map((entity) => entity.entityId));
    return entities.filter((entity) => preferredIds.has(entity.entityId));
}

function applyCollectionModeFilter(
    entities: ResolvedEntity[],
    options: CollectionCardOptions = {},
): ResolvedEntity[] {
    const mode = options.mode ?? 'auto';
    if (mode === 'low_battery') return filterLowBattery(entities, options.threshold ?? 25);
    if (mode === 'openings') return entities.filter(isOpeningEntity);
    if (mode === 'motion') return entities.filter(isMotionEntity);
    if (mode === 'media_playing') return dedupeMediaPlayingEntities(entities);
    if (mode === 'security') return entities.filter(isSecurityEntity);
    return entities;
}

export function resolveCollectionEntities(
    context: InventorySource,
    options: CollectionCardOptions = {},
): ResolvedEntity[] {
    const index = asInventoryIndex(context);

    if (options.entityIds && options.entityIds.length > 0) {
        return index.getEntities(options.entityIds);
    }

    const query = createCollectionQuery(options);
    const limit = query.limit ?? 12;
    const unboundedQuery = { ...query, limit: undefined };
    const results = index.query(unboundedQuery);
    return applyCollectionModeFilter(results, options).slice(0, limit);
}

function findFirstEntityId(context: InventorySource, terms: string[], domains?: string[], deviceClasses?: string[]) {
    return asInventoryIndex(context).findFirstEntityId(terms, domains, deviceClasses);
}

function hasUsableEntityState(entity: ResolvedEntity) {
    const state = entity.state.trim().toLowerCase();
    return state.length > 0 && !BAD_STATES.has(state);
}

function findFirstUsableEntityId(context: InventorySource, terms: string[], domains?: string[], deviceClasses?: string[]) {
    const index = asInventoryIndex(context);
    const candidates = index.query({ domains, deviceClasses, includeDiagnostic: true, limit: 100 });
    const normalizedTerms = terms.map((term) => term.toLowerCase());

    return candidates.find((entity) => {
        if (!hasUsableEntityState(entity)) return false;
        const haystack = `${entity.entityId} ${entity.name} ${entity.deviceClass ?? ''}`.toLowerCase();
        return normalizedTerms.some((term) => haystack.includes(term));
    })?.entityId;
}

function fallbackIfDomain(entityId: string | undefined, domains: string[]) {
    if (!entityId) return undefined;
    return domains.includes(getDomain(entityId)) ? entityId : undefined;
}

function isUsableWeatherAttribute(value: unknown) {
    if (value === null || value === undefined) return false;
    const normalized = String(value).trim().toLowerCase();
    return normalized.length > 0 && !BAD_STATES.has(normalized);
}

function scoreWeatherEntity(index: InventoryIndex, entity: ResolvedEntity) {
    const state = index.states[entity.entityId];
    let score = hasUsableEntityState(entity) ? 0 : -50;

    if (isUsableWeatherAttribute(state?.attributes.temperature)) score += 10;
    if (isUsableWeatherAttribute(state?.attributes.humidity)) score += 4;
    if (isUsableWeatherAttribute(state?.attributes.wind_speed)) score += 3;
    if (entity.entityId.includes('home') || entity.name.toLowerCase().includes('home')) score += 1;

    return score;
}

function findBestWeatherEntityId(context: InventorySource) {
    const index = asInventoryIndex(context);
    const candidates = index.query({ domains: ['weather'], includeDiagnostic: true, limit: 100 });
    if (candidates.length === 0) return undefined;

    return [...candidates].sort((a, b) => {
        const scoreDelta = scoreWeatherEntity(index, b) - scoreWeatherEntity(index, a);
        if (scoreDelta !== 0) return scoreDelta;
        return a.name.localeCompare(b.name);
    })[0]?.entityId;
}

export function buildSmartEnergyOptions(context: InventorySource, current: EnergyCardOptions = {}): EnergyCardOptions {
    return {
        source: current.source ?? 'auto',
        mode: current.mode ?? 'overview',
        gridImportEntityId: current.gridImportEntityId ?? findFirstEntityId(context, ['grid import', 'net afname', 'import'], ['sensor'], ['power', 'energy']),
        gridExportEntityId: current.gridExportEntityId ?? findFirstEntityId(context, ['grid export', 'net teruglevering', 'export'], ['sensor'], ['power', 'energy']),
        solarPowerEntityId: current.solarPowerEntityId ?? findFirstEntityId(context, ['solar', 'pv', 'fronius', 'zonne'], ['sensor'], ['power']),
        homePowerEntityId: current.homePowerEntityId ?? findFirstEntityId(context, ['home power', 'house power', 'load', 'verbruik'], ['sensor'], ['power']),
        batteryPowerEntityId: current.batteryPowerEntityId ?? findFirstEntityId(context, ['battery', 'accu'], ['sensor'], ['power', 'energy']),
        todayEnergyEntityId: current.todayEnergyEntityId ?? findFirstEntityId(context, ['today', 'daily', 'dag'], ['sensor'], ['energy']),
        gasEntityId: current.gasEntityId ?? findFirstEntityId(context, ['gas'], ['sensor'], ['gas', 'energy']),
        waterEntityId: current.waterEntityId ?? findFirstEntityId(context, ['water'], ['sensor'], ['water']),
        deviceEntityIds: current.deviceEntityIds,
        historyRange: current.historyRange,
        hoursToShow: current.hoursToShow ?? 24,
    };
}

export function buildSmartWeatherOptions(context: InventorySource, current: WeatherCardOptions = {}): WeatherCardOptions {
    return {
        source: current.source ?? 'auto',
        weatherEntityId: current.weatherEntityId ?? findBestWeatherEntityId(context),
        temperatureEntityId: current.temperatureEntityId ?? findFirstUsableEntityId(context, ['outdoor', 'outside', 'buiten'], ['sensor'], ['temperature']),
        humidityEntityId: current.humidityEntityId ?? findFirstUsableEntityId(context, ['humidity', 'vocht'], ['sensor'], ['humidity']),
        rainEntityId: current.rainEntityId ?? findFirstUsableEntityId(context, ['rain', 'regen', 'precipitation'], ['sensor'], ['precipitation']),
        windEntityId: current.windEntityId ?? findFirstUsableEntityId(context, ['wind'], ['sensor'], ['wind_speed']),
    };
}

export function buildSmartCalendarOptions(
    context: InventorySource,
    current: CalendarCardOptions = {},
    fallbackEntityId = ''
): CalendarCardOptions {
    const manualIds = current.entityIds?.filter(Boolean);
    const fallbackId = fallbackIfDomain(fallbackEntityId, ['calendar']);
    const entityIds = manualIds && manualIds.length > 0
        ? manualIds
        : fallbackId
            ? [fallbackId]
            : resolveEntityQuery(context, {
                domains: ['calendar'],
                limit: current.maxEvents ?? 4,
            }).map((entity) => entity.entityId);

    return {
        ...current,
        source: current.source ?? 'auto',
        daysToShow: current.daysToShow ?? 7,
        maxEvents: current.maxEvents ?? 4,
        entityIds,
    };
}

export function buildSmartRemoteOptions(
    context: InventorySource,
    current: RemoteCardOptions = {},
    fallbackEntityId = ''
): RemoteCardOptions {
    const source = current.source ?? 'auto';
    return {
        ...current,
        source,
        preset: current.preset ?? 'tv',
        remoteEntityId:
            current.remoteEntityId ??
            fallbackIfDomain(fallbackEntityId, ['remote']) ??
            (source === 'manual'
                ? undefined
                : findFirstEntityId(context, ['remote', 'tv', 'android', 'webos', 'receiver'], ['remote'])),
        mediaPlayerEntityId:
            current.mediaPlayerEntityId ??
            fallbackIfDomain(fallbackEntityId, ['media_player']) ??
            (source === 'manual'
                ? undefined
                : findFirstEntityId(context, ['tv', 'media', 'receiver', 'android', 'webos'], ['media_player'])),
    };
}

function devicePanelDomainsForPreset(preset: DevicePanelCardOptions['preset']) {
    switch (preset) {
        case 'cover':
            return ['cover'];
        case 'fan':
        case 'purifier':
            return ['fan'];
        case 'vacuum':
            return ['vacuum'];
        case 'timer':
            return ['timer'];
        case 'todo':
            return ['todo'];
        default:
            return DEVICE_PANEL_DOMAINS;
    }
}

function devicePanelTermsForPreset(preset: DevicePanelCardOptions['preset']) {
    switch (preset) {
        case 'cover':
            return ['cover', 'blind', 'shade', 'curtain'];
        case 'fan':
            return ['fan', 'ventilator'];
        case 'purifier':
            return ['purifier', 'air', 'filter', 'fan'];
        case 'vacuum':
            return ['vacuum', 'roborock', 'clean'];
        case 'timer':
            return ['timer'];
        case 'todo':
            return ['todo', 'task', 'shopping'];
        default:
            return ['cover', 'blind', 'fan', 'purifier', 'vacuum', 'timer', 'todo', 'switch', 'button'];
    }
}

export function buildSmartDevicePanelOptions(
    context: InventorySource,
    current: DevicePanelCardOptions = {},
    fallbackEntityId = ''
): DevicePanelCardOptions {
    const preset = current.preset ?? 'auto';
    const domains = devicePanelDomainsForPreset(preset);
    const manualId = current.entityId ?? current.entityIds?.find(Boolean);
    const fallbackId = fallbackIfDomain(fallbackEntityId, domains);

    return {
        ...current,
        source: current.source ?? 'auto',
        preset,
        entityId:
            manualId ??
            fallbackId ??
            findFirstEntityId(context, devicePanelTermsForPreset(preset), domains),
    };
}

export function isActiveState(state: string): boolean {
    return ACTIVE_STATES.has(state);
}
