<script lang="ts">
    import { onMount } from "svelte";
    import {
        haStore,
        maStore,
        themeStore,
        Button,
        TextField,
        Card,
        PageShell,
        Radio,
    } from "$lib";
    import Link from "~icons/material-symbols/link";
    import LinkOff from "~icons/material-symbols/link-off";
    import CheckCircle from "~icons/material-symbols/check-circle";
    import NavigationEditor from "$lib/components/settings/NavigationEditor.svelte";
    import TabBar from "$lib/components/layout/TabBar.svelte";
    import Error from "~icons/material-symbols/error";
    import Sync from "~icons/material-symbols/sync";
    import Warning from "~icons/material-symbols/warning";
    import Key from "~icons/material-symbols/key";
    import OpenInNew from "~icons/material-symbols/open-in-new";
    import MusicIcon from "~icons/material-symbols/music-note";
    import Palette from "~icons/material-symbols/palette";
    import LockClock from "~icons/material-symbols/lock-clock";
    import ImagePicker from "$lib/components/settings/ImagePicker.svelte";
    import { Switch } from "$lib";
    import { lockScreenStore } from "$lib/features/lockscreen/stores/lockscreen.svelte";
    import DashboardSettings from "$lib/components/settings/DashboardSettings.svelte";
    import DashboardIcon from "~icons/material-symbols/dashboard";

    let host = $state("http://homeassistant.local");
    let port = $state("8123");
    let token = ""; // Local variable for internal use if needed, but removing from state
    let loading = $state(false);
    let error = $state<string | null>(null);

    onMount(async () => {
        const lastUrl = await haStore.getLastUsedUrl();
        if (lastUrl) {
            try {
                const url = new URL(lastUrl);
                // If it's a standard URL, extract host and port
                // Handle protocol correctly as requested
                host = `${url.protocol}//${url.hostname}`;

                if (url.port) {
                    port = url.port;
                } else {
                    port = url.protocol === "https:" ? "443" : "80";
                }

                console.log(
                    "Persistence: Loaded last used URL:",
                    lastUrl,
                    "Parsed to:",
                    host,
                    port,
                );
            } catch (e) {
                console.error("Failed to parse last used URL:", lastUrl, e);
                // Fallback to simple split if URL parsing fails (for edge cases)
                if (lastUrl.includes("://")) {
                    const parts = lastUrl.split(":");
                    if (parts.length >= 3) {
                        host = `${parts[0]}:${parts[1]}`;
                        port = parts[2].split("/")[0];
                    }
                }
            }
        }
    });

    // Input validation patterns
    const HOSTNAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$/;
    const IP_REGEX =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    function validateHost(value: string): string | null {
        if (!value || value.trim() === "") {
            return "Host is required";
        }
        const trimmed = value.trim();
        // Allow URLs with protocol
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return null; // Let the browser handle URL validation
        }
        // Validate as hostname or IP
        if (!HOSTNAME_REGEX.test(trimmed) && !IP_REGEX.test(trimmed)) {
            return "Invalid hostname or IP address";
        }
        if (trimmed.length > 253) {
            return "Hostname too long";
        }
        return null;
    }

    function validatePort(value: string): string | null {
        if (!value || value.trim() === "") {
            return "Port is required";
        }
        const portNum = parseInt(value, 10);
        if (isNaN(portNum) || !Number.isInteger(portNum)) {
            return "Port must be a number";
        }
        if (portNum < 1 || portNum > 65535) {
            return "Port must be between 1 and 65535";
        }
        return null;
    }

    async function handleConnect() {
        // Validate inputs before connecting
        const hostError = validateHost(host);
        if (hostError) {
            error = hostError;
            return;
        }
        const portError = validatePort(port);
        if (portError) {
            error = portError;
            return;
        }

        loading = true;
        error = null;
        try {
            await haStore.login(host.trim(), port.trim());
        } catch (e) {
            error =
                haStore.connectionError ||
                "Failed to connect. Check URL and try again.";
        } finally {
            loading = false;
        }
    }

    function handleDisconnect() {
        haStore.disconnect();
    }

    function handleReconnect() {
        haStore.clearError();
        error = null;
    }

    // Determine if we should show the login form
    const showLoginForm = $derived(
        haStore.connectionState === "disconnected" ||
            haStore.connectionState === "error",
    );

    // Settings Tabs
    const tabs = [
        { id: "connections", name: "Connections", icon: "link" },
        { id: "navigation", name: "Navigation", icon: "menu" },
        { id: "dashboards", name: "Dashboards", icon: "dashboard" },
        { id: "lockscreen", name: "Lockscreen", icon: "lock_clock" },
    ];
    let activeTabId = $state("connections");
</script>

