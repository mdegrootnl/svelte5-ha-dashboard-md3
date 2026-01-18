import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MediaVolume from './MediaVolume.svelte';
import { haStore } from '$lib';

describe('MediaVolume Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(haStore, 'getEntity').mockReturnValue(undefined as any);
        vi.spyOn(haStore, 'callService').mockResolvedValue(undefined);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders volume slider', () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'playing',
            attributes: { volume_level: 0.5 }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaVolume, { props: { entityId: 'media_player.test' } });

        const slider = screen.getByRole('slider');
        expect(slider).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('displays correct volume percentage', () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'playing',
            attributes: { volume_level: 0.75 }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaVolume, { props: { entityId: 'media_player.test' } });
        expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('calls volume_set on slider change after debounce', async () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'playing',
            attributes: { volume_level: 0.5 }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaVolume, { props: { entityId: 'media_player.test' } });
        const slider = screen.getByRole('slider');

        await fireEvent.input(slider, { target: { value: '80' } });

        // Advance timer past debounce
        vi.advanceTimersByTime(600);

        expect(haStore.callService).toHaveBeenCalledWith('media_player', 'volume_set', {
            entity_id: 'media_player.test',
            volume_level: 0.8
        });
    });

    it('applies dark theme styles', () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'playing',
            attributes: { volume_level: 0.5 }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(MediaVolume, { props: { entityId: 'media_player.test', theme: 'dark' } });

        expect(container.querySelector('.text-white\\/60')).toBeInTheDocument();
    });
});
