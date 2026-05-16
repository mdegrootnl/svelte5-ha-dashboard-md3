import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TabCardTestWrapper from './TabCardTestWrapper.svelte';
import { dashboardEditorStore, haStore } from '$lib';
import type { TabCardConfig } from '$lib/types/dashboard';

// Mock the stores
vi.mock('$lib/features/dashboard/stores/dashboard.svelte', () => ({
    dashboardStore: {
        breakpoint: 'desktop',
        config: {
            id: 'root-1',
            tabs: [],
            activeTabId: ''
        }
    }
}));

vi.mock('$lib/features/dashboard/stores/dashboardEditor.svelte', () => ({
    dashboardEditorStore: {
        isEditing: false,
        focusedGridId: null,
        enterGrid: vi.fn(),
        exitGrid: vi.fn(),
        addItem: vi.fn(),
        deleteItem: vi.fn(),
        isItemAncestorOfFocus: vi.fn().mockReturnValue(false)
    }
}));

vi.mock('$lib/features/dashboard/stores/cardEditor.svelte', () => ({
    cardEditorStore: {
        config: null,
        open: vi.fn(),
        openLibrary: vi.fn()
    }
}));

vi.mock('$lib/stores/ha.svelte', () => ({
    haStore: {
        getEntity: vi.fn().mockReturnValue(undefined),
        callService: vi.fn().mockResolvedValue({ ok: true })
    }
}));

describe('TabCard Component', () => {
    let mockConfig: TabCardConfig;

    beforeEach(() => {
        vi.clearAllMocks();

        mockConfig = {
            id: 'tab-card-1',
            cardType: 'tabs',
            name: 'Main Tab Card',
            entityId: '',
            domainFilter: '',
            activeTabIndex: 0,
            secondaryEntityId: '',
            secondaryName: '',
            layout: {
                desktop: { colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 4 },
                mobile: { colStart: 1, colSpan: 1, rowStart: 1, rowSpan: 4 }
            },
            tabs: [
                {
                    id: 'grid-1',
                    name: 'Tab 1',
                    icon: 'home',
                    columns: { desktop: 12, mobile: 1 },
                    items: [],
                    rowHeight: 80,
                    gap: 16,
                    padding: 16,
                    rows: 'implicit'
                },
                {
                    id: 'grid-2',
                    name: 'Tab 2',
                    icon: 'settings',
                    columns: { desktop: 12, mobile: 1 },
                    items: [],
                    rowHeight: 80,
                    gap: 16,
                    padding: 16,
                    rows: 'implicit'
                }
            ]
        };

        // Reset store mocks
        vi.mocked(dashboardEditorStore).isEditing = false;
        vi.mocked(dashboardEditorStore).focusedGridId = null;
    });

    it('renders tabs with names and icons', () => {
        render(TabCardTestWrapper, { props: { config: mockConfig } });

        expect(screen.getByText('Tab 1')).toBeInTheDocument();
        expect(screen.getByText('Tab 2')).toBeInTheDocument();

        const icons = document.querySelectorAll('.material-symbols-outlined');
        expect(icons[0].textContent).toBe('home');
        expect(icons[1].textContent).toBe('settings');
    });

    it('uses the themed tab pill radius for tab navigation', () => {
        render(TabCardTestWrapper, { props: { config: mockConfig } });

        expect(
            screen.getByText('Tab 1').closest('button')?.getAttribute('style'),
        ).toContain('var(--radius-m3-tab-pill)');
    });

    it('switches between tabs on click', async () => {
        render(TabCardTestWrapper, { props: { config: mockConfig } });

        const tab2 = screen.getByText('Tab 2').closest('button');
        await fireEvent.click(tab2!);

        await waitFor(() => {
            expect(tab2).toHaveAttribute('aria-selected', 'true');
        });

        const tab1 = screen.getByText('Tab 1').closest('button');
        expect(tab1).toHaveAttribute('aria-selected', 'false');
    });

    it('renders content of the active tab', async () => {
        const entity = {
            entity_id: 'light.test',
            state: 'on',
            attributes: { friendly_name: 'Test Device' }
        };
        vi.mocked(haStore.getEntity).mockReturnValue(entity as any);

        mockConfig.tabs![0].items = [
            {
                id: 'item-1',
                cardType: 'button',
                name: 'Test Button',
                layout: {
                    desktop: { colStart: 1, colSpan: 1, rowStart: 1, rowSpan: 1 },
                    mobile: { colStart: 1, colSpan: 1, rowStart: 1, rowSpan: 1 }
                },
                entityId: 'light.test',
                domainFilter: '',
                color: '',
                backgroundColor: '',
                icon: '',
                secondaryEntityId: '',
                secondaryName: '',
                options: { button: {} }
            }
        ];

        render(TabCardTestWrapper, { props: { config: mockConfig } });

        // ButtonCard might render asynchronously due to $effect
        await waitFor(() => {
            expect(screen.getByText('Test Button')).toBeInTheDocument();
        });
    });

    it('shows edit controls in edit mode', () => {
        vi.mocked(dashboardEditorStore).isEditing = true;

        render(TabCardTestWrapper, { props: { config: mockConfig } });

        expect(screen.getByTitle('Add Tab')).toBeInTheDocument();
        expect(screen.getAllByTitle('Delete Tab').length).toBe(2);
    });

    it('adds a new tab when clicked', async () => {
        vi.mocked(dashboardEditorStore).isEditing = true;
        render(TabCardTestWrapper, { props: { config: mockConfig } });

        const addBtn = screen.getByTitle('Add Tab');
        await fireEvent.click(addBtn);

        await waitFor(() => {
            expect(screen.getByText('Tab 3')).toBeInTheDocument();
        });
    });

    it('deletes a tab when clicked', async () => {
        vi.mocked(dashboardEditorStore).isEditing = true;
        render(TabCardTestWrapper, { props: { config: mockConfig } });

        const deleteButtons = screen.getAllByTitle('Delete Tab');
        await fireEvent.click(deleteButtons[1]); // Delete Tab 2

        await waitFor(() => {
            expect(screen.queryByText('Tab 2')).not.toBeInTheDocument();
        });
    });

    it('enters grid focus when focusedGridId matches', () => {
        vi.mocked(dashboardEditorStore).focusedGridId = 'grid-1';

        render(TabCardTestWrapper, { props: { config: mockConfig } });

        expect(screen.getByTitle('Add Card')).toBeInTheDocument();
        expect(screen.getByTitle('Grid Settings')).toBeInTheDocument();
        expect(screen.getByTitle('Card Settings')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('opens rename dialog when rename tab icon is clicked', async () => {
        vi.mocked(dashboardEditorStore).focusedGridId = 'grid-1';
        render(TabCardTestWrapper, { props: { config: mockConfig } });

        const renameBtn = screen.getByTitle('Rename Tab');
        await fireEvent.click(renameBtn);

        expect(screen.getByText('Rename Tab')).toBeInTheDocument();
    });

    it('calls exitGrid when Done is clicked', async () => {
        vi.mocked(dashboardEditorStore).focusedGridId = 'grid-1';
        render(TabCardTestWrapper, { props: { config: mockConfig } });

        const doneBtn = screen.getByText('Done').closest('button');
        await fireEvent.click(doneBtn!);
        expect(dashboardEditorStore.exitGrid).toHaveBeenCalled();
    });
});
