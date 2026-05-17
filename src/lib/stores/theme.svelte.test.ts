import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeStore } from './theme.svelte';

describe('ThemeStore', () => {
    beforeEach(() => {
        document.documentElement.className = '';
        document.documentElement.style.cssText = '';
    });

    it('should have initial state', () => {
        const store = new ThemeStore();
        expect(store.sourceColor).toBe('#6750A4');
        expect(store.isDark).toBe(false);
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
            navigationStyle: 'standard',
            navigationItems: [],
            cardRadius: 12,
            tabPillRadius: 32,
            cardSurfaceStyle: 'soft',
        });
        expect(store.cardSurfaceStyle).toBe('soft');
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
