import type { RoomDashboardConfig } from './dashboard';

export interface ThemeConfig {
    sourceColor: string;
    isDark: boolean;
}

export interface AppConfig {
    theme: ThemeConfig;
    dashboards: Record<string, RoomDashboardConfig>;
}

export const DEFAULT_CONFIG: AppConfig = {
    theme: {
        sourceColor: '#6750A4',
        isDark: false
    },
    dashboards: {}
};
