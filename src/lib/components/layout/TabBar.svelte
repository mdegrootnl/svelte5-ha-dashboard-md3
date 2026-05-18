<script lang="ts">
    import IconAdd from "~icons/material-symbols/add";
    import IconClose from "~icons/material-symbols/close";
    import IconEdit from "~icons/material-symbols/edit";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";

    interface TabItem {
        id: string;
        name: string;
        icon?: string;
    }

    interface Props {
        tabs: TabItem[];
        activeTabId: string;
        isEditing?: boolean;
        onselect?: (id: string) => void;
        onadd?: () => void;
        ondelete?: (id: string) => void;
        onrename?: (data: { id: string; name: string }) => void;
        onrenamerequest?: (data: { id: string; name: string }) => void;
        onediticon?: (id: string) => void;
    }

    let {
        tabs,
        activeTabId,
        isEditing = false,
        onselect,
        onadd,
        ondelete,
        onrename,
        onrenamerequest,
        onediticon,
    }: Props = $props();

    function handleSelect(id: string) {
        onselect?.(id);
    }

    function handleAdd() {
        onadd?.();
    }

    function handleDelete(id: string, e: MouseEvent) {
        e.stopPropagation();
        ondelete?.(id);
    }

    function handleEditIcon(id: string, e: MouseEvent) {
        e.stopPropagation();
        onediticon?.(id);
    }
</script>

<div class="flex min-w-0 items-center gap-2 w-full py-2">
    <div
        class="flex h-[60px] flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden bg-m3-surface-container-high p-1"
        style:border-radius="var(--radius-m3-tab-pill)"
    >
        {#each tabs as tab (tab.id)}
            {@const isActive = tab.id === activeTabId}
            <button
                class="
                    relative flex h-full min-w-[3.75rem] flex-none items-center justify-center gap-2 whitespace-nowrap px-3 transition-all sm:min-w-[8rem] sm:flex-1 sm:px-4
                    {isActive
                    ? 'bg-m3-secondary-container text-m3-on-secondary-container shadow-sm'
                    : 'text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-on-surface/5'}
                "
                style:border-radius="var(--radius-m3-tab-pill)"
                onclick={() => handleSelect(tab.id)}
            >
                <!-- Tab Icon -->
                <DynamicIcon name={tab.icon || "home"} class="size-5 shrink-0" />

                <!-- Tab Name -->
                {#if isEditing && isActive}
                    <span
                        class="hidden truncate text-m3-label-large font-medium cursor-pointer hover:underline sm:inline"
                        role="button"
                        tabindex="0"
                        onclick={(e) => {
                            e.stopPropagation();
                            onrenamerequest?.({
                                id: tab.id,
                                name: tab.name,
                            });
                        }}
                        onkeydown={(e) => {
                            if (e.key === "Enter") {
                                e.stopPropagation();
                                onrenamerequest?.({
                                    id: tab.id,
                                    name: tab.name,
                                });
                            }
                        }}
                        title="Click to rename">{tab.name}</span
                    >
                {:else}
                    <span
                        class="hidden truncate text-m3-label-large font-medium sm:inline"
                        >{tab.name}</span
                    >
                {/if}

                {#if isEditing && isActive}
                    <!-- Edit icon button (for changing the tab icon) -->
                    <div
                        role="button"
                        tabindex="0"
                        class="touch-hitbox size-5 rounded-full hover:bg-black/10 flex items-center justify-center cursor-pointer"
                        aria-label="Change tab icon"
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
                        class="touch-hitbox size-5 rounded-full hover:bg-black/10 flex items-center justify-center cursor-pointer"
                        aria-label="Delete tab"
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
            class="flex items-center justify-center size-12 md:size-16 bg-m3-primary-container text-m3-on-primary-container hover:brightness-95 transition-colors shadow-sm shrink-0"
            style:border-radius="var(--radius-m3-tab-pill)"
            onclick={handleAdd}
            title="Add Tab"
        >
            <IconAdd class="size-6 md:size-8" />
        </button>
    {/if}
</div>
