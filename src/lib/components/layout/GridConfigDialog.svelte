<script lang="ts">
    import TextField from "$lib/components/md3/TextField.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import Chip from "$lib/components/md3/Chip.svelte";
    import Switch from "$lib/components/md3/Switch.svelte";
    import IconGridView from "~icons/material-symbols/grid-view";
    import IconLink from "~icons/material-symbols/link";
    import IconLinkOff from "~icons/material-symbols/link-off";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import SideSheet from "./SideSheet.svelte";
    import type { GridConfig, GridTrack } from "$lib/types/dashboard";

    interface Props {
        open: boolean;
        config: GridConfig | null;
        onclose?: () => void;
    }

    let { open = $bindable(false), config, onclose }: Props = $props();

    // Minimum height for cards (min-h-20 = 80px in Tailwind)
    const CARD_MIN_HEIGHT = 80;

    // Local state for form values
    let dimensionInput = $state("");
    let columns = $state(12);
    let rows = $state(0); // 0 means implicit/auto
    let rowHeight = $state(80); // Default height for all rows
    let individualRowHeights = $state<number[]>([]); // Per-row heights when rows > 0
    let horizontalGap = $state(16);
    let verticalGap = $state(16);
    let gapsLinked = $state(true);
    let padding = $state(16);

    // Derive warning for rows that are too short
    let rowHeightWarnings = $derived(() => {
        return individualRowHeights
            .map((h, i) => ({ row: i + 1, height: h }))
            .filter((r) => r.height < CARD_MIN_HEIGHT);
    });

    // Function to sync individual row heights with row count (called manually)
    function syncRowHeights() {
        if (rows > 0) {
            // Resize array, preserving existing values and adding defaults for new rows
            individualRowHeights = Array.from(
                { length: rows },
                (_, i) => individualRowHeights[i] ?? rowHeight,
            );
        } else {
            individualRowHeights = [];
        }
    }

    // Track previous open state to only sync on open, not on every update
    let previousOpen = $state(false);

    // Sync local state when dialog opens (only once per open)
    $effect(() => {
        // Only sync when transitioning from closed to open
        if (open && !previousOpen && config) {
            columns = config.columns.desktop;
            rows = config.rows === "implicit" ? 0 : config.rows.length;
            rowHeight = config.rowHeight ?? 80;

            // Load individual row heights from config
            if (config.rows !== "implicit") {
                individualRowHeights = config.rows.map((r) =>
                    typeof r.size === "number"
                        ? r.size
                        : (config.rowHeight ?? 80),
                );
            } else {
                individualRowHeights = [];
            }

            horizontalGap = config.columnGap ?? config.gap;
            verticalGap = config.rowGap ?? config.gap;
            gapsLinked =
                (config.columnGap ?? config.gap) ===
                (config.rowGap ?? config.gap);
            padding = config.padding;
            dimensionInput =
                rows > 0
                    ? `${config.columns.desktop}×${rows}`
                    : `${config.columns.desktop}`;
        }
        previousOpen = open;
    });

    // Parse dimension input like "12x6" or "12×6" or just "12"
    function parseDimensionInput(
        input: string,
    ): { cols: number; rows: number } | null {
        // Try "cols x rows" format (with x or ×)
        const match = input.match(/^(\d+)[x×](\d+)$/i);
        if (match) {
            return {
                cols: parseInt(match[1], 10),
                rows: parseInt(match[2], 10),
            };
        }
        // Try just columns
        const colMatch = input.match(/^(\d+)$/);
        if (colMatch) {
            return {
                cols: parseInt(colMatch[1], 10),
                rows: 0, // implicit
            };
        }
        return null;
    }

    // Handle dimension input change
    function handleDimensionChange(e: Event) {
        const value = (e.target as HTMLInputElement).value;
        dimensionInput = value;
        const parsed = parseDimensionInput(value);
        if (parsed && parsed.cols >= 2 && parsed.cols <= 24) {
            columns = parsed.cols;
            if (parsed.rows >= 0 && parsed.rows <= 20) {
                rows = parsed.rows;
            }
        }
    }

    // Apply preset
    function applyPreset(cols: number) {
        columns = cols;
        dimensionInput = rows > 0 ? `${cols}×${rows}` : `${cols}`;
    }

    // Handle gap sync
    function handleHorizontalGapChange(value: number) {
        horizontalGap = value;
        if (gapsLinked) {
            verticalGap = value;
        }
    }

    function handleVerticalGapChange(value: number) {
        verticalGap = value;
        if (gapsLinked) {
            horizontalGap = value;
        }
    }

    // Toggle gap linking
    function toggleGapLink() {
        gapsLinked = !gapsLinked;
        if (gapsLinked) {
            verticalGap = horizontalGap;
        }
    }

    // Apply changes
    function handleApply() {
        if (!config) return;

        // Generate explicit rows if count specified
        let rowsConfig: "implicit" | GridTrack[] = "implicit";
        if (rows > 0) {
            rowsConfig = Array.from({ length: rows }, (_, i) => ({
                id: `row-${i}`,
                size: individualRowHeights[i] ?? rowHeight,
                type: "row" as const,
            }));
        }

        dashboardEditorStore.updateGridConfig({
            columns: {
                desktop: columns,
                mobile: Math.min(4, columns),
            },
            rows: rowsConfig,
            rowHeight,
            gap: horizontalGap,
            columnGap: horizontalGap,
            rowGap: verticalGap,
            padding,
        });

        handleClose();
    }

    // Reset to defaults
    function handleReset() {
        columns = 12;
        rows = 0;
        rowHeight = 80;
        individualRowHeights = [];
        horizontalGap = 16;
        verticalGap = 16;
        gapsLinked = true;
        padding = 16;
        dimensionInput = "12";
    }

    function handleClose() {
        open = false;
        onclose?.();
    }

    // Close on escape
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape" && open) {
            handleClose();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<SideSheet
    bind:open
    title="Grid Settings"
    subtitle={config?.name ?? "Dashboard"}
    icon={IconGridView}
    onclose={handleClose}
