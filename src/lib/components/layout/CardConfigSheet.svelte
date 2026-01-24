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
    import IconAdd from "~icons/material-symbols/add";
    import IconButton from "$lib/components/md3/IconButton.svelte";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { getDomain } from "$lib/utils/entity";
    import type {
        ThermostatCardConfig,
        CardSize,
        GraphCardEntity,
    } from "$lib/types";

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
        type?: "button" | "thermostat" | "media" | "title" | "tabs" | "graph";
        secondaryEntityId: string;
        secondaryName: string;
        domainFilter?: string;
        cardSize: CardSize;
        subtitle: string;
        alignment: "start" | "center" | "end";
        hours_to_show: number;
        aggregate_func: "avg" | "min" | "max" | "last";
        graphEntities: GraphCardEntity[];
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
            };
        }
    });

    // Get the appropriate icon component based on domain
    function getIconComponent(domain: string) {
        if (isTitleCard) return IconHdrAuto;
        if (isTabCard) return IconViewModule;
        if (isGraphCard) return IconShowChart;

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
            : isGraphCard
              ? "Edit Graph Card"
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
                    {:else if isGraphCard}
                        <GraphCard
                            type="graph"
                            entityId={tempConfig.entityId}
                            name={tempConfig.name}
                            hours_to_show={tempConfig.hours_to_show}
                            aggregate_func={tempConfig.aggregate_func}
                            graphEntities={tempConfig.graphEntities}
                        />
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
