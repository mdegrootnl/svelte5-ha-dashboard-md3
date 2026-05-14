<script lang="ts">
    import ButtonCard from "$lib/features/dashboard/components/cards/ButtonCard.svelte";
    import GraphCard from "$lib/features/dashboard/components/cards/GraphCard.svelte";
    import MediaCard from "$lib/features/dashboard/components/cards/MediaCard.svelte";
    import NavigationCard from "$lib/features/dashboard/components/cards/NavigationCard.svelte";
    import RoomSummaryCard from "$lib/features/dashboard/components/cards/RoomSummaryCard.svelte";
    import EntityCollectionCard from "$lib/features/dashboard/components/cards/EntityCollectionCard.svelte";
    import EnergyFlowCard from "$lib/features/dashboard/components/cards/EnergyFlowCard.svelte";
    import CalendarAgendaCard from "$lib/features/dashboard/components/cards/CalendarAgendaCard.svelte";
    import WeatherOverviewCard from "$lib/features/dashboard/components/cards/WeatherOverviewCard.svelte";
    import RemotePanelCard from "$lib/features/dashboard/components/cards/RemotePanelCard.svelte";
    import DevicePanelCard from "$lib/features/dashboard/components/cards/DevicePanelCard.svelte";
    import ThermostatCard from "$lib/features/dashboard/components/cards/ThermostatCard.svelte";
    import TitleCard from "$lib/features/dashboard/components/cards/TitleCard.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { onMount } from "svelte";
    import Fan from "~icons/material-symbols/mode-fan";
    import Lightbulb from "~icons/material-symbols/lightbulb";
    import VolumeUp from "~icons/material-symbols/volume-up";
    import Workspaces from "~icons/material-symbols/workspaces";

    // Define card data structure
    interface CardData {
        id: number;
        title: string;
        state: string;
        icon: any;
        variant: "switch" | "slider";
        isActive: boolean;
        value?: number;
        entityId: string;
        name: string;
        domainFilter: string;
    }

    interface HacsPattern {
        name: string;
        source: string;
        url: string;
        stars: string;
        license: string;
        icon: string;
        priority: "Now" | "Next" | "Later";
        libraryTarget: string;
        fit: string;
        patterns: string[];
    }

    const priorityClasses: Record<HacsPattern["priority"], string> = {
        Now: "bg-m3-primary-container text-m3-on-primary-container",
        Next: "bg-m3-secondary-container text-m3-on-secondary-container",
        Later: "bg-m3-tertiary-container text-m3-on-tertiary-container",
    };

    const hacsPatterns: HacsPattern[] = [
        {
            name: "Mushroom",
            source: "piitaya/lovelace-mushroom",
            url: "https://github.com/piitaya/lovelace-mushroom",
            stars: "5.0k",
            license: "Apache-2.0",
            icon: "dashboard_customize",
            priority: "Now",
            libraryTarget: "MD3 entity suite",
            fit: "Simple cards, chips, color pickers, and editor-first configuration.",
            patterns: ["entity cards", "chips", "editor"],
        },
        {
            name: "Bubble Card",
            source: "Clooos/Bubble-Card",
            url: "https://github.com/Clooos/Bubble-Card",
            stars: "4.2k",
            license: "MIT",
            icon: "bubble_chart",
            priority: "Now",
            libraryTarget: "room actions + popover surfaces",
            fit: "Mobile-first action rows, sub-buttons, separators, and compact room controls.",
            patterns: ["sub-buttons", "mobile", "sections"],
        },
        {
            name: "Mini Graph Card",
            source: "kalkih/mini-graph-card",
            url: "https://github.com/kalkih/mini-graph-card",
            stars: "3.8k",
            license: "MIT",
            icon: "monitoring",
            priority: "Now",
            libraryTarget: "sensor graph presets",
            fit: "Fast sensor history cards with current value, trend, and compact variants.",
            patterns: ["sensor", "trend", "history"],
        },
        {
            name: "Button Card",
            source: "custom-cards/button-card",
            url: "https://github.com/custom-cards/button-card",
            stars: "2.4k",
            license: "MIT",
            icon: "buttons_alt",
            priority: "Now",
            libraryTarget: "programmable action tile",
            fit: "Entity actions, state-driven styling, icon actions, and reusable tile layouts.",
            patterns: ["actions", "states", "templates"],
        },
        {
            name: "ApexCharts Card",
            source: "RomRider/apexcharts-card",
            url: "https://github.com/RomRider/apexcharts-card",
            stars: "1.8k",
            license: "MIT",
            icon: "stacked_line_chart",
            priority: "Next",
            libraryTarget: "advanced graph card",
            fit: "Multi-series energy, climate, and comparison charts beyond the mini graph.",
            patterns: ["multi-series", "energy", "compare"],
        },
        {
            name: "Mini Media Player",
            source: "kalkih/mini-media-player",
            url: "https://github.com/kalkih/mini-media-player",
            stars: "1.7k",
            license: "MIT",
            icon: "media_output",
            priority: "Next",
            libraryTarget: "media control variants",
            fit: "Compact now-playing, group controls, volume, source, and sound-mode controls.",
            patterns: ["media", "volume", "source"],
        },
        {
            name: "Auto Entities",
            source: "thomasloven/lovelace-auto-entities",
            url: "https://github.com/thomasloven/lovelace-auto-entities",
            stars: "1.7k",
            license: "MIT",
            icon: "filter_alt",
            priority: "Next",
            libraryTarget: "smart entity collections",
            fit: "Generated lists for lights on, low batteries, unavailable devices, and rooms.",
            patterns: ["filters", "sort", "generated"],
        },
        {
            name: "Power Flow Plus",
            source: "flixlix/power-flow-card-plus",
            url: "https://github.com/flixlix/power-flow-card-plus",
            stars: "1.1k",
            license: "custom",
            icon: "electric_bolt",
            priority: "Next",
            libraryTarget: "energy flow card",
            fit: "Solar, grid, home, and battery flow visualization for the home overview.",
            patterns: ["solar", "grid", "flow"],
        },
        {
            name: "Calendar Cards",
            source: "calendar-card-pro / atomic-calendar-revive",
            url: "https://github.com/alexpfau/calendar-card-pro",
            stars: "1.1k",
            license: "mixed",
            icon: "calendar_month",
            priority: "Later",
            libraryTarget: "agenda + family calendar",
            fit: "Event lists, calendar views, progress, relative times, and per-calendar filters.",
            patterns: ["agenda", "events", "family"],
        },
        {
            name: "Remote + Vacuum Cards",
            source: "Nerwyn/universal-remote-card / denysdovhan/vacuum-card",
            url: "https://github.com/Nerwyn/universal-remote-card",
            stars: "1.7k combined",
            license: "Apache-2.0 / MIT",
            icon: "remote_gen",
            priority: "Later",
            libraryTarget: "device-specific control panels",
            fit: "Purpose-built controls for TV receivers, Android TV, and future vacuum devices.",
            patterns: ["remote", "device", "panel"],
        },
    ];

    const libraryMilestones = [
        {
            title: "Entity Foundation",
            icon: "widgets",
            detail: "Unify lights, switches, fans, covers, and sensors around one MD3 tile language.",
        },
        {
            title: "Room Intelligence",
            icon: "meeting_room",
            detail: "Generate room sections from HA areas, floors, devices, and useful entity classes.",
        },
        {
            title: "Data Surfaces",
            icon: "query_stats",
            detail: "Promote graph, weather, energy, and health patterns into reusable library cards.",
        },
        {
            title: "Specialist Panels",
            icon: "developer_board",
            detail: "Add richer media, calendar, remote, ventilation, and maintenance panels.",
        },
    ];

    const libraryGuardrails = [
        {
            title: "Extend First",
            icon: "extension",
            detail: "Add variants and presets to existing cards before creating a new card type.",
        },
        {
            title: "Share Primitives",
            icon: "hub",
            detail: "Move repeated controls into MD3 primitives or card subcomponents.",
        },
        {
            title: "One Purpose",
            icon: "adjust",
            detail: "Each card owns one job: control, graph, navigation, media, climate, or layout.",
        },
        {
            title: "Source-Aware",
            icon: "policy",
            detail: "Use open-source projects as references; keep our implementation native to this repo.",
        },
    ];

    // Initialize cards with state
    let cards = $state<CardData[]>([
        {
            id: 1,
            title: "Office Fan",
            state: "Off",
            icon: Fan,
            variant: "switch",
            isActive: false,
            entityId: "",
            name: "",
            domainFilter: "switch",
            value: 0,
        },
        {
            id: 2,
            title: "Living Room",
            state: "On",
            icon: Lightbulb,
            variant: "switch",
            isActive: true,
            entityId: "",
            name: "",
            domainFilter: "switch",
            value: 100,
        },
        {
            id: 3,
            title: "Kitchen",
            state: "56%",
            icon: Lightbulb,
            variant: "slider",
            value: 56,
            isActive: true,
            entityId: "",
            name: "",
            domainFilter: "light",
        },
        {
            id: 4,
            title: "Volume",
            state: "85%",
            icon: VolumeUp,
            variant: "slider",
            value: 85,
            isActive: true,
            entityId: "",
            name: "",
            domainFilter: "sensor",
        },
    ]);

    let thermostat1 = $state({
        entityId: "climate.diyless_thermostat_1_central_heating",
        secondaryEntityId:
            "sensor.diyless_thermostat_1_opentherm_outdoor_temperature",
        name: "Thermostat",
        secondaryName: "Outside",
        domainFilter: "climate",
    });

    let thermostat2 = $state({
        entityId: "climate.diyless_thermostat_1_central_heating",
        secondaryEntityId: "",
        name: "Central Heating",
        secondaryName: "",
        domainFilter: "climate",
    });

    function mockState(entity_id: string, state: string, attributes = {}) {
        return {
            entity_id,
            state,
            attributes,
            last_changed: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            context: { id: entity_id, parent_id: null, user_id: null },
        };
    }

    function loadMockMedia() {
        haStore.states = {
            ...haStore.states,
            "media_player.spotify": {
                entity_id: "media_player.spotify",
                state: "playing",
                attributes: {
                    media_title: "Midnight City",
                    media_artist: "M83",
                    media_album_name: "Hurry Up, We're Dreaming",
                    entity_picture:
                        "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop",
                    volume_level: 0.75,
                    media_duration: 243,
                    media_position: 45,
                    media_position_updated_at: new Date().toISOString(),
                },
                last_changed: new Date().toISOString(),
                last_updated: new Date().toISOString(),
                context: { id: "1", parent_id: null, user_id: null },
            },
            "media_player.living_room_tv": {
                entity_id: "media_player.living_room_tv",
                state: "playing",
                attributes: {
                    media_title: "Inception",
                    media_artist: "Christopher Nolan",
                    entity_picture:
                        "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=400&auto=format&fit=crop",
                    volume_level: 0.4,
                    media_duration: 7200,
                    media_position: 3600,
                    media_position_updated_at: new Date().toISOString(),
                },
                last_changed: new Date().toISOString(),
                last_updated: new Date().toISOString(),
                context: { id: "2", parent_id: null, user_id: null },
            },
            "media_player.kitchen_speaker": {
                entity_id: "media_player.kitchen_speaker",
                state: "playing",
                attributes: {
                    media_title: "Cooking Jazz",
                    media_artist: "Jazz Cafe",
                    entity_picture:
                        "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=400&auto=format&fit=crop",
                    volume_level: 0.3,
                },
                last_changed: new Date().toISOString(),
                last_updated: new Date().toISOString(),
                context: { id: "3", parent_id: null, user_id: null },
            },
        };
    }

    function loadMockClimate() {
        haStore.states = {
            ...haStore.states,
            "climate.living_room": {
                entity_id: "climate.living_room",
                state: "heat",
                attributes: {
                    friendly_name: "Living Room",
                    current_temperature: 21.5,
                    temperature: 22,
                    hvac_mode: "heat",
                    hvac_action: "heating",
                    hvac_modes: ["off", "heat", "cool", "auto"],
                    min_temp: 5,
                    max_temp: 35,
                    target_temp_step: 0.5,
                },
                last_changed: new Date().toISOString(),
                last_updated: new Date().toISOString(),
                context: { id: "c1", parent_id: null, user_id: null },
            },
            "sensor.outdoor_temperature": {
                entity_id: "sensor.outdoor_temperature",
                state: "3.2",
                attributes: {
                    friendly_name: "Outdoor Temperature",
                    device_class: "temperature",
                    unit_of_measurement: "°C",
                },
                last_changed: new Date().toISOString(),
                last_updated: new Date().toISOString(),
                context: { id: "c2", parent_id: null, user_id: null },
            },
            "climate.diyless_thermostat_1_central_heating": {
                entity_id: "climate.diyless_thermostat_1_central_heating",
                state: "heat",
                attributes: {
                    friendly_name: "Diyless Thermostat",
                    current_temperature: 17.9,
                    temperature: 20.5,
                    hvac_mode: "heat",
                    hvac_action: "heating",
                    hvac_modes: ["off", "heat"],
                    min_temp: 5,
                    max_temp: 35,
                    target_temp_step: 0.5,
                },
                last_changed: new Date().toISOString(),
                last_updated: new Date().toISOString(),
                context: { id: "c3", parent_id: null, user_id: null },
            },
            "sensor.diyless_thermostat_1_opentherm_outdoor_temperature": {
                entity_id:
                    "sensor.diyless_thermostat_1_opentherm_outdoor_temperature",
                state: "1.5",
                attributes: {
                    friendly_name: "Outdoor Temperature",
                    device_class: "temperature",
                    unit_of_measurement: "°C",
                },
                last_changed: new Date().toISOString(),
                last_updated: new Date().toISOString(),
                context: { id: "c4", parent_id: null, user_id: null },
            },
        };
    }

    function loadMockDashboardExamples() {
        haStore.states = {
            ...haStore.states,
            "light.library_table": mockState("light.library_table", "on", {
                friendly_name: "Table Lamp",
                brightness: 192,
                supported_color_modes: ["brightness"],
            }),
            "light.library_accent": mockState("light.library_accent", "off", {
                friendly_name: "Accent Light",
                brightness: 0,
                supported_color_modes: ["brightness"],
            }),
            "switch.library_outlet": mockState("switch.library_outlet", "on", {
                friendly_name: "Desk Outlet",
            }),
            "fan.library_fan": mockState("fan.library_fan", "on", {
                friendly_name: "Ceiling Fan",
            }),
            "sensor.library_temperature": mockState(
                "sensor.library_temperature",
                "21.8",
                {
                    friendly_name: "Living Room Temperature",
                    unit_of_measurement: "C",
                    device_class: "temperature",
                },
            ),
            "sensor.library_humidity": mockState(
                "sensor.library_humidity",
                "48",
                {
                    friendly_name: "Living Room Humidity",
                    unit_of_measurement: "%",
                    device_class: "humidity",
                },
            ),
            "sensor.library_energy": mockState("sensor.library_energy", "1.4", {
                friendly_name: "Today Energy",
                unit_of_measurement: "kWh",
            }),
            "sensor.library_solar_power": mockState(
                "sensor.library_solar_power",
                "1820",
                {
                    friendly_name: "Solar Power",
                    unit_of_measurement: "W",
                    device_class: "power",
                },
            ),
            "sensor.library_home_power": mockState(
                "sensor.library_home_power",
                "940",
                {
                    friendly_name: "Home Power",
                    unit_of_measurement: "W",
                    device_class: "power",
                },
            ),
            "sensor.library_grid_power": mockState(
                "sensor.library_grid_power",
                "120",
                {
                    friendly_name: "Grid Import",
                    unit_of_measurement: "W",
                    device_class: "power",
                },
            ),
            "sensor.library_battery": mockState(
                "sensor.library_battery",
                "18",
                {
                    friendly_name: "Remote Battery",
                    unit_of_measurement: "%",
                    device_class: "battery",
                },
            ),
            "weather.library_home": mockState("weather.library_home", "cloudy", {
                friendly_name: "Home Weather",
                temperature: 16,
                temperature_unit: "C",
            }),
            "sensor.library_rain": mockState("sensor.library_rain", "0.4", {
                friendly_name: "Rain",
                unit_of_measurement: "mm",
                device_class: "precipitation",
            }),
            "sensor.library_wind": mockState("sensor.library_wind", "12", {
                friendly_name: "Wind",
                unit_of_measurement: "km/h",
                device_class: "wind_speed",
            }),
            "calendar.family": mockState("calendar.family", "on", {
                friendly_name: "Family",
                message: "Football training",
                start_time: new Date().toISOString(),
            }),
            "media_player.library_tv": mockState(
                "media_player.library_tv",
                "on",
                {
                    friendly_name: "Living Room TV",
                    volume_level: 0.35,
                },
            ),
            "cover.library_blinds": mockState("cover.library_blinds", "open", {
                friendly_name: "Living Room Blinds",
            }),
        };
    }

    function loadAllExamples() {
        loadMockMedia();
        loadMockClimate();
        loadMockDashboardExamples();
    }

    onMount(loadAllExamples);
