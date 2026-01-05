<script lang="ts">
    import TextField from "$lib/components/md3/TextField.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import { fade, scale } from "svelte/transition";
    import IconClose from "~icons/material-symbols/close";
    import { cardEditorStore } from "$lib/stores/cardEditor.svelte";
    import type { ThermostatCardConfig } from "$lib/types";

    // Computed proxy for cleaner access, though direct store usage is fine
    let isOpen = $derived(cardEditorStore.isOpen);

    // Check if this is a thermostat card config
    let isThermostatCard = $derived(
        cardEditorStore.config?.type === "thermostat",
    );

    // Flexible binding for local edits (includes thermostat-specific fields)
    let tempConfig = $state<{
        entityId: string;
        name: string;
        icon: string;
        type?: "button" | "thermostat";
        secondaryEntityId: string;
        secondaryName: string;
    }>({
        entityId: "",
        name: "",
        icon: "",
        secondaryEntityId: "",
        secondaryName: "",
    });

    // Sync when opening
    $effect(() => {
        if (cardEditorStore.isOpen) {
            const config = cardEditorStore.config;
            tempConfig = {
                entityId: config.entityId || "",
                name: config.name || "",
                icon: config.icon || "",
                type: config.type,
                secondaryEntityId: (config as any).secondaryEntityId || "",
                secondaryName: (config as any).secondaryName || "",
            };
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
                    {isThermostatCard ? "Edit Thermostat Card" : "Edit Card"}
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
                    placeholder={isThermostatCard
                        ? "climate.living_room"
                        : "light.living_room"}
                    bind:value={tempConfig.entityId}
                    class="w-full"
                />
                <TextField
                    label="Custom Name"
                    placeholder={isThermostatCard
                        ? "Binnen"
                        : "Living Room Light"}
                    bind:value={tempConfig.name}
                    class="w-full"
                />
                <TextField
                    label="Icon Name"
                    placeholder="lightbulb"
                    bind:value={tempConfig.icon}
                    class="w-full"
                />

                <!-- Thermostat-specific fields -->
                {#if isThermostatCard}
                    <div
                        class="border-t border-m3-outline-variant/30 pt-4 mt-2"
                    >
                        <p
                            class="text-m3-label-medium text-m3-on-surface-variant mb-3"
                        >
                            Secondary Sensor (Optional)
                        </p>
                        <TextField
                            label="Outside Sensor Entity"
                            placeholder="sensor.outdoor_temperature"
                            bind:value={tempConfig.secondaryEntityId}
                            class="w-full"
                        />
                        <div class="mt-3">
                            <TextField
                                label="Outside Label"
                                placeholder="Buiten"
                                bind:value={tempConfig.secondaryName}
                                class="w-full"
                            />
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Actions -->
            <div class="p-6 flex justify-end gap-2">
                <Button variant="text" onclick={handleCancel}>Cancel</Button>
                <Button variant="filled" onclick={handleSave}>Save</Button>
            </div>
        </div>
    </div>
{/if}
