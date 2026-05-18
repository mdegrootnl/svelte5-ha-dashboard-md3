<script lang="ts">
    import type { Snippet } from "svelte";
    import type { DashboardBackgroundConfig } from "$lib/types/dashboard";
    import AuthenticatedImage from "$lib/components/common/AuthenticatedImage.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import IconInfo from "~icons/material-symbols/info";

    interface Props {
        background?: DashboardBackgroundConfig;
        children: Snippet;
        class?: string;
        variant?: "contained" | "viewport";
    }

    let {
        background,
        children,
        class: className = "",
        variant = "contained",
    }: Props = $props();

    const externalProviders = new Set(["unsplash", "pexels"]);

    let enabled = $derived(Boolean(background?.enabled && background.imageUrl));
    let isViewport = $derived(variant === "viewport");
    let objectPosition = $derived(background?.objectPosition ?? "center");
    let scrimOpacity = $derived(
        Math.max(0, Math.min(0.95, background?.scrimOpacity ?? 0.38)),
    );
    let accentColor = $derived(background?.accentColor || themeStore.sourceColor);
    let globalScrimPercent = $derived(Math.round(scrimOpacity * 34));
    let topScrimPercent = $derived(
        Math.round(Math.min(0.86, scrimOpacity + 0.12) * 100),
    );
    let topMidScrimPercent = $derived(Math.round(scrimOpacity * 38));
    let sideScrimPercent = $derived(
        Math.round(Math.min(0.78, scrimOpacity + 0.04) * 100),
    );
    let bottomScrimPercent = $derived(Math.round(scrimOpacity * 48));
    let accentTintPercent = $derived(Math.round(scrimOpacity * 10));
    let backgroundTreatment = $derived(`background:
        linear-gradient(180deg,
            color-mix(in srgb, var(--color-m3-scrim) ${topScrimPercent}%, transparent) 0%,
            color-mix(in srgb, var(--color-m3-scrim) ${topMidScrimPercent}%, transparent) 22%,
            transparent 48%,
            color-mix(in srgb, var(--color-m3-scrim) ${bottomScrimPercent}%, transparent) 100%
        ),
        linear-gradient(90deg,
            color-mix(in srgb, var(--color-m3-scrim) ${sideScrimPercent}%, transparent) 0%,
            color-mix(in srgb, var(--color-m3-surface) ${Math.round(sideScrimPercent * 0.32)}%, transparent) 18%,
            transparent 58%
        ),
        linear-gradient(270deg,
            color-mix(in srgb, var(--color-m3-scrim) ${Math.round(sideScrimPercent * 0.42)}%, transparent) 0%,
            transparent 36%
        ),
        color-mix(in srgb, ${accentColor} ${accentTintPercent}%, transparent),
        color-mix(in srgb, var(--color-m3-scrim) ${globalScrimPercent}%, transparent);`);
    let attribution = $derived(background?.imageAttribution);
    let attributionLabel = $derived.by(() => {
        if (!attribution) return "";
        if (attribution.provider === "unsplash") {
            return `Photo by ${attribution.authorName || "Unsplash photographer"} on Unsplash`;
        }
        if (attribution.provider === "pexels") {
            return `Photo by ${attribution.authorName || "Pexels photographer"} on Pexels`;
        }
        if (attribution.authorName && attribution.sourceName) {
            return `Photo by ${attribution.authorName} on ${attribution.sourceName}`;
        }
        return attribution.sourceName || "";
    });
    let attributionUrl = $derived(
        attribution?.sourceUrl || attribution?.authorUrl || "",
    );
    let showAttribution = $derived(
        Boolean(
            enabled &&
                attribution &&
                externalProviders.has(attribution.provider) &&
                attributionLabel,
        ),
    );
    let frameClass = $derived(
        isViewport
            ? `relative h-full w-full overflow-hidden ${className}`
            : `relative overflow-hidden rounded-m3-card ${className}`,
    );
    let imageClass = $derived(
        isViewport
            ? "pointer-events-none fixed inset-0 z-0 h-screen w-screen object-cover"
            : "pointer-events-none absolute inset-0 h-full w-full object-cover",
    );
    let scrimClass = $derived(
        isViewport
            ? "pointer-events-none fixed inset-0 z-0"
            : "pointer-events-none absolute inset-0",
    );
    let contentClass = $derived(
        isViewport
            ? "relative z-10 flex h-full min-h-full flex-col"
            : "relative z-10 flex h-full min-h-0 flex-col",
    );
    let attributionButtonClass = $derived(
        isViewport
            ? "group/credit touch-target-compact fixed bottom-24 left-4 z-[60] flex size-8 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary xl:bottom-4 xl:left-24"
            : "group/credit touch-target-compact absolute bottom-3 left-3 z-20 flex size-8 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary",
    );

    function openAttribution(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (attributionUrl) {
            window.open(attributionUrl, "_blank", "noopener,noreferrer");
        }
    }
</script>

<div class={frameClass} style={`--dashboard-background-accent: ${accentColor};`}>
    {#if enabled}
        <AuthenticatedImage
            src={background?.imageUrl}
            alt=""
            class={imageClass}
            style={`object-position: ${objectPosition};`}
        />
        <div
            class={scrimClass}
            style={backgroundTreatment}
        ></div>
    {/if}

    <div class={contentClass}>
        {@render children()}
    </div>

    {#if showAttribution}
        <button
            type="button"
            class={attributionButtonClass}
            onclick={openAttribution}
            aria-label={attributionUrl
                ? `${attributionLabel}. Open attribution link.`
                : attributionLabel}
        >
            <IconInfo class="size-5" />
            <span
                class="pointer-events-none absolute bottom-full left-0 mb-2 max-w-[min(18rem,70vw)] rounded-m3-sm bg-m3-inverse-surface px-3 py-2 text-left text-m3-label-small text-m3-inverse-on-surface opacity-0 shadow-m3-elevation-2 transition-opacity group-hover/credit:opacity-100 group-focus-visible/credit:opacity-100"
            >
                {attributionLabel}
            </span>
        </button>
    {/if}
</div>
