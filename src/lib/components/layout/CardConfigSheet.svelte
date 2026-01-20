<script lang="ts">
    import SideSheet from "./SideSheet.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import EntityPicker from "$lib/components/md3/EntityPicker.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import ButtonCard from "$lib/features/dashboard/components/cards/ButtonCard.svelte";
    import ThermostatCard from "$lib/features/dashboard/components/cards/ThermostatCard.svelte";
    import MediaCard from "$lib/features/dashboard/components/cards/MediaCard.svelte";
    import TitleCard from "$lib/features/dashboard/components/cards/TitleCard.svelte";
    import IconLightbulb from "~icons/material-symbols/lightbulb";
    import IconThermostat from "~icons/material-symbols/thermostat";
    import IconDevices from "~icons/material-symbols/devices";
    import IconToggleOn from "~icons/material-symbols/toggle-on";
    import IconSensors from "~icons/material-symbols/sensors";
    import IconPlayCircle from "~icons/material-symbols/play-circle";
    import IconDelete from "~icons/material-symbols/delete";
    import IconHdrAuto from "~icons/material-symbols/hdr-auto";
    import IconViewModule from "~icons/material-symbols/view-module";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { getDomain } from "$lib/utils/entity";
    import type { ThermostatCardConfig, CardSize } from "$lib/types";

    function handleDelete() {
        if (cardEditorStore.config.id) {
            dashboardEditorStore.deleteItem(cardEditorStore.config.id);
            cardEditorStore.close();
        }
    }

    // Computed proxy for cleaner access
    let open = $derived(cardEditorStore.mode === "config");
    let showBack = $derived(cardEditorStore.showBack);

    // Flexible binding for local edits
    let tempConfig = $state<{
        entityId: string;
        name: string;
        type?: "button" | "thermostat" | "media" | "title" | "tabs";
        secondaryEntityId: string;
        secondaryName: string;
        domainFilter?: string;
        cardSize: CardSize;
        subtitle: string;
        alignment: "start" | "center" | "end";
    }>({
        entityId: "",
        name: "",
        secondaryEntityId: "",
        secondaryName: "",
        domainFilter: undefined,
        cardSize: "standard",
        subtitle: "",
        alignment: "start",
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
            };
        }
    });

    // Get the appropriate icon component based on domain
    function getIconComponent(domain: string) {
        if (isTitleCard) return IconHdrAuto;
        if (isTabCard) return IconViewModule;

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
    title={isThermostatCard
        ? "Edit Thermostat"
        : isTitleCard
          ? "Edit Title"
          : isTabCard
            ? "Edit Tab Card"
            : "Edit Card"}
    subtitle={tempConfig.name || "Configure card settings"}
    icon={CurrentIcon}
    {showBack}
    onclose={handleClose}
    onback={handleBack}
>
    <div class="flex flex-col gap-4 pb-64">
        <!-- Card Size Selector (Hidden for Title and Tab Card) -->
        {#if !isTitleCard && !isTabCard}
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
                        : tempConfig.cardSize === 'standard' || isTitleCard
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
                    {:else if isTitleCard}
                        <TitleCard
                            name={tempConfig.name}
                            subtitle={tempConfig.subtitle}
                            alignment={tempConfig.alignment}
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

            <!-- Entity ID with autocomplete (Hidden for Title and Tab Card) -->
            {#if !isTitleCard && !isTabCard}
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

            <TextField
                variant="outlined"
                label={isTitleCard ? "Title" : "Custom Name"}
                placeholder={isThermostatCard
                    ? "Binnen"
                    : isTitleCard
                      ? "Living Room"
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
