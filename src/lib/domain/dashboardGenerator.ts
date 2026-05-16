import {
    buildSmartCalendarOptions,
    buildSmartDevicePanelOptions,
    buildSmartEnergyOptions,
    buildSmartWeatherOptions,
    createInventoryIndex,
    createCollectionQuery,
    filterLowBattery,
    resolveCollectionEntities,
    type InventoryIndex,
    type InventoryContext,
    type ResolvedEntity,
} from './haInventory';
import {
    createDefaultGridConfig,
    createDefaultItemLayout,
    type DashboardCardType,
    type DashboardGenerationEntityRef,
    type DashboardGenerationMetadata,
    type DashboardGenerationOptions,
    type DashboardGenerationQualityHint,
    type DashboardGenerationRecipe,
    type DashboardGenerationResult,
    type EntityQueryConfig,
    type GridConfig,
    type RoomDashboardConfig,
} from '$lib/types/dashboard';
import type { DashboardItem, DashboardCardOptions } from '$lib/types/dashboard';
import type { CollectionCardOptions } from '$lib/types/dashboard';
import { generateUUID } from '$lib/utils/uuid';
import { getGeneratedRoomPreviewUrl, resolveRoomVisualProfile } from './roomVisualProfile';

export const DASHBOARD_GENERATOR_VERSION = 1;

type CardSize = 'condensed' | 'standard' | 'poster';

interface GeneratedCardInput {
    cardType: DashboardCardType;
    name?: string;
    entityId?: string;
    icon?: string;
    path?: string;
    iconType?: DashboardItem['iconType'];
    imageUrl?: string;
    shortcuts?: DashboardItem['shortcuts'];
    color?: string;
    domainFilter?: string;
    subtitle?: string;
    alignment?: DashboardItem['alignment'];
    options?: DashboardCardOptions;
    hours_to_show?: number;
    aggregate_func?: DashboardItem['aggregate_func'];
    graphEntities?: DashboardItem['graphEntities'];
    tabs?: GridConfig[];
    activeTabIndex?: number;
    desktopSpan?: number;
    mobileSpan?: number;
    rowSpan?: number;
    mobileRowSpan?: number;
    cardSize?: CardSize;
    reason: string;
    sourceType?: DashboardGenerationMetadata['sourceType'];
    sourceId?: string;
}

interface PlacementState {
    desktopCol: number;
    desktopRow: number;
    desktopRowSpan: number;
    mobileCol: number;
    mobileRow: number;
    mobileRowSpan: number;
}

interface PreparedInventory {
    index: InventoryIndex;
    labelFilteredEntities: ResolvedEntity[];
}

const HOUSE_OVERVIEW_ID = 'house';
const ACTIVE_STATES = new Set(['on', 'open', 'playing', 'home', 'active', 'locked']);
const PROBLEM_STATES = new Set(['unavailable', 'unknown', 'unlocked', 'triggered', 'pending']);
const USED_DOMAIN_LIMIT = 25;
const ROOM_PATH_FALLBACK_FLOOR = 'unassigned';
const GRAPH_DEVICE_CLASSES = new Set(['temperature', 'humidity', 'power', 'energy']);
const USEFUL_SENSOR_DEVICE_CLASSES = new Set([
    'temperature',
    'humidity',
    'power',
    'energy',
    'battery',
    'illuminance',
    'carbon_dioxide',
    'pm25',
    'volatile_organic_compounds',
]);
const ROOM_STATUS_DEVICE_CLASSES = new Set([
    'door',
    'window',
    'opening',
    'garage_door',
    'motion',
    'occupancy',
    'presence',
    'smoke',
    'moisture',
    'gas',
    'problem',
    'safety',
    'tamper',
]);
const NOISY_SENSOR_DEVICE_CLASSES = new Set([
    'signal_strength',
    'timestamp',
    'date',
    'duration',
    'data_size',
    'data_rate',
    'voltage',
    'current',
]);
const NOISY_ENTITY_TERMS = ['rssi', 'linkquality', 'uptime', 'firmware', 'diagnostic'];
const ENTITY_PREVIEW_LIMIT = 12;
const LOW_IMPORTANCE_THRESHOLD = 20;
const ACCENT_PRIMARY = 'var(--color-m3-primary)';
const ACCENT_SECONDARY = 'var(--color-m3-secondary)';
const ACCENT_TERTIARY = 'var(--color-m3-tertiary)';
const ACCENT_ERROR = 'var(--color-m3-error)';
const ACCENT_NEUTRAL = 'var(--color-m3-outline)';
const HOUSE_ACTION_TERMS = [
    'all',
    'away',
    'bedtime',
    'evening',
    'good morning',
    'good night',
    'goodnight',
    'guest',
    'home',
    'house',
    'morning',
    'night',
    'sleep',
    'vacation',
];
const HOUSE_ACTION_LABELS = new Set([
    'dashboard_action',
    'dashboard_quick_action',
    'house_action',
    'quick_action',
]);
const HOUSE_ACTION_EXCLUDE_TERMS = [
    'amp',
    'amplifier',
    'apple tv',
    'cast',
    'chromecast',
    'denon',
    'hdmi',
    'media',
    'player',
    'projector',
    'receiver',
    'remote',
    'sonos',
    'soundbar',
    'spotify',
    'television',
    'tv',
    'volume',
];
const HIDDEN_RUNTIME_STATES = new Set(['unknown', 'unavailable']);
const ACTION_DOMAINS = new Set(['button', 'scene', 'script']);
const COMFORT_STATE_DEVICE_CLASSES = new Set(['temperature', 'humidity', 'carbon_dioxide', 'illuminance']);
const MOTION_STATUS_TERMS = [
    'motion',
    'movement',
    'presence',
    'occupancy',
    'beweging',
    'aanwezig',
    'pir',
];
const INFORMATIONAL_SWITCH_TERMS = [
    ...MOTION_STATUS_TERMS,
    'sensor',
    'detector',
];

type AttentionDefinition = {
    mode: NonNullable<CollectionCardOptions['mode']>;
    name: string;
    icon: string;
    reason: string;
    threshold?: number;
    query?: EntityQueryConfig;
    desktopSpan?: number;
    mobileSpan?: number;
    rowSpan?: number;
    presentation?: CollectionCardOptions['presentation'];
    sourceType?: DashboardGenerationMetadata['sourceType'];
    sourceId?: string;
};

interface EntityImportanceAnalysis {
    score: number;
    reasons: string[];
}

interface LightGroupSuppression {
    group: ResolvedEntity;
    members: ResolvedEntity[];
}

interface LightGroupSuppressionResult {
    entities: ResolvedEntity[];
    suppressions: LightGroupSuppression[];
}

function createMetadata(
    options: DashboardGenerationOptions,
    reason: string,
    sourceType: DashboardGenerationMetadata['sourceType'] = getDefaultSourceType(options),
    sourceId = getDefaultSourceId(options),
): DashboardGenerationMetadata {
    return {
        recipe: options.recipe,
        sourceType,
        sourceId,
        generatedAt: new Date().toISOString(),
        reason,
        version: DASHBOARD_GENERATOR_VERSION,
    };
}

function getDefaultSourceType(options: DashboardGenerationOptions): DashboardGenerationMetadata['sourceType'] {
    if (options.recipe === 'room') return 'area';
    if (options.recipe === 'floor') return 'floor';
    if (options.recipe === 'entity_type') return 'entity_type';
    if (options.recipe === 'label') return 'label';
    if (options.recipe === 'maintenance') return 'maintenance';
    return 'house';
}

function getDefaultSourceId(options: DashboardGenerationOptions) {
    if (options.recipe === 'room') return options.areaId ?? HOUSE_OVERVIEW_ID;
    if (options.recipe === 'floor') return options.floorId ?? HOUSE_OVERVIEW_ID;
    if (options.recipe === 'entity_type') return getEntityTypeSourceId(options.entityDomain, options.entityDeviceClass);
    if (options.recipe === 'label') return options.labelId ?? HOUSE_OVERVIEW_ID;
    if (options.recipe === 'maintenance') return 'maintenance';
    return HOUSE_OVERVIEW_ID;
}

function normalizeRecipe(recipe: DashboardGenerationRecipe): 'house' | 'room' | 'floor' | 'entity_type' | 'label' | 'maintenance' {
    if (
        recipe === 'room' ||
        recipe === 'floor' ||
        recipe === 'entity_type' ||
        recipe === 'label' ||
        recipe === 'maintenance'
    ) {
        return recipe;
    }
    return 'house';
}

function createGeneratedConfig(
    id: string,
    name: string,
    options: DashboardGenerationOptions,
    reason: string,
): RoomDashboardConfig {
    const root: RoomDashboardConfig = {
        ...createDefaultGridConfig(name),
        id,
        icon:
            options.recipe === 'room'
                ? 'meeting_room'
                : options.recipe === 'floor'
                  ? 'layers'
                  : options.recipe === 'entity_type'
                    ? 'category'
                    : options.recipe === 'label'
                      ? 'label'
                      : options.recipe === 'maintenance'
                        ? 'build'
                    : 'home',
        tabs: [],
        activeTabId: '',
        generatedBy: createMetadata(options, reason),
        generationState: 'generated',
    };
    return root;
}

function createGeneratedTab(
    name: string,
    icon: string,
    options: DashboardGenerationOptions,
    reason: string,
    sourceType?: DashboardGenerationMetadata['sourceType'],
    sourceId?: string,
) {
    const tab = createDefaultGridConfig(name, icon);
    tab.generatedBy = createMetadata(options, reason, sourceType, sourceId);
    tab.generationState = 'generated';
    return tab;
}

function entityAllowed(entity: ResolvedEntity, options: DashboardGenerationOptions) {
    const includeLabels = options.includeLabels?.filter(Boolean) ?? [];
    const excludeLabels = options.excludeLabels?.filter(Boolean) ?? [];
    const excludeEntityIds = new Set(options.excludeEntityIds?.filter(Boolean) ?? []);

    if (excludeEntityIds.has(entity.entityId)) {
        return false;
    }

    if (includeLabels.length > 0 && !includeLabels.some((label) => entity.labels.includes(label))) {
        return false;
    }

    return !excludeLabels.some((label) => entity.labels.includes(label));
}

function includesAny(source: string[] | undefined, candidates: Array<string | null | undefined>) {
    if (!source || source.length === 0) return true;
    return candidates.some((candidate) => !!candidate && source.includes(candidate));
}

function prepareInventory(context: InventoryContext, options: DashboardGenerationOptions): PreparedInventory {
    const index = createInventoryIndex(context);
    const allEntities = index.resolvedEntities;
    return {
        index,
        labelFilteredEntities: allEntities.filter((entity) => entityAllowed(entity, options)),
    };
}

