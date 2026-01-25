import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TitleCard from './TitleCard.svelte';
import { cardEditorStore } from '$lib';

describe('TitleCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(cardEditorStore, 'open').mockImplementation(() => { });
    });

    it('renders with title', () => {
        render(TitleCard, {
            props: {
                title: 'Section Header',
                name: ''
            }
        });
        expect(screen.getByText('Section Header')).toBeInTheDocument();
    });

    it('renders with title and subtitle', () => {
        render(TitleCard, {
            props: {
                title: 'Main Title',
                subtitle: 'Supporting text',
                name: ''
            }
        });
        expect(screen.getByText('Main Title')).toBeInTheDocument();
        expect(screen.getByText('Supporting text')).toBeInTheDocument();
    });

    it('uses name as title when title is empty', () => {
        render(TitleCard, {
            props: {
                title: '',
                name: 'Name as Title'
            }
        });
        expect(screen.getByText('Name as Title')).toBeInTheDocument();
    });

    it('applies start alignment by default', () => {
        const { container } = render(TitleCard, {
            props: {
                title: 'Left Aligned',
                name: ''
            }
        });
        const div = container.querySelector('div');
        expect(div).toHaveClass('justify-start');
    });

    it('applies center alignment', () => {
        const { container } = render(TitleCard, {
            props: {
                title: 'Center Aligned',
                name: '',
                alignment: 'center'
            }
        });
        const div = container.querySelector('div');
        expect(div).toHaveClass('justify-center');
    });

    it('applies end alignment', () => {
        const { container } = render(TitleCard, {
            props: {
                title: 'Right Aligned',
                name: '',
                alignment: 'end'
            }
        });
        const div = container.querySelector('div');
        expect(div).toHaveClass('justify-end');
    });

    it('applies custom text color', () => {
        const { container } = render(TitleCard, {
            props: {
                title: 'Colored Title',
                name: '',
                color: '#ff0000'
            }
        });
        const h2 = container.querySelector('h2');
        expect(h2).toHaveStyle('color: #ff0000');
    });

    it('applies custom background color', () => {
        const { container } = render(TitleCard, {
            props: {
                title: 'Background Title',
                name: '',
                backgroundColor: '#0000ff'
            }
        });
        const div = container.querySelector('div');
        expect(div).toHaveStyle('background-color: #0000ff');
    });

    it('opens config dialog when edit button is clicked', async () => {
        render(TitleCard, {
            props: {
                id: 'title-1',
                title: 'Test Title',
                subtitle: 'Test Subtitle',
                name: ''
            }
        });
        const editBtn = screen.getByTitle('Edit Card');

        await fireEvent.click(editBtn);
        expect(cardEditorStore.open).toHaveBeenCalledWith(expect.objectContaining({
            type: 'title',
            name: 'Test Title',
            subtitle: 'Test Subtitle'
        }));
    });

    it('does not render subtitle when not provided', () => {
        const { container } = render(TitleCard, {
            props: {
                title: 'Title Only',
                name: ''
            }
        });
        const paragraphs = container.querySelectorAll('p');
        expect(paragraphs.length).toBe(0);
    });

    it('renders empty subtitle when explicitly empty string', () => {
        const { container } = render(TitleCard, {
            props: {
                title: 'With Empty Subtitle',
                subtitle: '',
                name: ''
            }
        });
        const paragraphs = container.querySelectorAll('p');
        expect(paragraphs.length).toBe(0); // Empty string should not render
    });
});
