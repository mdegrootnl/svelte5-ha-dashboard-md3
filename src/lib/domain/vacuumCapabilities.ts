import type { InventoryIndex, ResolvedEntity } from "$lib/domain/haInventory";
import type { HAEntity } from "$lib/types";

export const VACUUM_FEATURE = {
    TURN_ON: 1,
    TURN_OFF: 2,
    PAUSE: 4,
    STOP: 8,
    RETURN_HOME: 16,
    FAN_SPEED: 32,
    SEND_COMMAND: 256,
    LOCATE: 512,
    CLEAN_SPOT: 1024,
    MAP: 2048,
    STATE: 4096,
    START: 8192,
    CLEAN_AREA: 16384,
} as const;

export type VacuumDisplayState =
    | "cleaning"
    | "returning"
    | "paused"
    | "docked"
    | "charging"
    | "idle"
    | "error"
    | "offline";

export interface VacuumCapabilities {
    supportedFeatures: number;
    canStart: boolean;
    canPause: boolean;
    canStop: boolean;
    canReturnHome: boolean;
    canSetFanSpeed: boolean;
    canLocate: boolean;
    canCleanSpot: boolean;
    canCleanArea: boolean;
    fanSpeeds: string[];
    currentFanSpeed?: string;
}

export interface VacuumRelatedEntities {
    battery?: ResolvedEntity;
    cleaningArea?: ResolvedEntity;
    cleaningTime?: ResolvedEntity;
    chargingState?: ResolvedEntity;
    docked?: ResolvedEntity;
    mapCamera?: ResolvedEntity;
    firmware?: ResolvedEntity;
}

export interface VacuumStateSummary {
    state: VacuumDisplayState;
    labelKey: string;
    active: boolean;
    docked: boolean;
    issue: boolean;
    offline: boolean;
}

export function hasVacuumFeature(entity: HAEntity | null | undefined, feature: number) {
    const supportedFeatures = Number(entity?.attributes?.supported_features ?? 0);
    return Number.isFinite(supportedFeatures) && (supportedFeatures & feature) === feature;
}

export function resolveVacuumCapabilities(entity: HAEntity | null | undefined): VacuumCapabilities {
    const rawSupportedFeatures = entity?.attributes?.supported_features;
    const hasExplicitFeatures = typeof rawSupportedFeatures === "number" && Number.isFinite(rawSupportedFeatures);
    const supportedFeatures = Number(rawSupportedFeatures ?? 0);
    const fanSpeeds = Array.isArray(entity?.attributes?.fan_speed_list)
        ? entity.attributes.fan_speed_list.filter((speed): speed is string => typeof speed === "string" && speed.trim().length > 0)
        : [];
    const currentFanSpeed = typeof entity?.attributes?.fan_speed === "string"
        ? entity.attributes.fan_speed
        : undefined;

    return {
        supportedFeatures: Number.isFinite(supportedFeatures) ? supportedFeatures : 0,
        canStart: !hasExplicitFeatures || hasVacuumFeature(entity, VACUUM_FEATURE.START),
        canPause: !hasExplicitFeatures || hasVacuumFeature(entity, VACUUM_FEATURE.PAUSE),
        canStop: !hasExplicitFeatures || hasVacuumFeature(entity, VACUUM_FEATURE.STOP),
        canReturnHome: !hasExplicitFeatures || hasVacuumFeature(entity, VACUUM_FEATURE.RETURN_HOME),
        canSetFanSpeed: hasVacuumFeature(entity, VACUUM_FEATURE.FAN_SPEED) || fanSpeeds.length > 0,
        canLocate: hasVacuumFeature(entity, VACUUM_FEATURE.LOCATE),
        canCleanSpot: hasVacuumFeature(entity, VACUUM_FEATURE.CLEAN_SPOT),
        canCleanArea: hasVacuumFeature(entity, VACUUM_FEATURE.CLEAN_AREA),
        fanSpeeds,
        currentFanSpeed,
    };
}

