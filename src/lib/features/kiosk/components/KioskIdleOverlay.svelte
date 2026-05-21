<script lang="ts">
    import { onDestroy, onMount, untrack } from "svelte";
    import { fade } from "svelte/transition";
    import { getLanguageLocale } from "$lib/i18n";
    import { kioskStore } from "$lib/features/kiosk/stores/kiosk.svelte";
    import { lockScreenStore } from "$lib/features/lockscreen/stores/lockscreen.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { getEntityName } from "$lib/utils/entity";

    let now = $state(new Date());
    let mounted = $state(false);
    let mountTimer: ReturnType<typeof setTimeout> | null = null;

    let isActive = $derived(
        mounted &&
            kioskStore.enabled &&
            kioskStore.showScreensaver &&
            kioskStore.isIdle &&
            !lockScreenStore.isLocked,
    );

    let locale = $derived(getLanguageLocale(themeStore.language));
    let timeFormatter = $derived(
        new Intl.DateTimeFormat(locale, {
            hour: "numeric",
            minute: "2-digit",
            hour12: false,
        }),
    );
    let dateFormatter = $derived(
        new Intl.DateTimeFormat(locale, {
            weekday: "long",
            month: "long",
            day: "numeric",
        }),
    );
    let orbitIndex = $derived(Math.floor(now.getMinutes() / 2) % 4);
    let currentWeather = $derived(weatherStore.data?.current);
    let activeMedia = $derived.by(() => {
        haStore.statesVersion;
        haStore.overridesVersion;

        const mediaPlayers = Object.entries(haStore.effectiveStates)
            .filter(([entityId]) => entityId.startsWith("media_player."))
            .map(([entityId, entity]) => ({ entityId, entity }))
            .filter(({ entity }) => ["playing", "paused"].includes(entity.state));

        const playing =
            mediaPlayers.find(({ entity }) => entity.state === "playing") ??
            mediaPlayers[0];

        if (!playing) return null;

        const attributes = playing.entity.attributes;
        const title =
            stringAttribute(attributes.media_title) ||
            stringAttribute(attributes.app_name) ||
            getEntityName(playing.entityId, attributes);
        const subtitle =
            stringAttribute(attributes.media_artist) ||
            stringAttribute(attributes.media_album_name) ||
            stringAttribute(attributes.source) ||
            getEntityName(playing.entityId, attributes);

        return {
            title,
            subtitle,
            state: playing.entity.state,
        };
    });

    function stringAttribute(value: unknown) {
        return typeof value === "string" ? value.trim() : "";
    }

    function updateTime() {
        now = new Date();
    }

    function fetchWeatherIfNeeded() {
        if (haStore.connectionState !== "connected") return;
        void weatherStore.fetch();
    }

    onMount(() => {
        mountTimer = setTimeout(() => {
            mounted = true;
        }, 300);
        updateTime();
    });

    onDestroy(() => {
        if (mountTimer) clearTimeout(mountTimer);
    });

    $effect(() => {
        if (!isActive) return;

        updateTime();
        untrack(fetchWeatherIfNeeded);

        const timer = setInterval(updateTime, 1000);
        const dataTimer = setInterval(() => {
            untrack(fetchWeatherIfNeeded);
        }, 15 * 60 * 1000);

        return () => {
            clearInterval(timer);
            clearInterval(dataTimer);
        };
    });
</script>

