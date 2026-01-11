import type { CardConfig } from '$lib/types';

export class CardEditorStore {
    mode = $state<"none" | "library" | "config">("none");
    config = $state<CardConfig>({ entityId: "", name: "", onSave: () => { } });

    // Navigation history to support "Back"
    private history: Array<"none" | "library" | "config"> = [];

    get isOpen() {
        return this.mode !== "none";
    }

    get showBack() {
        return this.history.length > 0 && this.history[this.history.length - 1] !== "none";
    }

    openLibrary() {
        this.history = [];
        this.mode = "library";
    }

    openConfig(initialConfig: CardConfig, fromLibrary = false) {
        if (fromLibrary) {
            this.history.push("library");
        } else {
            this.history = [];
        }
        this.config = { ...initialConfig };
        this.mode = "config";
    }

    // Legacy open method for backward compatibility (opens directly to config)
    open(initialConfig: CardConfig) {
        this.openConfig(initialConfig, false);
    }

    goBack() {
        if (this.history.length > 0) {
            this.mode = this.history.pop()!;
        } else {
            this.close();
        }
    }

    close() {
        this.mode = "none";
        this.history = [];
    }

    save(newConfig: CardConfig) {
        this.config.onSave?.(newConfig);
        this.close();
    }
}

export const cardEditorStore = new CardEditorStore();
