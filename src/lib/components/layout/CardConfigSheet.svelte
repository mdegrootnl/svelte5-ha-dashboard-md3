<script lang="ts">
    import SideSheet from "./SideSheet.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import EntityPicker from "$lib/components/md3/EntityPicker.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import ButtonCard from "$lib/features/dashboard/components/cards/ButtonCard.svelte";
    import ThermostatCard from "$lib/features/dashboard/components/cards/ThermostatCard.svelte";
    import MediaCard from "$lib/features/dashboard/components/cards/MediaCard.svelte";
    import TitleCard from "$lib/features/dashboard/components/cards/TitleCard.svelte";
    import GraphCard from "$lib/features/dashboard/components/cards/GraphCard.svelte";
    import NavigationCard from "$lib/features/dashboard/components/cards/NavigationCard.svelte";
    import RoomSummaryCard from "$lib/features/dashboard/components/cards/RoomSummaryCard.svelte";
    import EntityCollectionCard from "$lib/features/dashboard/components/cards/EntityCollectionCard.svelte";
    import EnergyFlowCard from "$lib/features/dashboard/components/cards/EnergyFlowCard.svelte";
    import CalendarAgendaCard from "$lib/features/dashboard/components/cards/CalendarAgendaCard.svelte";
    import WeatherOverviewCard from "$lib/features/dashboard/components/cards/WeatherOverviewCard.svelte";
    import RemotePanelCard from "$lib/features/dashboard/components/cards/RemotePanelCard.svelte";
    import DevicePanelCard from "$lib/features/dashboard/components/cards/DevicePanelCard.svelte";
    import IconLightbulb from "~icons/material-symbols/lightbulb";
    import IconThermostat from "~icons/material-symbols/thermostat";
    import IconDevices from "~icons/material-symbols/devices";
    import IconToggleOn from "~icons/material-symbols/toggle-on";
    import IconSensors from "~icons/material-symbols/sensors";
    import IconPlayCircle from "~icons/material-symbols/play-circle";
    import IconDelete from "~icons/material-symbols/delete";
    import IconHdrAuto from "~icons/material-symbols/hdr-auto";
    import IconViewModule from "~icons/material-symbols/view-module";
    import IconShowChart from "~icons/material-symbols/show-chart";
    import IconLink from "~icons/material-symbols/link";
    import IconAdd from "~icons/material-symbols/add";
    import IconBrush from "~icons/material-symbols/brush";
    import IconButton from "$lib/components/md3/IconButton.svelte";
    import IconPicker from "$lib/components/common/IconPicker.svelte";
    import ImagePicker from "$lib/components/settings/ImagePicker.svelte";
    import RoutePicker from "$lib/components/md3/RoutePicker.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { getDomain } from "$lib/utils/entity";
    import type {
        CardSize,
        GraphCardEntity,
        NavigationCardShortcut,
    } from "$lib/types";

    // Computed proxy for cleaner access
    let open = $derived(cardEditorStore.mode === "config");
    let showBack = $derived(cardEditorStore.showBack);
    let isIconPickerOpen = $state(false);

    // Flexible binding for local edits
    let tempConfig = $state<{
        entityId: string;
        name: string;
        type?:
            | "button"
            | "thermostat"
            | "media"
            | "title"
            | "tabs"
            | "graph"
            | "navigation"
            | "room"
            | "collection"
            | "energy"
            | "calendar"
            | "weather"
            | "remote"
            | "device_panel";
        secondaryEntityId: string;
        secondaryName: string;
        domainFilter?: string;
        cardSize: CardSize;
        subtitle: string;
        alignment: "start" | "center" | "end";
        hours_to_show: number;
        aggregate_func: "avg" | "min" | "max" | "last";
        graphEntities: GraphCardEntity[];
        color: string;
        backgroundColor: string;
        // Navigation Props
        path: string;
        iconType: "icon" | "image";
        imageUrl: string;
        icon: string;
        shortcuts: NavigationCardShortcut[];
        options: Record<string, any>;
    }>({
        entityId: "",
        name: "",
        secondaryEntityId: "",
        secondaryName: "",
        domainFilter: undefined,
        cardSize: "standard",
        subtitle: "",
        alignment: "start",
        hours_to_show: 24,
        aggregate_func: "avg",
        graphEntities: [],
        color: "",
        backgroundColor: "",
        path: "",
        iconType: "icon",
        imageUrl: "",
        icon: "",
        shortcuts: [],
        options: {},
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
    let isTitleCard = $derived(cardEditorStore.config?.type === "title");
    let isTabCard = $derived(cardEditorStore.config?.type === "tabs");
    let isGraphCard = $derived(cardEditorStore.config?.type === "graph");
    let isNavigationCard = $derived(
        cardEditorStore.config?.type === "navigation",
    );
    let isRoomCard = $derived(cardEditorStore.config?.type === "room");
    let isCollectionCard = $derived(cardEditorStore.config?.type === "collection");
    let isEnergyCard = $derived(cardEditorStore.config?.type === "energy");
    let isCalendarCard = $derived(cardEditorStore.config?.type === "calendar");
    let isWeatherCard = $derived(cardEditorStore.config?.type === "weather");
    let isRemoteCard = $derived(cardEditorStore.config?.type === "remote");
    let isDevicePanelCard = $derived(cardEditorStore.config?.type === "device_panel");
    let isSmartCard = $derived(
        isRoomCard ||
            isCollectionCard ||
            isEnergyCard ||
            isCalendarCard ||
            isWeatherCard ||
            isRemoteCard ||
            isDevicePanelCard,
    );

    $effect(() => {
        if (!open) return;
        if (isRoomCard) tempConfig.options.room ??= { source: "auto" };
        if (isCollectionCard) {
            tempConfig.options.collection ??= { mode: "auto", showState: true };
        }
        if (isEnergyCard) tempConfig.options.energy ??= { source: "auto" };
        if (isCalendarCard) {
            tempConfig.options.calendar ??= {
                source: "auto",
                daysToShow: 7,
                maxEvents: 4,
            };
        }
        if (isWeatherCard) tempConfig.options.weather ??= { source: "auto" };
        if (isRemoteCard) tempConfig.options.remote ??= { preset: "tv" };
        if (isDevicePanelCard) {
            tempConfig.options.device_panel ??= { preset: "auto" };
        }
    });

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
                subtitle: (config as any).subtitle || "",
                alignment: (config as any).alignment || "start",
                hours_to_show: (config as any).hours_to_show ?? 24,
                aggregate_func: (config as any).aggregate_func ?? "avg",
                graphEntities: JSON.parse(
                    JSON.stringify((config as any).graphEntities || []),
                ),
                color: config.color || "",
                backgroundColor: config.backgroundColor || "",
                path: (config as any).path || "",
                iconType: (config as any).iconType || "icon",
                imageUrl: (config as any).imageUrl || "",
                icon: (config as any).icon || "",
                shortcuts: JSON.parse(
                    JSON.stringify((config as any).shortcuts || []),
                ),
                options: JSON.parse(JSON.stringify((config as any).options || {})),
            };
        }
    });

    // Get the appropriate icon component based on domain
    function getIconComponent(domain: string) {
        if (isTitleCard) return IconHdrAuto;
        if (isTabCard) return IconViewModule;
        if (isGraphCard) return IconShowChart;
        if (isNavigationCard) return IconLink;
        if (isRoomCard) return IconViewModule;
        if (isCollectionCard) return IconSensors;
        if (isEnergyCard) return IconShowChart;
        if (isCalendarCard) return IconHdrAuto;
        if (isWeatherCard) return IconDevices;
        if (isRemoteCard) return IconPlayCircle;
        if (isDevicePanelCard) return IconDevices;

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

    let DefaultIconName = $derived.by(() => {
        if (isThermostatCard) return "thermostat";
        if (isMediaCard) return "play_circle";
        if (isGraphCard) return "show_chart";
        if (isNavigationCard) return "explore";
        if (isRoomCard) return "meeting_room";
        if (isCollectionCard) return "filter_alt";
        if (isEnergyCard) return "electric_bolt";
        if (isCalendarCard) return "calendar_month";
        if (isWeatherCard) return "partly_cloudy_day";
        if (isRemoteCard) return "settings_remote";
        if (isDevicePanelCard) return "developer_board";
        if (isTitleCard) return "title";
        if (isTabCard) return "view_module";

        switch (currentDomain) {
            case "light":
                return "lightbulb";
            case "climate":
                return "thermostat";
            case "switch":
                return "toggle_on";
            case "sensor":
            case "binary_sensor":
                return "sensors";
            case "media_player":
                return "play_circle";
            default:
                return "category";
        }
    });

    function normalizeOptions() {
        const options = tempConfig.options || {};
        if (isRoomCard && !options.room) options.room = { source: "auto" };
        if (isCollectionCard && !options.collection) {
            options.collection = { mode: "auto", showState: true };
        }
        if (isEnergyCard && !options.energy) options.energy = { source: "auto" };
        if (isCalendarCard && !options.calendar) {
            options.calendar = { source: "auto", daysToShow: 7, maxEvents: 4 };
        }
        if (isWeatherCard && !options.weather) options.weather = { source: "auto" };
        if (isRemoteCard && !options.remote) options.remote = { preset: "tv" };
        if (isDevicePanelCard && !options.device_panel) {
            options.device_panel = { preset: "auto" };
        }
        return options;
    }

    function handleSave() {
        const finalConfig = {
            ...cardEditorStore.config,
            ...tempConfig,
            options: normalizeOptions(),
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
    title={isThermostatCard
        ? "Edit Thermostat"
        : isTitleCard
          ? "Edit Title"
          : isTabCard
            ? "Edit Tab Card"
            : isGraphCard
              ? "Edit Graph Card"
              : isRoomCard
                ? "Edit Room Card"
                : isCollectionCard
                  ? "Edit Collection Card"
                  : isEnergyCard
                    ? "Edit Energy Card"
                    : isCalendarCard
                      ? "Edit Calendar Card"
                      : isWeatherCard
                        ? "Edit Weather Card"
                        : isRemoteCard
                          ? "Edit Remote Card"
                          : isDevicePanelCard
                            ? "Edit Device Panel"
                            : "Edit Card"}
    subtitle={tempConfig.name || "Configure card settings"}
    icon={CurrentIcon}
    {showBack}
    onclose={handleClose}
    onback={handleBack}
>
    <div class="flex flex-col gap-4 pb-64">
        <!-- Card Size Selector (Hidden for Title, Tab, and Navigation Card) -->
        {#if !isTitleCard && !isTabCard && !isNavigationCard && !isSmartCard}
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
                            onclick={() =>
                                (tempConfig.cardSize = size as CardSize)}
                        >
                            {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Alignment Selector (Only for Title Card) -->
        {#if isTitleCard}
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Alignment</span
                >
                <div
                    class="flex rounded-full bg-m3-surface-container-highest p-1 gap-1"
                >
                    {#each ["start", "center", "end"] as align}
                        <button
                            class="flex-1 py-2 px-3 rounded-full text-m3-label-medium transition-all duration-200
                                   {tempConfig.alignment === align
                                ? 'bg-m3-secondary-container text-m3-on-secondary-container shadow-sm'
                                : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                            onclick={() =>
                                (tempConfig.alignment = align as
                                    | "start"
                                    | "center"
                                    | "end")}
                        >
                            {align === "start"
                                ? "Top"
                                : align === "center"
                                  ? "Middle"
                                  : "Bottom"}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Live Preview -->
        <div class="flex flex-col gap-2">
            <span class="text-m3-label-medium text-m3-on-surface-variant"
                >Preview</span
            >
            <!-- Preview container with visible card boundary -->
            <div class="bg-m3-surface-container-high p-2 rounded-m3-md">
                <div
                    class="pointer-events-none select-none transition-all duration-300 {isTitleCard
                        ? ''
                        : 'rounded-m3-md overflow-hidden shadow-md'}"
                    style="height: {tempConfig.cardSize === 'condensed'
                        ? '80px'
                        : tempConfig.cardSize === 'standard' ||
                            isTitleCard ||
                            isNavigationCard ||
                            isSmartCard
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
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            icon={tempConfig.icon}
                        />
                    {:else if isNavigationCard}
                        <NavigationCard
                            name={tempConfig.name}
                            path={tempConfig.path}
                            icon={tempConfig.icon}
                            iconType={tempConfig.iconType}
                            imageUrl={tempConfig.imageUrl}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                        />
                    {:else if isRoomCard}
                        <RoomSummaryCard
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            icon={tempConfig.icon}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            options={tempConfig.options.room || { source: "auto" }}
                        />
                    {:else if isCollectionCard}
                        <EntityCollectionCard
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            icon={tempConfig.icon}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            options={tempConfig.options.collection || { mode: "auto", showState: true }}
                        />
                    {:else if isEnergyCard}
                        <EnergyFlowCard
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            icon={tempConfig.icon}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            options={tempConfig.options.energy || { source: "auto" }}
                        />
                    {:else if isCalendarCard}
                        <CalendarAgendaCard
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            icon={tempConfig.icon}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            options={tempConfig.options.calendar || { source: "auto", daysToShow: 7, maxEvents: 4 }}
                        />
                    {:else if isWeatherCard}
                        <WeatherOverviewCard
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            icon={tempConfig.icon}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            options={tempConfig.options.weather || { source: "auto" }}
                        />
                    {:else if isRemoteCard}
                        <RemotePanelCard
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            icon={tempConfig.icon}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            options={tempConfig.options.remote || { preset: "tv" }}
                        />
                    {:else if isDevicePanelCard}
                        <DevicePanelCard
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            icon={tempConfig.icon}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            options={tempConfig.options.device_panel || { preset: "auto" }}
                        />
                    {:else if isMediaCard}
                        <MediaCard
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            domainFilter={tempConfig.domainFilter || ""}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            icon={tempConfig.icon}
                        />
                    {:else if isTitleCard}
                        <TitleCard
                            name={tempConfig.name}
                            subtitle={tempConfig.subtitle}
                            alignment={tempConfig.alignment}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                        />
                    {:else if isTabCard}
                        <!-- Tab Card Preview -->
                        <div
                            class="w-full h-full flex flex-col bg-m3-surface-container-low rounded-xl border border-m3-outline-variant overflow-hidden"
                        >
                            <div
                                class="flex items-center gap-4 px-4 py-3 bg-m3-surface-container border-b border-m3-outline-variant/50"
                            >
                                <div
                                    class="flex items-center gap-2 text-m3-primary border-b-2 border-m3-primary pb-0.5"
                                >
                                    <IconViewModule class="size-4" />
                                    <span class="text-xs font-medium"
                                        >Tab 1</span
                                    >
                                </div>
                                <div
                                    class="flex items-center gap-2 text-m3-on-surface-variant/50"
                                >
                                    <div
                                        class="w-4 h-4 rounded bg-current opacity-20"
                                    ></div>
                                    <div
                                        class="w-12 h-2 rounded bg-current opacity-20"
                                    ></div>
                                </div>
                            </div>
                            <div
                                class="flex-1 p-2 grid grid-cols-2 gap-2 opacity-50"
                            >
                                <div
                                    class="bg-m3-surface-container-high rounded-lg h-full"
                                ></div>
                                <div
                                    class="bg-m3-surface-container-high rounded-lg h-full"
                                ></div>
                            </div>
                        </div>
                    {:else if isGraphCard}
                        <GraphCard
                            type="graph"
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            hours_to_show={tempConfig.hours_to_show}
                            aggregate_func={tempConfig.aggregate_func}
                            graphEntities={tempConfig.graphEntities}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            icon={tempConfig.icon}
                        />
                    {:else if isNavigationCard}
                        <NavigationCard
                            id="preview"
                            name={tempConfig.name}
                            path={tempConfig.path}
                            icon={tempConfig.icon}
                            iconType={tempConfig.iconType}
                            imageUrl={tempConfig.imageUrl}
                            shortcuts={tempConfig.shortcuts}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                        />
                    {:else}
                        <ButtonCard
                            title={tempConfig.name || "Card Preview"}
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            domainFilter={tempConfig.domainFilter || ""}
                            icon={tempConfig.icon || CurrentIcon}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                        />
                    {/if}
                </div>
            </div>

            <!-- Style Customization Section -->
            <div class="flex flex-col gap-3 px-1">
                <!-- Foreground Color Picker -->
                <div class="flex flex-col gap-1.5">
                    <span
                        class="text-[10px] text-m3-on-surface-variant uppercase tracking-wider font-bold opacity-70"
                        >Foreground & Icon</span
                    >
                    <div
                        class="grid grid-cols-7 gap-1.5 p-1.5 rounded-xl bg-m3-surface-container-high border border-m3-outline-variant/20"
                    >
                        {#each ["var(--color-m3-primary)", "var(--color-m3-secondary)", "var(--color-m3-tertiary)", "var(--color-m3-error)", "var(--color-m3-graph-1)", "var(--color-m3-graph-2)", "var(--color-m3-graph-3)", "var(--color-m3-graph-4)", "var(--color-m3-graph-5)", "var(--color-m3-graph-6)"] as colorVar}
                            <button
                                class="size-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 shadow-sm"
                                style:background-color={colorVar}
                                style:border-color={tempConfig.color ===
                                colorVar
                                    ? "white"
                                    : "transparent"}
                                onclick={() => (tempConfig.color = colorVar)}
                                title={colorVar
                                    .replace("var(--color-m3-", "")
                                    .replace(")", "")}
                                aria-label={colorVar}
                            ></button>
                        {/each}
                        <button
                            class="size-6 rounded-full border-2 border-m3-outline-variant bg-transparent flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                            style:border-color={!tempConfig.color
                                ? "white"
                                : "transparent"}
                            onclick={() => (tempConfig.color = "")}
                            title="Default Color"
                        >
                            <div
                                class="size-1 bg-m3-on-surface-variant rounded-full"
                            ></div>
                        </button>
                    </div>
                </div>

                <!-- Background Color Picker -->
                <div class="flex flex-col gap-1.5">
                    <span
                        class="text-[10px] text-m3-on-surface-variant uppercase tracking-wider font-bold opacity-70"
                        >Card Background</span
                    >
                    <div
                        class="grid grid-cols-5 gap-1.5 p-1.5 rounded-xl bg-m3-surface-container-high border border-m3-outline-variant/20"
                    >
                        {#each ["var(--color-m3-surface-container-low)", "var(--color-m3-surface-container)", "var(--color-m3-surface-container-high)", "var(--color-m3-surface-container-highest)", "var(--color-m3-primary-container)", "var(--color-m3-secondary-container)", "var(--color-m3-tertiary-container)", "var(--color-m3-error-container)"] as colorVar}
                            <button
                                class="size-full aspect-square rounded-lg border-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                style:background-color={colorVar}
                                style:border-color={tempConfig.backgroundColor ===
                                colorVar
                                    ? "white"
                                    : "transparent"}
                                onclick={() =>
                                    (tempConfig.backgroundColor = colorVar)}
                                title={colorVar
                                    .replace("var(--color-m3-", "")
                                    .replace(")", "")}
                                aria-label={colorVar}
                            ></button>
                        {/each}
                        <button
                            class="size-full aspect-square rounded-lg border-2 border-m3-outline-variant bg-transparent flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                            style:border-color={!tempConfig.backgroundColor
                                ? "white"
                                : "transparent"}
                            onclick={() => (tempConfig.backgroundColor = "")}
                            title="Theme Default"
                        >
                            <div
                                class="size-1 bg-m3-on-surface-variant rounded-full"
                            ></div>
                        </button>
                    </div>
                </div>
            </div>
            <!-- Entity ID with autocomplete (Hidden for Title, Tab, and Navigation Card) -->
            {#if !isTitleCard && !isTabCard && !isNavigationCard && !isRoomCard && !isCollectionCard}
                <EntityPicker
                    label="Entity ID"
                    placeholder={isThermostatCard
                        ? "climate.living_room"
                        : "light.living_room"}
                    bind:value={tempConfig.entityId}
                    domainFilter={tempConfig.domainFilter}
                    class="w-full"
                />
            {/if}

            <!-- Icon Picker for non-image cards -->
            {#if !isTabCard && !isTitleCard && (!isNavigationCard || tempConfig.iconType === "icon")}
                <div class="flex flex-col gap-2">
                    <span
                        class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                        >Icon Override</span
                    >
                    <button
                        class="flex items-center gap-3 w-full h-14 px-4 rounded-m3-sm border border-m3-outline bg-transparent hover:bg-m3-on-surface/5 transition-colors text-left group"
                        onclick={() =>
                            cardEditorStore.openIconPicker(
                                (icon) => (tempConfig.icon = icon),
                            )}
                    >
                        <div
                            class="size-8 rounded-full bg-m3-secondary-container text-m3-on-secondary-container flex items-center justify-center transition-colors group-hover:bg-m3-primary-container group-hover:text-m3-on-primary-container"
                        >
                            <DynamicIcon
                                name={tempConfig.icon || DefaultIconName}
                                class="size-5"
                            />
                        </div>
                        <div class="flex-1 flex flex-col min-w-0">
                            <span
                                class="text-m3-body-medium text-m3-on-surface truncate"
                            >
                                {tempConfig.icon
                                    ? `Custom: ${tempConfig.icon}`
                                    : `Default: ${DefaultIconName}`}
                            </span>
                            <span
                                class="text-m3-body-small text-m3-on-surface-variant opacity-70"
                            >
                                Click to change
                            </span>
                        </div>
                        <IconBrush class="size-5 text-m3-on-surface-variant" />
                    </button>
                </div>
            {/if}

            {#if isNavigationCard}
                <div
                    class="flex flex-col gap-4 border-t border-m3-outline-variant/30 pt-4 mt-2"
                >
                    <EntityPicker
                        label="Main Entity (Optional)"
                        placeholder="switch.all_lights"
                        bind:value={tempConfig.entityId}
                        class="w-full"
                    />

                    <RoutePicker
                        label="Route Path"
                        placeholder="/dashboard/living-room"
                        bind:value={tempConfig.path}
                        class="w-full"
                    />

                    <div class="flex flex-col gap-2">
                        <span
                            class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                            >Card Style</span
                        >
                        <div
                            class="flex rounded-full bg-m3-surface-container-highest p-1 gap-1"
                        >
                            {#each ["icon", "image"] as type}
                                <button
                                    class="flex-1 py-1 px-3 rounded-full text-m3-label-medium transition-all duration-200
                                       {tempConfig.iconType === type
                                        ? 'bg-m3-secondary-container text-m3-on-secondary-container shadow-sm'
                                        : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                    onclick={() =>
                                        (tempConfig.iconType = type as
                                            | "icon"
                                            | "image")}
                                >
                                    {type.charAt(0).toUpperCase() +
                                        type.slice(1)}
                                </button>
                            {/each}
                        </div>
                    </div>

                    {#if tempConfig.iconType === "image"}
                        <ImagePicker
                            label="Card Image"
                            orientation="landscape"
                            bind:value={tempConfig.imageUrl}
                            onchange={() => {}}
                        />
                    {/if}

                    <!-- Shortcuts Section -->
                    <div
                        class="flex flex-col gap-3 border-t border-m3-outline-variant/30 pt-4 mt-2"
                    >
                        <div class="flex items-center justify-between">
                            <span
                                class="text-m3-label-medium text-m3-on-surface-variant"
                                >Entity Shortcuts</span
                            >
                            <Button
                                variant="tonal"
                                onclick={() => {
                                    if (!tempConfig.shortcuts)
                                        tempConfig.shortcuts = [];
                                    tempConfig.shortcuts = [
                                        ...tempConfig.shortcuts,
                                        {
                                            id: Math.random()
                                                .toString(36)
                                                .substring(2, 11),
                                            entityId: "",
                                            icon: "",
                                        },
                                    ];
                                }}
                                icon={IconAdd}
                            >
                                Add
                            </Button>
                        </div>
                        {#if tempConfig.shortcuts.length > 0}
                            <div class="flex flex-col gap-2">
                                {#each tempConfig.shortcuts as shortcut, idx (shortcut.id)}
                                    <div
                                        class="flex flex-col gap-3 p-4 bg-m3-surface-container rounded-m3-md border border-m3-outline-variant/20 relative group"
                                    >
                                        <div
                                            class="flex items-start justify-between gap-4"
                                        >
                                            <div class="flex-1">
                                                <EntityPicker
                                                    label="Shortcut Entity"
                                                    placeholder="light.living_room"
                                                    bind:value={
                                                        shortcut.entityId
                                                    }
                                                />
                                            </div>
                                            <IconButton
                                                onclick={() => {
                                                    tempConfig.shortcuts =
                                                        tempConfig.shortcuts.filter(
                                                            (_, i) => i !== idx,
                                                        );
                                                }}
                                                title="Remove"
                                                icon={IconDelete}
                                                class="text-m3-error"
                                            />
                                        </div>

                                        <div class="flex items-center gap-4">
                                            <!-- Icon Selection -->
                                            <div
                                                class="flex flex-col gap-1.5 flex-1"
                                            >
                                                <span
                                                    class="text-[10px] text-m3-on-surface-variant uppercase tracking-wider font-bold opacity-70 ml-2"
                                                    >Icon</span
                                                >
                                                <button
                                                    class="flex items-center gap-3 h-10 px-3 rounded-m3-sm border border-m3-outline bg-transparent hover:bg-m3-on-surface/5 transition-colors text-left"
                                                    onclick={() =>
                                                        cardEditorStore.openIconPicker(
                                                            (icon) =>
                                                                (shortcut.icon =
                                                                    icon),
                                                        )}
                                                >
                                                    <div
                                                        class="size-6 rounded-full bg-m3-secondary-container text-m3-on-secondary-container flex items-center justify-center"
                                                    >
                                                        <DynamicIcon
                                                            name={shortcut.icon ||
                                                                "category"}
                                                            class="size-4"
                                                        />
                                                    </div>
                                                    <span
                                                        class="text-m3-body-small text-m3-on-surface truncate"
                                                    >
                                                        {shortcut.icon ||
                                                            "Default"}
                                                    </span>
                                                    <IconBrush
                                                        class="ml-auto size-4 text-m3-on-surface-variant opacity-50"
                                                    />
                                                </button>
                                            </div>

                                            <!-- Color Selection -->
                                            <div
                                                class="flex flex-col gap-1.5 flex-[1.5]"
                                            >
                                                <span
                                                    class="text-[10px] text-m3-on-surface-variant uppercase tracking-wider font-bold opacity-70 ml-2"
                                                    >Color</span
                                                >
                                                <div
                                                    class="flex flex-wrap gap-1.5 p-1 bg-m3-surface-container-high rounded-lg border border-m3-outline-variant/20"
                                                >
                                                    {#each ["var(--color-m3-primary)", "var(--color-m3-secondary)", "var(--color-m3-tertiary)", "var(--color-m3-error)", "var(--color-m3-graph-1)", "var(--color-m3-graph-2)"] as colorVar}
                                                        <button
                                                            class="size-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 shadow-sm"
                                                            style:background-color={colorVar}
                                                            style:border-color={shortcut.color ===
                                                            colorVar
                                                                ? "white"
                                                                : "transparent"}
                                                            onclick={() =>
                                                                (shortcut.color =
                                                                    colorVar)}
                                                            title={colorVar
                                                                .replace(
                                                                    "var(--color-m3-",
                                                                    "",
                                                                )
                                                                .replace(
                                                                    ")",
                                                                    "",
                                                                )}
                                                        ></button>
                                                    {/each}
                                                    <button
                                                        class="size-6 rounded-full border-1 border-m3-outline-variant bg-transparent flex items-center justify-center transition-all hover:scale-110"
                                                        style:border-color={!shortcut.color
                                                            ? "white"
                                                            : "var(--color-m3-outline-variant)"}
                                                        onclick={() =>
                                                            (shortcut.color =
                                                                "")}
                                                        title="Standard"
                                                    >
                                                        <div
                                                            class="size-1 bg-m3-on-surface-variant rounded-full"
                                                        ></div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <p
                                class="text-m3-body-small text-m3-on-surface-variant opacity-60"
                            >
                                Add entity shortcuts to control devices from the
                                navigation card.
                            </p>
                        {/if}
                    </div>
                </div>
            {/if}

            {#if isSmartCard}
                <div
                    class="flex flex-col gap-4 border-t border-m3-outline-variant/30 pt-4 mt-2"
                >
                    {#if isRoomCard}
                        <TextField
                            variant="outlined"
                            label="Area ID"
                            placeholder="living_room"
                            bind:value={tempConfig.options.room.areaId}
                            class="w-full"
                        />
                    {/if}

                    {#if isCollectionCard}
                        <div class="flex flex-col gap-2">
                            <span
                                class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                >Collection Mode</span
                            >
                            <div
                                class="grid grid-cols-2 gap-1 rounded-m3-md bg-m3-surface-container-highest p-1"
                            >
                                {#each ["auto", "lights_on", "low_battery", "unavailable", "updates", "custom"] as mode}
                                    <button
                                        class="py-2 px-3 rounded-m3-sm text-m3-label-medium transition-all {tempConfig
                                            .options.collection?.mode === mode
                                            ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                            : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                        onclick={() => {
                                            tempConfig.options.collection ??= {};
                                            tempConfig.options.collection.mode =
                                                mode;
                                        }}
                                    >
                                        {mode.replace("_", " ")}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    {#if isCalendarCard}
                        <div class="grid grid-cols-2 gap-3">
                            <TextField
                                variant="outlined"
                                label="Days"
                                type="number"
                                value={(tempConfig.options.calendar?.daysToShow ?? 7).toString()}
                                oninput={(e: Event) => {
                                    tempConfig.options.calendar ??= {};
                                    tempConfig.options.calendar.daysToShow =
                                        parseInt(
                                            (
                                                e.target as HTMLInputElement
                                            ).value,
                                        ) || 7;
                                }}
                            />
                            <TextField
                                variant="outlined"
                                label="Max Events"
                                type="number"
                                value={(tempConfig.options.calendar?.maxEvents ?? 4).toString()}
                                oninput={(e: Event) => {
                                    tempConfig.options.calendar ??= {};
                                    tempConfig.options.calendar.maxEvents =
                                        parseInt(
                                            (
                                                e.target as HTMLInputElement
                                            ).value,
                                        ) || 4;
                                }}
                            />
                        </div>
                    {/if}

                    {#if isDevicePanelCard}
                        <div class="flex flex-col gap-2">
                            <span
                                class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                >Panel Preset</span
                            >
                            <div
                                class="grid grid-cols-2 gap-1 rounded-m3-md bg-m3-surface-container-highest p-1"
                            >
                                {#each ["auto", "cover", "fan", "vacuum", "purifier", "timer", "todo"] as preset}
                                    <button
                                        class="py-2 px-3 rounded-m3-sm text-m3-label-medium transition-all {tempConfig
                                            .options.device_panel?.preset ===
                                        preset
                                            ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                            : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                        onclick={() => {
                                            tempConfig.options.device_panel ??= {};
                                            tempConfig.options.device_panel.preset =
                                                preset;
                                        }}
                                    >
                                        {preset.replace("_", " ")}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            <TextField
                variant="outlined"
                label={isNavigationCard
                    ? "Label"
                    : isTitleCard
                      ? "Title"
                      : "Custom Name"}
                placeholder={isThermostatCard
                    ? "Binnen"
                    : isTitleCard
                      ? "Living Room"
                      : isNavigationCard
                        ? "Kitchen"
                        : "Living Room Light"}
                bind:value={tempConfig.name}
                class="w-full"
            />

            {#if isTitleCard}
                <TextField
                    variant="outlined"
                    label="Subtitle"
                    placeholder="Main floor"
                    bind:value={tempConfig.subtitle}
                    class="w-full"
                />
            {/if}

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

            <!-- Graph-specific fields -->
            {#if isGraphCard}
                <div
                    class="border-t border-m3-outline-variant/30 pt-4 mt-2 flex flex-col gap-4"
                >
                    <TextField
                        variant="outlined"
                        label="Hours to Show"
                        type="number"
                        placeholder="24"
                        value={tempConfig.hours_to_show.toString()}
                        oninput={(e: Event) =>
                            (tempConfig.hours_to_show =
                                parseInt(
                                    (e.target as HTMLInputElement).value,
                                ) || 24)}
                        class="w-full"
                    />
                    <div class="flex flex-col gap-1">
                        <label
                            class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                            for="agg-func"
                        >
                            Aggregation Function
                        </label>
                        <select
                            id="agg-func"
                            bind:value={tempConfig.aggregate_func}
                            class="w-full h-14 px-4 rounded-m3-sm bg-transparent border border-m3-outline text-m3-on-surface focus:border-m3-primary outline-none transition-colors"
                        >
                            <option value="avg">Average</option>
                            <option value="min">Minimum</option>
                            <option value="max">Maximum</option>
                            <option value="last">Last Value</option>
                        </select>
                    </div>

                    <div
                        class="border-t border-m3-outline-variant/30 pt-4 flex flex-col gap-4"
                    >
                        <div class="flex items-center justify-between px-2">
                            <span class="text-m3-title-small text-m3-on-surface"
                                >Additional Sensors</span
                            >
                            <IconButton
                                icon={IconAdd}
                                onclick={() => {
                                    tempConfig.graphEntities = [
                                        ...tempConfig.graphEntities,
                                        { entity_id: "", name: "", color: "" },
                                    ];
                                }}
                            />
                        </div>

                        {#each tempConfig.graphEntities as entity, idx}
                            <div
                                class="p-3 rounded-m3-sm bg-m3-surface-container flex flex-col gap-3 relative border border-m3-outline-variant/30"
                            >
                                <button
                                    class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-m3-error text-m3-on-error flex items-center justify-center shadow-sm z-10"
                                    onclick={() => {
                                        tempConfig.graphEntities =
                                            tempConfig.graphEntities.filter(
                                                (_, i) => i !== idx,
                                            );
                                    }}
                                >
                                    <IconDelete class="size-4" />
                                </button>

                                <EntityPicker
                                    label="Sensor Entity"
                                    bind:value={entity.entity_id}
                                    domainFilter="sensor"
                                />

                                <div class="flex gap-2">
                                    <div class="flex-1">
                                        <TextField
                                            variant="outlined"
                                            label="Label"
                                            bind:value={entity.name}
                                        />
                                    </div>
                                    <div
                                        class="flex flex-col gap-1 shrink-0 px-1"
                                    >
                                        <span
                                            class="text-[10px] text-m3-on-surface-variant uppercase tracking-wider font-bold opacity-70"
                                            >Color</span
                                        >
                                        <div
                                            class="grid grid-cols-4 gap-1 p-1 rounded-lg bg-m3-surface-container-high border border-m3-outline-variant/20"
                                        >
                                            {#each Array(6) as _, i}
                                                {@const colorVar = `var(--color-m3-graph-${i + 1})`}
                                                <button
                                                    class="size-5 rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
                                                    style:background-color={colorVar}
                                                    style:border-color={entity.color ===
                                                    colorVar
                                                        ? "white"
                                                        : "transparent"}
                                                    onclick={() =>
                                                        (entity.color =
                                                            colorVar)}
                                                    title={`Color ${i + 1}`}
                                                ></button>
                                            {/each}
                                            <button
                                                class="size-5 rounded-full border-2 border-m3-outline-variant bg-transparent flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                                                style:border-color={!entity.color
                                                    ? "white"
                                                    : "transparent"}
                                                onclick={() =>
                                                    (entity.color = "")}
                                                title="Auto/Theme"
                                            >
                                                <div
                                                    class="size-1 bg-m3-on-surface-variant rounded-full"
                                                ></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>

    {#snippet actions()}
        <Button variant="text" onclick={handleClose}>Cancel</Button>
        {#if cardEditorStore.config.onDelete}
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
        <Button variant="filled" onclick={handleSave}>Save</Button>
    {/snippet}
</SideSheet>

{#if isIconPickerOpen}
    <IconPicker
        onselect={(icon) => {
            tempConfig.icon = icon;
            isIconPickerOpen = false;
        }}
        onclose={() => (isIconPickerOpen = false)}
    />
{/if}
