import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { HADeviceRegistryEntry, HAEntityRegistryEntry } from "$lib/types";

export type PresenceStatus = "home" | "away" | "zone" | "unknown";

export interface PresencePerson {
    id: string;
    entityId: string;
    name: string;
    state: string;
    status: PresenceStatus;
    sourceDomain: "person" | "device_tracker";
    zoneName?: string;
    picture?: string;
    lastChanged?: string;
}

export interface PresenceZone {
    id: string;
    name: string;
    occupants: PresencePerson[];
}

export interface PresenceEtaItem {
    id: string;
    entityId: string;
    title: string;
    value: string;
    unit?: string;
    lastChanged?: string;
}

export interface GuestModeStatus {
    entityId: string;
    name: string;
    enabled: boolean;
    state: string;
}

export type PresenceSetupHintType = "people" | "guestMode" | "eta";

export interface PresenceSetupHint {
    id: string;
    type: PresenceSetupHintType;
    suggestedEntityId: string;
}

export interface PresenceSummary {
    people: PresencePerson[];
    zones: PresenceZone[];
    etaItems: PresenceEtaItem[];
    guestMode?: GuestModeStatus;
    setupHints: PresenceSetupHint[];
    total: number;
    home: number;
    away: number;
    inZones: number;
    unknown: number;
    homeIsEmpty: boolean;
    hasTrackedPeople: boolean;
}

export interface PresenceInput {
    states: HassEntities;
    entityRegistry?: HAEntityRegistryEntry[];
    deviceRegistry?: HADeviceRegistryEntry[];
}

export interface PresenceOptions {
    etaLimit?: number;
}

interface ZoneInfo {
    id: string;
    name: string;
}

const AWAY_STATES = new Set(["not_home", "not home", "away"]);
const UNKNOWN_STATES = new Set(["unknown", "unavailable", "none"]);
const GUEST_TERMS = ["guest", "guests", "gasten", "logee", "logees", "visitor", "visitors", "bezoek"];
const ETA_STRONG_TERMS = [
    "arrival",
    "arrivee",
    "ankunft",
    "aankomst",
    "commute",
    "duration",
    "eta",
    "fahrzeit",
    "llegada",
    "naar huis",
    "route",
    "reistijd",
    "reisezeit",
    "temps de trajet",
    "tiempo de viaje",
    "thuiskomst",
    "trajet",
    "travel time",
    "traffic",
    "trafic",
    "trafico",
    "verkeer",
    "viaje",
    "waze",
];
const ETA_CONTEXT_TERMS = [
    "home",
    "huis",
    "thuis",
    "work",
    "werk",
    "office",
    "kantoor",
    "school",
    "station",
];
const ETA_UNITS = new Set([
    "h",
    "hr",
    "hrs",
    "hour",
    "hours",
    "m",
    "min",
    "mins",
    "minute",
    "minutes",
    "minuten",
    "km",
    "mi",
]);

function getDomain(entityId: string) {
    return entityId.split(".")[0] ?? "";
}

function entitySlug(entityId: string) {
    return entityId.split(".")[1] ?? entityId;
}

