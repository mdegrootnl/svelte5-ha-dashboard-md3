// Figma-inspired coordinate-based layout system
import { generateUUID } from '../utils/uuid';
import type { GraphCardEntity } from './index';
import type { AppLanguage } from '$lib/i18n';

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
export type DashboardCardType =
    | "button"
    | "media"
    | "thermostat"
    | "title"
    | "tabs"
    | "graph"
    | "navigation"
    | "room"
    | "collection"
    | "energy"
    | "calendar"
    | "weather"
    | "remote"
    | "device_panel";

export type GraphChartType = "area" | "line" | "bar" | "step";

export type DashboardCardSurfaceStyle = "md3" | "glass" | "soft";
export type DashboardGridCardSurfaceStyle = "theme" | DashboardCardSurfaceStyle;

export type SmartSourceConfig = "auto" | "area" | "floor" | "query" | "manual";

export type RoomVisualKind =
    | "bathroom"
    | "bedroom"
    | "child_boy_room"
    | "child_girl_room"
    | "child_room"
    | "garage"
    | "hallway"
    | "kitchen"
    | "laundry"
    | "living_room"
    | "office"
    | "outdoor"
    | "utility"
    | "generic_room"
    | "custom";

export type RoomVisualAudience = "adult" | "boy" | "girl" | "child" | "family" | "neutral";
export type NavigationImageSource = "ha_area_picture" | "generated_preview" | "unsplash" | "pexels" | "manual" | "none";
export type DashboardBackgroundSource =
    | "none"
    | "generated_preview"
    | "ha_area_picture"
    | "unsplash"
    | "pexels"
    | "manual";

export type DashboardImageProvider =
    | "unsplash"
    | "pexels"
    | "manual"
    | "generated_preview"
    | "ha_area_picture";

export interface DashboardImageAttribution {
    provider: DashboardImageProvider;
    sourceName?: string;
    sourceUrl?: string;
    authorName?: string;
    authorUrl?: string;
    photoId?: string;
    licenseUrl?: string;
    downloadLocation?: string;
}

export interface DashboardBackgroundConfig {
    enabled: boolean;
    source: DashboardBackgroundSource;
    imageUrl?: string;
    imageAttribution?: DashboardImageAttribution;
    accentColor?: string;
    objectPosition?: "center" | "top" | "bottom";
    scrimOpacity?: number;
}

export type DashboardGenerationRecipe =
    | "house"
    | "room"
    | "floor"
    | "entity_type"
    | "label"
    | "maintenance";

export type DashboardGenerationSourceType =
    | "house"
    | "area"
    | "floor"
    | "entity_type"
    | "label"
    | "maintenance"
    | "dashboard";

export type DashboardGenerationState = "generated" | "user_modified" | "pinned";

export interface DashboardGenerationMetadata {
    recipe: DashboardGenerationRecipe;
    sourceType: DashboardGenerationSourceType;
    sourceId: string;
    generatedAt: string;
    reason: string;
    version: number;
}

export interface DashboardGenerationOptions {
    recipe: DashboardGenerationRecipe;
    targetDashboardId: string;
    language?: AppLanguage;
    areaId?: string;
    floorId?: string;
    entityDomain?: string;
    entityDeviceClass?: string;
    labelId?: string;
    includeLabels?: string[];
    excludeLabels?: string[];
    includeEntityIds?: string[];
    excludeEntityIds?: string[];
    useBackgroundImages?: boolean;
    applyMode: "replace_draft";
}

export interface DashboardGenerationEntityRef {
    entityId: string;
    reason: string;
    cardId?: string;
    importanceScore?: number;
    importanceReasons?: string[];
}

export interface DashboardGenerationSummary {
    recipe: DashboardGenerationRecipe;
    title: string;
    tabs: number;
    cards: number;
    included: number;
    skipped: number;
    relatedDashboards?: number;
    relatedCards?: number;
}

export type DashboardGenerationQualityCode =
    | "area_matched"
    | "device_area_fallback"
    | "name_inferred_area"
    | "missing_area"
    | "skipped_diagnostic"
    | "skipped_low_importance"
    | "skipped_unavailable"
    | "used_ha_group"
    | "duplicate_remote"
    | "duplicate_media_player"
    | "name_review"
    | "missing_area_picture"
    | "manual_review";

export type DashboardGenerationQualitySeverity = "info" | "warning" | "suggestion";

export interface DashboardGenerationQualityHint {
    code: DashboardGenerationQualityCode;
    severity: DashboardGenerationQualitySeverity;
    message: string;
    entityIds: string[];
    suggestedAction?: string;
}

