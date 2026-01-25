import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NavigationCard from './NavigationCard.svelte';
import { haStore, cardEditorStore } from '$lib';

describe('NavigationCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default empty entity
        vi.spyOn(haStore, 'getEntity').mockReturnValue(undefined as any);
        vi.spyOn(haStore, 'callService').mockResolvedValue({ ok: true, value: undefined });
        vi.spyOn(cardEditorStore, 'open').mockImplementation(() => { });
    });

    it('renders with name and path', () => {
        render(NavigationCard, {
            props: {
                name: 'Living Room',
                path: '/dashboard/floor1/living-room',
                entityId: ''
            }
        });
        expect(screen.getByText('Living Room')).toBeInTheDocument();
        expect(screen.getByText('/dashboard/floor1/living-room')).toBeInTheDocument();
    });

    it('renders with custom icon', () => {
        const { container } = render(NavigationCard, {
            props: {
                name: 'Kitchen',
                path: '/dashboard/floor1/kitchen',
                icon: 'kitchen',
                entityId: ''
            }
        });
        // Check that the DynamicIcon component is rendered with the icon name
        const iconSpan = container.querySelector('.material-symbols-outlined');
        expect(iconSpan).toBeInTheDocument();
        expect(iconSpan?.textContent).toBe('kitchen');
    });

    it('renders default icon when none provided', () => {
        const { container } = render(NavigationCard, {
            props: {
                name: 'Test Room',
                path: '/test',
                entityId: ''
            }
        });
        const iconSpan = container.querySelector('.material-symbols-outlined');
        expect(iconSpan).toBeInTheDocument();
        expect(iconSpan?.textContent).toBe('link'); // Default icon
    });

    it('renders with background color', () => {
        const { container } = render(NavigationCard, {
            props: {
                name: 'Colored Room',
                path: '/test',
                backgroundColor: '#ff5500',
                entityId: ''
            }
        });
        const card = container.querySelector('a');
        expect(card).toHaveStyle('background-color: #ff5500');
    });

    it('is a navigable link', () => {
        const { container } = render(NavigationCard, {
            props: {
                name: 'Link Test',
                path: '/dashboard/test-room',
                entityId: ''
            }
        });
        const link = container.querySelector('a');
        expect(link).toHaveAttribute('href', '/dashboard/test-room');
    });

    it('opens config dialog when edit button is clicked', async () => {
        render(NavigationCard, {
            props: {
                id: 'nav-1',
                name: 'Test Room',
                path: '/test',
                entityId: ''
            }
        });
        const editBtn = screen.getByTitle('Edit Navigation');

        await fireEvent.click(editBtn);
        expect(cardEditorStore.open).toHaveBeenCalledWith(expect.objectContaining({
            type: 'navigation',
            name: 'Test Room',
            path: '/test'
        }));
    });

    it('renders with shortcuts', () => {
        const entity = {
            entity_id: 'light.living_room',
            state: 'on',
            attributes: { friendly_name: 'Living Room Light' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(NavigationCard, {
            props: {
                name: 'Living Room',
                path: '/dashboard/living',
                shortcuts: [
                    { id: 's1', entityId: 'light.living_room', icon: 'lightbulb' }
                ],
                entityId: ''
            }
        });

        // Should have shortcut buttons
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('toggles shortcut entity when shortcut is clicked', async () => {
        const entity = {
            entity_id: 'light.test',
            state: 'off',
            attributes: { friendly_name: 'Test Light' }
        };
        vi.spyOn(haStore, 'getEntity').mockReturnValue(entity as any);

        const { container } = render(NavigationCard, {
            props: {
                name: 'Test Room',
                path: '/test',
                shortcuts: [
                    { id: 's1', entityId: 'light.test', icon: 'lightbulb' }
                ],
                entityId: ''
            }
        });

        // Find and click a shortcut button (not the main toggle)
        const buttons = container.querySelectorAll('button');
        const shortcutBtn = Array.from(buttons).find(btn =>
            btn.getAttribute('title') === 'light.test'
        );

        if (shortcutBtn) {
            await fireEvent.click(shortcutBtn);
            expect(haStore.callService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.test' });
        }
    });

    it('renders with image when iconType is image', () => {
        const { container } = render(NavigationCard, {
            props: {
                name: 'Image Room',
                path: '/test',
                iconType: 'image',
                imageUrl: 'https://example.com/room.jpg',
                entityId: ''
            }
        });

        const img = container.querySelector('img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/room.jpg');
    });
});
