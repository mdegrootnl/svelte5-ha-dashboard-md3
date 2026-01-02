import { type Snippet } from "svelte";

interface CardConfig {
    entityId: string;
    name: string;
    icon: string;
    onSave: (config: CardConfig) => void;
}

export class CardEditorStore {
    isOpen = $state(false);
    config = $state<CardConfig>({ entityId: "", name: "", icon: "", onSave: () => { } });

    open(initialConfig: CardConfig) {
        this.config = { ...initialConfig };
        this.isOpen = true;
    }

    close() {
        this.isOpen = false;
    }

    save(newConfig: CardConfig) {
        this.config.onSave(newConfig);
        this.close(); // Close after save
    }
}

export const cardEditorStore = new CardEditorStore();
