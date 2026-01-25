<script lang="ts">
    import {
        discoverRoutes,
        type RouteOption,
    } from "$lib/utils/routeDiscovery";
    import IconSearch from "~icons/material-symbols/search";
    import IconArrowDropDown from "~icons/material-symbols/arrow-drop-down";
    import IconRoute from "~icons/material-symbols/route";

    interface Props {
        label: string;
        value?: string;
        placeholder?: string;
        class?: string;
    }

    let {
        label,
        value = $bindable(""),
        placeholder = "/dashboard/living-room",
        class: className = "",
    }: Props = $props();

    let inputElement: HTMLInputElement;
    let isOpen = $state(false);
    let isFocused = $state(false);
    let highlightedIndex = $state(-1);
    let searchQuery = $state("");

    // Track if floating (focused or has value)
    let hasValue = $derived(value && value.length > 0);
    let isFloating = $derived(isFocused || hasValue);

    // Get all available routes
    let allRoutes = $derived(discoverRoutes());

    // Filter routes based on search query
    let filteredRoutes = $derived.by(() => {
        if (!searchQuery) return allRoutes.slice(0, 50);

        const query = searchQuery.toLowerCase();
        return allRoutes
            .filter(
                (route) =>
                    route.path.toLowerCase().includes(query) ||
                    route.label.toLowerCase().includes(query),
            )
            .slice(0, 50);
    });

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
        const routes = filteredRoutes;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                highlightedIndex = Math.min(
                    highlightedIndex + 1,
                    routes.length - 1,
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                highlightedIndex = Math.max(highlightedIndex - 1, 0);
                break;
            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0 && routes[highlightedIndex]) {
                    selectRoute(routes[highlightedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                isOpen = false;
                inputElement?.blur();
                break;
        }
    }

    // Select a route
    function selectRoute(route: RouteOption) {
        value = route.path;
        searchQuery = route.path;
        isOpen = false;
        highlightedIndex = -1;
    }
</script>

<!-- MD3 Outlined RoutePicker -->
<div class="relative flex flex-col gap-1 w-full {className}">
    <div class="relative min-h-[56px]">
        <fieldset
            class="absolute inset-0 m-0 px-2 pointer-events-none rounded-[4px] transition-colors duration-200
                   {isFocused
                ? 'border-2 border-m3-primary'
                : 'border border-m3-outline'}"
            style="padding-top: 0; top: -5px; bottom: 0;"
        >
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

        <div class="relative flex items-center min-h-[56px]">
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

            <button
                class="pr-3 pl-2 text-m3-on-surface-variant hover:text-m3-on-surface transition-colors focus:outline-none"
                onclick={() => {
                    if (isOpen) {
                        isOpen = false;
                    } else {
                        inputElement?.focus();
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
    {#if isOpen}
        <div
            class="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto
                   bg-m3-surface-container-high rounded-m3-md shadow-lg border border-m3-outline-variant"
        >
            {#if filteredRoutes.length > 0}
                {#each filteredRoutes as route, index}
                    <button
                        type="button"
                        class="w-full px-4 py-3 text-left transition-colors flex items-center gap-3
                               {highlightedIndex === index
                            ? 'bg-m3-primary/10'
                            : 'hover:bg-m3-on-surface/5'}"
                        onmouseenter={() => (highlightedIndex = index)}
                        onclick={() => selectRoute(route)}
                    >
                        <div
                            class="size-8 rounded-full bg-m3-surface-container-highest flex items-center justify-center shrink-0"
                        >
                            <IconRoute class="size-4 opacity-70" />
                        </div>
                        <div class="flex flex-col min-w-0">
                            <span
                                class="text-m3-body-medium text-m3-on-surface truncate"
                            >
                                {route.label}
                            </span>
                            <span
                                class="text-m3-body-small text-m3-on-surface-variant opacity-60 truncate"
                            >
                                {route.path} • {route.category}
                            </span>
                        </div>
                    </button>
                {/each}
            {:else}
                <div class="px-4 py-8 text-center bg-m3-surface-container-high">
                    <p
                        class="text-m3-body-medium text-m3-on-surface-variant opacity-70"
                    >
                        No matching routes found
                    </p>
                    <p
                        class="text-[10px] uppercase tracking-wider font-bold mt-1 opacity-40"
                    >
                        Try a different search term
                    </p>
                </div>
            {/if}
        </div>
    {/if}
</div>