</script>

<PageShell
    title="Card Library"
    description="Showcase of all available Home Assistant entity cards."
    maxWidth="6xl"
>
    {#snippet actions()}
        <Button variant="filled" icon={Workspaces} onclick={loadAllExamples}>
            Load Examples
        </Button>
        <Button variant="filled" onclick={loadMockMedia}>
            Load Mock Media
        </Button>
        <Button variant="tonal" onclick={loadMockClimate}>
            Load Mock Climate
        </Button>
    {/snippet}

    <section>
        <div class="flex flex-col gap-2 mb-5">
            <span class="text-m3-label-large text-m3-primary"
                >Research-backed targets</span
            >
            <h2 class="text-m3-title-large text-m3-on-surface">
                HACS-Inspired Library Direction
            </h2>
            <p class="max-w-3xl text-m3-body-medium text-m3-on-surface-variant">
                Popular Lovelace/HACS cards are mapped to MD3-native patterns
                here. We adapt proven interaction ideas without importing their
                UI language or duplicating card responsibilities.
            </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {#each hacsPatterns as pattern}
                <article
                    class="min-h-72 rounded-m3-lg bg-m3-surface-container border border-m3-outline-variant/40 p-5 flex flex-col gap-4"
                >
                    <div class="flex items-start justify-between gap-4">
                        <div
                            class="size-12 rounded-m3-lg bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center"
                        >
                            <DynamicIcon name={pattern.icon} class="text-3xl" />
                        </div>
                        <span
                            class="px-3 py-1 rounded-m3-full text-m3-label-medium {priorityClasses[
                                pattern.priority
                            ]}"
                        >
                            {pattern.priority}
                        </span>
                    </div>

                    <div class="flex flex-col gap-1">
                        <h3 class="text-m3-title-medium text-m3-on-surface">
                            {pattern.name}
                        </h3>
                        <a
                            href={pattern.url}
                            target="_blank"
                            rel="noreferrer"
                            class="text-m3-body-small text-m3-primary hover:underline"
                        >
                            {pattern.source}
                        </a>
                    </div>

                    <p class="text-m3-body-medium text-m3-on-surface-variant">
                        {pattern.fit}
                    </p>

                    <div class="mt-auto flex flex-col gap-3">
                        <div
                            class="rounded-m3-md bg-m3-surface-container-high px-3 py-2"
                        >
                            <span
                                class="block text-m3-label-medium text-m3-on-surface-variant"
                                >Target</span
                            >
                            <span class="text-m3-body-medium text-m3-on-surface"
                                >{pattern.libraryTarget}</span
                            >
                        </div>

                        <div class="flex flex-wrap gap-2">
                            {#each pattern.patterns as tag}
                                <span
                                    class="px-2.5 py-1 rounded-m3-full bg-m3-surface-container-high text-m3-label-small text-m3-on-surface-variant"
                                >
                                    {tag}
                                </span>
                            {/each}
                        </div>

                        <div
                            class="flex items-center justify-between text-m3-label-small text-m3-on-surface-variant"
                        >
                            <span>{pattern.stars} stars</span>
                            <span>{pattern.license}</span>
                        </div>
                    </div>
                </article>
            {/each}
        </div>
    </section>

    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Library Build Guardrails
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {#each libraryGuardrails as guardrail}
                <article
                    class="rounded-m3-lg bg-m3-surface-container-low border border-m3-outline-variant/40 p-4 flex flex-col gap-3"
                >
                    <div class="flex items-center gap-3">
                        <div
                            class="size-10 rounded-m3-full bg-m3-secondary-container text-m3-on-secondary-container flex items-center justify-center"
                        >
                            <DynamicIcon
                                name={guardrail.icon}
                                class="text-2xl"
                            />
                        </div>
                        <h3 class="text-m3-title-small text-m3-on-surface">
                            {guardrail.title}
                        </h3>
                    </div>
                    <p class="text-m3-body-small text-m3-on-surface-variant">
                        {guardrail.detail}
                    </p>
                </article>
            {/each}
        </div>
    </section>

    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Library Build Order
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {#each libraryMilestones as milestone, index}
                <article
                    class="rounded-m3-lg bg-m3-surface-container border border-m3-outline-variant/40 p-4 flex flex-col gap-3"
                >
                    <div class="flex items-center justify-between gap-3">
                        <div
                            class="size-10 rounded-m3-full bg-m3-tertiary-container text-m3-on-tertiary-container flex items-center justify-center"
                        >
                            <DynamicIcon
                                name={milestone.icon}
                                class="text-2xl"
                            />
                        </div>
                        <span class="text-m3-label-small text-m3-on-surface-variant"
                            >0{index + 1}</span
                        >
                    </div>
                    <h3 class="text-m3-title-small text-m3-on-surface">
                        {milestone.title}
                    </h3>
                    <p class="text-m3-body-small text-m3-on-surface-variant">
                        {milestone.detail}
                    </p>
                </article>
            {/each}
        </div>
    </section>

    <!-- Media Cards Section -->
    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">Media Cards</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Standard Variant -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Standard</span
                >
                <div class="h-48">
                    <MediaCard
                        entityId="media_player.spotify"
                        name=""
                        domainFilter="media_player"
                        variant="standard"
                    />
                </div>
            </div>

            <!-- Poster Variant (Immersive) -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Poster (Immersive)</span
                >
                <div class="h-96">
                    <!-- taller container for poster -->
                    <MediaCard
                        entityId="media_player.living_room_tv"
                        name=""
                        domainFilter="media_player"
                        variant="poster"
                        background="immersive"
                    />
                </div>
            </div>

            <!-- Condensed Variant -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Condensed</span
                >
                <div>
                    <MediaCard
                        entityId="media_player.kitchen_speaker"
                        name=""
                        domainFilter="media_player"
                        variant="condensed"
                    />
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Button Cards
        </h2>
        <!-- Grid Container -->
        <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
            {#each cards as card, i (card.id)}
                <ButtonCard
                    bind:title={card.title}
                    bind:state={card.state}
                    icon={card.icon}
                    variant={card.variant}
                    bind:isActive={card.isActive}
                    bind:value={card.value}
                    bind:entityId={card.entityId}
                    bind:name={card.name}
                    bind:domainFilter={card.domainFilter}
                />
            {/each}
        </div>
    </section>

    <!-- Thermostat Cards Section -->
    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Thermostat Cards
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Condensed Variant -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Condensed</span
                >
                <div class="h-24">
                    <ThermostatCard
                        bind:entityId={thermostat2.entityId}
                        bind:secondaryEntityId={thermostat2.secondaryEntityId}
                        bind:name={thermostat2.name}
                        bind:secondaryName={thermostat2.secondaryName}
                        bind:domainFilter={thermostat2.domainFilter}
                    />
                </div>
            </div>

            <!-- Standard Variant -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Standard</span
                >
                <div class="h-44">
                    <ThermostatCard
                        bind:entityId={thermostat2.entityId}
                        bind:secondaryEntityId={thermostat2.secondaryEntityId}
                        bind:name={thermostat2.name}
                        bind:secondaryName={thermostat2.secondaryName}
                        bind:domainFilter={thermostat2.domainFilter}
                    />
                </div>
            </div>

            <!-- Expanded Variant -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Expanded (Immersive)</span
                >
                <div class="h-96">
                    <ThermostatCard
                        bind:entityId={thermostat1.entityId}
                        bind:secondaryEntityId={thermostat1.secondaryEntityId}
                        bind:name={thermostat1.name}
                        bind:secondaryName={thermostat1.secondaryName}
                        bind:domainFilter={thermostat1.domainFilter}
                    />
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Title Cards
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Section header</span
                >
                <div class="h-24">
                    <TitleCard
                        title="Living Room"
                        subtitle="Lights, climate, media"
                        name=""
                        alignment="start"
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Centered mode label</span
                >
                <div class="h-24">
                    <TitleCard
                        title="Evening"
                        subtitle="Scene active"
                        name=""
                        alignment="center"
                        color="#0f766e"
                        backgroundColor="color-mix(in srgb, #0f766e 12%, transparent)"
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Right aligned</span
                >
                <div class="h-24">
                    <TitleCard
                        title="Upstairs"
                        subtitle="2 rooms online"
                        name=""
                        alignment="end"
                        color="#7c3aed"
                    />
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Graph Cards
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Temperature history</span
                >
                <div class="h-48">
                    <GraphCard
                        entityId="sensor.library_temperature"
                        name="Temperature"
                        hours_to_show={12}
                        points_per_hour={2}
                        aggregate_func="avg"
                        icon="device_thermostat"
                        color="#ef4444"
                        fetchHistory={false}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Multi entity</span
                >
                <div class="h-48">
                    <GraphCard
                        entityId="sensor.library_temperature"
                        name="Room climate"
                        hours_to_show={24}
                        points_per_hour={1}
                        aggregate_func="avg"
                        icon="monitoring"
                        color="#ef4444"
                        fetchHistory={false}
                        graphEntities={[
                            {
                                entity_id: "sensor.library_humidity",
                                name: "Humidity",
                                color: "#0ea5e9",
                            },
                        ]}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Compact stat</span
                >
                <div class="h-28">
                    <GraphCard
                        entityId="sensor.library_energy"
                        name="Energy Today"
                        hours_to_show={6}
                        aggregate_func="last"
                        icon="bolt"
                        color="#eab308"
                        fetchHistory={false}
                        show={{
                            graph: false,
                            icon: true,
                            name: true,
                            state: true,
                            fill: false,
                        }}
                    />
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Navigation Cards
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Room link with shortcuts</span
                >
                <div class="h-28">
                    <NavigationCard
                        name="Living Room"
                        path="/dashboard/ground-floor/living-room"
                        icon="weekend"
                        color="#2563eb"
                        shortcuts={[
                            {
                                id: "nav-light",
                                entityId: "light.library_table",
                                icon: "table_lamp",
                                color: "#f59e0b",
                            },
                            {
                                id: "nav-outlet",
                                entityId: "switch.library_outlet",
                                icon: "outlet",
                                color: "#22c55e",
                            },
                            {
                                id: "nav-fan",
                                entityId: "fan.library_fan",
                                icon: "mode_fan",
                                color: "#0ea5e9",
                            },
                        ]}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Image navigation</span
                >
                <div class="h-52">
                    <NavigationCard
                        name="Kitchen"
                        path="/dashboard/ground-floor/kitchen"
                        icon="restaurant"
                        iconType="image"
                        imageUrl="https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=900&auto=format&fit=crop"
                        color="#f97316"
                        shortcuts={[
                            {
                                id: "nav-kitchen-light",
                                entityId: "light.library_accent",
                                icon: "lightbulb",
                                color: "#f97316",
                            },
                        ]}
                    />
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Smart Library Cards
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Room summary - inspired by Mushroom and Bubble</span
                >
                <div class="h-48">
                    <RoomSummaryCard
                        name="Living Room"
                        icon="weekend"
                        color="#2563eb"
                        options={{
                            source: "manual",
                            entityIds: [
                                "light.library_table",
                                "switch.library_outlet",
                                "fan.library_fan",
                                "media_player.library_tv",
                                "sensor.library_temperature",
                            ],
                        }}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Status collection - inspired by Auto Entities</span
                >
                <div class="h-48">
                    <EntityCollectionCard
                        name="Needs Attention"
                        icon="filter_alt"
                        color="#dc2626"
                        options={{
                            mode: "low_battery",
                            threshold: 25,
                            showState: true,
                        }}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Energy flow - inspired by Power Flow Plus</span
                >
                <div class="h-48">
                    <EnergyFlowCard
                        name="Home Energy"
                        icon="electric_bolt"
                        color="#eab308"
                        options={{
                            source: "manual",
                            solarPowerEntityId: "sensor.library_solar_power",
                            homePowerEntityId: "sensor.library_home_power",
                            gridImportEntityId: "sensor.library_grid_power",
                            todayEnergyEntityId: "sensor.library_energy",
                        }}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Agenda - inspired by Calendar Card Pro</span
                >
                <div class="h-48">
                    <CalendarAgendaCard
                        name="Family Agenda"
                        icon="calendar_month"
                        color="#7c3aed"
                        options={{
                            source: "manual",
                            entityIds: ["calendar.family"],
                            daysToShow: 7,
                            maxEvents: 4,
                        }}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Weather overview - inspired by weather/rain cards</span
                >
                <div class="h-48">
                    <WeatherOverviewCard
                        name="Outside"
                        icon="partly_cloudy_day"
                        color="#0ea5e9"
                        options={{
                            source: "manual",
                            weatherEntityId: "weather.library_home",
                            temperatureEntityId: "sensor.library_temperature",
                            humidityEntityId: "sensor.library_humidity",
                            rainEntityId: "sensor.library_rain",
                            windEntityId: "sensor.library_wind",
                        }}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Remote and device panels - inspired by Remote/Vacuum cards</span
                >
                <div class="grid grid-cols-2 gap-3 h-48">
                    <RemotePanelCard
                        name="TV Remote"
                        entityId="media_player.library_tv"
                        icon="settings_remote"
                        color="#16a34a"
                        options={{ preset: "tv" }}
                    />
                    <DevicePanelCard
                        name="Blinds"
                        entityId="cover.library_blinds"
                        icon="blinds"
                        color="#f97316"
                        options={{
                            preset: "cover",
                            entityId: "cover.library_blinds",
                        }}
                    />
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">Tab Card</h2>
        <div class="flex flex-col gap-2">
            <span class="text-m3-label-medium text-m3-on-surface-variant"
                >Nested dashboard surface</span
            >
            <div
                class="min-h-[34rem] rounded-m3-md border border-m3-outline-variant/40 bg-m3-surface-container-low overflow-hidden p-4 flex flex-col gap-4"
            >
                <div class="flex items-center gap-2">
                    <button
                        type="button"
                        class="h-10 px-4 rounded-m3-full bg-m3-primary-container text-m3-on-primary-container text-m3-label-large"
                    >
                        Comfort
                    </button>
                    <button
                        type="button"
                        class="h-10 px-4 rounded-m3-full bg-m3-surface-container-high text-m3-on-surface-variant text-m3-label-large"
                    >
                        Media
                    </button>
                </div>
                <div
                    class="grid grid-cols-1 md:grid-cols-6 gap-3 flex-1 min-h-0"
                >
                    <div class="h-24 md:col-span-6">
                        <TitleCard
                            title="Comfort"
                            subtitle="Evening scene"
                            name=""
                            alignment="start"
                        />
                    </div>
                    <div class="h-28 md:col-span-2">
                        <ButtonCard
                            title="Table Lamp"
                            state="On"
                            icon={Lightbulb}
                            variant="switch"
                            isActive={true}
                            entityId="light.library_table"
                            name=""
                            domainFilter="light"
                            color="#f59e0b"
                        />
                    </div>
                    <div class="h-28 md:col-span-2">
                        <ButtonCard
                            title="Outlet"
                            state="On"
                            icon={Workspaces}
                            variant="switch"
                            isActive={true}
                            entityId="switch.library_outlet"
                            name=""
                            domainFilter="switch"
                            color="#22c55e"
                        />
                    </div>
                    <div class="h-28 md:col-span-2">
                        <NavigationCard
                            name="Open Music"
                            path="/music"
                            icon="queue_music"
                            color="#7c3aed"
                            shortcuts={[
                                {
                                    id: "library-media-shortcut",
                                    entityId: "media_player.kitchen_speaker",
                                    icon: "play_circle",
                                },
                            ]}
                        />
                    </div>
                    <div class="h-52 md:col-span-4">
                        <GraphCard
                            entityId="sensor.library_temperature"
                            name="Temperature"
                            hours_to_show={12}
                            aggregate_func="avg"
                            icon="device_thermostat"
                            color="#ef4444"
                            fetchHistory={false}
                        />
                    </div>
                    <div class="h-52 md:col-span-2">
                        <MediaCard
                            entityId="media_player.kitchen_speaker"
                            name=""
                            domainFilter="media_player"
                            variant="condensed"
                        />
                    </div>
                </div>
            </div>
        </div>
    </section>
</PageShell>
