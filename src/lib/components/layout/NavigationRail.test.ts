import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NavigationRail from './NavigationRail.svelte';
import { themeStore } from '$lib/stores/theme.svelte';

describe('NavigationRail Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders all navigation links', () => {
        render(NavigationRail);

        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Library')).toBeInTheDocument();
        expect(screen.getByText('Theme')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('marks current page as active', () => {
        render(NavigationRail);

        const homeLink = screen.getByText('Home').closest('a');
        expect(homeLink).toHaveAttribute('aria-current', 'page');
    });

    it('renders dark mode toggle button', () => {
        render(NavigationRail);

        expect(screen.getByLabelText('Toggle Dark Mode')).toBeInTheDocument();
    });

    it('toggles dark mode when button clicked', async () => {
        // Spy on themeStore isDark setter
        const originalIsDark = themeStore.isDark;

        render(NavigationRail);
        const toggleBtn = screen.getByLabelText('Toggle Dark Mode');

        await fireEvent.click(toggleBtn);

        // The toggle should have changed the value
        expect(themeStore.isDark).not.toBe(originalIsDark);

        // Toggle back
        await fireEvent.click(toggleBtn);
        expect(themeStore.isDark).toBe(originalIsDark);
    });

    it('has correct link hrefs', () => {
        render(NavigationRail);

        expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
        expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
        expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
    });
});
