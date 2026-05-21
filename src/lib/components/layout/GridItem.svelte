<script lang="ts">
    import type { ItemLayout, Breakpoint, ViewportProfile } from "$lib/types/dashboard";
    import type { Snippet } from "svelte";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import IconDragIndicator from "~icons/material-symbols/drag-indicator";

    interface Props {
        /** Item ID for editor operations */
        itemId: string;
        /** Layout for desktop breakpoint */
        desktopLayout: ItemLayout;
        /** Layout for mobile breakpoint */
        mobileLayout: ItemLayout;
        /** Current breakpoint */
        breakpoint?: Breakpoint;
        /** Current viewport profile */
        profile?: ViewportProfile;
        /** Layout resolved for the current viewport profile */
        profileLayout?: ItemLayout;
        /** Content to render */
        children: Snippet;
        /** Additional CSS classes */
        class?: string;
        /** If true, overlay is suppressed and content is interactive */
        isInteractive?: boolean;
        /** If true, item is removed from normal dashboard rendering */
        hidden?: boolean;
        /** Optional controls to render on top of the item in edit mode */
        // eslint-disable-next-line no-undef
        controls?: Snippet;
    }

    let {
        itemId,
        desktopLayout,
        mobileLayout,
        breakpoint = "desktop",
        profile,
        profileLayout,
        children,
        class: className = "",
        isInteractive = false,
        hidden = false,
        controls,
    }: Props = $props();

    // Get current layout based on breakpoint
    let currentLayout = $derived(
        profileLayout ?? (breakpoint === "desktop" ? desktopLayout : mobileLayout),
    );

    let layoutTarget = $derived(profile ?? breakpoint);

    // Grid positioning styles
    let gridColumn = $derived(
        `${currentLayout.colStart} / span ${currentLayout.colSpan}`,
    );
    let gridRow = $derived(
        `${currentLayout.rowStart} / span ${currentLayout.rowSpan}`,
    );

    // Selection state
    let isSelected = $derived(dashboardEditorStore.selectedItemId === itemId);
    let isEditing = $derived(dashboardEditorStore.isEditing);
    let isDragging = $derived(dashboardEditorStore.dragItemId === itemId);

    // Check if this item allows focus mode (is an ancestor of the currently focused grid)
    let isFocusedContext = $derived(
        dashboardEditorStore.isItemAncestorOfFocus(itemId),
    );

    // Handle pointer down to select
    function handleClick(e: PointerEvent) {
        if (!isEditing) return;
        e.stopPropagation();
        dashboardEditorStore.selectItem(itemId);
    }

    // Handle drag start from drag handle
    function handleDragStart(e: PointerEvent) {
        if (!isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dashboardEditorStore.startDrag(itemId);
    }

    // Handle drag move
    function handleDragMove(e: PointerEvent) {
        if (
            dashboardEditorStore.isDragging &&
            dashboardEditorStore.dragItemId === itemId
        ) {
            dashboardEditorStore.updateDragPosition(
                e.clientX,
                e.clientY,
                layoutTarget,
            );
        }
    }

    // Handle drag end
    function handleDragEnd(e: PointerEvent) {
        if (
            dashboardEditorStore.isDragging &&
            dashboardEditorStore.dragItemId === itemId
        ) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            dashboardEditorStore.endDrag(layoutTarget);
        }
    }

    // Handle resize start
    function handleResizeStart(
        e: PointerEvent,
        direction: "right" | "bottom" | "corner",
    ) {
        if (!isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dashboardEditorStore.startResize(itemId, direction);
    }

    // Handle resize move
    function handleResizeMove(e: PointerEvent) {
        if (
            dashboardEditorStore.isResizing &&
            dashboardEditorStore.resizeItemId === itemId
        ) {
            dashboardEditorStore.updateResize(e.clientX, e.clientY, layoutTarget);
        }
    }

    // Handle resize end
    function handleResizeEnd(e: PointerEvent) {
        if (
            dashboardEditorStore.isResizing &&
            dashboardEditorStore.resizeItemId === itemId
        ) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            dashboardEditorStore.endResize(layoutTarget);
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="grid-item h-full w-full {className}"
    class:hidden={hidden}
    class:selected={isSelected && isEditing && !isInteractive}
    class:editing={isEditing}
    class:dragging={isDragging}
    class:focused-context={isFocusedContext}
    style:grid-column={gridColumn}
    style:grid-row={gridRow}
    onpointerdown={handleClick}
>
    <!-- Content wrapper - blocks pointer events in edit mode unless interactive -->
    <div class="content-wrapper" class:edit-mode={isEditing && !isInteractive}>
        {@render children()}
    </div>

    <!-- Edit mode overlay and controls -->
    {#if isEditing}
        {#if !isInteractive}
            <!-- Selection overlay -->
            <div
                class="edit-overlay"
                class:selected={isSelected}
                onpointerdown={handleClick}
            ></div>

            <!-- Drag Handle (visible when selected) -->
            {#if isSelected}
                <button
                    type="button"
                    class="drag-handle"
                    onpointerdown={handleDragStart}
                    onpointermove={handleDragMove}
                    onpointerup={handleDragEnd}
                    onpointercancel={handleDragEnd}
                    aria-label="Drag to move"
                >
                    <IconDragIndicator class="size-5" />
                </button>

                <!-- Resize Handles -->
                <button
                    type="button"
                    class="resize-handle resize-handle-right"
                    onpointerdown={(e) => handleResizeStart(e, "right")}
                    onpointermove={handleResizeMove}
                    onpointerup={handleResizeEnd}
                    onpointercancel={handleResizeEnd}
                    aria-label="Resize width"
                >
                    <span class="handle-line"></span>
                </button>

                <button
                    type="button"
                    class="resize-handle resize-handle-bottom"
                    onpointerdown={(e) => handleResizeStart(e, "bottom")}
                    onpointermove={handleResizeMove}
                    onpointerup={handleResizeEnd}
                    onpointercancel={handleResizeEnd}
                    aria-label="Resize height"
                >
                    <span class="handle-line horizontal"></span>
                </button>

                <button
                    type="button"
                    class="resize-handle resize-handle-corner"
                    onpointerdown={(e) => handleResizeStart(e, "corner")}
                    onpointermove={handleResizeMove}
                    onpointerup={handleResizeEnd}
                    onpointercancel={handleResizeEnd}
                    aria-label="Resize"
                >
                    <span class="handle-corner"></span>
                </button>
            {/if}
        {/if}

        {@render controls?.()}
    {/if}
</div>

<style>
    .grid-item {
        min-width: 0;
        min-height: 0;
        position: relative;
        transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
    }

    .grid-item.hidden {
        display: none;
    }

    .content-wrapper {
        width: 100%;
        height: 100%;
        position: relative;
        z-index: 1;
    }

    /* Block card interactions in edit mode */
    .content-wrapper.edit-mode {
        z-index: 10;
        pointer-events: none;
    }

    .edit-overlay {
        position: absolute;
        inset: 0;
        z-index: 5;
        border-radius: var(--radius-m3-md, 12px);
        transition: all 0.15s ease;
        cursor: pointer;
    }

    .edit-overlay:hover {
        background: transparent;
    }

    .edit-overlay.selected {
        background: transparent;
    }

    .grid-item.editing::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 15;
        border-radius: var(--radius-m3-md, 12px);
        pointer-events: none;
        transition: box-shadow 0.15s ease;
    }

    .grid-item.editing:hover::after {
        box-shadow: inset 0 0 0 2px
            color-mix(
                in srgb,
                var(--color-m3-primary, #6750a4) 40%,
                transparent
            );
    }

    .grid-item.selected::after {
        box-shadow: inset 0 0 0 3px var(--color-m3-primary, #6750a4);
    }

    .grid-item.dragging {
        opacity: 0.8;
        transform: scale(1.02);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
        z-index: 100;
    }

    .grid-item.dragging .edit-overlay {
        background: transparent;
    }

    .grid-item.dragging::after {
        box-shadow: inset 0 0 0 3px var(--color-m3-primary, #6750a4);
    }

    /* Focus Mode - Elevate above backdrop */
    .grid-item.focused-context {
        z-index: 50; /* Above the backdrop (z-40) */
        box-shadow:
            0 20px 25px -5px rgb(0 0 0 / 0.1),
            0 8px 10px -6px rgb(0 0 0 / 0.1); /* Elevation-3 approx */
    }

    /* Drag handle */
    .drag-handle {
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 20;
        background: var(--color-m3-primary, #6750a4);
        color: var(--color-m3-on-primary, white);
        border: none;
        border-radius: 8px;
        padding: 4px 12px;
        min-width: var(--touch-target-min, 48px);
        min-height: 36px;
        cursor: grab;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: none;
        user-select: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition:
            transform 0.1s ease,
            box-shadow 0.1s ease;
    }

    .drag-handle:hover {
        transform: translateX(-50%) scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .drag-handle:active {
        cursor: grabbing;
        transform: translateX(-50%) scale(0.98);
    }

    /* Resize handles */
    .resize-handle {
        position: absolute;
        background: var(--color-m3-primary, #6750a4);
        border: 2px solid var(--color-m3-surface, white);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20;
        transition: transform 0.1s ease;
        padding: 0;
        touch-action: none;
        user-select: none;
    }

    .resize-handle::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: var(--touch-target-min, 48px);
        height: var(--touch-target-min, 48px);
        transform: translate(-50%, -50%);
        border-radius: 9999px;
    }

    .resize-handle:hover {
        transform: scale(1.15);
    }

    .handle-line {
        width: 2px;
        height: 16px;
        background: white;
        border-radius: 1px;
    }

    .handle-line.horizontal {
        width: 16px;
        height: 2px;
    }

    .handle-corner {
        width: 8px;
        height: 8px;
        border-right: 2px solid white;
        border-bottom: 2px solid white;
    }

    .resize-handle-right {
        right: -8px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 32px;
        cursor: ew-resize;
    }

    .resize-handle-right:hover {
        transform: translateY(-50%) scale(1.15);
    }

    .resize-handle-bottom {
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 32px;
        height: 16px;
        cursor: ns-resize;
    }

    .resize-handle-bottom:hover {
        transform: translateX(-50%) scale(1.15);
    }

    .resize-handle-corner {
        right: -8px;
        bottom: -8px;
        width: 20px;
        height: 20px;
        cursor: nwse-resize;
        border-radius: 6px;
    }

    @media (hover: none), (pointer: coarse) {
        .drag-handle {
            top: 6px;
            min-height: var(--touch-target-compact, 44px);
            padding: 8px 16px;
        }

        .resize-handle-right {
            right: -14px;
            width: 28px;
            height: 48px;
        }

        .resize-handle-bottom {
            bottom: -14px;
            width: 48px;
            height: 28px;
        }

        .resize-handle-corner {
            right: -14px;
            bottom: -14px;
            width: 36px;
            height: 36px;
        }
    }
</style>
