// Dashboard Generator Utility
// Auto-generates GridConfig from Home Assistant entities

import type { HassEntities } from 'home-assistant-js-websocket';
import type {
    GridConfig,
    DashboardItem,
    ResponsiveLayout,
    DashboardCardType,
    DashboardHierarchy,
    HAArea
} from '$lib/types/dashboard';
import { createDefaultGridConfig, createDefaultItemLayout } from '$lib/types/dashboard';

/**
 * Entity domain to card type mapping
 */
const DOMAIN_TO_CARD_TYPE: Record<string, DashboardCardType> = {
    'light': 'button',
    'switch': 'button',
    'fan': 'button',
    'input_boolean': 'button',
    'script': 'button',
    'scene': 'button',
    'climate': 'thermostat',
    'media_player': 'media'
};

/**
 * Card type to default span configuration
 */
const CARD_TYPE_SPANS: Record<DashboardCardType, { desktop: number; mobile: number }> = {
    'button': { desktop: 2, mobile: 2 },
    'thermostat': { desktop: 4, mobile: 4 },
    'media': { desktop: 6, mobile: 4 }
};

/**
 * Extract domain from entity ID
 */
export function getDomain(entityId: string): string {
    return entityId.split('.')[0];
}

/**
 * Determine card type from entity domain
 */
export function getCardTypeForEntity(entityId: string): DashboardCardType | null {
    const domain = getDomain(entityId);
    return DOMAIN_TO_CARD_TYPE[domain] || null;
}

/**
 * Bento box packing algorithm - places items in a 12-column grid
 * Items are placed left-to-right, top-to-bottom with wrapping
 */
export function packItemsIntoGrid(
    items: Array<{ entityId: string; cardType: DashboardCardType }>,
    desktopColumns: number = 12,
    mobileColumns: number = 4
): DashboardItem[] {
    const result: DashboardItem[] = [];

    // Track grid occupancy for collision detection
    const desktopOccupancy: boolean[][] = []; // row -> col -> occupied
    const mobileOccupancy: boolean[][] = [];

    function getNextPosition(
        occupancy: boolean[][],
        colSpan: number,
        maxCols: number
    ): { col: number; row: number } {
        let row = 0;

        while (true) {
            // Ensure row exists
            if (!occupancy[row]) {
                occupancy[row] = new Array(maxCols).fill(false);
            }

            // Find first available position in this row
            for (let col = 0; col <= maxCols - colSpan; col++) {
                let fits = true;
                for (let c = col; c < col + colSpan; c++) {
                    if (occupancy[row][c]) {
                        fits = false;
                        break;
                    }
                }

                if (fits) {
                    // Mark as occupied
                    for (let c = col; c < col + colSpan; c++) {
                        occupancy[row][c] = true;
                    }
                    return { col: col + 1, row: row + 1 }; // 1-indexed for CSS Grid
                }
            }

            row++;
        }
    }

    for (const item of items) {
        const spans = CARD_TYPE_SPANS[item.cardType];

        const desktopPos = getNextPosition(desktopOccupancy, spans.desktop, desktopColumns);
        const mobilePos = getNextPosition(mobileOccupancy, spans.mobile, mobileColumns);

        result.push({
            id: crypto.randomUUID(),
            entityId: item.entityId,
            cardType: item.cardType,
            layout: {
                desktop: {
                    colStart: desktopPos.col,
                    colSpan: spans.desktop,
                    rowStart: desktopPos.row,
                    rowSpan: 1
                },
                mobile: {
                    colStart: mobilePos.col,
                    colSpan: spans.mobile,
                    rowStart: mobilePos.row,
                    rowSpan: 1
                }
            }
        });
    }

    return result;
}

/**
 * Filter entities to only those we can display as cards
 */
export function filterDisplayableEntities(entities: HassEntities): string[] {
    return Object.keys(entities).filter(entityId => {
        const domain = getDomain(entityId);
        // Only include domains we have card types for
        if (!DOMAIN_TO_CARD_TYPE[domain]) return false;

        // Filter out hidden/disabled entities
        const entity = entities[entityId];
        if (entity.attributes?.hidden) return false;

        return true;
    });
}

/**
 * Group entities by domain for organized display
 */
export function groupEntitiesByDomain(entityIds: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};

    for (const entityId of entityIds) {
        const domain = getDomain(entityId);
        if (!groups[domain]) {
            groups[domain] = [];
        }
        groups[domain].push(entityId);
    }

    return groups;
}

/**
 * Sort entities by priority (climate/media first, then buttons)
 */
export function sortEntitiesByPriority(entityIds: string[]): string[] {
    const priority: Record<string, number> = {
        'climate': 1,
        'media_player': 2,
        'light': 3,
        'switch': 4,
        'fan': 5,
        'scene': 6,
        'script': 7,
        'input_boolean': 8
    };

    return [...entityIds].sort((a, b) => {
        const domainA = getDomain(a);
        const domainB = getDomain(b);
        return (priority[domainA] || 99) - (priority[domainB] || 99);
    });
}

/**
 * Generate a complete dashboard configuration from Home Assistant entities
 */
export function generateDashboardFromHA(
    entities: HassEntities,
    name: string = "Auto-Generated Dashboard"
): GridConfig {
    // Filter to displayable entities
    const displayable = filterDisplayableEntities(entities);

    // Sort by priority
    const sorted = sortEntitiesByPriority(displayable);

    // Map to card types
    const items = sorted
        .map(entityId => ({
            entityId,
            cardType: getCardTypeForEntity(entityId)!
        }))
        .filter(item => item.cardType !== null);

    // Pack into grid
    const packedItems = packItemsIntoGrid(items);

    // Create config
    const config = createDefaultGridConfig(name);
    config.items = packedItems;

    return config;
}

/**
 * Generate dashboard for a specific area
 */
export function generateDashboardForArea(
    areaName: string,
    entityIds: string[],
    entities: HassEntities
): GridConfig {
    // Filter to only entities in the provided list that are displayable
    const displayable = entityIds.filter(id => {
        const domain = getDomain(id);
        return DOMAIN_TO_CARD_TYPE[domain] && entities[id];
    });

    const sorted = sortEntitiesByPriority(displayable);

    const items = sorted
        .map(entityId => ({
            entityId,
            cardType: getCardTypeForEntity(entityId)!
        }))
        .filter(item => item.cardType !== null);

    const packedItems = packItemsIntoGrid(items);

    const config = createDefaultGridConfig(areaName);
    config.items = packedItems;

    return config;
}

/**
 * Generate dashboard for a specific floor (combines all areas on that floor)
 */
export function generateDashboardForFloor(
    floorName: string,
    areas: HAArea[],
    areaEntities: Record<string, string[]>,
    entities: HassEntities
): GridConfig {
    // Combine all entities from all areas on this floor
    const allEntityIds: string[] = [];

    for (const area of areas) {
        const areaEnts = areaEntities[area.area_id] || [];
        allEntityIds.push(...areaEnts);
    }

    return generateDashboardForArea(floorName, allEntityIds, entities);
}
