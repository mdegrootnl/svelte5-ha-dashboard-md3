<script lang="ts">
    import SideSheet from "$lib/components/layout/SideSheet.svelte";
    import EntityPicker from "$lib/components/md3/EntityPicker.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import IconSettings from "~icons/material-symbols/settings";
    import { weatherStore } from "$lib/stores/weather.svelte";

    let { open = $bindable(false) } = $props();

    // Local state for edits
    let weatherEntityId = $state(weatherStore.config.weatherEntityId || "");
    let aqiEntityId = $state(weatherStore.config.aqiEntityId || "");

    // Sync when opening
    $effect(() => {
        if (open) {
            weatherEntityId = weatherStore.config.weatherEntityId || "";
            aqiEntityId = weatherStore.config.aqiEntityId || "";
        }
    });

    function handleSave() {
        weatherStore.setConfig({
            weatherEntityId,
            aqiEntityId,
        });
        open = false;
    }

    function handleClose() {
        open = false;
    }
</script>

<SideSheet
    bind:open
    title="Weather Settings"
    subtitle="Configure providers"
    icon={IconSettings}
    onclose={handleClose}
>
    <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
            <span class="text-label-large text-primary">Providers</span>
            <p class="text-body-medium text-on-surface-variant">
                Select specific entities to use for weather data. Leave empty to
                use automatic discovery.
            </p>
        </div>

        <!-- Weather Provider -->
        <div class="flex flex-col gap-2">
            <EntityPicker
                label="Weather Provider"
                placeholder="weather.home"
                bind:value={weatherEntityId}
                domainFilter="weather"
                class="w-full"
            />
            <p class="text-body-small text-on-surface-variant px-1">
                Used for current conditions and forecasts.
            </p>
        </div>

        <!-- AQI Provider -->
        <div class="flex flex-col gap-2">
            <EntityPicker
                label="Air Quality Provider"
                placeholder="sensor.waqi_..."
                bind:value={aqiEntityId}
                domainFilter="sensor"
                class="w-full"
            />
            <p class="text-body-small text-on-surface-variant px-1">
                Used for the air quality index widget.
            </p>
        </div>
    </div>

    {#snippet actions()}
        <Button variant="text" onclick={handleClose}>Cancel</Button>
        <Button variant="filled" onclick={handleSave}>Save</Button>
    {/snippet}
</SideSheet>
