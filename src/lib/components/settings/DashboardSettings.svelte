<script lang="ts">
    import { dashboardStore } from "$lib/features/dashboard/stores/dashboard.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import IconButton from "$lib/components/md3/IconButton.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import IconPicker from "$lib/components/common/IconPicker.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import type { DashboardPage } from "$lib/types/dashboard";
    import { generateUUID } from "$lib/utils/uuid";

    import Add from "~icons/material-symbols/add";
    import Delete from "~icons/material-symbols/delete";
    import Edit from "~icons/material-symbols/edit";
    import OpenInNew from "~icons/material-symbols/open-in-new";

    let editingPage = $state<DashboardPage | null>(null);
    let isIconPickerOpen = $state(false);

    function handleAdd() {
        const newPage = dashboardStore.addPage(
            "New Dashboard",
            "new-dashboard",
            "dashboard",
        );
        editingPage = { ...newPage };
    }

    function handleDelete(id: string) {
        dashboardStore.deletePage(id);
        if (editingPage?.id === id) editingPage = null;
    }

    function handleSaveEdit() {
        if (!editingPage) return;
        dashboardStore.updatePage(editingPage.id, {
            name: editingPage.name,
            path: editingPage.path,
            icon: editingPage.icon,
        });
        editingPage = null;
    }

    function handleCancelEdit() {
        editingPage = null;
    }

    function startEditing(page: DashboardPage) {
        // Clone to avoid direct mutation before save
        editingPage = { ...page };
    }

    function openIconPicker() {
        if (editingPage) {
            isIconPickerOpen = true;
        }
    }

    function handleIconSelect(icon: string) {
        if (editingPage) {
            editingPage.icon = icon;
        }
        isIconPickerOpen = false;
    }
</script>

<div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
        <div class="flex flex-col">
            <span class="text-m3-title-medium text-m3-on-surface"
                >Custom Dashboards</span
            >
            <p class="text-m3-body-small text-m3-on-surface-variant">
                Manage your custom dashboard routes and navigation.
            </p>
        </div>
        <Button variant="tonal" icon={Add} onclick={handleAdd}>Add Page</Button>
    </div>

    <!-- List -->
    <div class="flex flex-col gap-2">
        {#each dashboardStore.pages as page (page.id)}
            <div
                class="flex items-center gap-3 p-3 rounded-lg border border-m3-outline-variant bg-m3-surface hover:bg-m3-surface-container-low transition-colors"
            >
                <div
                    class="w-10 h-10 rounded-full bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center shrink-0"
                >
                    <DynamicIcon
                        name={page.icon || "dashboard"}
                        class="text-xl"
                    />
                </div>

                <div class="flex-1 min-w-0">
                    <div
                        class="text-m3-body-large text-m3-on-surface font-medium truncate"
                    >
                        {page.name}
                    </div>
                    <div
                        class="text-m3-body-small text-m3-on-surface-variant truncate"
                    >
                        /dashboard/{page.path}
                    </div>
                </div>

                <div class="flex gap-1 shrink-0">
                    <a
                        href="/dashboard/{page.path}"
                        class="p-2 rounded-full hover:bg-m3-surface-container-highest transition-colors"
                        title="Open Dashboard"
                    >
                        <OpenInNew class="size-5 text-m3-on-surface-variant" />
                    </a>
                    <IconButton
                        icon={Edit}
                        onclick={() => startEditing(page)}
                        title="Edit Page"
                    />
                    <IconButton
                        icon={Delete}
                        onclick={() => handleDelete(page.id)}
                        class="text-m3-error hover:bg-m3-error/10 transition-colors"
                        title="Delete Page"
                    />
                </div>
            </div>
        {:else}
            <div
                class="p-8 border-2 border-dashed border-m3-outline-variant rounded-xl flex flex-col items-center justify-center text-center opacity-60"
            >
                <DynamicIcon name="dashboard_customize" class="text-4xl mb-2" />
                <p class="text-m3-body-medium">
                    No custom dashboards yet. Add one to get started.
                </p>
            </div>
        {/each}
    </div>

    <!-- Edit Dialog -->
    {#if editingPage}
        <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
            <div
                class="bg-m3-surface-container-high rounded-xl p-6 w-full max-w-md shadow-xl flex flex-col gap-6"
            >
                <h3 class="text-m3-title-large text-m3-on-surface">
                    Edit Dashboard Page
                </h3>

                <div class="flex flex-col gap-4">
                    <TextField
                        label="Name"
                        bind:value={editingPage.name}
                        placeholder="e.g. Living Room"
                    />
                    <TextField
                        label="Path"
                        bind:value={editingPage.path}
                        placeholder="e.g. living-room"
                    />

                    <div class="flex gap-4 items-end">
                        <div class="flex-1">
                            <TextField
                                label="Icon"
                                bind:value={editingPage.icon}
                                disabled={true}
                            />
                        </div>
                        <button
                            onclick={openIconPicker}
                            class="w-14 h-14 rounded-lg border border-m3-outline flex items-center justify-center hover:bg-m3-surface-container-highest transition-colors mb-1"
                            title="Pick Icon"
                        >
                            <DynamicIcon
                                name={editingPage.icon || "dashboard"}
                                class="text-2xl"
                            />
                        </button>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-2">
                    <Button variant="text" onclick={handleCancelEdit}
                        >Cancel</Button
                    >
                    <Button variant="filled" onclick={handleSaveEdit}
                        >Save Changes</Button
                    >
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
