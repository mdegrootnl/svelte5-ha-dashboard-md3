<script lang="ts">
    import {
        ButtonCard,
        MediaCard,
        ThermostatCard,
        haStore,
        PageShell,
        Button,
        CardConfigSheet,
    } from "$lib";
    import { cardEditorStore } from "$lib/stores/cardEditor.svelte";
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

    // Helper to open config for a card
    function openCardConfig(card: any, index?: number) {
        cardEditorStore.openConfig({
            entityId: card.entityId,
            name: card.name || card.title || "",
            type: card.cardType || (card.id ? "button" : undefined),
            domainFilter: card.domainFilter,
            onSave: (newConfig) => {
                if (index !== undefined) {
                    // Update ButtonCard from 'cards' array
                    cards[index].entityId = newConfig.entityId;
                    cards[index].title = newConfig.name;
                } else if (card === thermostat1) {
                    thermostat1.entityId = newConfig.entityId;
                    thermostat1.name = newConfig.name;
                    thermostat1.secondaryEntityId =
                        (newConfig as any).secondaryEntityId || "";
                    thermostat1.secondaryName =
                        (newConfig as any).secondaryName || "";
                } else if (card === thermostat2) {
                    thermostat2.entityId = newConfig.entityId;
                    thermostat2.name = newConfig.name;
                    thermostat2.secondaryEntityId =
                        (newConfig as any).secondaryEntityId || "";
                    thermostat2.secondaryName =
                        (newConfig as any).secondaryName || "";
                }
            },
        });
    }

    function openMediaConfig(entityId: string, name: string) {
        cardEditorStore.openConfig({
            entityId,
            name,
            type: "media",
            domainFilter: "media_player",
            onSave: (newConfig) => {
                console.log("Media config saved:", newConfig);
            },
        });
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
                <div
                    class="h-48 cursor-pointer"
                    onclick={() =>
                        openMediaConfig("media_player.spotify", "Spotify")}
                    onkeydown={(e) =>
                        e.key === "Enter" &&
                        openMediaConfig("media_player.spotify", "Spotify")}
                    role="button"
                    tabindex="0"
                    aria-label="Configure Spotify"
                >
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
                <div
                    class="h-96 cursor-pointer"
                    onclick={() =>
                        openMediaConfig(
                            "media_player.living_room_tv",
                            "Living Room TV",
                        )}
                    onkeydown={(e) =>
                        e.key === "Enter" &&
                        openMediaConfig(
                            "media_player.living_room_tv",
                            "Living Room TV",
                        )}
                    role="button"
                    tabindex="0"
                    aria-label="Configure Living Room TV"
                >
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
                    onclick={() => openCardConfig(card, i)}
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
                <div
                    class="h-24 cursor-pointer"
                    onclick={() =>
                        openCardConfig(
                            { ...thermostat2, cardType: "thermostat" },
                            undefined,
                        )}
                    onkeydown={(e) =>
                        e.key === "Enter" &&
                        openCardConfig(
                            { ...thermostat2, cardType: "thermostat" },
                            undefined,
                        )}
                    role="button"
                    tabindex="0"
                    aria-label="Configure Thermostat 2"
                >
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
                <div
                    class="h-96 cursor-pointer"
                    onclick={() =>
                        openCardConfig(
                            { ...thermostat1, cardType: "thermostat" },
                            undefined,
                        )}
                    onkeydown={(e) =>
                        e.key === "Enter" &&
                        openCardConfig(
                            { ...thermostat1, cardType: "thermostat" },
                            undefined,
                        )}
                    role="button"
                    tabindex="0"
                    aria-label="Configure Thermostat 1"
                >
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

    <CardConfigSheet />
</PageShell>
