import { z } from 'zod';

/**
 * Item layout for a specific breakpoint.
 */
export const ItemLayoutSchema = z.object({
    colStart: z.number(),
    colSpan: z.number(),
    rowStart: z.number(),
    rowSpan: z.number(),
});

/**
 * Responsive layout container.
 */
export const ResponsiveLayoutSchema = z.object({
    desktop: ItemLayoutSchema,
    mobile: ItemLayoutSchema,
});

/**
 * Schema for a single dashboard item.
 */
export const DashboardItemSchema = z.object({
    id: z.string(),
    name: z.string().default(""),
    entityId: z.string(),
    cardType: z.enum(["button", "media", "thermostat", "graph"]),
    layout: ResponsiveLayoutSchema,
    secondaryEntityId: z.string().default(""),
    secondaryName: z.string().default(""),
    domainFilter: z.string().default(""),
});

export const GraphCardConfigSchema = z.object({
    entities: z.array(z.object({
        entity_id: z.string(),
        name: z.string().optional(),
        color: z.string().optional(),
    })).optional(),
    hours_to_show: z.number().default(24),
    points_per_hour: z.number().default(0.5),
    aggregate_func: z.enum(['avg', 'min', 'max', 'last']).default('avg'),
    group_by: z.enum(['date', 'hour']).optional(),
    line_color: z.union([z.string(), z.array(z.string())]).optional(),
    show: z.object({
        graph: z.boolean().default(true),
        icon: z.boolean().default(true),
        name: z.boolean().default(true),
        state: z.boolean().default(true),
        fill: z.boolean().default(true),
    }).default({
        graph: true,
        icon: true,
        name: true,
        state: true,
        fill: true,
    }),
    color_thresholds: z.array(z.object({
        value: z.number(),
        color: z.string(),
    })).optional(),
});

/**
 * Grid track metadata.
 */
export const GridTrackSchema = z.object({
    id: z.string(),
    size: z.union([z.literal("auto"), z.number()]),
    type: z.enum(["row", "column"]),
});

/**
 * Schema for a grid configuration (tab).
 */
export const GridConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().optional(),
    columns: z.object({
        desktop: z.number().default(12),
        mobile: z.number().default(4),
    }),
    rows: z.union([z.literal("implicit"), z.array(GridTrackSchema)]),
    gap: z.number().default(16),
    padding: z.number().default(16),
    items: z.array(DashboardItemSchema),
    rowHeight: z.number().optional().default(80),
    rowGap: z.number().optional(),
    columnGap: z.number().optional(),
});

/**
 * Schema for a full room dashboard configuration.
 */
export const RoomDashboardConfigSchema = z.object({
    id: z.string(),
    activeTabId: z.string(),
    tabs: z.array(GridConfigSchema),
});

/**
 * Home Assistant Floor Schema.
 */
export const HAFloorSchema = z.object({
    floor_id: z.string(),
    name: z.string(),
    level: z.number(),
    icon: z.string().optional(),
});

/**
 * Home Assistant Area Schema.
 */
export const HAAreaSchema = z.object({
    area_id: z.string(),
    name: z.string(),
    floor_id: z.string().optional().nullable(),
    icon: z.string().optional(),
});

/**
 * Basic Home Assistant Entity State Schema.
 */
export const HAEntityStateSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    attributes: z.record(z.string(), z.any()),
    last_changed: z.string(),
    last_updated: z.string(),
    context: z.object({
        id: z.string(),
        parent_id: z.string().nullable().optional(),
        user_id: z.string().nullable().optional(),
    }),
});

export type ValidatedDashboardItem = z.infer<typeof DashboardItemSchema>;
export type ValidatedGridConfig = z.infer<typeof GridConfigSchema>;
export type ValidatedRoomDashboardConfig = z.infer<typeof RoomDashboardConfigSchema>;
export type ValidatedHAFloor = z.infer<typeof HAFloorSchema>;
export type ValidatedHAArea = z.infer<typeof HAAreaSchema>;
export type ValidatedHAEntityState = z.infer<typeof HAEntityStateSchema>;
