import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import TabBar from './TabBar.svelte';

const tabs = [
    { id: 'overview', name: 'Overview', icon: 'home' },
    { id: 'living-room', name: 'Living Room', icon: 'chair' },
];

describe('TabBar Component', () => {
    it('uses the themed tab pill radius for navigation pill surfaces', () => {
        const { container } = render(TabBar, {
            props: {
                tabs,
                activeTabId: 'overview',
                isEditing: true,
            },
        });

        expect(
            container.querySelector(
                '.bg-m3-surface-container-high',
            ),
        ).toBeInTheDocument();

        expect(
            screen.getByText('Overview').closest('button')?.getAttribute('style'),
        ).toContain('var(--radius-m3-tab-pill)');
        expect(screen.getByTitle('Nieuwe tab toevoegen').getAttribute('style')).toContain(
            'var(--radius-m3-tab-pill)',
        );
    });

    it('selects tabs', async () => {
        const onselect = vi.fn();
        render(TabBar, {
            props: {
                tabs,
                activeTabId: 'overview',
                onselect,
            },
        });

        await fireEvent.click(screen.getByText('Living Room'));

        expect(onselect).toHaveBeenCalledWith('living-room');
    });

    it('keeps long translated labels constrained inside their tab button', () => {
        render(TabBar, {
            props: {
                tabs: [
                    { id: 'general', name: 'Algemeen', icon: 'translate' },
                    { id: 'lockscreen', name: 'Vergrendelscherm', icon: 'lock_clock' },
                ],
                activeTabId: 'lockscreen',
            },
        });

        const label = screen.getByText('Vergrendelscherm');
        const button = label.closest('button');

        expect(label).toHaveClass('min-w-0', 'max-w-full', 'truncate');
        expect(button).toHaveClass('overflow-hidden', 'sm:min-w-0');
    });
});
