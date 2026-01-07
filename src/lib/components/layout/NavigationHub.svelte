<script lang="ts">
    import { Button } from "$lib";
    import type { HAArea, HAFloor } from "$lib/types/dashboard";
    import IconDoorOpen from "~icons/material-symbols/door-open";
    import IconStairs from "~icons/material-symbols/stairs";

    interface Props {
        floors: HAFloor[];
        areas: HAArea[];
    }

    let { floors = [], areas = [] }: Props = $props();

    // Derived state for organized grouping
    let groupedAreas = $derived.by(() => {
        // Create map of floor_id -> [areas]
        const map = new Map<string, HAArea[]>();
        const unassigned: HAArea[] = [];

        // Sort floors by level (ascending or descending?) Usually Ground is 0.
        // Let's sort ascending (Basement to Attic) or descending?
        // Let's rely on the floors array order if not sorted.
        // But typically we want ordered.

        areas.forEach((area: HAArea) => {
            if (area.floor_id) {
                if (!map.has(area.floor_id)) {
                    map.set(area.floor_id, []);
                }
                map.get(area.floor_id)?.push(area);
            } else {
                unassigned.push(area);
            }
        });

        // Sort areas alphabetically
        map.forEach((areas) =>
            areas.sort((a, b) => a.name.localeCompare(b.name)),
        );
        unassigned.sort((a, b) => a.name.localeCompare(b.name));

        return { map, unassigned };
    });

    let sortedFloors = $derived(
        [...floors].sort((a, b) => (a.level ?? 0) - (b.level ?? 0)),
    );
</script>

<div class="flex flex-col gap-8 w-full">
    <!-- Floors -->
    {#each sortedFloors as floor (floor.floor_id)}
        {@const floorAreas = groupedAreas.map.get(floor.floor_id) || []}
        {#if floorAreas.length > 0}
            <section class="flex flex-col gap-4">
                <div class="flex items-center gap-3 text-m3-primary">
                    <IconStairs class="text-2xl" />
                    <h2 class="text-m3-headline-small text-m3-on-surface">
                        {floor.name}
                    </h2>
                </div>

                <div
                    class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
                >
                    {#each floorAreas as area (area.area_id)}
                        <a
                            href="/dashboard/{floor.floor_id}/{area.area_id}"
                            class="no-underline"
                        >
                            <div
                                class="flex flex-col items-center justify-center gap-3 p-4
                                       bg-m3-surface-container-low hover:bg-m3-surface-container-high
                                       active:bg-m3-surface-container-highest
                                       rounded-m3-xl transition-colors cursor-pointer group h-28 border border-transparent hover:border-m3-outline-variant"
                            >
                                <div
                                    class="text-m3-primary group-hover:scale-110 transition-transform"
                                >
                                    {#if area.icon}
                                        <span
                                            class="iconify text-3xl"
                                            data-icon={area.icon}
                                        ></span>
                                    {:else}
                                        <IconDoorOpen class="text-3xl" />
                                    {/if}
                                </div>
                                <span
                                    class="text-m3-label-large text-m3-on-surface text-center line-clamp-2"
                                >
                                    {area.name}
                                </span>
                            </div>
                        </a>
                    {/each}
                </div>
            </section>
        {/if}
    {/each}

    <!-- Unassigned Areas -->
    {#if groupedAreas.unassigned.length > 0}
        <section class="flex flex-col gap-4">
            <div class="flex items-center gap-3 text-m3-secondary">
                <IconDoorOpen class="text-2xl" />
                <h2 class="text-m3-headline-small text-m3-on-surface">
                    Other Areas
                </h2>
            </div>
            <div
                class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
            >
                {#each groupedAreas.unassigned as area (area.area_id)}
                    <!-- For unassigned, we might not have a floor. Route expects /dashboard/[floor]/[room] ??? -->
                    <!-- Wait, if we link to /dashboard/unassigned/room, will it work? -->
                    <!-- The route is /dashboard/[floor]/[room]. The parameters are purely strings. -->
                    <!-- We can use 'general' or 'home' as floor? -->
                    <!-- Let's use 'general' as fallback floor ID. -->
                    <a
                        href="/dashboard/general/{area.area_id}"
                        class="no-underline"
                    >
                        <div
                            class="flex flex-col items-center justify-center gap-3 p-4
                                       bg-m3-surface-container-low hover:bg-m3-surface-container-high
                                       active:bg-m3-surface-container-highest
                                       rounded-m3-xl transition-colors cursor-pointer group h-28 border border-transparent hover:border-m3-outline-variant"
                        >
                            <div
                                class="text-m3-secondary group-hover:scale-110 transition-transform"
                            >
                                <IconDoorOpen class="text-3xl" />
                            </div>
                            <span
                                class="text-m3-label-large text-m3-on-surface text-center line-clamp-2"
                            >
                                {area.name}
                            </span>
                        </div>
                    </a>
                {/each}
            </div>
        </section>
    {/if}
</div>
