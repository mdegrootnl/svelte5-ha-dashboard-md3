<script lang="ts">
    import type {
        GridConfig,
        Breakpoint,
        GridTrack,
    } from "$lib/types/dashboard";
    import type { Snippet } from "svelte";

    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";

    interface Props {
        config: GridConfig;
        breakpoint?: Breakpoint;
        children: Snippet;
        class?: string;
        isNested?: boolean;
    }

    let {
        config,
        breakpoint = "desktop",
        children,
        class: className = "",
        isNested = false,
    }: Props = $props();

    let gridElement: HTMLDivElement | undefined = $state();

    /**
     * Generate CSS grid-template-columns string from config
     * Uses minmax(0, 1fr) for "auto" to prevent content from forcing track wider
     */
    let gridTemplateCols = $derived.by(() => {
        const colCount =
            breakpoint === "desktop"
                ? config.columns.desktop
                : config.columns.mobile;
        // Uniform columns: repeat(N, minmax(0, 1fr))
        return `repeat(${colCount}, minmax(0, 1fr))`;
    });

    /**
     * Generate CSS grid-template-rows string from config
     * "implicit" → empty (uses grid-auto-rows)
     * GridTrack[] → explicit sizes
     */
    let gridTemplateRows = $derived.by(() => {
        if (config.rows === "implicit") {
            // Return empty to let grid-auto-rows define row heights
            return "";
        }
        return config.rows
            .map((r: GridTrack) =>
                r.size === "auto"
                    ? `${config.rowHeight ?? 80}px`
                    : `${r.size}px`,
            )
            .join(" ");
    });

    // Resize Observer to update store with grid dimensions for drag calculations
    $effect(() => {
        if (!gridElement) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // If this is the focused grid (or the root one and no focus is set)
                // We update the store's dimensions
                const isFocused =
                    dashboardEditorStore.focusedGridId === config.id;
                const isRootAndDefault =
                    !dashboardEditorStore.focusedGridId && !isNested;

                if (isFocused || isRootAndDefault) {
                    const colCount =
                        breakpoint === "desktop"
                            ? config.columns.desktop
                            : config.columns.mobile;
                    dashboardEditorStore.updateGridDimensions(
                        entry.target.getBoundingClientRect(),
                        colCount,
                        config.columnGap ?? config.gap,
                        config.rowGap ?? config.gap,
                        config.rowHeight || 80,
                        config.padding ?? 16,
                        gridElement,
                    );
                }
            }
        });

        observer.observe(gridElement);
        return () => observer.disconnect();
    });

    // -- Drag Ghost State --
    // Only show ghost if we are the active target
    let isActiveGrid = $derived(
        dashboardEditorStore.focusedGridId === config.id ||
            (!dashboardEditorStore.focusedGridId && !isNested),
    );

    let isDragging = $derived(isActiveGrid && dashboardEditorStore.isDragging);
    let ghostPos = $derived(dashboardEditorStore.dragGhostPosition);
    let draggingItem = $derived(
        isDragging && dashboardEditorStore.dragItemId
            ? config.items.find((i) => i.id === dashboardEditorStore.dragItemId)
            : null,
    );
    let draggingLayout = $derived(
        draggingItem
            ? breakpoint === "desktop"
                ? draggingItem.layout.desktop
                : draggingItem.layout.mobile
            : null,
    );
</script>

<div
    bind:this={gridElement}
    class="grid-container w-full h-full {className}"
    style:display="grid"
    style:grid-template-columns={gridTemplateCols}
    style:grid-template-rows={gridTemplateRows || undefined}
    style:column-gap="{config.columnGap ?? config.gap}px"
    style:row-gap="{config.rowGap ?? config.gap}px"
    style:padding="{config.padding}px"
    style:grid-auto-rows="{config.rowHeight ?? 80}px"
    onpointerdown={(e) => {
        // Only clear if interacting with the background of the active grid
        if (isActiveGrid && e.target === e.currentTarget) {
            dashboardEditorStore.clearSelection();
        }
    }}
    role="button"
    tabindex="-1"
    onkeydown={(e) =>
        e.key === "Escape" && dashboardEditorStore.clearSelection()}
>
    {@render children()}

    <!-- Drag Ghost Outline -->
    {#if isDragging && ghostPos && draggingLayout}
        <div
            class="grid-ghost-item"
            style:grid-column-start={ghostPos.col}
            style:grid-row-start={ghostPos.row}
            style:grid-column-end={`span ${draggingLayout.colSpan}`}
            style:grid-row-end={`span ${draggingLayout.rowSpan}`}
        ></div>
    {/if}
</div>

<style>
    .grid-container {
        /* Ensure grid doesn't overflow container */
        min-width: 0;
        min-height: 0;
    }

    .grid-ghost-item {
        border: 2px dashed var(--m3-primary);
        background: color-mix(in srgb, var(--m3-primary) 20%, transparent);
        border-radius: var(--radius-m3-md, 12px);
        pointer-events: none;
        z-index: 0;
    }
</style>