{#if isActive}
    <div
        class="kiosk-idle-overlay"
        aria-hidden="true"
        transition:fade={{ duration: 450 }}
    >
        <div class="kiosk-idle-overlay__glow"></div>
        <div class="kiosk-idle-overlay__panel kiosk-idle-overlay__panel--{orbitIndex}">
            <div>
                <div class="kiosk-idle-overlay__time">
                    {timeFormatter.format(now)}
                </div>
                <div class="kiosk-idle-overlay__date">
                    {dateFormatter.format(now)}
                </div>
            </div>

            <div class="kiosk-idle-overlay__context">
                {#if currentWeather}
                    <div class="kiosk-idle-overlay__pill">
                        {Math.round(currentWeather.temperature_2m)}&deg;
                    </div>
                {/if}

                {#if activeMedia}
                    <div class="kiosk-idle-overlay__media">
                        <span>{activeMedia.title}</span>
                        <small>{activeMedia.subtitle}</small>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .kiosk-idle-overlay {
        pointer-events: none;
        position: fixed;
        inset: 0;
        z-index: 80;
        overflow: hidden;
        background:
            radial-gradient(
                circle at 50% 50%,
                color-mix(in srgb, var(--color-m3-primary) 9%, transparent),
                transparent 44%
            ),
            color-mix(in srgb, var(--color-m3-scrim) 62%, transparent);
        color: var(--color-m3-inverse-on-surface);
        backdrop-filter: blur(8px) saturate(0.86);
        -webkit-backdrop-filter: blur(8px) saturate(0.86);
    }

    .kiosk-idle-overlay__glow {
        position: absolute;
        inset: 16%;
        border-radius: 999px;
        background:
            radial-gradient(
                circle,
                color-mix(in srgb, var(--color-m3-primary) 20%, transparent),
                transparent 64%
            );
        opacity: 0.45;
        filter: blur(48px);
    }

    .kiosk-idle-overlay__panel {
        position: absolute;
        display: flex;
        max-width: min(34rem, calc(100vw - 3rem));
        flex-direction: column;
        gap: 1.25rem;
        border-radius: var(--radius-m3-xl);
        background: rgb(0 0 0 / 18%);
        padding: clamp(1.5rem, 4vw, 2.5rem);
        text-shadow:
            0 2px 8px rgb(0 0 0 / 58%),
            0 14px 34px rgb(0 0 0 / 32%);
        transition:
            inset 900ms ease,
            transform 900ms ease;
    }

    .kiosk-idle-overlay__panel--0 {
        inset: 10% auto auto 8%;
    }

    .kiosk-idle-overlay__panel--1 {
        inset: 12% 8% auto auto;
    }

    .kiosk-idle-overlay__panel--2 {
        inset: auto 9% 12% auto;
    }

    .kiosk-idle-overlay__panel--3 {
        inset: auto auto 14% 8%;
    }

    .kiosk-idle-overlay__time {
        font-size: clamp(4rem, 12vw, 8.5rem);
        font-weight: 300;
        line-height: 0.9;
        letter-spacing: 0;
    }

    .kiosk-idle-overlay__date {
        margin-top: 0.75rem;
        font-size: clamp(1.1rem, 3vw, 1.8rem);
        font-weight: 600;
        opacity: 0.88;
        text-transform: capitalize;
    }

    .kiosk-idle-overlay__context {
        display: flex;
        min-width: 0;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
    }

    .kiosk-idle-overlay__pill,
    .kiosk-idle-overlay__media {
        border-radius: 999px;
        background: rgb(255 255 255 / 12%);
        color: rgb(255 255 255 / 92%);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    }

    .kiosk-idle-overlay__pill {
        padding: 0.55rem 0.9rem;
        font-size: clamp(1.1rem, 3vw, 1.45rem);
        font-weight: 800;
    }

    .kiosk-idle-overlay__media {
        display: flex;
        min-width: 0;
        max-width: min(24rem, 100%);
        flex-direction: column;
        padding: 0.65rem 1rem;
    }

    .kiosk-idle-overlay__media span,
    .kiosk-idle-overlay__media small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .kiosk-idle-overlay__media span {
        font-weight: 800;
    }

    .kiosk-idle-overlay__media small {
        color: rgb(255 255 255 / 72%);
        font-size: 0.8rem;
        font-weight: 700;
    }

    @media (max-width: 640px) {
        .kiosk-idle-overlay__panel {
            inset: auto 1rem 6rem 1rem;
            max-width: none;
        }
    }
</style>