export interface DashboardGenerationResult {
    config: RoomDashboardConfig;
    relatedConfigs?: RoomDashboardConfig[];
    summary: DashboardGenerationSummary;
    includedEntities: DashboardGenerationEntityRef[];
    skippedEntities: DashboardGenerationEntityRef[];
    qualityHints: DashboardGenerationQualityHint[];
    warnings: string[];
}

export interface CardAction {
    id: string;
    label?: string;
    icon?: string;
    entityId?: string;
    domain?: string;
    service?: string;
    serviceData?: Record<string, unknown>;
    confirmation?: string;
}

export interface EntityQueryConfig {
    domains?: string[];
    deviceClasses?: string[];
    areaIds?: string[];
    floorIds?: string[];
    labels?: string[];
    states?: string[];
    includeHidden?: boolean;
    includeDiagnostic?: boolean;
    limit?: number;
    sort?: "name" | "domain" | "state" | "last_changed";
}

export interface ButtonCardOptions {
    display?: "tile" | "compact";
    control?: "auto" | "toggle" | "brightness" | "cover" | "button" | "none";
    showState?: boolean;
    stateColor?: boolean;
    actions?: CardAction[];
}

export interface RoomCardOptions {
    source?: SmartSourceConfig;
    areaId?: string;
    floorId?: string;
    entityIds?: string[];
    query?: EntityQueryConfig;
    actions?: CardAction[];
    sections?: Array<"lights" | "climate" | "media" | "covers" | "sensors" | "health">;
}

export interface NavigationCardOptions {
    source?: SmartSourceConfig;
    areaId?: string;
    visualKind?: RoomVisualKind;
    visualAudience?: RoomVisualAudience;
    visualPromptSeed?: string;
    imageSource?: NavigationImageSource;
}

export interface CollectionCardOptions {
    source?: SmartSourceConfig;
    mode?:
        | "auto"
        | "lights_on"
        | "low_battery"
        | "unavailable"
        | "updates"
        | "openings"
        | "motion"
        | "media_playing"
        | "security"
        | "custom";
    query?: EntityQueryConfig;
    entityIds?: string[];
    threshold?: number;
    showState?: boolean;
    presentation?: "list" | "summary";
}

export interface EnergyCardOptions {
    source?: SmartSourceConfig;
    mode?: "overview" | "flow" | "balance" | "sources" | "devices";
    historyRange?: "last24h" | "today" | "7d" | "30d" | "12m";
    gridImportEntityId?: string;
    gridExportEntityId?: string;
    solarPowerEntityId?: string;
    homePowerEntityId?: string;
    batteryPowerEntityId?: string;
    todayEnergyEntityId?: string;
    gasEntityId?: string;
    waterEntityId?: string;
    deviceEntityIds?: string[];
    hoursToShow?: number;
}

export interface CalendarCardOptions {
    source?: SmartSourceConfig;
    entityIds?: string[];
    daysToShow?: number;
    maxEvents?: number;
}

export interface WeatherCardOptions {
    source?: SmartSourceConfig;
    weatherEntityId?: string;
    temperatureEntityId?: string;
    humidityEntityId?: string;
    rainEntityId?: string;
    windEntityId?: string;
}

export interface RemoteCardOptions {
    source?: SmartSourceConfig;
    remoteEntityId?: string;
    mediaPlayerEntityId?: string;
    preset?: "tv" | "receiver" | "android_tv" | "webos" | "custom";
    actions?: CardAction[];
}

export interface DevicePanelCardOptions {
    source?: SmartSourceConfig;
    preset?: "auto" | "vacuum" | "purifier" | "fan" | "cover" | "timer" | "todo";
    entityId?: string;
    entityIds?: string[];
    actions?: CardAction[];
}

export interface DashboardCardOptions {
    button?: ButtonCardOptions;
    navigation?: NavigationCardOptions;
    room?: RoomCardOptions;
    collection?: CollectionCardOptions;
    energy?: EnergyCardOptions;
    calendar?: CalendarCardOptions;
    weather?: WeatherCardOptions;
    remote?: RemoteCardOptions;
    device_panel?: DevicePanelCardOptions;
}

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
 * Runtime dashboard viewport profiles. Phones and tablets are first-class
 * display targets; desktop is kept as the configuration/editing profile.
 */
export type ViewportProfile =
    | "phonePortrait"
    | "phoneLandscape"
    | "tabletPortrait"
    | "tabletLandscape"
    | "desktopEdit";

