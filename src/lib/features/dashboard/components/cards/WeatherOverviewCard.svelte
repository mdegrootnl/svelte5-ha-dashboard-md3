<script lang="ts">
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { inventoryStore } from "$lib/stores/inventory.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { HAEntity, WeatherCardOptions } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import {
        getCardSurfaceClasses,
        getCardSurfaceStyle,
    } from "$lib/features/dashboard/utils/cardSurface";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: WeatherCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("partly_cloudy_day"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ source: "auto" }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let smartOptions = $derived(inventoryStore.smartWeatherOptions(options));
    let weather = $derived(haStore.getEntity(smartOptions.weatherEntityId || entityId));

    const missingStates = new Set(["unknown", "unavailable", "none", ""]);

    function isUsableValue(value: unknown) {
        if (value === null || value === undefined) return false;
        const normalized = String(value).trim().toLowerCase();
        return !missingStates.has(normalized);
    }

    function formatMeasurement(value: unknown, unit = "") {
        if (!isUsableValue(value)) return null;
        return `${String(value).trim()}${unit}`;
    }

    function readSensorValue(entityId?: string) {
        if (!entityId) return null;
        const entity = haStore.getEntity(entityId);
        if (!entity || !isUsableValue(entity.state)) return null;
        const unit = typeof entity.attributes.unit_of_measurement === "string" ? entity.attributes.unit_of_measurement : "";
        return formatMeasurement(entity.state, unit);
    }

    function readWeatherAttribute(
        entity: HAEntity | undefined,
        valueKeys: string[],
        unitKeys: string[] = [],
        fallbackUnit = "",
    ) {
        if (!entity) return null;
        const valueKey = valueKeys.find((key) => isUsableValue(entity.attributes[key]));
        if (!valueKey) return null;
        const unitKey = unitKeys.find((key) => typeof entity.attributes[key] === "string");
        const unit = unitKey ? String(entity.attributes[unitKey]) : fallbackUnit;
        return formatMeasurement(entity.attributes[valueKey], unit);
    }

    let temperature = $derived(
        readWeatherAttribute(weather, ["temperature"], ["temperature_unit"], "C")
            ?? readSensorValue(smartOptions.temperatureEntityId)
            ?? "--",
    );
    let humidity = $derived(
        readSensorValue(smartOptions.humidityEntityId)
            ?? readWeatherAttribute(weather, ["humidity"], [], "%")
            ?? "--",
    );
    let rain = $derived(
        readSensorValue(smartOptions.rainEntityId)
            ?? readWeatherAttribute(weather, ["precipitation", "rain"], ["precipitation_unit"])
            ?? "--",
    );
    let wind = $derived(
        readSensorValue(smartOptions.windEntityId)
            ?? readWeatherAttribute(weather, ["wind_speed"], ["wind_speed_unit"])
            ?? "--",
    );
    let conditionText = $derived(isUsableValue(weather?.state) ? weather?.state : "No weather entity");

    let conditionIcon = $derived.by(() => {
        const condition = (isUsableValue(weather?.state) ? weather?.state || "" : "").toLowerCase();
        if (condition.includes("rain")) return "rainy";
        if (condition.includes("cloud")) return "cloud";
        if (condition.includes("sun") || condition.includes("clear")) return "wb_sunny";
        if (condition.includes("fog")) return "foggy";
        return icon || "partly_cloudy_day";
    });

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "weather",
            options: { weather: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "partly_cloudy_day";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { weather?: WeatherCardOptions })?.weather || options;
            },
            onDelete: ondelete,
        });
    }
</script>

<article
    class="relative h-full w-full rounded-m3-card text-m3-on-surface overflow-hidden group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
>
    <div class="h-full flex flex-col p-[clamp(0.625rem,4cqmin,1.5rem)] gap-[clamp(0.375rem,3cqmin,1rem)]">
        <header class="flex items-center gap-[clamp(0.375rem,3cqmin,1rem)]">
            <div
                class="size-[clamp(2.75rem,26cqmin,5.25rem)] rounded-m3-full flex items-center justify-center shrink-0"
                style:background-color={color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--color-m3-secondary-container)"}
                style:color={color || "var(--color-m3-secondary)"}
            >
                <DynamicIcon name={conditionIcon} class="size-[60%]" />
            </div>
            <div class="min-w-0">
                <h3 class="text-[clamp(14px,5cqmin,20px)] font-bold leading-tight truncate">
                    {name || "Weather"}
                </h3>
                <p class="text-[clamp(10px,3.4cqmin,13px)] text-m3-on-surface-variant capitalize truncate">
                    {conditionText}
                </p>
            </div>
        </header>

        <div class="flex items-end justify-between gap-[clamp(0.375rem,3cqmin,1rem)] min-w-0">
            <span class="text-[clamp(28px,16cqmin,58px)] leading-none font-bold">
                {temperature}
            </span>
            <div class="text-right text-[clamp(0.625rem,2.9cqmin,0.8125rem)] text-m3-on-surface-variant min-w-0">
                <div>Humidity {humidity}</div>
                <div>Rain {rain}</div>
                <div>Wind {wind}</div>
            </div>
        </div>

        <div class="mt-auto grid grid-cols-3 gap-[clamp(0.25rem,2.4cqmin,0.75rem)]">
            <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.8cqmin,0.875rem)] text-center min-w-0">
                <span class="block text-[clamp(0.625rem,2.8cqmin,0.8125rem)] text-m3-on-surface-variant">Humidity</span>
                <span class="font-semibold text-[clamp(0.75rem,3.8cqmin,1rem)] truncate block">{humidity}</span>
            </div>
            <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.8cqmin,0.875rem)] text-center min-w-0">
                <span class="block text-[clamp(0.625rem,2.8cqmin,0.8125rem)] text-m3-on-surface-variant">Rain</span>
                <span class="font-semibold text-[clamp(0.75rem,3.8cqmin,1rem)] truncate block">{rain}</span>
            </div>
            <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.8cqmin,0.875rem)] text-center min-w-0">
                <span class="block text-[clamp(0.625rem,2.8cqmin,0.8125rem)] text-m3-on-surface-variant">Wind</span>
                <span class="font-semibold text-[clamp(0.75rem,3.8cqmin,1rem)] truncate block">{wind}</span>
            </div>
        </div>
    </div>

    <button
        class="touch-edit-control absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Weather Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>
