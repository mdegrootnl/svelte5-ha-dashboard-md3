<script lang="ts">
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import { entityDetailStore } from "$lib/features/dashboard/stores/entityDetail.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";

    interface Props {
        entityId?: string;
        entityIds?: string[];
        selectedEntityId?: string;
        title?: string;
        sourceLabel?: string;
        class?: string;
    }

    let {
        entityId = "",
        entityIds = [],
        selectedEntityId = "",
        title = "",
        sourceLabel = "",
        class: className = "",
    }: Props = $props();

    let detailEntityIds = $derived(
        Array.from(new Set([entityId, ...entityIds].filter(Boolean))),
    );

    function openDetails(e: Event) {
        e.stopPropagation();
        if (detailEntityIds.length === 0) return;
        entityDetailStore.openEntities({
            title,
            sourceLabel,
            entityIds: detailEntityIds,
            selectedEntityId: selectedEntityId || entityId || detailEntityIds[0],
        });
    }
</script>

{#if detailEntityIds.length > 0 && !dashboardEditorStore.isEditing}
    <button
        type="button"
        data-testid="entity-detail-open"
        class="touch-edit-control absolute left-[clamp(0.25rem,2cqmin,0.75rem)] top-[clamp(0.25rem,2cqmin,0.75rem)] z-40 rounded-full bg-m3-surface-container-high/90 p-[clamp(0.25rem,1.7cqmin,0.5rem)] text-m3-on-surface shadow-sm opacity-0 backdrop-blur-sm transition-opacity hover:brightness-110 group-hover/card:opacity-100 {className}"
        onclick={openDetails}
        onpointerdown={(e) => e.stopPropagation()}
        title={themeStore.t("entityDetail.openDetails")}
        aria-label={themeStore.t("entityDetail.openDetails")}
    >
        <DynamicIcon name="info" class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
{/if}
