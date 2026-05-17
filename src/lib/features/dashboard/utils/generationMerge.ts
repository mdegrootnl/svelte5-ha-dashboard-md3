import type { DashboardItem, GridConfig, RoomDashboardConfig, ViewportProfile } from '$lib/types/dashboard';
import {
    VIEWPORT_PROFILES,
    getItemLayoutForProfile,
} from '$lib/types/dashboard';
import { normalizeRoomDashboardConfig } from './dashboardDefaults';

export interface GenerationMergeSummary {
    preservedItems: number;
    preservedTabs: number;
}

export interface GenerationMergeResult {
    config: RoomDashboardConfig;
    summary: GenerationMergeSummary;
}

export interface GenerationMergeOptions {
    preserveUserModifiedGeneratedItems?: boolean;
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function getMaxRow(items: DashboardItem[], breakpoint: 'desktop' | 'mobile') {
    return items.reduce((max, item) => {
        const layout = item.layout[breakpoint];
        return Math.max(max, layout.rowStart + layout.rowSpan - 1);
    }, 0);
}

function getMaxProfileRow(items: DashboardItem[], profile: ViewportProfile) {
    return items.reduce((max, item) => {
        const layout = getItemLayoutForProfile(item, profile);
        return Math.max(max, layout.rowStart + layout.rowSpan - 1);
    }, 0);
}

function getMinRow(items: DashboardItem[], breakpoint: 'desktop' | 'mobile') {
    return items.reduce((min, item) => {
        const layout = item.layout[breakpoint];
        return Math.min(min, layout.rowStart);
    }, Number.POSITIVE_INFINITY);
}

function getMinProfileRow(items: DashboardItem[], profile: ViewportProfile) {
    return items.reduce((min, item) => {
        const layout = getItemLayoutForProfile(item, profile);
        return Math.min(min, layout.rowStart);
    }, Number.POSITIVE_INFINITY);
}

function shouldPreserveItem(
    item: DashboardItem,
    options: GenerationMergeOptions = {},
) {
    const preserveUserModifiedGeneratedItems =
        options.preserveUserModifiedGeneratedItems ?? true;

    return (
        item.generationState === 'pinned' ||
        (preserveUserModifiedGeneratedItems && item.generationState === 'user_modified') ||
        !item.generatedBy
    );
}

function shouldPreserveWholeTab(tab: GridConfig) {
    return (
        tab.items.length > 0 &&
        (tab.generationState === 'pinned' || !tab.generatedBy)
    );
}

function hasMatchingSource(a?: GridConfig['generatedBy'], b?: GridConfig['generatedBy']) {
    return !!(
        a &&
        b &&
        a.sourceType === b.sourceType &&
        a.sourceId === b.sourceId
    );
}

function findMatchingGeneratedTab(generated: RoomDashboardConfig, existingTab: GridConfig) {
    return (
        generated.tabs.find((tab) => tab.name === existingTab.name) ??
        generated.tabs.find(
            (tab) =>
                hasMatchingSource(tab.generatedBy, existingTab.generatedBy) &&
                tab.generatedBy?.reason === existingTab.generatedBy?.reason,
        ) ??
        generated.tabs.find((tab) => hasMatchingSource(tab.generatedBy, existingTab.generatedBy)) ??
        generated.tabs[0] ??
        generated
    );
}

function appendPreservedItems(target: GridConfig, items: DashboardItem[]) {
    if (items.length === 0) return;

    const preservedItems = clone(items);
    const desktopOffset = Math.max(
        0,
        getMaxRow(target.items, 'desktop') + 1 - getMinRow(preservedItems, 'desktop'),
    );
    const mobileOffset = Math.max(
        0,
        getMaxRow(target.items, 'mobile') + 1 - getMinRow(preservedItems, 'mobile'),
    );
    const profileOffsets = Object.fromEntries(
        VIEWPORT_PROFILES.map((profile) => [
            profile,
            Math.max(
                0,
                getMaxProfileRow(target.items, profile) + 1 -
                    getMinProfileRow(preservedItems, profile),
            ),
        ]),
    ) as Record<ViewportProfile, number>;

    for (const item of preservedItems) {
        item.layout.desktop.rowStart += desktopOffset;
        item.layout.mobile.rowStart += mobileOffset;
        for (const profile of VIEWPORT_PROFILES) {
            getItemLayoutForProfile(item, profile).rowStart += profileOffsets[profile];
        }
    }

    target.items.push(...preservedItems);
}

function appendPreservedTab(target: RoomDashboardConfig, tab: GridConfig) {
    const preservedTab = clone(tab);
    const usedIds = new Set(target.tabs.map((existingTab) => existingTab.id));

    if (usedIds.has(preservedTab.id)) {
        let index = 1;
        let nextId = `${preservedTab.id}_preserved`;
        while (usedIds.has(nextId)) {
            index += 1;
            nextId = `${preservedTab.id}_preserved_${index}`;
        }
        preservedTab.id = nextId;
    }

    target.tabs.push(preservedTab);
}

export function mergeGeneratedConfigWithExisting(
    generated: RoomDashboardConfig,
    existing?: RoomDashboardConfig | null,
    options: GenerationMergeOptions = {},
): GenerationMergeResult {
    const config = normalizeRoomDashboardConfig(clone(generated));
    const summary: GenerationMergeSummary = {
        preservedItems: 0,
        preservedTabs: 0,
    };

    if (!existing) {
        return { config, summary };
    }

    const existingConfig = normalizeRoomDashboardConfig(clone(existing));

    for (const existingRootItem of existingConfig.items.filter((item) => shouldPreserveItem(item, options))) {
        appendPreservedItems(config.tabs[0] ?? config, [existingRootItem]);
        summary.preservedItems += 1;
    }

    for (const existingTab of existingConfig.tabs) {
        if (shouldPreserveWholeTab(existingTab)) {
            appendPreservedTab(config, existingTab);
            summary.preservedTabs += 1;
            continue;
        }

        const preservedItems = existingTab.items.filter((item) => shouldPreserveItem(item, options));
        if (preservedItems.length === 0) continue;

        appendPreservedItems(findMatchingGeneratedTab(config, existingTab), preservedItems);
        summary.preservedItems += preservedItems.length;
    }

    if (config.tabs.length > 0 && !config.tabs.some((tab) => tab.id === config.activeTabId)) {
        config.activeTabId = config.tabs[0].id;
    }

    return { config, summary };
}
