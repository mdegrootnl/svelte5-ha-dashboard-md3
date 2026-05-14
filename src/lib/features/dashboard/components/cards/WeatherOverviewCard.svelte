<script lang="ts">
    import { buildSmartWeatherOptions, cardEditorStore, haRegistryStore, haStore } from "$lib";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { WeatherCardOptions } from "$lib/types";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
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
        options = $bindable({ source: "auto" }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let context = $derived({
        states: haStore.states,
        entities: haRegistryStore.entityRegistry,
        devices: haRegistryStore.deviceRegistry,
        areas: haRegistryStore.areas,
        floors: haRegistryStore.floors,
    });

    let smartOptions = $derived(buildSmartWeatherOptions(context, options));
    let weather = $derived(haStore.getEntity(smartOptions.weatherEntityId || entityId));

    function sensorValue(entityId?: string) {
        if (!entityId) return "--";
        const entity = haStore.getEntity(entityId);
        if (!entity) return "--";
        const unit = typeof entity.attributes.unit_of_measurement === "string" ? entity.attributes.unit_of_measurement : "";
        return `${entity.state}${unit}`;
    }

    let temperature = $derived(
        weather?.attributes.temperature !== undefined
            ? `${weather.attributes.temperature}${weather.attributes.temperature_unit || "C"}`
            : sensorValue(smartOptions.temperatureEntityId),
    );

    let conditionIcon = $derived.by(() => {
        const condition = weather?.state || "";
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
    class="relative h-full w-full rounded-m3-md bg-m3-surface-container-highest text-m3-on-surface overflow-hidden group @container {className}"
    style={`container-type: size;${backgroundColor ? ` background-color: ${backgroundColor};` : ""}`}
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
                    {weather?.state || "No weather entity"}
                </p>
            </div>
        </header>

        <div class="flex items-end justify-between gap-[clamp(0.375rem,3cqmin,1rem)] min-w-0">
            <span class="text-[clamp(28px,16cqmin,58px)] leading-none font-bold">
                {temperature}
            </span>
            <div class="text-right text-[clamp(0.625rem,2.9cqmin,0.8125rem)] text-m3-on-surface-variant min-w-0">
                <div>Humidity {sensorValue(smartOptions.humidityEntityId)}</div>
                <div>Rain {sensorValue(smartOptions.rainEntityId)}</div>
                <div>Wind {sensorValue(smartOptions.windEntityId)}</div>
            </div>
        </div>

        <div class="mt-auto grid grid-cols-3 gap-[clamp(0.25rem,2.4cqmin,0.75rem)]">
            <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.8cqmin,0.875rem)] text-center min-w-0">
                <span class="block text-[clamp(0.625rem,2.8cqmin,0.8125rem)] text-m3-on-surface-variant">Humidity</span>
                <span class="font-semibold text-[clamp(0.75rem,3.8cqmin,1rem)] truncate block">{sensorValue(smartOptions.humidityEntityId)}</span>
            </div>
            <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.8cqmin,0.875rem)] text-center min-w-0">
                <span class="block text-[clamp(0.625rem,2.8cqmin,0.8125rem)] text-m3-on-surface-variant">Rain</span>
                <span class="font-semibold text-[clamp(0.75rem,3.8cqmin,1rem)] truncate block">{sensorValue(smartOptions.rainEntityId)}</span>
            </div>
            <div class="rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.8cqmin,0.875rem)] text-center min-w-0">
                <span class="block text-[clamp(0.625rem,2.8cqmin,0.8125rem)] text-m3-on-surface-variant">Wind</span>
                <span class="font-semibold text-[clamp(0.75rem,3.8cqmin,1rem)] truncate block">{sensorValue(smartOptions.windEntityId)}</span>
            </div>
        </div>
    </div>

    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:brightness-110"
        onclick={openConfig}
        title="Edit Weather Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>
