import type { RoomDashboardConfig } from './dashboard';
import type { MAMediaItem } from './musicAssistant';

export interface NavigationItem {
    id: string;
    label: string;
    icon: string;
    href: string;
}

export interface ThemeConfig {
    sourceColor: string;
    isDark: boolean;
    navigationStyle: 'standard' | 'modern';
    navigationItems: NavigationItem[];
}

export interface MusicLibraryConfig {
    favorites: MAMediaItem[];
    lastSyncedAt: number;
    defaultPlayerId?: string;
}

export interface LockScreenConfig {
    enabled: boolean;
    timeout: number; // in seconds
    backgroundLandscape: string;
    backgroundPortrait: string;
}

export interface AppConfig {
    theme: ThemeConfig;
    dashboards: Record<string, RoomDashboardConfig>;
    musicLibrary?: MusicLibraryConfig;
    lockScreen?: LockScreenConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
    theme: {
        sourceColor: '#6750A4',
        isDark: false,
        navigationStyle: 'standard',
        navigationItems: [
            { id: 'home', label: 'Home', icon: 'home', href: '/' },
            { id: 'dashboard', label: 'Home Dashboard', icon: 'home', href: '/dashboard' },
            { id: 'music', label: 'Music', icon: 'music_note', href: '/music' },
            { id: 'weather', label: 'Weather', icon: 'partly_cloudy_day', href: '/weather' },
            { id: 'library', label: 'Library', icon: 'widgets', href: '/library' },
            { id: 'theme', label: 'Theme', icon: 'palette', href: '/theme' },
            { id: 'calendar', label: 'Calendar', icon: 'calendar_month', href: '/calendar' },
            { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' }
        ]
    },
    dashboards: {},
    musicLibrary: {
        favorites: [],
        lastSyncedAt: 0,
        defaultPlayerId: undefined
    },
    lockScreen: {
        enabled: true,
        timeout: 300,
        backgroundLandscape: '', // User will configure these
        backgroundPortrait: ''
    }
};
