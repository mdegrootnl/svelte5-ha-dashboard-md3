import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Chip from './Chip.svelte';
import { createRawSnippet } from 'svelte';

describe('Chip Component', () => {
    it('renders with label', () => {
        render(Chip, { props: { label: 'Test Chip' } });
        expect(screen.getByText('Test Chip')).toBeInTheDocument();
    });

    it('applies assist variant classes by default', () => {
        render(Chip, { props: { label: 'Assist' } });
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-m3-surface');
        expect(button).toHaveClass('border-m3-outline');
    });

    it('applies selected classes for filter chip', () => {
        render(Chip, { props: { label: 'Filter', variant: 'filter', selected: true } });
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-m3-secondary-container');
        // Check for checkmark icon (SVG)
        expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('renders leading icon', () => {
        const icon = createRawSnippet(() => ({ render: () => '<span data-testid="chip-icon"></span>' }));
        // @ts-ignore
        render(Chip, { props: { label: 'Icon', icon } });
        expect(screen.getByTestId('chip-icon')).toBeInTheDocument();
    });

    it('handles click events', async () => {
        const onclick = vi.fn();
        render(Chip, { props: { label: 'Click', onclick } });
        await fireEvent.click(screen.getByRole('button'));
        expect(onclick).toHaveBeenCalled();
    });

    it('handles close events on input chip', async () => {
        const onclose = vi.fn();
        const { container } = render(Chip, { props: { label: 'Input', variant: 'input', onclose } });

        // The close button is the second role="button" or span with role button
        const closeBtn = screen.getAllByRole('button')[1];
        await fireEvent.click(closeBtn);

        expect(onclose).toHaveBeenCalled();
    });

    it('stops propagation when close is clicked', async () => {
        const onclick = vi.fn();
        const onclose = vi.fn();
        render(Chip, { props: { label: 'Stop', variant: 'input', onclick, onclose } });

        const closeBtn = screen.getAllByRole('button')[1];
        await fireEvent.click(closeBtn);

        expect(onclose).toHaveBeenCalled();
        expect(onclick).not.toHaveBeenCalled();
    });

    it('handles keyboard enter on close button', async () => {
        const onclose = vi.fn();
        render(Chip, { props: { label: 'Key', variant: 'input', onclose } });

        const closeBtn = screen.getAllByRole('button')[1];
        await fireEvent.keyDown(closeBtn, { key: 'Enter' });

        expect(onclose).toHaveBeenCalled();
    });
});
