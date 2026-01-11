<script lang="ts">
    import { haStore } from "$lib/stores/ha.svelte";
    import IconSearch from "~icons/material-symbols/search";
    import IconArrowDropDown from "~icons/material-symbols/arrow-drop-down";

    interface Props {
        label: string;
        value?: string;
        placeholder?: string;
        class?: string;
        domainFilter?: string; // Optional: filter by domain (e.g., "light", "climate")
    }

    let {
        label,
        value = $bindable(""),
        placeholder = "entity.example",
        class: className = "",
        domainFilter,
    }: Props = $props();

    let inputElement: HTMLInputElement;
    let isOpen = $state(false);
    let isFocused = $state(false);
    let highlightedIndex = $state(-1);
    let searchQuery = $state("");

    // Track if floating (focused or has value)
    let hasValue = $derived(value.length > 0);
    let isFloating = $derived(isFocused || hasValue);

    // Get all entity IDs from haStore
    let allEntityIds = $derived(Object.keys(haStore.states));

    // Filter entities based on search query and optional domain filter
    let filteredEntities = $derived.by(() => {
        let entities = allEntityIds;

        // Apply domain filter if specified
        if (domainFilter) {
            entities = entities.filter((id) =>
                id.startsWith(domainFilter + "."),
            );
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            entities = entities.filter((id) => {
                const entity = haStore.states[id];
                const friendlyName =
                    entity?.attributes?.friendly_name?.toLowerCase() || "";
                return (
                    id.toLowerCase().includes(query) ||
                    friendlyName.includes(query)
                );
            });
        }

        return entities.slice(0, 50);
    });

    // Get friendly name for an entity
    function getFriendlyName(entityId: string): string {
        const entity = haStore.states[entityId];
        return entity?.attributes?.friendly_name || entityId;
    }

    // Handle input changes
    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        searchQuery = target.value;
        value = target.value;
        isOpen = true;
        highlightedIndex = 0;
    }

    // Handle focus
    function handleFocus() {
        isFocused = true;
        searchQuery = value;
        isOpen = true;
        highlightedIndex = -1;
    }

    // Handle blur with delay to allow click selection
    function handleBlur() {
        isFocused = false;
        setTimeout(() => {
            isOpen = false;
        }, 200);
    }

    // Handle keyboard navigation
    function handleKeydown(e: KeyboardEvent) {
        const entities = filteredEntities;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                highlightedIndex = Math.min(
                    highlightedIndex + 1,
                    entities.length - 1,
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                highlightedIndex = Math.max(highlightedIndex - 1, 0);
                break;
            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0 && entities[highlightedIndex]) {
                    selectEntity(entities[highlightedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                isOpen = false;
                inputElement?.blur();
                break;
        }
    }

    // Select an entity
    function selectEntity(entityId: string) {
        value = entityId;
        searchQuery = entityId;
        isOpen = false;
        highlightedIndex = -1;
    }
</script>

<!-- MD3 Outlined EntityPicker with proper notch -->
<div class="relative flex flex-col gap-1 w-full {className}">
    <div class="relative min-h-[56px]">
        <!-- Border container using fieldset for the notch effect -->
        <fieldset
            class="absolute inset-0 m-0 px-2 pointer-events-none rounded-[4px] transition-colors duration-200
                   {isFocused
                ? 'border-2 border-m3-primary'
                : 'border border-m3-outline'}"
            style="padding-top: 0; top: -5px; bottom: 0;"
        >
            <!-- Legend creates the notch - width animates with label -->
            <legend
                class="h-[2px] overflow-hidden transition-all duration-200 px-0.5
                       {isFloating
                    ? 'text-m3-body-small'
                    : 'text-[0px] max-w-[0.01px]'}"
                style="margin-left: 8px;"
            >
                <span class="px-0.5 invisible">{label}</span>
            </legend>
        </fieldset>

        <!-- Input container -->
        <div class="relative flex items-center min-h-[56px]">
            <!-- Input wrapper -->
            <div class="relative flex-1 h-full">
                <input
                    bind:this={inputElement}
                    bind:value
                    {placeholder}
                    oninput={handleInput}
                    onfocus={handleFocus}
                    onblur={handleBlur}
                    onkeydown={handleKeydown}
                    autocomplete="off"
                    class="
                        w-full bg-transparent px-4 h-[56px]
                        text-m3-body-large text-m3-on-surface caret-m3-primary
                        outline-none placeholder-transparent
                    "
                    id="input-{label}"
                />

                <!-- Floating Label - positioned to sit on border when floating -->
                <label
                    for="input-{label}"
                    class="
                        absolute left-3 pointer-events-none
                        transition-all duration-200 origin-left
                        {isFloating
                        ? 'top-0 -translate-y-1/2 text-m3-body-small bg-m3-surface-container-high px-1'
                        : 'top-1/2 -translate-y-1/2 text-m3-body-large'}
                        {isFocused
                        ? 'text-m3-primary'
                        : 'text-m3-on-surface-variant'}
                    "
                >
                    {label}
                </label>
            </div>

            <!-- Trailing Dropdown Arrow -->
            <button
                class="pr-3 pl-2 text-m3-on-surface-variant hover:text-m3-on-surface transition-colors focus:outline-none"
                onclick={() => {
                    if (isOpen) {
                        isOpen = false;
                    } else {
                        inputElement?.focus();
                        // Focus handler will set isOpen=true
                    }
                }}
                tabindex="-1"
            >
                <IconArrowDropDown
                    class="size-6 transition-transform duration-200 {isOpen
                        ? 'rotate-180'
                        : ''}"
                />
            </button>
        </div>
    </div>

    <!-- Dropdown Suggestions -->
    {#if isOpen && filteredEntities.length > 0}
        <div
            class="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto
                   bg-m3-surface-container-high rounded-m3-md shadow-lg border border-m3-outline-variant"
        >
            {#each filteredEntities as entityId, index}
                <button
                    type="button"
                    class="w-full px-4 py-3 text-left transition-colors flex flex-col
                           {highlightedIndex === index
                        ? 'bg-m3-primary/10'
                        : 'hover:bg-m3-on-surface/5'}"
                    onmouseenter={() => (highlightedIndex = index)}
                    onclick={() => selectEntity(entityId)}
                >
                    <span class="text-m3-body-medium text-m3-on-surface">
                        {entityId}
                    </span>
                    {#if getFriendlyName(entityId) !== entityId}
                        <span
                            class="text-m3-body-small text-m3-on-surface-variant"
                        >
                            {getFriendlyName(entityId)}
                        </span>
                    {/if}
                </button>
            {/each}
        </div>
    {/if}
</div>
