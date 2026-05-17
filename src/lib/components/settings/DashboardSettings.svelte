<script lang="ts">
    import { dashboardStore, DashboardStore } from "$lib/features/dashboard/stores/dashboard.svelte";
    import { haRegistryStore } from "$lib/stores/haRegistry.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import IconButton from "$lib/components/md3/IconButton.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import IconPicker from "$lib/components/common/IconPicker.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { DashboardPage, RoomDashboardConfig } from "$lib/types/dashboard";

    import Add from "~icons/material-symbols/add";
    import Delete from "~icons/material-symbols/delete";
    import Edit from "~icons/material-symbols/edit";
    import OpenInNew from "~icons/material-symbols/open-in-new";

    interface DashboardEntry {
        configId: string;
        pageId?: string;
        name: string;
        icon: string;
        path: string;
        href: string;
        sourceLabel: string;
        canEditPath: boolean;
        canDelete: boolean;
    }

    interface EditableDashboardEntry {
        configId: string;
        pageId?: string;
        name: string;
        path: string;
        icon: string;
        canEditPath: boolean;
    }

    let editingEntry = $state<EditableDashboardEntry | null>(null);
    let isIconPickerOpen = $state(false);

    let dashboardEntries = $derived.by(() => getDashboardEntries());

    function normalizeDashboardPath(path: string) {
        return path
            .trim()
            .replace(/^\/+/, "")
            .replace(/^dashboard\/?/, "")
            .replace(/\/+$/, "");
    }

    function getDashboardHref(path: string) {
        return path ? `/dashboard/${path}` : "/dashboard";
    }

    function getPageForConfig(configId: string) {
        return dashboardStore.pages.find(
            (page) => DashboardStore.deriveConfigIdFromPath(page.path) === configId,
        );
    }

    function getGeneratedPath(configId: string) {
        if (configId === "dashboard_home") return "";

        const matchingFloor = haRegistryStore.floors.find(
            (floor) => DashboardStore.deriveConfigId(floor.floor_id) === configId,
        );
        if (matchingFloor) return matchingFloor.floor_id;

        const matchingArea = haRegistryStore.areas.find(
            (area) =>
                DashboardStore.deriveConfigId(area.floor_id || "unassigned", area.area_id) ===
                configId,
        );
        if (matchingArea) {
            return `${matchingArea.floor_id || "unassigned"}/${matchingArea.area_id}`;
        }

        if (configId.startsWith("dashboard_floor_")) {
            return configId.replace("dashboard_floor_", "");
        }

        return "";
    }

    function getDashboardEntries(): DashboardEntry[] {
        const entries = Object.values(dashboardStore.savedConfigs).map((config) => {
            const page = getPageForConfig(config.id);
            const path = page?.path ?? getGeneratedPath(config.id);
            const isHome = config.id === "dashboard_home";
            const isCustom = Boolean(page);

            return {
                configId: config.id,
                pageId: page?.id,
                name: page?.name || config.name || "Dashboard",
                icon: page?.icon || config.icon || "dashboard",
                path,
                href: getDashboardHref(path),
                sourceLabel: isHome ? "Main" : isCustom ? "Custom" : "Generated",
                canEditPath: isCustom,
                canDelete: !isHome,
            };
        });

        for (const page of dashboardStore.pages) {
            const configId = DashboardStore.deriveConfigIdFromPath(page.path);
            if (entries.some((entry) => entry.configId === configId)) continue;

            entries.push({
                configId,
                pageId: page.id,
                name: page.name,
                icon: page.icon || "dashboard",
                path: page.path,
                href: getDashboardHref(page.path),
                sourceLabel: "Custom",
                canEditPath: true,
                canDelete: true,
            });
        }

        return entries.sort((a, b) => {
            if (a.configId === "dashboard_home") return -1;
            if (b.configId === "dashboard_home") return 1;
            return a.name.localeCompare(b.name);
        });
    }

    function handleAdd() {
        const newPage = dashboardStore.addPage(
            "New Dashboard",
            "new-dashboard",
            "dashboard",
        );
        const configId = DashboardStore.deriveConfigIdFromPath(newPage.path);
        editingEntry = {
            configId,
            pageId: newPage.id,
            name: newPage.name,
            path: newPage.path,
            icon: newPage.icon || "dashboard",
            canEditPath: true,
        };
    }

    function handleDelete(entry: DashboardEntry) {
        if (!entry.canDelete) return;

        if (entry.pageId) {
            dashboardStore.deletePage(entry.pageId, true);
            if (editingEntry?.pageId === entry.pageId) editingEntry = null;
            return;
        }

        dashboardStore.deleteConfig(entry.configId);
        if (editingEntry?.configId === entry.configId) editingEntry = null;
    }

    function handleSaveEdit() {
        if (!editingEntry) return;

        const name = editingEntry.name.trim() || "Dashboard";
        const path = normalizeDashboardPath(editingEntry.path);
        const icon = editingEntry.icon || "dashboard";

        if (editingEntry.pageId) {
            dashboardStore.updatePage(editingEntry.pageId, {
                name,
                path,
                icon,
            });
        } else {
            dashboardStore.updateDashboardMetadata(editingEntry.configId, {
                name,
                icon,
            });
        }

        editingEntry = null;
    }

    function handleCancelEdit() {
        editingEntry = null;
    }

    function startEditing(entry: DashboardEntry) {
        editingEntry = {
            configId: entry.configId,
            pageId: entry.pageId,
            name: entry.name,
            path: entry.path,
            icon: entry.icon,
            canEditPath: entry.canEditPath,
        };
    }

    function openIconPicker() {
        if (editingEntry) {
            isIconPickerOpen = true;
        }
    }

    function handleIconSelect(icon: string) {
        if (editingEntry) {
            editingEntry.icon = icon;
        }
        isIconPickerOpen = false;
    }
