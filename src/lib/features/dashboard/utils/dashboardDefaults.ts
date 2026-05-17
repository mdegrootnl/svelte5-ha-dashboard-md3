import type { DashboardItem, GridConfig, RoomDashboardConfig } from '$lib/types/dashboard';
import {
    ensureGridColumnProfiles,
    ensureItemLayoutProfiles,
} from '$lib/types/dashboard';
import { normalizeGridCardSurfaceStyle } from './cardSurface';

function ensureMinimumRowSpan(item: DashboardItem, minRowSpan: number) {
    item.layout.desktop.rowSpan = Math.max(item.layout.desktop.rowSpan, minRowSpan);
    item.layout.mobile.rowSpan = Math.max(item.layout.mobile.rowSpan, minRowSpan);

    const profiles = ensureItemLayoutProfiles(item);
    for (const layout of Object.values(profiles)) {
        layout.rowSpan = Math.max(layout.rowSpan, minRowSpan);
    }
}

function ensureItemDefaults(item: DashboardItem): DashboardItem {
    item.entityId ??= "";
    item.name ??= "";
    item.domainFilter ??= "";
    item.secondaryEntityId ??= "";
    item.secondaryName ??= "";
    ensureItemLayoutProfiles(item);

    item.options ??= {};
    if (item.cardType === "button") item.options.button ??= {};
    if (item.cardType === "room") item.options.room ??= { source: "auto" };
    if (item.cardType === "collection") item.options.collection ??= { mode: "auto", showState: true };
    if (item.cardType === "energy") item.options.energy ??= { source: "auto" };
    if (item.cardType === "calendar") item.options.calendar ??= { source: "auto", daysToShow: 7, maxEvents: 4 };
    if (item.cardType === "weather") item.options.weather ??= { source: "auto" };
    if (item.cardType === "remote") item.options.remote ??= { preset: "tv" };
    if (item.cardType === "device_panel") item.options.device_panel ??= { preset: "auto" };

    if (item.cardType === "weather" && item.generationState === "generated") {
        ensureMinimumRowSpan(item, 3);
    }

    if (item.cardType === "title") {
        item.subtitle ??= "";
        item.alignment ??= "start";
    }

    if (item.cardType === "graph") {
        item.hours_to_show ??= 24;
        item.aggregate_func ??= "avg";
        item.chartType ??= "area";
        item.graphEntities ??= [];
    }

    if (item.cardType === "navigation") {
        item.path ??= "";
        item.iconType ??= "icon";
        item.imageUrl ??= "";
        item.shortcuts ??= [];
    }

    if (item.cardType === "tabs") {
        item.tabs ??= [];
        item.activeTabIndex ??= 0;
        for (const tab of item.tabs) {
            normalizeGridConfig(tab);
        }
    }

    return item;
}

export function normalizeDashboardItem(item: DashboardItem): DashboardItem {
    return ensureItemDefaults(item);
}

export function normalizeGridConfig(config: GridConfig): GridConfig {
    config.columns ??= { desktop: 12, mobile: 4 };
    config.columns.desktop ??= 12;
    config.columns.mobile ??= 4;
    ensureGridColumnProfiles(config);
    config.rows ??= "implicit";
    config.gap ??= 16;
    config.padding ??= 16;
    config.rowHeight ??= 80;
    config.items ??= [];
    if (config.background) {
        config.background.enabled ??= false;
        config.background.source ??= "none";
        config.background.objectPosition ??= "center";
        config.background.scrimOpacity ??= 0.38;
    }
    if (config.cardSurfaceStyle) {
        config.cardSurfaceStyle = normalizeGridCardSurfaceStyle(config.cardSurfaceStyle);
    }

    for (const item of config.items) {
        normalizeDashboardItem(item);
    }

    return config;
}

export function normalizeRoomDashboardConfig(config: RoomDashboardConfig): RoomDashboardConfig {
    normalizeGridConfig(config);
    config.tabs ??= [];
    config.activeTabId ??= config.tabs[0]?.id ?? "";

    for (const tab of config.tabs) {
        normalizeGridConfig(tab);
    }

    if (config.tabs.length > 0 && !config.tabs.some((tab) => tab.id === config.activeTabId)) {
        config.activeTabId = config.tabs[0].id;
    }

    return config;
}

export function normalizeDashboardConfigs(
    configs: Record<string, RoomDashboardConfig>,
): Record<string, RoomDashboardConfig> {
    for (const config of Object.values(configs)) {
        normalizeRoomDashboardConfig(config);
    }
    return configs;
}
