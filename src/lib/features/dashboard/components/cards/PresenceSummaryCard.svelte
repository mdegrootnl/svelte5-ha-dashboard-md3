<script lang="ts">
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import { buildPresenceSummary, type PresencePerson, type PresenceStatus } from "$lib/features/presence/presence";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import {
        getCardSurfaceClasses,
        getCardSurfaceStyle,
    } from "$lib/features/dashboard/utils/cardSurface";
    import { haRegistryStore } from "$lib/stores/haRegistry.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import type { PresenceCardOptions } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import { withBase } from "$lib/utils/appBase";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: PresenceCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("group"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ source: "auto", maxPeople: 4, showGuestMode: true, showEta: true }),
        ondelete,
        class: className = "",
    }: Props = $props();

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

    const maxPeople = $derived(Math.max(1, options?.maxPeople ?? 4));
    const visiblePeople = $derived(summary.people.slice(0, maxPeople));
    const extraPeople = $derived(Math.max(0, summary.people.length - visiblePeople.length));
    const title = $derived(name || themeStore.t("presence.title"));
    const heroText = $derived(
        !summary.hasTrackedPeople
            ? themeStore.t("presence.empty.title")
            : summary.homeIsEmpty
                ? themeStore.t("presence.homeEmpty.title")
                : themeStore.t("presence.someoneHome.title", { count: summary.home }),
    );
    const heroIcon = $derived(summary.homeIsEmpty ? "home_off" : icon || "group");

    function statusLabel(person: PresencePerson) {
        if (person.status === "zone") return person.zoneName ?? person.state;
        return themeStore.t(`presence.status.${person.status}`);
    }

    function statusColor(status: PresenceStatus) {
        switch (status) {
            case "home":
                return "var(--color-m3-primary)";
            case "zone":
                return "var(--color-m3-secondary)";
            case "away":
                return "var(--color-m3-outline)";
            default:
                return "var(--color-m3-error)";
        }
    }

    function initials(name: string) {
        const parts = name
            .replace(/[_-]+/g, " ")
            .split(/\s+/)
            .filter(Boolean);
        return parts
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("") || "?";
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "presence",
            options: { presence: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "group";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { presence?: PresenceCardOptions })?.presence ?? options;
            },
            onDelete: ondelete,
        });
    }
</script>

<article
    data-testid="presence-card"
    class="relative flex h-full w-full flex-col overflow-hidden rounded-m3-card text-m3-on-surface group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
    aria-label={title}
