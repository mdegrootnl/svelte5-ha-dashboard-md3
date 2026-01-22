<script lang="ts">
    import type { GridConfig } from "$lib/types/dashboard";
    import IconAdd from "~icons/material-symbols/add";
    import IconClose from "~icons/material-symbols/close";
    import IconEdit from "~icons/material-symbols/edit";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import { createEventDispatcher } from "svelte";

    interface TabItem {
        id: string;
        name: string;
        icon?: string;
    }

    interface Props {
        tabs: TabItem[];
        activeTabId: string;
        isEditing?: boolean;
    }

    let { tabs, activeTabId, isEditing = false }: Props = $props();

    const dispatch = createEventDispatcher<{
        select: string;
        add: void;
        delete: string;
        rename: { id: string; name: string };
        "rename-request": { id: string; name: string };
        "edit-icon": string;
    }>();

    function handleSelect(id: string) {
        dispatch("select", id);
    }

    function handleAdd() {
        dispatch("add");
    }

    function handleDelete(id: string, e: MouseEvent) {
        e.stopPropagation();
        dispatch("delete", id);
    }

    function handleEditIcon(id: string, e: MouseEvent) {
        e.stopPropagation();
        dispatch("edit-icon", id);
    }
</script>

<div class="flex items-center gap-2 w-full py-2">
    <div
        class="flex flex-1 items-center bg-m3-surface-container-high rounded-full h-[60px]"
    >
        {#each tabs as tab (tab.id)}
            {@const isActive = tab.id === activeTabId}
            <button
                class="
                    relative flex flex-1 items-center justify-center gap-2 px-4 h-full rounded-full transition-all whitespace-nowrap
                    {isActive
                    ? 'bg-m3-secondary-container text-m3-on-secondary-container shadow-sm'
                    : 'text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-on-surface/5'}
                "
                onclick={() => handleSelect(tab.id)}
            >
                <!-- Tab Icon -->
                <DynamicIcon name={tab.icon || "home"} class="text-xl" />

                <!-- Tab Name (hidden on mobile, icons only) -->
                {#if isEditing && isActive}
                    <span
                        class="hidden md:inline text-m3-label-large font-medium cursor-pointer hover:underline"
                        role="button"
                        tabindex="0"
                        onclick={(e) => {
                            e.stopPropagation();
                            dispatch("rename-request", {
                                id: tab.id,
                                name: tab.name,
                            });
                        }}
                        onkeydown={(e) => {
                            if (e.key === "Enter") {
                                e.stopPropagation();
                                dispatch("rename-request", {
                                    id: tab.id,
                                    name: tab.name,
                                });
                            }
                        }}
                        title="Click to rename">{tab.name}</span
                    >
                {:else}
                    <span
                        class="hidden md:inline text-m3-label-large font-medium"
                        >{tab.name}</span
                    >
                {/if}

                {#if isEditing && isActive}
                    <!-- Edit icon button (for changing the tab icon) -->
                    <div
                        role="button"
                        tabindex="0"
                        class="size-5 rounded-full hover:bg-black/10 flex items-center justify-center cursor-pointer"
                        onclick={(e) => handleEditIcon(tab.id, e)}
                        onkeydown={(e) =>
                            e.key === "Enter" &&
                            handleEditIcon(tab.id, e as unknown as MouseEvent)}
                        title="Change Icon"
                    >
                        <IconEdit class="size-3" />
                    </div>
                {/if}

                {#if isEditing && tab.name !== "Overview"}
                    <!-- Delete tab button -->
                    <div
                        role="button"
                        tabindex="0"
                        class="size-5 rounded-full hover:bg-black/10 flex items-center justify-center cursor-pointer"
                        onclick={(e) => handleDelete(tab.id, e)}
                        onkeydown={(e) =>
                            e.key === "Enter" &&
                            handleDelete(tab.id, e as unknown as MouseEvent)}
                        title="Delete Tab"
                    >
                        <IconClose class="size-3" />
                    </div>
                {/if}
            </button>
        {/each}
    </div>

    {#if isEditing}
        <button
            class="flex items-center justify-center size-12 md:size-16 rounded-full bg-m3-primary-container text-m3-on-primary-container hover:brightness-95 transition-colors shadow-sm shrink-0"
            onclick={handleAdd}
            title="Add Tab"
        >
            <IconAdd class="size-6 md:size-8" />
        </button>
    {/if}
</div>
