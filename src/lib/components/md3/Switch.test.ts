import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Switch from './Switch.svelte';

describe('Switch Component', () => {
    it('renders unchecked by default', () => {
        render(Switch);
        const input = screen.getByRole('checkbox') as HTMLInputElement;
        expect(input.checked).toBe(false);
    });

    it('renders checked when checked prop is true', () => {
        render(Switch, { props: { checked: true } });
        const input = screen.getByRole('checkbox') as HTMLInputElement;
        expect(input.checked).toBe(true);
    });

    it('toggles when clicked', async () => {
        const onchange = vi.fn();
        render(Switch, { props: { onchange } });
        const input = screen.getByRole('checkbox');

        await fireEvent.click(input);
        expect(onchange).toHaveBeenCalledWith(true);
    });

    it('does not toggle when disabled', async () => {
        const onchange = vi.fn();
        render(Switch, { props: { disabled: true, onchange } });
        const input = screen.getByRole('checkbox');

        expect(input).toBeDisabled();
        await fireEvent.click(input);
        expect(onchange).not.toHaveBeenCalled();
    });

    it('applies custom class to label', () => {
        const { container } = render(Switch, { props: { class: 'custom-switch' } });
        expect(container.firstChild).toHaveClass('custom-switch');
    });
});
