<script lang="ts">
    import {
        ButtonCard,
        MediaCard,
        ThermostatCard,
        haStore,
        PageShell,
        Button,
    } from "$lib";
    import Fan from "~icons/material-symbols/mode-fan";
    import Lightbulb from "~icons/material-symbols/lightbulb";
    import VolumeUp from "~icons/material-symbols/volume-up";

    // Define card data structure
    interface CardData {
        id: number;
        title: string;
        state: string;
        icon: any;
        variant: "switch" | "slider";
        isActive: boolean;
        value?: number;
        entityId?: string;
        name?: string;
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
        },
    ]);

    let thermostat1 = $state({
        entityId: "climate.diyless_thermostat_1_central_heating",
        secondaryEntityId:
            "sensor.diyless_thermostat_1_opentherm_outdoor_temperature",
        name: "Thermostat",
        secondaryName: "Outside",
    });

    let thermostat2 = $state({
        entityId: "climate.diyless_thermostat_1_central_heating",
        name: "Central Heating",
    });

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
</script>

<PageShell
    title="Card Library"
    description="Showcase of all available Home Assistant entity cards."
    maxWidth="6xl"
>
    {#snippet actions()}
        <Button variant="filled" onclick={loadMockMedia}>
            Load Mock Media
        </Button>
        <Button variant="tonal" onclick={loadMockClimate}>
            Load Mock Climate
        </Button>
    {/snippet}

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
            {#each cards as card (card.id)}
                <ButtonCard
                    bind:title={card.title}
                    bind:state={card.state}
                    icon={card.icon}
                    variant={card.variant}
                    bind:isActive={card.isActive}
                    bind:value={card.value}
                    bind:entityId={card.entityId}
                    bind:name={card.name}
                    onclick={() => {}}
                />
            {/each}
        </div>
    </section>

    <!-- Thermostat Cards Section -->
    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Thermostat Cards
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- With Secondary Entity -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >With Outdoor Sensor</span
                >
                <ThermostatCard
                    bind:entityId={thermostat1.entityId}
                    bind:secondaryEntityId={thermostat1.secondaryEntityId}
                    bind:name={thermostat1.name}
                    bind:secondaryName={thermostat1.secondaryName}
                />
            </div>

            <!-- Without Secondary Entity -->
            <div class="flex flex-col gap-2">
                <span class="text-m3-label-medium text-m3-on-surface-variant"
                    >Basic (No Outdoor Sensor)</span
                >
                <ThermostatCard
                    bind:entityId={thermostat2.entityId}
                    bind:name={thermostat2.name}
                />
            </div>
        </div>
    </section>
</PageShell>