</script>

<div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-col">
            <span class="text-m3-title-medium text-m3-on-surface">Dashboards</span>
            <p class="text-m3-body-small text-m3-on-surface-variant">
                Manage generated dashboards and custom dashboard routes.
            </p>
        </div>
        <Button variant="tonal" icon={Add} onclick={handleAdd}>Add Custom Page</Button>
    </div>

    <div class="flex flex-col gap-2">
        {#each dashboardEntries as entry (entry.configId)}
            <div
                class="flex items-center gap-3 rounded-lg border border-m3-outline-variant bg-m3-surface p-3 transition-colors hover:bg-m3-surface-container-low"
            >
                <div
                    class="flex size-10 shrink-0 items-center justify-center rounded-full bg-m3-primary-container text-m3-on-primary-container"
                >
                    <DynamicIcon name={entry.icon || "dashboard"} class="size-5" />
                </div>

                <div class="min-w-0 flex-1">
                    <div class="truncate text-m3-body-large font-medium text-m3-on-surface">
                        {entry.name}
                    </div>
                    <div class="flex flex-wrap items-center gap-2 text-m3-body-small text-m3-on-surface-variant">
                        <span class="truncate">{entry.href}</span>
                        <span class="rounded-m3-full bg-m3-surface-container-high px-2 py-0.5 text-m3-label-small">
                            {entry.sourceLabel}
                        </span>
                    </div>
                </div>

                <div class="flex shrink-0 gap-1">
                    <a
                        href={entry.href}
                        class="rounded-full p-2 transition-colors hover:bg-m3-surface-container-highest"
                        title="Open dashboard"
                    >
                        <OpenInNew class="size-5 text-m3-on-surface-variant" />
                    </a>
                    <IconButton
                        icon={Edit}
                        onclick={() => startEditing(entry)}
                        title="Edit dashboard"
                    />
                    {#if entry.canDelete}
                        <IconButton
                            icon={Delete}
                            onclick={() => handleDelete(entry)}
                            class="text-m3-error transition-colors hover:bg-m3-error/10"
                            title="Delete dashboard"
                        />
                    {/if}
                </div>
            </div>
        {:else}
            <div
                class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-m3-outline-variant p-8 text-center opacity-60"
            >
                <DynamicIcon name="dashboard_customize" class="mb-2 size-10" />
                <p class="text-m3-body-medium">
                    No dashboards yet. Generate one or add a custom page.
                </p>
            </div>
        {/each}
    </div>

    {#if editingEntry}
        <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
            <div
                class="flex w-full max-w-md flex-col gap-6 rounded-xl bg-m3-surface-container-high p-6 shadow-xl"
            >
                <h3 class="text-m3-title-large text-m3-on-surface">
                    Edit Dashboard
                </h3>

                <div class="flex flex-col gap-4">
                    <TextField
                        label="Name"
                        bind:value={editingEntry.name}
                        placeholder="e.g. Living Room"
                    />
                    <TextField
                        label="Path"
                        bind:value={editingEntry.path}
                        placeholder="e.g. ground/kitchen"
                        disabled={!editingEntry.canEditPath}
                        supportingText={editingEntry.canEditPath
                            ? "Custom dashboard route under /dashboard."
                            : "Generated dashboard routes come from Home Assistant floors and areas."}
                    />

                    <div class="flex items-end gap-4">
                        <div class="flex-1">
                            <TextField
                                label="Icon"
                                bind:value={editingEntry.icon}
                                disabled={true}
                            />
                        </div>
                        <button
                            onclick={openIconPicker}
                            class="mb-1 flex size-14 items-center justify-center rounded-lg border border-m3-outline transition-colors hover:bg-m3-surface-container-highest"
                            title="Pick icon"
                        >
                            <DynamicIcon
                                name={editingEntry.icon || "dashboard"}
                                class="size-7"
                            />
                        </button>
                    </div>
                </div>

                <div class="mt-2 flex justify-end gap-2">
                    <Button variant="text" onclick={handleCancelEdit}>Cancel</Button>
                    <Button variant="filled" onclick={handleSaveEdit}>Save Changes</Button>
                </div>
            </div>
        </div>
    {/if}

    {#if isIconPickerOpen}
        <IconPicker
            onselect={handleIconSelect}
            onclose={() => (isIconPickerOpen = false)}
        />
    {/if}
</div>
