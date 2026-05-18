<script lang="ts">
    import WeatherTile from "./WeatherTile.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { browser } from "$app/environment";
    import IconEdit from "~icons/material-symbols/edit";

    // Persistence key for the AQI entity configuration
    const STORAGE_KEY = "weather_aqi_entity_id";

    // Load persisted entity ID or default to empty (auto-discover)
    let configuredEntityId = $state(
        browser ? localStorage.getItem(STORAGE_KEY) || "" : "",
    );

    // Auto-discover AQI sensor if not configured
    let discoveredEntityId = $derived.by(() => {
        if (configuredEntityId) return null; // Don't discover if manually configured

        haStore.statesVersion;
        const sensorKeys = haStore.getEntityIdsSnapshot(false);
        return (
            sensorKeys.find((id) => id.startsWith("sensor.waqi_")) ||
            sensorKeys.find(
                (id) =>
                    id.startsWith("sensor.") &&
                    id.toLowerCase().includes("aqi"),
            ) ||
            sensorKeys.find(
                (id) =>
                    id.startsWith("sensor.") &&
                    id.toLowerCase().includes("luchtkwaliteit"),
            ) ||
            sensorKeys.find((id) => id.startsWith("air_quality.")) ||
            null
        );
    });

    // Active entity ID (configured takes precedence)
    let activeEntityId = $derived(configuredEntityId || discoveredEntityId);

    // Get entity data directly from haStore
    let entity = $derived(
        activeEntityId ? haStore.getLiveEntity(activeEntityId) : null,
    );

    // Parse AQI value
    let val = $derived.by(() => {
        if (!entity) return 0;
        const parsed = parseFloat(entity.state);
        return isNaN(parsed) ? 0 : parsed;
    });

    // AQI level and description
    let level = $derived.by(() => {
        if (val <= 50) return themeStore.t("weather.aqi.good");
        if (val <= 100) return themeStore.t("weather.aqi.moderate");
        if (val <= 150) return themeStore.t("weather.aqi.unhealthySensitive");
        if (val <= 200) return themeStore.t("weather.aqi.unhealthy");
        if (val <= 300) return themeStore.t("weather.aqi.veryUnhealthy");
        return themeStore.t("weather.aqi.hazardous");
    });

    let desc = $derived.by(() => {
        if (!activeEntityId) return themeStore.t("weather.aqi.noSensor");
        if (!entity) return themeStore.t("weather.aqi.sensorMissing");
        if (val <= 50) return themeStore.t("weather.aqi.goodDescription");
        if (val <= 100) return themeStore.t("weather.aqi.moderateDescription");
        if (val <= 150) return themeStore.t("weather.aqi.sensitiveDescription");
        if (val <= 200) return themeStore.t("weather.aqi.unhealthyDescription");
        return themeStore.t("weather.aqi.alertDescription");
    });

    // Color logic
    let progressColor = $derived.by(() => {
        if (val <= 50) return "bg-green-500";
        if (val <= 100) return "bg-yellow-500";
        if (val <= 150) return "bg-orange-500";
        return "bg-red-500";
    });

    let percent = $derived(isNaN(val) ? 0 : Math.min(100, (val / 200) * 100));

    // Configuration dialog
    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            entityId: configuredEntityId || activeEntityId || "",
            name: "",
            icon: "",
            onSave: (newConfig) => {
                configuredEntityId = newConfig.entityId;
                if (browser) {
                    localStorage.setItem(STORAGE_KEY, newConfig.entityId);
                }
            },
        });
    }
</script>

<WeatherTile title={themeStore.t("weather.aqi")} icon="ecg_heart">
    <div
        class="w-full flex flex-col items-center justify-center gap-2 px-2 relative group"
    >
        <!-- Value -->
        <span class="text-display-medium font-medium text-m3-on-surface">
            {Math.round(val)}
        </span>

        <!-- Bar -->
        <div
            class="w-full h-3 bg-m3-surface-variant/30 rounded-full overflow-hidden relative"
        >
            <!-- Gradient background for context -->
            <div
                class="absolute inset-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 opacity-20"
            ></div>

            <!-- Indicator Dot -->
            <div
                class="absolute top-0 bottom-0 w-3 h-3 rounded-full shadow-sm {progressColor} border-2 border-white transition-all duration-500"
                style="left: {percent}%; transform: translateX(-50%)"
            ></div>
        </div>

        <span
            class="text-label-medium text-m3-on-surface-variant text-center leading-tight"
        >
            {desc}
        </span>

        <!-- Edit FAB (Visible on Hover) -->
        <button
            class="absolute top-0 right-0 p-1.5 rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-30 hover:brightness-110"
            onclick={openConfig}
            title={themeStore.t("weather.aqi.configureSensor")}
        >
            <IconEdit class="size-4" />
        </button>
    </div>
</WeatherTile>
