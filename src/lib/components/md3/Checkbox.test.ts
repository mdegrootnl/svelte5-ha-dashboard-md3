import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Checkbox from './Checkbox.svelte';

describe('Checkbox Component', () => {
    it('renders unchecked by default', () => {
        render(Checkbox);
        const input = screen.getByRole('checkbox') as HTMLInputElement;
        expect(input.checked).toBe(false);
    });

    it('renders checked when checked prop is true', () => {
        render(Checkbox, { props: { checked: true } });
        const input = screen.getByRole('checkbox') as HTMLInputElement;
        expect(input.checked).toBe(true);
    });

    it('toggles when clicked', async () => {
        const onchange = vi.fn();
        render(Checkbox, { props: { onchange } });
        const input = screen.getByRole('checkbox');

        await fireEvent.click(input);
        expect(onchange).toHaveBeenCalledWith(true);
    });

    it('does not toggle when disabled', async () => {
        const onchange = vi.fn();
        render(Checkbox, { props: { disabled: true, onchange } });
        const input = screen.getByRole('checkbox');

        expect(input).toBeDisabled();
        await fireEvent.click(input);
        expect(onchange).not.toHaveBeenCalled();
    });

    it('renders indeterminate state', () => {
        const { container } = render(Checkbox, { props: { indeterminate: true } });
        // The indeterminate div should be present
        expect(container.querySelector('.bg-m3-on-primary')).toBeInTheDocument();
    });

    it('applies custom class to label', () => {
        const { container } = render(Checkbox, { props: { class: 'custom-check' } });
        expect(container.firstChild).toHaveClass('custom-check');
    });
});
