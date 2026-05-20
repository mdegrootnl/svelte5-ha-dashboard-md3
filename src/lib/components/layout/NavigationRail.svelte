<script lang="ts">
    import { page } from "$app/stores";
    import { themeStore } from "$lib/stores/theme.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import LightMode from "~icons/material-symbols/light-mode";
    import DarkMode from "~icons/material-symbols/dark-mode";
    import { getRoutePath, withBase } from "$lib/utils/appBase";

    let currentPath = $derived(getRoutePath($page.url.pathname));

    function detectTextOverflow(node: HTMLElement, _label = "") {
        let frame = 0;
        const scheduleFrame =
            typeof requestAnimationFrame === "function"
                ? requestAnimationFrame
                : (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
        const cancelFrame =
            typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : window.clearTimeout;

        function measure() {
            cancelFrame(frame);
            frame = scheduleFrame(() => {
                const wasOverflowing = node.dataset.overflowing;
                delete node.dataset.overflowing;
                const isOverflowing = node.scrollWidth > node.clientWidth + 1;

                if (isOverflowing) {
                    node.dataset.overflowing = "true";
                } else if (wasOverflowing) {
                    delete node.dataset.overflowing;
                }
            });
        }

        const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
        observer?.observe(node);
        measure();

        return {
            update(_nextLabel: string) {
                measure();
            },
            destroy() {
                cancelFrame(frame);
                observer?.disconnect();
            },
        };
    }
</script>

<nav
    class="relative z-50 flex flex-col items-center py-8 w-20 bg-m3-surface/82 border-r border-m3-outline-variant h-full gap-4 backdrop-blur-md"
    aria-label={themeStore.t("nav.primary")}
>
    {#each themeStore.navigationItems as link (link.id)}
        {@const isActive =
            currentPath === link.href ||
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
                use:detectTextOverflow={label}
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
        max-width: min(4.5rem, 100%);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :global(.nav-label[data-overflowing="true"]) {
        display: -webkit-box;
        line-clamp: 2;
        line-height: 1.08;
        overflow-wrap: anywhere;
        text-overflow: clip;
        white-space: normal;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
    }
</style>
