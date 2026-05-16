import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import GenerationStateBadge from './GenerationStateBadge.svelte';

describe('GenerationStateBadge', () => {
    it('renders generated state', () => {
        render(GenerationStateBadge, {
            props: { state: 'generated', sourceReason: 'house overview' },
        });

        expect(screen.getByText('Generated')).toBeInTheDocument();
        expect(screen.getByText('Generated')).toHaveAttribute(
            'data-generation-state',
            'generated',
        );
    });

    it('renders edited state', () => {
        render(GenerationStateBadge, { props: { state: 'user_modified' } });

        expect(screen.getByText('Edited')).toBeInTheDocument();
    });

    it('renders pinned state', () => {
        render(GenerationStateBadge, { props: { state: 'pinned' } });

        expect(screen.getByText('Pinned')).toBeInTheDocument();
    });

    it('renders nothing without generation state', () => {
        const { container } = render(GenerationStateBadge, { props: {} });

        expect(container.textContent).toBe('');
    });
});
