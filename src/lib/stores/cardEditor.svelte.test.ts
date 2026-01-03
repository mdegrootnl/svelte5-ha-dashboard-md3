import { describe, it, expect, vi } from 'vitest';
import { CardEditorStore } from './cardEditor.svelte';

describe('CardEditorStore', () => {
    it('should have initial state', () => {
        const store = new CardEditorStore();
        expect(store.isOpen).toBe(false);
        expect(store.config).toEqual({ entityId: "", name: "", icon: "", onSave: expect.any(Function) });
    });

    it('should open with initial config', () => {
        const store = new CardEditorStore();
        const config = { entityId: 'light.test', name: 'Test', icon: 'mdi:test' };
        store.open(config);

        expect(store.isOpen).toBe(true);
        expect(store.config.entityId).toBe('light.test');
        expect(store.config.name).toBe('Test');
    });

    it('should close', () => {
        const store = new CardEditorStore();
        store.open({ entityId: '', name: '', icon: '' });
        store.close();
        expect(store.isOpen).toBe(false);
    });

    it('should save and call onSave callback', () => {
        const store = new CardEditorStore();
        const onSave = vi.fn();
        store.open({ entityId: 'old', name: 'Old', icon: 'old', onSave });

        const newConfig = { entityId: 'new', name: 'New', icon: 'new', onSave };
        store.save(newConfig);

        expect(onSave).toHaveBeenCalledWith(newConfig);
        expect(store.isOpen).toBe(false);
    });
});
