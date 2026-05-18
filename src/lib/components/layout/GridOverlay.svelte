<script lang="ts">
    import type {
        GridConfig,
        Breakpoint,
        GridTrack,
        ViewportProfile,
    } from "$lib/types/dashboard";
    import {
        getGridColumnsForProfile,
        getItemLayoutForProfile,
    } from "$lib/types/dashboard";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";

    import GridDimensionLabel from "./GridDimensionLabel.svelte";
    import IconPlus from "~icons/material-symbols/add";
    import IconMinus from "~icons/material-symbols/remove";

    interface Props {
        config: GridConfig;
        breakpoint: Breakpoint;
        profile?: ViewportProfile;
        visible?: boolean;
    }

    let { config, breakpoint, profile, visible = true }: Props = $props();

    let overlayEl = $state<HTMLElement | null>(null);
    let overlayWidth = $state(0);

    // Calculate column count based on breakpoint
    let columnCount = $derived(
        profile
            ? getGridColumnsForProfile(config, profile)
            : !config.columns
              ? breakpoint === "desktop"
                  ? 12
                  : 4
              : breakpoint === "desktop"
                ? config.columns.desktop
                : config.columns.mobile,
    );

    // Calculate actual column width in pixels
    let colWidth = $derived.by(() => {
        if (!overlayWidth) return 0;
        const totalGap = (config.columnGap ?? config.gap) * (columnCount - 1);
        const padding = config.padding * 2;
        return (overlayWidth - padding - totalGap) / columnCount;
    });

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
            ? profile
                ? getItemLayoutForProfile(draggingItem, profile)
                : breakpoint === "desktop"
                  ? draggingItem.layout.desktop
                  : draggingItem.layout.mobile
            : null,
    );

    // Calculate row count - use explicit rows if defined, otherwise estimate
    // Expand to fit ghost item if dragging
    let rowCount = $derived(() => {
        let count = 6;
        if (config.rows && config.rows !== "implicit") {
            count = config.rows.length;
        } else {
            // For implicit, ensure we cover at least the existing items
            const maxItemRow = config.items.reduce((max, item) => {
                const layout = profile
                    ? getItemLayoutForProfile(item, profile)
                    : breakpoint === "desktop"
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

    // -- Selection State --
    let isSelecting = $derived(dashboardEditorStore.isSelectingGrid);
    let selection = $derived(dashboardEditorStore.gridSelection);

    // Calculate occupied cells maps
    let occupiedCells = $derived.by(() => {
        const occupied = new Set<string>();
        if (!config.items) return occupied;

        for (const item of config.items) {
            const layout = profile
                ? getItemLayoutForProfile(item, profile)
                : breakpoint === "desktop"
                  ? item.layout.desktop
                  : item.layout.mobile;
            for (let r = 0; r < layout.rowSpan; r++) {
                for (let c = 0; c < layout.colSpan; c++) {
                    occupied.add(
                        `${layout.colStart + c},${layout.rowStart + r}`,
                    );
                }
            }
        }
        return occupied;
    });

    function isOccupied(index: number) {
        const col = (index % columnCount) + 1;
        const row = Math.floor(index / columnCount) + 1;
        return occupiedCells.has(`${col},${row}`);
    }

    // Check if cell is in selection
    function isCellSelected(index: number) {
        if (!selection || selection.gridId !== config.id) return false;
        const col = (index % columnCount) + 1;
        const row = Math.floor(index / columnCount) + 1;

        const minCol = Math.min(selection.start.col, selection.end.col);
        const maxCol = Math.max(selection.start.col, selection.end.col);
        const minRow = Math.min(selection.start.row, selection.end.row);
        const maxRow = Math.max(selection.start.row, selection.end.row);

        return col >= minCol && col <= maxCol && row >= minRow && row <= maxRow;
    }

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

    // Selection Dimensions for Button
    let selectionBounds = $derived.by(() => {
        if (!selection || selection.gridId !== config.id) return null;
        const minCol = Math.min(selection.start.col, selection.end.col);
        const maxCol = Math.max(selection.start.col, selection.end.col);
        const minRow = Math.min(selection.start.row, selection.end.row);
        const maxRow = Math.max(selection.start.row, selection.end.row);
        return {
            colStart: minCol,
            rowStart: minRow,
            colSpan: maxCol - minCol + 1,
            rowSpan: maxRow - minRow + 1,
        };
    });

    function handlePointerDown(e: PointerEvent, col: number, row: number) {
        // Only left click
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dashboardEditorStore.startGridSelection(config.id, col, row);
    }

    function handlePointerEnter(col: number, row: number) {
        if (dashboardEditorStore.isSelectingGrid) {
            dashboardEditorStore.updateGridSelection(col, row);
        }
    }

    function handleAddCard(e: MouseEvent) {
        e.stopPropagation();
        cardEditorStore.config = {
            entityId: "",
            name: "",
            onSave: (config) => {
                dashboardEditorStore.createItemFromSelection(
                    config,
                    profile ?? breakpoint,
                );
            },
        };
        cardEditorStore.openLibrary();
    }

    // -- Hover States --
    let hoveredRow = $state<number | null>(null);
    let hoveredCol = $state<number | null>(null);

    function getRowHeight(index: number): number {
        if (config.rows === "implicit") return config.rowHeight ?? 80;
        const track = config.rows[index];
        return typeof track?.size === "number"
            ? track.size
            : (config.rowHeight ?? 80);
    }
</script>

<svelte:window onpointerup={() => dashboardEditorStore.endGridSelection()} />

{#if visible}
    <div
        bind:this={overlayEl}
        bind:clientWidth={overlayWidth}
        class="grid-overlay absolute inset-0 z-40 pointer-events-none"
        style:display="grid"
        style:grid-template-columns="repeat({columnCount}, minmax(0, 1fr))"
        style:grid-template-rows={gridTemplateRows()}
        style:column-gap="{config.columnGap ?? config.gap}px"
        style:row-gap="{config.rowGap ?? config.gap}px"
        style:padding="{config.padding}px"
    >
        {#each Array(totalCells) as _, i}
            {@const row = Math.floor(i / columnCount) + 1}
            {@const col = (i % columnCount) + 1}
            {@const occupied = isOccupied(i)}

            <div
                class="grid-overlay-cell {occupied
                    ? 'pointer-events-none'
                    : 'pointer-events-auto'}"
                class:highlighted={isCellHighlighted(i) || isCellSelected(i)}
                onpointerdown={(e) =>
                    !occupied && handlePointerDown(e, col, row)}
                onpointerenter={() => !occupied && handlePointerEnter(col, row)}
                role="presentation"
            >
                <div class="cell-indicator"></div>

                <!-- Hover Triggers -->
                {#if col === 1}
                    <!-- Row Height Label Trigger (Center-Left) -->
                    <div
                        class="row-trigger pointer-events-auto absolute -left-4 top-0 bottom-0 w-8 flex items-center justify-center transition-opacity duration-200 z-50"
                        onmouseenter={() => (hoveredRow = row)}
                        onmouseleave={() => (hoveredRow = null)}
                        onpointerdown={(e) => e.stopPropagation()}
                        role="button"
                        tabindex="-1"
                    >
                        {#if hoveredRow === row}
                            <div class="absolute right-1/2 mr-1">
                                <GridDimensionLabel
                                    value={getRowHeight(row - 1)}
                                    onchange={(h) =>
                                        dashboardEditorStore.setRowHeight(
                                            row,
                                            h,
                                        )}
                                />
                            </div>
                        {/if}
                    </div>

                    <!-- Insert Row Trigger (Top Edge) -->
                    <button
                        type="button"
                        class="touch-visible touch-hitbox insert-trigger pointer-events-auto absolute -left-6 -top-3 w-12 h-6 flex items-center justify-center z-50 opacity-0 hover:opacity-100 transition-opacity"
                        onclick={() => dashboardEditorStore.addRow(row)}
                        onpointerdown={(e) => e.stopPropagation()}
                        title={themeStore.t("gridOverlay.insertRowAbove")}
                    >
                        <div
                            class="w-6 h-6 bg-m3-secondary-container rounded-full flex items-center justify-center shadow-sm text-m3-on-secondary-container hover:bg-m3-primary hover:text-m3-on-primary transition-colors"
                        >
                            <IconPlus class="text-xs" />
                        </div>
                    </button>

                    <!-- Delete Row Trigger (Bottom Edge) -->
                    {#if hoveredRow === row}
                        <button
                            type="button"
                            class="touch-visible touch-hitbox delete-trigger pointer-events-auto absolute -left-6 -bottom-3 w-12 h-6 flex items-center justify-center z-[60] opacity-0 hover:opacity-100 transition-opacity"
                            onclick={(e) => {
                                e.stopPropagation();
                                dashboardEditorStore.removeRow(row);
                            }}
                            onmouseenter={() => (hoveredRow = row)}
                            onpointerdown={(e) => e.stopPropagation()}
                            title={themeStore.t("gridOverlay.deleteRow")}
                        >
                            <div
                                class="w-6 h-6 bg-m3-error rounded-full flex items-center justify-center shadow-sm text-m3-on-error hover:brightness-95 transition-all"
                            >
                                <IconMinus class="text-xs" />
                            </div>
                        </button>
                    {/if}

                    <!-- Insert Row Trigger (Bottom Edge - Only for last row) -->
                    {#if row === rowCount() && hoveredRow !== row}
                        <button
                            type="button"
                            class="touch-visible touch-hitbox insert-trigger pointer-events-auto absolute -left-6 -bottom-3 w-12 h-6 flex items-center justify-center z-50 opacity-0 hover:opacity-100 transition-opacity"
                            onclick={() => dashboardEditorStore.addRow(row + 1)}
                            onpointerdown={(e) => e.stopPropagation()}
                            title={themeStore.t("gridOverlay.insertRowBelow")}
                        >
                            <div
                                class="w-6 h-6 bg-m3-secondary-container rounded-full flex items-center justify-center shadow-sm text-m3-on-secondary-container hover:bg-m3-primary hover:text-m3-on-primary transition-colors"
                            >
                                <IconPlus class="text-xs" />
                            </div>
                        </button>
                    {/if}
                {/if}
            </div>
        {/each}

        <!-- Add Component Button Overlay -->
        {#if selectionBounds && !isSelecting}
            <div
                class="absolute z-[70] flex items-center justify-center pointer-events-none w-full h-full"
                style:grid-column="{selectionBounds.colStart} / span {selectionBounds.colSpan}"
                style:grid-row="{selectionBounds.rowStart} / span {selectionBounds.rowSpan}"
            >
                <button
                    type="button"
                    class="touch-target pointer-events-auto inline-flex items-center justify-center px-4 gap-2 rounded-full bg-m3-primary text-m3-on-primary text-m3-label-large font-medium hover:brightness-95 transition-colors shadow-m3-elevation-1"
                    onclick={handleAddCard}
                    onpointerdown={(e) => e.stopPropagation()}
                >
                    <IconPlus class="size-5" />
                    <span>{themeStore.t("common.add")}</span>
                </button>
            </div>
        {/if}
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
