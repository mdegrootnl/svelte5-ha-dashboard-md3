import { render, screen, fireEvent } from '@testing-library/svelte';
import { beforeEach, describe, it, expect } from 'vitest';
import ErrorBoundary from './ErrorBoundary.svelte';
import { themeStore } from '$lib/stores/theme.svelte';
import { createRawSnippet } from 'svelte';

describe('ErrorBoundary Component', () => {
    beforeEach(() => {
        themeStore.language = 'en';
    });

    it('renders children when no error', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Normal Content</span>' }));
        render(ErrorBoundary, { props: { children } });

        expect(screen.getByText('Normal Content')).toBeInTheDocument();
    });

    it('shows default error UI when error occurs', async () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Content</span>' }));
        render(ErrorBoundary, { props: { children } });

        // Simulate window error
        const errorEvent = new ErrorEvent('error', {
            message: 'Test Error',
            error: new Error('Test Error')
        });
        window.dispatchEvent(errorEvent);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Test Error')).toBeInTheDocument();
    });

    it('uses custom fallback when provided', async () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Content</span>' }));
        const fallback = createRawSnippet<[Error]>((getError) => ({
            render: () => `<span>Custom Error: ${getError().message}</span>`
        }));

        render(ErrorBoundary, { props: { children, fallback } });

        // Simulate window error
        const errorEvent = new ErrorEvent('error', {
            message: 'Custom Test Error',
            error: new Error('Custom Test Error')
        });
        window.dispatchEvent(errorEvent);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(screen.getByText('Custom Error: Custom Test Error')).toBeInTheDocument();
    });
});
