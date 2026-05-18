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
    import { haRegistryStore } from "$lib/stores/haRegistry.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { getDomain } from "$lib/utils/entity";
    import type {
        ButtonCardOptions,
        CalendarCardOptions,
        CardSize,
        CardAction,
        CollectionCardOptions,
        DashboardImageAttribution,
        DevicePanelCardOptions,
        EnergyCardOptions,
        EntityQueryConfig,
        GraphCardEntity,
        GraphChartType,
        NavigationCardShortcut,
        RemoteCardOptions,
        RoomCardOptions,
        WeatherCardOptions,
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
        chartType: GraphChartType;
        graphEntities: GraphCardEntity[];
        color: string;
        backgroundColor: string;
        // Navigation Props
        path: string;
        iconType: "icon" | "image";
        imageUrl: string;
        imageAttribution?: DashboardImageAttribution;
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
        chartType: "area",
        graphEntities: [],
        color: "",
        backgroundColor: "",
        path: "",
        iconType: "icon",
        imageUrl: "",
        imageAttribution: undefined,
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
    let isButtonCard = $derived(
        cardEditorStore.config?.type === "button" ||
            (!cardEditorStore.config?.type && currentDomain !== "media_player"),
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
        if (isButtonCard) tempConfig.options.button ??= {};
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
                chartType: (config as any).chartType ?? "area",
                graphEntities: JSON.parse(
                    JSON.stringify((config as any).graphEntities || []),
                ),
                color: config.color || "",
                backgroundColor: config.backgroundColor || "",
                path: (config as any).path || "",
                iconType: (config as any).iconType || "icon",
                imageUrl: (config as any).imageUrl || "",
                imageAttribution: (config as any).imageAttribution,
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

    type RoomSection =
        | "lights"
        | "climate"
        | "media"
        | "covers"
        | "sensors"
        | "health";

    const roomSourceModes = [
        { value: "auto", label: "Auto" },
        { value: "area", label: "Area" },
        { value: "floor", label: "Floor" },
        { value: "manual", label: "Manual" },
        { value: "query", label: "Query" },
    ] as const;

    const roomSectionOptions: Array<{ value: RoomSection; label: string }> = [
        { value: "lights", label: "Lights" },
        { value: "climate", label: "Climate" },
        { value: "media", label: "Media" },
        { value: "covers", label: "Covers" },
        { value: "sensors", label: "Sensors" },
        { value: "health", label: "Health" },
    ];

    const collectionModeOptions = [
        { value: "auto", label: "Auto" },
        { value: "lights_on", label: "Active" },
        { value: "low_battery", label: "Battery" },
        { value: "unavailable", label: "Offline" },
        { value: "updates", label: "Updates" },
        { value: "openings", label: "Openings" },
        { value: "motion", label: "Motion" },
        { value: "media_playing", label: "Media" },
        { value: "security", label: "Security" },
        { value: "custom", label: "Custom" },
    ] as const;

    const collectionPresentationOptions = [
        { value: "list", label: "List" },
        { value: "summary", label: "Summary" },
    ] as const;

    const energyModeOptions = [
        { value: "overview", label: "Overview" },
        { value: "flow", label: "Flow" },
        { value: "balance", label: "Balance" },
        { value: "sources", label: "Sources" },
        { value: "devices", label: "Devices" },
    ] as const;

    const energyHistoryRangeOptions = [
        { value: "last24h", label: "24h" },
        { value: "today", label: "Today" },
        { value: "7d", label: "7 days" },
        { value: "30d", label: "30 days" },
        { value: "12m", label: "12 months" },
    ] as const;

    const collectionDomainOptions = [
        "light",
        "switch",
        "fan",
        "cover",
        "climate",
        "media_player",
        "sensor",
        "binary_sensor",
        "update",
    ];

    const collectionStateOptions = [
        "on",
        "off",
        "open",
        "closed",
        "unlocked",
        "playing",
        "paused",
        "home",
        "triggered",
        "unavailable",
        "unknown",
    ];

    type EnergyEntityKey = Exclude<
        keyof EnergyCardOptions,
        "source" | "mode" | "historyRange" | "deviceEntityIds" | "hoursToShow"
    >;
    type WeatherEntityKey = Exclude<keyof WeatherCardOptions, "source">;
    type ActionOwner = "button" | "remote" | "device_panel";

    const buttonDisplayOptions = [
        { value: "tile", label: "Tile" },
        { value: "compact", label: "Compact" },
    ] as const;

    const buttonControlOptions = [
        { value: "auto", label: "Auto" },
        { value: "toggle", label: "Toggle" },
        { value: "brightness", label: "Brightness" },
        { value: "cover", label: "Cover" },
        { value: "button", label: "Press" },
        { value: "none", label: "None" },
    ] as const;

    const energyEntityFields: Array<{
        key: EnergyEntityKey;
        label: string;
        placeholder: string;
    }> = [
        {
            key: "solarPowerEntityId",
            label: "Solar Power",
            placeholder: "sensor.solar_power",
        },
        {
            key: "homePowerEntityId",
            label: "Home Load",
            placeholder: "sensor.home_power",
        },
        {
            key: "gridImportEntityId",
            label: "Grid Import",
            placeholder: "sensor.grid_import_power",
        },
        {
            key: "gridExportEntityId",
            label: "Grid Export",
            placeholder: "sensor.grid_export_power",
        },
        {
            key: "batteryPowerEntityId",
            label: "Battery Power",
            placeholder: "sensor.battery_power",
        },
        {
            key: "todayEnergyEntityId",
            label: "Energy Today",
            placeholder: "sensor.energy_today",
        },
        {
            key: "gasEntityId",
            label: "Gas",
            placeholder: "sensor.gas_today",
        },
        {
            key: "waterEntityId",
            label: "Water",
            placeholder: "sensor.water_today",
        },
    ];

    const weatherEntityFields: Array<{
        key: WeatherEntityKey;
        label: string;
        placeholder: string;
        domainFilter?: string;
    }> = [
        {
            key: "weatherEntityId",
            label: "Weather Entity",
            placeholder: "weather.home",
            domainFilter: "weather",
        },
        {
            key: "temperatureEntityId",
            label: "Temperature Sensor",
            placeholder: "sensor.outdoor_temperature",
            domainFilter: "sensor",
        },
        {
            key: "humidityEntityId",
            label: "Humidity Sensor",
            placeholder: "sensor.outdoor_humidity",
            domainFilter: "sensor",
        },
        {
            key: "rainEntityId",
            label: "Rain Sensor",
            placeholder: "sensor.rain_today",
            domainFilter: "sensor",
        },
        {
            key: "windEntityId",
            label: "Wind Sensor",
            placeholder: "sensor.wind_speed",
            domainFilter: "sensor",
        },
    ];

    const remotePresetOptions = [
        "tv",
        "receiver",
        "android_tv",
        "webos",
        "custom",
    ] as const;

    const devicePanelPresetOptions = [
        "auto",
        "cover",
        "fan",
        "vacuum",
        "purifier",
        "timer",
        "todo",
    ] as const;

    const graphChartTypeOptions: Array<{
        value: GraphChartType;
        label: string;
    }> = [
        { value: "area", label: "Area" },
        { value: "line", label: "Line" },
        { value: "bar", label: "Bar" },
        { value: "step", label: "Step" },
    ];

    type ColorOption = {
        value: string;
        label: string;
        description?: string;
    };

    const semanticForegroundColorOptions: ColorOption[] = [
        { value: "var(--color-m3-primary)", label: "Primary" },
        { value: "var(--color-m3-secondary)", label: "Secondary" },
        { value: "var(--color-m3-tertiary)", label: "Tertiary" },
        { value: "var(--color-m3-error)", label: "Error" },
    ];

    const graphColorOptions: ColorOption[] = Array.from(
        { length: 6 },
        (_, index) => ({
            value: `var(--color-m3-graph-${index + 1})`,
            label: `Graph ${index + 1}`,
            description: "Theme generated",
        }),
    );

    let foregroundColorOptions = $derived(
        isGraphCard
            ? graphColorOptions
            : [...semanticForegroundColorOptions, ...graphColorOptions],
    );

    let areaOptions = $derived(haRegistryStore.areas);
    let floorOptions = $derived(haRegistryStore.floors);

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
        if (isButtonCard && !options.button) options.button = {};
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
        if (isNavigationCard) {
            options.navigation ??= {};
            if (
                tempConfig.iconType === "image" &&
                (tempConfig.imageAttribution?.provider === "unsplash" ||
                    tempConfig.imageAttribution?.provider === "pexels")
            ) {
                options.navigation.imageSource = tempConfig.imageAttribution.provider;
            } else if (tempConfig.iconType === "image" && tempConfig.imageUrl && !options.navigation.imageSource) {
                options.navigation.imageSource = "manual";
            }
        }
        return options;
    }

    function ensureButtonOptions(): ButtonCardOptions {
        tempConfig.options ??= {};
        tempConfig.options.button ??= {};
        return tempConfig.options.button as ButtonCardOptions;
    }

    function updateButtonOptions(patch: Partial<ButtonCardOptions>) {
        tempConfig.options.button = {
            ...ensureButtonOptions(),
            ...patch,
        };
    }

    function ensureRoomOptions(): RoomCardOptions {
        tempConfig.options ??= {};
        tempConfig.options.room ??= { source: "auto" };
        return tempConfig.options.room as RoomCardOptions;
    }

    function updateRoomOptions(patch: Partial<RoomCardOptions>) {
        tempConfig.options.room = { ...ensureRoomOptions(), ...patch };
    }

    function setRoomSource(source: RoomCardOptions["source"]) {
        const current = ensureRoomOptions();
        updateRoomOptions({
            source,
            areaId: source === "area" ? current.areaId : undefined,
            floorId: source === "floor" ? current.floorId : undefined,
            entityIds: source === "manual" ? (current.entityIds ?? []) : undefined,
            query:
                source === "query"
                    ? (current.query ?? { limit: 12 })
                    : current.query,
        });
    }

    function setRoomEntity(index: number, value: string) {
        const current = ensureRoomOptions();
        const entityIds = [...(current.entityIds ?? [])];
        entityIds[index] = value;
        updateRoomOptions({ source: "manual", entityIds });
    }

    function addRoomEntity() {
        const current = ensureRoomOptions();
        updateRoomOptions({
            source: "manual",
            entityIds: [...(current.entityIds ?? []), ""],
        });
    }

    function removeRoomEntity(index: number) {
        const current = ensureRoomOptions();
        updateRoomOptions({
            entityIds: (current.entityIds ?? []).filter((_, i) => i !== index),
        });
    }

    function toggleRoomSection(section: RoomSection) {
        const current = ensureRoomOptions();
        const sections = current.sections ?? roomSectionOptions.map((item) => item.value);
        updateRoomOptions({
            sections: sections.includes(section)
                ? sections.filter((item) => item !== section)
                : [...sections, section],
        });
    }

    function updateRoomQuery(patch: Partial<EntityQueryConfig>) {
        const current = ensureRoomOptions();
        updateRoomOptions({
            source: "query",
            query: { ...(current.query ?? {}), ...patch },
        });
    }

    function ensureCollectionOptions(): CollectionCardOptions {
        tempConfig.options ??= {};
        tempConfig.options.collection ??= { mode: "auto", showState: true };
        return tempConfig.options.collection as CollectionCardOptions;
    }

    function updateCollectionOptions(patch: Partial<CollectionCardOptions>) {
        tempConfig.options.collection = {
            ...ensureCollectionOptions(),
            ...patch,
        };
    }

    function updateCollectionQuery(patch: Partial<EntityQueryConfig>) {
        const current = ensureCollectionOptions();
        updateCollectionOptions({
            mode: "custom",
            query: { ...(current.query ?? {}), ...patch },
        });
    }

    function toggleCollectionQueryValue(
        key: "domains" | "states" | "areaIds" | "floorIds",
        value: string,
    ) {
        const current = ensureCollectionOptions();
        const query = current.query ?? {};
        const values = [...((query[key] as string[] | undefined) ?? [])];
        const nextValues = values.includes(value)
            ? values.filter((item) => item !== value)
            : [...values, value];
        const patch = {
            [key]: nextValues.length > 0 ? nextValues : undefined,
        } as Partial<EntityQueryConfig>;
        updateCollectionQuery(patch);
    }

    function setCollectionEntity(index: number, value: string) {
        const current = ensureCollectionOptions();
        const entityIds = [...(current.entityIds ?? [])];
        entityIds[index] = value;
        updateCollectionOptions({ source: "manual", entityIds });
    }

    function addCollectionEntity() {
        const current = ensureCollectionOptions();
        updateCollectionOptions({
            source: "manual",
            entityIds: [...(current.entityIds ?? []), ""],
        });
    }

    function removeCollectionEntity(index: number) {
        const current = ensureCollectionOptions();
        updateCollectionOptions({
            entityIds: (current.entityIds ?? []).filter((_, i) => i !== index),
        });
    }

    function ensureEnergyOptions(): EnergyCardOptions {
        tempConfig.options ??= {};
        tempConfig.options.energy ??= { source: "auto" };
        return tempConfig.options.energy as EnergyCardOptions;
    }

    function updateEnergyOptions(patch: Partial<EnergyCardOptions>) {
        tempConfig.options.energy = { ...ensureEnergyOptions(), ...patch };
    }

    function setEnergyEntity(key: EnergyEntityKey, value: string) {
        updateEnergyOptions({
            source: "manual",
            [key]: value || undefined,
        });
    }

    function setEnergyDeviceEntity(index: number, value: string) {
        const current = ensureEnergyOptions();
        const deviceEntityIds = [...(current.deviceEntityIds ?? [])];
        deviceEntityIds[index] = value;
        updateEnergyOptions({
            source: "manual",
            deviceEntityIds,
        });
    }

    function addEnergyDeviceEntity() {
        const current = ensureEnergyOptions();
        updateEnergyOptions({
            source: "manual",
            deviceEntityIds: [...(current.deviceEntityIds ?? []), ""],
        });
    }

    function removeEnergyDeviceEntity(index: number) {
        const current = ensureEnergyOptions();
        updateEnergyOptions({
            deviceEntityIds: (current.deviceEntityIds ?? []).filter(
                (_, i) => i !== index,
            ),
        });
    }

    function ensureCalendarOptions(): CalendarCardOptions {
        tempConfig.options ??= {};
        tempConfig.options.calendar ??= {
            source: "auto",
            daysToShow: 7,
            maxEvents: 4,
        };
        return tempConfig.options.calendar as CalendarCardOptions;
    }

    function updateCalendarOptions(patch: Partial<CalendarCardOptions>) {
        tempConfig.options.calendar = {
            ...ensureCalendarOptions(),
            ...patch,
        };
    }

    function setCalendarEntity(index: number, value: string) {
        const current = ensureCalendarOptions();
        const entityIds = [...(current.entityIds ?? [])];
        entityIds[index] = value;
        updateCalendarOptions({ source: "manual", entityIds });
    }

    function addCalendarEntity() {
        const current = ensureCalendarOptions();
        updateCalendarOptions({
            source: "manual",
            entityIds: [...(current.entityIds ?? []), ""],
        });
    }

    function removeCalendarEntity(index: number) {
        const current = ensureCalendarOptions();
        updateCalendarOptions({
            entityIds: (current.entityIds ?? []).filter((_, i) => i !== index),
        });
    }

    function ensureWeatherOptions(): WeatherCardOptions {
        tempConfig.options ??= {};
        tempConfig.options.weather ??= { source: "auto" };
        return tempConfig.options.weather as WeatherCardOptions;
    }

    function updateWeatherOptions(patch: Partial<WeatherCardOptions>) {
        tempConfig.options.weather = {
            ...ensureWeatherOptions(),
            ...patch,
        };
    }

    function setWeatherEntity(key: WeatherEntityKey, value: string) {
        updateWeatherOptions({
            source: "manual",
            [key]: value || undefined,
        });
    }

    function ensureRemoteOptions(): RemoteCardOptions {
        tempConfig.options ??= {};
        tempConfig.options.remote ??= { preset: "tv" };
        return tempConfig.options.remote as RemoteCardOptions;
    }

    function updateRemoteOptions(patch: Partial<RemoteCardOptions>) {
        tempConfig.options.remote = {
            ...ensureRemoteOptions(),
            ...patch,
        };
    }

    function ensureDevicePanelOptions(): DevicePanelCardOptions {
        tempConfig.options ??= {};
        tempConfig.options.device_panel ??= { preset: "auto" };
        return tempConfig.options.device_panel as DevicePanelCardOptions;
    }

    function updateDevicePanelOptions(patch: Partial<DevicePanelCardOptions>) {
        tempConfig.options.device_panel = {
            ...ensureDevicePanelOptions(),
            ...patch,
        };
    }

    function getActions(owner: ActionOwner): CardAction[] {
        if (owner === "button") return tempConfig.options.button?.actions ?? [];
        return owner === "remote"
            ? (tempConfig.options.remote?.actions ?? [])
            : (tempConfig.options.device_panel?.actions ?? []);
    }

    function updateActions(owner: ActionOwner, actions: CardAction[]) {
        if (owner === "button") updateButtonOptions({ actions });
        else if (owner === "remote") updateRemoteOptions({ actions });
        else updateDevicePanelOptions({ actions });
    }

    function addAction(owner: ActionOwner) {
        updateActions(owner, [
            ...getActions(owner),
            {
                id: Math.random().toString(36).substring(2, 11),
                label: "",
                icon: "",
                domain: "",
                service: "",
            },
        ]);
    }

    function removeAction(owner: ActionOwner, index: number) {
        updateActions(
            owner,
            getActions(owner).filter((_, i) => i !== index),
        );
    }

    function updateAction(
        owner: ActionOwner,
        index: number,
        patch: Partial<CardAction>,
    ) {
        const actions = getActions(owner).map((action, i) =>
            i === index ? { ...action, ...patch } : action,
        );
        updateActions(owner, actions);
    }

    function updateActionCommand(
        owner: ActionOwner,
        index: number,
        command: string,
    ) {
        const action = getActions(owner)[index];
        if (!action) return;
        const serviceData = { ...(action.serviceData ?? {}) };
        if (command) serviceData.command = command;
        else delete serviceData.command;
        updateAction(owner, index, {
            serviceData:
                Object.keys(serviceData).length > 0 ? serviceData : undefined,
        });
    }

    function getActionCommand(action: CardAction) {
        const command = action.serviceData?.command;
        return typeof command === "string" ? command : "";
    }

    function devicePresetDomain(preset?: DevicePanelCardOptions["preset"]) {
        switch (preset) {
            case "cover":
            case "fan":
            case "vacuum":
            case "timer":
            case "todo":
                return preset;
            case "purifier":
                return "fan";
            default:
                return undefined;
        }
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

    function cardEditorTitle() {
        if (isThermostatCard) return themeStore.t("cardConfig.editThermostat");
        if (isTitleCard) return themeStore.t("cardConfig.editTitle");
        if (isTabCard) return themeStore.t("cardConfig.editTabCard");
        if (isGraphCard) return themeStore.t("cardConfig.editGraphCard");
        if (isRoomCard) return themeStore.t("cardConfig.editRoomCard");
        if (isCollectionCard) return themeStore.t("cardConfig.editCollectionCard");
        if (isEnergyCard) return themeStore.t("cardConfig.editEnergyCard");
        if (isCalendarCard) return themeStore.t("cardConfig.editCalendarCard");
        if (isWeatherCard) return themeStore.t("cardConfig.editWeatherCard");
        if (isRemoteCard) return themeStore.t("cardConfig.editRemoteCard");
        if (isDevicePanelCard) return themeStore.t("cardConfig.editDevicePanel");
        return themeStore.t("cardConfig.editCard");
    }
</script>

<SideSheet
    bind:open
    title={cardEditorTitle()}
    subtitle={tempConfig.name || themeStore.t("cardConfig.configureCardSettings")}
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
                    >{themeStore.t("cardConfig.cardSize")}</span
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
                    >{themeStore.t("cardConfig.alignment")}</span
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
                >{themeStore.t("cardConfig.preview")}</span
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
                            subtitle={tempConfig.subtitle}
                            path={tempConfig.path}
                            icon={tempConfig.icon}
                            iconType={tempConfig.iconType}
                            imageUrl={tempConfig.imageUrl}
                            imageAttribution={tempConfig.imageAttribution}
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
                            chartType={tempConfig.chartType}
                            graphEntities={tempConfig.graphEntities}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            icon={tempConfig.icon}
                        />
                    {:else if isNavigationCard}
                        <NavigationCard
                            id="preview"
                            name={tempConfig.name}
                            subtitle={tempConfig.subtitle}
                            path={tempConfig.path}
                            icon={tempConfig.icon}
                            iconType={tempConfig.iconType}
                            imageUrl={tempConfig.imageUrl}
                            imageAttribution={tempConfig.imageAttribution}
                            shortcuts={tempConfig.shortcuts}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                        />
                    {:else}
                        <ButtonCard
                            title={tempConfig.name || themeStore.t("cardConfig.cardPreview")}
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            domainFilter={tempConfig.domainFilter || ""}
                            icon={tempConfig.icon || CurrentIcon}
                            color={tempConfig.color}
                            backgroundColor={tempConfig.backgroundColor}
                            options={tempConfig.options.button || {}}
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
                        >{isGraphCard ? "Graph & Icon" : "Foreground & Icon"}</span
                    >
                    <div
                        class="grid grid-cols-7 gap-1.5 p-1.5 rounded-xl bg-m3-surface-container-high border border-m3-outline-variant/20"
                    >
                        {#each foregroundColorOptions as option}
                            <button
                                class="size-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 shadow-sm"
                                style:background-color={option.value}
                                style:border-color={tempConfig.color ===
                                option.value
                                    ? "white"
                                    : "transparent"}
                                onclick={() => (tempConfig.color = option.value)}
                                title={option.description
                                    ? `${option.label} (${option.description})`
                                    : option.label}
                                aria-label={option.description
                                    ? `${option.label}, ${option.description}`
                                    : option.label}
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

            {#if isButtonCard}
                <div
                    class="flex flex-col gap-4 border-t border-m3-outline-variant/30 pt-4 mt-2"
                >
                    <div class="flex flex-col gap-2">
                        <span
                            class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                            >Display</span
                        >
                        <div
                            class="grid grid-cols-2 gap-1 rounded-m3-md bg-m3-surface-container-highest p-1"
                        >
                            {#each buttonDisplayOptions as option}
                                <button
                                    class="py-2 px-3 rounded-m3-sm text-m3-label-medium transition-all {tempConfig
                                        .options.button?.display ===
                                        option.value ||
                                    (!tempConfig.options.button?.display &&
                                        option.value === 'tile')
                                        ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                        : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                    onclick={() =>
                                        updateButtonOptions({
                                            display: option.value,
                                        })}
                                >
                                    {option.label}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <span
                            class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                            >Control</span
                        >
                        <div
                            class="grid grid-cols-3 gap-1 rounded-m3-md bg-m3-surface-container-highest p-1"
                        >
                            {#each buttonControlOptions as option}
                                <button
                                    class="py-2 px-3 rounded-m3-sm text-m3-label-medium transition-all {tempConfig
                                        .options.button?.control ===
                                        option.value ||
                                    (!tempConfig.options.button?.control &&
                                        option.value === 'auto')
                                        ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                        : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                    onclick={() =>
                                        updateButtonOptions({
                                            control: option.value,
                                        })}
                                >
                                    {option.label}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <button
                            class="py-2 px-3 rounded-m3-full text-m3-label-medium transition-all {tempConfig
                                .options.button?.showState !== false
                                ? 'bg-m3-primary-container text-m3-on-primary-container'
                                : 'bg-m3-surface-container-high text-m3-on-surface-variant'}"
                            onclick={() =>
                                updateButtonOptions({
                                    showState:
                                        tempConfig.options.button?.showState ===
                                        false,
                                })}
                        >
                            State label
                        </button>
                        <button
                            class="py-2 px-3 rounded-m3-full text-m3-label-medium transition-all {tempConfig
                                .options.button?.stateColor !== false
                                ? 'bg-m3-primary-container text-m3-on-primary-container'
                                : 'bg-m3-surface-container-high text-m3-on-surface-variant'}"
                            onclick={() =>
                                updateButtonOptions({
                                    stateColor:
                                        tempConfig.options.button?.stateColor ===
                                        false,
                                })}
                        >
                            State color
                        </button>
                    </div>

                    <div class="flex flex-col gap-3">
                        <div class="flex items-center justify-between gap-2">
                            <span
                                class="text-m3-label-medium text-m3-on-surface-variant"
                                >Sub-actions</span
                            >
                            <div class="flex gap-2">
                                <Button
                                    variant="tonal"
                                    onclick={() =>
                                        updateButtonOptions({
                                            actions: undefined,
                                        })}
                                >
                                    Clear
                                </Button>
                                <Button
                                    variant="tonal"
                                    onclick={() => addAction("button")}
                                    icon={IconAdd}
                                >
                                    Add
                                </Button>
                            </div>
                        </div>

                        {#each tempConfig.options.button?.actions ?? [] as action, idx (action.id)}
                            <div
                                class="relative rounded-m3-md bg-m3-surface-container-high p-3 flex flex-col gap-3"
                            >
                                <IconButton
                                    onclick={() => removeAction("button", idx)}
                                    title="Remove"
                                    icon={IconDelete}
                                    class="absolute right-2 top-2 text-m3-error"
                                />
                                <div class="grid grid-cols-2 gap-3 pr-10">
                                    <TextField
                                        variant="outlined"
                                        label="Label"
                                        value={action.label ?? ""}
                                        oninput={(e: Event) =>
                                            updateAction("button", idx, {
                                                label: (
                                                    e.target as HTMLInputElement
                                                ).value,
                                            })}
                                    />
                                    <TextField
                                        variant="outlined"
                                        label="Icon"
                                        value={action.icon ?? ""}
                                        oninput={(e: Event) =>
                                            updateAction("button", idx, {
                                                icon: (
                                                    e.target as HTMLInputElement
                                                ).value,
                                            })}
                                    />
                                </div>
                                <EntityPicker
                                    label="Action Entity"
                                    placeholder="scene.movie"
                                    value={action.entityId ?? ""}
                                    onchange={(value) =>
                                        updateAction("button", idx, {
                                            entityId: value || undefined,
                                        })}
                                />
                                <div class="grid grid-cols-2 gap-3">
                                    <TextField
                                        variant="outlined"
                                        label="Domain"
                                        value={action.domain ?? ""}
                                        oninput={(e: Event) =>
                                            updateAction("button", idx, {
                                                domain:
                                                    (
                                                        e.target as HTMLInputElement
                                                    ).value || undefined,
                                            })}
                                    />
                                    <TextField
                                        variant="outlined"
                                        label="Service"
                                        value={action.service ?? ""}
                                        oninput={(e: Event) =>
                                            updateAction("button", idx, {
                                                service:
                                                    (
                                                        e.target as HTMLInputElement
                                                    ).value || undefined,
                                            })}
                                    />
                                </div>
                                <TextField
                                    variant="outlined"
                                    label="Command"
                                    value={getActionCommand(action)}
                                    oninput={(e: Event) =>
                                        updateActionCommand(
                                            "button",
                                            idx,
                                            (e.target as HTMLInputElement).value,
                                        )}
                                />
                            </div>
                        {/each}
                    </div>
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

                    <TextField
                        variant="outlined"
                        label="Subtitle"
                        placeholder="2 attention · 1 control on"
                        bind:value={tempConfig.subtitle}
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
                            bind:attribution={tempConfig.imageAttribution}
                            enableUnsplash
                            enablePexels
                            searchHint={tempConfig.name || "modern home interior"}
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
                        <div class="flex flex-col gap-2">
                            <span
                                class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                >Room Source</span
                            >
                            <div
                                class="grid grid-cols-3 gap-1 rounded-m3-md bg-m3-surface-container-highest p-1"
                            >
                                {#each roomSourceModes as sourceMode}
                                    <button
                                        class="py-2 px-3 rounded-m3-sm text-m3-label-medium transition-all {tempConfig
                                            .options.room?.source ===
                                            sourceMode.value ||
                                        (!tempConfig.options.room?.source &&
                                            sourceMode.value === 'auto')
                                            ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                            : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                        onclick={() =>
                                            setRoomSource(sourceMode.value)}
                                    >
                                        {sourceMode.label}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        {#if areaOptions.length > 0}
                            <div class="flex flex-col gap-2">
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                    >Area</span
                                >
                                <div class="flex flex-wrap gap-2">
                                    {#each areaOptions as area}
                                        <button
                                            class="px-3 py-2 rounded-m3-full text-m3-label-medium transition-all {tempConfig
                                                .options.room?.areaId ===
                                            area.area_id
                                                ? 'bg-m3-primary-container text-m3-on-primary-container'
                                                : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest'}"
                                            onclick={() =>
                                                updateRoomOptions({
                                                    source: "area",
                                                    areaId: area.area_id,
                                                    floorId: undefined,
                                                })}
                                        >
                                            {area.name}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {:else}
                            <TextField
                                variant="outlined"
                                label="Area ID"
                                placeholder="living_room"
                                value={tempConfig.options.room?.areaId ?? ""}
                                oninput={(e: Event) =>
                                    updateRoomOptions({
                                        source: "area",
                                        areaId: (
                                            e.target as HTMLInputElement
                                        ).value,
                                    })}
                                class="w-full"
                            />
                        {/if}

                        {#if floorOptions.length > 0}
                            <div class="flex flex-col gap-2">
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                    >Floor</span
                                >
                                <div class="flex flex-wrap gap-2">
                                    {#each floorOptions as floor}
                                        <button
                                            class="px-3 py-2 rounded-m3-full text-m3-label-medium transition-all {tempConfig
                                                .options.room?.floorId ===
                                            floor.floor_id
                                                ? 'bg-m3-tertiary-container text-m3-on-tertiary-container'
                                                : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest'}"
                                            onclick={() =>
                                                updateRoomOptions({
                                                    source: "floor",
                                                    floorId: floor.floor_id,
                                                    areaId: undefined,
                                                })}
                                        >
                                            {floor.name}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <div class="flex flex-col gap-2">
                            <span
                                class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                >Sections</span
                            >
                            <div class="grid grid-cols-2 gap-2">
                                {#each roomSectionOptions as section}
                                    {@const sections =
                                        tempConfig.options.room?.sections ??
                                        roomSectionOptions.map(
                                            (item) => item.value,
                                        )}
                                    <button
                                        class="flex items-center justify-between gap-2 px-3 py-2 rounded-m3-md text-m3-label-medium transition-all {sections.includes(
                                            section.value,
                                        )
                                            ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                            : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest'}"
                                        onclick={() =>
                                            toggleRoomSection(section.value)}
                                    >
                                        <span>{section.label}</span>
                                        <span>{sections.includes(section.value)
                                                ? "On"
                                                : "Off"}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>

                        {#if tempConfig.options.room?.source === "query"}
                            <div class="grid grid-cols-2 gap-3">
                                <TextField
                                    variant="outlined"
                                    label="Limit"
                                    type="number"
                                    value={(tempConfig.options.room?.query
                                        ?.limit ?? 12).toString()}
                                    oninput={(e: Event) =>
                                        updateRoomQuery({
                                            limit:
                                                parseInt(
                                                    (
                                                        e.target as HTMLInputElement
                                                    ).value,
                                                ) || 12,
                                        })}
                                />
                            </div>
                        {/if}

                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between">
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant"
                                    >Pinned Entities</span
                                >
                                <Button
                                    variant="tonal"
                                    onclick={addRoomEntity}
                                    icon={IconAdd}
                                >
                                    Add
                                </Button>
                            </div>
                            {#each tempConfig.options.room?.entityIds ?? [] as entityId, idx}
                                <div class="flex items-start gap-2">
                                    <EntityPicker
                                        label="Room Entity"
                                        placeholder="light.living_room"
                                        value={entityId}
                                        onchange={(value) =>
                                            setRoomEntity(idx, value)}
                                        class="flex-1"
                                    />
                                    <IconButton
                                        onclick={() => removeRoomEntity(idx)}
                                        title="Remove"
                                        icon={IconDelete}
                                        class="text-m3-error mt-2"
                                    />
                                </div>
                            {/each}
                            {#if (tempConfig.options.room?.entityIds ?? []).length === 0}
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant opacity-70"
                                >
                                    Leave empty to auto-discover room entities
                                    from the selected area or floor.
                                </p>
                            {/if}
                        </div>
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
                                {#each collectionModeOptions as modeOption}
                                    <button
                                        class="py-2 px-3 rounded-m3-sm text-m3-label-medium transition-all {tempConfig
                                            .options.collection?.mode ===
                                        modeOption.value
                                            ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                            : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                        onclick={() => {
                                            updateCollectionOptions({
                                                mode: modeOption.value,
                                                query:
                                                    modeOption.value ===
                                                    "custom"
                                                        ? (tempConfig.options
                                                              .collection
                                                              ?.query ?? {
                                                              limit: 12,
                                                          })
                                                        : tempConfig.options
                                                              .collection
                                                              ?.query,
                                            });
                                        }}
                                    >
                                        {modeOption.label}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <div
                            class="flex items-center justify-between gap-3 rounded-m3-md bg-m3-surface-container-high p-3"
                        >
                            <div class="min-w-0">
                                <p
                                    class="text-m3-label-large text-m3-on-surface"
                                >
                                    Show entity states
                                </p>
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant"
                                >
                                    Display values such as on, unavailable, or
                                    battery percent.
                                </p>
                            </div>
                            <button
                                class="shrink-0 px-4 py-2 rounded-m3-full text-m3-label-medium {tempConfig
                                    .options.collection?.showState !== false
                                    ? 'bg-m3-primary text-m3-on-primary'
                                    : 'bg-m3-surface-container-highest text-m3-on-surface-variant'}"
                                onclick={() =>
                                    updateCollectionOptions({
                                        showState:
                                            tempConfig.options.collection
                                                ?.showState === false,
                                    })}
                            >
                                {tempConfig.options.collection?.showState !==
                                false
                                    ? "On"
                                    : "Off"}
                            </button>
                        </div>

                        <div class="flex flex-col gap-2">
                            <span
                                class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                >Presentation</span
                            >
                            <div
                                class="grid grid-cols-2 gap-1 rounded-m3-md bg-m3-surface-container-highest p-1"
                            >
                                {#each collectionPresentationOptions as presentationOption}
                                    <button
                                        type="button"
                                        class="py-2 px-3 rounded-m3-sm text-m3-label-medium transition-all {(tempConfig
                                            .options.collection
                                            ?.presentation ?? 'list') ===
                                        presentationOption.value
                                            ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                            : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                        onclick={() =>
                                            updateCollectionOptions({
                                                presentation:
                                                    presentationOption.value,
                                            })}
                                    >
                                        {presentationOption.label}
                                    </button>
                                {/each}
                            </div>
                            <p
                                class="px-3 text-m3-body-small text-m3-on-surface-variant"
                            >
                                Summary is intended for generated attention
                                cards and compact dashboard status strips.
                            </p>
                        </div>

                        {#if tempConfig.options.collection?.mode === "low_battery"}
                            <TextField
                                variant="outlined"
                                label="Battery Threshold"
                                type="number"
                                value={(tempConfig.options.collection
                                    ?.threshold ?? 25).toString()}
                                oninput={(e: Event) =>
                                    updateCollectionOptions({
                                        threshold:
                                            parseInt(
                                                (
                                                    e.target as HTMLInputElement
                                                ).value,
                                            ) || 25,
                                    })}
                                class="w-full"
                            />
                        {/if}

                        {#if tempConfig.options.collection?.mode === "custom"}
                            <div class="flex flex-col gap-2">
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                    >Domains</span
                                >
                                <div class="flex flex-wrap gap-2">
                                    {#each collectionDomainOptions as domain}
                                        {@const domains =
                                            tempConfig.options.collection?.query
                                                ?.domains ?? []}
                                        <button
                                            class="px-3 py-2 rounded-m3-full text-m3-label-medium transition-all {domains.includes(
                                                domain,
                                            )
                                                ? 'bg-m3-primary-container text-m3-on-primary-container'
                                                : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest'}"
                                            onclick={() =>
                                                toggleCollectionQueryValue(
                                                    "domains",
                                                    domain,
                                                )}
                                        >
                                            {domain.replace("_", " ")}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <div class="flex flex-col gap-2">
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                    >States</span
                                >
                                <div class="flex flex-wrap gap-2">
                                    {#each collectionStateOptions as state}
                                        {@const states =
                                            tempConfig.options.collection?.query
                                                ?.states ?? []}
                                        <button
                                            class="px-3 py-2 rounded-m3-full text-m3-label-medium transition-all {states.includes(
                                                state,
                                            )
                                                ? 'bg-m3-tertiary-container text-m3-on-tertiary-container'
                                                : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest'}"
                                            onclick={() =>
                                                toggleCollectionQueryValue(
                                                    "states",
                                                    state,
                                                )}
                                        >
                                            {state}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <TextField
                                variant="outlined"
                                label="Result Limit"
                                type="number"
                                value={(tempConfig.options.collection?.query
                                    ?.limit ?? 12).toString()}
                                oninput={(e: Event) =>
                                    updateCollectionQuery({
                                        limit:
                                            parseInt(
                                                (
                                                    e.target as HTMLInputElement
                                                ).value,
                                            ) || 12,
                                    })}
                                class="w-full"
                            />
                        {/if}

                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between">
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant"
                                    >Pinned Entities</span
                                >
                                <Button
                                    variant="tonal"
                                    onclick={addCollectionEntity}
                                    icon={IconAdd}
                                >
                                    Add
                                </Button>
                            </div>
                            {#each tempConfig.options.collection?.entityIds ?? [] as entityId, idx}
                                <div class="flex items-start gap-2">
                                    <EntityPicker
                                        label="Collection Entity"
                                        placeholder="sensor.battery"
                                        value={entityId}
                                        onchange={(value) =>
                                            setCollectionEntity(idx, value)}
                                        class="flex-1"
                                    />
                                    <IconButton
                                        onclick={() =>
                                            removeCollectionEntity(idx)}
                                        title="Remove"
                                        icon={IconDelete}
                                        class="text-m3-error mt-2"
                                    />
                                </div>
                            {/each}
                            {#if (tempConfig.options.collection?.entityIds ?? []).length === 0}
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant opacity-70"
                                >
                                    Pinned entities override smart discovery but
                                    are never written unless you choose them.
                                </p>
                            {/if}
                        </div>
                    {/if}

                    {#if isEnergyCard}
                        <div class="flex flex-col gap-4">
                            <div class="flex flex-col gap-2">
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                    >Energy Mode</span
                                >
                                <div
                                    class="grid grid-cols-2 gap-1 rounded-m3-md bg-m3-surface-container-highest p-1"
                                >
                                    {#each energyModeOptions as modeOption}
                                        <button
                                            type="button"
                                            class="py-2 px-3 rounded-m3-sm text-m3-label-medium transition-all {(tempConfig
                                                .options.energy?.mode ??
                                                'overview') ===
                                            modeOption.value
                                                ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                                : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                            onclick={() =>
                                                updateEnergyOptions({
                                                    mode: modeOption.value,
                                                })}
                                        >
                                            {modeOption.label}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            {#if (tempConfig.options.energy?.mode ?? "overview") === "sources"}
                                <div class="flex flex-col gap-2">
                                    <span
                                        class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                        >History Range</span
                                    >
                                    <div
                                        class="grid grid-cols-2 gap-1 rounded-m3-md bg-m3-surface-container-highest p-1"
                                    >
                                        {#each energyHistoryRangeOptions as rangeOption}
                                            <button
                                                type="button"
                                                class="py-2 px-3 rounded-m3-sm text-m3-label-medium transition-all {(tempConfig
                                                    .options.energy
                                                    ?.historyRange ??
                                                    'last24h') ===
                                                rangeOption.value
                                                    ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                                    : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                                onclick={() =>
                                                    updateEnergyOptions({
                                                        historyRange:
                                                            rangeOption.value,
                                                    })}
                                            >
                                                {rangeOption.label}
                                            </button>
                                        {/each}
                                    </div>
                                </div>

                                {#if (tempConfig.options.energy?.historyRange ?? "last24h") === "last24h"}
                                    <TextField
                                        variant="outlined"
                                        label="Hours to Show"
                                        type="number"
                                        value={(tempConfig.options.energy?.hoursToShow ?? 24).toString()}
                                        oninput={(e: Event) =>
                                            updateEnergyOptions({
                                                hoursToShow: Math.max(
                                                    1,
                                                    parseInt(
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    ) || 24,
                                                ),
                                            })}
                                    />
                                {/if}
                            {/if}

                            {#if (tempConfig.options.energy?.mode ?? "overview") === "devices"}
                                <div class="flex flex-col gap-3">
                                    <div
                                        class="flex items-center justify-between"
                                    >
                                        <span
                                            class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                            >Pinned Device Sensors</span
                                        >
                                        <Button
                                            variant="tonal"
                                            onclick={addEnergyDeviceEntity}
                                            icon={IconAdd}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                    {#each tempConfig.options.energy?.deviceEntityIds ?? [] as entityId, idx}
                                        <div class="flex items-start gap-2">
                                            <EntityPicker
                                                label="Device Energy Sensor"
                                                placeholder="sensor.appliance_energy"
                                                value={entityId}
                                                domainFilter="sensor"
                                                onchange={(value) =>
                                                    setEnergyDeviceEntity(
                                                        idx,
                                                        value,
                                                    )}
                                                class="flex-1"
                                            />
                                            <IconButton
                                                onclick={() =>
                                                    removeEnergyDeviceEntity(
                                                        idx,
                                                    )}
                                                title="Remove"
                                                icon={IconDelete}
                                                class="text-m3-error mt-2"
                                            />
                                        </div>
                                    {/each}
                                    {#if (tempConfig.options.energy?.deviceEntityIds ?? []).length === 0}
                                        <p
                                            class="px-3 text-m3-body-small text-m3-on-surface-variant"
                                        >
                                            Leave empty to auto-discover
                                            energy and power sensors from the
                                            inventory.
                                        </p>
                                    {/if}
                                </div>
                            {/if}

                            <span
                                class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                >Energy Entities</span
                            >
                            <div class="grid grid-cols-1 gap-3">
                                {#each energyEntityFields as field}
                                    <EntityPicker
                                        label={field.label}
                                        placeholder={field.placeholder}
                                        value={tempConfig.options.energy?.[
                                            field.key
                                        ] ?? ""}
                                        domainFilter="sensor"
                                        onchange={(value) =>
                                            setEnergyEntity(field.key, value)}
                                        class="w-full"
                                    />
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
                                oninput={(e: Event) =>
                                    updateCalendarOptions({
                                        daysToShow: Math.max(
                                            1,
                                            parseInt(
                                                (
                                                    e.target as HTMLInputElement
                                                ).value,
                                            ) || 7,
                                        ),
                                    })}
                            />
                            <TextField
                                variant="outlined"
                                label="Max Events"
                                type="number"
                                value={(tempConfig.options.calendar?.maxEvents ?? 4).toString()}
                                oninput={(e: Event) =>
                                    updateCalendarOptions({
                                        maxEvents: Math.max(
                                            1,
                                            parseInt(
                                                (
                                                    e.target as HTMLInputElement
                                                ).value,
                                            ) || 4,
                                        ),
                                    })}
                            />
                        </div>

                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between">
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant"
                                    >Calendar Entities</span
                                >
                                <Button
                                    variant="tonal"
                                    onclick={addCalendarEntity}
                                    icon={IconAdd}
                                >
                                    Add
                                </Button>
                            </div>
                            {#each tempConfig.options.calendar?.entityIds ?? [] as entityId, idx}
                                <div class="flex items-start gap-2">
                                    <EntityPicker
                                        label="Calendar Entity"
                                        placeholder="calendar.family"
                                        value={entityId}
                                        domainFilter="calendar"
                                        onchange={(value) =>
                                            setCalendarEntity(idx, value)}
                                        class="flex-1"
                                    />
                                    <IconButton
                                        onclick={() =>
                                            removeCalendarEntity(idx)}
                                        title="Remove"
                                        icon={IconDelete}
                                        class="text-m3-error mt-2"
                                    />
                                </div>
                            {/each}
                        </div>
                    {/if}

                    {#if isWeatherCard}
                        <div class="flex flex-col gap-3">
                            <span
                                class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                >Weather Entities</span
                            >
                            <div class="grid grid-cols-1 gap-3">
                                {#each weatherEntityFields as field}
                                    <EntityPicker
                                        label={field.label}
                                        placeholder={field.placeholder}
                                        value={tempConfig.options.weather?.[
                                            field.key
                                        ] ?? ""}
                                        domainFilter={field.domainFilter}
                                        onchange={(value) =>
                                            setWeatherEntity(field.key, value)}
                                        class="w-full"
                                    />
                                {/each}
                            </div>
                        </div>
                    {/if}

                    {#if isRemoteCard}
                        <div class="flex flex-col gap-2">
                            <span
                                class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                >Remote Preset</span
                            >
                            <div
                                class="grid grid-cols-2 gap-1 rounded-m3-md bg-m3-surface-container-highest p-1"
                            >
                                {#each remotePresetOptions as preset}
                                    <button
                                        class="py-2 px-3 rounded-m3-sm text-m3-label-medium capitalize transition-all {tempConfig
                                            .options.remote?.preset === preset
                                            ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                            : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                        onclick={() =>
                                            updateRemoteOptions({ preset })}
                                    >
                                        {preset.replace("_", " ")}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 gap-3">
                            <EntityPicker
                                label="Remote Entity"
                                placeholder="remote.living_room_tv"
                                value={tempConfig.options.remote
                                    ?.remoteEntityId ?? ""}
                                domainFilter="remote"
                                onchange={(value) =>
                                    updateRemoteOptions({
                                        source: "manual",
                                        remoteEntityId: value || undefined,
                                    })}
                                class="w-full"
                            />
                            <EntityPicker
                                label="Media Player"
                                placeholder="media_player.tv"
                                value={tempConfig.options.remote
                                    ?.mediaPlayerEntityId ?? ""}
                                domainFilter="media_player"
                                onchange={(value) =>
                                    updateRemoteOptions({
                                        source: "manual",
                                        mediaPlayerEntityId:
                                            value || undefined,
                                    })}
                                class="w-full"
                            />
                        </div>

                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between gap-2">
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant"
                                    >Custom Actions</span
                                >
                                <div class="flex gap-2">
                                    <Button
                                        variant="tonal"
                                        onclick={() =>
                                            updateRemoteOptions({
                                                actions: undefined,
                                            })}
                                    >
                                        Defaults
                                    </Button>
                                    <Button
                                        variant="tonal"
                                        onclick={() => addAction("remote")}
                                        icon={IconAdd}
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                            {#each tempConfig.options.remote?.actions ?? [] as action, idx (action.id)}
                                <div
                                    class="relative rounded-m3-md bg-m3-surface-container-high p-3 flex flex-col gap-3"
                                >
                                    <IconButton
                                        onclick={() =>
                                            removeAction("remote", idx)}
                                        title="Remove"
                                        icon={IconDelete}
                                        class="absolute right-2 top-2 text-m3-error"
                                    />
                                    <div class="grid grid-cols-2 gap-3 pr-10">
                                        <TextField
                                            variant="outlined"
                                            label="Label"
                                            value={action.label ?? ""}
                                            oninput={(e: Event) =>
                                                updateAction("remote", idx, {
                                                    label: (
                                                        e.target as HTMLInputElement
                                                    ).value,
                                                })}
                                        />
                                        <TextField
                                            variant="outlined"
                                            label="Icon"
                                            value={action.icon ?? ""}
                                            oninput={(e: Event) =>
                                                updateAction("remote", idx, {
                                                    icon: (
                                                        e.target as HTMLInputElement
                                                    ).value,
                                                })}
                                        />
                                    </div>
                                    <EntityPicker
                                        label="Action Entity"
                                        placeholder="media_player.tv"
                                        value={action.entityId ?? ""}
                                        onchange={(value) =>
                                            updateAction("remote", idx, {
                                                entityId: value || undefined,
                                            })}
                                    />
                                    <div class="grid grid-cols-2 gap-3">
                                        <TextField
                                            variant="outlined"
                                            label="Domain"
                                            value={action.domain ?? ""}
                                            oninput={(e: Event) =>
                                                updateAction("remote", idx, {
                                                    domain:
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).value || undefined,
                                                })}
                                        />
                                        <TextField
                                            variant="outlined"
                                            label="Service"
                                            value={action.service ?? ""}
                                            oninput={(e: Event) =>
                                                updateAction("remote", idx, {
                                                    service:
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).value || undefined,
                                                })}
                                        />
                                    </div>
                                    <TextField
                                        variant="outlined"
                                        label="Command"
                                        value={getActionCommand(action)}
                                        oninput={(e: Event) =>
                                            updateActionCommand(
                                                "remote",
                                                idx,
                                                (
                                                    e.target as HTMLInputElement
                                                ).value,
                                            )}
                                    />
                                </div>
                            {/each}
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
                                {#each devicePanelPresetOptions as preset}
                                    <button
                                        class="py-2 px-3 rounded-m3-sm text-m3-label-medium capitalize transition-all {tempConfig
                                            .options.device_panel?.preset ===
                                        preset
                                            ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                            : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'}"
                                        onclick={() =>
                                            updateDevicePanelOptions({
                                                preset,
                                            })}
                                    >
                                        {preset.replace("_", " ")}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <EntityPicker
                            label="Device Entity"
                            placeholder="cover.blinds"
                            value={tempConfig.options.device_panel?.entityId ??
                                ""}
                            domainFilter={devicePresetDomain(
                                tempConfig.options.device_panel?.preset,
                            )}
                            onchange={(value) =>
                                updateDevicePanelOptions({
                                    source: "manual",
                                    entityId: value || undefined,
                                })}
                            class="w-full"
                        />

                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between gap-2">
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant"
                                    >Custom Actions</span
                                >
                                <div class="flex gap-2">
                                    <Button
                                        variant="tonal"
                                        onclick={() =>
                                            updateDevicePanelOptions({
                                                actions: undefined,
                                            })}
                                    >
                                        Defaults
                                    </Button>
                                    <Button
                                        variant="tonal"
                                        onclick={() =>
                                            addAction("device_panel")}
                                        icon={IconAdd}
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                            {#each tempConfig.options.device_panel?.actions ?? [] as action, idx (action.id)}
                                <div
                                    class="relative rounded-m3-md bg-m3-surface-container-high p-3 flex flex-col gap-3"
                                >
                                    <IconButton
                                        onclick={() =>
                                            removeAction("device_panel", idx)}
                                        title="Remove"
                                        icon={IconDelete}
                                        class="absolute right-2 top-2 text-m3-error"
                                    />
                                    <div class="grid grid-cols-2 gap-3 pr-10">
                                        <TextField
                                            variant="outlined"
                                            label="Label"
                                            value={action.label ?? ""}
                                            oninput={(e: Event) =>
                                                updateAction(
                                                    "device_panel",
                                                    idx,
                                                    {
                                                        label: (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    },
                                                )}
                                        />
                                        <TextField
                                            variant="outlined"
                                            label="Icon"
                                            value={action.icon ?? ""}
                                            oninput={(e: Event) =>
                                                updateAction(
                                                    "device_panel",
                                                    idx,
                                                    {
                                                        icon: (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    },
                                                )}
                                        />
                                    </div>
                                    <EntityPicker
                                        label="Action Entity"
                                        placeholder="cover.blinds"
                                        value={action.entityId ?? ""}
                                        onchange={(value) =>
                                            updateAction("device_panel", idx, {
                                                entityId: value || undefined,
                                            })}
                                    />
                                    <div class="grid grid-cols-2 gap-3">
                                        <TextField
                                            variant="outlined"
                                            label="Domain"
                                            value={action.domain ?? ""}
                                            oninput={(e: Event) =>
                                                updateAction(
                                                    "device_panel",
                                                    idx,
                                                    {
                                                        domain:
                                                            (
                                                                e.target as HTMLInputElement
                                                            ).value ||
                                                            undefined,
                                                    },
                                                )}
                                        />
                                        <TextField
                                            variant="outlined"
                                            label="Service"
                                            value={action.service ?? ""}
                                            oninput={(e: Event) =>
                                                updateAction(
                                                    "device_panel",
                                                    idx,
                                                    {
                                                        service:
                                                            (
                                                                e.target as HTMLInputElement
                                                            ).value ||
                                                            undefined,
                                                    },
                                                )}
                                        />
                                    </div>
                                    <TextField
                                        variant="outlined"
                                        label="Command"
                                        value={getActionCommand(action)}
                                        oninput={(e: Event) =>
                                            updateActionCommand(
                                                "device_panel",
                                                idx,
                                                (
                                                    e.target as HTMLInputElement
                                                ).value,
                                            )}
                                    />
                                </div>
                            {/each}
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
                            for="chart-type"
                        >
                            Chart Type
                        </label>
                        <select
                            id="chart-type"
                            bind:value={tempConfig.chartType}
                            class="w-full h-14 px-4 rounded-m3-sm bg-transparent border border-m3-outline text-m3-on-surface focus:border-m3-primary outline-none transition-colors"
                        >
                            {#each graphChartTypeOptions as option}
                                <option value={option.value}
                                    >{option.label}</option
                                >
                            {/each}
                        </select>
                    </div>
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

                                <div class="flex flex-col gap-1">
                                    <label
                                        class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                        for={`graph-entity-chart-type-${idx}`}
                                    >
                                        Chart Type
                                    </label>
                                    <select
                                        id={`graph-entity-chart-type-${idx}`}
                                        value={entity.chartType ?? ""}
                                        onchange={(event) => {
                                            const value = (
                                                event.target as HTMLSelectElement
                                            ).value as GraphChartType | "";
                                            entity.chartType =
                                                value === ""
                                                    ? undefined
                                                    : value;
                                        }}
                                        class="w-full h-12 px-3 rounded-m3-sm bg-transparent border border-m3-outline text-m3-on-surface focus:border-m3-primary outline-none transition-colors"
                                    >
                                        <option value="">Use card default</option>
                                        {#each graphChartTypeOptions as option}
                                            <option value={option.value}
                                                >{option.label}</option
                                            >
                                        {/each}
                                    </select>
                                </div>

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
                                            {#each graphColorOptions as option}
                                                <button
                                                    class="size-5 rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
                                                    style:background-color={option.value}
                                                    style:border-color={entity.color ===
                                                    option.value
                                                        ? "white"
                                                        : "transparent"}
                                                    onclick={() =>
                                                        (entity.color =
                                                            option.value)}
                                                    title={`${option.label} (${option.description})`}
                                                    aria-label={`${option.label}, ${option.description}`}
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
        <Button variant="text" onclick={handleClose}>{themeStore.t("common.cancel")}</Button>
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
                {themeStore.t("common.delete")}
            </Button>
        {/if}
        <Button variant="filled" onclick={handleSave}>{themeStore.t("common.save")}</Button>
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
