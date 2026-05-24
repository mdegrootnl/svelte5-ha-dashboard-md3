import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeStore } from './theme.svelte';
import { DEFAULT_CONFIG } from '$lib/types/config';

describe('ThemeStore', () => {
    beforeEach(() => {
        document.documentElement.className = '';
        document.documentElement.style.cssText = '';
    });

    it('should have initial state', () => {
        const store = new ThemeStore();
        expect(store.sourceColor).toBe('#6750A4');
        expect(store.isDark).toBe(false);
        expect(store.language).toBe('nl');
        expect(store.cardRadius).toBe(12);
        expect(store.tabPillRadius).toBe(32);
        expect(store.cardSurfaceStyle).toBe('md3');
    });

    it('should derive a valid theme', () => {
        const store = new ThemeStore();
        expect(store.theme).toBeDefined();
        expect(store.theme.schemes).toBeDefined();
        expect(store.theme.palettes).toBeDefined();
    });

    it('should update theme when sourceColor changes', () => {
        const store = new ThemeStore();
        const initialTheme = store.theme;
        store.sourceColor = '#ff0000';
        expect(store.theme).not.toBe(initialTheme);
    });

    it('should apply theme to document (manual call via any for test)', () => {
        const store = new ThemeStore();
        store.setCardRadius(18);
        store.setTabPillRadius(24);
        (store as any).applyToDocument();

        const root = document.documentElement;
        expect(root.lang).toBe('nl');
        expect(root.style.getPropertyValue('--color-m3-primary')).toBeDefined();
        expect(root.style.getPropertyValue('--radius-m3-card')).toBe('18px');
        expect(root.style.getPropertyValue('--radius-m3-tab-pill')).toBe('24px');
        expect(root.classList.contains('dark')).toBe(false);
    });

    it('should update and normalize card surface style', () => {
        const store = new ThemeStore();
        store.setCardSurfaceStyle('glass');
        expect(store.cardSurfaceStyle).toBe('glass');

        store.init({
            sourceColor: '#6750A4',
            isDark: false,
            language: 'nl',
            navigationStyle: 'standard',
            navigationItems: [],
            cardRadius: 12,
            tabPillRadius: 32,
            cardSurfaceStyle: 'soft',
        });
        expect(store.cardSurfaceStyle).toBe('soft');
    });

    it('should set language and translate labels', () => {
        const store = new ThemeStore();
        store.setLanguage('en');

        expect(store.language).toBe('en');
        expect(store.t('settings.title')).toBe('Settings');
        expect(store.navigationLabel({
            id: 'music',
            label: 'Music',
            icon: 'music_note',
            href: '/music',
        })).toBe('Music');

        store.setLanguage('de');

        expect(store.language).toBe('de');
        expect(store.t('settings.title')).toBe('Einstellungen');
        expect(store.navigationLabel({
            id: 'music',
            label: 'Music',
            icon: 'music_note',
            href: '/music',
        })).toBe('Musik');
        expect(store.navigationLabel({
            id: 'music',
            label: 'Audio',
            icon: 'music_note',
            href: '/music',
        })).toBe('Audio');
    });

    it('adds default roadmap navigation items for legacy uncustomized navigation', () => {
        const store = new ThemeStore();
        const legacyItems = DEFAULT_CONFIG.theme.navigationItems.filter((item) => !['attention', 'presence'].includes(item.id));

        store.init({
            ...DEFAULT_CONFIG.theme,
            navigationItems: legacyItems,
        });

        expect(store.navigationItems.map((item) => item.id)).toEqual([
            'dashboard',
            'attention',
            'presence',
            'music',
            'meals',
            'weather',
            'library',
            'theme',
            'calendar',
            'settings',
        ]);
    });

    it('adds Presence to the previous Attention default navigation', () => {
        const store = new ThemeStore();
        const attentionDefaultItems = DEFAULT_CONFIG.theme.navigationItems.filter((item) => item.id !== 'presence');

        store.init({
            ...DEFAULT_CONFIG.theme,
            navigationItems: attentionDefaultItems,
        });

        expect(store.navigationItems.map((item) => item.id)).toEqual(DEFAULT_CONFIG.theme.navigationItems.map((item) => item.id));
    });

    it('upgrades early default navigation with a manually added generic Meals route', () => {
        const store = new ThemeStore();

        store.init({
            ...DEFAULT_CONFIG.theme,
            navigationItems: [
                { id: 'dashboard', label: 'Home Dashboard', icon: 'home', href: '/dashboard' },
                { id: 'music', label: 'Music', icon: 'music_note', href: '/music' },
                { id: 'weather', label: 'Weather', icon: 'partly_cloudy_day', href: '/weather' },
                { id: 'library', label: 'Library', icon: 'widgets', href: '/library' },
                { id: 'theme', label: 'Theme', icon: 'palette', href: '/theme' },
                { id: 'calendar', label: 'Calendar', icon: 'calendar_month', href: '/calendar' },
                { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
                { id: 'custom-meals', label: 'Maaltijden', icon: 'circle', href: '/meals' },
            ],
        });

        expect(store.navigationItems.map((item) => item.id)).toEqual(DEFAULT_CONFIG.theme.navigationItems.map((item) => item.id));
        expect(store.navigationItems.find((item) => item.id === 'meals')?.icon).toBe('restaurant');
        expect(store.navigationItems.find((item) => item.id === 'attention')?.icon).toBe('notifications_active');
        expect(store.navigationItems.find((item) => item.id === 'presence')?.icon).toBe('group');
        expect(store.navigationItems.map((item) => item.id)).not.toContain('home');
    });

    it('removes the recent duplicate Start route from default navigation', () => {
        const store = new ThemeStore();

        store.init({
            ...DEFAULT_CONFIG.theme,
            navigationItems: [
                { id: 'home', label: 'Start', icon: 'home', href: '/' },
                ...DEFAULT_CONFIG.theme.navigationItems,
            ],
        });

        expect(store.navigationItems.map((item) => item.id)).toEqual(DEFAULT_CONFIG.theme.navigationItems.map((item) => item.id));
        expect(store.navigationItems.map((item) => item.id)).not.toContain('home');
    });

    it('repairs generic icons for known routes inside customized navigation layouts', () => {
        const store = new ThemeStore();

        store.init({
            ...DEFAULT_CONFIG.theme,
            navigationItems: [
                { id: 'dinner-shortcut', label: 'Diner', icon: 'circle', href: '/meals' },
                { id: 'music', label: 'Audio', icon: 'music_note', href: '/music' },
            ],
        });

        expect(store.navigationItems).toMatchObject([
            { id: 'meals', label: 'Diner', icon: 'restaurant', href: '/meals' },
            { id: 'music', label: 'Audio', icon: 'music_note', href: '/music' },
        ]);
    });

    it('repairs generic icons for known routes when navigation is edited', () => {
        const store = new ThemeStore();

        store.init(DEFAULT_CONFIG.theme);
        store.setNavigationItems([
            { id: 'custom-presence', label: 'Thuis', icon: 'circle', href: '/presence' },
            { id: 'custom-meals', label: 'Eten', icon: 'radio_button_unchecked', href: '/meals' },
        ]);

        expect(store.navigationItems).toMatchObject([
            { id: 'presence', label: 'Thuis', icon: 'group', href: '/presence' },
            { id: 'meals', label: 'Eten', icon: 'restaurant', href: '/meals' },
        ]);
    });

    it('does not re-add removed default routes during navigation edits', () => {
        const store = new ThemeStore();

        store.init(DEFAULT_CONFIG.theme);
        store.setNavigationItems(
            DEFAULT_CONFIG.theme.navigationItems.filter((item) => item.id !== 'presence'),
        );

        expect(store.navigationItems.map((item) => item.id)).not.toContain('presence');
    });

    it('does not add roadmap items to customized navigation layouts', () => {
        const store = new ThemeStore();

        store.init({
            ...DEFAULT_CONFIG.theme,
            navigationItems: [
                { id: 'dashboard', label: 'My Board', icon: 'home', href: '/dashboard' },
                { id: 'music', label: 'Audio', icon: 'music_note', href: '/music' },
            ],
        });

        expect(store.navigationItems.map((item) => item.id)).toEqual(['dashboard', 'music']);
    });

    it('should clamp card radius changes', () => {
        const store = new ThemeStore();

        store.setCardRadius(99);
        expect(store.cardRadius).toBe(32);

        store.setCardRadius(-10);
        expect(store.cardRadius).toBe(0);
    });

    it('should clamp tab pill radius changes', () => {
        const store = new ThemeStore();

        store.setTabPillRadius(99);
        expect(store.tabPillRadius).toBe(48);

        store.setTabPillRadius(-10);
        expect(store.tabPillRadius).toBe(0);
    });

    it('should apply dark mode classes when isDark is true', () => {
        const store = new ThemeStore();
        store.isDark = true;
        (store as any).applyToDocument();

        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should set surface container tokens in light mode', () => {
        const store = new ThemeStore();
        store.isDark = false;
        (store as any).applyToDocument();

        const root = document.documentElement;
        // neutral.tone(100) is white #ffffff
        expect(root.style.getPropertyValue('--color-m3-surface-container-lowest')).toBe('#ffffff');
    });

    it('should set surface container tokens in dark mode', () => {
        const store = new ThemeStore();
        store.isDark = true;
        (store as any).applyToDocument();

        const root = document.documentElement;
        expect(root.style.getPropertyValue('--color-m3-surface-container-lowest')).not.toBe('#ffffff');
    });
});
