import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { HADeviceRegistryEntry, HAEntityRegistryEntry } from "$lib/types";
import type { HAArea } from "$lib/types/dashboard";

export type AttentionCategory =
    | "security"
    | "maintenance"
    | "updates"
    | "activity"
    | "media"
    | "lights"
    | "setup";

export type AttentionSeverity = "critical" | "warning" | "info";
export type AttentionReason =
    | "alarm"
    | "alert"
    | "unavailable"
    | "lowBattery"
    | "updateAvailable"
    | "unlocked"
    | "open"
    | "motion"
    | "playing"
    | "paused"
    | "fanOn"
    | "on"
    | "needsRoom";

export interface AttentionItem {
    id: string;
    entityId: string;
    title: string;
    subtitle: string;
    category: AttentionCategory;
    severity: AttentionSeverity;
    reason: AttentionReason;
    icon: string;
    state: string;
    domain: string;
    deviceClass?: string;
    unit?: string;
    areaId?: string;
    areaName?: string;
    lastChanged?: string;
}

export interface AttentionSection {
    category: AttentionCategory;
    severity: AttentionSeverity;
    items: AttentionItem[];
}

export interface AttentionSummary {
    items: AttentionItem[];
    sections: AttentionSection[];
    total: number;
    critical: number;
    warning: number;
    info: number;
}

export interface AttentionInput {
    states: HassEntities;
    entityRegistry?: HAEntityRegistryEntry[];
    deviceRegistry?: HADeviceRegistryEntry[];
    areas?: HAArea[];
}

export interface AttentionOptions {
    batteryThreshold?: number;
    setupLimit?: number;
}

interface AttentionClassification {
    category: AttentionCategory;
    severity: AttentionSeverity;
    reason: AttentionReason;
    icon: string;
}

const OPENING_DEVICE_CLASSES = new Set(["door", "garage_door", "opening", "window"]);
const MOTION_DEVICE_CLASSES = new Set(["motion", "moving", "occupancy", "presence", "vibration"]);
const SAFETY_DEVICE_CLASSES = new Set([
    "carbon_monoxide",
    "gas",
    "moisture",
    "problem",
    "safety",
    "smoke",
    "tamper",
]);
const BAD_STATES = new Set(["unavailable", "unknown"]);

const CATEGORY_ORDER: AttentionCategory[] = [
    "security",
    "maintenance",
    "updates",
    "activity",
    "media",
    "lights",
    "setup",
];

const SEVERITY_RANK: Record<AttentionSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
};

function getDomain(entityId: string) {
    return entityId.split(".")[0] ?? "";
}

function getDeviceClass(entity: HassEntity) {
    const value = entity.attributes?.device_class;
    return typeof value === "string" ? value.toLowerCase() : undefined;
}

