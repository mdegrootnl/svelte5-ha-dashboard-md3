import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ButtonCard from './ButtonCard.svelte';
import { haStore, cardEditorStore } from '$lib';

describe('ButtonCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default empty entity
        vi.spyOn(haStore, 'getEntity').mockReturnValue(undefined as any);
        vi.spyOn(haStore, 'callService').mockResolvedValue(undefined);
        vi.spyOn(cardEditorStore, 'open').mockImplementation(() => { });
    });

    it('renders manually provided title and state', () => {
        render(ButtonCard, { props: { title: 'Manual Title', state: 'Manual State' } });
        expect(screen.getByText('Manual Title')).toBeInTheDocument();
        expect(screen.getByText('Manual State')).toBeInTheDocument();
    });

    it('updates from HA entity state', async () => {
        const entity = {
            entity_id: 'switch.test',
            state: 'on',
            attributes: { friendly_name: 'Test Device' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        render(ButtonCard, { props: { entityId: 'switch.test', title: '' } });

        expect(screen.getByText('Test Device')).toBeInTheDocument();
        expect(screen.getByText('On')).toBeInTheDocument();
    });

    it('calls HA toggle service on switch click', async () => {
        const entity = {
            entity_id: 'switch.test',
            state: 'off',
            attributes: { friendly_name: 'Test Switch' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(ButtonCard, { props: { entityId: 'switch.test', title: '' } });
        const card = container.querySelector('[role="button"]') as HTMLElement;

        await fireEvent.click(card);
        expect(haStore.callService).toHaveBeenCalledWith('switch', 'toggle', { entity_id: 'switch.test' });
    });

    it('opens config dialog when edit button is clicked', async () => {
        render(ButtonCard, { props: { entityId: 'switch.test', title: 'Test' } });
        const editBtn = screen.getByTitle('Edit Card');

        await fireEvent.click(editBtn);
        expect(cardEditorStore.open).toHaveBeenCalledWith(expect.objectContaining({
            entityId: 'switch.test'
        }));
    });
});
