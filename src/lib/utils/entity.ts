import type { AppLanguage } from '$lib/i18n';
import { translate } from '$lib/i18n';
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

const GENERIC_STATE_KEYS: Record<string, string> = {
    on: 'entityState.on',
    off: 'entityState.off',
    open: 'entityState.open',
    opening: 'entityState.opening',
    closed: 'entityState.closed',
    closing: 'entityState.closing',
    playing: 'entityState.playing',
    paused: 'entityState.paused',
    unavailable: 'entityState.unavailable',
    unknown: 'entityState.unknown',
    home: 'entityState.home',
    active: 'entityState.active',
    inactive: 'entityState.inactive',
    locked: 'entityState.locked',
    unlocked: 'entityState.unlocked',
};

const BINARY_SENSOR_STATE_KEYS: Record<string, { on: string; off: string }> = {
    door: {
        on: 'entityState.binarySensor.opening.on',
        off: 'entityState.binarySensor.opening.off',
    },
    garage_door: {
        on: 'entityState.binarySensor.opening.on',
        off: 'entityState.binarySensor.opening.off',
    },
    opening: {
        on: 'entityState.binarySensor.opening.on',
        off: 'entityState.binarySensor.opening.off',
    },
    window: {
        on: 'entityState.binarySensor.opening.on',
        off: 'entityState.binarySensor.opening.off',
    },
    motion: {
        on: 'entityState.binarySensor.motion.on',
        off: 'entityState.binarySensor.motion.off',
    },
    moving: {
        on: 'entityState.binarySensor.moving.on',
        off: 'entityState.binarySensor.moving.off',
    },
    vibration: {
        on: 'entityState.binarySensor.vibration.on',
        off: 'entityState.binarySensor.vibration.off',
    },
    occupancy: {
        on: 'entityState.binarySensor.occupancy.on',
        off: 'entityState.binarySensor.occupancy.off',
    },
    presence: {
        on: 'entityState.binarySensor.presence.on',
        off: 'entityState.binarySensor.presence.off',
    },
    moisture: {
        on: 'entityState.binarySensor.moisture.on',
        off: 'entityState.binarySensor.moisture.off',
    },
    smoke: {
        on: 'entityState.binarySensor.detected.on',
        off: 'entityState.binarySensor.detected.off',
    },
    gas: {
        on: 'entityState.binarySensor.detected.on',
        off: 'entityState.binarySensor.detected.off',
    },
    carbon_monoxide: {
        on: 'entityState.binarySensor.detected.on',
        off: 'entityState.binarySensor.detected.off',
    },
    problem: {
        on: 'entityState.binarySensor.problem.on',
        off: 'entityState.binarySensor.problem.off',
    },
    safety: {
        on: 'entityState.binarySensor.safety.on',
        off: 'entityState.binarySensor.safety.off',
    },
    tamper: {
        on: 'entityState.binarySensor.tamper.on',
        off: 'entityState.binarySensor.tamper.off',
    },
    battery: {
        on: 'entityState.binarySensor.battery.on',
        off: 'entityState.binarySensor.battery.off',
    },
    battery_charging: {
        on: 'entityState.binarySensor.batteryCharging.on',
        off: 'entityState.binarySensor.batteryCharging.off',
    },
    connectivity: {
        on: 'entityState.binarySensor.connectivity.on',
        off: 'entityState.binarySensor.connectivity.off',
    },
    lock: {
        on: 'entityState.binarySensor.lock.on',
        off: 'entityState.binarySensor.lock.off',
    },
    plug: {
        on: 'entityState.binarySensor.power.on',
        off: 'entityState.binarySensor.power.off',
    },
    power: {
        on: 'entityState.binarySensor.power.on',
        off: 'entityState.binarySensor.power.off',
    },
    running: {
        on: 'entityState.binarySensor.running.on',
        off: 'entityState.binarySensor.running.off',
    },
    light: {
        on: 'entityState.binarySensor.light.on',
        off: 'entityState.binarySensor.light.off',
    },
    sound: {
        on: 'entityState.binarySensor.sound.on',
        off: 'entityState.binarySensor.sound.off',
    },
    cold: {
        on: 'entityState.binarySensor.cold.on',
        off: 'entityState.binarySensor.cold.off',
    },
    heat: {
        on: 'entityState.binarySensor.heat.on',
        off: 'entityState.binarySensor.heat.off',
    },
    update: {
        on: 'entityState.binarySensor.update.on',
        off: 'entityState.binarySensor.update.off',
    },
};

export interface EntityStateLabelOptions {
    entityId?: string;
    domain?: string;
    attributes?: HAEntityAttributes;
    deviceClass?: string | null;
    unit?: string | null;
    language?: AppLanguage;
}

function getAttributeText(attributes: HAEntityAttributes | undefined, key: string) {
    const value = attributes?.[key];
    return typeof value === 'string' ? value : '';
}

/**
 * Formats Home Assistant's raw state values for display.
 * HA exposes binary sensor states as on/off, so device_class is needed to show
 * labels like Open/Gesloten or Beweging/Geen beweging.
 */
export function formatEntityStateLabel(
    state: string | null | undefined,
    options: EntityStateLabelOptions = {},
): string {
    const trimmedState = `${state ?? ''}`.trim();
    if (!trimmedState) return '';

    const language = options.language ?? 'nl';
    const unit = (options.unit ?? getAttributeText(options.attributes, 'unit_of_measurement')).trim();
    if (unit) return `${trimmedState}${unit}`;

    const normalizedState = trimmedState.toLowerCase();
    const domain = options.domain ?? (options.entityId ? getDomain(options.entityId) : '');
    const deviceClass = (
        options.deviceClass ??
        getAttributeText(options.attributes, 'device_class')
    )?.toLowerCase();

    if (domain === 'binary_sensor' && deviceClass) {
        const stateKeys = BINARY_SENSOR_STATE_KEYS[deviceClass];
        const stateKey = normalizedState === 'on'
            ? stateKeys?.on
            : normalizedState === 'off'
                ? stateKeys?.off
                : undefined;
        if (stateKey) return translate(language, stateKey);
    }

    const genericKey = GENERIC_STATE_KEYS[normalizedState];
    if (genericKey) return translate(language, genericKey);

    return trimmedState.replaceAll('_', ' ');
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

/**
 * Get default icon name for an entity domain
 */
export function getEntityIcon(domain: string): string {
    const iconMap: Record<string, string> = {
        light: 'lightbulb',
        switch: 'toggle-on',
        climate: 'thermostat',
        sensor: 'sensors',
        binary_sensor: 'radio-button-checked',
        media_player: 'play-circle',
        fan: 'mode-fan',
        cover: 'blinds',
        lock: 'lock',
        camera: 'videocam',
        vacuum: 'cleaning-services',
        weather: 'partly-cloudy-day',
        automation: 'smart-toy',
        script: 'code',
        scene: 'palette',
        group: 'workspaces',
        input_boolean: 'toggle-on',
        input_number: 'dialpad',
        input_text: 'text-fields',
        input_select: 'list',
        person: 'person',
        zone: 'location-on',
        sun: 'wb-sunny',
        timer: 'timer',
        counter: 'plus-one',
    };
    return iconMap[domain] || 'devices';
}
