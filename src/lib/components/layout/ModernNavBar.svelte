<script lang="ts">
    import { page } from "$app/stores";
    import LightMode from "~icons/material-symbols/light-mode";
    import DarkMode from "~icons/material-symbols/dark-mode";
    import { themeStore } from "$lib/stores/theme.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import { getRoutePath, withBase } from "$lib/utils/appBase";

    let currentPath = $derived(getRoutePath($page.url.pathname));
</script>

<!-- 
    Modern Floating Navigation Bar
    Desktop: Vertical floating pill on the left
    Mobile: Horizontal floating pill on the bottom
-->
<div
    class="route-nav-layer pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-end p-4 pb-5 sm:p-6 sm:pb-6 xl:items-start xl:justify-center xl:pl-6 xl:pb-0"
>
    <nav
        class="
            route-nav-surface
            pointer-events-auto
            flex items-center gap-1 p-2
            bg-m3-surface-container-high/80 backdrop-blur-md
            rounded-full shadow-lg border border-m3-outline-variant
            
            /* Mobile: Horizontal */
            flex-row w-[calc(100vw-2rem)] max-w-full overflow-x-auto overscroll-x-contain sm:w-auto

            /* Desktop: Vertical */
            xl:flex-col xl:w-auto xl:h-auto xl:max-h-full xl:overflow-y-auto
        "
        aria-label={themeStore.t("nav.primary")}
    >
        {#each themeStore.navigationItems as link (link.id)}
            {@const isActive =
                currentPath === link.href ||
                (link.href !== "/" && currentPath.startsWith(link.href))}
            {@const label = themeStore.navigationLabel(link)}

            <a
                href={withBase(link.href)}
                class="
                    group relative flex items-center justify-center
                    size-12 rounded-full
                    transition-colors duration-200
                    no-underline
                    shrink-0
                    {isActive
                    ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                    : 'text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}
                "
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                title={label}
            >
                <DynamicIcon name={link.icon} class="size-6 shrink-0" />

                {#if isActive}
                    <!-- Active Indicator Dot (optional, maybe cleaner without) -->
                {/if}
            </a>
        {/each}

        <!-- Divider -->
        <div
            class="w-px h-6 xl:w-6 xl:h-px bg-m3-outline-variant opacity-50 my-0 mx-1 xl:my-1 xl:mx-0 shrink-0"
        ></div>

        <!-- Dark Mode Toggle -->
        <button
            onclick={() => themeStore.toggleDark()}
            class="
                flex items-center justify-center
                size-12 rounded-full
                transition-colors duration-200
                text-m3-on-surface-variant
                hover:bg-m3-surface-container-highest hover:text-m3-primary
                shrink-0
            "
            aria-label={themeStore.t("nav.darkMode")}
        >
            {#if themeStore.isDark}
                <LightMode class="w-6 h-6" />
            {:else}
                <DarkMode class="w-6 h-6" />
            {/if}
        </button>
    </nav>
</div>