>
    <div class="presence-card__shell flex h-full min-h-0 flex-col gap-[clamp(0.5rem,3cqmin,1rem)] p-[clamp(0.625rem,4cqmin,1.25rem)]">
        <header class="presence-card__header flex min-w-0 items-start gap-[clamp(0.5rem,3cqmin,1rem)] pr-[clamp(2.25rem,8cqi,3.25rem)]">
            <div
                class="presence-card__icon flex size-[clamp(2.75rem,20cqmin,4.75rem)] shrink-0 items-center justify-center rounded-m3-full"
                style:background-color={color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--color-m3-primary-container)"}
                style:color={color || "var(--color-m3-primary)"}
            >
                <DynamicIcon name={heroIcon} class="size-[58%]" />
            </div>
            <div class="min-w-0 flex-1">
                <h3 class="presence-card__title truncate text-[clamp(0.95rem,max(5.4cqb,1.8cqi),1.35rem)] font-bold leading-tight">
                    {title}
                </h3>
                <p class="presence-card__hero mt-1 line-clamp-2 text-[clamp(0.72rem,3.4cqmin,0.95rem)] text-m3-on-surface-variant">
                    {heroText}
                </p>
            </div>
        </header>

        <div class="presence-card__metrics grid grid-cols-3 gap-[clamp(0.25rem,2.4cqmin,0.75rem)]">
            <div class="presence-card__metric min-w-0 rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.6cqmin,0.75rem)] text-center">
                <span class="block text-[clamp(1rem,7cqmin,1.7rem)] font-bold leading-none">{summary.home}</span>
                <span class="block truncate text-[clamp(0.6rem,2.8cqmin,0.78rem)] text-m3-on-surface-variant">{themeStore.t("presence.metric.home")}</span>
            </div>
            <div class="presence-card__metric min-w-0 rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.6cqmin,0.75rem)] text-center">
                <span class="block text-[clamp(1rem,7cqmin,1.7rem)] font-bold leading-none">{summary.inZones}</span>
                <span class="block truncate text-[clamp(0.6rem,2.8cqmin,0.78rem)] text-m3-on-surface-variant">{themeStore.t("presence.metric.zones")}</span>
            </div>
            <div class="presence-card__metric min-w-0 rounded-m3-md bg-m3-surface-container-high p-[clamp(0.375rem,2.6cqmin,0.75rem)] text-center">
                <span class="block text-[clamp(1rem,7cqmin,1.7rem)] font-bold leading-none">{summary.away}</span>
                <span class="block truncate text-[clamp(0.6rem,2.8cqmin,0.78rem)] text-m3-on-surface-variant">{themeStore.t("presence.metric.away")}</span>
            </div>
        </div>

        {#if visiblePeople.length > 0}
            <div class="presence-card__people grid min-h-0 flex-1 content-start gap-[clamp(0.375rem,2.2cqmin,0.625rem)] overflow-hidden">
                {#each visiblePeople as person (person.id)}
                    <div class="flex min-w-0 items-center gap-[clamp(0.375rem,2cqmin,0.625rem)] rounded-m3-md bg-m3-surface-container-high px-[clamp(0.45rem,2.4cqmin,0.75rem)] py-[clamp(0.35rem,2cqmin,0.625rem)]">
                        <div
                            class="flex size-[clamp(1.75rem,9cqmin,2.35rem)] shrink-0 items-center justify-center rounded-m3-full text-[clamp(0.62rem,2.8cqmin,0.78rem)] font-bold"
                            style:background-color={`color-mix(in srgb, ${statusColor(person.status)} 18%, transparent)`}
                            style:color={statusColor(person.status)}
                        >
                            {initials(person.name)}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="truncate text-[clamp(0.72rem,3.2cqmin,0.92rem)] font-semibold">
                                {person.name}
                            </div>
                            <div class="truncate text-[clamp(0.6rem,2.7cqmin,0.76rem)] text-m3-on-surface-variant">
                                {statusLabel(person)}
                            </div>
                        </div>
                    </div>
                {/each}

                {#if extraPeople > 0}
                    <div class="rounded-m3-md bg-m3-surface-container-high px-3 py-2 text-center text-[clamp(0.65rem,2.8cqmin,0.82rem)] font-semibold text-m3-on-surface-variant">
                        +{extraPeople}
                    </div>
                {/if}
            </div>
        {:else}
            <div class="presence-card__people flex min-h-0 flex-1 items-center justify-center rounded-m3-md bg-m3-surface-container-high p-3 text-center text-[clamp(0.72rem,3cqmin,0.9rem)] text-m3-on-surface-variant">
                {themeStore.t("presence.people.empty")}
            </div>
        {/if}

        <footer class="presence-card__footer mt-auto flex flex-wrap items-center justify-between gap-2">
            {#if options?.showGuestMode !== false && summary.guestMode}
                <span class="rounded-full bg-m3-secondary-container px-3 py-1 text-[clamp(0.62rem,2.7cqmin,0.8rem)] font-semibold text-m3-on-secondary-container">
                    {summary.guestMode.enabled ? themeStore.t("presence.guestMode.enabled") : themeStore.t("presence.guestMode.disabled")}
                </span>
            {:else if options?.showEta !== false && summary.etaItems[0]}
                <span class="truncate rounded-full bg-m3-secondary-container px-3 py-1 text-[clamp(0.62rem,2.7cqmin,0.8rem)] font-semibold text-m3-on-secondary-container">
                    {summary.etaItems[0].value}
                </span>
            {/if}
            <a
                href={withBase("/presence")}
                class="touch-target ml-auto inline-flex items-center justify-center rounded-full bg-m3-primary px-3 text-[clamp(0.68rem,2.8cqmin,0.82rem)] font-semibold text-m3-on-primary"
            >
                {themeStore.t("presence.openPage")}
            </a>
        </footer>
    </div>

    <button
        class="touch-edit-control absolute right-[clamp(0.25rem,2cqmin,0.75rem)] top-[clamp(0.25rem,2cqmin,0.75rem)] z-30 rounded-full bg-m3-primary-container p-[clamp(0.25rem,1.7cqmin,0.5rem)] text-m3-on-primary-container opacity-0 shadow-sm transition-opacity hover:brightness-110 group-hover/card:opacity-100"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title={themeStore.t("presence.editTitle")}
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</article>

<style>
    @container (max-height: 130px) {
        .presence-card__shell {
            flex-direction: row;
            align-items: center;
            gap: clamp(0.5rem, 3cqi, 0.85rem);
            padding: clamp(0.5rem, 3cqmin, 0.85rem);
        }

        .presence-card__header {
            flex: 1 1 auto;
            align-items: center;
            padding-right: 0;
        }

        .presence-card__icon {
            width: clamp(2rem, 12cqmin, 2.65rem);
            height: clamp(2rem, 12cqmin, 2.65rem);
        }

        .presence-card__title {
            font-size: clamp(0.82rem, 4cqb, 1rem);
        }

        .presence-card__hero {
            margin-top: 0.1rem;
            line-clamp: 1;
            -webkit-line-clamp: 1;
            font-size: clamp(0.65rem, 3cqb, 0.78rem);
        }

        .presence-card__metrics {
            flex: 0 0 min(48%, 12rem);
            gap: 0.3rem;
        }

        .presence-card__metric {
            padding: 0.3rem 0.25rem;
        }

        .presence-card__metric span:first-child {
            font-size: clamp(0.9rem, 5cqb, 1.15rem);
        }

        .presence-card__metric span:last-child {
            font-size: clamp(0.55rem, 2.7cqb, 0.66rem);
        }

        .presence-card__people,
        .presence-card__footer {
            display: none !important;
        }
    }
</style>
