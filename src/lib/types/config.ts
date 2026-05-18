import type { DashboardCardSurfaceStyle, RoomDashboardConfig, DashboardPage } from './dashboard';
import type { MAMediaItem } from './musicAssistant';
import type { AppLanguage } from '$lib/i18n';

export interface NavigationItem {
    id: string;
    label: string;
    icon: string;
    href: string;
}

export interface ThemeConfig {
    sourceColor: string;
    isDark: boolean;
    language: AppLanguage;
    navigationStyle: 'standard' | 'modern';
    navigationItems: NavigationItem[];
    cardRadius: number;
    tabPillRadius: number;
    cardSurfaceStyle?: DashboardCardSurfaceStyle;
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
    pages: DashboardPage[];
    musicLibrary?: MusicLibraryConfig;
    lockScreen?: LockScreenConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
    theme: {
        sourceColor: '#6750A4',
        isDark: false,
        language: 'nl',
        navigationStyle: 'standard',
        cardRadius: 12,
        tabPillRadius: 32,
        cardSurfaceStyle: 'md3',
        navigationItems: [
            { id: 'home', label: 'Start', icon: 'home', href: '/' },
            { id: 'dashboard', label: 'Woningdashboard', icon: 'home', href: '/dashboard' },
            { id: 'music', label: 'Muziek', icon: 'music_note', href: '/music' },
            { id: 'weather', label: 'Weer', icon: 'partly_cloudy_day', href: '/weather' },
            { id: 'library', label: 'Bibliotheek', icon: 'widgets', href: '/library' },
            { id: 'theme', label: 'Thema', icon: 'palette', href: '/theme' },
            { id: 'calendar', label: 'Agenda', icon: 'calendar_month', href: '/calendar' },
            { id: 'settings', label: 'Instellingen', icon: 'settings', href: '/settings' }
        ]
    },
    dashboards: {},
    pages: [],
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
