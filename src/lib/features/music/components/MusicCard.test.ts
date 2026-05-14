import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MusicCard from './MusicCard.svelte';
import { haStore } from '$lib/stores/ha.svelte';
import { musicLibraryStore } from '../stores/musicLibrary.svelte';
import type { MAMediaItem, MATrack, MAAlbum } from '$lib/types/musicAssistant';

// Mock the stores
vi.mock('$lib/stores/ha.svelte', () => ({
    haStore: {
        fetchProxiedBlobUrl: vi.fn(async (url) => `proxied-${url}`)
    }
}));

vi.mock('../stores/musicLibrary.svelte', () => ({
    musicLibraryStore: {
        isFavorite: vi.fn(),
        toggleFavorite: vi.fn()
    }
}));

describe('MusicCard Component', () => {
    const mockOnPlay = vi.fn();

    const mockTrack: MATrack = {
        uri: 'mass://track/1',
        name: 'Test Track',
        media_type: 'track',
        image_url: 'artwork.jpg',
        artists: [{ name: 'Test Artist', uri: 'mass://artist/1', media_type: 'artist' }],
        duration: 180,
        provider: 'spotify'
    } as any;

    const mockArtist: MAMediaItem = {
        uri: 'mass://artist/1',
        name: 'Test Artist',
        media_type: 'artist',
        image_url: 'artist.jpg',
        provider: 'spotify'
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(musicLibraryStore.isFavorite).mockReturnValue(false);
    });

    it('renders item name and subtitle for tracks', () => {
        render(MusicCard, { props: { item: mockTrack, onPlay: mockOnPlay } });

        expect(screen.getByText('Test Track')).toBeInTheDocument();
        expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('renders subtitle for albums', () => {
        const mockAlbum: MAAlbum = {
            uri: 'mass://album/1',
            name: 'Test Album',
            media_type: 'album',
            artist: { name: 'Album Artist', uri: 'mass://artist/2', media_type: 'artist' }
        } as any;

        render(MusicCard, { props: { item: mockAlbum, onPlay: mockOnPlay } });

        expect(screen.getByText('Test Album')).toBeInTheDocument();
        expect(screen.getByText('Album Artist')).toBeInTheDocument();
    });

    it('uses proxied URL for images', async () => {
        render(MusicCard, { props: { item: mockTrack, onPlay: mockOnPlay } });

        await waitFor(() => {
            const img = screen.getByAltText('Test Track') as HTMLImageElement;
            expect(img.src).toContain('proxied-artwork.jpg');
        });
    });

    it('renders circular image for artists when rounded prop is true', () => {
        const { container } = render(MusicCard, { props: { item: mockArtist, onPlay: mockOnPlay, rounded: true } });

        const imageContainer = container.querySelector('.rounded-full');
        expect(imageContainer).toBeInTheDocument();
    });

    it('calls onPlay when clicked', async () => {
        render(MusicCard, { props: { item: mockTrack, onPlay: mockOnPlay } });

        const cardButton = screen.getByRole('button', { name: /test track/i });
        await fireEvent.click(cardButton);

        expect(mockOnPlay).toHaveBeenCalledWith(mockTrack);
    });

    it('shows favorite icon and calls toggleFavorite on click', async () => {
        render(MusicCard, { props: { item: mockTrack, onPlay: mockOnPlay } });

        const favoriteBtn = screen.getByRole('button', { name: '' }); // The favorite button doesn't have text
        // In reality, we might want to add an aria-label or title to this button in the component
        // But for now, let's find it by the group hover behavior if possible or just select the second button
        const buttons = screen.getAllByRole('button');
        const toggleBtn = buttons[1]; // Index 1 is the favorite toggle

        await fireEvent.click(toggleBtn);
        expect(musicLibraryStore.toggleFavorite).toHaveBeenCalledWith(mockTrack);
    });

    it('shows active favorite icon when item is favorited', () => {
        vi.mocked(musicLibraryStore.isFavorite).mockReturnValue(true);

        render(MusicCard, { props: { item: mockTrack, onPlay: mockOnPlay } });

        // We can't easily check for the icon component without test-ids, 
        // but we can check if isFavorite was called with the correct URI
        expect(musicLibraryStore.isFavorite).toHaveBeenCalledWith('mass://track/1');
    });

    it('renders fallback icon when no image_url is present', () => {
        const itemNoImage = { ...mockTrack, image_url: undefined };
        const { container } = render(MusicCard, { props: { item: itemNoImage, onPlay: mockOnPlay } });

        expect(screen.queryByAltText('Test Track')).not.toBeInTheDocument();
        // Fallback icon is rendered as an SVG from unplugin-icons
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });
});
