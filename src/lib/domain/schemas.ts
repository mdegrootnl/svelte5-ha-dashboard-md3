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
export const DashboardCardTypeSchema = z.enum([
    "button",
    "media",
    "thermostat",
    "title",
    "tabs",
    "graph",
    "navigation",
    "room",
    "collection",
    "energy",
    "calendar",
    "weather",
    "remote",
    "device_panel"
]);

const CardActionSchema = z.object({
    id: z.string(),
    label: z.string().optional(),
    icon: z.string().optional(),
    entityId: z.string().optional(),
    domain: z.string().optional(),
    service: z.string().optional(),
    serviceData: z.record(z.string(), z.unknown()).optional(),
    confirmation: z.string().optional(),
}).passthrough();

const EntityQueryConfigSchema = z.object({
    domains: z.array(z.string()).optional(),
    deviceClasses: z.array(z.string()).optional(),
    areaIds: z.array(z.string()).optional(),
    floorIds: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    states: z.array(z.string()).optional(),
    includeHidden: z.boolean().optional(),
    includeDiagnostic: z.boolean().optional(),
    limit: z.number().min(1).optional(),
    sort: z.enum(["name", "domain", "state", "last_changed"]).optional(),
}).passthrough();

const SmartSourceSchema = z.enum(["auto", "area", "floor", "query", "manual"]);

const DashboardCardOptionsSchema = z.object({
    button: z.object({
        display: z.enum(["tile", "compact"]).optional(),
        control: z.enum(["auto", "toggle", "brightness", "cover", "button", "none"]).optional(),
        showState: z.boolean().optional(),
        stateColor: z.boolean().optional(),
        actions: z.array(CardActionSchema).optional(),
    }).passthrough().optional(),
    room: z.object({
        source: SmartSourceSchema.optional(),
        areaId: z.string().optional(),
        floorId: z.string().optional(),
        entityIds: z.array(z.string()).optional(),
        query: EntityQueryConfigSchema.optional(),
        actions: z.array(CardActionSchema).optional(),
        sections: z.array(z.enum(["lights", "climate", "media", "covers", "sensors", "health"])).optional(),
    }).passthrough().optional(),
    collection: z.object({
        source: SmartSourceSchema.optional(),
        mode: z.enum(["auto", "lights_on", "low_battery", "unavailable", "updates", "custom"]).optional(),
        query: EntityQueryConfigSchema.optional(),
        entityIds: z.array(z.string()).optional(),
        threshold: z.number().optional(),
        showState: z.boolean().optional(),
    }).passthrough().optional(),
    energy: z.object({
        source: SmartSourceSchema.optional(),
        gridImportEntityId: z.string().optional(),
        gridExportEntityId: z.string().optional(),
        solarPowerEntityId: z.string().optional(),
        homePowerEntityId: z.string().optional(),
        batteryPowerEntityId: z.string().optional(),
        todayEnergyEntityId: z.string().optional(),
        gasEntityId: z.string().optional(),
        waterEntityId: z.string().optional(),
    }).passthrough().optional(),
    calendar: z.object({
        source: SmartSourceSchema.optional(),
        entityIds: z.array(z.string()).optional(),
        daysToShow: z.number().min(1).optional(),
        maxEvents: z.number().min(1).optional(),
    }).passthrough().optional(),
    weather: z.object({
        source: SmartSourceSchema.optional(),
        weatherEntityId: z.string().optional(),
        temperatureEntityId: z.string().optional(),
        humidityEntityId: z.string().optional(),
        rainEntityId: z.string().optional(),
        windEntityId: z.string().optional(),
    }).passthrough().optional(),
    remote: z.object({
        source: SmartSourceSchema.optional(),
        remoteEntityId: z.string().optional(),
        mediaPlayerEntityId: z.string().optional(),
        preset: z.enum(["tv", "receiver", "android_tv", "webos", "custom"]).optional(),
        actions: z.array(CardActionSchema).optional(),
    }).passthrough().optional(),
    device_panel: z.object({
        source: SmartSourceSchema.optional(),
        preset: z.enum(["auto", "vacuum", "purifier", "fan", "cover", "timer", "todo"]).optional(),
        entityId: z.string().optional(),
        entityIds: z.array(z.string()).optional(),
        actions: z.array(CardActionSchema).optional(),
    }).passthrough().optional(),
}).passthrough();

