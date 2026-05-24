import { describe, expect, it } from "vitest";
import { createInventoryIndex, type InventoryContext } from "$lib/domain/haInventory";
import {
    findVacuumRelatedEntities,
    resolveVacuumCapabilities,
    resolveVacuumState,
    VACUUM_FEATURE,
} from "./vacuumCapabilities";
import type { HADeviceRegistryEntry, HAEntity, HAEntityRegistryEntry } from "$lib/types";

function state(entity_id: string, value: string, attributes: Record<string, unknown> = {}): HAEntity {
    return {
        entity_id,
        state: value,
        attributes,
        last_changed: "2026-05-24T10:00:00Z",
        last_updated: "2026-05-24T10:00:00Z",
    };
}

function registry(entity_id: string, device_id: string, overrides: Partial<HAEntityRegistryEntry> = {}): HAEntityRegistryEntry {
    return {
        entity_id,
        name: overrides.name ?? entity_id,
        icon: null,
        platform: "narwal",
        config_entry_id: null,
        device_id,
        area_id: null,
        disabled_by: null,
        hidden_by: null,
        entity_category: overrides.entity_category ?? null,
        has_entity_name: true,
        original_name: overrides.original_name ?? overrides.name ?? entity_id,
        unique_id: overrides.unique_id ?? entity_id,
        options: null,
        translation_key: overrides.translation_key ?? null,
        labels: [],
    };
}

function device(id: string): HADeviceRegistryEntry {
    return {
        id,
        area_id: "first_floor",
        config_entries: [],
        configuration_url: null,
        connections: [],
        disabled_by: null,
        entry_type: null,
        hw_version: null,
        identifiers: [["narwal", id]],
        labels: [],
        manufacturer: "Narwal",
        model: "Flow",
        name_by_user: null,
        name: "First Floor Vacuum",
        serial_number: null,
        sw_version: null,
        via_device_id: null,
    };
}

describe("vacuumCapabilities", () => {
    it("parses Home Assistant vacuum feature flags", () => {
        const vacuum = state("vacuum.first_floor", "idle", {
            supported_features:
                VACUUM_FEATURE.START |
                VACUUM_FEATURE.PAUSE |
                VACUUM_FEATURE.RETURN_HOME |
                VACUUM_FEATURE.FAN_SPEED |
                VACUUM_FEATURE.LOCATE |
                VACUUM_FEATURE.CLEAN_AREA,
            fan_speed_list: ["quiet", "normal", "max"],
            fan_speed: "normal",
        });

        const capabilities = resolveVacuumCapabilities(vacuum);

        expect(capabilities.canStart).toBe(true);
        expect(capabilities.canPause).toBe(true);
        expect(capabilities.canReturnHome).toBe(true);
        expect(capabilities.canSetFanSpeed).toBe(true);
        expect(capabilities.canLocate).toBe(true);
        expect(capabilities.canCleanArea).toBe(true);
        expect(capabilities.fanSpeeds).toEqual(["quiet", "normal", "max"]);
        expect(capabilities.currentFanSpeed).toBe("normal");
    });

    it("discovers Narwal-like sibling entities on the same device", () => {
        const states = {
            "vacuum.first_floor": state("vacuum.first_floor", "idle", { friendly_name: "First Floor Vacuum" }),
            "sensor.first_floor_battery": state("sensor.first_floor_battery", "82", {
                friendly_name: "Battery",
                device_class: "battery",
                unit_of_measurement: "%",
            }),
            "sensor.first_floor_cleaning_area": state("sensor.first_floor_cleaning_area", "12.4", {
                friendly_name: "Cleaning Area",
                unit_of_measurement: "m2",
            }),
            "sensor.first_floor_cleaning_time": state("sensor.first_floor_cleaning_time", "940", {
                friendly_name: "Cleaning Time",
                device_class: "duration",
                unit_of_measurement: "s",
            }),
            "sensor.first_floor_charging_state": state("sensor.first_floor_charging_state", "charging", {
                friendly_name: "Charging State",
            }),
            "binary_sensor.first_floor_docked": state("binary_sensor.first_floor_docked", "on", {
                friendly_name: "Docked",
            }),
            "camera.first_floor_map": state("camera.first_floor_map", "streaming", {
                friendly_name: "Map",
            }),
        };
        const context: InventoryContext = {
            states,
            entities: Object.keys(states).map((entityId) => registry(entityId, "narwal-1")),
            devices: [device("narwal-1")],
            areas: [],
            floors: [],
        };
        const index = createInventoryIndex(context);
        const vacuum = index.getEntity("vacuum.first_floor")!;

        const related = findVacuumRelatedEntities(vacuum, index, states);

        expect(related.battery?.entityId).toBe("sensor.first_floor_battery");
        expect(related.cleaningArea?.entityId).toBe("sensor.first_floor_cleaning_area");
        expect(related.cleaningTime?.entityId).toBe("sensor.first_floor_cleaning_time");
        expect(related.chargingState?.entityId).toBe("sensor.first_floor_charging_state");
        expect(related.docked?.entityId).toBe("binary_sensor.first_floor_docked");
        expect(related.mapCamera?.entityId).toBe("camera.first_floor_map");
    });

    it("does not count idle as docked without dock or charging evidence", () => {
        const vacuum = state("vacuum.first_floor", "idle");

        expect(resolveVacuumState(vacuum).state).toBe("idle");
    });

    it("promotes idle to docked when a related dock sensor confirms it", () => {
        const states = {
            "vacuum.first_floor": state("vacuum.first_floor", "idle"),
            "binary_sensor.first_floor_docked": state("binary_sensor.first_floor_docked", "on"),
        };

        expect(
            resolveVacuumState(states["vacuum.first_floor"], {
                docked: {
                    entityId: "binary_sensor.first_floor_docked",
                    domain: "binary_sensor",
                    name: "Docked",
                    state: "on",
                    labels: [],
                    hidden: false,
                    diagnostic: false,
                },
            }, states).state,
        ).toBe("docked");
    });
});