export const VIEWPORT_PROFILES: ViewportProfile[] = [
    "phonePortrait",
    "phoneLandscape",
    "tabletPortrait",
    "tabletLandscape",
    "desktopEdit",
];

export type LayoutProfiles = Record<ViewportProfile, ItemLayout>;
export type ColumnProfiles = Record<ViewportProfile, number>;

export interface ViewportProfileInput {
    width: number;
    height: number;
    coarsePointer?: boolean;
}

function cloneItemLayout(layout: ItemLayout): ItemLayout {
    return {
        colStart: layout.colStart,
        colSpan: layout.colSpan,
        rowStart: layout.rowStart,
        rowSpan: layout.rowSpan,
    };
}

export function profileToLegacyBreakpoint(profile: ViewportProfile): Breakpoint {
    return profile === "desktopEdit" ? "desktop" : "mobile";
}

export function getProfileSeedBreakpoint(profile: ViewportProfile): Breakpoint {
    return profile === "desktopEdit" || profile === "tabletLandscape"
        ? "desktop"
        : "mobile";
}

export function resolveViewportProfile(input: ViewportProfileInput): ViewportProfile {
    const width = Math.max(1, input.width);
    const height = Math.max(1, input.height);
    const isLandscape = width >= height;
    const shortSide = Math.min(width, height);
    const coarsePointer = input.coarsePointer ?? false;

    if (!coarsePointer && width >= 1280 && shortSide >= 720) {
        return "desktopEdit";
    }

    if (shortSide < 600) {
        return isLandscape ? "phoneLandscape" : "phonePortrait";
    }

    if (coarsePointer || width < 1280) {
        return isLandscape ? "tabletLandscape" : "tabletPortrait";
    }

    return "desktopEdit";
}

export function createLayoutProfilesFromResponsiveLayout(
    layout: ResponsiveLayout,
): LayoutProfiles {
    return {
        phonePortrait: cloneItemLayout(layout.mobile),
        phoneLandscape: cloneItemLayout(layout.mobile),
        tabletPortrait: cloneItemLayout(layout.mobile),
        tabletLandscape: cloneItemLayout(layout.desktop),
        desktopEdit: cloneItemLayout(layout.desktop),
    };
}

export function createColumnProfilesFromColumns(columns: {
    desktop: number;
    mobile: number;
}): ColumnProfiles {
    return {
        phonePortrait: columns.mobile,
        phoneLandscape: columns.mobile,
        tabletPortrait: columns.mobile,
        tabletLandscape: columns.desktop,
        desktopEdit: columns.desktop,
    };
}

export function ensureItemLayoutProfiles(item: DashboardItem): LayoutProfiles {
    item.layoutProfiles ??= createLayoutProfilesFromResponsiveLayout(item.layout);
    return item.layoutProfiles;
}

export function ensureGridColumnProfiles(grid: GridConfig): ColumnProfiles {
    grid.columnProfiles ??= createColumnProfilesFromColumns(grid.columns);
    return grid.columnProfiles;
}

export function getItemLayoutForProfile(
    item: DashboardItem,
    profile: ViewportProfile,
): ItemLayout {
    return item.layoutProfiles?.[profile] ?? item.layout[getProfileSeedBreakpoint(profile)];
}

export function syncLegacyLayoutFromProfile(
    item: DashboardItem,
    profile: ViewportProfile,
) {
    const layout = getItemLayoutForProfile(item, profile);
    const breakpoint = profileToLegacyBreakpoint(profile);
    item.layout[breakpoint] = cloneItemLayout(layout);
}

export function setItemLayoutForProfile(
    item: DashboardItem,
    profile: ViewportProfile,
    layout: ItemLayout,
) {
    ensureItemLayoutProfiles(item)[profile] = cloneItemLayout(layout);
    syncLegacyLayoutFromProfile(item, profile);
}

export function getGridColumnsForProfile(
    grid: GridConfig,
    profile: ViewportProfile,
): number {
    const fallbackProfiles = createColumnProfilesFromColumns(grid.columns);
    return Math.max(1, grid.columnProfiles?.[profile] ?? fallbackProfiles[profile] ?? grid.columns.mobile ?? 4);
}