const NavigationShortcutSchema = z.object({
    id: z.string(),
    entityId: z.string(),
    icon: z.string().optional(),
    color: z.string().optional(),
}).passthrough();

const GraphCardEntitySchema = z.object({
    entity_id: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
}).passthrough();

export const DashboardItemSchema: z.ZodTypeAny = z.lazy(() => z.object({
    id: z.string(),
    name: z.string().default(""),
    entityId: z.string(),
    icon: z.string().optional(),
    cardType: DashboardCardTypeSchema,
    layout: ResponsiveLayoutSchema,
    secondaryEntityId: z.string().default(""),
    secondaryName: z.string().default(""),
    domainFilter: z.string().default(""),
    subtitle: z.string().optional(),
    alignment: z.enum(["start", "center", "end"]).optional(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    options: DashboardCardOptionsSchema.optional(),

    activeTabIndex: z.number().optional(),
    tabs: z.array(GridConfigSchema).optional(),

    hours_to_show: z.number().optional(),
    aggregate_func: z.enum(['avg', 'min', 'max', 'last']).optional(),
    graphEntities: z.array(GraphCardEntitySchema).optional(),
    fetchHistory: z.boolean().optional(),

    path: z.string().optional(),
    iconType: z.enum(["icon", "image"]).optional(),
    imageUrl: z.string().optional(),
    shortcuts: z.array(NavigationShortcutSchema).optional(),
}).passthrough());

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
const createGridConfigSchema = () => z.object({
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
}).passthrough();

export const GridConfigSchema: z.ZodTypeAny = z.lazy(() => createGridConfigSchema());

/**
 * Schema for a full room dashboard configuration.
 */
export const RoomDashboardConfigSchema: z.ZodTypeAny = z.lazy(() =>
    createGridConfigSchema().extend({
        activeTabId: z.string(),
        tabs: z.array(GridConfigSchema),
    }).passthrough()
);

const NavigationItemSchema = z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string(),
    href: z.string(),
}).passthrough();

const ThemeConfigPartialSchema = z.object({
    sourceColor: z.string().min(1).optional(),
    isDark: z.boolean().optional(),
    navigationStyle: z.enum(['standard', 'modern']).optional(),
    cardRadius: z.number().min(0).max(32).optional(),
    navigationItems: z.array(NavigationItemSchema).optional(),
}).strict();

const DashboardPageSchema = z.object({
    id: z.string(),
    name: z.string(),
    path: z.string(),
    icon: z.string().optional(),
}).passthrough();

const MusicLibraryConfigPartialSchema = z.object({
    favorites: z.array(z.object({
        uri: z.string(),
        name: z.string(),
        media_type: z.string(),
    }).passthrough()).optional(),
    lastSyncedAt: z.number().optional(),
    defaultPlayerId: z.string().optional(),
}).strict();

const LockScreenConfigPartialSchema = z.object({
    enabled: z.boolean().optional(),
    timeout: z.number().min(0).optional(),
    backgroundLandscape: z.string().optional(),
    backgroundPortrait: z.string().optional(),
}).strict();

export const AppConfigPartialSchema = z.object({
    theme: ThemeConfigPartialSchema.optional(),
    dashboards: z.record(z.string(), RoomDashboardConfigSchema).optional(),
    pages: z.array(DashboardPageSchema).optional(),
    musicLibrary: MusicLibraryConfigPartialSchema.optional(),
    lockScreen: LockScreenConfigPartialSchema.optional(),
}).strict();

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
