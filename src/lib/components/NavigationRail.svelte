<script lang="ts">
    import { page } from "$app/stores";
    import Home from "~icons/material-symbols/home";
    import LayoutDashboard from "~icons/material-symbols/dashboard";
    import Settings from "~icons/material-symbols/settings";
    import Palette from "~icons/material-symbols/palette";

    let currentPath = $derived($page.url.pathname);

    const links = [
        { href: "/", label: "Home", icon: Home },
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/theme", label: "Theme", icon: Palette },
        { href: "/settings", label: "Settings", icon: Settings },
    ];
</script>

<nav
    class="flex flex-col items-center py-8 w-20 bg-m3-surface border-r border-m3-outline-variant h-full gap-4"
>
    {#each links as link}
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
                <link.icon
                    class="w-6 h-6 transition-colors {isActive
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
</nav>
