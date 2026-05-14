import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MusicSection from './MusicSection.svelte';
import type { MAMediaItem } from '$lib/types/musicAssistant';

// Mock the stores used by child MusicCard
vi.mock('$lib/stores/ha.svelte', () => ({
    haStore: {
        fetchProxiedBlobUrl: vi.fn(async (url) => `proxied-${url}`)
    }
}));

vi.mock('../stores/musicLibrary.svelte', () => ({
    musicLibraryStore: {
        isFavorite: vi.fn().mockReturnValue(false),
        toggleFavorite: vi.fn()
    }
}));

describe('MusicSection Component', () => {
    const mockOnPlay = vi.fn();
    const mockItems: MAMediaItem[] = [
        { uri: 'mass://track/1', name: 'Track 1', media_type: 'track' },
        { uri: 'mass://track/2', name: 'Track 2', media_type: 'track' }
    ] as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the title when items are present', async () => {
        render(MusicSection, {
            props: {
                title: 'Test Section',
                items: mockItems,
                onPlay: mockOnPlay
            }
        });

        expect(screen.getByText('Test Section')).toBeInTheDocument();
        expect(screen.getByText('Track 1')).toBeInTheDocument();
        expect(screen.getByText('Track 2')).toBeInTheDocument();
    });

    it('renders items in the grid with correct classes', async () => {
        const { container } = render(MusicSection, {
            props: {
                title: 'Full Section',
                items: mockItems,
                onPlay: mockOnPlay
            }
        });

        const grid = container.querySelector('.grid');
        expect(grid).toBeInTheDocument();
        expect(grid).toHaveClass('grid-cols-2');
    });
});
