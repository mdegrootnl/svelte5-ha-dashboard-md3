<script lang="ts">
    import TextField from "$lib/components/md3/TextField.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import { fade, scale } from "svelte/transition";
    import IconClose from "~icons/material-symbols/close";
    import { cardEditorStore } from "$lib/stores/cardEditor.svelte";

    // Computed proxy for cleaner access, though direct store usage is fine
    let isOpen = $derived(cardEditorStore.isOpen);
    // Flexible binding for local edits
    let tempConfig = $state({ entityId: "", name: "", icon: "" });

    // Sync when opening
    $effect(() => {
        if (cardEditorStore.isOpen) {
            tempConfig = { ...cardEditorStore.config };
        }
    });

    function handleSave() {
        // preserve onSave callback from original config
        const finalConfig = {
            ...cardEditorStore.config,
            ...tempConfig,
        };
        cardEditorStore.save(finalConfig);
    }

    function handleCancel() {
        cardEditorStore.close();
    }
</script>

{#if isOpen}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-m3-scrim/50 backdrop-blur-sm"
        transition:fade={{ duration: 200 }}
        onclick={handleCancel}
        role="presentation"
    >
        <!-- Dialog Surface -->
        <div
            class="relative w-full max-w-sm bg-m3-surface-container-high rounded-m3-xl shadow-xl overflow-hidden flex flex-col"
            transition:scale={{ start: 0.9, duration: 200 }}
            onclick={(e) => e.stopPropagation()}
            role="dialog"
            tabindex="-1"
        >
            <!-- Header -->
            <div class="px-6 pt-6 pb-4 flex items-center justify-between">
                <h2 class="text-m3-headline-small text-m3-on-surface">
                    Edit Card
                </h2>
                <button
                    class="text-m3-on-surface-variant hover:text-m3-on-surface rounded-full p-2 hover:bg-m3-on-surface/10 transition-colors"
                    onclick={handleCancel}
                >
                    <IconClose class="size-6" />
                </button>
            </div>

            <!-- Content -->
            <div class="px-6 flex flex-col gap-4">
                <TextField
                    label="Entity ID"
                    placeholder="light.living_room"
                    bind:value={tempConfig.entityId}
                    class="w-full"
                />
                <TextField
                    label="Custom Name"
                    placeholder="Living Room Light"
                    bind:value={tempConfig.name}
                    class="w-full"
                />
                <TextField
                    label="Icon Name"
                    placeholder="lightbulb"
                    bind:value={tempConfig.icon}
                    class="w-full"
                />
            </div>

            <!-- Actions -->
            <div class="p-6 flex justify-end gap-2">
                <Button variant="text" onclick={handleCancel}>Cancel</Button>
                <Button variant="filled" onclick={handleSave}>Save</Button>
            </div>
        </div>
    </div>
{/if}
