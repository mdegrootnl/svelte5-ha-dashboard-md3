import type { RoomDashboardConfig } from './dashboard';
import type { MAMediaItem } from './musicAssistant';

export interface ThemeConfig {
    sourceColor: string;
    isDark: boolean;
}

export interface MusicLibraryConfig {
    favorites: MAMediaItem[];
    lastSyncedAt: number;
    defaultPlayerId?: string;
}

export interface AppConfig {
    theme: ThemeConfig;
    dashboards: Record<string, RoomDashboardConfig>;
    musicLibrary?: MusicLibraryConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
    theme: {
        sourceColor: '#6750A4',
        isDark: false
    },
    dashboards: {},
    musicLibrary: {
        favorites: [],
        lastSyncedAt: 0,
        defaultPlayerId: undefined
    }
};
