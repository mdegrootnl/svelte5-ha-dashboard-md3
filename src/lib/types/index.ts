// Entity Types
export * from './icons';
export interface HAEntityAttributes {
    friendly_name?: string;
    brightness?: number;
    supported_color_modes?: string[];
    supported_features?: number;
    [key: string]: unknown;
}

// Climate Entity Attributes (extends base)
export interface ClimateEntityAttributes extends HAEntityAttributes {
    current_temperature?: number;
    temperature?: number;          // target setpoint
    hvac_mode?: string;
    hvac_modes?: string[];
    hvac_action?: string;          // heating, cooling, idle, off
    min_temp?: number;
    max_temp?: number;
    target_temp_step?: number;
}

export interface HAEntity {
    entity_id: string;
    state: string;
    attributes: HAEntityAttributes;
    last_changed?: string;
    last_updated?: string;
}

// History Types
export interface HistoryDataPoint {
    timestamp: Date;
    state: string;
    value: number | null;
}

export interface HistoryData {
    entityId: string;
    points: HistoryDataPoint[];
}

// Card Types
export type CardSize = 'condensed' | 'standard' | 'poster';

export interface BaseCardConfig {
    entityId: string;
    name: string;
    icon?: string;
    type?: 'button' | 'thermostat' | 'media';
    onSave?: (config: CardConfig) => void;
    /** Optional domain filter for entity picker (e.g. "light", "switch") */
    domainFilter?: string;
    /** Card size variant for grid layout */
    cardSize?: CardSize;
}

export interface ButtonCardConfig extends BaseCardConfig {
    type?: 'button';
}

export interface ThermostatCardConfig extends BaseCardConfig {
    type: 'thermostat';
    secondaryEntityId?: string;    // Outdoor sensor
    secondaryName?: string;        // Override for "Outside" label
}

export interface MediaCardConfig extends BaseCardConfig {
    type: 'media';
}

export type CardConfig = ButtonCardConfig | ThermostatCardConfig | MediaCardConfig;

export type CardVariant = 'switch' | 'slider';
export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';
export type MD3CardVariant = 'elevated' | 'filled' | 'outlined';


// Registry Types
export interface HAAreaRegistryEntry {
    area_id: string;
    name: string;
    picture: string | null;
    floor_id: string | null;
    icon: string | null;
    labels: string[];
}

export interface HAFloorRegistryEntry {
    floor_id: string;
    name: string;
    level: number | null;
    icon: string | null;
    aliases: string[];
}

export interface HAEntityRegistryEntry {
    entity_id: string;
    name: string;
    icon: string | null;
    platform: string;
    config_entry_id: string | null;
    device_id: string | null;
    area_id: string | null;
    disabled_by: string | null;
    hidden_by: string | null;
    entity_category: 'config' | 'diagnostic' | null;
    has_entity_name: boolean;
    original_name: string;
    unique_id: string;
    options: Record<string, unknown> | null;
    translation_key: string | null;
    labels: string[];
}
