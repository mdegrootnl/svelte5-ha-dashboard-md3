<script lang="ts">
    import SideSheet from "$lib/components/layout/SideSheet.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import MediaControls from "$lib/features/dashboard/components/cards/media/MediaControls.svelte";
    import MediaVolume from "$lib/features/dashboard/components/cards/media/MediaVolume.svelte";
    import { resolveVacuumCapabilities } from "$lib/domain/vacuumCapabilities";
    import { entityDetailStore } from "$lib/features/dashboard/stores/entityDetail.svelte";
    import { haRegistryStore } from "$lib/stores/haRegistry.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { LANGUAGE_LOCALES } from "$lib/i18n";
    import {
        formatEntityStateLabel,
        getDomain,
        getEntityIcon,
        getEntityName,
        supportsBrightness,
    } from "$lib/utils/entity";
    import type { HAEntityAttributes } from "$lib/types";

    type StoreEntity = NonNullable<ReturnType<typeof haStore.getEntity>>;

    interface EntityRow {
        entityId: string;
        entity: StoreEntity | null;
    }

    const COMPACT_ATTRIBUTE_KEYS = [
        "device_class",
        "battery_level",
        "current_temperature",
        "temperature",
        "humidity",
        "volume_level",
        "brightness",
        "percentage",
        "position",
        "current_position",
        "installed_version",
        "latest_version",
        "skipped_version",
    ];

    let selectedEntityId = $derived(entityDetailStore.selectedEntityId);
    let selectedEntity = $derived(
        selectedEntityId ? haStore.getEntity(selectedEntityId) : null,
    );
    let domain = $derived(selectedEntityId ? getDomain(selectedEntityId) : "");
    let entityRows = $derived<EntityRow[]>(
        entityDetailStore.entityIds.map((entityId) => ({
            entityId,
            entity: haStore.getEntity(entityId) ?? null,
        })),
    );
    let entityCountLabel = $derived(
        themeStore.t(
            entityRows.length === 1
                ? "entityDetail.entityCount"
                : "entityDetail.entityCountPlural",
            { count: entityRows.length },
        ),
    );
    let sheetTitle = $derived(
        entityDetailStore.title ||
            (selectedEntity
                ? getEntityName(selectedEntityId, selectedEntity.attributes)
                : themeStore.t("entityDetail.title")),
    );
    let sheetSubtitle = $derived(
        entityDetailStore.sourceLabel || entityCountLabel,
    );
    let selectedName = $derived(
        selectedEntity
            ? getEntityName(selectedEntityId, selectedEntity.attributes)
            : selectedEntityId,
    );
    let selectedStateLabel = $derived(
        selectedEntity ? formatEntityState(selectedEntityId, selectedEntity) : "",
    );
    let selectedLastChanged = $derived(
        formatTimestamp(selectedEntity?.last_changed ?? selectedEntity?.last_updated),
    );
    let selectedVacuumCapabilities = $derived(resolveVacuumCapabilities(selectedEntity));
    let cleanAreaOptions = $derived.by(() => {
        if (domain !== "vacuum" || !selectedVacuumCapabilities.canCleanArea) return [];

        const registry = haRegistryStore.entityRegistry.find((entry) => entry.entity_id === selectedEntityId);
        const device = registry?.device_id
            ? haRegistryStore.deviceRegistry.find((entry) => entry.id === registry.device_id)
            : undefined;
        const areaId = registry?.area_id ?? device?.area_id ?? null;
        const floorId = areaId
            ? haRegistryStore.areas.find((area) => area.area_id === areaId)?.floor_id
            : null;
        const candidates = floorId
            ? haRegistryStore.areas.filter((area) => area.floor_id === floorId)
            : haRegistryStore.areas;

        return candidates.slice(0, 12);
    });
    let brightnessValue = $state(0);
    let fanPercentageValue = $state(0);
    let humidifierHumidityValue = $state(0);

    $effect(() => {
        if (!selectedEntity) return;
        const brightness = Number(selectedEntity.attributes.brightness ?? 0);
        brightnessValue = Math.round((Math.max(0, Math.min(255, brightness)) / 255) * 100);
        fanPercentageValue = Math.round(Number(selectedEntity.attributes.percentage ?? 0));
        humidifierHumidityValue = Math.round(Number(selectedEntity.attributes.humidity ?? 0));
    });

    function close() {
        entityDetailStore.close();
    }

    function selectEntity(entityId: string) {
        entityDetailStore.select(entityId);
    }

    function entityIcon(entityId: string, entity: StoreEntity | null) {
        const configuredIcon = entity?.attributes?.icon;
        if (typeof configuredIcon === "string") return configuredIcon;
        return getEntityIcon(getDomain(entityId));
    }

    function formatEntityState(entityId: string, entity: StoreEntity) {
        return formatEntityStateLabel(entity.state, {
            entityId,
            attributes: entity.attributes,
            language: themeStore.language,
        });
    }

    function formatTimestamp(value?: string) {
        if (!value) return "";
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return "";

        return new Intl.DateTimeFormat(LANGUAGE_LOCALES[themeStore.language], {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(date);
    }

    function inputNumber(event: Event) {
        return Number((event.currentTarget as HTMLInputElement).value);
    }

    function inputValue(event: Event) {
        return (event.currentTarget as HTMLSelectElement | HTMLInputElement).value;
    }

    function callSelected(service: string, data: Record<string, unknown> = {}) {
        if (!selectedEntityId || !domain) return;
        haStore.callService(domain, service, {
            entity_id: selectedEntityId,
            ...data,
        });
    }

    function toggleSelected() {
        if (!selectedEntity) return;
        if (domain === "button") {
            callSelected("press");
            return;
        }
        if (domain === "scene" || domain === "script") {
            callSelected("turn_on");
            return;
        }
        callSelected("toggle");
    }

    function turnSelectedOn() {
        callSelected("turn_on");
    }

    function turnSelectedOff() {
        callSelected("turn_off");
    }

    function setBrightness(value: number) {
        if (!selectedEntityId) return;
        if (value <= 0) {
            haStore.callService("light", "turn_off", { entity_id: selectedEntityId });
            return;
        }
        haStore.callService("light", "turn_on", {
            entity_id: selectedEntityId,
            brightness_pct: value,
        });
    }

    function setFanPercentage(value: number) {
        if (!selectedEntityId) return;
        haStore.callService("fan", "set_percentage", {
            entity_id: selectedEntityId,
            percentage: value,
        });
    }

    function setHumidifierHumidity(value: number) {
        if (!selectedEntityId) return;
        haStore.callService("humidifier", "set_humidity", {
            entity_id: selectedEntityId,
            humidity: value,
        });
    }

    function setCover(service: "open_cover" | "stop_cover" | "close_cover") {
        callSelected(service);
    }

    function setLock(service: "lock" | "unlock") {
        callSelected(service);
    }

    function setAlarm(service: "alarm_arm_home" | "alarm_arm_away" | "alarm_disarm") {
        callSelected(service);
    }

    function setVacuum(service: "start" | "pause" | "return_to_base" | "stop") {
        callSelected(service);
    }

    function locateVacuum() {
        callSelected("locate");
    }

    function cleanVacuumSpot() {
        callSelected("clean_spot");
    }

    function setVacuumFanSpeed(fanSpeed: string) {
        if (!fanSpeed) return;
        callSelected("set_fan_speed", { fan_speed: fanSpeed });
    }

    function cleanVacuumArea(areaId: string) {
        if (!selectedEntityId || !areaId) return;
        haStore.callService(
            "vacuum",
            "clean_area",
            { cleaning_area_id: [areaId] },
            { entity_id: selectedEntityId },
        );
    }

    function setUpdate(service: "install" | "skip" | "clear_skipped") {
        callSelected(service);
    }

    function climateNumberAttribute(key: string, fallback: number) {
        const value = Number(selectedEntity?.attributes?.[key] ?? fallback);
        return Number.isFinite(value) ? value : fallback;
    }

    function adjustTemperature(direction: 1 | -1) {
        if (!selectedEntityId) return;
        const current = climateNumberAttribute("temperature", 20);
        const min = climateNumberAttribute("min_temp", 5);
        const max = climateNumberAttribute("max_temp", 35);
        const step = climateNumberAttribute("target_temp_step", 0.5);
        const temperature = Math.max(min, Math.min(max, current + step * direction));

        haStore.callService("climate", "set_temperature", {
            entity_id: selectedEntityId,
            temperature,
        });
    }

    function setHvacMode(mode: string) {
        if (!selectedEntityId) return;
        haStore.callService("climate", "set_hvac_mode", {
            entity_id: selectedEntityId,
            hvac_mode: mode,
        });
    }

    function attributeText(value: unknown) {
        if (value === null || value === undefined || value === "") return "";
        if (Array.isArray(value)) return value.join(", ");
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    }

    function compactAttributes(attributes: HAEntityAttributes = {}) {
        return COMPACT_ATTRIBUTE_KEYS
            .filter((key) => key in attributes)
            .map((key) => ({
                key,
                value: attributeText(attributes[key]),
            }))
            .filter((item) => item.value)
            .slice(0, 8);
    }

    let canToggle = $derived(
        ["light", "switch", "input_boolean", "fan", "humidifier", "scene", "script", "button"].includes(domain),
    );
    let canDim = $derived(
        domain === "light" &&
            selectedEntity &&
            supportsBrightness(selectedEntity.attributes),
    );
    let hvacModes = $derived<string[]>(
        Array.isArray(selectedEntity?.attributes?.hvac_modes)
            ? (selectedEntity.attributes.hvac_modes as string[])
            : [],
    );
    let climateTarget = $derived(
        climateNumberAttribute("temperature", Number.NaN),
    );
    let compactAttributeRows = $derived(
        compactAttributes(selectedEntity?.attributes),
    );
</script>

<SideSheet
    open={entityDetailStore.open}
    title={sheetTitle}
    subtitle={sheetSubtitle}
    maxWidth="max-w-lg"
    onclose={close}
>
    <div class="entity-detail">
        {#if entityRows.length > 1}
            <div class="entity-detail__list" aria-label={themeStore.t("entityDetail.entities")}>
                {#each entityRows as row (row.entityId)}
                    {@const rowState = row.entity ? formatEntityState(row.entityId, row.entity) : themeStore.t("common.unavailable")}
                    <button
                        type="button"
                        class="entity-detail__row"
                        class:entity-detail__row--selected={row.entityId === selectedEntityId}
                        onclick={() => selectEntity(row.entityId)}
                    >
                        <DynamicIcon
                            name={entityIcon(row.entityId, row.entity)}
                            class="h-6 w-6 shrink-0"
                        />
                        <span class="entity-detail__row-body">
                            <span class="entity-detail__row-name">
                                {row.entity
                                    ? getEntityName(row.entityId, row.entity.attributes)
                                    : row.entityId}
                            </span>
                            <span class="entity-detail__row-state">{rowState}</span>
                        </span>
                    </button>
                {/each}
            </div>
        {/if}

        {#if selectedEntity}
            <section class="entity-detail__hero">
                <div class="entity-detail__hero-icon">
                    <DynamicIcon name={entityIcon(selectedEntityId, selectedEntity)} class="size-[58%]" />
                </div>
                <div class="min-w-0">
                    <p class="entity-detail__eyebrow">{selectedEntityId}</p>
                    <h3 class="entity-detail__name">{selectedName}</h3>
                    <p class="entity-detail__state">
                        {selectedStateLabel || themeStore.t("common.noData")}
                    </p>
                    {#if selectedLastChanged}
                        <p class="entity-detail__changed">
                            {themeStore.t("entityDetail.lastChanged", { time: selectedLastChanged })}
                        </p>
                    {/if}
                </div>
            </section>

            {#if canToggle || domain === "lock" || domain === "cover" || domain === "vacuum" || domain === "update" || domain === "climate" || domain === "media_player" || domain === "alarm_control_panel"}
                <section class="entity-detail__controls">
                    <h4>{themeStore.t("entityDetail.controls")}</h4>

                    {#if canToggle}
                        <div class="entity-detail__button-row">
                            <button type="button" class="entity-detail__primary-action" onclick={toggleSelected}>
                                <DynamicIcon name={domain === "button" ? "touch_app" : "power_settings_new"} class="size-5" />
                                {domain === "button"
                                    ? themeStore.t("entityDetail.press")
                                    : themeStore.t("entityDetail.toggle")}
                            </button>
                            {#if ["light", "switch", "fan", "humidifier", "input_boolean"].includes(domain)}
                                <button type="button" class="entity-detail__secondary-action" onclick={turnSelectedOn}>
                                    {themeStore.t("common.turnOn")}
                                </button>
                                <button type="button" class="entity-detail__secondary-action" onclick={turnSelectedOff}>
                                    {themeStore.t("entityDetail.turnOff")}
                                </button>
                            {/if}
                        </div>
                    {/if}

                    {#if canDim}
                        <label class="entity-detail__slider">
                            <span>{themeStore.t("entityDetail.brightness")}</span>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={brightnessValue}
                                oninput={(event) => (brightnessValue = inputNumber(event))}
                                onchange={() => setBrightness(brightnessValue)}
                            />
                            <strong>{brightnessValue}%</strong>
                        </label>
                    {/if}

                    {#if domain === "fan" && "percentage" in selectedEntity.attributes}
                        <label class="entity-detail__slider">
                            <span>{themeStore.t("entityDetail.speed")}</span>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={fanPercentageValue}
                                oninput={(event) => (fanPercentageValue = inputNumber(event))}
                                onchange={() => setFanPercentage(fanPercentageValue)}
                            />
                            <strong>{fanPercentageValue}%</strong>
                        </label>
                    {/if}

                    {#if domain === "humidifier" && "humidity" in selectedEntity.attributes}
                        <label class="entity-detail__slider">
                            <span>{themeStore.t("entityDetail.humidity")}</span>
                            <input
                                type="range"
                                min={Number(selectedEntity.attributes.min_humidity ?? 30)}
                                max={Number(selectedEntity.attributes.max_humidity ?? 80)}
                                value={humidifierHumidityValue}
                                oninput={(event) => (humidifierHumidityValue = inputNumber(event))}
                                onchange={() => setHumidifierHumidity(humidifierHumidityValue)}
                            />
                            <strong>{humidifierHumidityValue}%</strong>
                        </label>
                    {/if}

                    {#if domain === "cover"}
                        <div class="entity-detail__button-row">
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setCover("open_cover")}>
                                {themeStore.t("entityDetail.openCover")}
                            </button>
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setCover("stop_cover")}>
                                {themeStore.t("entityDetail.stopCover")}
                            </button>
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setCover("close_cover")}>
                                {themeStore.t("entityDetail.closeCover")}
                            </button>
                        </div>
                    {/if}

                    {#if domain === "lock"}
                        <div class="entity-detail__button-row">
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setLock("lock")}>
                                {themeStore.t("entityDetail.lock")}
                            </button>
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setLock("unlock")}>
                                {themeStore.t("entityDetail.unlock")}
                            </button>
                        </div>
                    {/if}

                    {#if domain === "alarm_control_panel"}
                        <div class="entity-detail__button-row">
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setAlarm("alarm_arm_home")}>
                                {themeStore.t("entityDetail.armHome")}
                            </button>
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setAlarm("alarm_arm_away")}>
                                {themeStore.t("entityDetail.armAway")}
                            </button>
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setAlarm("alarm_disarm")}>
                                {themeStore.t("entityDetail.disarm")}
                            </button>
                        </div>
                    {/if}

                    {#if domain === "vacuum"}
                        <div class="entity-detail__button-row">
                            {#if selectedVacuumCapabilities.canStart}
                                <button type="button" class="entity-detail__secondary-action" onclick={() => setVacuum("start")}>
                                    {themeStore.t("entityDetail.start")}
                                </button>
                            {/if}
                            {#if selectedVacuumCapabilities.canPause}
                                <button type="button" class="entity-detail__secondary-action" onclick={() => setVacuum("pause")}>
                                    {themeStore.t("entityDetail.pause")}
                                </button>
                            {/if}
                            {#if selectedVacuumCapabilities.canReturnHome}
                                <button type="button" class="entity-detail__secondary-action" onclick={() => setVacuum("return_to_base")}>
                                    {themeStore.t("entityDetail.returnToBase")}
                                </button>
                            {/if}
                            {#if selectedVacuumCapabilities.canStop}
                                <button type="button" class="entity-detail__secondary-action" onclick={() => setVacuum("stop")}>
                                    {themeStore.t("entityDetail.stop")}
                                </button>
                            {/if}
                            {#if selectedVacuumCapabilities.canLocate}
                                <button type="button" class="entity-detail__secondary-action" onclick={locateVacuum}>
                                    {themeStore.t("entityDetail.locate")}
                                </button>
                            {/if}
                            {#if selectedVacuumCapabilities.canCleanSpot}
                                <button type="button" class="entity-detail__secondary-action" onclick={cleanVacuumSpot}>
                                    {themeStore.t("entityDetail.cleanSpot")}
                                </button>
                            {/if}
                        </div>

                        {#if selectedVacuumCapabilities.canSetFanSpeed && selectedVacuumCapabilities.fanSpeeds.length > 0}
                            <label class="entity-detail__select">
                                <span>{themeStore.t("entityDetail.fanSpeed")}</span>
                                <select
                                    value={selectedVacuumCapabilities.currentFanSpeed ?? ""}
                                    onchange={(event) => setVacuumFanSpeed(inputValue(event))}
                                >
                                    {#each selectedVacuumCapabilities.fanSpeeds as fanSpeed}
                                        <option value={fanSpeed}>{fanSpeed}</option>
                                    {/each}
                                </select>
                            </label>
                        {/if}

                        {#if selectedVacuumCapabilities.canCleanArea && cleanAreaOptions.length > 0}
                            <div class="entity-detail__area-clean">
                                <div>
                                    <h5>{themeStore.t("entityDetail.cleanArea")}</h5>
                                    <p>{themeStore.t("entityDetail.cleanAreaDescription")}</p>
                                </div>
                                <div class="entity-detail__area-grid">
                                    {#each cleanAreaOptions as area (area.area_id)}
                                        <button type="button" class="entity-detail__secondary-action" onclick={() => cleanVacuumArea(area.area_id)}>
                                            {area.name}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    {/if}

                    {#if domain === "update"}
                        <div class="entity-detail__button-row">
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setUpdate("install")}>
                                {themeStore.t("entityDetail.install")}
                            </button>
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setUpdate("skip")}>
                                {themeStore.t("entityDetail.skip")}
                            </button>
                            <button type="button" class="entity-detail__secondary-action" onclick={() => setUpdate("clear_skipped")}>
                                {themeStore.t("entityDetail.clearSkipped")}
                            </button>
                        </div>
                    {/if}

                    {#if domain === "climate"}
                        <div class="entity-detail__climate">
                            <button type="button" class="entity-detail__stepper" onclick={() => adjustTemperature(-1)} aria-label={themeStore.t("entityDetail.decreaseTemperature")}>
                                -
                            </button>
                            <div>
                                <span>{themeStore.t("entityDetail.targetTemperature")}</span>
                                <strong>{Number.isFinite(climateTarget) ? climateTarget.toFixed(1) : "--"}</strong>
                            </div>
                            <button type="button" class="entity-detail__stepper" onclick={() => adjustTemperature(1)} aria-label={themeStore.t("entityDetail.increaseTemperature")}>
                                +
                            </button>
                        </div>
                        {#if hvacModes.length > 0}
                            <div class="entity-detail__chips">
                                {#each hvacModes as mode}
                                    <button
                                        type="button"
                                        class:entity-detail__chip--selected={selectedEntity.state === mode ||
                                            selectedEntity.attributes.hvac_mode === mode}
                                        class="entity-detail__chip"
                                        onclick={() => setHvacMode(mode)}
                                    >
                                        {formatEntityStateLabel(mode, { language: themeStore.language })}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    {/if}

                    {#if domain === "media_player"}
                        <div class="entity-detail__media">
                            <MediaControls entityId={selectedEntityId} />
                            <MediaVolume entityId={selectedEntityId} />
                        </div>
                    {/if}
                </section>
            {/if}

            {#if compactAttributeRows.length > 0}
                <section class="entity-detail__attributes">
                    <h4>{themeStore.t("entityDetail.attributes")}</h4>
                    <dl>
                        {#each compactAttributeRows as attribute}
                            <div>
                                <dt>{attribute.key.replaceAll("_", " ")}</dt>
                                <dd>{attribute.value}</dd>
                            </div>
                        {/each}
                    </dl>
                </section>
            {/if}
        {:else}
            <div class="entity-detail__missing">
                <DynamicIcon name="sensors_off" class="size-10" />
                <p>{themeStore.t("entityDetail.missing")}</p>
            </div>
        {/if}
    </div>
</SideSheet>

<style>
    .entity-detail {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        color: var(--color-m3-on-surface);
    }

    .entity-detail__list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
        gap: 0.5rem;
    }

    .entity-detail__row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.75rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container);
        padding: 0.75rem;
        text-align: left;
        color: var(--color-m3-on-surface);
        transition:
            background-color 150ms ease,
            color 150ms ease;
    }

    .entity-detail__row--selected {
        background: var(--color-m3-primary-container);
        color: var(--color-m3-on-primary-container);
    }

    .entity-detail__row-body {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 0.125rem;
    }

    .entity-detail__row-name,
    .entity-detail__row-state {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .entity-detail__row-name {
        font-size: 0.9375rem;
        font-weight: 700;
    }

    .entity-detail__row-state {
        color: var(--color-m3-on-surface-variant);
        font-size: 0.8125rem;
    }

    .entity-detail__hero {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 1rem;
        border-radius: var(--radius-m3-lg);
        background: var(--color-m3-surface-container);
        padding: 1rem;
    }

    .entity-detail__hero-icon {
        display: flex;
        width: 4rem;
        height: 4rem;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--color-m3-secondary-container);
        color: var(--color-m3-on-secondary-container);
    }

    .entity-detail__eyebrow,
    .entity-detail__changed {
        overflow: hidden;
        color: var(--color-m3-on-surface-variant);
        font-size: 0.8125rem;
        line-height: 1.25;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .entity-detail__name {
        overflow: hidden;
        color: var(--color-m3-on-surface);
        font-size: 1.25rem;
        font-weight: 800;
        line-height: 1.1;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .entity-detail__state {
        margin-top: 0.25rem;
        color: var(--color-m3-on-surface);
        font-size: 1rem;
        font-weight: 700;
    }

    .entity-detail__controls,
    .entity-detail__attributes {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .entity-detail__controls h4,
    .entity-detail__attributes h4 {
        color: var(--color-m3-on-surface-variant);
        font-size: 0.8125rem;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
    }

    .entity-detail__button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .entity-detail__primary-action,
    .entity-detail__secondary-action,
    .entity-detail__stepper,
    .entity-detail__chip {
        min-height: var(--touch-target-compact);
        border-radius: 999px;
        font-weight: 700;
        transition:
            transform 150ms ease,
            filter 150ms ease;
    }

    .entity-detail__primary-action:active,
    .entity-detail__secondary-action:active,
    .entity-detail__stepper:active,
    .entity-detail__chip:active {
        transform: scale(0.98);
    }

    .entity-detail__primary-action {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--color-m3-primary);
        padding: 0 1rem;
        color: var(--color-m3-on-primary);
    }

    .entity-detail__secondary-action,
    .entity-detail__chip {
        background: var(--color-m3-surface-container-high);
        padding: 0 1rem;
        color: var(--color-m3-on-surface);
    }

    .entity-detail__slider {
        display: grid;
        grid-template-columns: minmax(5rem, auto) 1fr 3rem;
        align-items: center;
        gap: 0.75rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container);
        padding: 0.75rem;
        color: var(--color-m3-on-surface);
        font-weight: 700;
    }

    .entity-detail__slider input {
        width: 100%;
    }

    .entity-detail__slider strong {
        text-align: right;
    }

    .entity-detail__select,
    .entity-detail__area-clean {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container);
        padding: 0.75rem;
        color: var(--color-m3-on-surface);
        font-weight: 700;
    }

    .entity-detail__select select {
        min-height: var(--touch-target-compact);
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container-high);
        padding: 0 0.75rem;
        color: var(--color-m3-on-surface);
        outline: none;
    }

    .entity-detail__area-clean h5 {
        font-size: 0.9375rem;
        font-weight: 800;
    }

    .entity-detail__area-clean p {
        color: var(--color-m3-on-surface-variant);
        font-size: 0.8125rem;
        font-weight: 600;
    }

    .entity-detail__area-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .entity-detail__climate {
        display: grid;
        grid-template-columns: var(--touch-target) 1fr var(--touch-target);
        align-items: center;
        gap: 0.75rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container);
        padding: 0.75rem;
        color: var(--color-m3-on-surface);
        text-align: center;
    }

    .entity-detail__climate span {
        display: block;
        color: var(--color-m3-on-surface-variant);
        font-size: 0.8125rem;
        font-weight: 700;
    }

    .entity-detail__climate strong {
        display: block;
        font-size: 1.5rem;
    }

    .entity-detail__stepper {
        background: var(--color-m3-primary-container);
        color: var(--color-m3-on-primary-container);
        font-size: 1.5rem;
    }

    .entity-detail__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .entity-detail__chip--selected {
        background: var(--color-m3-secondary-container);
        color: var(--color-m3-on-secondary-container);
    }

    .entity-detail__media {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container);
        padding: 1rem;
    }

    .entity-detail__attributes dl {
        display: grid;
        gap: 0.5rem;
    }

    .entity-detail__attributes div {
        display: grid;
        grid-template-columns: minmax(7rem, 0.8fr) 1fr;
        gap: 0.75rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container);
        padding: 0.75rem;
    }

    .entity-detail__attributes dt {
        color: var(--color-m3-on-surface-variant);
        font-size: 0.8125rem;
        font-weight: 700;
        text-transform: capitalize;
    }

    .entity-detail__attributes dd {
        min-width: 0;
        overflow-wrap: anywhere;
        color: var(--color-m3-on-surface);
        font-weight: 700;
        text-align: right;
    }

    .entity-detail__missing {
        display: flex;
        min-height: 12rem;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        color: var(--color-m3-on-surface-variant);
        text-align: center;
    }

    @media (max-width: 560px) {
        .entity-detail__slider,
        .entity-detail__attributes div {
            grid-template-columns: 1fr;
            text-align: left;
        }

        .entity-detail__slider strong,
        .entity-detail__attributes dd {
            text-align: left;
        }
    }
</style>
