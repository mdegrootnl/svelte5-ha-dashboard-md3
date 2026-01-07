import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TextField from './TextField.svelte';
import { createRawSnippet } from 'svelte';

describe('TextField Component', () => {
    it('renders with label', () => {
        render(TextField, { props: { label: 'First Name' } });
        expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    });

    it('renders with initial value', () => {
        render(TextField, { props: { label: 'Name', value: 'John' } });
        const input = screen.getByLabelText('Name') as HTMLInputElement;
        expect(input.value).toBe('John');
    });

    it('updates value on input', async () => {
        const oninput = vi.fn();
        render(TextField, { props: { label: 'Name', oninput } });
        const input = screen.getByLabelText('Name');

        await fireEvent.input(input, { target: { value: 'Doe' } });
        expect(oninput).toHaveBeenCalled();
        expect((input as HTMLInputElement).value).toBe('Doe');
    });

    it('applies error styles and renders supporting text', () => {
        render(TextField, {
            props: {
                label: 'Email',
                error: true,
                supportingText: 'Invalid email'
            }
        });

        const supportingText = screen.getByText('Invalid email');
        expect(supportingText).toHaveClass('text-m3-error');

        // The container should have error class
        const input = screen.getByLabelText('Email');
        const container = input.closest('div')?.parentElement;
        expect(container).toHaveClass('border-m3-error');
    });

    it('renders leading and trailing icons', () => {
        const leading = createRawSnippet(() => ({ render: () => '<i data-testid="leading"></i>' }));
        const trailing = createRawSnippet(() => ({ render: () => '<i data-testid="trailing"></i>' }));

        // @ts-ignore
        render(TextField, { props: { label: 'Icons', leadingIcon: leading, trailingIcon: trailing } });

        expect(screen.getByTestId('leading')).toBeInTheDocument();
        expect(screen.getByTestId('trailing')).toBeInTheDocument();
    });

    it('applies outlined variant classes', () => {
        const { container } = render(TextField, { props: { label: 'Outlined', variant: 'outlined' } });
        const fieldContainer = container.querySelector('.flex-col > div:first-child');

        // In MD3 Outlined variant, the border is on the fieldset to support the notch
        const fieldset = fieldContainer?.querySelector('fieldset');
        expect(fieldset).toHaveClass('border');
    });

    it('disables the input', () => {
        render(TextField, { props: { label: 'Disabled', disabled: true } });
        const input = screen.getByLabelText('Disabled');
        expect(input).toBeDisabled();
    });
});
