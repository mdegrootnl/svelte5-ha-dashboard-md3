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
    import {
        createDefaultGridConfig,
        type DashboardCardOptions,
        type DashboardCardType,
    } from "$lib/types/dashboard";
    import type { Component } from "svelte";
    import { themeStore } from "$lib/stores/theme.svelte";

    let open = $derived(cardEditorStore.mode === "library");

    type LibraryCardId = DashboardCardType | "light" | "switch";
    type LibrarySectionId = "core" | "layout" | "smart" | "specialist";

    interface LibraryCardDefinition {
        id: LibraryCardId;
        configType: DashboardCardType;
        name: string;
        description: string;
        sourcePattern: string;
        icon: Component;
        domain: string;
        section: LibrarySectionId;
        options?: DashboardCardOptions;
    }

    const cardSections: Array<{
        id: LibrarySectionId;
    }> = [
        { id: "core" },
        { id: "layout" },
        { id: "smart" },
        { id: "specialist" },
    ];

    const cardTypes: LibraryCardDefinition[] = [
        {
            id: "light",
            configType: "button",
            name: "cardLibrary.light.name",
            description: "cardLibrary.light.description",
            sourcePattern: "cardLibrary.pattern.md3Button",
            icon: IconLightbulb,
            domain: "light",
            section: "core",
        },
        {
            id: "title",
            configType: "title",
            name: "cardLibrary.title.name",
            description: "cardLibrary.title.description",
            sourcePattern: "cardLibrary.pattern.sectionLabel",
            icon: IconHdrAuto,
            domain: "",
            section: "layout",
        },
        {
            id: "tabs",
            configType: "tabs",
            name: "cardLibrary.tabs.name",
            description: "cardLibrary.tabs.description",
            sourcePattern: "cardLibrary.pattern.tabContainer",
            icon: IconViewModule,
            domain: "",
            section: "layout",
        },
        {
            id: "switch",
            configType: "button",
            name: "cardLibrary.switch.name",
            description: "cardLibrary.switch.description",
            sourcePattern: "cardLibrary.pattern.md3Button",
            icon: IconToggleOn,
            domain: "switch",
            section: "core",
        },
        {
            id: "thermostat",
            configType: "thermostat",
            name: "cardLibrary.thermostat.name",
            description: "cardLibrary.thermostat.description",
            sourcePattern: "cardLibrary.pattern.climatePanel",
            icon: IconThermostat,
            domain: "climate",
            section: "core",
        },
        {
            id: "media",
            configType: "media",
            name: "cardLibrary.media.name",
            description: "cardLibrary.media.description",
            sourcePattern: "cardLibrary.pattern.miniMedia",
            icon: IconPlayCircle,
            domain: "media_player",
            section: "specialist",
        },
        {
            id: "graph",
            configType: "graph",
            name: "cardLibrary.graph.name",
            description: "cardLibrary.graph.description",
            sourcePattern: "cardLibrary.pattern.miniGraph",
            icon: IconShowChart,
            domain: "sensor",
            section: "layout",
        },
        {
            id: "navigation",
            configType: "navigation",
            name: "cardLibrary.navigation.name",
            description: "cardLibrary.navigation.description",
            sourcePattern: "cardLibrary.pattern.bubbleNavigation",
            icon: IconLink,
            domain: "",
            section: "layout",
        },
        {
            id: "room",
            configType: "room",
            name: "cardLibrary.room.name",
            description: "cardLibrary.room.description",
            sourcePattern: "cardLibrary.pattern.mushroomBubble",
            icon: IconRoom,
            domain: "",
            section: "smart",
            options: { room: { source: "auto" } },
        },
        {
            id: "collection",
            configType: "collection",
            name: "cardLibrary.collection.name",
            description: "cardLibrary.collection.description",
            sourcePattern: "cardLibrary.pattern.autoEntities",
            icon: IconFilterAlt,
            domain: "",
            section: "smart",
            options: { collection: { mode: "auto", showState: true } },
        },
        {
            id: "energy",
            configType: "energy",
            name: "cardLibrary.energy.name",
            description: "cardLibrary.energy.description",
            sourcePattern: "cardLibrary.pattern.powerFlow",
            icon: IconBolt,
            domain: "sensor",
            section: "smart",
            options: { energy: { source: "auto" } },
        },
        {
            id: "calendar",
            configType: "calendar",
            name: "cardLibrary.calendar.name",
            description: "cardLibrary.calendar.description",
            sourcePattern: "cardLibrary.pattern.calendarPro",
            icon: IconCalendar,
            domain: "calendar",
            section: "smart",
            options: { calendar: { source: "auto", daysToShow: 7, maxEvents: 4 } },
        },
        {
            id: "weather",
            configType: "weather",
            name: "cardLibrary.weather.name",
            description: "cardLibrary.weather.description",
            sourcePattern: "cardLibrary.pattern.weatherRain",
            icon: IconWeather,
            domain: "weather",
            section: "smart",
            options: { weather: { source: "auto" } },
        },
        {
            id: "remote",
            configType: "remote",
            name: "cardLibrary.remote.name",
            description: "cardLibrary.remote.description",
            sourcePattern: "cardLibrary.pattern.remoteCards",
            icon: IconRemote,
            domain: "media_player",
            section: "specialist",
            options: { remote: { preset: "tv" } },
        },
        {
            id: "device_panel",
            configType: "device_panel",
            name: "cardLibrary.devicePanel.name",
            description: "cardLibrary.devicePanel.description",
            sourcePattern: "cardLibrary.pattern.deviceCards",
            icon: IconDevicePanel,
            domain: "",
            section: "specialist",
            options: { device_panel: { preset: "auto" } },
        },
    ];

    const groupedCards = $derived(
        cardSections
            .map((section) => ({
                ...section,
                cards: cardTypes.filter((cardType) => cardType.section === section.id),
            }))
            .filter((section) => section.cards.length > 0),
    );

    function cloneOptions(options: DashboardCardOptions | undefined) {
        return options ? structuredClone(options) : undefined;
    }

    function handleSelect(cardType: LibraryCardDefinition) {
        type LibraryConfig = {
            entityId: string;
            name: string;
            domainFilter: string;
            type: DashboardCardType;
            options?: DashboardCardOptions;
            tabs?: ReturnType<typeof createDefaultGridConfig>[];
            onSave?: (config: CardConfig) => void;
        };

        const initialConfig: LibraryConfig = {
            entityId: "",
            name: "",
            domainFilter: cardType.domain,
            type: cardType.configType,
        };

        if (cardType.configType === "tabs") {
            initialConfig.tabs = [createDefaultGridConfig(themeStore.t("dashboard.newTab"))];
        }

        const options = cloneOptions(cardType.options);
        if (options) initialConfig.options = options;

        // Capture the save handler defined when opening the library
        // We must capture it NOW, because when we call openConfig(), cardEditorStore.config will be overwritten
        const parentOnSave = cardEditorStore.config.onSave;

        // Pass a callback to handle the save from the config sheet
        initialConfig.onSave = (config: CardConfig) => {
            parentOnSave?.(config);
        };

        cardEditorStore.openConfig(initialConfig as CardConfig, true);
    }

    function handleClose() {
        cardEditorStore.close();
    }