export function resolveVacuumState(
    entity: HAEntity | null | undefined,
    related: VacuumRelatedEntities = {},
    states: Record<string, HAEntity> = {},
): VacuumStateSummary {
    const rawState = (entity?.state ?? "").toLowerCase();
    const chargingState = related.chargingState ? states[related.chargingState.entityId]?.state?.toLowerCase() : "";
    const dockedState = related.docked ? states[related.docked.entityId]?.state?.toLowerCase() : "";
    const isDockedByRelated = dockedState === "on" || dockedState === "docked" || chargingState === "charging" || chargingState === "fully_charged";

    if (!entity || rawState === "unavailable" || rawState === "unknown") {
        return stateSummary("offline");
    }

    if (rawState === "error") return stateSummary("error");
    if (rawState === "returning") return stateSummary("returning");
    if (rawState === "paused") return stateSummary("paused");
    if (rawState === "cleaning") return stateSummary("cleaning");
    if (rawState === "docked") {
        return chargingState === "charging" ? stateSummary("charging") : stateSummary("docked");
    }
    if (rawState === "idle" || rawState === "standby") {
        if (chargingState === "charging") return stateSummary("charging");
        if (isDockedByRelated) return stateSummary("docked");
        return stateSummary("idle");
    }

    if (chargingState === "charging") return stateSummary("charging");
    if (isDockedByRelated) return stateSummary("docked");
    return stateSummary("idle");
}

function stateSummary(state: VacuumDisplayState): VacuumStateSummary {
    return {
        state,
        labelKey: `vacuumCard.status.${state}`,
        active: state === "cleaning" || state === "returning",
        docked: state === "docked" || state === "charging",
        issue: state === "error",
        offline: state === "offline",
    };
}

export function findVacuumRelatedEntities(
    vacuum: ResolvedEntity,
    index: InventoryIndex,
    states: Record<string, HAEntity>,
): VacuumRelatedEntities {
    if (!vacuum.deviceId) return {};

    const candidates = index.resolvedEntities
        .filter((entity) => entity.deviceId === vacuum.deviceId && entity.entityId !== vacuum.entityId)
        .filter((entity) => !entity.hidden);

    return {
        battery: findCandidate(candidates, index, states, (entity, haystack) =>
            entity.domain === "sensor" && (entity.deviceClass === "battery" || haystack.includes("battery")),
        ),
        cleaningArea: findCandidate(candidates, index, states, (entity, haystack) =>
            entity.domain === "sensor" && (
                haystack.includes("cleaning_area") ||
                haystack.includes("cleaning area") ||
                haystack.includes("cleaned_area") ||
                haystack.includes("cleaned area") ||
                (haystack.includes("area") && unitFor(entity, states).includes("m"))
            ),
        ),
        cleaningTime: findCandidate(candidates, index, states, (entity, haystack) =>
            entity.domain === "sensor" && (
                haystack.includes("cleaning_time") ||
                haystack.includes("cleaning time") ||
                haystack.includes("clean duration") ||
                entity.deviceClass === "duration"
            ),
        ),
        chargingState: findCandidate(candidates, index, states, (entity, haystack) =>
            entity.domain === "sensor" && (
                haystack.includes("charging_state") ||
                haystack.includes("charging state") ||
                haystack.includes("charge state")
            ),
        ),
        docked: findCandidate(candidates, index, states, (entity, haystack) =>
            entity.domain === "binary_sensor" && (
                haystack.includes("docked") ||
                haystack.includes("on dock") ||
                haystack.includes("dock")
            ),
        ),
        mapCamera: findCandidate(candidates, index, states, (entity, haystack) =>
            entity.domain === "camera" && haystack.includes("map"),
        ),
        firmware: findCandidate(candidates, index, states, (entity, haystack) =>
            entity.domain === "sensor" && (
                entity.diagnostic ||
                haystack.includes("firmware") ||
                haystack.includes("sw_version") ||
                haystack.includes("software")
            ),
        ),
    };
}

function findCandidate(
    candidates: ResolvedEntity[],
    index: InventoryIndex,
    states: Record<string, HAEntity>,
    predicate: (entity: ResolvedEntity, haystack: string) => boolean,
) {
    return candidates.find((entity) => predicate(entity, entityHaystack(entity, index, states)));
}

function entityHaystack(entity: ResolvedEntity, index: InventoryIndex, states: Record<string, HAEntity>) {
    const registry = index.registryById.get(entity.entityId);
    const live = states[entity.entityId];
    return [
        entity.entityId,
        entity.name,
        entity.domain,
        entity.deviceClass,
        entity.unit,
        registry?.name,
        registry?.original_name,
        registry?.translation_key,
        registry?.unique_id,
        live?.attributes?.friendly_name,
    ]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .join(" ")
        .toLowerCase();
}

function unitFor(entity: ResolvedEntity, states: Record<string, HAEntity>) {
    const liveUnit = states[entity.entityId]?.attributes?.unit_of_measurement;
    return `${entity.unit ?? ""} ${typeof liveUnit === "string" ? liveUnit : ""}`.toLowerCase();
}