<PageShell title="Settings" description="Configure application integrations.">
    <!-- Tab Bar -->
    <div class="mb-6">
        <TabBar {tabs} {activeTabId} onselect={(id) => (activeTabId = id)} />
    </div>

    <!-- Navigation Tab -->
    {#if activeTabId === "navigation"}
        <section class="mb-6">
            <Card variant="outlined" class="w-full">
                <div class="p-6 flex flex-col gap-6">
                    <div class="flex items-center gap-4">
                        <div
                            class="w-10 h-10 rounded-lg bg-m3-primary/10 flex items-center justify-center"
                        >
                            <Palette class="w-6 h-6 text-m3-primary" />
                        </div>
                        <div class="flex-1">
                            <h2 class="text-m3-title-large text-m3-on-surface">
                                Appearance
                            </h2>
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                Customize layout and visual style.
                            </p>
                        </div>
                    </div>

                    <!-- Navigation Style Selection -->
                    <div class="flex flex-col gap-3">
                        <span class="text-m3-label-large text-m3-on-surface"
                            >Navigation Style</span
                        >

                        <div class="flex flex-col sm:flex-row gap-8">
                            <label
                                class="flex items-center gap-3 cursor-pointer group"
                            >
                                <Radio
                                    value="standard"
                                    bind:group={themeStore.navigationStyle}
                                    onchange={() =>
                                        themeStore.setNavigationStyle(
                                            "standard",
                                        )}
                                />
                                <div class="flex flex-col">
                                    <span
                                        class="text-m3-body-large text-m3-on-surface group-hover:text-m3-primary transition-colors"
                                        >Standard</span
                                    >
                                    <span
                                        class="text-m3-body-small text-m3-on-surface-variant"
                                        >Rail (Desktop) / Bottom (Mobile)</span
                                    >
                                </div>
                            </label>

                            <label
                                class="flex items-center gap-3 cursor-pointer group"
                            >
                                <Radio
                                    value="modern"
                                    bind:group={themeStore.navigationStyle}
                                    onchange={() =>
                                        themeStore.setNavigationStyle("modern")}
                                />
                                <div class="flex flex-col">
                                    <span
                                        class="text-m3-body-large text-m3-on-surface group-hover:text-m3-primary transition-colors"
                                        >Modern</span
                                    >
                                    <span
                                        class="text-m3-body-small text-m3-on-surface-variant"
                                        >Floating Bar (Desktop & Mobile)</span
                                    >
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Navigation Items Editor -->
                    <div class="pt-4 border-t border-m3-outline-variant">
                        <NavigationEditor />
                    </div>
                </div>
            </Card>
        </section>
    {/if}

    <!-- Dashboards Tab -->
    {#if activeTabId === "dashboards"}
        <section class="mb-6">
            <Card variant="outlined" class="w-full">
                <div class="p-6 flex flex-col gap-6">
                    <div class="flex items-center gap-4">
                        <div
                            class="w-10 h-10 rounded-lg bg-m3-primary/10 flex items-center justify-center"
                        >
                            <DashboardIcon class="w-6 h-6 text-m3-primary" />
                        </div>
                        <div class="flex-1">
                            <h2 class="text-m3-title-large text-m3-on-surface">
                                Dashboards
                            </h2>
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                Manage dashboard pages and custom routes.
                            </p>
                        </div>
                    </div>

                    <div class="pt-4 border-t border-m3-outline-variant">
                        <DashboardSettings />
                    </div>
                </div>
            </Card>
        </section>
    {/if}

    <!-- Lockscreen Tab -->
    {#if activeTabId === "lockscreen"}
        <section class="mb-6">
            <Card variant="outlined" class="w-full">
                <div class="p-6 flex flex-col gap-6">
                    <div class="flex items-center gap-4">
                        <div
                            class="w-10 h-10 rounded-lg bg-m3-primary/10 flex items-center justify-center"
                        >
                            <LockClock class="w-6 h-6 text-m3-primary" />
                        </div>
                        <div class="flex-1">
                            <h2 class="text-m3-title-large text-m3-on-surface">
                                Lock Screen
                            </h2>
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                Configure idle timeout and background images.
                            </p>
                        </div>
                        <!-- Enable/Disable Switch -->
                        <div class="flex items-center gap-2">
                            <span class="text-m3-label-large text-m3-on-surface"
                                >Enabled</span
                            >
                            <Switch
                                checked={lockScreenStore.enabled}
                                onchange={() =>
                                    lockScreenStore.updateConfig({
                                        enabled: !lockScreenStore.enabled,
                                    })}
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Timeout Config -->
                        <div class="flex flex-col gap-2 md:col-span-2">
                            <div class="flex justify-between items-center">
                                <span
                                    class="text-m3-label-large text-m3-on-surface"
                                    >Idle Timeout</span
                                >
                                <span
                                    class="text-m3-body-medium text-m3-on-surface-variant"
                                    >{Math.floor(lockScreenStore.timeout / 60)}m {lockScreenStore.timeout %
                                        60}s</span
                                >
                            </div>
                            <!-- Using a range input if Slider component isn't readily available or simple to bind, but assuming Slider usage -->
                            <input
                                type="range"
                                min="30"
                                max="3600"
                                step="30"
                                class="w-full"
                                value={lockScreenStore.timeout}
                                oninput={(e) =>
                                    lockScreenStore.updateConfig({
                                        timeout: parseInt(
                                            e.currentTarget.value,
                                        ),
                                    })}
                            />
                            <p
                                class="text-m3-body-small text-m3-on-surface-variant"
                            >
                                Time before the screen locks automatically.
                            </p>
                        </div>

                        <!-- Landscape Image -->
                        <ImagePicker
                            label="Landscape Background (Desktop)"
                            orientation="landscape"
                            bind:value={lockScreenStore.backgroundLandscape}
                            onchange={() =>
                                lockScreenStore.updateConfig({
                                    backgroundLandscape:
                                        lockScreenStore.backgroundLandscape,
                                })}
                        />

                        <!-- Portrait Image -->
                        <ImagePicker
                            label="Portrait Background (Mobile)"
                            orientation="portrait"
                            bind:value={lockScreenStore.backgroundPortrait}
                            onchange={() =>
                                lockScreenStore.updateConfig({
                                    backgroundPortrait:
                                        lockScreenStore.backgroundPortrait,
                                })}
                        />
                    </div>
                </div>
            </Card>
        </section>
    {/if}

    <!-- Connections Tab -->
    {#if activeTabId === "connections"}
        <div class="flex flex-col gap-6">
            <section>
                <Card variant="outlined" class="w-full">
                    <div class="p-6 flex flex-col gap-6">
                        <div class="flex items-center gap-4">
                            <img
                                src="https://www.home-assistant.io/images/favicon.ico"
                                alt="HA Logo"
                                class="w-10 h-10"
                            />
                            <div class="flex-1">
                                <h2
                                    class="text-m3-title-large text-m3-on-surface"
                                >
                                    Home Assistant
                                </h2>
                                <p
                                    class="text-m3-body-medium text-m3-on-surface-variant"
                                >
                                    Connect to your local instance to control
                                    devices.
                                </p>
                            </div>

                            <!-- Connection State Badge -->
                            {#if haStore.connectionState === "connected"}
                                <div
                                    class="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full"
                                >
                                    <CheckCircle class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >Connected</span
                                    >
                                </div>
                            {:else if haStore.connectionState === "connecting"}
                                <div
                                    class="flex items-center gap-2 text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full"
                                >
                                    <Sync class="w-5 h-5 animate-spin" />
                                    <span class="text-sm font-medium"
                                        >Connecting...</span
                                    >
                                </div>
                            {:else if haStore.connectionState === "expired"}
                                <div
                                    class="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1 rounded-full"
                                >
                                    <Error class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >Connection Expired</span
                                    >
                                </div>
                            {:else if haStore.connectionState === "error"}
                                <div
                                    class="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1 rounded-full"
                                >
                                    <Error class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >Connection Failed</span
                                    >
                                </div>
                            {:else}
                                <div
                                    class="flex items-center gap-2 text-m3-on-surface-variant bg-m3-surface-container px-3 py-1 rounded-full"
                                >
                                    <LinkOff class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >Disconnected</span
                                    >
                                </div>
                            {/if}
                        </div>

                        <!-- Connection Error/Expired Alert -->
                        {#if haStore.connectionState === "expired" || (haStore.connectionState === "error" && haStore.connectionError)}
                            <div
                                class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3"
                            >
                                <Error
                                    class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5"
                                />
                                <div class="flex-1">
                                    <p
                                        class="text-m3-body-medium text-red-500 font-medium"
                                    >
                                        {haStore.connectionState === "expired"
                                            ? "Connection Expired"
                                            : "Connection Failed"}
                                    </p>
                                    <p
                                        class="text-m3-body-small text-m3-on-surface-variant mt-1"
                                    >
                                        {haStore.connectionError}
                                    </p>
                                </div>
                                <Button
                                    variant="outlined"
                                    onclick={handleReconnect}
                                >
                                    Reconnect
                                </Button>
                            </div>
                        {/if}

                        {#if showLoginForm}
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div class="md:col-span-2">
                                    <TextField
                                        label="Host / IP Address"
                                        placeholder="e.g. 192.168.1.50"
                                        bind:value={host}
                                    />
                                </div>
                                <div>
                                    <TextField
                                        label="Port"
                                        placeholder="8123"
                                        bind:value={port}
                                    />
                                </div>
                            </div>

                            {#if error}
                                <p class="text-m3-error text-m3-body-medium">
                                    {error}
                                </p>
                            {/if}

                            <div class="flex justify-end">
                                <Button
                                    variant="filled"
                                    onclick={handleConnect}
                                    disabled={loading}
                                    icon={Link}
                                >
                                    {loading ? "Connecting..." : "Connect"}
                                </Button>
                            </div>
                        {:else if haStore.connectionState === "connected"}
                            <div
                                class="bg-m3-surface-container p-4 rounded-md flex flex-col gap-2"
                            >
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant"
                                    >Connection Details</span
                                >
                                <div class="flex justify-between items-center">
                                    <span
                                        class="text-m3-body-large text-m3-on-surface"
                                        >{haStore.url}</span
                                    >
                                </div>
                            </div>

                            <div class="flex justify-end">
                                <Button
                                    variant="outlined"
                                    onclick={handleDisconnect}
                                >
                                    Disconnect
                                </Button>
                            </div>
                        {/if}
                    </div>
                </Card>
            </section>

            <!-- Music Assistant Section -->
            <section>
                <Card variant="outlined" class="w-full">
                    <div class="p-6 flex flex-col gap-4">
                        <div class="flex items-center gap-4">
                            <div
                                class="w-10 h-10 rounded-lg bg-m3-primary/10 flex items-center justify-center"
                            >
                                <MusicIcon class="w-6 h-6 text-m3-primary" />
                            </div>
                            <div class="flex-1">
                                <h2
                                    class="text-m3-title-large text-m3-on-surface"
                                >
                                    Music Assistant
                                </h2>
                                <p
                                    class="text-m3-body-medium text-m3-on-surface-variant"
                                >
                                    Stream from Spotify, TuneIn, and local
                                    files.
                                </p>
                            </div>

                            <!-- Connection State Badge -->
                            {#if maStore.integrationStatus === "available"}
                                <div
                                    class="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full"
                                >
                                    <CheckCircle class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >Connected</span
                                    >
                                </div>
                            {:else if maStore.integrationStatus === "checking"}
                                <div
                                    class="flex items-center gap-2 text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full"
                                >
                                    <Sync class="w-5 h-5 animate-spin" />
                                    <span class="text-sm font-medium"
                                        >Checking...</span
                                    >
                                </div>
                            {:else if maStore.integrationStatus === "not_installed"}
                                <div
                                    class="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full"
                                >
                                    <Warning class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >Not Installed</span
                                    >
                                </div>
                            {:else}
                                <div
                                    class="flex items-center gap-2 text-m3-on-surface-variant bg-m3-surface-container px-3 py-1 rounded-full"
                                >
                                    <LinkOff class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >Unavailable</span
                                    >
                                </div>
                            {/if}
                        </div>

                        {#if maStore.integrationStatus === "not_installed"}
                            <div
                                class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3"
                            >
                                <Warning
                                    class="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5"
                                />
                                <div class="flex-1">
                                    <p
                                        class="text-m3-body-medium text-amber-600 dark:text-amber-400 font-medium"
                                    >
                                        Music Assistant Addon Required
                                    </p>
                                    <p
                                        class="text-m3-body-small text-m3-on-surface-variant mt-1"
                                    >
                                        Install the Music Assistant addon in
                                        Home Assistant to stream music.
                                    </p>
                                </div>
                                <a
                                    href="https://music-assistant.io/installation/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-m3-primary hover:underline text-sm font-medium flex items-center gap-1"
                                >
                                    Install Guide
                                    <OpenInNew class="w-4 h-4" />
                                </a>
                            </div>
                        {:else if maStore.integrationStatus === "available"}
                            <div class="bg-m3-surface-container p-4 rounded-md">
                                <p
                                    class="text-m3-body-medium text-m3-on-surface-variant"
                                >
                                    Connected via Home Assistant. Providers and
                                    players are configured in the Music
                                    Assistant addon.
                                </p>
                            </div>
                            <div class="flex justify-end">
                                <a
                                    href="/music"
                                    class="inline-flex items-center justify-center h-10 px-6 rounded-full text-m3-label-large font-medium bg-m3-primary text-m3-on-primary hover:bg-m3-primary/92 transition-colors"
                                >
                                    Open Music
                                </a>
                            </div>
                        {:else if haStore.connectionState !== "connected"}
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                Connect to Home Assistant first to enable Music
                                Assistant.
                            </p>
                        {/if}
                    </div>
                </Card>
            </section>
        </div>
    {/if}
</PageShell>
