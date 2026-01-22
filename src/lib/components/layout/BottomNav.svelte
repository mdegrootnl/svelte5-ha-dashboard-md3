<script lang="ts">
    import { page } from "$app/stores";
    import { themeStore } from "$lib/stores/theme.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";

    let currentPath = $derived($page.url.pathname);
</script>

<nav
    class="flex items-center justify-around w-full h-20 bg-m3-surface-container border-t border-m3-outline-variant px-2"
>
    {#each themeStore.navigationItems as link (link.id)}
        {@const isActive =
            currentPath === link.href ||
            (link.href !== "/" && currentPath.startsWith(link.href))}

        <a
            href={link.href}
            class="flex flex-col items-center gap-1 group no-underline text-center flex-1"
            aria-current={isActive ? "page" : undefined}
        >
            <div
                class="
				relative flex items-center justify-center w-16 h-8 rounded-full transition-colors duration-200
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
                class="text-m3-label-small font-medium transition-colors {isActive
                    ? 'text-m3-on-surface'
                    : 'text-m3-on-surface-variant'}"
            >
                {link.label}
            </span>
        </a>
    {/each}
</nav>
