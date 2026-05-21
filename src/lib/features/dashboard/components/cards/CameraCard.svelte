<script lang="ts">
    import AuthenticatedImage from "$lib/components/common/AuthenticatedImage.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import { getCameraSnapshotSource, isCameraEntityActive } from "$lib/domain/camera";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import EntityDetailButton from "$lib/features/dashboard/components/EntityDetailButton.svelte";
    import {
        getCardSurfaceClasses,
        getCardSurfaceStyle,
    } from "$lib/features/dashboard/utils/cardSurface";
    import { haStore } from "$lib/stores/ha.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import type { CameraCardOptions, HAEntity } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import { getEntityName } from "$lib/utils/entity";
    import IconEdit from "~icons/material-symbols/edit";

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: CameraCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("videocam"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ source: "auto", refreshSeconds: 10 }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let refreshTick = $state(Date.now());
    let isEditing = $derived(dashboardEditorStore.isEditing);
    let refreshSeconds = $derived(Math.max(1, options?.refreshSeconds ?? 10));
    let cameraEntityIds = $derived.by(() => {
        haStore.statesVersion;
        haStore.overridesVersion;

        const configuredIds = options?.entityIds?.filter(Boolean) ?? [];
        if (configuredIds.length > 0) return configuredIds;
        if (entityId) return [entityId];
        return haStore.getEntityIdsSnapshot().filter((id) => id.startsWith("camera."));
    });
    let cameraEntities = $derived.by(() => {
        haStore.statesVersion;
        haStore.overridesVersion;

        return cameraEntityIds
            .map((id) => haStore.getEntity(id))
            .filter(isCameraEntity);
    });
    let activeCameras = $derived(
        cameraEntities.filter((camera) =>
            isCameraEntityActive(camera, options?.activeStates),
        ),
    );
    let visibleCameras = $derived(activeCameras.slice(0, 4));
    let remainingCount = $derived(Math.max(0, activeCameras.length - visibleCameras.length));
    let title = $derived(name || themeStore.t("camera.defaultTitle"));
    let countLabel = $derived(
        themeStore.t(activeCameras.length === 1 ? "camera.activeCount" : "camera.activeCountPlural", {
            count: activeCameras.length,
        }),
    );

    $effect(() => {
        if (activeCameras.length === 0) return;

        const interval = window.setInterval(() => {
            refreshTick = Date.now();
        }, refreshSeconds * 1000);

        return () => window.clearInterval(interval);
    });

    function isCameraEntity(entity: unknown): entity is HAEntity {
        if (!entity || typeof entity !== "object") return false;
        const candidate = entity as HAEntity;
        return typeof candidate.entity_id === "string" && candidate.entity_id.startsWith("camera.");
    }

    function getCameraName(camera: HAEntity) {
        return getEntityName(camera.entity_id, camera.attributes);
    }

    function getStateLabel(camera: HAEntity) {
        return camera.state.replaceAll("_", " ");
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "camera",
            domainFilter: "camera",
            options: { camera: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "videocam";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { camera?: CameraCardOptions })?.camera ?? options;
            },
            onDelete: ondelete,
        });
    }
</script>

