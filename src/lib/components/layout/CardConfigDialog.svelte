<script lang="ts">
    import TextField from "$lib/components/md3/TextField.svelte";
    import EntityPicker from "$lib/components/md3/EntityPicker.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import IconClose from "~icons/material-symbols/close";
    import IconLightbulb from "~icons/material-symbols/lightbulb";
    import IconThermostat from "~icons/material-symbols/thermostat";
    import IconDevices from "~icons/material-symbols/devices";
    import IconToggleOn from "~icons/material-symbols/toggle-on";
    import IconSensors from "~icons/material-symbols/sensors";
    import IconPlayCircle from "~icons/material-symbols/play-circle";
    import IconList from "~icons/material-symbols/list";
    import IconViewModule from "~icons/material-symbols/view-module";
    import IconShowChart from "~icons/material-symbols/show-chart";
    import IconLink from "~icons/material-symbols/link";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { getDomain } from "$lib/utils/entity";
    import type { CardConfig } from "$lib/types";
    import type { DashboardCardType, GraphChartType } from "$lib/types/dashboard";
    import type { Component } from "svelte";

    // Flexible binding for local edits (includes thermostat-specific fields)
    let tempConfig = $state<{
        entityId: string;
        name: string;
        type?: DashboardCardType;
        secondaryEntityId: string;
        secondaryName: string;
        subtitle: string;
        hours_to_show: number;
        aggregate_func: "avg" | "min" | "max" | "last";
        chartType: GraphChartType;
    }>({
        entityId: "",
        name: "",
        secondaryEntityId: "",
        secondaryName: "",
        subtitle: "",
        hours_to_show: 24,
        aggregate_func: "avg",
        chartType: "area",
    });

    // Sync when opening
    $effect(() => {
        if (cardEditorStore.isOpen) {
            const config = cardEditorStore.config;
            tempConfig = {
                entityId: config.entityId || "",
                name: config.name || "",
                type: config.type,
                secondaryEntityId: (config as any).secondaryEntityId || "",
                secondaryName: (config as any).secondaryName || "",
                subtitle: (config as any).subtitle || "",
                hours_to_show: (config as any).hours_to_show ?? 24,
                aggregate_func: (config as any).aggregate_func ?? "avg",
                chartType: (config as any).chartType ?? "area",
            };
        }
    });

    const graphChartTypeOptions: Array<{
        value: GraphChartType;
        label: string;
    }> = [
        { value: "area", label: "Area" },
        { value: "line", label: "Line" },
        { value: "bar", label: "Bar" },
        { value: "step", label: "Step" },
    ];

    function isThermostatCard() {
        return cardEditorStore.config?.type === "thermostat";
    }

    function isTitleCard() {
        return cardEditorStore.config?.type === "title";
    }

    function isTabCard() {
        return cardEditorStore.config?.type === "tabs";
    }

    function isGraphCard() {
        return cardEditorStore.config?.type === "graph";
    }

    function isNavigationCard() {
        return cardEditorStore.config?.type === "navigation";
    }

    // Get the appropriate icon component based on domain
    function getIconComponent(domain: string) {
        if (isTitleCard()) return IconList;
        if (isTabCard()) return IconViewModule;
        if (isGraphCard()) return IconShowChart;
        if (isNavigationCard()) return IconLink;

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

    let CurrentIcon = $state<Component>(IconDevices);

    $effect(() => {
        const domain = tempConfig.entityId ? getDomain(tempConfig.entityId) : "";
        CurrentIcon = getIconComponent(domain);
    });

    function handleSave() {
        // preserve onSave callback from original config
        const finalConfig = {
            ...cardEditorStore.config,
            ...tempConfig,
        };
        cardEditorStore.save(finalConfig as CardConfig);
    }

    function handleCancel() {
        cardEditorStore.close();
    }
</script>

{#if cardEditorStore.isOpen}
    <div
        class="fixed inset-0 z-50 bg-m3-scrim/50 backdrop-blur-sm"
        data-testid="dialog-backdrop"
        role="presentation"
        onclick={() => cardEditorStore.close()}
    ></div>
    <div
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-config-dialog-title"
    >
        <div
            class="bg-m3-surface-container-high rounded-m3-lg shadow-xl overflow-visible flex flex-col w-full"
        >
            <div class="px-6 pt-6 pb-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div
                        class="flex items-center justify-center w-10 h-10 rounded-full bg-m3-primary-container text-m3-on-primary-container"
                    >
                        <CurrentIcon class="size-5" />
                    </div>
                    <h2
                        id="card-config-dialog-title"
                        class="text-m3-headline-small text-m3-on-surface"
                    >
                        {isThermostatCard()
                            ? "Edit Thermostat"
                            : isTitleCard()
                              ? "Edit Title Card"
                              : isTabCard()
                                ? "Edit Tab Card"
                                : isGraphCard()
                                  ? "Edit Graph Card"
                                  : isNavigationCard()
                                    ? "Edit Navigation Card"
                                    : "Edit Card"}
                    </h2>
                </div>
                <button
                    type="button"
                    aria-label="Close"
                    class="text-m3-on-surface-variant hover:text-m3-on-surface rounded-full p-2 hover:bg-m3-on-surface/10 transition-colors"
                    onclick={handleCancel}
                >
                    <IconClose class="size-6" />
                </button>
            </div>

            <div class="px-6 flex flex-col gap-4">
                {#if !isTitleCard() && !isTabCard()}
                    <EntityPicker
                        label="Entity ID"
                        placeholder={isThermostatCard()
                            ? "climate.living_room"
                            : "light.living_room"}
                        bind:value={tempConfig.entityId}
                        domainFilter={isThermostatCard() ? "climate" : undefined}
                        class="w-full"
                    />
                {/if}

                <TextField
                    variant="outlined"
                    label={isTitleCard() ? "Title" : "Custom Name"}
                    placeholder={isThermostatCard()
                        ? "Binnen"
                        : "Living Room Light"}
                    bind:value={tempConfig.name}
                    class="w-full"
                />

                {#if isTitleCard()}
                    <TextField
                        variant="outlined"
                        label="Subtitle"
                        placeholder="Optional subtitle"
                        bind:value={tempConfig.subtitle}
                        class="w-full"
                    />
                {/if}

                {#if isThermostatCard()}
                    <div class="border-t border-m3-outline-variant/30 pt-4 mt-2">
                        <p class="text-m3-label-medium text-m3-on-surface-variant mb-3">
                            Secondary Sensor (Optional)
                        </p>
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
                                class="w-full"
                            />
                        </div>
                    </div>
                {/if}

                {#if isGraphCard()}
                    <div
                        class="border-t border-m3-outline-variant/30 pt-4 mt-2 flex flex-col gap-4"
                    >
                        <TextField
                            variant="outlined"
                            label="Hours to Show"
                            type="number"
                            placeholder="24"
                            value={tempConfig.hours_to_show.toString()}
                            oninput={(e) =>
                                (tempConfig.hours_to_show =
                                    parseInt((e.target as HTMLInputElement).value) ||
                                    24)}
                            class="w-full"
                        />
                        <div class="flex flex-col gap-1">
                            <label
                                class="text-m3-label-medium text-m3-on-surface-variant ml-3"
                                for="dialog-chart-type"
                            >
                                Chart Type
                            </label>
                            <select
                                id="dialog-chart-type"
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
                    </div>
                {/if}
            </div>

            <div class="px-6 pb-6 flex justify-end gap-2 items-center">
                <Button variant="text" onclick={handleCancel}>Cancel</Button>

                {#if cardEditorStore.config?.onDelete}
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
            </div>
        </div>
    </div>
{/if}
