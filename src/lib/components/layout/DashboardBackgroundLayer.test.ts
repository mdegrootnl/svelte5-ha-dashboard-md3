import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import DashboardBackgroundLayer from './DashboardBackgroundLayer.svelte';

describe('DashboardBackgroundLayer', () => {
    it('renders child content without a configured background', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Dashboard content</span>' }));

        render(DashboardBackgroundLayer, { props: { children } });

        expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    });

    it('can render as a full viewport background frame', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Dashboard content</span>' }));

        const { container } = render(DashboardBackgroundLayer, {
            props: { children, variant: 'viewport', class: 'custom-view' },
        });

        const frame = container.firstElementChild;
        expect(frame).toHaveClass('h-full');
        expect(frame).toHaveClass('w-full');
        expect(frame).toHaveClass('custom-view');
        expect(frame).not.toHaveClass('rounded-m3-card');
    });

    it('shows external provider attribution for enabled backgrounds', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Dashboard content</span>' }));

        render(DashboardBackgroundLayer, {
            props: {
                children,
                background: {
                    enabled: true,
                    source: 'pexels',
                    imageUrl: 'https://images.pexels.com/photos/home.jpeg',
                    accentColor: '#91a87c',
                    objectPosition: 'center',
                    scrimOpacity: 0.58,
                    imageAttribution: {
                        provider: 'pexels',
                        sourceName: 'Pexels',
                        sourceUrl: 'https://www.pexels.com/photo/home/',
                        authorName: 'Ada Lovelace',
                        photoId: '123',
                        licenseUrl: 'https://www.pexels.com/license/',
                    },
                },
            },
        });

        expect(screen.getByLabelText(/Photo by Ada Lovelace on Pexels/)).toBeInTheDocument();
    });

    it('pins viewport attribution above the page chrome', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Dashboard content</span>' }));

        render(DashboardBackgroundLayer, {
            props: {
                children,
                variant: 'viewport',
                background: {
                    enabled: true,
                    source: 'unsplash',
                    imageUrl: 'https://images.unsplash.com/photo-home',
                    imageAttribution: {
                        provider: 'unsplash',
                        sourceName: 'Unsplash',
                        sourceUrl: 'https://unsplash.com/photos/home',
                        authorName: 'Grace Hopper',
                        photoId: 'abc',
                    },
                },
            },
        });

        expect(screen.getByLabelText(/Photo by Grace Hopper on Unsplash/)).toHaveClass('fixed');
    });
});
