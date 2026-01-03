import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button.svelte';
import { createRawSnippet } from 'svelte';

describe('Button Component', () => {
    it('renders children correctly', () => {
        const children = createRawSnippet(() => ({
            render: () => '<span>Click Me</span>'
        }));

        render(Button, { props: { children } });
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('handles click events', async () => {
        const onclick = vi.fn();
        const children = createRawSnippet(() => ({
            render: () => '<span>Click Me</span>'
        }));

        render(Button, { props: { children, onclick } });
        const button = screen.getByRole('button');

        await fireEvent.click(button);
        expect(onclick).toHaveBeenCalledTimes(1);
    });

    it('respects the disabled prop', async () => {
        const onclick = vi.fn();
        const children = createRawSnippet(() => ({
            render: () => '<span>Click Me</span>'
        }));

        render(Button, { props: { children, onclick, disabled: true } });
        const button = screen.getByRole('button');

        expect(button).toBeDisabled();
        // fireEvent.click might still trigger the mock if we don't check for disabled in the component
        // or if JSDOM/Testing Library doesn't block it automatically.
        // Svelte 5 <button {disabled} {onclick}> should block it.
        await fireEvent.click(button);
        expect(onclick).not.toHaveBeenCalled();
    });

    it('applies tonal variant classes', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Tonal</span>' }));
        render(Button, { props: { children, variant: 'tonal' } });
        expect(screen.getByRole('button').className).toContain('bg-m3-secondary-container');
    });

    it('applies text variant classes', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Text</span>' }));
        render(Button, { props: { children, variant: 'text' } });
        expect(screen.getByRole('button').className).toContain('bg-transparent');
        expect(screen.getByRole('button').className).toContain('px-3');
    });

    it('applies elevated variant classes', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Elevated</span>' }));
        render(Button, { props: { children, variant: 'elevated' } });
        expect(screen.getByRole('button').className).toContain('bg-m3-surface-container-low');
        expect(screen.getByRole('button').className).toContain('shadow-sm');
    });

    it('renders with leading icon', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Icon</span>' }));
        const icon = createRawSnippet(() => ({ render: () => '<svg data-testid="test-icon"></svg>' }));
        // @ts-ignore - icon prop expects Component, Snippet works for testing
        render(Button, { props: { children, icon } });
        expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('adjusts padding when icon is present', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Icon</span>' }));
        const icon = createRawSnippet(() => ({ render: () => '<i></i>' }));
        // @ts-ignore
        const { rerender } = render(Button, { props: { children } });
        const button = screen.getByRole('button');
        const initialClass = button.className;

        // @ts-ignore
        rerender({ children, icon });
        expect(button.className).not.toBe(initialClass);
        expect(button.className).toContain('pl-4 pr-6');
    });
});


