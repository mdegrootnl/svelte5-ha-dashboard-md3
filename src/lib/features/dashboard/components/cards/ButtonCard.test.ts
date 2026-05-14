import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ButtonCard from './ButtonCard.svelte';
import { haStore, cardEditorStore } from '$lib';

describe('ButtonCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default empty entity
        vi.spyOn(haStore, 'getEntity').mockReturnValue(undefined as any);
        vi.spyOn(haStore, 'callService').mockResolvedValue({ ok: true, value: undefined });
        vi.spyOn(cardEditorStore, 'open').mockImplementation(() => { });
    });

    it('renders manually provided title and state', () => {
        render(ButtonCard, { props: { title: 'Manual Title', state: 'Manual State', entityId: '', name: '', domainFilter: '' } });
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

        render(ButtonCard, { props: { entityId: 'switch.test', title: '', name: '', domainFilter: '' } });

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

        const { container } = render(ButtonCard, { props: { entityId: 'switch.test', title: '', name: '', domainFilter: '' } });
        const card = container.querySelector('[role="button"]') as HTMLElement;

        await fireEvent.click(card);
        expect(haStore.callService).toHaveBeenCalledWith('switch', 'toggle', { entity_id: 'switch.test' });
    });

    it('does not toggle when controls are disabled', async () => {
        const { container } = render(ButtonCard, {
            props: {
                entityId: 'switch.test',
                title: 'Quiet Switch',
                name: '',
                domainFilter: '',
                options: { control: 'none' },
            },
        });
        const card = container.querySelector('[role="button"]') as HTMLElement;

        await fireEvent.click(card);
        expect(haStore.callService).not.toHaveBeenCalled();
    });

    it('runs configured sub-actions without toggling the main entity', async () => {
        render(ButtonCard, {
            props: {
                entityId: 'light.main',
                title: 'Light',
                name: '',
                domainFilter: '',
                options: {
                    actions: [
                        {
                            id: 'scene',
                            label: 'Scene',
                            icon: 'movie',
                            domain: 'scene',
                            service: 'turn_on',
                            entityId: 'scene.movie',
                        },
                    ],
                },
            },
        });

        await fireEvent.click(screen.getByTitle('Scene'));
        expect(haStore.callService).toHaveBeenCalledTimes(1);
        expect(haStore.callService).toHaveBeenCalledWith('scene', 'turn_on', {
            entity_id: 'scene.movie',
        });
    });

    it('uses cover services when cover control is selected', async () => {
        const entity = {
            entity_id: 'cover.blinds',
            state: 'open',
            attributes: { friendly_name: 'Blinds' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(ButtonCard, {
            props: {
                entityId: 'cover.blinds',
                title: '',
                name: '',
                domainFilter: '',
                options: { control: 'cover' },
            },
        });
        const card = container.querySelector('[role="button"]') as HTMLElement;

        await fireEvent.click(card);
        expect(haStore.callService).toHaveBeenCalledWith('cover', 'close_cover', {
            entity_id: 'cover.blinds',
        });
    });

    it('opens config dialog when edit button is clicked', async () => {
        render(ButtonCard, { props: { entityId: 'switch.test', title: 'Test', name: '', domainFilter: '' } });
        const editBtn = screen.getByTitle('Edit Card');

        await fireEvent.click(editBtn);
        expect(cardEditorStore.open).toHaveBeenCalledWith(expect.objectContaining({
            entityId: 'switch.test'
        }));
    });

    it('derives default icon from entityId domain', async () => {
        const entity = {
            entity_id: 'light.test',
            state: 'on',
            attributes: { friendly_name: 'Test Light' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(ButtonCard, { props: { entityId: 'light.test', title: '', name: '', domainFilter: '' } });

        // Check if an SVG/icon is rendered
        const icon = container.querySelector('svg');
        expect(icon).toBeInTheDocument();
    });
});
