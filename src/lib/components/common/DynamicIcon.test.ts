import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DynamicIcon from './DynamicIcon.svelte';

describe('DynamicIcon', () => {
    it('renders a resolved Material Symbol instead of an unavailable source icon name', () => {
        const { container } = render(DynamicIcon, {
            props: { name: 'mdi:door-closed' },
        });

        expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
        expect(container.querySelector('.material-symbols-outlined')?.textContent).toBe('door_front');
    });
});
