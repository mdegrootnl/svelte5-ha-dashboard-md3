import type { HAEntityAttributes } from '$lib/types';

/**
 * Check if an entity supports brightness control
 */
export function supportsBrightness(attributes: HAEntityAttributes): boolean {
    if (attributes.supported_color_modes) {
        return attributes.supported_color_modes.some(mode =>
            ['brightness', 'hs', 'xy', 'rgb', 'rgbw', 'color_temp'].includes(mode)
        );
    }
    return ((attributes.supported_features ?? 0) & 1) !== 0;
}

/**
 * Extract domain from entity ID (e.g., "light.living_room" → "light")
 */
export function getDomain(entityId: string): string {
    return entityId.split('.')[0];
}

/**
 * Get friendly display name for an entity
 */
export function getEntityName(entityId: string, attributes: HAEntityAttributes): string {
    return attributes.friendly_name || entityId || 'Unknown';
}

/**
 * Check if entity is in an active/on state
 */
export function isEntityActive(state: string): boolean {
    return state === 'on' ||
        (state !== 'off' && state !== 'unavailable' && state !== 'unknown');
}

/**
 * Get display icon for HVAC action
 */
export function getHvacIcon(action?: string): string {
    switch (action) {
        case 'heating': return 'material-symbols:local-fire-department';
        case 'cooling': return 'material-symbols:ac-unit';
        case 'idle': return 'material-symbols:thermostat';
        default: return 'material-symbols:power-settings-new';
    }
}

/**
 * Format temperature with unit
 */
export function formatTemperature(value: number | undefined | null, unit = '°C'): string {
    if (value === undefined || value === null) return '--';
    return `${value.toFixed(1)} ${unit}`;
}
