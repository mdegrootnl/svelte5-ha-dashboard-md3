<script lang="ts">
    import { page } from "$app/stores";
    import { themeStore } from "$lib/stores/theme.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";

    let currentPath = $derived($page.url.pathname);
</script>

<nav
    class="flex h-20 w-full items-center gap-1 overflow-x-auto overscroll-x-contain bg-m3-surface-container/88 border-t border-m3-outline-variant px-2 backdrop-blur-md"
    aria-label="Primary navigation"
>
    {#each themeStore.navigationItems as link (link.id)}
        {@const isActive =
            currentPath === link.href ||
            (link.href !== "/" && currentPath.startsWith(link.href))}

        <a
            href={link.href}
            class="group flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 no-underline text-center"
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
                    class="size-6 shrink-0 transition-colors {isActive
                        ? 'text-m3-on-secondary-container'
                        : 'text-m3-on-surface-variant'}"
                />
            </div>

            <span
                class="max-w-[4.25rem] truncate text-m3-label-small font-medium transition-colors {isActive
                    ? 'text-m3-on-surface'
                    : 'text-m3-on-surface-variant'}"
            >
                {link.label}
            </span>
        </a>
    {/each}
</nav>
