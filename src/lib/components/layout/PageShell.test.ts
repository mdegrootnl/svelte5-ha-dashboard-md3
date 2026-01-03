import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import PageShell from './PageShell.svelte';
import { createRawSnippet } from 'svelte';

describe('PageShell Component', () => {
    it('renders title', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Content</span>' }));
        render(PageShell, { props: { title: 'Test Page', children } });

        expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Content</span>' }));
        render(PageShell, { props: { title: 'Page', description: 'Page description', children } });

        expect(screen.getByText('Page description')).toBeInTheDocument();
    });

    it('renders children content', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Child Content</span>' }));
        render(PageShell, { props: { title: 'Page', children } });

        expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('renders actions slot when provided', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Content</span>' }));
        const actions = createRawSnippet(() => ({ render: () => '<button>Action</button>' }));
        render(PageShell, { props: { title: 'Page', children, actions } });

        expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('applies correct max-width class', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Content</span>' }));

        const { container, rerender } = render(PageShell, { props: { title: 'Page', children, maxWidth: 'sm' } });
        expect(container.querySelector('.max-w-sm')).toBeInTheDocument();

        rerender({ title: 'Page', children, maxWidth: '4xl' });
        expect(container.querySelector('.max-w-4xl')).toBeInTheDocument();
    });

    it('uses 2xl max-width by default', () => {
        const children = createRawSnippet(() => ({ render: () => '<span>Content</span>' }));
        const { container } = render(PageShell, { props: { title: 'Page', children } });

        expect(container.querySelector('.max-w-2xl')).toBeInTheDocument();
    });
});
