<script lang="ts">
    import { page } from "$app/stores";
    import { themeStore } from "$lib/stores/theme.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import LightMode from "~icons/material-symbols/light-mode";
    import DarkMode from "~icons/material-symbols/dark-mode";

    let currentPath = $derived($page.url.pathname);
</script>

<nav
    class="relative z-50 flex flex-col items-center py-8 w-20 bg-m3-surface border-r border-m3-outline-variant h-full gap-4"
>
    {#each themeStore.navigationItems as link (link.id)}
        {@const isActive =
            currentPath === link.href ||
            (link.href !== "/" && currentPath.startsWith(link.href))}

        <a
            href={link.href}
            class="flex flex-col items-center gap-1 group no-underline text-center w-full"
            aria-current={isActive ? "page" : undefined}
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
                    class="transition-colors text-2xl {isActive
                        ? 'text-m3-on-secondary-container'
                        : 'text-m3-on-surface-variant'}"
                />
            </div>

            <span
                class="text-m3-label-medium font-medium transition-colors {isActive
                    ? 'text-m3-on-surface'
                    : 'text-m3-on-surface-variant'}"
            >
                {link.label}
            </span>
        </a>
    {/each}

    <!-- Dark Mode Toggle -->
    <div class="mt-auto mb-4 w-full flex justify-center">
        <button
            onclick={() => themeStore.toggleDark()}
            class="flex items-center justify-center w-12 h-12 rounded-full transition-colors hover:bg-m3-surface-container-highest text-m3-on-surface-variant hover:text-m3-primary"
            aria-label="Toggle Dark Mode"
        >
            {#if themeStore.isDark}
                <LightMode class="w-6 h-6" />
            {:else}
                <DarkMode class="w-6 h-6" />
            {/if}
        </button>
    </div>
</nav>
