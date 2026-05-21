import metadata from '@iconify-json/material-symbols/metadata.json';

type MaterialSymbolsMetadata = {
    categories?: Record<string, string[]>;
};

const materialIconNames = new Set(
    Object.values((metadata as MaterialSymbolsMetadata).categories ?? {})
        .flat()
        .map((name) => normalizeIconName(name)),
);

const MATERIAL_ICON_ALIASES: Record<string, string> = {
    alert_circle: 'warning',
    bed_empty: 'bed',
    cart: 'shopping_cart',
    ceiling_light: 'light',
    cctv: 'videocam',
    cctv_off: 'videocam_off',
    clipboard_list: 'checklist',
    close_circle: 'cancel',
    countertop: 'countertops',
    door_closed: 'door_front',
    door_sliding: 'sensor_door',
    fridge: 'kitchen',
    help_circle: 'help',
    home_floor_0: 'layers',
    home_floor_1: 'layers',
    lamp: 'table_lamp',
    motion_sensor: 'motion_sensor_active',
    office_chair: 'chair',
    power_plug: 'outlet',
    refrigerator: 'kitchen',
    robot_vacuum: 'cleaning_services',
    room: 'meeting_room',
    shield_home: 'shield',
    shopping: 'shopping_cart',
    silverware: 'restaurant',
    silverware_fork_knife: 'restaurant',
    smoke_detector: 'detector_smoke',
    sofa: 'weekend',
    television: 'tv',
    television_classic: 'tv',
    toilet: 'wc',
    tumble_dryer: 'local_laundry_service',
    todo: 'checklist',
    update: 'system_update_alt',
    washing_machine: 'local_laundry_service',
    water_alert: 'water_drop',
};

const STYLE_SUFFIX_PATTERN = /_(outline|outlined|rounded|sharp|filled)$/;

export function normalizeIconName(icon?: string | null) {
    return (icon ?? '')
        .trim()
        .replace(/^[a-z0-9_-]+:/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

export function isMaterialIconName(icon?: string | null) {
    const normalized = normalizeIconName(icon);
    return normalized.length > 0 && materialIconNames.has(normalized);
}

function getHeuristicFallback(normalized: string) {
    if (!normalized) return undefined;
    if (normalized.includes('door')) return 'door_front';
    if (normalized.includes('window')) return 'window';
    if (normalized.includes('motion')) return 'motion_sensor_active';
    if (normalized.includes('presence') || normalized.includes('occupancy')) return 'sensor_occupied';
    if (normalized.includes('camera') || normalized.includes('cctv')) return 'videocam';
    if (normalized.includes('sofa') || normalized.includes('couch')) return 'weekend';
    if (normalized.includes('chair')) return 'chair';
    if (normalized.includes('light')) return 'lightbulb';
    if (normalized.includes('lamp')) return 'table_lamp';
    if (normalized.includes('fan')) return 'mode_fan';
    if (normalized.includes('shopping') || normalized.includes('grocery')) return 'shopping_cart';
    if (normalized.includes('todo') || normalized.includes('task') || normalized.includes('checklist')) return 'checklist';
    if (normalized.includes('vacuum') || normalized.includes('roborock')) return 'cleaning_services';
    if (normalized.includes('update')) return 'system_update_alt';
    if (normalized.includes('thermo') || normalized.includes('temp')) return 'thermostat';
    if (normalized.includes('battery')) return 'battery_alert';
    if (normalized.includes('water') || normalized.includes('leak') || normalized.includes('moisture')) return 'water_drop';
    if (normalized.includes('smoke')) return 'detector_smoke';
    if (normalized.includes('lock')) return 'lock';
    if (normalized.includes('garage')) return 'garage';
    if (normalized.includes('music')) return 'music_note';
    if (normalized.includes('tv') || normalized.includes('television')) return 'tv';
    if (normalized.includes('weather') || normalized.includes('cloud')) return 'partly_cloudy_day';
    if (normalized.includes('calendar')) return 'calendar_month';
    if (normalized.includes('energy') || normalized.includes('power') || normalized.includes('bolt')) return 'electric_bolt';
    if (normalized.includes('room')) return 'meeting_room';
    return undefined;
}

export function resolveMaterialIconName(icon?: string | null, fallback = 'devices') {
    const normalized = normalizeIconName(icon);
    const candidates = [
        MATERIAL_ICON_ALIASES[normalized],
        normalized,
        MATERIAL_ICON_ALIASES[normalized.replace(STYLE_SUFFIX_PATTERN, '')],
        normalized.replace(STYLE_SUFFIX_PATTERN, ''),
        getHeuristicFallback(normalized),
        normalizeIconName(fallback),
        'devices',
    ].filter(Boolean);

    for (const candidate of candidates) {
        const normalizedCandidate = normalizeIconName(candidate);
        if (isMaterialIconName(normalizedCandidate)) return normalizedCandidate;
    }

    return 'devices';
}
