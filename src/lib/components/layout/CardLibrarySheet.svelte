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
    import IconLink from "~icons/material-symbols/link";
    import IconRoom from "~icons/material-symbols/meeting-room";
    import IconFilterAlt from "~icons/material-symbols/filter-alt";
    import IconBolt from "~icons/material-symbols/electric-bolt";
    import IconCalendar from "~icons/material-symbols/calendar-month";
    import IconWeather from "~icons/material-symbols/partly-cloudy-day";
    import IconRemote from "~icons/material-symbols/settings-remote";
    import IconDevicePanel from "~icons/material-symbols/developer-board";
    import IconShowChart from "~icons/material-symbols/show-chart";

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
            type: "graph",
            name: "Graph",
            description: "History graph with auto-aggregation",
            icon: IconShowChart,
            domain: "sensor",
        },
        {
            type: "navigation",
            name: "Navigation",
            description: "Link to another page",
            icon: IconLink,
            domain: "",
        },
        {
            type: "room",
            name: "Room",
            description: "Area summary with smart controls",
            icon: IconRoom,
            domain: "",
        },
        {
            type: "collection",
            name: "Collection",
            description: "Auto entity lists and status views",
            icon: IconFilterAlt,
            domain: "",
        },
        {
            type: "energy",
            name: "Energy",
            description: "Solar, grid, home, and usage overview",
            icon: IconBolt,
            domain: "sensor",
        },
        {
            type: "calendar",
            name: "Calendar",
            description: "Agenda from calendar entities",
            icon: IconCalendar,
            domain: "calendar",
        },
        {
            type: "weather",
            name: "Weather",
            description: "Weather, rain, wind, and outdoor sensors",
            icon: IconWeather,
            domain: "weather",
        },
        {
            type: "remote",
            name: "Remote",
            description: "TV and media remote controls",
            icon: IconRemote,
            domain: "media_player",
        },
        {
            type: "device_panel",
            name: "Device Panel",
            description: "Specialist cover, fan, vacuum, and timer controls",
            icon: IconDevicePanel,
            domain: "",
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
            type: [
                "thermostat",
                "media",
                "title",
                "tabs",
                "graph",
                "navigation",
                "room",
                "collection",
                "energy",
                "calendar",
                "weather",
                "remote",
                "device_panel",
            ].includes(cardType.type)
                ? cardType.type
                : "button",
        };

        if (cardType.type === "tabs") {
            initialConfig.tabs = [createDefaultGridConfig("Tab 1")];
        }
        if (cardType.type === "room") initialConfig.options = { room: { source: "auto" } };
        if (cardType.type === "collection") initialConfig.options = { collection: { mode: "auto", showState: true } };
        if (cardType.type === "energy") initialConfig.options = { energy: { source: "auto" } };
        if (cardType.type === "calendar") initialConfig.options = { calendar: { source: "auto", daysToShow: 7, maxEvents: 4 } };
        if (cardType.type === "weather") initialConfig.options = { weather: { source: "auto" } };
        if (cardType.type === "remote") initialConfig.options = { remote: { preset: "tv" } };
        if (cardType.type === "device_panel") initialConfig.options = { device_panel: { preset: "auto" } };

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
