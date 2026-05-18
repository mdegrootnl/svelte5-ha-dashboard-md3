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

        expect(screen.getByText('Start')).toBeInTheDocument();
        expect(screen.getByText('Woningdashboard')).toBeInTheDocument();
        expect(screen.getByText('Bibliotheek')).toBeInTheDocument();
        expect(screen.getByText('Thema')).toBeInTheDocument();
        expect(screen.getByText('Instellingen')).toBeInTheDocument();
    });

    it('marks current page as active', () => {
        render(NavigationRail);

        const homeLink = screen.getByText('Start').closest('a');
        expect(homeLink).toHaveAttribute('aria-current', 'page');
    });

    it('renders dark mode toggle button', () => {
        render(NavigationRail);

        expect(screen.getByLabelText('Donkere modus wisselen')).toBeInTheDocument();
    });

    it('toggles dark mode when button clicked', async () => {
        // Spy on themeStore isDark setter
        const originalIsDark = themeStore.isDark;

        render(NavigationRail);
        const toggleBtn = screen.getByLabelText('Donkere modus wisselen');

        await fireEvent.click(toggleBtn);

        // The toggle should have changed the value
        expect(themeStore.isDark).not.toBe(originalIsDark);

        // Toggle back
        await fireEvent.click(toggleBtn);
        expect(themeStore.isDark).toBe(originalIsDark);
    });

    it('has correct link hrefs', () => {
        render(NavigationRail);

        expect(screen.getByText('Start').closest('a')).toHaveAttribute('href', '/');
        expect(screen.getByText('Woningdashboard').closest('a')).toHaveAttribute('href', '/dashboard');
        expect(screen.getByText('Instellingen').closest('a')).toHaveAttribute('href', '/settings');
    });

    it('keeps the full translated label available on constrained rail links', () => {
        render(NavigationRail);

        expect(screen.getByText('Woningdashboard').closest('a')).toHaveAttribute(
            'title',
            'Woningdashboard',
        );
    });
});
