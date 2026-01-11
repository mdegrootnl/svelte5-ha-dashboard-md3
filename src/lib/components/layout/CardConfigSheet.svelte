<script lang="ts">
    import SideSheet from "./SideSheet.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import EntityPicker from "$lib/components/md3/EntityPicker.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import ButtonCard from "$lib/components/cards/ButtonCard.svelte";
    import ThermostatCard from "$lib/components/cards/ThermostatCard.svelte";
    import MediaCard from "$lib/components/cards/MediaCard.svelte";
    import IconLightbulb from "~icons/material-symbols/lightbulb";
    import IconThermostat from "~icons/material-symbols/thermostat";
    import IconDevices from "~icons/material-symbols/devices";
    import IconToggleOn from "~icons/material-symbols/toggle-on";
    import IconSensors from "~icons/material-symbols/sensors";
    import IconPlayCircle from "~icons/material-symbols/play-circle";
    import { cardEditorStore } from "$lib/stores/cardEditor.svelte";
    import { getDomain } from "$lib/utils/entity";
    import type { ThermostatCardConfig, CardSize } from "$lib/types";

    // Computed proxy for cleaner access
    let open = $derived(cardEditorStore.mode === "config");
    let showBack = $derived(cardEditorStore.showBack);

    // Flexible binding for local edits
    let tempConfig = $state<{
        entityId: string;
        name: string;
        type?: "button" | "thermostat" | "media";
        secondaryEntityId: string;
        secondaryName: string;
        domainFilter?: string;
        cardSize: CardSize;
    }>({
        entityId: "",
        name: "",
        secondaryEntityId: "",
        secondaryName: "",
        domainFilter: undefined,
        cardSize: "standard",
    });

    // Get current entity domain for icon display
    let currentDomain = $derived(
        tempConfig.entityId ? getDomain(tempConfig.entityId) : "",
    );

    let isThermostatCard = $derived(
        cardEditorStore.config?.type === "thermostat",
    );
    let isMediaCard = $derived(
        cardEditorStore.config?.type === "media" ||
            currentDomain === "media_player",
    );

    // Sync when opening
    $effect(() => {
        if (open) {
            const config = cardEditorStore.config;
            tempConfig = {
                entityId: config.entityId || "",
                name: config.name || "",
                type: config.type,
                secondaryEntityId: (config as any).secondaryEntityId || "",
                secondaryName: (config as any).secondaryName || "",
                domainFilter: config.domainFilter,
                cardSize: config.cardSize || "standard",
            };
        }
    });

    // Get the appropriate icon component based on domain
    function getIconComponent(domain: string) {
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
        const finalConfig = {
            ...cardEditorStore.config,
            ...tempConfig,
        };
        cardEditorStore.save(finalConfig);
    }

    function handleClose() {
        cardEditorStore.close();
    }

    function handleBack() {
        cardEditorStore.goBack();
    }
</script>

<SideSheet
    bind:open
    title={isThermostatCard ? "Edit Thermostat" : "Edit Card"}
    subtitle={tempConfig.name || "Configure card settings"}
    icon={CurrentIcon}
    {showBack}
    onclose={handleClose}
    onback={handleBack}
>
    <div class="flex flex-col gap-4 pb-64">
        <!-- Card Size Selector -->
        <div class="flex flex-col gap-2">
            <span class="text-m3-label-medium text-m3-on-surface-variant"
                >Card Size</span
            >
            <div
                class="flex rounded-full bg-m3-surface-container-highest p-1 gap-1"
            >
                {#each ["condensed", "standard", "poster"] as size}
                    <button
                        class="flex-1 py-2 px-3 rounded-full text-m3-label-medium transition-all duration-200
                               {tempConfig.cardSize === size
                            ? 'bg-m3-secondary-container text-m3-on-secondary-container shadow-sm'
                            : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                        onclick={() => (tempConfig.cardSize = size as CardSize)}
                    >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Live Preview -->
        <div class="flex flex-col gap-2">
            <span class="text-m3-label-medium text-m3-on-surface-variant"
                >Preview</span
            >
            <!-- Preview container with visible card boundary -->
            <div class="bg-m3-surface-container-high p-2 rounded-m3-md">
                <div
                    class="pointer-events-none select-none rounded-m3-md overflow-hidden shadow-md transition-all duration-300"
                    style="height: {tempConfig.cardSize === 'condensed'
                        ? '80px'
                        : tempConfig.cardSize === 'standard'
                          ? '170px'
                          : '280px'};"
                >
                    {#if isThermostatCard}
                        <ThermostatCard
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            secondaryEntityId={tempConfig.secondaryEntityId}
                            secondaryName={tempConfig.secondaryName}
                            domainFilter={tempConfig.domainFilter || ""}
                        />
                    {:else if isMediaCard}
                        <MediaCard
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            domainFilter={tempConfig.domainFilter || ""}
                        />
                    {:else}
                        <ButtonCard
                            title={tempConfig.name || "Card Preview"}
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            domainFilter={tempConfig.domainFilter || ""}
                            icon={CurrentIcon}
                        />
                    {/if}
                </div>
            </div>

            <!-- Entity ID with autocomplete -->
            <EntityPicker
                label="Entity ID"
                placeholder={isThermostatCard
                    ? "climate.living_room"
                    : "light.living_room"}
                bind:value={tempConfig.entityId}
                domainFilter={tempConfig.domainFilter}
                class="w-full"
            />
            <TextField
                variant="outlined"
                label="Custom Name"
                placeholder={isThermostatCard ? "Binnen" : "Living Room Light"}
                bind:value={tempConfig.name}
                class="w-full"
            />

            <!-- Thermostat-specific fields -->
            {#if isThermostatCard}
                <div class="border-t border-m3-outline-variant/30 pt-4 mt-2">
                    <p
                        class="text-m3-label-medium text-m3-on-surface-variant mb-3"
                    >
                        Secondary Sensor (Optional)
                    </p>
                    <!-- Secondary entity with autocomplete (filtered to sensors) -->
                    <EntityPicker
                        label="Outside Sensor Entity"
                        placeholder="sensor.outdoor_temperature"
                        bind:value={tempConfig.secondaryEntityId}
                        domainFilter="sensor"
                        class="w-full"
                    />
                    <div class="mt-3">
                        <TextField
                            variant="outlined"
                            label="Outside Label"
                            placeholder="Buiten"
                            bind:value={tempConfig.secondaryName}
                        />
                    </div>
                </div>
            {/if}
        </div>
    </div>

    {#snippet actions()}
        <Button variant="text" onclick={handleClose}>Cancel</Button>
        <Button variant="filled" onclick={handleSave}>Save</Button>
    {/snippet}
</SideSheet>
