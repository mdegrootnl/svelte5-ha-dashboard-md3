<script lang="ts">
    import { page } from "$app/stores";
    import { themeStore } from "$lib/stores/theme.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import LightMode from "~icons/material-symbols/light-mode";
    import DarkMode from "~icons/material-symbols/dark-mode";
    import { getRoutePath, withBase } from "$lib/utils/appBase";

    let currentPath = $derived(getRoutePath($page.url.pathname));
</script>

<nav
    class="relative z-50 flex flex-col items-center py-8 w-20 bg-m3-surface/82 border-r border-m3-outline-variant h-full gap-4 backdrop-blur-md"
    aria-label={themeStore.t("nav.primary")}
>
    {#each themeStore.navigationItems as link (link.id)}
        {@const isActive =
            currentPath === link.href ||
            (currentPath === "/" && link.href === "/dashboard") ||
            (link.href !== "/" && currentPath.startsWith(link.href))}
        {@const label = themeStore.navigationLabel(link)}

        <a
            href={withBase(link.href)}
            class="flex min-h-16 flex-col items-center justify-center gap-1 group no-underline text-center w-full touch-manipulation px-1"
            aria-current={isActive ? "page" : undefined}
            title={label}
        >
            <div
                class="
				relative flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-200
				{isActive
                    ? 'bg-m3-secondary-container'
                    : 'group-hover:bg-m3-surface-container-highest'}
			"
            >
                <DynamicIcon
                    name={link.icon}
                    class="size-6 transition-colors {isActive
                        ? 'text-m3-on-secondary-container'
                        : 'text-m3-on-surface-variant'}"
                />
            </div>

            <span
                class="nav-label text-center text-m3-label-medium font-medium transition-colors {isActive
                    ? 'text-m3-on-surface'
                    : 'text-m3-on-surface-variant'}"
            >
                {label}
            </span>
        </a>
    {/each}

    <!-- Dark Mode Toggle -->
    <div class="mt-auto mb-4 w-full flex justify-center">
        <button
            onclick={() => themeStore.toggleDark()}
            class="flex items-center justify-center w-12 h-12 rounded-full transition-colors hover:bg-m3-surface-container-highest text-m3-on-surface-variant hover:text-m3-primary"
            aria-label={themeStore.t("nav.darkMode")}
        >
            {#if themeStore.isDark}
                <LightMode class="w-6 h-6" />
            {:else}
                <DarkMode class="w-6 h-6" />
            {/if}
        </button>
    </div>
</nav>

<style>
    .nav-label {
        display: block;
        max-width: 4.75rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
