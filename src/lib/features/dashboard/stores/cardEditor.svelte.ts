import type { CardConfig } from '$lib/types';
import { dashboardStore } from './dashboard.svelte';

export class CardEditorStore {
    mode = $state<"none" | "library" | "config">("none");
    config = $state<CardConfig>({ entityId: "", name: "", onSave: () => { } });
    isIconPickerOpen = $state(false);
    private iconSelectionCallback: ((icon: string) => void) | null = null;

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

    openIconPicker(onSelect: (icon: string) => void) {
        this.iconSelectionCallback = onSelect;
        this.isIconPickerOpen = true;
    }

    handleIconSelect(icon: string) {
        this.iconSelectionCallback?.(icon);
        this.isIconPickerOpen = false;
        this.iconSelectionCallback = null;
    }

    save(newConfig: CardConfig) {
        const isExistingCard = Boolean(this.config.id || newConfig.id);
        this.config.onSave?.(newConfig);
        if (isExistingCard && dashboardStore.config) {
            const itemId = newConfig.id ?? this.config.id;
            if (itemId) {
                dashboardStore.markItemModified(itemId);
            }
            dashboardStore.setConfig(dashboardStore.config);
        }
        this.close();
    }
}

export const cardEditorStore = new CardEditorStore();
