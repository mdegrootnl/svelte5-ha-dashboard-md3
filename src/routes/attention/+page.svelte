<script lang="ts">
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import { buildAttentionSummary, type AttentionCategory, type AttentionItem } from "$lib/features/attention/attention";
    import { haStore } from "$lib/stores/ha.svelte";
    import { haRegistryStore } from "$lib/stores/haRegistry.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { formatEntityStateLabel } from "$lib/utils/entity";
    import { withBase } from "$lib/utils/appBase";

    import NotificationsActive from "~icons/material-symbols/notifications-active";
    import SettingsIcon from "~icons/material-symbols/settings";
    import Refresh from "~icons/material-symbols/refresh";

    const summary = $derived.by(() => {
        haStore.statesVersion;
        haStore.overridesVersion;
        haRegistryStore.version;

        return buildAttentionSummary({
            states: haStore.effectiveStates,
            entityRegistry: haRegistryStore.entityRegistry,
            deviceRegistry: haRegistryStore.deviceRegistry,
            areas: haRegistryStore.areas,
        });
    });

    function sectionTitle(category: AttentionCategory) {
        return themeStore.t(`attention.section.${category}`);
    }

    function sectionDescription(category: AttentionCategory) {
        return themeStore.t(`attention.section.${category}.description`);
    }

    function reasonLabel(item: AttentionItem) {
        return themeStore.t(`attention.reason.${item.reason}`);
    }

    function formatState(item: AttentionItem) {
        return formatEntityStateLabel(item.state, {
            entityId: item.entityId,
            domain: item.domain,
            deviceClass: item.deviceClass,
            unit: item.unit,
            language: themeStore.language,
        });
    }

    function formatLastChanged(item: AttentionItem) {
        if (!item.lastChanged) return "";
        const date = new Date(item.lastChanged);
        if (!Number.isFinite(date.getTime())) return "";

        return new Intl.DateTimeFormat(undefined, {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }

    function areaHref(item: AttentionItem) {
        if (!item.areaId) return "";
        const area = haRegistryStore.areas.find((candidate) => candidate.area_id === item.areaId);
        return withBase(`/dashboard/${area?.floor_id || "unassigned"}/${item.areaId}`);
    }

    function severityClass(severity: AttentionItem["severity"]) {
        switch (severity) {
            case "critical":
                return "border-m3-error bg-m3-error-container text-m3-on-error-container";
            case "warning":
                return "border-m3-tertiary bg-m3-tertiary-container text-m3-on-tertiary-container";
            default:
                return "border-m3-outline-variant bg-m3-surface-container text-m3-on-surface";
        }
    }

    function sectionAccent(category: AttentionCategory) {
        switch (category) {
            case "security":
                return "var(--color-m3-error)";
            case "maintenance":
            case "updates":
                return "var(--color-m3-tertiary)";
            case "activity":
            case "media":
                return "var(--color-m3-secondary)";
            default:
                return "var(--color-m3-primary)";
        }
    }

    async function refreshRegistries() {
        await haRegistryStore.fetch(haStore.connection);
    }
</script>

<PageShell
    title={themeStore.t("attention.title")}
    description={themeStore.t("attention.description")}
    maxWidth="max-w-7xl"
>
    {#snippet icon()}
        <NotificationsActive class="size-8" />
    {/snippet}

    {#snippet actions()}
        <Button
            variant="outlined"
            onclick={refreshRegistries}
            disabled={!haStore.connection || haRegistryStore.loading}
            icon={Refresh}
        >
            {haRegistryStore.loading ? themeStore.t("common.loading") : themeStore.t("common.refresh")}
        </Button>
    {/snippet}

    {#if haStore.connectionState !== "connected"}
        <div class="flex min-h-[55vh] flex-col items-center justify-center gap-5 text-center">
            <div class="flex size-20 items-center justify-center rounded-full bg-m3-error-container text-m3-on-error-container">
                <SettingsIcon class="size-10" />
            </div>
            <div class="max-w-md">
                <h2 class="text-m3-headline-small text-m3-on-surface">
                    {themeStore.t("attention.notConnected")}
                </h2>
                <p class="mt-2 text-m3-body-large text-m3-on-surface-variant">
                    {themeStore.t("attention.notConnected.description")}
                </p>
            </div>
            <a
                href={withBase("/settings")}
                class="touch-target inline-flex items-center justify-center rounded-full bg-m3-primary px-6 text-m3-label-large font-medium text-m3-on-primary"
            >
                {themeStore.t("common.openSettings")}
            </a>
        </div>
    {:else}
        <section class="grid gap-3 sm:grid-cols-4">
            <div class="rounded-lg bg-m3-primary-container p-5 text-m3-on-primary-container">
                <div class="text-m3-display-small font-semibold">{summary.total}</div>
                <div class="text-m3-label-large">{themeStore.t("attention.metric.total")}</div>
            </div>
            <div class="rounded-lg bg-m3-error-container p-5 text-m3-on-error-container">
                <div class="text-m3-display-small font-semibold">{summary.critical}</div>
                <div class="text-m3-label-large">{themeStore.t("attention.metric.critical")}</div>
            </div>
            <div class="rounded-lg bg-m3-tertiary-container p-5 text-m3-on-tertiary-container">
                <div class="text-m3-display-small font-semibold">{summary.warning}</div>
                <div class="text-m3-label-large">{themeStore.t("attention.metric.warning")}</div>
            </div>
            <div class="rounded-lg bg-m3-surface-container p-5 text-m3-on-surface">
                <div class="text-m3-display-small font-semibold">{summary.info}</div>
                <div class="text-m3-label-large">{themeStore.t("attention.metric.info")}</div>
            </div>
        </section>

        {#if summary.total === 0}
            <section class="flex min-h-[45vh] flex-col items-center justify-center rounded-lg border border-m3-outline-variant bg-m3-surface-container p-8 text-center">
                <div class="mb-4 flex size-20 items-center justify-center rounded-full bg-m3-secondary-container text-m3-on-secondary-container">
                    <NotificationsActive class="size-10" />
                </div>
                <h2 class="text-m3-headline-small text-m3-on-surface">
                    {themeStore.t("attention.empty.title")}
                </h2>
                <p class="mt-2 max-w-xl text-m3-body-large text-m3-on-surface-variant">
                    {themeStore.t("attention.empty.description")}
                </p>
            </section>
        {:else}
            <div class="grid gap-6">
                {#each summary.sections as section (section.category)}
                    <section class="grid gap-3">
                        <header class="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h2 class="text-m3-title-large font-semibold text-m3-on-surface">
                                    {sectionTitle(section.category)}
                                </h2>
                                <p class="text-m3-body-medium text-m3-on-surface-variant">
                                    {sectionDescription(section.category)}
                                </p>
                            </div>
                            <div
                                class="rounded-full px-3 py-1 text-m3-label-large font-semibold"
                                style:background-color={`color-mix(in srgb, ${sectionAccent(section.category)} 16%, transparent)`}
                                style:color={sectionAccent(section.category)}
                            >
                                {themeStore.t("attention.itemCount", { count: section.items.length })}
                            </div>
                        </header>

                        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {#each section.items as item (item.id)}
                                {@const stateLabel = formatState(item)}
                                {@const changed = formatLastChanged(item)}
                                {@const href = areaHref(item)}
                                <article
                                    class="grid min-h-32 gap-4 rounded-lg border p-4 shadow-sm {severityClass(item.severity)}"
                                >
                                    <div class="flex items-start gap-3">
                                        <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-m3-surface/45">
                                            <DynamicIcon name={item.icon} class="size-6" />
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <h3 class="truncate text-m3-title-medium font-semibold">
                                                {item.title}
                                            </h3>
                                            <p class="mt-1 line-clamp-2 text-m3-body-medium opacity-80">
                                                {item.subtitle || item.entityId}
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex flex-wrap items-center gap-2">
                                        {#if stateLabel}
                                            <span class="rounded-full bg-m3-surface/55 px-3 py-1 text-m3-label-large font-semibold">
                                                {stateLabel}
                                            </span>
                                        {/if}
                                        <span class="rounded-full bg-m3-surface/55 px-3 py-1 text-m3-label-large font-semibold">
                                            {reasonLabel(item)}
                                        </span>
                                        {#if changed}
                                            <span class="rounded-full bg-m3-surface/35 px-3 py-1 text-m3-label-medium">
                                                {changed}
                                            </span>
                                        {/if}
                                        {#if item.areaName}
                                            <span class="rounded-full bg-m3-surface/35 px-3 py-1 text-m3-label-medium">
                                                {item.areaName}
                                            </span>
                                        {/if}
                                    </div>

                                    {#if href}
                                        <div class="flex justify-end">
                                            <a
                                                href={href}
                                                class="touch-target inline-flex items-center justify-center rounded-full bg-m3-surface/55 px-4 text-m3-label-large font-semibold"
                                            >
                                                {themeStore.t("attention.openRoom")}
                                            </a>
                                        </div>
                                    {/if}
                                </article>
                            {/each}
                        </div>
                    </section>
                {/each}
            </div>
        {/if}
    {/if}
</PageShell>
