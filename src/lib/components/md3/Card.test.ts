import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Card from './Card.svelte';
import { createRawSnippet } from 'svelte';

describe('Card Component', () => {
    it('renders children correctly', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Inner Content</span>' }));
        render(Card, { props: { children } });
        expect(screen.getByText('Inner Content')).toBeInTheDocument();
    });

    it('applies elevated variant by default', () => {
        const children = createRawSnippet(() => ({ render: () => '<span></span>' }));
        const { container } = render(Card, { props: { children } });
        expect(container.querySelector('div')).toHaveClass('bg-m3-surface-container-low');
    });

    it('applies filled variant classes', () => {
        const children = createRawSnippet(() => ({ render: () => '<span></span>' }));
        const { container } = render(Card, { props: { children, variant: 'filled' } });
        expect(container.querySelector('div')).toHaveClass('bg-m3-surface-container-highest');
    });

    it('applies outlined variant classes', () => {
        const children = createRawSnippet(() => ({ render: () => '<span></span>' }));
        const { container } = render(Card, { props: { children, variant: 'outlined' } });
        expect(container.querySelector('div')).toHaveClass('border-m3-outline-variant');
    });

    it('adds interactive styles and handles click when onclick is provided', async () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Click Me</span>' }));
        const onclick = vi.fn();
        render(Card, { props: { children, onclick } });

        const card = screen.getByText('Click Me');
        expect(card.parentElement).toHaveClass('cursor-pointer'); // Assuming the class is on the parent div

        await fireEvent.click(card);
        expect(onclick).toHaveBeenCalled();
    });

    it('applies custom classes', () => {
        const children = createRawSnippet(() => ({ render: () => '<span></span>' }));
        const { container } = render(Card, { props: { children, class: 'custom-class' } });
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
});
