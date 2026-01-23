// Dashboard Grid System Types
// Figma-inspired coordinate-based layout system

/**
 * Represents a single track (row or column) in the grid
 */
export interface GridTrack {
    id: string;
    /** "auto" maps to minmax(0, 1fr), number maps to fixed px */
    size: "auto" | number;
    type: "row" | "column";
}

/**
 * Card types that can be rendered in the grid
 */
export type DashboardCardType = "button" | "media" | "thermostat" | "title" | "tabs" | "graph";

/**
 * Layout definition for a specific breakpoint
 */
export interface ItemLayout {
    colStart: number;
    colSpan: number;
    rowStart: number;
    rowSpan: number;
}

/**
 * Responsive layout configuration for an item
 * Supports desktop and mobile breakpoints
 */
export interface ResponsiveLayout {
    desktop: ItemLayout;
    mobile: ItemLayout;
}

/**
 * A single item in the dashboard grid
 */
export interface DashboardItem {
    id: string;
    /** Optional display name override (empty string if not set) */
    name: string;
    /** Home Assistant entity ID */
    entityId: string;
    /** Type of card to render */
    cardType: DashboardCardType;
    /** Responsive position and span configuration */
    layout: ResponsiveLayout;
    /** Secondary entity ID (empty string if not set) */
    secondaryEntityId: string;
    /** Secondary entity display name (empty string if not set) */
    secondaryName: string;
    /** Domain filter for entity selection (empty string if not set) */
    domainFilter: string;
    /** Subtitle for title card */
    subtitle?: string;
    alignment?: "start" | "center" | "end";

    /** Tab Card Properties */
    activeTabIndex?: number;
    tabs?: GridConfig[]; // Recursive definition: a tab just holds another GridConfig

    /** Graph Card Properties */
    hours_to_show?: number;
    aggregate_func?: "avg" | "min" | "max" | "last";
}

/**
 * Special config for Tab Cards to enforce presence of tabs array
 */
export interface TabCardConfig extends DashboardItem {
    cardType: "tabs";
    tabs: GridConfig[];
}

/**
 * Complete grid configuration
 */
/**
 * Complete grid configuration (Essentially a single Tab)
 */
export interface GridConfig {
    id: string;
    name: string;
    icon?: string; // Material Symbol icon name
    /** Number of columns (desktop uses 12, mobile uses 4) */
    columns: {
        desktop: number;
        mobile: number;
    };
    /** Row configuration: "implicit" for auto rows, or explicit GridTrack[] */
    rows: "implicit" | GridTrack[];
    /** Gap between grid items in pixels (used for both directions if rowGap/columnGap not set) */
    gap: number;
    /** Padding around the grid in pixels */
    padding: number;
    /** Items placed in the grid */
    items: DashboardItem[];
    /** 
     * Row height in pixels for implicit rows.
     * Default: 80px
     */
    rowHeight?: number;
    /** 
     * Vertical gap between rows in pixels.
     * If omitted, uses `gap` value for both directions.
     */
    rowGap?: number;
    /** 
     * Horizontal gap between columns in pixels.
     * If omitted, uses `gap` value for both directions.
     */
    columnGap?: number;
}

/**
 * Configuration for a Room containing multiple tabs
 */
export interface RoomDashboardConfig {
    id: string;
    /** Array of tabs, each is a GridConfig */
    tabs: GridConfig[];
    /** ID of the currently active tab */
    activeTabId: string;
}


/**
 * Floor/Room hierarchy from Home Assistant
 */
export interface HAFloor {
    floor_id: string;
    name: string;
    level: number;
    icon?: string;
}

export interface HAArea {
    area_id: string;
    name: string;
    floor_id?: string;
    icon?: string;
}

/**
 * Dashboard hierarchy for navigation
 */
export interface DashboardHierarchy {
    floors: HAFloor[];
    areas: HAArea[];
    // Map of floor_id -> area_id[]
    floorAreas: Record<string, string[]>;
}

/**
 * Breakpoint detection for responsive layouts
 */
export type Breakpoint = "desktop" | "mobile";

/**
 * Default grid configuration factory
 */
export function createDefaultGridConfig(name: string = "Dashboard", icon: string = "home"): GridConfig {
    return {
        id: crypto.randomUUID(),
        name,
        icon,
        columns: {
            desktop: 12,
            mobile: 4
        },
        rows: "implicit",
        gap: 16,
        padding: 16,
        rowHeight: 80,
        items: []
    };
}

/**
 * Default item layout factory
 */
export function createDefaultItemLayout(
    colStart: number = 1,
    cardType: DashboardCardType = "button",
    cardSize: 'condensed' | 'standard' | 'poster' = 'standard'
): ResponsiveLayout {
    // Size based on card type
    const desktopSpan = cardType === "button" ? 2 : (cardType === "thermostat" || cardType === "title") ? 4 : 6;
    const mobileSpan = (cardType === "button" || cardType === "graph") ? 2 : 4;

    // Row span based on card size
    // Graph cards default to 2x spans if not specified
    const rowSpan = cardType === "graph" ? 2 : (cardSize === 'condensed' ? 1 : cardSize === 'standard' ? 2 : 3);

    return {
        desktop: {
            colStart,
            colSpan: desktopSpan,
            rowStart: 1,
            rowSpan
        },
        mobile: {
            colStart: 1,
            colSpan: mobileSpan,
            rowStart: 1,
            rowSpan
        }
    };
}