>
    <!-- Grid Dimensions Section -->
    <section>
        <h3 class="text-m3-title-small text-m3-on-surface mb-4">
            Grid Dimensions
        </h3>
        <p class="text-m3-body-small text-m3-on-surface-variant mb-4">
            Define columns and rows (e.g., "12×6" or leave rows empty for auto)
        </p>

        <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
                <span
                    class="text-m3-label-small text-m3-on-surface-variant mb-2 block"
                >
                    Columns
                </span>
                <input
                    type="number"
                    min="2"
                    max="24"
                    bind:value={columns}
                    onchange={() => {
                        // Clamp and update dimension string
                        if (columns < 2) columns = 2;
                        if (columns > 24) columns = 24;
                        dimensionInput =
                            rows > 0 ? `${columns}×${rows}` : `${columns}`;
                    }}
                    class="w-full px-4 py-3 rounded-m3-sm bg-m3-surface-container-highest text-m3-on-surface text-m3-body-large border border-m3-outline focus:border-m3-primary focus:outline-none transition-colors"
                />
            </div>
            <div>
                <span
                    class="text-m3-label-small text-m3-on-surface-variant mb-2 block"
                >
                    Rows
                    <span class="text-m3-on-surface-variant/60">(0 = auto)</span
                    >
                </span>
                <input
                    type="number"
                    min="0"
                    max="20"
                    bind:value={rows}
                    onchange={() => {
                        // Clamp value and update dimension string
                        if (rows < 0) rows = 0;
                        if (rows > 20) rows = 20;
                        dimensionInput =
                            rows > 0 ? `${columns}×${rows}` : `${columns}`;
                        // Sync individual row heights array
                        syncRowHeights();
                    }}
                    class="w-full px-4 py-3 rounded-m3-sm bg-m3-surface-container-highest text-m3-on-surface text-m3-body-large border border-m3-outline focus:border-m3-primary focus:outline-none transition-colors"
                />
            </div>
        </div>

        <!-- Preset Chips -->
        <div class="flex flex-wrap gap-2">
            {#each [4, 6, 8, 10, 12] as preset}
                <Chip
                    variant="filter"
                    label="{preset} cols"
                    selected={columns === preset}
                    onclick={() => applyPreset(preset)}
                />
            {/each}
        </div>
    </section>

    <!-- Row Height Section -->
    <section>
        <h3 class="text-m3-title-small text-m3-on-surface mb-4">Row Height</h3>
        <p class="text-m3-body-small text-m3-on-surface-variant mb-4">
            Height of each grid row in pixels
        </p>

        <div class="flex items-center gap-4">
            <input
                type="range"
                min="40"
                max="200"
                step="10"
                bind:value={rowHeight}
                class="flex-1 h-2 bg-m3-surface-container-highest rounded-full appearance-none cursor-pointer accent-m3-primary"
            />
            <span
                class="text-m3-body-medium text-m3-on-surface w-16 text-right tabular-nums"
            >
                {rowHeight}px
            </span>
        </div>

        <!-- Row Height Presets -->
        <div class="flex flex-wrap gap-2 mt-4">
            {#each [60, 80, 100, 120] as preset}
                <Chip
                    variant="filter"
                    label="{preset}px"
                    selected={rowHeight === preset}
                    onclick={() => (rowHeight = preset)}
                />
            {/each}
        </div>
    </section>

    <!-- Individual Row Heights Section (when explicit rows are defined) -->
    {#if rows > 0 && individualRowHeights.length > 0}
        <section>
            <h3 class="text-m3-title-small text-m3-on-surface mb-4">
                Individual Row Heights
            </h3>
            <p class="text-m3-body-small text-m3-on-surface-variant mb-4">
                Customize height for each row
            </p>

            <div class="flex flex-col gap-3 max-h-48 overflow-y-auto">
                {#each individualRowHeights as height, i}
                    <div
                        class="flex items-center gap-3 p-2 bg-m3-surface-container-high rounded-m3-sm"
                    >
                        <span
                            class="text-m3-label-medium text-m3-on-surface-variant w-16"
                        >
                            Row {i + 1}
                        </span>
                        <input
                            type="range"
                            min="40"
                            max="200"
                            step="10"
                            value={height}
                            oninput={(e) => {
                                individualRowHeights[i] = parseInt(
                                    (e.target as HTMLInputElement).value,
                                );
                                individualRowHeights = [
                                    ...individualRowHeights,
                                ]; // trigger reactivity
                            }}
                            class="flex-1 h-2 bg-m3-surface-container-highest rounded-full appearance-none cursor-pointer accent-m3-primary"
                        />
                        <span
                            class="text-m3-body-small text-m3-on-surface w-12 text-right tabular-nums"
                        >
                            {height}px
                        </span>
                    </div>
                {/each}
            </div>

            <!-- Apply default height to all rows -->
            <button
                class="mt-3 text-m3-label-medium text-m3-primary hover:underline"
                onclick={() => {
                    individualRowHeights = Array.from(
                        { length: rows },
                        () => rowHeight,
                    );
                }}
            >
                Apply default ({rowHeight}px) to all rows
            </button>

            <!-- Warning for rows below minimum height -->
            {#if rowHeightWarnings().length > 0}
                <div
                    class="mt-3 p-3 bg-m3-error-container text-m3-on-error-container rounded-m3-sm text-m3-body-small flex items-start gap-2"
                >
                    <span class="text-lg leading-none">⚠️</span>
                    <span>
                        {#if rowHeightWarnings().length === 1}
                            Row {rowHeightWarnings()[0].row} is below the minimum
                            card height ({CARD_MIN_HEIGHT}px).
                        {:else}
                            Rows {rowHeightWarnings()
                                .map((w) => w.row)
                                .join(", ")} are below the minimum card height ({CARD_MIN_HEIGHT}px).
                        {/if}
                        Cards may overflow their cells.
                    </span>
                </div>
            {/if}
        </section>
    {/if}

    <!-- Gaps Section -->
    <section>
        <div class="flex items-center justify-between mb-4">
            <div>
                <h3 class="text-m3-title-small text-m3-on-surface">Gaps</h3>
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    Spacing between grid cells
                </p>
            </div>
            <button
                onclick={toggleGapLink}
                class="flex items-center gap-2 px-3 py-2 rounded-full text-m3-label-medium transition-colors
                       {gapsLinked
                    ? 'bg-m3-primary-container text-m3-on-primary-container'
                    : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest'}"
                title={gapsLinked ? "Unlink gaps" : "Link gaps"}
            >
                {#if gapsLinked}
                    <IconLink class="size-4" />
                    Linked
                {:else}
                    <IconLinkOff class="size-4" />
                    Unlinked
                {/if}
            </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div>
                <span
                    class="text-m3-label-small text-m3-on-surface-variant mb-2 block"
                >
                    Horizontal
                </span>
                <div class="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        max="64"
                        value={horizontalGap}
                        oninput={(e) =>
                            handleHorizontalGapChange(
                                parseInt(
                                    (e.target as HTMLInputElement).value,
                                ) || 0,
                            )}
                        class="w-full px-4 py-3 rounded-m3-sm bg-m3-surface-container-highest text-m3-on-surface text-m3-body-large border border-m3-outline focus:border-m3-primary focus:outline-none transition-colors"
                    />
                    <span class="text-m3-body-small text-m3-on-surface-variant"
                        >px</span
                    >
                </div>
            </div>
            <div>
                <span
                    class="text-m3-label-small text-m3-on-surface-variant mb-2 block"
                >
                    Vertical
                </span>
                <div class="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        max="64"
                        value={verticalGap}
                        oninput={(e) =>
                            handleVerticalGapChange(
                                parseInt(
                                    (e.target as HTMLInputElement).value,
                                ) || 0,
                            )}
                        disabled={gapsLinked}
                        class="w-full px-4 py-3 rounded-m3-sm bg-m3-surface-container-highest text-m3-on-surface text-m3-body-large border border-m3-outline focus:border-m3-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span class="text-m3-body-small text-m3-on-surface-variant"
                        >px</span
                    >
                </div>
            </div>
        </div>
    </section>

    <!-- Padding Section -->
    <section>
        <h3 class="text-m3-title-small text-m3-on-surface mb-4">
            Grid Padding
        </h3>
        <p class="text-m3-body-small text-m3-on-surface-variant mb-4">
            Space around the entire grid
        </p>

        <div class="flex items-center gap-4">
            <input
                type="range"
                min="0"
                max="48"
                step="4"
                bind:value={padding}
                class="flex-1 h-2 bg-m3-surface-container-highest rounded-full appearance-none cursor-pointer accent-m3-primary"
            />
            <span
                class="text-m3-body-medium text-m3-on-surface w-16 text-right tabular-nums"
            >
                {padding}px
            </span>
        </div>
    </section>

    {#snippet actions()}
        <Button variant="text" onclick={handleReset}>Reset</Button>
        <div class="flex gap-3">
            <Button variant="outlined" onclick={handleClose}>Cancel</Button>
            <Button variant="filled" onclick={handleApply}>Apply</Button>
        </div>
    {/snippet}
</SideSheet>

<style>
    /* Custom range slider styling */
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--m3-primary);
        cursor: pointer;
        border: 2px solid var(--m3-surface);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--m3-primary);
        cursor: pointer;
        border: 2px solid var(--m3-surface);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
</style>
