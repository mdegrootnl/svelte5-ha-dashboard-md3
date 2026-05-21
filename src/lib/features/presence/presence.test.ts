import { describe, expect, it } from "vitest";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { HAEntityRegistryEntry } from "$lib/types";
import { buildPresenceSummary } from "./presence";

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

function registry(entityId: string): HAEntityRegistryEntry {
    return {
        entity_id: entityId,
        area_id: null,
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

describe("buildPresenceSummary", () => {
    it("summarizes people, zones, guest mode, and commute sensors", () => {
        const states: HassEntities = {
            "person.mila": entity("person.mila", "home", {
                friendly_name: "Mila",
                entity_picture: "https://example.test/mila.png",
            }),
            "person.sam": entity("person.sam", "work", {
                friendly_name: "Sam",
            }),
            "person.riley": entity("person.riley", "not_home", {
                friendly_name: "Riley",
            }),
            "zone.work": entity("zone.work", "1", {
                friendly_name: "Office",
            }),
            "input_boolean.guest_mode": entity("input_boolean.guest_mode", "on", {
                friendly_name: "Guest Mode",
            }),
            "sensor.sam_commute": entity("sensor.sam_commute", "24", {
                friendly_name: "Sam commute",
                unit_of_measurement: "min",
            }),
        };

        const summary = buildPresenceSummary({ states });

        expect(summary.total).toBe(3);
        expect(summary.home).toBe(1);
        expect(summary.away).toBe(1);
        expect(summary.inZones).toBe(1);
        expect(summary.homeIsEmpty).toBe(false);
        expect(summary.people.map((person) => person.name)).toEqual(["Mila", "Sam", "Riley"]);
        expect(summary.people[0]).toMatchObject({
            entityId: "person.mila",
            status: "home",
            picture: "https://example.test/mila.png",
        });
        expect(summary.people[1]).toMatchObject({
            entityId: "person.sam",
            status: "zone",
            zoneName: "Office",
        });
        expect(summary.zones.map((zone) => zone.name)).toEqual(["Home", "Office"]);
        expect(summary.guestMode).toMatchObject({
            entityId: "input_boolean.guest_mode",
            enabled: true,
        });
        expect(summary.etaItems).toEqual([
            expect.objectContaining({
                entityId: "sensor.sam_commute",
                value: "24 min",
            }),
        ]);
    });

    it("falls back to device trackers when person entities do not exist", () => {
        const states: HassEntities = {
            "device_tracker.phone": entity("device_tracker.phone", "home", {
                friendly_name: "Phone",
            }),
            "device_tracker.watch": entity("device_tracker.watch", "not_home", {
                friendly_name: "Watch",
            }),
        };

        const summary = buildPresenceSummary({ states });

        expect(summary.people.map((person) => person.entityId)).toEqual([
            "device_tracker.phone",
            "device_tracker.watch",
        ]);
        expect(summary.people.every((person) => person.sourceDomain === "device_tracker")).toBe(true);
    });

    it("skips hidden people and reports an empty home when nobody is home", () => {
        const hidden = registry("person.hidden");
        hidden.hidden_by = "user";

        const states: HassEntities = {
            "person.visible": entity("person.visible", "not_home", {
                friendly_name: "Visible",
            }),
            "person.hidden": entity("person.hidden", "home", {
                friendly_name: "Hidden",
            }),
        };

        const summary = buildPresenceSummary({
            states,
            entityRegistry: [
                registry("person.visible"),
                hidden,
            ],
        });

        expect(summary.people).toHaveLength(1);
        expect(summary.people[0].entityId).toBe("person.visible");
        expect(summary.homeIsEmpty).toBe(true);
    });
});