function normalizeKey(value: string | undefined) {
    return (value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function compactKey(value: string | undefined) {
    return normalizeKey(value).replace(/\s+/g, "");
}

function titleize(value: string) {
    return value
        .replaceAll("_", " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function getEntityName(entity: HassEntity, registry?: HAEntityRegistryEntry) {
    const friendlyName = entity.attributes?.friendly_name;
    if (typeof friendlyName === "string" && friendlyName.trim()) return friendlyName.trim();
    if (registry?.name) return registry.name;
    if (registry?.original_name) return registry.original_name;
    return entity.entity_id;
}

function isHiddenOrDisabled(registry?: HAEntityRegistryEntry) {
    return Boolean(registry?.hidden_by || registry?.disabled_by);
}

function isDiagnostic(registry?: HAEntityRegistryEntry) {
    return registry?.entity_category === "diagnostic";
}

function isUsableState(state: string | undefined) {
    const normalized = normalizeKey(state);
    return Boolean(normalized) && !UNKNOWN_STATES.has(normalized);
}

function stateToStatus(state: string): PresenceStatus {
    const normalized = normalizeKey(state);
    if (normalized === "home") return "home";
    if (AWAY_STATES.has(normalized)) return "away";
    if (!isUsableState(state)) return "unknown";
    return "zone";
}

function getPicture(entity: HassEntity) {
    const picture = entity.attributes?.entity_picture;
    return typeof picture === "string" && picture.trim() ? picture.trim() : undefined;
}

function createMaps(input: PresenceInput) {
    const entityById = new Map((input.entityRegistry ?? []).map((entity) => [entity.entity_id, entity]));
    const deviceById = new Map((input.deviceRegistry ?? []).map((device) => [device.id, device]));
    return { entityById, deviceById };
}

function buildZoneLookup(states: HassEntities) {
    const zones = new Map<string, ZoneInfo>();

    for (const entity of Object.values(states)) {
        if (getDomain(entity.entity_id) !== "zone") continue;
        const id = entitySlug(entity.entity_id);
        const name = getEntityName(entity);
        const info = { id, name };
        zones.set(compactKey(id), info);
        zones.set(compactKey(name), info);
    }

    return zones;
}

function resolveZoneName(state: string, zones: Map<string, ZoneInfo>) {
    const normalized = compactKey(state);
    return zones.get(normalized)?.name ?? titleize(state);
}

function entityMatchesTerms(entity: HassEntity, registry: HAEntityRegistryEntry | undefined, terms: string[]) {
    const haystack = normalizeKey([
        entity.entity_id,
        getEntityName(entity, registry),
        registry?.name,
        registry?.original_name,
    ].filter(Boolean).join(" "));
    return terms.some((term) => haystack.includes(normalizeKey(term)));
}

function entitySearchText(entity: HassEntity, registry?: HAEntityRegistryEntry) {
    return normalizeKey([
        entity.entity_id,
        getEntityName(entity, registry),
        registry?.name,
        registry?.original_name,
    ].filter(Boolean).join(" "));
}

function getUnit(entity: HassEntity) {
    const unit = entity.attributes?.unit_of_measurement;
    return typeof unit === "string" ? unit.trim() : "";
}

function etaCandidateScore(entity: HassEntity, registry?: HAEntityRegistryEntry) {
    const haystack = entitySearchText(entity, registry);
    const deviceClass = normalizeKey(
        typeof entity.attributes?.device_class === "string"
            ? entity.attributes.device_class
            : undefined,
    );
    const unit = normalizeKey(getUnit(entity));
    const hasStrongTerm = ETA_STRONG_TERMS.some((term) => haystack.includes(normalizeKey(term)));
    const hasContextTerm = ETA_CONTEXT_TERMS.some((term) => haystack.includes(normalizeKey(term)));
    const hasRouteUnit = ETA_UNITS.has(unit);
    const hasDurationDeviceClass = deviceClass === "duration";

    let score = 0;
    if (hasStrongTerm) score += 8;
    if (hasDurationDeviceClass) score += 6;
    if (hasContextTerm) score += 2;
    if (hasRouteUnit) score += 2;

    return score;
}

function makePerson(
    entity: HassEntity,
    registry: HAEntityRegistryEntry | undefined,
    zones: Map<string, ZoneInfo>,
): PresencePerson {
    const status = stateToStatus(entity.state);
    const zoneName = status === "zone" ? resolveZoneName(entity.state, zones) : undefined;
    const domain = getDomain(entity.entity_id);

    return {
        id: entity.entity_id,
        entityId: entity.entity_id,
        name: getEntityName(entity, registry),
        state: entity.state,
        status,
        sourceDomain: domain === "device_tracker" ? "device_tracker" : "person",
        zoneName,
        picture: getPicture(entity),
        lastChanged: entity.last_changed,
    };
}

function sortPeople(left: PresencePerson, right: PresencePerson) {
    const rank: Record<PresenceStatus, number> = {
        home: 0,
        zone: 1,
        away: 2,
        unknown: 3,
    };
    const statusDelta = rank[left.status] - rank[right.status];
    if (statusDelta) return statusDelta;
    return left.name.localeCompare(right.name);
}

function buildPeople(input: PresenceInput, zones: Map<string, ZoneInfo>) {
    const { entityById } = createMaps(input);
    const allEntities = Object.values(input.states);
    const personEntities = allEntities.filter((entity) => getDomain(entity.entity_id) === "person");
    const candidateDomain = personEntities.length > 0 ? "person" : "device_tracker";

    return allEntities
        .filter((entity) => getDomain(entity.entity_id) === candidateDomain)
        .filter((entity) => {
            const registry = entityById.get(entity.entity_id);
            if (isHiddenOrDisabled(registry)) return false;
            if (candidateDomain === "device_tracker" && isDiagnostic(registry)) return false;
            return true;
        })
        .map((entity) => makePerson(entity, entityById.get(entity.entity_id), zones))
        .sort(sortPeople);
}

function buildPresenceZones(people: PresencePerson[]): PresenceZone[] {
    const zonesById = new Map<string, PresenceZone>();

    for (const person of people) {
        if (person.status !== "home" && person.status !== "zone") continue;
        const id = person.status === "home" ? "home" : compactKey(person.zoneName ?? person.state);
        const name = person.status === "home" ? "Home" : person.zoneName ?? titleize(person.state);
        const zone = zonesById.get(id) ?? { id, name, occupants: [] };
        zone.occupants.push(person);
        zonesById.set(id, zone);
    }

    return [...zonesById.values()]
        .map((zone) => ({
            ...zone,
            occupants: [...zone.occupants].sort((left, right) => left.name.localeCompare(right.name)),
        }))
        .sort((left, right) => {
            if (left.id === "home") return -1;
            if (right.id === "home") return 1;
            return left.name.localeCompare(right.name);
        });
}

function findGuestMode(input: PresenceInput): GuestModeStatus | undefined {
    const { entityById } = createMaps(input);
    const candidates = Object.values(input.states)
        .filter((entity) => ["binary_sensor", "input_boolean", "switch"].includes(getDomain(entity.entity_id)))
        .filter((entity) => {
            const registry = entityById.get(entity.entity_id);
            if (isHiddenOrDisabled(registry)) return false;
            return entityMatchesTerms(entity, registry, GUEST_TERMS);
        })
        .sort((left, right) => {
            const leftExact = compactKey(left.entity_id).includes("guestmode") || compactKey(left.entity_id).includes("gastenmodus");
            const rightExact = compactKey(right.entity_id).includes("guestmode") || compactKey(right.entity_id).includes("gastenmodus");
            if (leftExact !== rightExact) return leftExact ? -1 : 1;
            return left.entity_id.localeCompare(right.entity_id);
        });

    const entity = candidates[0];
    if (!entity) return undefined;
    const registry = entityById.get(entity.entity_id);
    const state = normalizeKey(entity.state);

    return {
        entityId: entity.entity_id,
        name: getEntityName(entity, registry),
        enabled: ["on", "active", "enabled", "home"].includes(state),
        state: entity.state,
    };
}

function buildEtaItems(input: PresenceInput, limit: number): PresenceEtaItem[] {
    const { entityById } = createMaps(input);
    return Object.values(input.states)
        .filter((entity) => getDomain(entity.entity_id) === "sensor")
        .filter((entity) => isUsableState(entity.state))
        .filter((entity) => {
            const registry = entityById.get(entity.entity_id);
            if (isHiddenOrDisabled(registry)) return false;
            if (isDiagnostic(registry)) return false;
            return etaCandidateScore(entity, registry) >= 8;
        })
        .sort((left, right) => {
            const leftRegistry = entityById.get(left.entity_id);
            const rightRegistry = entityById.get(right.entity_id);
            const scoreDelta = etaCandidateScore(right, rightRegistry) - etaCandidateScore(left, leftRegistry);
            if (scoreDelta) return scoreDelta;
            return getEntityName(left, leftRegistry).localeCompare(getEntityName(right, rightRegistry));
        })
        .slice(0, limit)
        .map((entity) => {
            const unit = entity.attributes?.unit_of_measurement;
            const normalizedUnit = typeof unit === "string" ? unit : undefined;
            return {
                id: entity.entity_id,
                entityId: entity.entity_id,
                title: getEntityName(entity, entityById.get(entity.entity_id)),
                value: normalizedUnit ? `${entity.state} ${normalizedUnit}` : entity.state,
                unit: normalizedUnit,
                lastChanged: entity.last_changed,
            };
        });
}

function buildSetupHints(
    people: PresencePerson[],
    etaItems: PresenceEtaItem[],
    guestMode?: GuestModeStatus,
): PresenceSetupHint[] {
    const hints: PresenceSetupHint[] = [];

    if (people.length === 0) {
        hints.push({
            id: "presence-people",
            type: "people",
            suggestedEntityId: "person.*",
        });
    }

    if (!guestMode) {
        hints.push({
            id: "presence-guest-mode",
            type: "guestMode",
            suggestedEntityId: "input_boolean.gastenmodus",
        });
    }

    if (etaItems.length === 0) {
        hints.push({
            id: "presence-eta",
            type: "eta",
            suggestedEntityId: "sensor.reistijd_naar_huis",
        });
    }

    return hints;
}

export function buildPresenceSummary(
    input: PresenceInput,
    options: PresenceOptions = {},
): PresenceSummary {
    const zones = buildZoneLookup(input.states);
    const people = buildPeople(input, zones);
    const etaItems = buildEtaItems(input, options.etaLimit ?? 4);
    const guestMode = findGuestMode(input);
    const home = people.filter((person) => person.status === "home").length;
    const away = people.filter((person) => person.status === "away").length;
    const inZones = people.filter((person) => person.status === "zone").length;
    const unknown = people.filter((person) => person.status === "unknown").length;

    return {
        people,
        zones: buildPresenceZones(people),
        etaItems,
        guestMode,
        setupHints: buildSetupHints(people, etaItems, guestMode),
        total: people.length,
        home,
        away,
        inZones,
        unknown,
        homeIsEmpty: people.length > 0 && home === 0,
        hasTrackedPeople: people.length > 0,
    };
}
