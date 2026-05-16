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
    import DeferredRender from "$lib/components/common/DeferredRender.svelte";
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { onMount } from "svelte";
    import type { HassEntities } from "home-assistant-js-websocket";
    import Fan from "~icons/material-symbols/mode-fan";
    import Lightbulb from "~icons/material-symbols/lightbulb";
    import VolumeUp from "~icons/material-symbols/volume-up";
    import Workspaces from "~icons/material-symbols/workspaces";

    const mockEntityIds = [
        "media_player.spotify",
        "media_player.living_room_tv",
        "media_player.kitchen_speaker",
        "climate.living_room",
        "sensor.outdoor_temperature",
        "climate.diyless_thermostat_1_central_heating",
        "sensor.diyless_thermostat_1_opentherm_outdoor_temperature",
        "light.library_table",
        "light.library_accent",
        "switch.library_outlet",
        "fan.library_fan",
        "sensor.library_temperature",
        "sensor.library_humidity",
        "sensor.library_energy",
        "sensor.library_solar_power",
        "sensor.library_home_power",
        "sensor.library_grid_power",
        "sensor.library_battery",
        "binary_sensor.library_window",
        "binary_sensor.library_motion",
        "binary_sensor.library_leak",
        "weather.library_home",
        "sensor.library_rain",
        "sensor.library_wind",
        "calendar.family",
        "media_player.library_tv",
        "cover.library_blinds",
    ] as const;

    type LibrarySection =
        | "media"
        | "button"
        | "thermostat"
        | "title"
        | "graph"
        | "navigation"
        | "smart"
        | "tabs";

    const librarySections: Array<{ id: LibrarySection; label: string }> = [
        { id: "media", label: "Media" },
        { id: "button", label: "Buttons" },
        { id: "thermostat", label: "Climate" },
        { id: "title", label: "Titles" },
        { id: "graph", label: "Graphs" },
        { id: "navigation", label: "Navigation" },
        { id: "smart", label: "Smart" },
        { id: "tabs", label: "Tabs" },
    ];

    let activeSection = $state<LibrarySection>("media");

    function restoreOriginalStates() {
        haStore.clearEntityOverrides(mockEntityIds);
    }

    function patchDemoStates(states: HassEntities) {
        haStore.patchEntityOverrides(states);
    }

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
        patchDemoStates({
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
        });
    }

    function loadMockClimate() {
        patchDemoStates({
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
        });
    }

    function loadMockDashboardExamples() {
        patchDemoStates({
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
            "binary_sensor.library_window": mockState(
                "binary_sensor.library_window",
                "on",
                {
                    friendly_name: "Kitchen Window",
                    device_class: "window",
                },
            ),
            "binary_sensor.library_motion": mockState(
                "binary_sensor.library_motion",
                "on",
                {
                    friendly_name: "Hall Motion",
                    device_class: "motion",
                },
            ),
            "binary_sensor.library_leak": mockState(
                "binary_sensor.library_leak",
                "on",
                {
                    friendly_name: "Utility Leak Sensor",
                    device_class: "moisture",
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
                "playing",
                {
                    friendly_name: "Living Room TV",
                    volume_level: 0.35,
                },
            ),
            "cover.library_blinds": mockState("cover.library_blinds", "open", {
                friendly_name: "Living Room Blinds",
            }),
        });
    }

    function loadAllExamples() {
        loadMockMedia();
        loadMockClimate();
        loadMockDashboardExamples();
    }

    onMount(() => {
        loadAllExamples();
        return restoreOriginalStates;
    });
</script>

<PageShell
    title="Card Library"
    description="Finished MD3 card examples using realistic Home Assistant data."
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

    <div
        class="flex items-center gap-2 overflow-x-auto pb-2"
        role="tablist"
        aria-label="Card library sections"
    >
        {#each librarySections as section}
            <button
                type="button"
                role="tab"
                aria-selected={activeSection === section.id}
                class="h-10 px-4 rounded-m3-card text-m3-label-large font-medium whitespace-nowrap transition-colors {activeSection ===
                section.id
                    ? 'bg-m3-primary text-m3-on-primary'
                    : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}"
                onclick={() => (activeSection = section.id)}
            >
                {section.label}
            </button>
        {/each}
    </div>

    <!-- Media Cards Section -->
    {#if activeSection === "media"}
        <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">Media Cards</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Standard Variant -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Standard</span
                >
                <div class="h-48">
                    <DeferredRender class="h-full">
                        <MediaCard
                            entityId="media_player.spotify"
                            name=""
                            domainFilter="media_player"
                            variant="standard"
                        />
                    </DeferredRender>
                </div>
            </div>

            <!-- Poster Variant (Immersive) -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Poster (Immersive)</span
                >
                <div class="h-96">
                    <!-- taller container for poster -->
                    <DeferredRender class="h-full">
                        <MediaCard
                            entityId="media_player.living_room_tv"
                            name=""
                            domainFilter="media_player"
                            variant="poster"
                            background="immersive"
                        />
                    </DeferredRender>
                </div>
            </div>

            <!-- Condensed Variant -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Condensed</span
                >
                <div class="min-h-24">
                    <DeferredRender class="h-full min-h-24">
                        <MediaCard
                            entityId="media_player.kitchen_speaker"
                            name=""
                            domainFilter="media_player"
                            variant="condensed"
                        />
                    </DeferredRender>
                </div>
            </div>
        </div>
        </section>
    {/if}

    {#if activeSection === "button"}
        <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Button Cards
        </h2>
        <!-- Grid Container -->
        <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
            {#each cards as card, i (card.id)}
                <DeferredRender class="min-h-20">
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
                </DeferredRender>
            {/each}
        </div>
        </section>
    {/if}

    <!-- Thermostat Cards Section -->
    {#if activeSection === "thermostat"}
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
                    <DeferredRender class="h-full">
                        <ThermostatCard
                            bind:entityId={thermostat2.entityId}
                            bind:secondaryEntityId={thermostat2.secondaryEntityId}
                            bind:name={thermostat2.name}
                            bind:secondaryName={thermostat2.secondaryName}
                            bind:domainFilter={thermostat2.domainFilter}
                        />
                    </DeferredRender>
                </div>
            </div>

            <!-- Standard Variant -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Standard</span
                >
                <div class="h-44">
                    <DeferredRender class="h-full">
                        <ThermostatCard
                            bind:entityId={thermostat2.entityId}
                            bind:secondaryEntityId={thermostat2.secondaryEntityId}
                            bind:name={thermostat2.name}
                            bind:secondaryName={thermostat2.secondaryName}
                            bind:domainFilter={thermostat2.domainFilter}
                        />
                    </DeferredRender>
                </div>
            </div>

            <!-- Expanded Variant -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Expanded (Immersive)</span
                >
                <div class="h-96">
                    <DeferredRender class="h-full">
                        <ThermostatCard
                            bind:entityId={thermostat1.entityId}
                            bind:secondaryEntityId={thermostat1.secondaryEntityId}
                            bind:name={thermostat1.name}
                            bind:secondaryName={thermostat1.secondaryName}
                            bind:domainFilter={thermostat1.domainFilter}
                        />
                    </DeferredRender>
                </div>
            </div>
        </div>
        </section>
    {/if}

    {#if activeSection === "title"}
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
                    <DeferredRender class="h-full">
                        <TitleCard
                            title="Living Room"
                            subtitle="Lights, climate, media"
                            name=""
                            alignment="start"
                        />
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Centered mode label</span
                >
                <div class="h-24">
                    <DeferredRender class="h-full">
                        <TitleCard
                            title="Evening"
                            subtitle="Scene active"
                            name=""
                            alignment="center"
                            color="#0f766e"
                            backgroundColor="color-mix(in srgb, #0f766e 12%, transparent)"
                        />
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Right aligned</span
                >
                <div class="h-24">
                    <DeferredRender class="h-full">
                        <TitleCard
                            title="Upstairs"
                            subtitle="2 rooms online"
                            name=""
                            alignment="end"
                            color="#7c3aed"
                        />
                    </DeferredRender>
                </div>
            </div>
        </div>
        </section>
    {/if}

    {#if activeSection === "graph"}
        <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Graph Cards
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Area temperature</span
                >
                <div class="h-48">
                    <DeferredRender class="h-full">
                        <GraphCard
                            entityId="sensor.library_temperature"
                            name="Temperature"
                            chartType="area"
                            hours_to_show={12}
                            points_per_hour={2}
                            aggregate_func="avg"
                            icon="device_thermostat"
                            color="#ef4444"
                            fetchHistory={false}
                        />
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Line multi-sensor</span
                >
                <div class="h-48">
                    <DeferredRender class="h-full">
                        <GraphCard
                            entityId="sensor.library_temperature"
                            name="Room climate"
                            chartType="line"
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
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Bar totals</span
                >
                <div class="h-48">
                    <DeferredRender class="h-full">
                        <GraphCard
                            entityId="sensor.library_energy"
                            name="Energy Today"
                            chartType="bar"
                            hours_to_show={24}
                            aggregate_func="last"
                            icon="bolt"
                            color="#eab308"
                            fetchHistory={false}
                        />
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Step setpoint</span
                >
                <div class="h-48">
                    <DeferredRender class="h-full">
                        <GraphCard
                            entityId="sensor.library_battery"
                            name="Battery"
                            chartType="step"
                            hours_to_show={24}
                            aggregate_func="last"
                            icon="battery_alert"
                            color="#22c55e"
                            fetchHistory={false}
                        />
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Mixed energy</span
                >
                <div class="h-48">
                    <DeferredRender class="h-full">
                        <GraphCard
                            entityId="sensor.library_home_power"
                            name="Power Mix"
                            chartType="bar"
                            hours_to_show={12}
                            aggregate_func="avg"
                            icon="monitoring"
                            color="#eab308"
                            fetchHistory={false}
                            graphEntities={[
                                {
                                    entity_id: "sensor.library_solar_power",
                                    name: "Solar",
                                    chartType: "line",
                                    color: "#22c55e",
                                },
                                {
                                    entity_id: "sensor.library_grid_power",
                                    name: "Grid",
                                    chartType: "step",
                                    color: "#38bdf8",
                                },
                            ]}
                        />
                    </DeferredRender>
                </div>
            </div>
        </div>
        </section>
    {/if}

    {#if activeSection === "navigation"}
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
                    <DeferredRender class="h-full">
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
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Image navigation</span
                >
                <div class="h-52">
                    <DeferredRender class="h-full">
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
                    </DeferredRender>
                </div>
            </div>
        </div>
        </section>
    {/if}

    {#if activeSection === "smart"}
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
                    <DeferredRender class="h-full">
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
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Status collection - inspired by Auto Entities</span
                >
                <div class="h-48">
                    <DeferredRender class="h-full">
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
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Attention collections - generated home overview patterns</span
                >
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div class="h-28">
                        <DeferredRender class="h-full">
                            <EntityCollectionCard
                                name="Openings"
                                icon="sensor_door"
                                color="#f97316"
                                options={{
                                    mode: "openings",
                                    showState: true,
                                    presentation: "summary",
                                }}
                            />
                        </DeferredRender>
                    </div>
                    <div class="h-28">
                        <DeferredRender class="h-full">
                            <EntityCollectionCard
                                name="Motion"
                                icon="motion_sensor_active"
                                color="#22c55e"
                                options={{
                                    mode: "motion",
                                    showState: true,
                                    presentation: "summary",
                                }}
                            />
                        </DeferredRender>
                    </div>
                    <div class="h-28">
                        <DeferredRender class="h-full">
                            <EntityCollectionCard
                                name="Media Playing"
                                icon="play_circle"
                                color="#2563eb"
                                options={{
                                    mode: "media_playing",
                                    showState: true,
                                    presentation: "summary",
                                }}
                            />
                        </DeferredRender>
                    </div>
                    <div class="h-28">
                        <DeferredRender class="h-full">
                            <EntityCollectionCard
                                name="Security Alerts"
                                icon="shield_alert"
                                color="#dc2626"
                                options={{
                                    mode: "security",
                                    showState: true,
                                    presentation: "summary",
                                }}
                            />
                        </DeferredRender>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Energy flow - inspired by Power Flow Plus</span
                >
                <div class="h-48">
                    <DeferredRender class="h-full">
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
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Agenda - inspired by Calendar Card Pro</span
                >
                <div class="h-48">
                    <DeferredRender class="h-full">
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
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Weather overview - inspired by weather/rain cards</span
                >
                <div class="h-48">
                    <DeferredRender class="h-full">
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
                    </DeferredRender>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Remote and device panels - inspired by Remote/Vacuum cards</span
                >
                <div class="grid grid-cols-2 gap-3 h-48">
                    <DeferredRender class="h-full">
                        <RemotePanelCard
                            name="TV Remote"
                            entityId="media_player.library_tv"
                            icon="settings_remote"
                            color="#16a34a"
                            options={{ preset: "tv" }}
                        />
                    </DeferredRender>
                    <DeferredRender class="h-full">
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
                    </DeferredRender>
                </div>
            </div>
        </div>
        </section>
    {/if}

    {#if activeSection === "tabs"}
        <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">Tab Card</h2>
        <div class="flex flex-col gap-2">
            <span class="text-m3-label-medium text-m3-on-surface-variant"
                >Nested dashboard surface</span
            >
            <DeferredRender class="min-h-[34rem]">
                <div
                    class="min-h-[34rem] rounded-m3-md border border-m3-outline-variant/40 bg-m3-surface-container-low overflow-hidden p-4 flex flex-col gap-4"
                >
                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            class="h-10 px-4 bg-m3-primary-container text-m3-on-primary-container text-m3-label-large"
                            style:border-radius="var(--radius-m3-tab-pill)"
                        >
                            Comfort
                        </button>
                        <button
                            type="button"
                            class="h-10 px-4 bg-m3-surface-container-high text-m3-on-surface-variant text-m3-label-large"
                            style:border-radius="var(--radius-m3-tab-pill)"
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
            </DeferredRender>
        </div>
        </section>
    {/if}
</PageShell>
