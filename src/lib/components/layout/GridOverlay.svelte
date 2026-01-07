<script lang="ts">
    import type {
        GridConfig,
        Breakpoint,
        GridTrack,
    } from "$lib/types/dashboard";
    import { dashboardEditorStore } from "$lib/stores/dashboardEditor.svelte";

    interface Props {
        config: GridConfig;
        breakpoint: Breakpoint;
        visible?: boolean;
    }

    let { config, breakpoint, visible = true }: Props = $props();

    // Calculate column count based on breakpoint
    let columnCount = $derived(
        breakpoint === "desktop"
            ? config.columns.desktop
            : config.columns.mobile,
    );

    // -- Drag Ghost State --
    let isDragging = $derived(dashboardEditorStore.isDragging);
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

    // Calculate row count - use explicit rows if defined, otherwise estimate
    // Expand to fit ghost item if dragging
    let rowCount = $derived(() => {
        let count = 6;
        if (config.rows !== "implicit") {
            count = config.rows.length;
        } else {
            // For implicit, ensure we cover at least the existing items
            const maxItemRow = config.items.reduce((max, item) => {
                const layout =
                    breakpoint === "desktop"
                        ? item.layout.desktop
                        : item.layout.mobile;
                return Math.max(max, layout.rowStart + layout.rowSpan - 1);
            }, 6);
            count = maxItemRow;
        }

        // Dynamically expand if ghost is beyond current count
        if (isDragging && ghostPos && draggingLayout) {
            const ghostEndRow = ghostPos.row + draggingLayout.rowSpan - 1;
            count = Math.max(count, ghostEndRow);
        }
        return count;
    });

    // Get default row height from config
    let defaultRowHeight = $derived(config.rowHeight ?? 80);

    // Generate grid-template-rows string with individual heights
    let gridTemplateRows = $derived(() => {
        if (config.rows !== "implicit") {
            // Use individual row heights from GridTrack[]
            // Use undefined (which enables repetition of the last track or auto) or default for extra rows
            // But CSS Grid template 'repeat' doesn't mix easily with tracking array unless we construct it fully.
            // We'll construct the string fully for the calculated rowCount.

            const tracks = config.rows.map((r: GridTrack) =>
                typeof r.size === "number"
                    ? `${r.size}px`
                    : `${defaultRowHeight}px`,
            );

            // If rowCount > explicit rows, fill with default
            const explicitCount = config.rows.length;
            const currentCount = rowCount();

            if (currentCount > explicitCount) {
                const extras = Array(currentCount - explicitCount).fill(
                    `${defaultRowHeight}px`,
                );
                return [...tracks, ...extras].join(" ");
            }
            return tracks.join(" ");
        }
        // Implicit rows: use uniform height
        return `repeat(${rowCount()}, ${defaultRowHeight}px)`;
    });

    // Total cells for the grid
    let totalCells = $derived(columnCount * rowCount());

    // Check if a cell index is within the ghost area
    function isCellHighlighted(index: number) {
        if (!isDragging || !ghostPos || !draggingLayout) return false;

        const col = (index % columnCount) + 1;
        const row = Math.floor(index / columnCount) + 1;

        const startCol = ghostPos.col;
        const endCol = ghostPos.col + draggingLayout.colSpan - 1;
        const startRow = ghostPos.row;
        const endRow = ghostPos.row + draggingLayout.rowSpan - 1;

        return (
            col >= startCol && col <= endCol && row >= startRow && row <= endRow
        );
    }
</script>

{#if visible}
    <div
        class="grid-overlay pointer-events-none absolute inset-0 z-40"
        style:display="grid"
        style:grid-template-columns="repeat({columnCount}, minmax(0, 1fr))"
        style:grid-template-rows={gridTemplateRows()}
        style:column-gap="{config.columnGap ?? config.gap}px"
        style:row-gap="{config.rowGap ?? config.gap}px"
        style:padding="{config.padding}px"
    >
        {#each Array(totalCells) as _, i}
            <div
                class="grid-overlay-cell"
                class:highlighted={isCellHighlighted(i)}
            >
                <div class="cell-indicator"></div>
            </div>
        {/each}
    </div>
{/if}

<style>
    .grid-overlay {
        --overlay-color: var(--m3-primary, #6750a4);
        --overlay-opacity: 0.15;
    }

    .grid-overlay-cell {
        position: relative;
        border: 1px dashed
            color-mix(in srgb, var(--overlay-color) 40%, transparent);
        border-radius: var(--radius-m3-sm, 8px);
        background: color-mix(in srgb, var(--overlay-color) 5%, transparent);
        transition: all 0.2s ease;
    }

    .grid-overlay-cell.highlighted {
        --overlay-color: var(--m3-tertiary, #7d5260);
        background: color-mix(in srgb, var(--overlay-color) 15%, transparent);
        border-style: solid;
        border-width: 2px;
        z-index: 10;
    }

    .cell-indicator {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--overlay-color) 30%, transparent);
    }

    /* Animate the overlay appearing */
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .grid-overlay {
        animation: fadeIn 0.2s ease-out;
    }
</style>
