import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import MusicMiniPlayer from './MusicMiniPlayer.svelte';

const mockMaStore = vi.hoisted(() => ({
    activePlayerId: 'media_player.kitchen',
    players: {
        'media_player.kitchen': {
            state: 'playing',
            attributes: { friendly_name: 'Kitchen speaker' },
        },
    },
    nowPlaying: {
        title: 'Test track',
        artist: 'Test artist',
        album: 'Test album',
        artwork: null,
        duration: 180,
        position: 30,
        volume: 0.42,
        isMuted: false,
        isPlaying: true,
        supported_features: 16 | 32,
    },
    playPause: vi.fn(),
    previous: vi.fn(),
    next: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
}));

vi.mock('../stores/maStore.svelte', () => ({
    maStore: mockMaStore,
}));

vi.mock('$lib/stores/theme.svelte', () => ({
    themeStore: {
        t: (key: string) =>
            ({
                'music.nowPlaying': 'Now playing',
                'music.previous': 'Previous',
                'music.next': 'Next',
                'music.pause': 'Pause',
                'music.play': 'Play',
                'music.mute': 'Mute',
                'music.volume': 'Volume',
                'common.unknownArtist': 'Unknown artist',
            })[key] ?? key,
    },
}));

vi.mock('$lib/stores/ha.svelte', () => ({
    haStore: {
        fetchProxiedBlobUrl: vi.fn(async (source: string) => source),
    },
}));

describe('MusicMiniPlayer', () => {
    it('gives the tablet and desktop volume control a wider centered lane', () => {
        render(MusicMiniPlayer);

        const slider = screen.getByLabelText('Volume');
        const volumeLane = slider.closest('div');

        expect(slider).toHaveClass('w-full', 'min-w-40', 'max-w-72');
        expect(volumeLane).toHaveClass('justify-center', 'md:flex', 'flex-1');
    });
});
