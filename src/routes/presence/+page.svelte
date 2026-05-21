<script lang="ts">
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import { buildPresenceSummary, type PresencePerson, type PresenceStatus } from "$lib/features/presence/presence";
    import { haStore } from "$lib/stores/ha.svelte";
    import { haRegistryStore } from "$lib/stores/haRegistry.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { withBase } from "$lib/utils/appBase";

    import Refresh from "~icons/material-symbols/refresh";
    import SettingsIcon from "~icons/material-symbols/settings";

    const summary = $derived.by(() => {
        haStore.statesVersion;
        haStore.overridesVersion;
        haRegistryStore.version;

        return buildPresenceSummary({
            states: haStore.effectiveStates,
            entityRegistry: haRegistryStore.entityRegistry,
            deviceRegistry: haRegistryStore.deviceRegistry,
        });
    });

    function statusLabel(person: PresencePerson) {
        if (person.status === "zone") return person.zoneName ?? person.state;
        return themeStore.t(`presence.status.${person.status}`);
    }

    function statusClass(status: PresenceStatus) {
        switch (status) {
            case "home":
                return "bg-m3-primary-container text-m3-on-primary-container";
            case "zone":
                return "bg-m3-secondary-container text-m3-on-secondary-container";
            case "away":
                return "bg-m3-surface-container-high text-m3-on-surface-variant";
            default:
                return "bg-m3-error-container text-m3-on-error-container";
        }
    }

    function heroTitle() {
        if (!summary.hasTrackedPeople) return themeStore.t("presence.empty.title");
        if (summary.homeIsEmpty) return themeStore.t("presence.homeEmpty.title");
        return themeStore.t("presence.someoneHome.title", { count: summary.home });
    }

    function heroDescription() {
        if (!summary.hasTrackedPeople) return themeStore.t("presence.empty.description");
        if (summary.homeIsEmpty) return themeStore.t("presence.homeEmpty.description");
        return themeStore.t("presence.someoneHome.description", {
            home: summary.home,
            away: summary.away,
            zones: summary.inZones,
        });
    }

    function formatLastChanged(person: PresencePerson) {
        if (!person.lastChanged) return "";
        const date = new Date(person.lastChanged);
        if (!Number.isFinite(date.getTime())) return "";

        return new Intl.DateTimeFormat(undefined, {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }

    function pictureUrl(person: PresencePerson) {
        const picture = person.picture?.trim();
        if (!picture) return "";
        if (/^(https?:|data:|blob:)/i.test(picture)) return picture;
        if (picture.startsWith("/") && haStore.url) {
            return `${haStore.url.replace(/\/$/, "")}${picture}`;
        }
        return "";
    }

    async function refreshRegistries() {
        await haRegistryStore.fetch(haStore.connection);
    }
</script>

<PageShell
    title={themeStore.t("presence.title")}
    description={themeStore.t("presence.description")}
    maxWidth="max-w-7xl"
>
    {#snippet icon()}
        <DynamicIcon name="group" class="size-8" />
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
        <section class="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <article class="rounded-lg border border-m3-outline-variant bg-m3-surface-container p-6 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div class="min-w-0">
                        <p class="text-m3-label-large text-m3-on-surface-variant">
                            {themeStore.t("presence.context")}
                        </p>
                        <h2 class="mt-2 text-m3-headline-medium font-semibold text-m3-on-surface">
                            {heroTitle()}
                        </h2>
                        <p class="mt-2 max-w-2xl text-m3-body-large text-m3-on-surface-variant">
                            {heroDescription()}
                        </p>
                    </div>
                    <div
                        class="flex size-16 shrink-0 items-center justify-center rounded-full {summary.homeIsEmpty ? 'bg-m3-tertiary-container text-m3-on-tertiary-container' : 'bg-m3-primary-container text-m3-on-primary-container'}"
                    >
                        <DynamicIcon name={summary.homeIsEmpty ? "home_off" : "home"} class="size-8" />
                    </div>
                </div>

                <div class="mt-6 grid gap-3 sm:grid-cols-4">
                    <div class="rounded-lg bg-m3-primary-container p-4 text-m3-on-primary-container">
                        <div class="text-m3-display-small font-semibold">{summary.home}</div>
                        <div class="text-m3-label-large">{themeStore.t("presence.metric.home")}</div>
                    </div>
                    <div class="rounded-lg bg-m3-secondary-container p-4 text-m3-on-secondary-container">
                        <div class="text-m3-display-small font-semibold">{summary.inZones}</div>
                        <div class="text-m3-label-large">{themeStore.t("presence.metric.zones")}</div>
                    </div>
                    <div class="rounded-lg bg-m3-surface-container-high p-4 text-m3-on-surface">
                        <div class="text-m3-display-small font-semibold">{summary.away}</div>
                        <div class="text-m3-label-large">{themeStore.t("presence.metric.away")}</div>
                    </div>
                    <div class="rounded-lg bg-m3-tertiary-container p-4 text-m3-on-tertiary-container">
                        <div class="text-m3-display-small font-semibold">{summary.total}</div>
                        <div class="text-m3-label-large">{themeStore.t("presence.metric.total")}</div>
                    </div>
                </div>
            </article>

            <aside class="grid content-start gap-4">
                <article class="rounded-lg border border-m3-outline-variant bg-m3-surface-container p-5 shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="flex size-11 items-center justify-center rounded-full bg-m3-secondary-container text-m3-on-secondary-container">
                            <DynamicIcon name="diversity_3" class="size-6" />
                        </div>
                        <div>
                            <h3 class="text-m3-title-medium font-semibold text-m3-on-surface">
                                {themeStore.t("presence.guestMode")}
                            </h3>
                            <p class="text-m3-body-medium text-m3-on-surface-variant">
                                {#if summary.guestMode}
                                    {summary.guestMode.enabled
                                        ? themeStore.t("presence.guestMode.enabled")
                                        : themeStore.t("presence.guestMode.disabled")}
                                {:else}
                                    {themeStore.t("presence.guestMode.missing")}
                                {/if}
                            </p>
                        </div>
                    </div>
                </article>

                {#if summary.etaItems.length}
                    <article class="rounded-lg border border-m3-outline-variant bg-m3-surface-container p-5 shadow-sm">
                        <h3 class="text-m3-title-medium font-semibold text-m3-on-surface">
                            {themeStore.t("presence.eta.title")}
                        </h3>
                        <div class="mt-3 grid gap-2">
                            {#each summary.etaItems as item (item.id)}
                                <div class="flex items-center justify-between gap-3 rounded-lg bg-m3-surface-container-high px-3 py-2">
                                    <span class="min-w-0 truncate text-m3-body-medium text-m3-on-surface">
                                        {item.title}
                                    </span>
                                    <span class="shrink-0 text-m3-label-large font-semibold text-m3-primary">
                                        {item.value}
                                    </span>
                                </div>
                            {/each}
                        </div>
                    </article>
                {/if}
            </aside>
        </section>

        <section class="grid gap-3">
            <header>
                <h2 class="text-m3-title-large font-semibold text-m3-on-surface">
                    {themeStore.t("presence.people.title")}
                </h2>
                <p class="text-m3-body-medium text-m3-on-surface-variant">
                    {themeStore.t("presence.people.description")}
                </p>
            </header>

            {#if summary.people.length === 0}
                <div class="rounded-lg border border-m3-outline-variant bg-m3-surface-container p-6 text-m3-on-surface-variant">
                    {themeStore.t("presence.people.empty")}
                </div>
            {:else}
                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {#each summary.people as person (person.id)}
                        {@const changed = formatLastChanged(person)}
                        {@const avatar = pictureUrl(person)}
                        <article class="rounded-lg border border-m3-outline-variant bg-m3-surface-container p-4 shadow-sm">
                            <div class="flex items-start gap-3">
                                <div class="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-m3-primary-container text-m3-on-primary-container">
                                    <DynamicIcon name="person" class="size-8" />
                                    {#if avatar}
                                        <img
                                            src={avatar}
                                            alt=""
                                            class="absolute inset-0 size-full object-cover"
                                            loading="lazy"
                                            onerror={(event) => ((event.currentTarget as HTMLImageElement).hidden = true)}
                                        />
                                    {/if}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <h3 class="truncate text-m3-title-medium font-semibold text-m3-on-surface">
                                        {person.name}
                                    </h3>
                                    <p class="truncate text-m3-body-medium text-m3-on-surface-variant">
                                        {person.entityId}
                                    </p>
                                </div>
                            </div>

                            <div class="mt-4 flex flex-wrap items-center gap-2">
                                <span class="rounded-full px-3 py-1 text-m3-label-large font-semibold {statusClass(person.status)}">
                                    {statusLabel(person)}
                                </span>
                                <span class="rounded-full bg-m3-surface-container-high px-3 py-1 text-m3-label-medium text-m3-on-surface-variant">
                                    {person.sourceDomain === "person"
                                        ? themeStore.t("presence.source.person")
                                        : themeStore.t("presence.source.tracker")}
                                </span>
                                {#if changed}
                                    <span class="rounded-full bg-m3-surface-container-high px-3 py-1 text-m3-label-medium text-m3-on-surface-variant">
                                        {changed}
                                    </span>
                                {/if}
                            </div>
                        </article>
                    {/each}
                </div>
            {/if}
        </section>

        {#if summary.zones.length}
            <section class="grid gap-3">
                <header>
                    <h2 class="text-m3-title-large font-semibold text-m3-on-surface">
                        {themeStore.t("presence.zones.title")}
                    </h2>
                    <p class="text-m3-body-medium text-m3-on-surface-variant">
                        {themeStore.t("presence.zones.description")}
                    </p>
                </header>

                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {#each summary.zones as zone (zone.id)}
                        <article class="rounded-lg border border-m3-outline-variant bg-m3-surface-container p-4 shadow-sm">
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex min-w-0 items-center gap-3">
                                    <div class="flex size-11 shrink-0 items-center justify-center rounded-full bg-m3-secondary-container text-m3-on-secondary-container">
                                        <DynamicIcon name={zone.id === "home" ? "home" : "location_on"} class="size-6" />
                                    </div>
                                    <div class="min-w-0">
                                        <h3 class="truncate text-m3-title-medium font-semibold text-m3-on-surface">
                                            {zone.name}
                                        </h3>
                                        <p class="text-m3-body-medium text-m3-on-surface-variant">
                                            {themeStore.t("presence.zoneOccupants", { count: zone.occupants.length })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-3 flex flex-wrap gap-2">
                                {#each zone.occupants as person (person.id)}
                                    <span class="rounded-full bg-m3-surface-container-high px-3 py-1 text-m3-label-medium text-m3-on-surface">
                                        {person.name}
                                    </span>
                                {/each}
                            </div>
                        </article>
                    {/each}
                </div>
            </section>
        {/if}
    {/if}
</PageShell>
