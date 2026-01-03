import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MediaCard from './MediaCard.svelte';
import { haStore, cardEditorStore } from '$lib';

describe('MediaCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(haStore, 'getEntity').mockReturnValue(undefined as any);
        vi.spyOn(haStore, 'callService').mockResolvedValue(undefined);
        vi.spyOn(cardEditorStore, 'open').mockImplementation(() => { });
    });

    it('renders off state correctly', () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'off',
            attributes: { friendly_name: 'Main Speaker' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaCard, { props: { entityId: 'media_player.test' } });

        expect(screen.getByText('Powered Off')).toBeInTheDocument();
        expect(screen.getByText('Turn On')).toBeInTheDocument();
    });

    it('calls turn_on service when button is clicked in off state', async () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'off',
            attributes: { friendly_name: 'Main Speaker' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaCard, { props: { entityId: 'media_player.test' } });
        const turnOnBtn = screen.getByText('Turn On');

        await fireEvent.click(turnOnBtn);
        expect(haStore.callService).toHaveBeenCalledWith('media_player', 'turn_on', {
            entity_id: 'media_player.test'
        });
    });

    it('renders standard variant when playing', () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'playing',
            attributes: {
                friendly_name: 'Main Speaker',
                media_title: 'Test Song',
                media_artist: 'Test Artist'
            }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaCard, { props: { entityId: 'media_player.test' } });

        expect(screen.getByText('Test Song')).toBeInTheDocument();
        expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('renders poster variant', () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'playing',
            attributes: { friendly_name: 'Poster Speaker', media_title: 'Poster Song' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaCard, { props: { entityId: 'media_player.test', variant: 'poster' } });

        expect(screen.getByText('Poster Song')).toBeInTheDocument();
    });

    it('renders condensed variant', () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'playing',
            attributes: { friendly_name: 'Condensed Speaker', media_title: 'Condensed Song' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaCard, { props: { entityId: 'media_player.test', variant: 'condensed' } });

        expect(screen.getByText('Condensed Song')).toBeInTheDocument();
    });

    it('opens config dialog when edit button is clicked', async () => {
        const entity = {
            entity_id: 'media_player.test',
            state: 'playing',
            attributes: { friendly_name: 'Test Speaker' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(MediaCard, { props: { entityId: 'media_player.test' } });
        const editBtn = screen.getByTitle('Edit Card');

        await fireEvent.click(editBtn);
        expect(cardEditorStore.open).toHaveBeenCalledWith(expect.objectContaining({
            entityId: 'media_player.test'
        }));
    });
});
