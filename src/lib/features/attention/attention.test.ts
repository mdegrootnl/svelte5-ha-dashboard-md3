import { describe, expect, it } from "vitest";
import { buildAttentionSummary } from "./attention";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { HAEntityRegistryEntry } from "$lib/types";
import type { HAArea } from "$lib/types/dashboard";

function entity(entityId: string, state: string, attributes: Record<string, unknown> = {}): HassEntity {
    return {
        entity_id: entityId,
        state,
        attributes: {
            friendly_name: entityId,
            ...attributes,
        },
        last_changed: "2026-05-21T10:00:00.000Z",
        last_updated: "2026-05-21T10:00:00.000Z",
        context: {
            id: "context",
            parent_id: null,
            user_id: null,
        },
    };
}

function registry(entityId: string, areaId: string | null = null): HAEntityRegistryEntry {
    return {
        entity_id: entityId,
        area_id: areaId,
        device_id: null,
        name: "",
        icon: null,
        platform: "test",
        config_entry_id: null,
        disabled_by: null,
        hidden_by: null,
        entity_category: null,
        has_entity_name: false,
        original_name: entityId,
        unique_id: entityId,
        options: null,
        translation_key: null,
        labels: [],
    };
}

const areas: HAArea[] = [
    {
        area_id: "kitchen",
        name: "Kitchen",
    },
] as HAArea[];

describe("buildAttentionSummary", () => {
    it("groups core household attention items by category and severity", () => {
        const states: HassEntities = {
            "binary_sensor.kitchen_window": entity("binary_sensor.kitchen_window", "on", {
                friendly_name: "Kitchen Window",
                device_class: "window",
            }),
            "sensor.remote_battery": entity("sensor.remote_battery", "8", {
                friendly_name: "Remote Battery",
                device_class: "battery",
                unit_of_measurement: "%",
            }),
            "update.home_assistant_core": entity("update.home_assistant_core", "on", {
                friendly_name: "Home Assistant Core",
            }),
            "binary_sensor.hall_motion": entity("binary_sensor.hall_motion", "on", {
                friendly_name: "Hall Motion",
                device_class: "motion",
            }),
            "media_player.living_room": entity("media_player.living_room", "playing", {
                friendly_name: "Living Room Music",
            }),
            "light.kitchen": entity("light.kitchen", "on", {
                friendly_name: "Kitchen Light",
            }),
        };

        const summary = buildAttentionSummary({
            states,
            entityRegistry: [
                registry("binary_sensor.kitchen_window", "kitchen"),
                registry("sensor.remote_battery", "kitchen"),
                registry("update.home_assistant_core", null),
                registry("binary_sensor.hall_motion", null),
                registry("media_player.living_room", null),
                registry("light.kitchen", "kitchen"),
            ],
            areas,
        });

        expect(summary.total).toBe(6);
        expect(summary.critical).toBe(1);
        expect(summary.sections.map((section) => section.category)).toEqual([
            "security",
            "maintenance",
            "updates",
            "activity",
            "media",
            "lights",
        ]);
        expect(summary.sections[0].items[0]).toMatchObject({
            title: "Kitchen Window",
            areaName: "Kitchen",
            severity: "warning",
        });
        expect(summary.sections[1].items[0]).toMatchObject({
            title: "Remote Battery",
            severity: "critical",
        });
    });

    it("skips hidden entities and adds visible unassigned entities as setup attention", () => {
        const states: HassEntities = {
            "sensor.visible_temperature": entity("sensor.visible_temperature", "21", {
                friendly_name: "Visible Temperature",
            }),
            "sensor.hidden_temperature": entity("sensor.hidden_temperature", "19", {
                friendly_name: "Hidden Temperature",
            }),
        };

        const hidden = registry("sensor.hidden_temperature", null);
        hidden.hidden_by = "user";

        const summary = buildAttentionSummary({
            states,
            entityRegistry: [
                registry("sensor.visible_temperature", null),
                hidden,
            ],
        });

        expect(summary.items).toHaveLength(1);
        expect(summary.items[0]).toMatchObject({
            entityId: "sensor.visible_temperature",
            category: "setup",
            severity: "info",
        });
    });

    it("does not mark normal closed/off entities as needing attention", () => {
        const summary = buildAttentionSummary({
            states: {
                "binary_sensor.back_door": entity("binary_sensor.back_door", "off", {
                    device_class: "door",
                }),
                "light.office": entity("light.office", "off"),
                "update.router": entity("update.router", "off"),
            },
            entityRegistry: [
                registry("binary_sensor.back_door", "kitchen"),
                registry("light.office", "kitchen"),
                registry("update.router", "kitchen"),
            ],
            areas,
        });

        expect(summary.total).toBe(0);
        expect(summary.sections).toEqual([]);
    });
});
