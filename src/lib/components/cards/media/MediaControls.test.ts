import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MediaControls from './MediaControls.svelte';
import { haStore } from '$lib';

describe('MediaControls Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(haStore, 'getEntity').mockReturnValue(undefined as any);
        vi.spyOn(haStore, 'callService').mockResolvedValue(undefined);
    });

    it('renders all control buttons', () => {
        const entity = { entity_id: 'media_player.test', state: 'playing', attributes: {} };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaControls, { props: { entityId: 'media_player.test' } });

        expect(screen.getByLabelText('Previous Track')).toBeInTheDocument();
        expect(screen.getByLabelText('Pause')).toBeInTheDocument();
        expect(screen.getByLabelText('Next Track')).toBeInTheDocument();
    });

    it('shows Play button when paused', () => {
        const entity = { entity_id: 'media_player.test', state: 'paused', attributes: {} };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaControls, { props: { entityId: 'media_player.test' } });
        expect(screen.getByLabelText('Play')).toBeInTheDocument();
    });

    it('calls media_play_pause on toggle', async () => {
        const entity = { entity_id: 'media_player.test', state: 'playing', attributes: {} };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaControls, { props: { entityId: 'media_player.test' } });
        await fireEvent.click(screen.getByLabelText('Pause'));

        expect(haStore.callService).toHaveBeenCalledWith('media_player', 'media_play_pause', {
            entity_id: 'media_player.test'
        });
    });

    it('calls media_next_track on next', async () => {
        const entity = { entity_id: 'media_player.test', state: 'playing', attributes: {} };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaControls, { props: { entityId: 'media_player.test' } });
        await fireEvent.click(screen.getByLabelText('Next Track'));

        expect(haStore.callService).toHaveBeenCalledWith('media_player', 'media_next_track', {
            entity_id: 'media_player.test'
        });
    });

    it('calls media_previous_track on prev', async () => {
        const entity = { entity_id: 'media_player.test', state: 'playing', attributes: {} };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaControls, { props: { entityId: 'media_player.test' } });
        await fireEvent.click(screen.getByLabelText('Previous Track'));

        expect(haStore.callService).toHaveBeenCalledWith('media_player', 'media_previous_track', {
            entity_id: 'media_player.test'
        });
    });

    it('applies dark theme styles', () => {
        const entity = { entity_id: 'media_player.test', state: 'playing', attributes: {} };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(MediaControls, { props: { entityId: 'media_player.test', theme: 'dark' } });
        const playBtn = screen.getByLabelText('Pause');
        expect(playBtn).toHaveClass('bg-white');
    });

    it('applies compact styles', () => {
        const entity = { entity_id: 'media_player.test', state: 'playing', attributes: {} };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(MediaControls, { props: { entityId: 'media_player.test', compact: true } });
        expect(container.querySelector('.gap-1')).toBeInTheDocument();
    });
});
