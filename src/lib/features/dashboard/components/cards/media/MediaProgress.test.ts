import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MediaProgress from './MediaProgress.svelte';
import { haStore } from '$lib';

describe('MediaProgress Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(haStore, 'getEntity').mockReturnValue(undefined as any);
    });

    it('renders nothing when no duration', () => {
        const entity = { entity_id: 'media_player.test', state: 'playing', attributes: {} };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(MediaProgress, { props: { entityId: 'media_player.test' } });
        // Component should not render the progress bar container since duration is 0
        expect(container.querySelector('.flex-col')).toBeNull();
    });

    it('renders progress bar with duration', () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'paused', // Use paused to avoid animation frame issues
            attributes: {
                media_duration: 180,
                media_position: 0
            }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(MediaProgress, { props: { entityId: 'media_player.test' } });

        // Should show time labels - 0:00 and 3:00
        expect(screen.getByText('0:00')).toBeInTheDocument();
        expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('formats time correctly', () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'paused',
            attributes: {
                media_duration: 125,
                media_position: 65
            }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaProgress, { props: { entityId: 'media_player.test' } });

        expect(screen.getByText('1:05')).toBeInTheDocument();
        expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('applies dark theme styles', () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'paused',
            attributes: { media_duration: 100, media_position: 50 }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(MediaProgress, { props: { entityId: 'media_player.test', theme: 'dark' } });

        expect(container.querySelector('.bg-white\\/20')).toBeInTheDocument();
    });
});
