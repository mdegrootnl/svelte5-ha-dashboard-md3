import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import FAB from './FAB.svelte';
import { createRawSnippet } from 'svelte';

describe('FAB Component', () => {
    const mockIcon = createRawSnippet(() => ({ render: () => '<svg data-testid="icon"></svg>' }));

    it('renders with icon', () => {
        // @ts-ignore
        render(FAB, { props: { icon: mockIcon } });
        expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('applies primary variant by default', () => {
        // @ts-ignore
        const { container } = render(FAB, { props: { icon: mockIcon } });
        expect(container.firstChild).toHaveClass('bg-m3-primary-container');
    });

    it('applies surface variant', () => {
        // @ts-ignore
        const { container } = render(FAB, { props: { icon: mockIcon, variant: 'surface' } });
        expect(container.firstChild).toHaveClass('bg-m3-surface-container-high');
    });

    it('renders different sizes', () => {
        // @ts-ignore
        const { container, rerender } = render(FAB, { props: { icon: mockIcon, size: 'small' } });
        expect(container.firstChild).toHaveClass('w-12');

        // @ts-ignore
        rerender({ icon: mockIcon, size: 'large' });
        expect(container.firstChild).toHaveClass('w-24');
        // Large FAB has larger icon container
        expect(container.querySelector('span')).toHaveClass('w-9');
    });

    it('renders as extended FAB when label is provided', () => {
        const label = createRawSnippet(() => ({ render: () => '<span>Extended</span>' }));
        // @ts-ignore
        render(FAB, { props: { icon: mockIcon, label } });

        expect(screen.getByText('Extended')).toBeInTheDocument();
        const button = screen.getByRole('button');
        expect(button).toHaveClass('w-auto');
        expect(button).toHaveClass('px-4');
    });

    it('handles click events', async () => {
        const onclick = vi.fn();
        // @ts-ignore
        render(FAB, { props: { icon: mockIcon, onclick } });

        await fireEvent.click(screen.getByRole('button'));
        expect(onclick).toHaveBeenCalled();
    });

    it('applies custom class', () => {
        // @ts-ignore
        const { container } = render(FAB, { props: { icon: mockIcon, class: 'my-fab' } });
        expect(container.firstChild).toHaveClass('my-fab');
    });
});
