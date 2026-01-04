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
export interface BaseCardConfig {
    entityId: string;
    name: string;
    icon: string;
    type?: 'button' | 'thermostat';
    onSave?: (config: CardConfig) => void;
}

export interface ButtonCardConfig extends BaseCardConfig {
    type?: 'button';
}

export interface ThermostatCardConfig extends BaseCardConfig {
    type: 'thermostat';
    secondaryEntityId?: string;    // Outdoor sensor
    secondaryName?: string;        // Override for "Outside" label
}

export type CardConfig = ButtonCardConfig | ThermostatCardConfig;

export type CardVariant = 'switch' | 'slider';
export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';
export type MD3CardVariant = 'elevated' | 'filled' | 'outlined';