function queryEntities(
    context: InventoryContext,
    inventory: PreparedInventory,
    query: EntityQueryConfig,
) {
    const floors = new Set(query.floorIds ?? []);
    const areaIdsFromFloors = new Set(
        floors.size === 0
            ? []
            : (context.areas ?? [])
                  .filter((area) => area.floor_id && floors.has(area.floor_id))
                  .map((area) => area.area_id),
    );
    const explicitAreas = new Set(query.areaIds ?? []);

    let results = inventory.labelFilteredEntities.filter((entity) => {
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

function hasHiddenRuntimeState(entity: ResolvedEntity) {
    return HIDDEN_RUNTIME_STATES.has(entity.state);
}

function isActionDomain(entity: ResolvedEntity) {
    return ACTION_DOMAINS.has(entity.domain);
}

function isUsableGeneratedEntity(entity: ResolvedEntity) {
    if (entity.hidden || entity.diagnostic) return false;
    if (hasHiddenRuntimeState(entity) && !isActionDomain(entity)) return false;
    return true;
}

function isValidNumericSensor(entity: ResolvedEntity) {
    return entity.domain === 'sensor' && Number.isFinite(Number(entity.state));
}

function getStateAttributeEntityIds(inventory: PreparedInventory, entityId: string) {
    const value = inventory.index.states[entityId]?.attributes?.entity_id;
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string');
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
}

function getHaLightGroupMembers(inventory: PreparedInventory, entity: ResolvedEntity) {
    if (entity.domain !== 'light') return [];
    const memberIds = getStateAttributeEntityIds(inventory, entity.entityId).filter(
        (entityId) => entityId.startsWith('light.') && entityId !== entity.entityId,
    );
    if (memberIds.length === 0) return [];
    return inventory.index.getEntities(memberIds).filter((member) => member.domain === 'light');
}

function normalizeLightGroupText(value: string | null | undefined) {
    return (value ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function compactLightGroupText(value: string | null | undefined) {
    return normalizeLightGroupText(value)
        .replace(/\s+/g, '')
        .replace(/\d+$/g, '');
}

function getEntityObjectId(entityId: string) {
    return entityId.split('.')[1] ?? entityId;
}

function isRoomWideLightGroup(
    inventory: PreparedInventory,
    entity: ResolvedEntity,
    areaId?: string,
) {
    if (!areaId || entity.domain !== 'light') return false;
    if (getHaLightGroupMembers(inventory, entity).length === 0) return false;

    const area = inventory.index.areas.find((item) => item.area_id === areaId);
    const areaKeys = new Set(
        [areaId, area?.name]
            .map(compactLightGroupText)
            .filter(Boolean),
    );
    if (areaKeys.size === 0) return false;

    return [entity.name, getEntityObjectId(entity.entityId)]
        .map(compactLightGroupText)
        .some((key) => areaKeys.has(key));
}

function suppressHaLightGroupMembers(
    entities: ResolvedEntity[],
    inventory: PreparedInventory,
    areaId?: string,
): LightGroupSuppressionResult {
    const candidateIds = new Set(entities.map((entity) => entity.entityId));
    const suppressedIds = new Set<string>();
    const suppressions: LightGroupSuppression[] = [];

    for (const entity of entities) {
        if (entity.domain !== 'light' || !isUsableGeneratedEntity(entity)) continue;
        if (isRoomWideLightGroup(inventory, entity, areaId)) continue;

        const members = getHaLightGroupMembers(inventory, entity)
            .filter((member) => candidateIds.has(member.entityId))
            .filter((member) => !areaId || member.areaId === areaId)
            .filter((member) => member.entityId !== entity.entityId)
            .filter((member) => getHaLightGroupMembers(inventory, member).length === 0);
        if (members.length === 0) continue;

        suppressions.push({ group: entity, members });
        for (const member of members) {
            suppressedIds.add(member.entityId);
        }
    }

    return {
        entities: entities.filter((entity) => !suppressedIds.has(entity.entityId)),
        suppressions,
    };
}

function resolveGeneratedCollectionEntities(
    inventory: PreparedInventory,
    options: DashboardGenerationOptions,
    collectionOptions: CollectionCardOptions,
) {
    const allowed = new Set(inventory.labelFilteredEntities.map((entity) => entity.entityId));
    const excluded = new Set(options.excludeEntityIds?.filter(Boolean) ?? []);
    return resolveCollectionEntities(inventory.index, collectionOptions)
        .filter((entity) => allowed.has(entity.entityId))
        .filter((entity) => !excluded.has(entity.entityId));
}

function analyzeEntityImportance(entity: ResolvedEntity, areaId?: string): EntityImportanceAnalysis {
    let score = 0;
    const reasons: string[] = [];

    if (areaId && entity.areaId === areaId) {
        if (entity.areaSource === 'entity_registry') {
            score += 45;
            reasons.push('exact area match');
        } else if (entity.areaSource === 'device_registry') {
            score += 38;
            reasons.push('device area fallback');
        } else if (entity.areaSource === 'name_inference') {
            score += 24;
            reasons.push('name-inferred area');
        }
    }

    if (PROBLEM_STATES.has(entity.state)) {
        score += 36;
        reasons.push('problem state');
    } else if (ACTIVE_STATES.has(entity.state)) {
        score += 18;
        reasons.push('active state');
    }

    switch (entity.domain) {
        case 'climate':
            score += 28;
            reasons.push('primary comfort domain');
            break;
        case 'light':
            score += 24;
            reasons.push('primary control domain');
            break;
        case 'cover':
        case 'fan':
            score += 22;
            reasons.push('specialist control domain');
            break;
        case 'switch':
            score += 18;
            reasons.push('control domain');
            break;
        case 'media_player':
        case 'remote':
            score += 16;
            reasons.push('media domain');
            break;
        case 'binary_sensor':
            score += 14;
            reasons.push('status domain');
            break;
        case 'sensor':
            score += 10;
            reasons.push('sensor domain');
            break;
        default:
            score += 4;
    }

    if (GRAPH_DEVICE_CLASSES.has(entity.deviceClass ?? '')) {
        score += 8;
        reasons.push('graph-worthy device class');
    }
    if (['door', 'window', 'opening', 'garage_door', 'motion', 'occupancy', 'presence'].includes(entity.deviceClass ?? '')) {
        score += 10;
        reasons.push('attention device class');
    }
    if (entity.labels.length > 0) {
        score += 4;
        reasons.push('label boost');
    }
    if (entity.name && !entity.name.includes('.') && !entity.name.includes('_')) {
        score += 3;
        reasons.push('clear friendly name');
    }

    if (entity.domain === 'sensor' && NOISY_SENSOR_DEVICE_CLASSES.has(entity.deviceClass ?? '')) {
        score -= 8;
        reasons.push('noisy sensor class');
    }
    if (NOISY_ENTITY_TERMS.some((term) => `${entity.entityId} ${entity.name}`.toLowerCase().includes(term))) {
        score -= 6;
        reasons.push('noisy entity name');
    }

    return { score, reasons };
}

function getEntityImportance(entity: ResolvedEntity, areaId?: string) {
    return analyzeEntityImportance(entity, areaId).score;
}

function enrichEntityRefs(
    refs: DashboardGenerationEntityRef[],
    inventory: PreparedInventory,
    areaId?: string,
) {
    return refs.map((ref) => {
        const entity = inventory.index.getEntity(ref.entityId);
        if (!entity) return ref;

        const analysis = analyzeEntityImportance(entity, areaId ?? entity.areaId ?? undefined);
        return {
            ...ref,
            importanceScore: analysis.score,
            importanceReasons: analysis.reasons,
        };
    });
}

function sortEntitiesByImportance(entities: ResolvedEntity[], areaId?: string) {
    return [...entities].sort((a, b) => {
        const scoreDelta = getEntityImportance(b, areaId) - getEntityImportance(a, areaId);
        return scoreDelta || a.name.localeCompare(b.name);
    });
}

function isActiveOrProblem(entity: ResolvedEntity) {
    return ACTIVE_STATES.has(entity.state) || PROBLEM_STATES.has(entity.state);
}

function entityHasAnyTerm(entity: ResolvedEntity, terms: string[]) {
    const haystack = `${entity.entityId} ${entity.name} ${entity.deviceClass ?? ''}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
}

function isMotionOrPresenceEntity(entity: ResolvedEntity) {
    if (['motion', 'occupancy', 'presence'].includes(entity.deviceClass ?? '')) return true;
    return entityHasAnyTerm(entity, MOTION_STATUS_TERMS);
}

function isInformationalSwitchEntity(entity: ResolvedEntity) {
    return entity.domain === 'switch' && entityHasAnyTerm(entity, INFORMATIONAL_SWITCH_TERMS);
}

function isInformationOnlyEntity(entity: ResolvedEntity) {
    return ['sensor', 'binary_sensor', 'person', 'device_tracker', 'update'].includes(entity.domain) ||
        isInformationalSwitchEntity(entity);
}

function isPrimaryRoomControlEntity(entity: ResolvedEntity) {
    if (isInformationOnlyEntity(entity)) return false;
    return ['light', 'switch'].includes(entity.domain);
}

function isUsefulStatusEntity(entity: ResolvedEntity) {
    if (hasHiddenRuntimeState(entity)) return false;
    if (isActiveOrProblem(entity)) return true;
    if (entity.domain === 'binary_sensor') {
        return ROOM_STATUS_DEVICE_CLASSES.has(entity.deviceClass ?? '');
    }
    if (entity.domain !== 'sensor') return true;
    if (USEFUL_SENSOR_DEVICE_CLASSES.has(entity.deviceClass ?? '')) return true;
    return getEntityImportance(entity) >= LOW_IMPORTANCE_THRESHOLD;
}

function isRoomStatusEntity(entity: ResolvedEntity) {
    if (entity.domain === 'lock' || entity.domain === 'alarm_control_panel') return true;
    if (isInformationalSwitchEntity(entity)) return true;
    return entity.domain === 'binary_sensor' &&
        (ROOM_STATUS_DEVICE_CLASSES.has(entity.deviceClass ?? '') || isMotionOrPresenceEntity(entity));
}

function getEntityAccent(entity: ResolvedEntity) {
    if (PROBLEM_STATES.has(entity.state) || entity.domain === 'lock' || entity.domain === 'alarm_control_panel') {
        return ACCENT_ERROR;
    }
    if (['door', 'window', 'opening', 'garage_door'].includes(entity.deviceClass ?? '') || entity.domain === 'cover') {
        return entity.state === 'closed' || entity.state === 'off' ? ACCENT_NEUTRAL : ACCENT_TERTIARY;
    }
    if (['motion', 'occupancy', 'presence'].includes(entity.deviceClass ?? '')) return ACCENT_SECONDARY;
    if (entity.domain === 'media_player' || entity.domain === 'remote') return ACCENT_PRIMARY;
    if (entity.deviceClass === 'battery' || entity.domain === 'update') return ACCENT_TERTIARY;
    if (ACTIVE_STATES.has(entity.state)) return ACCENT_PRIMARY;
    return ACCENT_NEUTRAL;
}

function getCollectionAccent(mode?: CollectionCardOptions['mode']) {
    if (mode === 'security' || mode === 'unavailable') return ACCENT_ERROR;
    if (mode === 'openings' || mode === 'low_battery' || mode === 'updates') return ACCENT_TERTIARY;
    if (mode === 'motion') return ACCENT_SECONDARY;
    if (mode === 'media_playing' || mode === 'lights_on') return ACCENT_PRIMARY;
    return ACCENT_NEUTRAL;
}

function hasAnyEntity(options: object, keys: string[]) {
    const values = options as Record<string, unknown>;
    return keys.some((key) => {
        const value = values[key];
        return Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.length > 0;
    });
}

function prettifyToken(value?: string) {
    if (!value) return 'Entities';
    return value
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
        .join(' ');
}

function pluralizeLabel(value: string) {
    if (value.endsWith('y')) return `${value.slice(0, -1)}ies`;
    if (value.endsWith('s')) return value;
    return `${value}s`;
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function getEntityTypeSourceId(domain?: string, deviceClass?: string) {
    return [domain, deviceClass].filter(Boolean).join(':') || 'entities';
}

function getEntityTypeTitle(domain?: string, deviceClass?: string) {
    if (!domain) return 'Entities';
    const domainLabel = pluralizeLabel(prettifyToken(domain));
    if (!deviceClass) return domainLabel;
    return `${prettifyToken(deviceClass)} ${domainLabel}`;
}

function getEntityTypeIcon(domain?: string, deviceClass?: string) {
    if (deviceClass === 'battery') return 'battery_alert';
    if (deviceClass === 'temperature') return 'device_thermostat';
    if (deviceClass === 'humidity') return 'humidity_percentage';
    if (deviceClass === 'power' || deviceClass === 'energy') return 'electric_bolt';

    switch (domain) {
        case 'light':
            return 'lightbulb';
        case 'switch':
            return 'toggle_on';
        case 'fan':
            return 'mode_fan';
        case 'cover':
            return 'blinds';
        case 'climate':
            return 'device_thermostat';
        case 'media_player':
            return 'play_circle';
        case 'remote':
            return 'settings_remote';
        case 'weather':
            return 'partly_cloudy_day';
        case 'calendar':
            return 'calendar_month';
        case 'update':
            return 'system_update_alt';
        case 'scene':
            return 'scene';
        case 'script':
            return 'play_arrow';
        case 'button':
            return 'smart_button';
        case 'sensor':
        case 'binary_sensor':
            return 'sensors';
        default:
            return 'category';
    }
}

function getLabelTitle(labelId?: string) {
    return labelId ? prettifyToken(labelId) : 'Label';
}

function getAreaName(context: InventoryContext, areaId?: string) {
    if (!areaId) return 'Room';
    return context.areas?.find((area) => area.area_id === areaId)?.name ?? areaId;
}

function getFloorName(context: InventoryContext, floorId?: string) {
    if (!floorId) return 'Floor';
    return context.floors?.find((floor) => floor.floor_id === floorId)?.name ?? floorId;
}

function getFallbackFloorId(context: InventoryContext) {
    return context.floors?.[0]?.floor_id ?? context.areas?.find((area) => area.floor_id)?.floor_id ?? '';
}

function getFloorDashboardPath(floorId: string) {
    return `/dashboard/${floorId}`;
}

function getFloorDashboardId(floorId: string) {
    return `dashboard_floor_${floorId}`;
}

function getAreaDashboardPath(area: { area_id: string; floor_id?: string | null }) {
    return `/dashboard/${area.floor_id || ROOM_PATH_FALLBACK_FLOOR}/${area.area_id}`;
}

function getAreaDashboardId(area: { area_id: string; floor_id?: string | null }) {
    return `dashboard_${area.floor_id || ROOM_PATH_FALLBACK_FLOOR}_${area.area_id}`;
}

function getAreaPictureUrl(area: { picture?: string | null }) {
    const picture = area.picture?.trim();
    return picture || undefined;
}

function getAreaNavigationVisual(area: { area_id?: string; name: string; icon?: string | null; picture?: string | null }) {
    const profile = resolveRoomVisualProfile(area);
    const areaPictureUrl = getAreaPictureUrl(area);
    const generatedPreviewUrl = getGeneratedRoomPreviewUrl(profile);
    const imageUrl = areaPictureUrl ?? generatedPreviewUrl;
    return {
        icon: profile.icon,
        iconType: 'image' as const,
        imageUrl,
        options: {
            source: 'area' as const,
            areaId: area.area_id,
            visualKind: profile.kind,
            visualAudience: profile.audience,
            visualPromptSeed: profile.promptSeed,
            imageSource: areaPictureUrl ? ('ha_area_picture' as const) : ('generated_preview' as const),
        },
    };
}

function buildAreaPictureHints(
    areaCards: Array<{ area: { name: string; picture?: string | null }; entities: ResolvedEntity[] }>,
    scopeName: string,
): DashboardGenerationQualityHint[] {
    const missingPictureAreas = areaCards.filter((entry) => !getAreaPictureUrl(entry.area));
    if (missingPictureAreas.length === 0) return [];

    const names = missingPictureAreas
        .slice(0, 4)
        .map((entry) => entry.area.name)
        .join(', ');
    const suffix = missingPictureAreas.length > 4 ? `, and ${missingPictureAreas.length - 4} more` : '';
    const hint = createQualityHintFromIds(
        'missing_area_picture',
        'suggestion',
        `${scopeName}: ${missingPictureAreas.length} populated ${missingPictureAreas.length === 1 ? 'room has' : 'rooms have'} no Home Assistant area picture (${names}${suffix}).`,
        missingPictureAreas.flatMap((entry) => entry.entities.map((entity) => entity.entityId)),
        'Set area pictures in Home Assistant to replace generated previews with real room images.',
    );

    return hint ? [hint] : [];
}

function formatNavigationTemperature(entity?: ResolvedEntity) {
    if (!entity) return undefined;
    const value = Number(entity.state);
    if (!Number.isFinite(value)) return undefined;

    const rounded = Math.round(value * 10) / 10;
    const valueText = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
    const unit = (entity.unit || '°C').replace('Â', '').trim();
    return `${valueText}${unit}`;
}

function isHouseActionEntity(entity: ResolvedEntity) {
    if (entity.state === 'unavailable') return false;
    if (!ACTION_DOMAINS.has(entity.domain)) return false;

    const haystack = `${entity.entityId} ${entity.name} ${entity.labels.join(' ')}`.toLowerCase();
    if (HOUSE_ACTION_EXCLUDE_TERMS.some((term) => haystack.includes(term))) return false;

    const hasHouseActionLabel = entity.labels.some((label) =>
        HOUSE_ACTION_LABELS.has(label.toLowerCase().replace(/\s+/g, '_')),
    );
    const hasHouseActionTerm = HOUSE_ACTION_TERMS.some((term) => haystack.includes(term));

    return hasHouseActionLabel || hasHouseActionTerm;
}

function getPrimaryRoomShortcuts(
    entities: ResolvedEntity[],
    inventory: PreparedInventory,
    areaId?: string,
): DashboardItem['shortcuts'] {
    const preferredDomains = ['light', 'switch', 'fan', 'cover'];
    const grouped = suppressHaLightGroupMembers(
        entities.filter(isUsableGeneratedEntity),
        inventory,
        areaId,
    );
    return sortEntitiesByImportance(grouped.entities, areaId)
        .filter((entity) => preferredDomains.includes(entity.domain))
        .slice(0, 4)
        .map((entity) => ({
            id: generateUUID(),
            entityId: entity.entityId,
            icon:
                entity.domain === 'light'
                    ? 'lightbulb'
                    : entity.domain === 'switch'
                      ? 'toggle_on'
                      : entity.domain === 'fan'
                        ? 'mode_fan'
                        : entity.domain === 'cover'
                          ? 'blinds'
                          : 'power_settings_new',
            color: getEntityAccent(entity),
        }));
}

function summarizeRoomNavigation(
    inventory: PreparedInventory,
    options: DashboardGenerationOptions,
    areaId: string,
    totalEntities: number,
) {
    const query: EntityQueryConfig = { areaIds: [areaId] };
    const attentionModes: NonNullable<CollectionCardOptions['mode']>[] = [
        'security',
        'openings',
        'motion',
        'media_playing',
        'low_battery',
        'updates',
    ];
    const attentionEntityIds = new Set(
        attentionModes.flatMap((mode) =>
            resolveGeneratedCollectionEntities(inventory, options, {
                mode,
                threshold: mode === 'low_battery' ? 25 : undefined,
                query,
            }).map((entity) => entity.entityId),
        ),
    );
    const security = resolveGeneratedCollectionEntities(inventory, options, {
        mode: 'security',
        query,
    });
    const openings = resolveGeneratedCollectionEntities(inventory, options, {
        mode: 'openings',
        query,
    });
    const motion = resolveGeneratedCollectionEntities(inventory, options, {
        mode: 'motion',
        query,
    });
    const mediaPlaying = resolveGeneratedCollectionEntities(inventory, options, {
        mode: 'media_playing',
        query,
    });
    const lowBattery = resolveGeneratedCollectionEntities(inventory, options, {
        mode: 'low_battery',
        threshold: 25,
        query,
    });
    const updates = resolveGeneratedCollectionEntities(inventory, options, {
        mode: 'updates',
        query,
    });
    const activeControlIds = new Set(
        resolveGeneratedCollectionEntities(inventory, options, {
            mode: 'lights_on',
            query,
        }).map((entity) => entity.entityId),
    );
    const temperature = sortEntitiesByImportance(
        inventory.labelFilteredEntities.filter(
            (entity) =>
                entity.areaId === areaId &&
                entity.domain === 'sensor' &&
                entity.deviceClass === 'temperature' &&
                !entity.hidden &&
                !entity.diagnostic &&
                Number.isFinite(Number(entity.state)),
        ),
        areaId,
    )[0];

    const parts: string[] = [];
    if (security.length > 0) parts.push(formatCount(security.length, 'alert'));
    if (openings.length > 0) parts.push(`${openings.length} open`);
    if (activeControlIds.size > 0) {
        parts.push(`${activeControlIds.size} control${activeControlIds.size === 1 ? '' : 's'} on`);
    }
    if (motion.length > 0) parts.push('motion');
    if (mediaPlaying.length > 0) parts.push('media');
    if (lowBattery.length > 0) parts.push(formatCount(lowBattery.length, 'low battery', 'low batteries'));
    if (updates.length > 0) parts.push(formatCount(updates.length, 'update'));
    const temperatureText = formatNavigationTemperature(temperature);
    if (temperatureText) parts.push(temperatureText);
    if (parts.length === 0 && attentionEntityIds.size > 0) parts.push(formatCount(attentionEntityIds.size, 'attention item'));
    if (parts.length > 0) return parts.slice(0, 4).join(' - ');
    return totalEntities > 0 ? 'Ready' : 'No active signals';
}

function isTvLikeMediaEntity(entity: ResolvedEntity) {
    const haystack = `${entity.entityId} ${entity.name} ${entity.deviceClass ?? ''}`.toLowerCase();
    return ['tv', 'television', 'android', 'webos', 'shield', 'receiver', 'avr', 'projector'].some((term) =>
        haystack.includes(term),
    );
}

function normalizeRemoteTargetKey(entity: ResolvedEntity) {
    return entity.entityId
        .split('.')[1]
        ?.toLowerCase()
        .replace(/(^|_)remote($|_)/g, '_')
        .replace(/(^|_)media_player($|_)/g, '_')
        .replace(/(^|_)player($|_)/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '') ?? entity.entityId.toLowerCase();
}

function remoteControlsSameMediaPlayer(remote: ResolvedEntity, mediaPlayer: ResolvedEntity) {
    const remoteKey = normalizeRemoteTargetKey(remote);
    const mediaKey = normalizeRemoteTargetKey(mediaPlayer);
    return remoteKey === mediaKey || remoteKey.includes(mediaKey) || mediaKey.includes(remoteKey);
}

function normalizeMediaPlayerText(value: string | null | undefined) {
    return (value ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .trim();
}

function mediaPlayerCanonicalScore(entity: ResolvedEntity) {
    const slug = normalizeMediaPlayerText(entity.entityId.split('.')[1] ?? entity.entityId);
    const name = normalizeMediaPlayerText(entity.name);
    let score = getEntityImportance(entity, entity.areaId ?? undefined);

    if (entity.state === 'playing') score += 8;
    if (entity.state === 'paused') score += 4;
    if (name && slug === name) score += 10;
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
    if (candidateScore !== currentScore) {
        return candidateScore > currentScore ? candidate : current;
    }
    return candidate.entityId.localeCompare(current.entityId) < 0 ? candidate : current;
}

function dedupeMediaPlayersByKey(
    mediaPlayers: ResolvedEntity[],
    getKey: (entity: ResolvedEntity) => string | null,
) {
    const preferredByKey = new Map<string, ResolvedEntity>();
    const countByKey = new Map<string, number>();

    for (const entity of mediaPlayers) {
        const key = getKey(entity);
        if (!key) continue;
        countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
        const current = preferredByKey.get(key);
        preferredByKey.set(key, current ? preferMediaPlayer(entity, current) : entity);
    }

    const duplicateGroupPreferredIds = new Set(
        Array.from(preferredByKey.entries())
            .filter(([key]) => (countByKey.get(key) ?? 0) > 1)
            .map(([, entity]) => entity.entityId),
    );
    const duplicateIds = new Set<string>();

    for (const entity of mediaPlayers) {
        const key = getKey(entity);
        if (!key) continue;
        const preferred = preferredByKey.get(key);
        if (preferred && preferred.entityId !== entity.entityId) {
            duplicateIds.add(entity.entityId);
        }
    }

    return {
        mediaPlayers: mediaPlayers.filter((entity) => !duplicateIds.has(entity.entityId)),
        skipped: mediaPlayers.filter((entity) => duplicateIds.has(entity.entityId)),
        kept: mediaPlayers.filter((entity) => duplicateGroupPreferredIds.has(entity.entityId)),
    };
}

function dedupeGeneratedMediaPlayers(
    mediaPlayers: ResolvedEntity[],
    scopeName: string,
    qualityHints: DashboardGenerationQualityHint[],
) {
    const devicePass = dedupeMediaPlayersByKey(mediaPlayers, (entity) =>
        entity.deviceId ? `${entity.areaId ?? 'global'}:device:${entity.deviceId}` : null,
    );
    const namePass = dedupeMediaPlayersByKey(devicePass.mediaPlayers, (entity) => {
        const name = normalizeMediaPlayerText(entity.name);
        return name ? `${entity.areaId ?? 'global'}:name:${name}` : null;
    });
    const skipped = [...devicePass.skipped, ...namePass.skipped];

    if (skipped.length > 0) {
        const keptIds = [...devicePass.kept, ...namePass.kept].map((entity) => entity.entityId);
        const hint = createQualityHintFromIds(
            'duplicate_media_player',
            'info',
            `${scopeName}: skipped duplicate media player entities that appear to represent the same physical player.`,
            [...skipped.map((entity) => entity.entityId), ...keptIds],
            'Add a skipped media player manually if Home Assistant exposes genuinely separate controls for it.',
        );
        if (hint) qualityHints.push(hint);
    }

    return namePass.mediaPlayers;
}

function createPlacer() {
    const state: PlacementState = {
        desktopCol: 1,
        desktopRow: 1,
        desktopRowSpan: 0,
        mobileCol: 1,
        mobileRow: 1,
        mobileRowSpan: 0,
    };

    function place(grid: GridConfig, item: DashboardItem, cardSize: CardSize = 'standard') {
        const layout = createDefaultItemLayout(1, item.cardType, cardSize);
        const desktopSpan = item.layout.desktop.colSpan;
        const desktopRows = item.layout.desktop.rowSpan;
        const mobileSpan = item.layout.mobile.colSpan;
        const mobileRows = item.layout.mobile.rowSpan;

        if (state.desktopCol + desktopSpan - 1 > 12) {
            state.desktopRow += Math.max(state.desktopRowSpan, 1);
            state.desktopCol = 1;
            state.desktopRowSpan = 0;
        }

        layout.desktop = {
            colStart: state.desktopCol,
            colSpan: desktopSpan,
            rowStart: state.desktopRow,
            rowSpan: desktopRows,
        };
        state.desktopCol += desktopSpan;
        state.desktopRowSpan = Math.max(state.desktopRowSpan, desktopRows);

        if (state.mobileCol + mobileSpan - 1 > 4) {
            state.mobileRow += Math.max(state.mobileRowSpan, 1);
            state.mobileCol = 1;
            state.mobileRowSpan = 0;
        }

        layout.mobile = {
            colStart: state.mobileCol,
            colSpan: mobileSpan,
            rowStart: state.mobileRow,
            rowSpan: mobileRows,
        };
        state.mobileCol += mobileSpan;
        state.mobileRowSpan = Math.max(state.mobileRowSpan, mobileRows);

        item.layout = layout;
        grid.items.push(item);
    }

    return { place };
}

function createCard(input: GeneratedCardInput, options: DashboardGenerationOptions): DashboardItem {
    const layout = createDefaultItemLayout(1, input.cardType, input.cardSize ?? 'standard');
    if (input.desktopSpan) layout.desktop.colSpan = input.desktopSpan;
    if (input.mobileSpan) layout.mobile.colSpan = input.mobileSpan;
    if (input.rowSpan) {
        layout.desktop.rowSpan = input.rowSpan;
        layout.mobile.rowSpan = input.rowSpan;
    }
    if (input.mobileRowSpan) layout.mobile.rowSpan = input.mobileRowSpan;

    return {
        id: generateUUID(),
        cardType: input.cardType,
        entityId: input.entityId ?? '',
        name: input.name ?? '',
        icon: input.icon ?? '',
        path: input.path,
        iconType: input.iconType,
        imageUrl: input.imageUrl,
        shortcuts: input.shortcuts,
        layout,
        secondaryEntityId: '',
        secondaryName: '',
        domainFilter: input.domainFilter ?? '',
        subtitle: input.subtitle ?? '',
        alignment: input.alignment ?? 'start',
        color: input.color,
        backgroundColor: '',
        options: input.options,
        tabs: input.tabs,
        activeTabIndex: input.activeTabIndex,
        hours_to_show: input.hours_to_show,
        aggregate_func: input.aggregate_func,
        graphEntities: input.graphEntities,
        generatedBy: createMetadata(
            options,
            input.reason,
            input.sourceType,
            input.sourceId,
        ),
        generationState: 'generated',
    };
}

function addCard(
    grid: GridConfig,
    placer: ReturnType<typeof createPlacer>,
    input: GeneratedCardInput,
    options: DashboardGenerationOptions,
    included: DashboardGenerationEntityRef[],
    entityIds: string[] = [],
) {
    const item = createCard(input, options);
    placer.place(grid, item, input.cardSize);

    const uniqueEntityIds = Array.from(new Set([input.entityId, ...entityIds].filter(Boolean) as string[]));
    for (const entityId of uniqueEntityIds) {
        included.push({ entityId, reason: input.reason, cardId: item.id });
    }

    return item;
}

function addTitle(
    grid: GridConfig,
    placer: ReturnType<typeof createPlacer>,
    title: string,
    subtitle: string,
    options: DashboardGenerationOptions,
    sourceType?: DashboardGenerationMetadata['sourceType'],
    sourceId?: string,
) {
    return addCard(
        grid,
        placer,
        {
            cardType: 'title',
            name: title,
            subtitle,
            icon: '',
            desktopSpan: 12,
            mobileSpan: 4,
            rowSpan: 1,
            reason: `Section heading for ${title}`,
            sourceType,
            sourceId,
        },
        options,
        [],
    );
}

function addAttentionSection(
    grid: GridConfig,
    placer: ReturnType<typeof createPlacer>,
    inventory: PreparedInventory,
    options: DashboardGenerationOptions,
    included: DashboardGenerationEntityRef[],
    definitions: AttentionDefinition[],
    title = 'Attention',
    subtitle = 'Current activity and things that need attention',
) {
    const resolved = definitions
        .map((definition) => {
            const collection: CollectionCardOptions = {
                mode: definition.mode,
                threshold: definition.threshold,
                showState: true,
                query: definition.query,
                presentation: definition.presentation,
            };
            return {
                definition,
                collection,
                entities: resolveGeneratedCollectionEntities(inventory, options, collection),
            };
        })
        .filter((entry) => entry.entities.length > 0);

    if (resolved.length === 0) return [];

    addTitle(
        grid,
        placer,
        title,
        subtitle,
        options,
        definitions[0]?.sourceType,
        definitions[0]?.sourceId,
    );

    for (const { definition, collection, entities } of resolved) {
        addCard(
            grid,
            placer,
            {
                cardType: 'collection',
                name: definition.name,
                icon: definition.icon,
                desktopSpan: definition.desktopSpan ?? 4,
                mobileSpan: definition.mobileSpan ?? 4,
                rowSpan: definition.rowSpan ?? 2,
                options: { collection },
                color: getCollectionAccent(definition.mode),
                reason: definition.reason,
                sourceType: definition.sourceType,
                sourceId: definition.sourceId,
            },
            options,
            included,
            entities.map((entity) => entity.entityId),
        );
    }

    return resolved.flatMap((entry) => entry.entities);
}

function hasGeneratedContent(grid: GridConfig) {
    return grid.items.some((item) => item.cardType !== 'title');
}

function getGridMaxRow(grid: GridConfig, breakpoint: 'desktop' | 'mobile') {
    return grid.items.reduce((max, item) => {
        const layout = item.layout[breakpoint];
        return Math.max(max, layout.rowStart + layout.rowSpan - 1);
    }, 0);
}

function getTabSurfaceRowSpan(tabs: GridConfig[]) {
    const maxRows = tabs.reduce(
        (max, tab) => Math.max(max, getGridMaxRow(tab, 'desktop'), getGridMaxRow(tab, 'mobile')),
        0,
    );

    return Math.max(6, Math.min(18, maxRows + 2));
}

function setGeneratedTabs(
    config: RoomDashboardConfig,
    tabs: GridConfig[],
    fallback: GridConfig,
    options: DashboardGenerationOptions,
    surface: {
        name: string;
        icon: string;
        reason: string;
        sourceType: DashboardGenerationMetadata['sourceType'];
        sourceId: string;
    },
) {
    const generatedTabs = tabs.filter(hasGeneratedContent);
    const nestedTabs = generatedTabs.length > 0 ? generatedTabs : [fallback];
    const rootTab = createGeneratedTab(
        config.name || fallback.name,
        fallback.icon || surface.icon,
        options,
        `${surface.reason} page`,
        surface.sourceType,
        surface.sourceId,
    );
    const placer = createPlacer();

    addCard(
        rootTab,
        placer,
        {
            cardType: 'tabs',
            name: surface.name,
            icon: surface.icon,
            tabs: nestedTabs,
            activeTabIndex: 0,
            desktopSpan: 12,
            mobileSpan: 4,
            rowSpan: getTabSurfaceRowSpan(nestedTabs),
            reason: surface.reason,
            sourceType: surface.sourceType,
            sourceId: surface.sourceId,
        },
        options,
        [],
    );

    config.tabs = [rootTab];
    config.activeTabId = config.tabs[0]?.id ?? '';
}

function countGridItems(grid: GridConfig): number {
    return grid.items.reduce((count, item) => {
        const nestedCount = item.tabs?.reduce((sum, tab) => sum + countGridItems(tab), 0) ?? 0;
        return count + 1 + nestedCount;
    }, 0);
}

function countConfigItems(config: RoomDashboardConfig): number {
    return config.tabs.reduce((count, tab) => count + countGridItems(tab), 0);
}

function buildSkippedEntities(
    inventory: PreparedInventory,
    included: DashboardGenerationEntityRef[],
    areaId?: string,
) {
    const used = new Set(included.map((item) => item.entityId));
    return inventory.labelFilteredEntities
        .filter((entity) => !entity.hidden && !entity.diagnostic)
        .filter((entity) => !areaId || entity.areaId === areaId)
        .filter((entity) => !used.has(entity.entityId))
        .slice(0, USED_DOMAIN_LIMIT)
        .map((entity) => ({
            entityId: entity.entityId,
            reason: 'No v1 generator card selected for this entity',
        }));
}

function buildSkippedEntitiesForAreas(
    inventory: PreparedInventory,
    included: DashboardGenerationEntityRef[],
    areaIds: string[],
) {
    const areas = new Set(areaIds);
    const used = new Set(included.map((item) => item.entityId));
    return inventory.labelFilteredEntities
        .filter((entity) => !entity.hidden && !entity.diagnostic)
        .filter((entity) => areas.size === 0 || areas.has(entity.areaId ?? ''))
        .filter((entity) => !used.has(entity.entityId))
        .slice(0, USED_DOMAIN_LIMIT)
        .map((entity) => ({
            entityId: entity.entityId,
            reason: 'No v1 floor generator card selected for this entity',
        }));
}

function buildSkippedEntitiesFromResolved(
    entities: ResolvedEntity[],
    included: DashboardGenerationEntityRef[],
    reason: string,
) {
    const used = new Set(included.map((item) => item.entityId));
    return entities
        .filter((entity) => !used.has(entity.entityId))
        .slice(0, USED_DOMAIN_LIMIT)
        .map((entity) => ({
            entityId: entity.entityId,
            reason,
        }));
}

function summarizeNameInferredAreas(entities: ResolvedEntity[], areaName: string) {
    const inferred = entities.filter((entity) => entity.areaSource === 'name_inference');
    if (inferred.length === 0) return null;

    const preview = inferred
        .slice(0, 3)
        .map((entity) => entity.entityId)
        .join(', ');
    const suffix = inferred.length > 3 ? `, and ${inferred.length - 3} more` : '';

    return `${areaName}: ${inferred.length} ${inferred.length === 1 ? 'entity was' : 'entities were'} matched by entity or friendly name because Home Assistant area data was missing (${preview}${suffix}). Review before applying.`;
}

function scopedQualityEntities(
    inventory: PreparedInventory,
    scope?: { areaId?: string; areaIds?: string[] },
) {
    const areaIds = new Set(scope?.areaIds ?? []);
    return inventory.labelFilteredEntities.filter((entity) => {
        if (scope?.areaId && entity.areaId !== scope.areaId) return false;
        if (areaIds.size > 0 && !areaIds.has(entity.areaId ?? '')) return false;
        return true;
    });
}

function createQualityHint(
    code: DashboardGenerationQualityHint['code'],
    severity: DashboardGenerationQualityHint['severity'],
    message: string,
    entities: ResolvedEntity[],
    suggestedAction?: string,
): DashboardGenerationQualityHint | null {
    if (entities.length === 0) return null;
    return {
        code,
        severity,
        message,
        entityIds: entities.slice(0, ENTITY_PREVIEW_LIMIT).map((entity) => entity.entityId),
        suggestedAction,
    };
}

function createQualityHintFromIds(
    code: DashboardGenerationQualityHint['code'],
    severity: DashboardGenerationQualityHint['severity'],
    message: string,
    entityIds: string[],
    suggestedAction?: string,
): DashboardGenerationQualityHint | null {
    const uniqueEntityIds = Array.from(new Set(entityIds.filter(Boolean))).slice(0, ENTITY_PREVIEW_LIMIT);
    if (uniqueEntityIds.length === 0) return null;
    return {
        code,
        severity,
        message,
        entityIds: uniqueEntityIds,
        suggestedAction,
    };
}

function buildQualityHints(
    inventory: PreparedInventory,
    included: DashboardGenerationEntityRef[],
    skipped: DashboardGenerationEntityRef[],
    scope?: { areaId?: string; areaIds?: string[] },
): DashboardGenerationQualityHint[] {
    const scopedEntities = scopedQualityEntities(inventory, scope);
    const includedIds = new Set(included.map((item) => item.entityId));
    const skippedIds = new Set(skipped.map((item) => item.entityId));
    const includedEntities = scopedEntities.filter((entity) => includedIds.has(entity.entityId));
    const skippedEntities = scopedEntities.filter((entity) => skippedIds.has(entity.entityId));
    const nameInferred = scopedEntities.filter((entity) => entity.areaSource === 'name_inference');
    const missingArea = scopedEntities.filter((entity) => !entity.areaId && !entity.hidden && !entity.diagnostic);
    const lowImportanceSkipped = skippedEntities.filter(
        (entity) => ['sensor', 'binary_sensor'].includes(entity.domain) && !isUsefulStatusEntity(entity),
    );
    const unavailableSkipped = skippedEntities.filter(
        (entity) => hasHiddenRuntimeState(entity) && !isActionDomain(entity),
    );
    const hints = [
        createQualityHint(
            'area_matched',
            'info',
            'Entities with explicit room assignments were prioritized.',
            includedEntities.filter((entity) => entity.areaSource === 'entity_registry'),
        ),
        createQualityHint(
            'device_area_fallback',
            'suggestion',
            'Some entities used their device room because the entity itself has no room assigned.',
            includedEntities.filter((entity) => entity.areaSource === 'device_registry'),
            'Assign areas directly to important entities when the generated grouping looks wrong.',
        ),
        createQualityHint(
            'name_inferred_area',
            'warning',
            'Some entities were matched to rooms by entity ID or friendly name.',
            nameInferred,
            'Assign Home Assistant areas to these entities to make future generation more reliable.',
        ),
        createQualityHint(
            'missing_area',
            'warning',
            'Some visible entities have no room source and were only used on global dashboards or skipped.',
            missingArea,
            'Assign areas in Home Assistant when these should appear on room dashboards.',
        ),
        createQualityHint(
            'skipped_diagnostic',
            'info',
            'Diagnostic or hidden entities were kept out of generated cards.',
            scopedEntities.filter((entity) => entity.hidden || entity.diagnostic),
        ),
        createQualityHint(
            'skipped_low_importance',
            'suggestion',
            'Low-importance sensors were suppressed to keep generated dashboards calm.',
            lowImportanceSkipped,
            'Manually include any of these if they matter to your dashboard.',
        ),
        createQualityHint(
            'skipped_unavailable',
            'info',
            'Unknown or unavailable entities were kept out of normal generated cards.',
            unavailableSkipped,
            'Fix the entity in Home Assistant or add it manually if it should still appear.',
        ),
        createQualityHint(
            'manual_review',
            'warning',
            'This draft would benefit from a quick review before applying.',
            [...nameInferred, ...missingArea].slice(0, ENTITY_PREVIEW_LIMIT),
            'Check name-inferred and unassigned entities in the preview.',
        ),
    ];

    return hints.filter((hint): hint is DashboardGenerationQualityHint => Boolean(hint));
}

function buildRoomNameReviewHints(
    inventory: PreparedInventory,
    areaName: string,
    areaId?: string,
): DashboardGenerationQualityHint[] {
    const normalizedAreaName = areaName.trim().toLowerCase();
    if (!normalizedAreaName) return [];

    const repeatedNameEntities = inventory.labelFilteredEntities
        .filter((entity) => !entity.hidden && !entity.diagnostic)
        .filter((entity) => !areaId || entity.areaId === areaId)
        .filter((entity) => entity.name.toLowerCase().includes(normalizedAreaName))
        .slice(0, ENTITY_PREVIEW_LIMIT);
    if (repeatedNameEntities.length < 2) return [];

    const hint = createQualityHint(
        'name_review',
        'suggestion',
        `${areaName}: several entity names include the room name. The generator keeps Home Assistant names unchanged.`,
        repeatedNameEntities,
        'Rename friendly names in Home Assistant if you want cleaner room-local labels.',
    );
    return hint ? [hint] : [];
}

function mergeQualityHints(...groups: DashboardGenerationQualityHint[][]) {
    const merged = new Map<string, DashboardGenerationQualityHint>();

    for (const hint of groups.flat()) {
        const key = `${hint.code}:${hint.message}`;
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, { ...hint, entityIds: [...hint.entityIds] });
            continue;
        }
        existing.entityIds = Array.from(new Set([...existing.entityIds, ...hint.entityIds])).slice(0, ENTITY_PREVIEW_LIMIT);
    }

    return [...merged.values()];
}

function uniqueResolvedEntities(...groups: ResolvedEntity[][]) {
    const entities = new Map<string, ResolvedEntity>();
    for (const group of groups) {
        for (const entity of group) {
            entities.set(entity.entityId, entity);
        }
    }
    return [...entities.values()];
}

function getForcedIncludeEntities(
    inventory: PreparedInventory,
    options: DashboardGenerationOptions,
    included: DashboardGenerationEntityRef[],
    scope?: { areaId?: string; areaIds?: string[] },
) {
    const includeEntityIds = options.includeEntityIds?.filter(Boolean) ?? [];
    if (includeEntityIds.length === 0) return [];

    const includedIds = new Set(included.map((item) => item.entityId));
    const areaIds = new Set(scope?.areaIds ?? []);

    return includeEntityIds
        .map((entityId) => inventory.labelFilteredEntities.find((entity) => entity.entityId === entityId))
        .filter((entity): entity is ResolvedEntity => Boolean(entity))
        .filter((entity) => !entity.hidden && !entity.diagnostic)
        .filter((entity) => !includedIds.has(entity.entityId))
        .filter((entity) => !scope?.areaId || entity.areaId === scope.areaId)
        .filter((entity) => areaIds.size === 0 || areaIds.has(entity.areaId ?? ''));
}

function addForcedIncludeEntities(
    grid: GridConfig,
    placer: ReturnType<typeof createPlacer>,
    inventory: PreparedInventory,
    options: DashboardGenerationOptions,
    included: DashboardGenerationEntityRef[],
    scope?: {
        areaId?: string;
        areaIds?: string[];
        sourceType?: DashboardGenerationMetadata['sourceType'];
        sourceId?: string;
    },
) {
    const forcedEntities = getForcedIncludeEntities(inventory, options, included, scope);
    if (forcedEntities.length === 0) return;

    const sourceType = scope?.sourceType ?? getDefaultSourceType(options);
    const sourceId = scope?.sourceId ?? getDefaultSourceId(options);

    addTitle(
        grid,
        placer,
        'Pinned Entities',
        'Manually included from the generation preview',
        options,
        sourceType,
        sourceId,
    );

    for (const entity of forcedEntities) {
        addCard(
            grid,
            placer,
            createEntityTypeCardInput(entity, 'Pinned Entities', sourceId, sourceType),
            options,
            included,
        );
    }
}

function applyResultSummary(
    config: RoomDashboardConfig,
    recipe: DashboardGenerationRecipe,
    title: string,
    included: DashboardGenerationEntityRef[],
    skipped: DashboardGenerationEntityRef[],
    relatedConfigs: RoomDashboardConfig[] = [],
) {
    const cards = countConfigItems(config);
    const relatedCards = relatedConfigs.reduce((count, relatedConfig) => count + countConfigItems(relatedConfig), 0);
    return {
        recipe,
        title,
        tabs: config.tabs.length,
        cards,
        included: included.length,
        skipped: skipped.length,
        relatedDashboards: relatedConfigs.length,
        relatedCards,
    };
}

function generateHouseDashboard(
    context: InventoryContext,
    options: DashboardGenerationOptions,
): DashboardGenerationResult {
    const warnings: string[] = [];
    const includedEntities: DashboardGenerationEntityRef[] = [];
    const relatedConfigs: RoomDashboardConfig[] = [];
    const relatedQualityHints: DashboardGenerationQualityHint[][] = [];
    const localQualityHints: DashboardGenerationQualityHint[] = [];
    const inventory = prepareInventory(context, options);
    const config = createGeneratedConfig(
        options.targetDashboardId,
        'Home Overview',
        options,
        'Generated house overview dashboard',
    );
    const homeTab = createGeneratedTab('Home', 'home', options, 'Generated house home tab', 'house', HOUSE_OVERVIEW_ID);
    const statisticsTab = createGeneratedTab('Statistics', 'monitoring', options, 'Generated house statistics tab', 'house', HOUSE_OVERVIEW_ID);
    const mediaTab = createGeneratedTab('Media', 'play_circle', options, 'Generated house media tab', 'house', HOUSE_OVERVIEW_ID);
    const maintenanceTab = createGeneratedTab('Maintenance', 'build', options, 'Generated house maintenance tab', 'house', HOUSE_OVERVIEW_ID);
    const homePlacer = createPlacer();
    const statisticsPlacer = createPlacer();
    const mediaPlacer = createPlacer();
    const maintenancePlacer = createPlacer();

    addAttentionSection(
        maintenanceTab,
        maintenancePlacer,
        inventory,
        options,
        includedEntities,
        [
            {
                mode: 'security',
                name: 'Security Alerts',
                icon: 'shield_alert',
                reason: 'Security and safety entities needing attention',
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'house',
                sourceId: HOUSE_OVERVIEW_ID,
            },
            {
                mode: 'openings',
                name: 'Openings',
                icon: 'sensor_door',
                reason: 'Open doors, windows, covers, and unlocked locks',
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'house',
                sourceId: HOUSE_OVERVIEW_ID,
            },
            {
                mode: 'motion',
                name: 'Motion & Presence',
                icon: 'motion_sensor_active',
                reason: 'Active motion, occupancy, and presence entities',
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'house',
                sourceId: HOUSE_OVERVIEW_ID,
            },
            {
                mode: 'media_playing',
                name: 'Media Playing',
                icon: 'play_circle',
                reason: 'Media players currently playing or paused',
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'house',
                sourceId: HOUSE_OVERVIEW_ID,
            },
            {
                mode: 'lights_on',
                name: 'Active Devices',
                icon: 'bolt',
                reason: 'Active light, switch, and fan entities',
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'house',
                sourceId: HOUSE_OVERVIEW_ID,
            },
            {
                mode: 'low_battery',
                name: 'Low Batteries',
                icon: 'battery_alert',
                threshold: 25,
                reason: 'Battery sensors below threshold',
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'house',
                sourceId: HOUSE_OVERVIEW_ID,
            },
            {
                mode: 'unavailable',
                name: 'Unavailable',
                icon: 'link_off',
                reason: 'Unavailable or unknown entities',
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'house',
                sourceId: HOUSE_OVERVIEW_ID,
            },
            {
                mode: 'updates',
                name: 'Updates',
                icon: 'system_update_alt',
                reason: 'Available update entities',
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'house',
                sourceId: HOUSE_OVERVIEW_ID,
            },
        ],
    );

    const areaCards = (context.areas ?? [])
        .map((area) => ({
            area,
            entities: queryEntities(context, inventory, { areaIds: [area.area_id], limit: 100 }),
        }))
        .filter((entry) => entry.entities.length > 0)
        .sort((a, b) => a.area.name.localeCompare(b.area.name));

    if (areaCards.length > 0) {
        addTitle(homeTab, homePlacer, 'Rooms', 'Open a room dashboard or use quick controls', options);
        for (const { area, entities } of areaCards) {
            const path = getAreaDashboardPath(area);
            const shortcuts = getPrimaryRoomShortcuts(entities, inventory, area.area_id);
            const subtitle = summarizeRoomNavigation(inventory, options, area.area_id, entities.length);
            const visual = getAreaNavigationVisual(area);
            const navigationRowSpan = visual.imageUrl ? 3 : 2;
            const roomResult = generateRoomDashboard(
                context,
                {
                    ...options,
                    recipe: 'room',
                    targetDashboardId: getAreaDashboardId(area),
                    areaId: area.area_id,
                    includeEntityIds: [],
                },
                inventory,
            );
            relatedConfigs.push(roomResult.config);
            relatedQualityHints.push(roomResult.qualityHints);
            includedEntities.push(...roomResult.includedEntities);
            warnings.push(...roomResult.warnings);
            addCard(
                homeTab,
                homePlacer,
                {
                    cardType: 'navigation',
                    name: area.name,
                    subtitle,
                    icon: visual.icon,
                    iconType: visual.iconType,
                    imageUrl: visual.imageUrl,
                    path,
                    shortcuts,
                    options: { navigation: visual.options },
                    desktopSpan: 2,
                    mobileSpan: 2,
                    rowSpan: navigationRowSpan,
                    mobileRowSpan: 2,
                    reason: `Navigation to generated ${area.name} dashboard`,
                    sourceType: 'area',
                    sourceId: area.area_id,
                },
                options,
                includedEntities,
                shortcuts?.map((shortcut) => shortcut.entityId) ?? [],
            );
        }
    } else {
        warnings.push('No populated Home Assistant areas were found for room navigation.');
    }

    const houseActionEntities = sortEntitiesByImportance(queryEntities(context, inventory, {
        domains: ['button', 'scene', 'script'],
        limit: 24,
    }))
        .filter(isHouseActionEntity)
        .slice(0, 4);
    if (houseActionEntities.length > 0) {
        addTitle(homeTab, homePlacer, 'Quick Actions', 'House-wide scenes, scripts, and helper actions', options);
        for (const entity of houseActionEntities) {
            addCard(
                homeTab,
                homePlacer,
                {
                    cardType: 'button',
                    name: entity.name,
                    entityId: entity.entityId,
                    icon: getEntityTypeIcon(entity.domain, entity.deviceClass),
                    domainFilter: entity.domain,
                    desktopSpan: 3,
                    mobileSpan: 2,
                    rowSpan: 2,
                    color: getEntityAccent(entity),
                    options: { button: { control: 'button', showState: false, stateColor: false } },
                    reason: 'House-wide quick action',
                    sourceType: 'house',
                    sourceId: HOUSE_OVERVIEW_ID,
                },
                options,
                includedEntities,
            );
        }
    }

    let hasContextTitle = false;
    function ensureContextTitle() {
        if (hasContextTitle) return;
        addTitle(statisticsTab, statisticsPlacer, 'Context', 'Weather, energy, and calendar', options);
        hasContextTitle = true;
    }

    const weatherOptions = buildSmartWeatherOptions(inventory.index);
    if (hasAnyEntity(weatherOptions, ['weatherEntityId', 'temperatureEntityId', 'humidityEntityId', 'rainEntityId', 'windEntityId'])) {
        ensureContextTitle();
        addCard(
            statisticsTab,
            statisticsPlacer,
            {
                cardType: 'weather',
                name: 'Weather',
                icon: 'partly_cloudy_day',
                desktopSpan: 4,
                mobileSpan: 4,
                options: { weather: weatherOptions },
                reason: 'Weather entities discovered from HA state',
            },
            options,
            includedEntities,
            Object.values(weatherOptions).filter((value): value is string => typeof value === 'string' && value.includes('.')),
        );
    }

    const energyOptions = buildSmartEnergyOptions(inventory.index);
    if (hasAnyEntity(energyOptions, [
        'gridImportEntityId',
        'gridExportEntityId',
        'solarPowerEntityId',
        'homePowerEntityId',
        'batteryPowerEntityId',
        'todayEnergyEntityId',
        'gasEntityId',
        'waterEntityId',
    ])) {
        ensureContextTitle();
        addCard(
            statisticsTab,
            statisticsPlacer,
            {
                cardType: 'energy',
                name: 'Energy',
                icon: 'electric_bolt',
                desktopSpan: 4,
                mobileSpan: 4,
                options: { energy: energyOptions },
                reason: 'Energy entities discovered from HA state and names',
            },
            options,
            includedEntities,
            Object.values(energyOptions).filter((value): value is string => typeof value === 'string' && value.includes('.')),
        );
    }

    const calendarOptions = buildSmartCalendarOptions(inventory.index);
    if (calendarOptions.entityIds && calendarOptions.entityIds.length > 0) {
        ensureContextTitle();
        addCard(
            statisticsTab,
            statisticsPlacer,
            {
                cardType: 'calendar',
                name: 'Calendar',
                icon: 'calendar_month',
                desktopSpan: 4,
                mobileSpan: 4,
                options: { calendar: calendarOptions },
                reason: 'Calendar entities discovered from HA state',
            },
            options,
            includedEntities,
            calendarOptions.entityIds,
        );
    }

    const mediaPlayers = dedupeGeneratedMediaPlayers(sortEntitiesByImportance(queryEntities(context, inventory, {
        domains: ['media_player'],
    }).filter(isUsableGeneratedEntity)), 'Home Overview', localQualityHints);
    if (mediaPlayers.length > 0) {
        addTitle(mediaTab, mediaPlacer, 'Media', 'Available media players', options, 'house', HOUSE_OVERVIEW_ID);
        for (const mediaPlayer of mediaPlayers) {
            addCard(
                mediaTab,
                mediaPlacer,
                {
                    cardType: 'media',
                    name: mediaPlayer.name,
                    entityId: mediaPlayer.entityId,
                    icon: 'play_circle',
                    domainFilter: 'media_player',
                    desktopSpan: 4,
                    mobileSpan: 4,
                    color: getEntityAccent(mediaPlayer),
                    reason: 'Available media player discovered from HA inventory',
                },
                options,
                includedEntities,
            );
        }
    }

    addForcedIncludeEntities(maintenanceTab, maintenancePlacer, inventory, options, includedEntities, {
        sourceType: 'house',
        sourceId: HOUSE_OVERVIEW_ID,
    });

    if (homeTab.items.length <= 2) {
        warnings.push('Only a sparse house dashboard could be generated from the current HA inventory.');
    }

    setGeneratedTabs(config, [homeTab, statisticsTab, mediaTab, maintenanceTab], homeTab, options, {
        name: 'Home Sections',
        icon: 'tab',
        reason: 'Generated nested house tab surface',
        sourceType: 'house',
        sourceId: HOUSE_OVERVIEW_ID,
    });
    const skippedEntities = buildSkippedEntities(inventory, includedEntities);
    const explainedIncludedEntities = enrichEntityRefs(includedEntities, inventory);
    const explainedSkippedEntities = enrichEntityRefs(skippedEntities, inventory);
    const qualityHints = mergeQualityHints(
        buildQualityHints(inventory, explainedIncludedEntities, explainedSkippedEntities),
        buildAreaPictureHints(areaCards, 'Home Overview'),
        localQualityHints,
        ...relatedQualityHints,
    );

    return {
        config,
        relatedConfigs,
        summary: applyResultSummary(config, 'house', 'Home Overview', explainedIncludedEntities, explainedSkippedEntities, relatedConfigs),
        includedEntities: explainedIncludedEntities,
        skippedEntities: explainedSkippedEntities,
        qualityHints,
        warnings,
    };
}

function generateFloorDashboard(
    context: InventoryContext,
    options: DashboardGenerationOptions,
    preparedInventory?: PreparedInventory,
): DashboardGenerationResult {
    const warnings: string[] = [];
    const includedEntities: DashboardGenerationEntityRef[] = [];
    const relatedConfigs: RoomDashboardConfig[] = [];
    const relatedQualityHints: DashboardGenerationQualityHint[][] = [];
    const localQualityHints: DashboardGenerationQualityHint[] = [];
    const inventory = preparedInventory ?? prepareInventory(context, options);
    const floorId = options.floorId ?? getFallbackFloorId(context);
    const floorRouteId = floorId || ROOM_PATH_FALLBACK_FLOOR;
    const floorName = getFloorName(context, floorId);
    const resolvedOptions: DashboardGenerationOptions = { ...options, floorId: floorRouteId };
    const config = createGeneratedConfig(
        options.targetDashboardId || getFloorDashboardId(floorRouteId),
        floorName,
        resolvedOptions,
        `Generated dashboard for ${floorName}`,
    );
    const floorTab = createGeneratedTab(
        'Floor',
        'layers',
        resolvedOptions,
        `Generated floor overview tab for ${floorName}`,
        'floor',
        floorRouteId,
    );
    const statisticsTab = createGeneratedTab(
        'Statistics',
        'monitoring',
        resolvedOptions,
        `Generated floor statistics tab for ${floorName}`,
        'floor',
        floorRouteId,
    );
    const mediaTab = createGeneratedTab(
        'Media',
        'play_circle',
        resolvedOptions,
        `Generated floor media tab for ${floorName}`,
        'floor',
        floorRouteId,
    );
    const maintenanceTab = createGeneratedTab(
        'Maintenance',
        'build',
        resolvedOptions,
        `Generated floor maintenance tab for ${floorName}`,
        'floor',
        floorRouteId,
    );
    const floorPlacer = createPlacer();
    const statisticsPlacer = createPlacer();
    const mediaPlacer = createPlacer();
    const maintenancePlacer = createPlacer();

    if (!floorId) {
        warnings.push('No Home Assistant floor was available, so unassigned rooms were used where possible.');
    }

    const floorAreas = (context.areas ?? [])
        .filter((area) => (floorId ? area.floor_id === floorId : !area.floor_id))
        .sort((a, b) => a.name.localeCompare(b.name));
    const floorAreaIds = floorAreas.map((area) => area.area_id);
    const floorQuery: EntityQueryConfig = floorId ? { floorIds: [floorId] } : { areaIds: floorAreaIds };

    addAttentionSection(
        maintenanceTab,
        maintenancePlacer,
        inventory,
        resolvedOptions,
        includedEntities,
        [
            {
                mode: 'security',
                name: 'Security Alerts',
                icon: 'shield_alert',
                query: { ...floorQuery, limit: 6 },
                reason: `${floorName} security and safety entities needing attention`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'floor',
                sourceId: floorRouteId,
            },
            {
                mode: 'openings',
                name: 'Openings',
                icon: 'sensor_door',
                query: { ...floorQuery, limit: 6 },
                reason: `${floorName} open doors, windows, covers, and unlocked locks`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'floor',
                sourceId: floorRouteId,
            },
            {
                mode: 'motion',
                name: 'Motion & Presence',
                icon: 'motion_sensor_active',
                query: { ...floorQuery, limit: 6 },
                reason: `${floorName} active motion, occupancy, and presence entities`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'floor',
                sourceId: floorRouteId,
            },
            {
                mode: 'lights_on',
                name: 'Active Devices',
                icon: 'bolt',
                query: { ...floorQuery, limit: 12 },
                reason: `${floorName} active light, switch, and fan entities`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'floor',
                sourceId: floorRouteId,
            },
            {
                mode: 'media_playing',
                name: 'Media Playing',
                icon: 'play_circle',
                query: { ...floorQuery, limit: 4 },
                reason: `${floorName} media players currently playing or paused`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'floor',
                sourceId: floorRouteId,
            },
        ],
    );
    const areaCards = floorAreas
        .map((area) => ({
            area,
            entities: queryEntities(context, inventory, { areaIds: [area.area_id], limit: 100 }),
        }))
        .filter((entry) => entry.entities.length > 0);

    if (areaCards.length > 0) {
        addTitle(floorTab, floorPlacer, 'Rooms', 'Open a room dashboard or use quick controls', resolvedOptions, 'floor', floorRouteId);
        for (const { area, entities } of areaCards) {
            const shortcuts = getPrimaryRoomShortcuts(entities, inventory, area.area_id);
            const subtitle = summarizeRoomNavigation(inventory, resolvedOptions, area.area_id, entities.length);
            const visual = getAreaNavigationVisual(area);
            const navigationRowSpan = visual.imageUrl ? 3 : 2;
            const roomResult = generateRoomDashboard(
                context,
                {
                    ...options,
                    recipe: 'room',
                    targetDashboardId: getAreaDashboardId(area),
                    areaId: area.area_id,
                    includeEntityIds: [],
                },
                inventory,
            );
            relatedConfigs.push(roomResult.config);
            relatedQualityHints.push(roomResult.qualityHints);
            includedEntities.push(...roomResult.includedEntities);
            warnings.push(...roomResult.warnings);
            addCard(
                floorTab,
                floorPlacer,
                {
                    cardType: 'navigation',
                    name: area.name,
                    subtitle,
                    icon: visual.icon,
                    iconType: visual.iconType,
                    imageUrl: visual.imageUrl,
                    path: getAreaDashboardPath(area),
                    shortcuts,
                    options: { navigation: visual.options },
                    desktopSpan: 2,
                    mobileSpan: 2,
                    rowSpan: navigationRowSpan,
                    mobileRowSpan: 2,
                    reason: `Navigation to generated ${area.name} dashboard`,
                    sourceType: 'area',
                    sourceId: area.area_id,
                },
                resolvedOptions,
                includedEntities,
                shortcuts?.map((shortcut) => shortcut.entityId) ?? [],
            );
        }
    } else {
        warnings.push(`${floorName} has no populated Home Assistant areas for room navigation.`);
    }

    const batteryEntities = filterLowBattery(
        queryEntities(context, inventory, {
            ...floorQuery,
            domains: ['sensor', 'binary_sensor'],
            deviceClasses: ['battery'],
            includeDiagnostic: true,
            sort: 'state',
            limit: 12,
        }),
        25,
    );
    const unavailableEntities = queryEntities(context, inventory, {
        ...floorQuery,
        states: ['unavailable', 'unknown'],
        includeDiagnostic: true,
        sort: 'domain',
        limit: 12,
    });

    if (batteryEntities.length > 0 || unavailableEntities.length > 0) {
        addTitle(maintenanceTab, maintenancePlacer, 'Maintenance', 'Batteries, availability, and floor review', resolvedOptions, 'floor', floorRouteId);
    }

    if (batteryEntities.length > 0) {
        addCard(
            maintenanceTab,
            maintenancePlacer,
            {
                cardType: 'collection',
                name: 'Low Batteries',
                icon: 'battery_alert',
                desktopSpan: 4,
                mobileSpan: 4,
                rowSpan: 3,
                color: getCollectionAccent('low_battery'),
                options: {
                    collection: {
                        mode: 'low_battery',
                        presentation: 'list',
                        threshold: 25,
                        showState: true,
                        query: {
                            limit: 12,
                            ...floorQuery,
                        },
                    },
                },
                reason: `${floorName} battery sensors below threshold`,
                sourceType: 'floor',
                sourceId: floorRouteId,
            },
            resolvedOptions,
            includedEntities,
            batteryEntities.map((entity) => entity.entityId),
        );
    }

    if (unavailableEntities.length > 0) {
        addCard(
            maintenanceTab,
            maintenancePlacer,
            {
                cardType: 'collection',
                name: 'Unavailable',
                icon: 'link_off',
                desktopSpan: 4,
                mobileSpan: 4,
                rowSpan: 3,
                color: getCollectionAccent('unavailable'),
                options: {
                    collection: {
                        mode: 'unavailable',
                        presentation: 'list',
                        showState: true,
                        query: {
                            limit: 12,
                            ...floorQuery,
                        },
                    },
                },
                reason: `${floorName} unavailable or unknown entities`,
                sourceType: 'floor',
                sourceId: floorRouteId,
            },
            resolvedOptions,
            includedEntities,
            unavailableEntities.map((entity) => entity.entityId),
        );
    }

    const floorGraphSensors = sortEntitiesByImportance(queryEntities(context, inventory, {
        ...floorQuery,
        domains: ['sensor'],
        deviceClasses: [...GRAPH_DEVICE_CLASSES],
        limit: 16,
    }).filter((entity) => isUsableGeneratedEntity(entity) && isValidNumericSensor(entity))).slice(0, 4);
    if (floorGraphSensors.length > 0) {
        addTitle(statisticsTab, statisticsPlacer, 'Statistics', 'Key floor measurements and history', resolvedOptions, 'floor', floorRouteId);
        for (const sensor of floorGraphSensors) {
            addCard(
                statisticsTab,
                statisticsPlacer,
                {
                    cardType: 'graph',
                    name: sensor.name,
                    entityId: sensor.entityId,
                    icon: getEntityTypeIcon(sensor.domain, sensor.deviceClass),
                    desktopSpan: 6,
                    mobileSpan: 4,
                    rowSpan: 2,
                    color: getEntityAccent(sensor),
                    hours_to_show: 12,
                    aggregate_func: 'avg',
                    reason: `${floorName} ${sensor.deviceClass ?? 'sensor'} history`,
                    sourceType: 'floor',
                    sourceId: floorRouteId,
                },
                resolvedOptions,
                includedEntities,
            );
        }
    }

    const floorMediaPlayers = dedupeGeneratedMediaPlayers(sortEntitiesByImportance(queryEntities(context, inventory, {
        ...floorQuery,
        domains: ['media_player'],
    }).filter(isUsableGeneratedEntity)), floorName, localQualityHints);
    if (floorMediaPlayers.length > 0) {
        addTitle(mediaTab, mediaPlacer, 'Media', 'Available media players on this floor', resolvedOptions, 'floor', floorRouteId);
        for (const mediaPlayer of floorMediaPlayers) {
            addCard(
                mediaTab,
                mediaPlacer,
                {
                    cardType: 'media',
                    name: mediaPlayer.name,
                    entityId: mediaPlayer.entityId,
                    icon: 'play_circle',
                    domainFilter: 'media_player',
                    desktopSpan: 4,
                    mobileSpan: 4,
                    color: getEntityAccent(mediaPlayer),
                    reason: `${floorName} media player`,
                    sourceType: 'floor',
                    sourceId: floorRouteId,
                },
                resolvedOptions,
                includedEntities,
            );
        }
    }

    addForcedIncludeEntities(maintenanceTab, maintenancePlacer, inventory, resolvedOptions, includedEntities, {
        areaIds: floorAreaIds,
        sourceType: 'floor',
        sourceId: floorRouteId,
    });

    if (floorTab.items.length <= 1) {
        warnings.push(`Only a sparse ${floorName} dashboard could be generated from the current HA inventory.`);
    }

    setGeneratedTabs(config, [floorTab, statisticsTab, mediaTab, maintenanceTab], floorTab, resolvedOptions, {
        name: `${floorName} Sections`,
        icon: 'tab',
        reason: `Generated nested floor tab surface for ${floorName}`,
        sourceType: 'floor',
        sourceId: floorRouteId,
    });
    const skippedEntities = buildSkippedEntitiesForAreas(inventory, includedEntities, floorAreaIds);
    const explainedIncludedEntities = enrichEntityRefs(includedEntities, inventory);
    const explainedSkippedEntities = enrichEntityRefs(skippedEntities, inventory);
    const qualityHints = mergeQualityHints(
        buildQualityHints(inventory, explainedIncludedEntities, explainedSkippedEntities, { areaIds: floorAreaIds }),
        buildAreaPictureHints(areaCards, floorName),
        localQualityHints,
        ...relatedQualityHints,
    );

    return {
        config,
        relatedConfigs,
        summary: applyResultSummary(config, 'floor', floorName, explainedIncludedEntities, explainedSkippedEntities, relatedConfigs),
        includedEntities: explainedIncludedEntities,
        skippedEntities: explainedSkippedEntities,
        qualityHints,
        warnings,
    };
}

function createEntityTypeCardInput(
    entity: ResolvedEntity,
    title: string,
    sourceId: string,
    sourceType: DashboardGenerationMetadata['sourceType'] = 'entity_type',
): GeneratedCardInput {
    const reason = `${title} entity card`;
    const base = {
        name: entity.name,
        entityId: entity.entityId,
        icon: getEntityTypeIcon(entity.domain, entity.deviceClass),
        domainFilter: entity.domain,
        desktopSpan: 3,
        mobileSpan: 2,
        rowSpan: 2,
        reason,
        sourceType,
        sourceId,
    };

    if (entity.domain === 'climate') {
        return {
            ...base,
            cardType: 'thermostat',
            icon: 'device_thermostat',
            desktopSpan: 4,
            mobileSpan: 4,
        };
    }

    if (entity.domain === 'media_player') {
        return {
            ...base,
            cardType: 'media',
            icon: 'play_circle',
            desktopSpan: 4,
            mobileSpan: 4,
        };
    }

    if (entity.domain === 'remote') {
        return {
            ...base,
            cardType: 'remote',
            icon: 'settings_remote',
            desktopSpan: 4,
            mobileSpan: 4,
            options: {
                remote: {
                    source: 'manual',
                    preset: 'tv',
                    remoteEntityId: entity.entityId,
                },
            },
        };
    }

    if (entity.domain === 'cover' || entity.domain === 'fan' || entity.domain === 'vacuum') {
        const preset = entity.domain === 'cover' ? 'cover' : entity.domain === 'fan' ? 'fan' : 'vacuum';
        return {
            ...base,
            cardType: 'device_panel',
            icon: getEntityTypeIcon(entity.domain, entity.deviceClass),
            desktopSpan: 4,
            mobileSpan: 4,
            options: {
                device_panel: {
                    source: 'manual',
                    preset,
                    entityId: entity.entityId,
                },
            },
        };
    }

    if (
        entity.domain === 'sensor' &&
        ['temperature', 'humidity', 'power', 'energy'].includes(entity.deviceClass ?? '')
    ) {
        return {
            ...base,
            cardType: 'graph',
            desktopSpan: 6,
            mobileSpan: 4,
            hours_to_show: 12,
            aggregate_func: 'avg',
        };
    }

    const actionButton = ['button', 'scene', 'script'].includes(entity.domain);
    const informationOnly = isInformationOnlyEntity(entity);

    return {
        ...base,
        cardType: 'button',
        rowSpan: informationOnly ? 1 : base.rowSpan,
        options: {
            button: {
                ...(informationOnly ? { display: 'compact' as const } : {}),
                control: actionButton ? 'button' : informationOnly ? 'none' : 'auto',
                showState: true,
                stateColor: ['light', 'switch', 'fan'].includes(entity.domain) && !informationOnly,
            },
        },
    };
}

function generateEntityTypeDashboard(
    context: InventoryContext,
    options: DashboardGenerationOptions,
    preparedInventory?: PreparedInventory,
): DashboardGenerationResult {
    const warnings: string[] = [];
    const includedEntities: DashboardGenerationEntityRef[] = [];
    const inventory = preparedInventory ?? prepareInventory(context, options);
    const fallbackEntity = inventory.labelFilteredEntities.find((entity) => !entity.hidden && !entity.diagnostic);
    const domain = options.entityDomain ?? fallbackEntity?.domain ?? '';
    const deviceClass = options.entityDeviceClass;
    const sourceId = getEntityTypeSourceId(domain, deviceClass);
    const title = getEntityTypeTitle(domain, deviceClass);
    const resolvedOptions: DashboardGenerationOptions = {
        ...options,
        entityDomain: domain,
        entityDeviceClass: deviceClass,
    };
    const matchingEntities = queryEntities(context, inventory, {
        domains: domain ? [domain] : undefined,
        deviceClasses: deviceClass ? [deviceClass] : undefined,
        includeDiagnostic: Boolean(deviceClass),
        sort: 'name',
        limit: 100,
    });
    const config = createGeneratedConfig(
        options.targetDashboardId,
        title,
        resolvedOptions,
        `Generated dashboard for ${title}`,
    );
    const typeTab = createGeneratedTab(
        title,
        getEntityTypeIcon(domain, deviceClass),
        resolvedOptions,
        `Generated entity type tab for ${title}`,
        'entity_type',
        sourceId,
    );
    const placer = createPlacer();

    addTitle(typeTab, placer, title, 'Generated from matching Home Assistant entities', resolvedOptions, 'entity_type', sourceId);

    if (!domain) {
        warnings.push('No Home Assistant entities were available for an entity-type dashboard.');
    }

    if (matchingEntities.length === 0) {
        warnings.push(`No ${title.toLowerCase()} were found in the current Home Assistant inventory.`);
    }

    if (domain === 'calendar' && matchingEntities.length > 0) {
        addCard(
            typeTab,
            placer,
            {
                cardType: 'calendar',
                name: title,
                icon: 'calendar_month',
                desktopSpan: 6,
                mobileSpan: 4,
                rowSpan: 2,
                options: {
                    calendar: {
                        source: 'manual',
                        entityIds: matchingEntities.map((entity) => entity.entityId),
                    },
                },
                reason: `${title} calendar collection`,
                sourceType: 'entity_type',
                sourceId,
            },
            resolvedOptions,
            includedEntities,
            matchingEntities.map((entity) => entity.entityId),
        );
    } else if (domain === 'weather' && matchingEntities.length > 0) {
        for (const entity of matchingEntities.slice(0, 6)) {
            addCard(
                typeTab,
                placer,
                {
                    cardType: 'weather',
                    name: entity.name,
                    entityId: entity.entityId,
                    icon: 'partly_cloudy_day',
                    desktopSpan: 4,
                    mobileSpan: 4,
                    options: {
                        weather: {
                            source: 'manual',
                            weatherEntityId: entity.entityId,
                        },
                    },
                    reason: `${title} weather entity`,
                    sourceType: 'entity_type',
                    sourceId,
                },
                resolvedOptions,
                includedEntities,
            );
        }
    } else if (domain === 'update' || deviceClass === 'battery' || matchingEntities.length > 18) {
        addCard(
            typeTab,
            placer,
            {
                cardType: 'collection',
                name: title,
                icon: getEntityTypeIcon(domain, deviceClass),
                desktopSpan: 6,
                mobileSpan: 4,
                rowSpan: 2,
                options: {
                    collection: {
                        mode: 'custom',
                        threshold: deviceClass === 'battery' ? 25 : undefined,
                        showState: true,
                        query: {
                            domains: domain ? [domain] : undefined,
                            deviceClasses: deviceClass ? [deviceClass] : undefined,
                            includeDiagnostic: Boolean(deviceClass),
                            limit: 18,
                            sort: 'name',
                        },
                    },
                },
                reason: `${title} entity collection`,
                sourceType: 'entity_type',
                sourceId,
            },
            resolvedOptions,
            includedEntities,
            matchingEntities.slice(0, 18).map((entity) => entity.entityId),
        );
    } else {
        for (const entity of matchingEntities.slice(0, 18)) {
            addCard(
                typeTab,
                placer,
                createEntityTypeCardInput(entity, title, sourceId),
                resolvedOptions,
                includedEntities,
            );
        }
    }

    addForcedIncludeEntities(typeTab, placer, inventory, resolvedOptions, includedEntities, {
        sourceType: 'entity_type',
        sourceId,
    });

    config.tabs = [typeTab];
    config.activeTabId = typeTab.id;
    const skippedEntities = buildSkippedEntitiesFromResolved(
        matchingEntities,
        includedEntities,
        `No v1 entity-type generator card selected for ${title}`,
    );
    const explainedIncludedEntities = enrichEntityRefs(includedEntities, inventory);
    const explainedSkippedEntities = enrichEntityRefs(skippedEntities, inventory);
    const qualityHints = buildQualityHints(inventory, explainedIncludedEntities, explainedSkippedEntities);

    return {
        config,
        summary: applyResultSummary(config, 'entity_type', title, explainedIncludedEntities, explainedSkippedEntities),
        includedEntities: explainedIncludedEntities,
        skippedEntities: explainedSkippedEntities,
        qualityHints,
        warnings,
    };
}

function generateLabelDashboard(
    context: InventoryContext,
    options: DashboardGenerationOptions,
    preparedInventory?: PreparedInventory,
): DashboardGenerationResult {
    const warnings: string[] = [];
    const includedEntities: DashboardGenerationEntityRef[] = [];
    const inventory = preparedInventory ?? prepareInventory(context, options);
    const fallbackLabel = inventory.labelFilteredEntities.find((entity) => entity.labels.length > 0)?.labels[0] ?? '';
    const labelId = options.labelId ?? fallbackLabel;
    const title = getLabelTitle(labelId);
    const resolvedOptions: DashboardGenerationOptions = { ...options, labelId };
    const matchingEntities = queryEntities(context, inventory, {
        labels: labelId ? [labelId] : undefined,
        includeDiagnostic: true,
        sort: 'domain',
        limit: 100,
    });
    const config = createGeneratedConfig(
        options.targetDashboardId,
        title,
        resolvedOptions,
        `Generated dashboard for label ${title}`,
    );
    const labelTab = createGeneratedTab(
        title,
        'label',
        resolvedOptions,
        `Generated label tab for ${title}`,
        'label',
        labelId || 'label',
    );
    const placer = createPlacer();

    addTitle(labelTab, placer, title, 'Generated from Home Assistant label membership', resolvedOptions, 'label', labelId || 'label');

    if (!labelId) {
        warnings.push('No Home Assistant labels were available for a label dashboard.');
    }

    if (matchingEntities.length === 0) {
        warnings.push(`No entities with the ${title} label were found in the current Home Assistant inventory.`);
    }

    if (matchingEntities.length > 18) {
        addCard(
            labelTab,
            placer,
            {
                cardType: 'collection',
                name: title,
                icon: 'label',
                desktopSpan: 6,
                mobileSpan: 4,
                rowSpan: 2,
                options: {
                    collection: {
                        mode: 'custom',
                        showState: true,
                        query: {
                            labels: labelId ? [labelId] : undefined,
                            includeDiagnostic: true,
                            limit: 18,
                            sort: 'domain',
                        },
                    },
                },
                reason: `${title} labeled entity collection`,
                sourceType: 'label',
                sourceId: labelId || 'label',
            },
            resolvedOptions,
            includedEntities,
            matchingEntities.slice(0, 18).map((entity) => entity.entityId),
        );
    } else {
        const grouped = new Map<string, ResolvedEntity[]>();
        for (const entity of matchingEntities) {
            grouped.set(entity.domain, [...(grouped.get(entity.domain) ?? []), entity]);
        }

        for (const [domain, entities] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
            if (grouped.size > 1) {
                addTitle(
                    labelTab,
                    placer,
                    getEntityTypeTitle(domain),
                    `${title} labeled ${domain} entities`,
                    resolvedOptions,
                    'label',
                    labelId || 'label',
                );
            }

            for (const entity of entities) {
                addCard(
                    labelTab,
                    placer,
                    createEntityTypeCardInput(entity, title, labelId || 'label', 'label'),
                    resolvedOptions,
                    includedEntities,
                );
            }
        }
    }

    addForcedIncludeEntities(labelTab, placer, inventory, resolvedOptions, includedEntities, {
        sourceType: 'label',
        sourceId: labelId || 'label',
    });

    config.tabs = [labelTab];
    config.activeTabId = labelTab.id;
    const skippedEntities = buildSkippedEntitiesFromResolved(
        matchingEntities,
        includedEntities,
        `No v1 label generator card selected for ${title}`,
    );
    const explainedIncludedEntities = enrichEntityRefs(includedEntities, inventory);
    const explainedSkippedEntities = enrichEntityRefs(skippedEntities, inventory);
    const qualityHints = buildQualityHints(inventory, explainedIncludedEntities, explainedSkippedEntities);

    return {
        config,
        summary: applyResultSummary(config, 'label', title, explainedIncludedEntities, explainedSkippedEntities),
        includedEntities: explainedIncludedEntities,
        skippedEntities: explainedSkippedEntities,
        qualityHints,
        warnings,
    };
}

function addMaintenanceCollection(
    grid: GridConfig,
    placer: ReturnType<typeof createPlacer>,
    options: DashboardGenerationOptions,
    included: DashboardGenerationEntityRef[],
    input: {
        name: string;
        icon: string;
        entities: ResolvedEntity[];
        query: EntityQueryConfig;
        reason: string;
        threshold?: number;
    },
) {
    if (input.entities.length === 0) return;

    addCard(
        grid,
        placer,
        {
            cardType: 'collection',
            name: input.name,
            icon: input.icon,
            desktopSpan: 4,
            mobileSpan: 4,
            rowSpan: 2,
            options: {
                collection: {
                    mode: 'custom',
                    threshold: input.threshold,
                    showState: true,
                    query: input.query,
                },
            },
            reason: input.reason,
            sourceType: 'maintenance',
            sourceId: 'maintenance',
        },
        options,
        included,
        input.entities.map((entity) => entity.entityId),
    );
}

function generateMaintenanceDashboard(
    context: InventoryContext,
    options: DashboardGenerationOptions,
    preparedInventory?: PreparedInventory,
): DashboardGenerationResult {
    const warnings: string[] = [];
    const includedEntities: DashboardGenerationEntityRef[] = [];
    const inventory = preparedInventory ?? prepareInventory(context, options);
    const config = createGeneratedConfig(
        options.targetDashboardId,
        'Maintenance',
        options,
        'Generated maintenance dashboard',
    );
    const maintenanceTab = createGeneratedTab(
        'Maintenance',
        'build',
        options,
        'Generated maintenance tab',
        'maintenance',
        'maintenance',
    );
    const placer = createPlacer();

    addTitle(
        maintenanceTab,
        placer,
        'Maintenance',
        'Generated from Home Assistant health and attention signals',
        options,
        'maintenance',
        'maintenance',
    );

    const unavailableEntities = queryEntities(context, inventory, {
        states: ['unavailable', 'unknown'],
        includeDiagnostic: true,
        sort: 'domain',
        limit: 18,
    });
    const lowBatteryEntities = filterLowBattery(
        queryEntities(context, inventory, {
            domains: ['sensor', 'binary_sensor'],
            deviceClasses: ['battery'],
            includeDiagnostic: true,
            sort: 'state',
            limit: 18,
        }),
        25,
    );
    const updateEntities = queryEntities(context, inventory, {
        domains: ['update'],
        states: ['on'],
        sort: 'name',
        limit: 18,
    });
    const alertEntities = queryEntities(context, inventory, {
        domains: ['binary_sensor'],
        deviceClasses: ['problem', 'safety', 'smoke', 'moisture', 'gas', 'tamper'],
        states: ['on'],
        includeDiagnostic: true,
        sort: 'domain',
        limit: 18,
    });

    const maintenanceCandidates = uniqueResolvedEntities(
        unavailableEntities,
        lowBatteryEntities,
        updateEntities,
        alertEntities,
    );

    if (maintenanceCandidates.length > 0) {
        addTitle(
            maintenanceTab,
            placer,
            'Attention',
            'Unavailable entities, updates, low batteries, and active alerts',
            options,
            'maintenance',
            'maintenance',
        );
    }

    addMaintenanceCollection(maintenanceTab, placer, options, includedEntities, {
        name: 'Unavailable',
        icon: 'link_off',
        entities: unavailableEntities,
        query: {
            states: ['unavailable', 'unknown'],
            includeDiagnostic: true,
            limit: 18,
            sort: 'domain',
        },
        reason: 'Unavailable or unknown Home Assistant entities',
    });
    addMaintenanceCollection(maintenanceTab, placer, options, includedEntities, {
        name: 'Low Batteries',
        icon: 'battery_alert',
        entities: lowBatteryEntities,
        threshold: 25,
        query: {
            domains: ['sensor', 'binary_sensor'],
            deviceClasses: ['battery'],
            includeDiagnostic: true,
            limit: 18,
            sort: 'state',
        },
        reason: 'Battery sensors below threshold',
    });
    addMaintenanceCollection(maintenanceTab, placer, options, includedEntities, {
        name: 'Updates',
        icon: 'system_update_alt',
        entities: updateEntities,
        query: {
            domains: ['update'],
            states: ['on'],
            limit: 18,
            sort: 'name',
        },
        reason: 'Available Home Assistant update entities',
    });
    addMaintenanceCollection(maintenanceTab, placer, options, includedEntities, {
        name: 'Active Alerts',
        icon: 'warning',
        entities: alertEntities,
        query: {
            domains: ['binary_sensor'],
            deviceClasses: ['problem', 'safety', 'smoke', 'moisture', 'gas', 'tamper'],
            states: ['on'],
            includeDiagnostic: true,
            limit: 18,
            sort: 'domain',
        },
        reason: 'Active binary sensor alerts',
    });

    if (maintenanceCandidates.length === 0) {
        warnings.push('No current maintenance issues were found in the Home Assistant inventory.');
    }

    addForcedIncludeEntities(maintenanceTab, placer, inventory, options, includedEntities, {
        sourceType: 'maintenance',
        sourceId: 'maintenance',
    });

    config.tabs = [maintenanceTab];
    config.activeTabId = maintenanceTab.id;
    const skippedEntities = buildSkippedEntitiesFromResolved(
        maintenanceCandidates,
        includedEntities,
        'No v1 maintenance generator card selected for this entity',
    );
    const explainedIncludedEntities = enrichEntityRefs(includedEntities, inventory);
    const explainedSkippedEntities = enrichEntityRefs(skippedEntities, inventory);
    const qualityHints = buildQualityHints(inventory, explainedIncludedEntities, explainedSkippedEntities);

    return {
        config,
        summary: applyResultSummary(config, 'maintenance', 'Maintenance', explainedIncludedEntities, explainedSkippedEntities),
        includedEntities: explainedIncludedEntities,
        skippedEntities: explainedSkippedEntities,
        qualityHints,
        warnings,
    };
}

function generateRoomDashboard(
    context: InventoryContext,
    options: DashboardGenerationOptions,
    preparedInventory?: PreparedInventory,
): DashboardGenerationResult {
    const warnings: string[] = [];
    const includedEntities: DashboardGenerationEntityRef[] = [];
    const localQualityHints: DashboardGenerationQualityHint[] = [];
    const inventory = preparedInventory ?? prepareInventory(context, options);
    const fallbackAreaId = context.areas?.[0]?.area_id;
    const areaId = options.areaId ?? fallbackAreaId ?? '';
    const areaName = getAreaName(context, areaId);
    const config = createGeneratedConfig(
        options.targetDashboardId,
        areaName,
        options,
        `Generated dashboard for ${areaName}`,
    );
    const roomTab = createGeneratedTab('Room', 'meeting_room', options, `Generated room controls tab for ${areaName}`, 'area', areaId);
    const statisticsTab = createGeneratedTab('Statistics', 'monitoring', options, `Generated room statistics tab for ${areaName}`, 'area', areaId);
    const mediaTab = createGeneratedTab('Media', 'play_circle', options, `Generated room media tab for ${areaName}`, 'area', areaId);
    const maintenanceTab = createGeneratedTab('Maintenance', 'build', options, `Generated room maintenance tab for ${areaName}`, 'area', areaId);
    const roomPlacer = createPlacer();
    const statisticsPlacer = createPlacer();
    const mediaPlacer = createPlacer();
    const maintenancePlacer = createPlacer();

    if (!areaId) {
        warnings.push('No Home Assistant area was available for a room dashboard.');
    }

    const areaQuery = { areaIds: areaId ? [areaId] : undefined, limit: 100 };
    const visibleAreaEntities = queryEntities(context, inventory, areaQuery);
    const inferredAreaWarning = summarizeNameInferredAreas(visibleAreaEntities, areaName);
    if (inferredAreaWarning) {
        warnings.push(inferredAreaWarning);
    }

    const roomAttentionEntities = addAttentionSection(
        maintenanceTab,
        maintenancePlacer,
        inventory,
        options,
        includedEntities,
        [
            {
                mode: 'security',
                name: 'Security Alerts',
                icon: 'shield_alert',
                query: { areaIds: areaId ? [areaId] : undefined, limit: 6 },
                reason: `${areaName} security and safety entities needing attention`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'area',
                sourceId: areaId,
            },
            {
                mode: 'openings',
                name: 'Openings',
                icon: 'sensor_door',
                query: { areaIds: areaId ? [areaId] : undefined, limit: 6 },
                reason: `${areaName} open doors, windows, covers, and unlocked locks`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'area',
                sourceId: areaId,
            },
            {
                mode: 'motion',
                name: 'Motion & Presence',
                icon: 'motion_sensor_active',
                query: { areaIds: areaId ? [areaId] : undefined, limit: 6 },
                reason: `${areaName} active motion, occupancy, and presence entities`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'area',
                sourceId: areaId,
            },
            {
                mode: 'media_playing',
                name: 'Media Playing',
                icon: 'play_circle',
                query: { areaIds: areaId ? [areaId] : undefined, limit: 4 },
                reason: `${areaName} media players currently playing or paused`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'area',
                sourceId: areaId,
            },
            {
                mode: 'low_battery',
                name: 'Low Batteries',
                icon: 'battery_alert',
                threshold: 25,
                query: { areaIds: areaId ? [areaId] : undefined, limit: 6 },
                reason: `${areaName} battery sensors below threshold`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'area',
                sourceId: areaId,
            },
            {
                mode: 'updates',
                name: 'Updates',
                icon: 'system_update_alt',
                query: { areaIds: areaId ? [areaId] : undefined, limit: 6 },
                reason: `${areaName} available updates`,
                presentation: 'summary',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                sourceType: 'area',
                sourceId: areaId,
            },
        ],
        'Attention',
        'Current activity and room issues',
    );
    const roomAttentionEntityIds = new Set(roomAttentionEntities.map((entity) => entity.entityId));

    const rawComfortEntities = queryEntities(context, inventory, {
        ...areaQuery,
        domains: ['light', 'switch', 'fan', 'cover', 'climate'],
    }).filter(isUsableGeneratedEntity);
    const groupedComfort = suppressHaLightGroupMembers(rawComfortEntities, inventory, areaId);
    const comfortEntities = sortEntitiesByImportance(groupedComfort.entities, areaId);
    for (const suppression of groupedComfort.suppressions) {
        const hint = createQualityHintFromIds(
            'used_ha_group',
            'info',
            `Using Home Assistant light group "${suppression.group.name}" instead of ${suppression.members.length} member ${suppression.members.length === 1 ? 'light' : 'lights'}.`,
            [suppression.group.entityId, ...suppression.members.map((member) => member.entityId)],
            'Manage group membership in Home Assistant if this grouping is not right.',
        );
        if (hint) localQualityHints.push(hint);
    }
    const primaryControlEntities = comfortEntities
        .filter(isPrimaryRoomControlEntity)
        .slice(0, 6);
    if (primaryControlEntities.length > 0) {
        addTitle(roomTab, roomPlacer, 'Primary Controls', 'Most useful room controls', options, 'area', areaId);
    }

    let largeControlCount = 0;
    for (const entity of primaryControlEntities) {
        const useLargeCard = largeControlCount < 1;
        if (useLargeCard) largeControlCount += 1;
        addCard(
            roomTab,
            roomPlacer,
            {
                cardType: 'button',
                name: entity.name,
                entityId: entity.entityId,
                icon: entity.domain === 'light' ? 'lightbulb' : entity.domain === 'fan' ? 'mode_fan' : 'toggle_on',
                domainFilter: entity.domain,
                desktopSpan: useLargeCard ? 4 : 2,
                mobileSpan: 2,
                rowSpan: useLargeCard ? 2 : 1,
                options: { button: { display: useLargeCard ? 'tile' : 'compact', control: 'auto', showState: true, stateColor: true } },
                color: getEntityAccent(entity),
                reason: `${areaName} ${entity.domain} control`,
                sourceType: 'area',
                sourceId: areaId,
            },
            options,
            includedEntities,
        );
    }

    const comfortStateSensors = sortEntitiesByImportance(queryEntities(context, inventory, {
        ...areaQuery,
        domains: ['sensor'],
        deviceClasses: [...COMFORT_STATE_DEVICE_CLASSES],
        limit: 8,
    }).filter((entity) => isUsableGeneratedEntity(entity) && isValidNumericSensor(entity)), areaId).slice(0, 4);
    const comfortStateSensorIds = new Set(comfortStateSensors.map((entity) => entity.entityId));
    const climate = comfortEntities.find((entity) => entity.domain === 'climate');
    const specialistEntities = comfortEntities.filter((entity) => ['cover', 'fan'].includes(entity.domain)).slice(0, 2);
    if (climate || specialistEntities.length > 0) {
        addTitle(roomTab, roomPlacer, 'Comfort', 'Climate, covers, and airflow', options, 'area', areaId);
    }

    if (climate) {
        addCard(
            roomTab,
            roomPlacer,
            {
                cardType: 'thermostat',
                name: climate.name,
                entityId: climate.entityId,
                icon: 'device_thermostat',
                domainFilter: 'climate',
                desktopSpan: 4,
                mobileSpan: 4,
                rowSpan: 2,
                color: getEntityAccent(climate),
                reason: `${areaName} climate entity`,
                sourceType: 'area',
                sourceId: areaId,
            },
            options,
            includedEntities,
        );
    }

    for (const specialist of specialistEntities) {
        const preset = specialist.domain === 'cover' ? 'cover' : 'fan';
        addCard(
            roomTab,
            roomPlacer,
            {
                cardType: 'device_panel',
                name: specialist.name,
                entityId: specialist.entityId,
                icon: specialist.domain === 'cover' ? 'blinds' : 'mode_fan',
                desktopSpan: 4,
                mobileSpan: 4,
                rowSpan: 2,
                color: getEntityAccent(specialist),
                options: {
                    device_panel: buildSmartDevicePanelOptions(inventory.index, {
                        source: 'manual',
                        preset,
                        entityId: specialist.entityId,
                    }),
                },
                reason: `${areaName} ${specialist.domain} device panel`,
                sourceType: 'area',
                sourceId: areaId,
            },
            options,
            includedEntities,
        );
    }

    if (comfortStateSensors.length > 0) {
        addTitle(statisticsTab, statisticsPlacer, 'Readings', 'Temperature, humidity, air quality, and light levels', options, 'area', areaId);
    }

    for (const sensor of comfortStateSensors) {
        addCard(
            statisticsTab,
            statisticsPlacer,
            {
                cardType: 'button',
                name: sensor.name,
                entityId: sensor.entityId,
                icon: getEntityTypeIcon(sensor.domain, sensor.deviceClass),
                domainFilter: 'sensor',
                desktopSpan: 3,
                mobileSpan: 2,
                rowSpan: 1,
                color: getEntityAccent(sensor),
                options: { button: { display: 'compact', control: 'none', showState: true, stateColor: false } },
                reason: `${areaName} ${sensor.deviceClass ?? 'sensor'} reading`,
                sourceType: 'area',
                sourceId: areaId,
            },
            options,
            includedEntities,
        );
    }

    const mediaPlayers = dedupeGeneratedMediaPlayers(sortEntitiesByImportance(queryEntities(context, inventory, {
        ...areaQuery,
        domains: ['media_player'],
    }).filter(isUsableGeneratedEntity), areaId), areaName, localQualityHints);
    const remoteCandidates = sortEntitiesByImportance(queryEntities(context, inventory, {
        ...areaQuery,
        domains: ['remote'],
        limit: 8,
    }).filter(isUsableGeneratedEntity), areaId).filter(
        (entity) => entity.domain === 'remote' && isTvLikeMediaEntity(entity),
    );
    if (mediaPlayers.length > 0 || remoteCandidates.length > 0) {
        addTitle(mediaTab, mediaPlacer, 'Media', 'Available players and remote controls', options, 'area', areaId);
    }
    for (const mediaPlayer of mediaPlayers) {
        addCard(
            mediaTab,
            mediaPlacer,
            {
                cardType: 'media',
                name: mediaPlayer.name,
                entityId: mediaPlayer.entityId,
                icon: 'play_circle',
                domainFilter: 'media_player',
                desktopSpan: 4,
                mobileSpan: 4,
                color: getEntityAccent(mediaPlayer),
                reason: `${areaName} media player`,
                sourceType: 'area',
                sourceId: areaId,
            },
            options,
            includedEntities,
        );
    }
    const remoteCapableMediaPlayer = mediaPlayers.find(
        (entity) => entity.domain === 'media_player' && isTvLikeMediaEntity(entity),
    );
    const duplicateRemoteMatch = remoteCandidates
        .map((remote) => ({
            remote,
            mediaPlayer: mediaPlayers.find((mediaPlayer) => remoteControlsSameMediaPlayer(remote, mediaPlayer)),
        }))
        .find((match): match is { remote: ResolvedEntity; mediaPlayer: ResolvedEntity } => Boolean(match.mediaPlayer));
    const duplicateRemote = duplicateRemoteMatch?.remote;
    if (duplicateRemote) {
        const hint = createQualityHintFromIds(
            'duplicate_remote',
            'info',
            `Skipped "${duplicateRemote.name}" because "${duplicateRemoteMatch.mediaPlayer.name}" already has a media card.`,
            [duplicateRemote.entityId, duplicateRemoteMatch.mediaPlayer.entityId],
            'Add the remote manually if you want separate remote controls for this room.',
        );
        if (hint) localQualityHints.push(hint);
    }
    const roomRemote = remoteCandidates.find(
        (entity) => !mediaPlayers.some((mediaPlayer) => remoteControlsSameMediaPlayer(entity, mediaPlayer)),
    );
    if (roomRemote && (mediaPlayers.length === 0 || remoteCapableMediaPlayer || isTvLikeMediaEntity(roomRemote))) {
        const remoteOptions = {
            source: 'manual' as const,
            preset: 'tv' as const,
            remoteEntityId: roomRemote.entityId,
        };
        addCard(
            mediaTab,
            mediaPlacer,
            {
                cardType: 'remote',
                name: `${roomRemote.name} Remote`,
                subtitle: `Controls ${roomRemote.name}`,
                entityId: remoteOptions.remoteEntityId ?? roomRemote.entityId,
                icon: 'settings_remote',
                desktopSpan: 4,
                mobileSpan: 4,
                rowSpan: 2,
                color: getEntityAccent(roomRemote),
                options: { remote: remoteOptions },
                reason: `${areaName} room remote controls`,
                sourceType: 'area',
                sourceId: areaId,
            },
            options,
            includedEntities,
            [remoteOptions.remoteEntityId].filter(Boolean) as string[],
        );
    }

    const informationalStatusSwitches = sortEntitiesByImportance(queryEntities(context, inventory, {
        ...areaQuery,
        domains: ['switch'],
        limit: 12,
    }).filter((entity) => isUsableGeneratedEntity(entity) && isInformationalSwitchEntity(entity)), areaId);

    const statusEntities = sortEntitiesByImportance(uniqueResolvedEntities(queryEntities(context, inventory, {
        ...areaQuery,
        domains: ['sensor', 'binary_sensor', 'lock', 'alarm_control_panel'],
        limit: 18,
    }), informationalStatusSwitches), areaId)
        .filter(isUsableGeneratedEntity)
        .filter((entity) => !roomAttentionEntityIds.has(entity.entityId))
        .filter((entity) => !comfortStateSensorIds.has(entity.entityId))
        .filter((entity) => isUsefulStatusEntity(entity));
    const roomStatusEntities = statusEntities.filter(isRoomStatusEntity).slice(0, 8);
    const roomStatusEntityIds = new Set(roomStatusEntities.map((entity) => entity.entityId));
    if (roomStatusEntities.length > 0) {
        addTitle(maintenanceTab, maintenancePlacer, 'Openings & Security', 'Doors, locks, presence, and safety sensors', options, 'area', areaId);
        addCard(
            maintenanceTab,
            maintenancePlacer,
            {
                cardType: 'collection',
                name: 'Room Status',
                icon: 'sensor_door',
                desktopSpan: 4,
                mobileSpan: 4,
                rowSpan: 3,
                color: roomStatusEntities.some((entity) => PROBLEM_STATES.has(entity.state)) ? ACCENT_ERROR : ACCENT_TERTIARY,
                options: {
                    collection: {
                        source: 'manual',
                        mode: 'custom',
                        showState: true,
                        presentation: 'list',
                        entityIds: roomStatusEntities.map((entity) => entity.entityId),
                    },
                },
                reason: `${areaName} room opening, security, and presence status`,
                sourceType: 'area',
                sourceId: areaId,
            },
            options,
            includedEntities,
            roomStatusEntities.map((entity) => entity.entityId),
        );
    }

    const sensorEntities = statusEntities.filter((entity) => !roomStatusEntityIds.has(entity.entityId));
    if (sensorEntities.length > 0) {
        addTitle(statisticsTab, statisticsPlacer, 'Sensors & History', 'Key measurements and room sensor states', options, 'area', areaId);
        const graphEntities = sensorEntities
            .filter((entity) => isValidNumericSensor(entity) && GRAPH_DEVICE_CLASSES.has(entity.deviceClass ?? ''))
            .slice(0, 2);
        const graphedEntityIds = new Set<string>();
        for (const sensor of graphEntities) {
            graphedEntityIds.add(sensor.entityId);
            addCard(
                statisticsTab,
                statisticsPlacer,
                {
                    cardType: 'graph',
                    name: sensor.name,
                    entityId: sensor.entityId,
                    icon: getEntityTypeIcon(sensor.domain, sensor.deviceClass),
                    desktopSpan: 6,
                    mobileSpan: 4,
                    rowSpan: 2,
                    color: getEntityAccent(sensor),
                    hours_to_show: 12,
                    aggregate_func: 'avg',
                    reason: `${areaName} ${sensor.deviceClass ?? 'sensor'} history`,
                    sourceType: 'area',
                    sourceId: areaId,
                },
                options,
                includedEntities,
            );
        }
        const collectionEntities = sensorEntities.filter((entity) => !graphedEntityIds.has(entity.entityId));
        if (collectionEntities.length > 0) {
            addCard(
                statisticsTab,
                statisticsPlacer,
                {
                    cardType: 'collection',
                    name: 'Room Sensors',
                    icon: 'sensors',
                    desktopSpan: 4,
                    mobileSpan: 4,
                    rowSpan: 3,
                    color: ACCENT_SECONDARY,
                    options: {
                        collection: {
                            source: 'manual',
                            mode: 'custom',
                            showState: true,
                            presentation: 'list',
                            entityIds: collectionEntities.map((entity) => entity.entityId),
                        },
                    },
                    reason: `${areaName} room sensor collection`,
                    sourceType: 'area',
                    sourceId: areaId,
                },
                options,
                includedEntities,
                collectionEntities.map((entity) => entity.entityId),
            );
        }
    }

    const actionEntities = queryEntities(context, inventory, {
        ...areaQuery,
        domains: ['button', 'scene', 'script'],
        limit: 6,
    }).filter((entity) => entity.state !== 'unavailable');
    if (actionEntities.length > 0) {
        addTitle(roomTab, roomPlacer, 'Actions', 'Scenes, scripts, and helper actions', options, 'area', areaId);
        for (const entity of actionEntities) {
            addCard(
                roomTab,
                roomPlacer,
                {
                    cardType: 'button',
                    name: entity.name,
                    entityId: entity.entityId,
                    icon: entity.domain === 'scene' ? 'scene' : entity.domain === 'script' ? 'play_arrow' : 'smart_button',
                    domainFilter: entity.domain,
                    desktopSpan: 3,
                    mobileSpan: 2,
                    rowSpan: 1,
                    color: getEntityAccent(entity),
                    options: { button: { display: 'compact', control: 'button', showState: true, stateColor: false } },
                    reason: `${areaName} ${entity.domain} action`,
                    sourceType: 'area',
                    sourceId: areaId,
                },
                options,
                includedEntities,
            );
        }
    }

    addForcedIncludeEntities(maintenanceTab, maintenancePlacer, inventory, options, includedEntities, {
        areaId,
        sourceType: 'area',
        sourceId: areaId,
    });

    if (roomTab.items.length <= 1) {
        warnings.push(`${areaName} has no useful visible entities for the v1 room recipe.`);
    }

    setGeneratedTabs(config, [roomTab, statisticsTab, mediaTab, maintenanceTab], roomTab, options, {
        name: `${areaName} Sections`,
        icon: 'tab',
        reason: `Generated nested room tab surface for ${areaName}`,
        sourceType: 'area',
        sourceId: areaId,
    });
    const skippedEntities = buildSkippedEntities(inventory, includedEntities, areaId);
    const explainedIncludedEntities = enrichEntityRefs(includedEntities, inventory, areaId);
    const explainedSkippedEntities = enrichEntityRefs(skippedEntities, inventory, areaId);
    const qualityHints = mergeQualityHints(
        buildQualityHints(inventory, explainedIncludedEntities, explainedSkippedEntities, { areaId }),
        buildRoomNameReviewHints(inventory, areaName, areaId),
        localQualityHints,
    );

    return {
        config,
        summary: applyResultSummary(config, 'room', areaName, explainedIncludedEntities, explainedSkippedEntities),
        includedEntities: explainedIncludedEntities,
        skippedEntities: explainedSkippedEntities,
        qualityHints,
        warnings,
    };
}

export function generateDashboard(
    context: InventoryContext,
    options: DashboardGenerationOptions,
): DashboardGenerationResult {
    const normalizedRecipe = normalizeRecipe(options.recipe);
    const normalizedOptions = { ...options, recipe: normalizedRecipe };

    if (normalizedRecipe === 'room') {
        return generateRoomDashboard(context, normalizedOptions);
    }

    if (normalizedRecipe === 'floor') {
        return generateFloorDashboard(context, normalizedOptions);
    }

    if (normalizedRecipe === 'entity_type') {
        return generateEntityTypeDashboard(context, normalizedOptions);
    }

    if (normalizedRecipe === 'label') {
        return generateLabelDashboard(context, normalizedOptions);
    }

    if (normalizedRecipe === 'maintenance') {
        return generateMaintenanceDashboard(context, normalizedOptions);
    }

    return generateHouseDashboard(context, normalizedOptions);
}