{#if activeCameras.length > 0 || isEditing}
    <article
        data-testid="camera-card"
        class="relative flex h-full w-full flex-col overflow-hidden rounded-m3-card text-m3-on-surface group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
        style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
        aria-label={title}
    >
        <div class="flex h-full min-h-0 flex-col gap-[clamp(0.5rem,3cqmin,1rem)] p-[clamp(0.625rem,4cqmin,1.25rem)]">
            <header class="flex min-w-0 items-center gap-[clamp(0.5rem,3cqmin,1rem)] pr-[clamp(2.25rem,8cqi,3.25rem)]">
                <div
                    class="flex size-[clamp(2.5rem,18cqmin,4rem)] shrink-0 items-center justify-center rounded-m3-full"
                    style:background-color={color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--color-m3-secondary-container)"}
                    style:color={color || "var(--color-m3-secondary)"}
                >
                    <DynamicIcon name={icon || "videocam"} class="size-[58%]" />
                </div>
                <div class="min-w-0 flex-1">
                    <h3 class="truncate text-[clamp(0.95rem,max(5.4cqb,1.8cqi),1.3rem)] font-bold leading-tight">
                        {title}
                    </h3>
                    <p class="truncate text-[clamp(0.75rem,3cqmin,0.9rem)] text-m3-on-surface-variant">
                        {activeCameras.length > 0 ? countLabel : themeStore.t("camera.noActive")}
                    </p>
                </div>
            </header>

            {#if activeCameras.length > 0}
                <div
                    class="camera-feed"
                    class:camera-feed--single={visibleCameras.length === 1}
                >
                    {#each visibleCameras as camera (camera.entity_id)}
                        {@const cameraName = getCameraName(camera)}
                        {@const imageSource = getCameraSnapshotSource(camera, refreshTick)}
                        <div class="camera-tile" data-testid="camera-tile" title={`${cameraName} - ${getStateLabel(camera)}`}>
                            <AuthenticatedImage
                                src={imageSource}
                                alt={cameraName}
                                class="absolute inset-0 h-full w-full object-cover"
                            />
                            <div class="camera-tile__fallback">
                                <DynamicIcon name="videocam" class="size-[28%]" />
                            </div>
                            <div class="camera-tile__overlay">
                                <span class="truncate font-semibold">{cameraName}</span>
                                <span class="camera-state">{getStateLabel(camera)}</span>
                            </div>
                        </div>
                    {/each}

                    {#if remainingCount > 0}
                        <div class="camera-more">
                            +{remainingCount}
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="camera-empty">
                    <DynamicIcon name="videocam_off" class="size-9" />
                    <span>{themeStore.t("camera.noActive")}</span>
                </div>
            {/if}
        </div>

        <button
            class="touch-edit-control absolute right-[clamp(0.25rem,2cqmin,0.75rem)] top-[clamp(0.25rem,2cqmin,0.75rem)] z-30 rounded-full bg-m3-primary-container p-[clamp(0.25rem,1.7cqmin,0.5rem)] text-m3-on-primary-container opacity-0 shadow-sm transition-opacity hover:brightness-110 group-hover/card:opacity-100"
            onclick={openConfig}
            onpointerdown={(e) => e.stopPropagation()}
            title={themeStore.t("camera.editTitle")}
        >
            <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
        </button>

        <EntityDetailButton
            entityIds={activeCameras.map((camera) => camera.entity_id)}
            selectedEntityId={visibleCameras[0]?.entity_id}
            {title}
            sourceLabel={countLabel}
        />
    </article>
{/if}

<style>
    .camera-feed {
        display: grid;
        flex: 1;
        min-height: 0;
        gap: clamp(0.375rem, 2.5cqmin, 0.75rem);
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
    }

    .camera-feed--single {
        grid-template-columns: minmax(0, 1fr);
    }

    .camera-tile,
    .camera-more,
    .camera-empty {
        min-width: 0;
        min-height: 0;
        border-radius: var(--radius-m3-md, 12px);
        background: var(--color-m3-surface-container-high);
    }

    .camera-tile {
        position: relative;
        overflow: hidden;
        isolation: isolate;
    }

    .camera-tile__fallback {
        position: absolute;
        inset: 0;
        z-index: -1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-m3-on-surface-variant);
        background: linear-gradient(
            135deg,
            var(--color-m3-surface-container-high),
            var(--color-m3-surface-container-highest)
        );
    }

    .camera-tile__overlay {
        position: absolute;
        inset-inline: 0;
        bottom: 0;
        display: flex;
        min-width: 0;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: clamp(0.375rem, 1.8cqmin, 0.625rem) clamp(0.5rem, 2.4cqmin, 0.875rem);
        color: white;
        background: linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0));
        font-size: clamp(0.7rem, 2.6cqmin, 0.875rem);
        line-height: 1.2;
        text-shadow: 0 1px 2px rgb(0 0 0 / 0.45);
    }

    .camera-state {
        flex-shrink: 0;
        border-radius: 999px;
        background: rgb(255 255 255 / 0.18);
        padding: 0.125rem 0.45rem;
        text-transform: capitalize;
    }

    .camera-more,
    .camera-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-m3-on-surface-variant);
        font-weight: 700;
    }

    .camera-empty {
        flex: 1;
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
        font-size: clamp(0.8rem, 3cqmin, 0.95rem);
    }

    @container (max-height: 170px) {
        .camera-feed {
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 7rem), 1fr));
        }

        .camera-tile__overlay {
            padding-block: 0.375rem;
        }
    }
</style>
