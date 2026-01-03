// Entity Types
export * from './icons';
export interface HAEntityAttributes {
    friendly_name?: string;
    brightness?: number;
    supported_color_modes?: string[];
    supported_features?: number;
    [key: string]: unknown;
}

export interface HAEntity {
    entity_id: string;
    state: string;
    attributes: HAEntityAttributes;
    last_changed?: string;
    last_updated?: string;
}

// Card Types
export interface CardConfig {
    entityId: string;
    name: string;
    icon: string;
    onSave?: (config: CardConfig) => void;
}

export type CardVariant = 'switch' | 'slider';
export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';
export type MD3CardVariant = 'elevated' | 'filled' | 'outlined';
