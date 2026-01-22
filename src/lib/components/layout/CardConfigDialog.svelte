<script lang="ts">
    import TextField from "$lib/components/md3/TextField.svelte";
    import EntityPicker from "$lib/components/md3/EntityPicker.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import { fade, scale } from "svelte/transition";
    import IconClose from "~icons/material-symbols/close";
    import IconLightbulb from "~icons/material-symbols/lightbulb";
    import IconThermostat from "~icons/material-symbols/thermostat";
    import IconDevices from "~icons/material-symbols/devices";
    import IconToggleOn from "~icons/material-symbols/toggle-on";
    import IconSensors from "~icons/material-symbols/sensors";
    import IconPlayCircle from "~icons/material-symbols/play-circle";
    import IconList from "~icons/material-symbols/list";
    import IconViewModule from "~icons/material-symbols/view-module";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { getDomain } from "$lib/utils/entity";
    import type { ThermostatCardConfig, CardConfig } from "$lib/types";
    import { Dialog } from "bits-ui";

    // Check if this is a thermostat card config
    let isThermostatCard = $derived(
        cardEditorStore.config?.type === "thermostat",
    );

    let isTitleCard = $derived(cardEditorStore.config?.type === "title");
    let isTabCard = $derived(cardEditorStore.config?.type === "tabs");

    // Flexible binding for local edits (includes thermostat-specific fields)
    let tempConfig = $state<{
        entityId: string;
        name: string;
        type?: "button" | "thermostat" | "media" | "title" | "tabs";
        secondaryEntityId: string;
        secondaryName: string;
        subtitle: string;
    }>({
        entityId: "",
        name: "",
        secondaryEntityId: "",
        secondaryName: "",
        subtitle: "",
    });

    // Sync when opening
    $effect(() => {
        if (cardEditorStore.isOpen) {
            const config = cardEditorStore.config;
            tempConfig = {
                entityId: config.entityId || "",
                name: config.name || "",
                type: config.type,
                secondaryEntityId: (config as any).secondaryEntityId || "",
                secondaryName: (config as any).secondaryName || "",
                subtitle: (config as any).subtitle || "",
            };
        }
    });

    // Get current entity domain for icon display
    let currentDomain = $derived(
        tempConfig.entityId ? getDomain(tempConfig.entityId) : "",
    );

    // Get the appropriate icon component based on domain
    function getIconComponent(domain: string) {
        if (isTitleCard) return IconList;
        if (isTabCard) return IconViewModule;

        switch (domain) {
            case "light":
                return IconLightbulb;
            case "climate":
                return IconThermostat;
            case "switch":
                return IconToggleOn;
            case "sensor":
            case "binary_sensor":
                return IconSensors;
            case "media_player":
                return IconPlayCircle;
            default:
                return IconDevices;
        }
    }

    let CurrentIcon = $derived(getIconComponent(currentDomain));

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

<Dialog.Root
    bind:open={cardEditorStore.isOpen}
    onOpenChange={(open) => {
        if (!open) handleCancel();
    }}
>
    <Dialog.Portal>
        <Dialog.Overlay>
            {#snippet child({ props })}
                <div
                    {...props}
                    class="fixed inset-0 z-50 bg-m3-scrim/50 backdrop-blur-sm"
                    transition:fade={{ duration: 200 }}
                ></div>
            {/snippet}
        </Dialog.Overlay>
        <Dialog.Content>
            {#snippet child({ props })}
                <div
                    {...props}
                    class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 outline-none"
                    transition:scale={{ start: 0.9, duration: 200 }}
                >
                    <!-- Dialog Surface - Updated rounding to rounded-m3-lg (16px) to match card layouts -->
                    <div
                        class="bg-m3-surface-container-high rounded-m3-lg shadow-xl overflow-visible flex flex-col w-full"
                    >
                        <!-- Header with Icon -->
                        <div
                            class="px-6 pt-6 pb-4 flex items-center justify-between"
                        >
                            <div class="flex items-center gap-3">
                                <!-- Entity Icon -->
                                <div
                                    class="flex items-center justify-center w-10 h-10 rounded-full bg-m3-primary-container text-m3-on-primary-container"
                                >
                                    <CurrentIcon class="size-5" />
                                </div>
                                <Dialog.Title
                                    class="text-m3-headline-small text-m3-on-surface"
                                >
                                    {isThermostatCard
                                        ? "Edit Thermostat"
                                        : isTitleCard
                                          ? "Edit Title Card"
                                          : isTabCard
                                            ? "Edit Tab Card"
                                            : "Edit Card"}
                                </Dialog.Title>
                            </div>
                            <Dialog.Close
                                aria-label="Close"
                                class="text-m3-on-surface-variant hover:text-m3-on-surface rounded-full p-2 hover:bg-m3-on-surface/10 transition-colors"
                            >
                                <IconClose class="size-6" />
                            </Dialog.Close>
                        </div>

                        <!-- Content -->
                        <div class="px-6 flex flex-col gap-4">
                            <!-- Entity ID with autocomplete (Hidden for Title Card and Tab Card) -->
                            {#if !isTitleCard && !isTabCard}
                                <EntityPicker
                                    label="Entity ID"
                                    placeholder={isThermostatCard
                                        ? "climate.living_room"
                                        : "light.living_room"}
                                    bind:value={tempConfig.entityId}
                                    domainFilter={isThermostatCard
                                        ? "climate"
                                        : undefined}
                                    class="w-full"
                                />
                            {/if}

                            <TextField
                                variant="outlined"
                                label={isTitleCard ? "Title" : "Custom Name"}
                                placeholder={isThermostatCard
                                    ? "Binnen"
                                    : "Living Room Light"}
                                bind:value={tempConfig.name}
                                class="w-full"
                            />

                            {#if isTitleCard}
                                <TextField
                                    variant="outlined"
                                    label="Subtitle"
                                    placeholder="Optional subtitle"
                                    bind:value={tempConfig.subtitle}
                                    class="w-full"
                                />
                            {/if}

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
                                    <!-- Secondary entity with autocomplete (filtered to sensors) -->
                                    <EntityPicker
                                        label="Outside Sensor Entity"
                                        placeholder="sensor.outdoor_temperature"
                                        bind:value={
                                            tempConfig.secondaryEntityId
                                        }
                                        domainFilter="sensor"
                                        class="w-full"
                                    />
                                    <div class="mt-3">
                                        <TextField
                                            variant="outlined"
                                            label="Outside Label"
                                            placeholder="Buiten"
                                            bind:value={
                                                tempConfig.secondaryName
                                            }
                                            class="w-full"
                                        />
                                    </div>
                                </div>
                            {/if}
                        </div>

                        <!-- Actions -->
                        <div
                            class="px-6 pb-6 flex justify-end gap-2 items-center"
                        >
                            <Button variant="text" onclick={handleCancel}
                                >Cancel</Button
                            >

                            {#if cardEditorStore.config?.onDelete}
                                <Button
                                    variant="text"
                                    class="!text-m3-error hover:!bg-m3-error/10"
                                    onclick={() => {
                                        if (cardEditorStore.config.onDelete) {
                                            cardEditorStore.config.onDelete();
                                            cardEditorStore.close();
                                        }
                                    }}
                                >
                                    Delete
                                </Button>
                            {/if}

                            <Button variant="filled" onclick={handleSave}
                                >Save</Button
                            >
                        </div>
                    </div>
                </div>
            {/snippet}
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
