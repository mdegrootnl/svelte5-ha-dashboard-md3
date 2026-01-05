import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CardConfigDialog from './CardConfigDialog.svelte';
import { cardEditorStore } from '$lib/stores/cardEditor.svelte';

describe('CardConfigDialog Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store state
        cardEditorStore.close();
    });

    it('does not render when closed', () => {
        render(CardConfigDialog);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders when store is open', async () => {
        render(CardConfigDialog);

        // Open the dialog via store
        cardEditorStore.open({ entityId: 'light.test', name: '', icon: '' });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Edit Card')).toBeInTheDocument();
    });

    it('populates form with config values', async () => {
        render(CardConfigDialog);

        cardEditorStore.open({ entityId: 'switch.kitchen', name: 'Kitchen Switch', icon: 'bolt' });

        await new Promise(resolve => setTimeout(resolve, 10));

        const entityField = screen.getByLabelText('Entity ID') as HTMLInputElement;
        const nameField = screen.getByLabelText('Custom Name') as HTMLInputElement;
        const iconField = screen.getByLabelText('Icon Name') as HTMLInputElement;

        expect(entityField.value).toBe('switch.kitchen');
        expect(nameField.value).toBe('Kitchen Switch');
        expect(iconField.value).toBe('bolt');
    });

    it('closes on cancel', async () => {
        render(CardConfigDialog);

        cardEditorStore.open({ entityId: 'light.test', name: '', icon: '' });
        await new Promise(resolve => setTimeout(resolve, 10));

        const cancelBtn = screen.getByText('Cancel');
        await fireEvent.click(cancelBtn);

        expect(cardEditorStore.isOpen).toBe(false);
    });

    it('saves and closes on save', async () => {
        const onSave = vi.fn();

        render(CardConfigDialog);

        cardEditorStore.open({ entityId: 'light.test', name: '', icon: '', onSave });
        await new Promise(resolve => setTimeout(resolve, 10));

        const saveBtn = screen.getByText('Save');
        await fireEvent.click(saveBtn);

        expect(onSave).toHaveBeenCalled();
        expect(cardEditorStore.isOpen).toBe(false);
    });

    it('closes when clicking backdrop', async () => {
        render(CardConfigDialog);

        cardEditorStore.open({ entityId: 'light.test', name: '', icon: '' });
        await new Promise(resolve => setTimeout(resolve, 10));

        const backdrop = screen.getByRole('presentation');
        await fireEvent.click(backdrop);

        expect(cardEditorStore.isOpen).toBe(false);
    });
});
