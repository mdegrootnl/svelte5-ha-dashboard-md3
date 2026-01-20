<script lang="ts">
    import SideSheet from "./SideSheet.svelte";
    import IconLibraryAdd from "~icons/material-symbols/library-add";
    import IconHdrAuto from "~icons/material-symbols/hdr-auto";
    import IconViewModule from "~icons/material-symbols/view-module";
    import IconLightbulb from "~icons/material-symbols/lightbulb";
    import IconThermostat from "~icons/material-symbols/thermostat";
    import IconToggleOn from "~icons/material-symbols/toggle-on";
    import IconSensors from "~icons/material-symbols/sensors";
    import IconPlayCircle from "~icons/material-symbols/play-circle";

    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import type { CardConfig } from "$lib/types";
    import { createDefaultGridConfig } from "$lib/types/dashboard";

    let open = $derived(cardEditorStore.mode === "library");

    const cardTypes = [
        {
            type: "light",
            name: "Light",
            description: "Control lights and dimmers",
            icon: IconLightbulb,
            domain: "light",
        },
        {
            type: "title",
            name: "Title",
            description: "Section header",
            icon: IconHdrAuto,
            domain: "",
        },
        {
            type: "tabs",
            name: "Tabs",
            description: "Container with multiple tabs",
            icon: IconViewModule,
            domain: "",
        },
        {
            type: "switch",
            name: "Switch",
            description: "Toggle switches and outlets",
            icon: IconToggleOn,
            domain: "switch",
        },
        {
            type: "thermostat",
            name: "Thermostat",
            description: "Climate control",
            icon: IconThermostat,
            domain: "climate",
        },
        {
            type: "media",
            name: "Media Player",
            description: "Control media playback",
            icon: IconPlayCircle,
            domain: "media_player",
        },
        {
            type: "sensor",
            name: "Sensor",
            description: "Display sensor data",
            icon: IconSensors,
            domain: "sensor",
        },
    ];

    function handleSelect(cardType: any) {
        // Create initial config for the selected type
        const initialConfig: any = {
            entityId: "",
            name: "",
            domainFilter: cardType.domain,
            // Use 'button' for light/switch, specific types for others
            // Mapping needs to match what GridItem expects
            type:
                cardType.type === "thermostat" ||
                cardType.type === "media" ||
                cardType.type === "title" ||
                cardType.type === "tabs"
                    ? cardType.type
                    : "button",
        };

        if (cardType.type === "tabs") {
            initialConfig.tabs = [createDefaultGridConfig("Tab 1")];
        }

        // Capture the save handler defined when opening the library
        // We must capture it NOW, because when we call openConfig(), cardEditorStore.config will be overwritten
        const parentOnSave = cardEditorStore.config.onSave;

        // Pass a callback to handle the save from the config sheet
        initialConfig.onSave = (config: CardConfig) => {
            parentOnSave?.(config);
        };

        cardEditorStore.openConfig(initialConfig, true);
    }

    function handleClose() {
        cardEditorStore.close();
    }
</script>

<SideSheet
    {open}
    title="Add Card"
    subtitle="Select a card type to add"
    icon={IconLibraryAdd}
    onclose={handleClose}
>
    <div class="grid grid-cols-1 gap-2">
        {#each cardTypes as cardType}
            <button
                class="flex items-center gap-4 p-4 rounded-m3-md bg-m3-surface-container-high hover:bg-m3-surface-container-highest transition-colors text-left group"
                onclick={() => handleSelect(cardType)}
            >
                <div
                    class="flex items-center justify-center w-12 h-12 rounded-full bg-m3-secondary-container text-m3-on-secondary-container group-hover:bg-m3-primary-container group-hover:text-m3-on-primary-container transition-colors"
                >
                    <cardType.icon class="size-6" />
                </div>
                <div class="flex-1">
                    <h3 class="text-m3-title-medium text-m3-on-surface">
                        {cardType.name}
                    </h3>
                    <p class="text-m3-body-small text-m3-on-surface-variant">
                        {cardType.description}
                    </p>
                </div>
            </button>
        {/each}
    </div>
</SideSheet>