function getUnit(entity: HassEntity) {
    const value = entity.attributes?.unit_of_measurement;
    return typeof value === "string" ? value : undefined;
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

function createMaps(input: AttentionInput) {
    const entityById = new Map((input.entityRegistry ?? []).map((entity) => [entity.entity_id, entity]));
    const deviceById = new Map((input.deviceRegistry ?? []).map((device) => [device.id, device]));
    const areaById = new Map((input.areas ?? []).map((area) => [area.area_id, area]));
    return { entityById, deviceById, areaById };
}

function resolveAreaId(registry: HAEntityRegistryEntry | undefined, deviceById: Map<string, HADeviceRegistryEntry>) {
    if (registry?.area_id) return registry.area_id;
    if (registry?.device_id) return deviceById.get(registry.device_id)?.area_id ?? undefined;
    return undefined;
}

function subtitle(entity: HassEntity, areaName: string | undefined) {
    return [areaName, entity.entity_id].filter(Boolean).join(" - ");
}

function makeItem(
    entity: HassEntity,
    registry: HAEntityRegistryEntry | undefined,
    areaName: string | undefined,
    areaId: string | undefined,
    category: AttentionCategory,
    severity: AttentionSeverity,
    reason: AttentionReason,
    icon: string,
): AttentionItem {
    return {
        id: `${category}:${entity.entity_id}`,
        entityId: entity.entity_id,
        title: getEntityName(entity, registry),
        subtitle: subtitle(entity, areaName),
        category,
        severity,
        reason,
        icon,
        state: entity.state,
        domain: getDomain(entity.entity_id),
        deviceClass: getDeviceClass(entity),
        unit: getUnit(entity),
        areaId,
        areaName,
        lastChanged: entity.last_changed,
    };
}

function isActiveBinary(entity: HassEntity) {
    return getDomain(entity.entity_id) === "binary_sensor" && (entity.state === "on" || entity.state === "open");
}

function classifyEntity(entity: HassEntity, batteryThreshold: number): AttentionClassification | null {
    const domain = getDomain(entity.entity_id);
    const deviceClass = getDeviceClass(entity);
    const state = entity.state;

    if (domain === "alarm_control_panel" && ["triggered", "pending", "arming"].includes(state)) {
        return {
            category: "security" as const,
            severity: "critical" as const,
            reason: "alarm",
            icon: "security",
        };
    }

    if (domain === "binary_sensor" && isActiveBinary(entity) && SAFETY_DEVICE_CLASSES.has(deviceClass ?? "")) {
        return {
            category: "security" as const,
            severity: "critical" as const,
            reason: "alert",
            icon: safetyIcon(deviceClass),
        };
    }

    if (BAD_STATES.has(state)) {
        return {
            category: "maintenance" as const,
            severity: "warning" as const,
            reason: "unavailable",
            icon: "cloud_off",
        };
    }

    if (domain === "sensor" && deviceClass === "battery") {
        const numeric = Number(state);
        if (Number.isFinite(numeric) && numeric <= batteryThreshold) {
            return {
                category: "maintenance" as const,
                severity: numeric <= 10 ? "critical" as const : "warning" as const,
                reason: "lowBattery",
                icon: "battery_alert",
            };
        }
    }

    if (domain === "binary_sensor" && deviceClass === "battery" && isActiveBinary(entity)) {
        return {
            category: "maintenance" as const,
            severity: "warning" as const,
            reason: "lowBattery",
            icon: "battery_alert",
        };
    }

    if ((domain === "update" && state === "on") || (domain === "binary_sensor" && deviceClass === "update" && isActiveBinary(entity))) {
        return {
            category: "updates" as const,
            severity: "info" as const,
            reason: "updateAvailable",
            icon: "system_update_alt",
        };
    }

    if (
        (domain === "cover" && ["open", "opening"].includes(state)) ||
        (domain === "lock" && ["unlocked", "open", "opening"].includes(state)) ||
        (isActiveBinary(entity) && OPENING_DEVICE_CLASSES.has(deviceClass ?? ""))
    ) {
        return {
            category: "security" as const,
            severity: "warning" as const,
            reason: domain === "lock" ? "unlocked" : "open",
            icon: domain === "lock" ? "lock_open" : "door_open",
        };
    }

    if (isActiveBinary(entity) && MOTION_DEVICE_CLASSES.has(deviceClass ?? "")) {
        return {
            category: "activity" as const,
            severity: "info" as const,
            reason: "motion",
            icon: "sensors",
        };
    }

    if (domain === "media_player" && ["playing", "paused"].includes(state)) {
        return {
            category: "media" as const,
            severity: "info" as const,
            reason: state === "playing" ? "playing" : "paused",
            icon: "play_circle",
        };
    }

    if (["light", "switch", "fan"].includes(domain) && state === "on") {
        return {
            category: "lights" as const,
            severity: "info" as const,
            reason: domain === "fan" ? "fanOn" : "on",
            icon: domain === "fan" ? "mode_fan" : "lightbulb",
        };
    }

    return null;
}

function safetyIcon(deviceClass: string | undefined) {
    switch (deviceClass) {
        case "moisture":
            return "water_drop";
        case "smoke":
            return "detector_smoke";
        case "gas":
        case "carbon_monoxide":
            return "warning";
        case "tamper":
            return "shield_lock";
        default:
            return "release_alert";
    }
}

function sortAttentionItems(left: AttentionItem, right: AttentionItem) {
    const severity = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
    if (severity) return severity;

    const category = CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category);
    if (category) return category;

    const leftChanged = Date.parse(left.lastChanged ?? "");
    const rightChanged = Date.parse(right.lastChanged ?? "");
    if (Number.isFinite(leftChanged) && Number.isFinite(rightChanged) && leftChanged !== rightChanged) {
        return rightChanged - leftChanged;
    }

    return left.title.localeCompare(right.title);
}

export function buildAttentionSummary(input: AttentionInput, options: AttentionOptions = {}): AttentionSummary {
    const batteryThreshold = options.batteryThreshold ?? 25;
    const setupLimit = options.setupLimit ?? 12;
    const { entityById, deviceById, areaById } = createMaps(input);
    const items: AttentionItem[] = [];
    const seen = new Set<string>();

    for (const entity of Object.values(input.states)) {
        const registry = entityById.get(entity.entity_id);
        if (isHiddenOrDisabled(registry)) continue;

        const classification = classifyEntity(entity, batteryThreshold);
        if (!classification) continue;

        const areaId = resolveAreaId(registry, deviceById);
        const areaName = areaId ? areaById.get(areaId)?.name : undefined;
        const item = makeItem(
            entity,
            registry,
            areaName,
            areaId,
            classification.category,
            classification.severity,
            classification.reason,
            classification.icon,
        );
        items.push(item);
        seen.add(entity.entity_id);
    }

    let setupCount = 0;
    for (const registry of input.entityRegistry ?? []) {
        if (setupCount >= setupLimit) break;
        if (seen.has(registry.entity_id)) continue;
        if (isHiddenOrDisabled(registry)) continue;
        if (registry.entity_category === "diagnostic") continue;

        const entity = input.states[registry.entity_id];
        if (!entity) continue;

        const areaId = resolveAreaId(registry, deviceById);
        if (areaId) continue;

        items.push(makeItem(
            entity,
            registry,
            undefined,
            undefined,
            "setup",
            "info",
            "needsRoom",
            "add_home",
        ));
        setupCount += 1;
    }

    const sortedItems = items.sort(sortAttentionItems);
    const sections = CATEGORY_ORDER
        .map((category) => {
            const sectionItems = sortedItems.filter((item) => item.category === category);
            if (!sectionItems.length) return null;
            return {
                category,
                severity: sectionItems[0].severity,
                items: sectionItems,
            } satisfies AttentionSection;
        })
        .filter((section): section is AttentionSection => Boolean(section));

    return {
        items: sortedItems,
        sections,
        total: sortedItems.length,
        critical: sortedItems.filter((item) => item.severity === "critical").length,
        warning: sortedItems.filter((item) => item.severity === "warning").length,
        info: sortedItems.filter((item) => item.severity === "info").length,
    };
}
