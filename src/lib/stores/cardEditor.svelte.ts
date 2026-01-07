import type { CardConfig } from '$lib/types';

export class CardEditorStore {
    isOpen = $state(false);
    config = $state<CardConfig>({ entityId: "", name: "", onSave: () => { } });

    open(initialConfig: CardConfig) {
        this.config = { ...initialConfig };
        this.isOpen = true;
    }

    close() {
        this.isOpen = false;
    }

    save(newConfig: CardConfig) {
        this.config.onSave?.(newConfig);
        this.close(); // Close after save
    }
}

export const cardEditorStore = new CardEditorStore();
