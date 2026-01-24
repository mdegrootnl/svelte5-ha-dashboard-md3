<script lang="ts">
    import { themeStore } from "$lib/stores/theme.svelte";
    import { Button, TextField, IconButton } from "$lib";
    import IconPicker from "$lib/components/common/IconPicker.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { NavigationItem } from "$lib/types/config";
    import { generateUUID } from "$lib/utils/uuid";

    import Add from "~icons/material-symbols/add";
    import Delete from "~icons/material-symbols/delete";
    import Edit from "~icons/material-symbols/edit";
    import ArrowUpward from "~icons/material-symbols/arrow-upward";
    import ArrowDownward from "~icons/material-symbols/arrow-downward";
    import DragHandle from "~icons/material-symbols/drag-handle";

    let editingItem = $state<NavigationItem | null>(null);
    let isIconPickerOpen = $state(false);
    let tempIcon = $state("");

    function handleAdd() {
        const newItem: NavigationItem = {
            id: generateUUID(),
            label: "New Item",
            icon: "circle",
            href: "/",
        };
        themeStore.setNavigationItems([...themeStore.navigationItems, newItem]);
        editingItem = newItem;
    }

    function handleDelete(id: string) {
        themeStore.setNavigationItems(
            themeStore.navigationItems.filter((i) => i.id !== id),
        );
        if (editingItem?.id === id) editingItem = null;
    }

    function handleMove(index: number, direction: "up" | "down") {
        const items = [...themeStore.navigationItems];
        if (direction === "up" && index > 0) {
            [items[index], items[index - 1]] = [items[index - 1], items[index]];
        } else if (direction === "down" && index < items.length - 1) {
            [items[index], items[index + 1]] = [items[index + 1], items[index]];
        }
        themeStore.setNavigationItems(items);
    }

    function handleSaveEdit() {
        if (!editingItem) return;
        const items = themeStore.navigationItems.map((i) =>
            i.id === editingItem!.id ? editingItem! : i,
        );
        themeStore.setNavigationItems(items);
        editingItem = null;
    }

    function handleCancelEdit() {
        editingItem = null;
    }

    function startEditing(item: NavigationItem) {
        // Clone to avoid direct mutation before save
        editingItem = { ...item };
    }

    function openIconPicker() {
        if (editingItem) {
            tempIcon = editingItem.icon;
            isIconPickerOpen = true;
        }
    }

    function handleIconSelect(icon: string) {
        if (editingItem) {
            editingItem.icon = icon;
        }
        isIconPickerOpen = false;
    }
</script>

<div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
        <span class="text-m3-title-medium text-m3-on-surface"
            >Navigation Items</span
        >
        <Button variant="tonal" icon={Add} onclick={handleAdd}>Add Item</Button>
    </div>

    <!-- List -->
    <div class="flex flex-col gap-2">
        {#each themeStore.navigationItems as item, index (item.id)}
            <div
                class="flex items-center gap-3 p-3 rounded-lg border border-m3-outline-variant bg-m3-surface"
            >
                <div class="flex flex-col gap-1 items-center">
                    <button
                        class="p-1 rounded-full hover:bg-m3-surface-container-highest disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        disabled={index === 0}
                        onclick={() => handleMove(index, "up")}
                        title="Move Up"
                    >
                        <ArrowUpward
                            class="w-4 h-4 text-m3-on-surface-variant"
                        />
                    </button>
                    <button
                        class="p-1 rounded-full hover:bg-m3-surface-container-highest disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        disabled={index ===
                            themeStore.navigationItems.length - 1}
                        onclick={() => handleMove(index, "down")}
                        title="Move Down"
                    >
                        <ArrowDownward
                            class="w-4 h-4 text-m3-on-surface-variant"
                        />
                    </button>
                </div>

                <div
                    class="w-10 h-10 rounded-full bg-m3-secondary-container text-m3-on-secondary-container flex items-center justify-center shrink-0"
                >
                    <DynamicIcon name={item.icon} class="text-xl" />
                </div>

                <div class="flex-1 min-w-0">
                    <div
                        class="text-m3-body-large text-m3-on-surface font-medium truncate"
                    >
                        {item.label}
                    </div>
                    <div
                        class="text-m3-body-small text-m3-on-surface-variant truncate"
                    >
                        {item.href}
                    </div>
                </div>

                <div class="flex gap-1 shrink-0">
                    <IconButton
                        icon={Edit}
                        onclick={() => startEditing(item)}
                    />
                    <IconButton
                        icon={Delete}
                        onclick={() => handleDelete(item.id)}
                        class="text-m3-error hover:text-m3-error"
                    />
                </div>
            </div>
        {/each}
    </div>

    <!-- Edit Dialog / Form (Inline for now or modal?) -->
    <!-- Using a simple inline overlay or reuse Dialog if available. Sticking to inline edit mode for simplicity since we don't have a generic Dialog exported easily visible yet. -->
    {#if editingItem}
        <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
            <div
                class="bg-m3-surface-container-high rounded-xl p-6 w-full max-w-md shadow-xl flex flex-col gap-4"
            >
                <h3 class="text-m3-title-large text-m3-on-surface">
                    Edit Item
                </h3>

                <TextField label="Label" bind:value={editingItem.label} />
                <TextField label="Route" bind:value={editingItem.href} />

                <div class="flex gap-4 items-end">
                    <div class="flex-1">
                        <TextField
                            label="Icon Name"
                            bind:value={editingItem.icon}
                            disabled={true}
                        />
                    </div>
                    <!-- Preview & Picker Trigger -->
                    <button
                        onclick={openIconPicker}
                        class="w-14 h-14 rounded-lg border border-m3-outline flex items-center justify-center hover:bg-m3-surface-container-highest transition-colors mb-1"
                        title="Pick Icon"
                    >
                        <DynamicIcon name={editingItem.icon} class="text-2xl" />
                    </button>
                </div>
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    Click the icon box to select a new icon.
                </p>

                <div class="flex justify-end gap-2 mt-4">
                    <Button variant="text" onclick={handleCancelEdit}
                        >Cancel</Button
                    >
                    <Button variant="filled" onclick={handleSaveEdit}
                        >Save</Button
                    >
                </div>
            </div>
        </div>
    {/if}

    {#if isIconPickerOpen}
        <IconPicker
            onselect={handleIconSelect}
            onclose={() => (isIconPickerOpen = false)}
        />
    {/if}
</div>