</script>

<SideSheet
    {open}
    title={themeStore.t("cardLibrary.title")}
    subtitle={themeStore.t("cardLibrary.subtitle")}
    icon={IconLibraryAdd}
    onclose={handleClose}
>
    <div class="flex flex-col gap-5">
        {#each groupedCards as section}
            <section class="flex flex-col gap-2">
                <div class="px-1">
                    <h3 class="text-m3-title-small text-m3-on-surface">
                        {themeStore.t(`cardLibrary.section.${section.id}.title`)}
                    </h3>
                    <p class="text-m3-body-small text-m3-on-surface-variant">
                        {themeStore.t(`cardLibrary.section.${section.id}.description`)}
                    </p>
                </div>

                <div class="grid grid-cols-1 gap-2">
                    {#each section.cards as cardType}
                        <button
                            class="flex items-center gap-4 p-4 rounded-m3-md bg-m3-surface-container-high hover:bg-m3-surface-container-highest transition-colors text-left group"
                            onclick={() => handleSelect(cardType)}
                        >
                            <div
                                class="flex items-center justify-center w-12 h-12 rounded-full bg-m3-secondary-container text-m3-on-secondary-container group-hover:bg-m3-primary-container group-hover:text-m3-on-primary-container transition-colors shrink-0"
                            >
                                <cardType.icon class="size-6" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                    <h4
                                        class="text-m3-title-medium text-m3-on-surface truncate"
                                    >
                                        {themeStore.t(cardType.name)}
                                    </h4>
                                    <span
                                        class="w-fit max-w-full rounded-m3-full bg-m3-tertiary-container text-m3-on-tertiary-container px-2.5 py-1 text-m3-label-small truncate"
                                    >
                                        {themeStore.t(cardType.sourcePattern)}
                                    </span>
                                </div>
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant"
                                >
                                    {themeStore.t(cardType.description)}
                                </p>
                            </div>
                        </button>
                    {/each}
                </div>
            </section>
        {/each}
    </div>
</SideSheet>