export function setGridColumnsForProfile(
    grid: GridConfig,
    profile: ViewportProfile,
    columns: number,
) {
    ensureGridColumnProfiles(grid)[profile] = Math.max(1, Math.round(columns));
    grid.columns[profileToLegacyBreakpoint(profile)] = Math.max(1, Math.round(columns));
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
    /** Optional icon override */
    icon?: string;
    /** Type of card to render */
    cardType: DashboardCardType;
    /** Responsive position and span configuration */
    layout: ResponsiveLayout;
    /** Profile-specific position and span configuration. Derived from layout when absent. */
    layoutProfiles?: LayoutProfiles;
    /** Secondary entity ID (empty string if not set) */
    secondaryEntityId: string;
    /** Secondary entity display name (empty string if not set) */
    secondaryName: string;
    /** Domain filter for entity selection (empty string if not set) */
    domainFilter: string;
    /** Subtitle for title card */
    subtitle?: string;
    alignment?: "start" | "center" | "end";
    /** Primary color for the card's graph and icon (CSS variable) */
    color?: string;
    /** Background color for the card (CSS variable) */
    backgroundColor?: string;
    /** Typed card-specific configuration for newer card families */
    options?: DashboardCardOptions;
    /** Metadata for cards created by controlled dashboard generation. */
    generatedBy?: DashboardGenerationMetadata;
    generationState?: DashboardGenerationState;

    /** Tab Card Properties */
    activeTabIndex?: number;
    tabs?: GridConfig[]; // Recursive definition: a tab just holds another GridConfig

    /** Graph Card Properties */
    hours_to_show?: number;
    aggregate_func?: "avg" | "min" | "max" | "last";
    chartType?: GraphChartType;
    graphEntities?: GraphCardEntity[];
    /** Disable live HA history calls for static/demo graph surfaces. */
    fetchHistory?: boolean;

    /** Navigation Card Properties */
    path?: string;
    iconType?: 'icon' | 'image';
    imageUrl?: string;
    imageAttribution?: DashboardImageAttribution;
    /** Shortcut entities displayed as buttons on the right side */
    shortcuts?: NavigationCardShortcut[];
}

/**
 * Shortcut entity for navigation cards
 */
export interface NavigationCardShortcut {
    id: string;
    entityId: string;
    icon?: string; // Optional icon override
    color?: string; // Optional color override
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
    /** Profile-specific column counts. Derived from columns when absent. */
    columnProfiles?: ColumnProfiles;
    /** Row configuration: "implicit" for auto rows, or explicit GridTrack[] */
    rows: "implicit" | GridTrack[];
    /** Gap between grid items in pixels (used for both directions if rowGap/columnGap not set) */
    gap: number;
    /** Padding around the grid in pixels */
    padding: number;
    /** Items placed in the grid */
    items: DashboardItem[];
    /** Optional image background for this dashboard/grid surface. */
    background?: DashboardBackgroundConfig;
    /** Optional card surface override for cards rendered inside this grid. */
    cardSurfaceStyle?: DashboardGridCardSurfaceStyle;
    /** Metadata for grids created by controlled dashboard generation. */
    generatedBy?: DashboardGenerationMetadata;
    generationState?: DashboardGenerationState;
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
export interface RoomDashboardConfig extends GridConfig {
    /** Array of tabs, each is a GridConfig */
    tabs: GridConfig[];
    /** ID of the currently active tab */
    activeTabId: string;
}

/**
 * Custom dashboard page definition
 */
export interface DashboardPage {
    id: string;
    name: string;
    /** The URL path under /dashboard/ (e.g. "living-room" or "first-floor/kitchen") */
    path: string;
    /** Material Symbol icon name */
    icon?: string;
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
    floor_id?: string | null;
    icon?: string | null;
    picture?: string | null;
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
    const columns = {
        desktop: 12,
        mobile: 4
    };
    return {
        id: generateUUID(),
        name,
        icon,
        columns,
        columnProfiles: createColumnProfilesFromColumns(columns),
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
    const desktopSpan = (
        cardType === "button" ||
        cardType === "navigation" ||
        cardType === "collection" ||
        cardType === "weather" ||
        cardType === "remote"
    ) ? 2 : (
        cardType === "thermostat" ||
        cardType === "title" ||
        cardType === "calendar" ||
        cardType === "device_panel"
    ) ? 4 : 6;
    const mobileSpan = (
        cardType === "button" ||
        cardType === "graph" ||
        cardType === "navigation" ||
        cardType === "collection" ||
        cardType === "weather" ||
        cardType === "remote"
    ) ? 2 : 4;

    // Row span based on card size
    // Graph cards default to 2x spans if not specified
    const rowSpan = (
        cardType === "weather" ||
        cardType === "energy"
    ) ? 3 : (
        cardType === "graph" ||
        cardType === "room" ||
        cardType === "calendar" ||
        cardType === "device_panel"
    ) ? 2 : (cardSize === 'condensed' ? 1 : cardSize === 'standard' ? 2 : 3);

    const layout = {
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
    return layout;
}
