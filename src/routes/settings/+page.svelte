<script lang="ts">
    import { onMount } from "svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { maStore } from "$lib/features/music/stores/maStore.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { LANGUAGE_OPTIONS, type AppLanguage } from "$lib/i18n";
    import Button from "$lib/components/md3/Button.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import Card from "$lib/components/md3/Card.svelte";
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import Radio from "$lib/components/md3/Radio.svelte";
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
    import Translate from "~icons/material-symbols/translate";
    import ImagePicker from "$lib/components/settings/ImagePicker.svelte";
    import Switch from "$lib/components/md3/Switch.svelte";
    import { lockScreenStore } from "$lib/features/lockscreen/stores/lockscreen.svelte";
    import DashboardSettings from "$lib/components/settings/DashboardSettings.svelte";
    import DashboardIcon from "~icons/material-symbols/dashboard";

    let host = $state("http://homeassistant.local");
    let port = $state("8123");
    let token = ""; // Local variable for internal use if needed, but removing from state
    let loading = $state(false);
    let error = $state<string | null>(null);
    let imageProviderStatus = $state({
        unsplash: { configured: false, source: "none" },
        pexels: { configured: false, source: "none" },
    } as Record<"unsplash" | "pexels", { configured: boolean; source: "runtime" | "env" | "none" }>);
    let unsplashAccessKey = $state("");
    let pexelsApiKey = $state("");
    let imageProviderSaving = $state(false);
    let imageProviderMessage = $state("");

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

        await loadImageProviderStatus();
    });

    // Input validation patterns
    const HOSTNAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$/;
    const IP_REGEX =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    function validateHost(value: string): string | null {
        if (!value || value.trim() === "") {
            return themeStore.t("settings.homeAssistant.hostRequired");
        }
        const trimmed = value.trim();
        // Allow URLs with protocol
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return null; // Let the browser handle URL validation
        }
        // Validate as hostname or IP
        if (!HOSTNAME_REGEX.test(trimmed) && !IP_REGEX.test(trimmed)) {
            return themeStore.t("settings.homeAssistant.invalidHost");
        }
        if (trimmed.length > 253) {
            return themeStore.t("settings.homeAssistant.hostTooLong");
        }
        return null;
    }

    function validatePort(value: string): string | null {
        if (!value || value.trim() === "") {
            return themeStore.t("settings.homeAssistant.portRequired");
        }
        const portNum = parseInt(value, 10);
        if (isNaN(portNum) || !Number.isInteger(portNum)) {
            return themeStore.t("settings.homeAssistant.portNumber");
        }
        if (portNum < 1 || portNum > 65535) {
            return themeStore.t("settings.homeAssistant.portRange");
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
                themeStore.t("settings.homeAssistant.connectFailed");
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

    async function loadImageProviderStatus() {
        try {
            const response = await fetch("/api/image-providers/settings");
            const data = await response.json().catch(() => ({}));
            if (response.ok && data.providers) {
                imageProviderStatus = data.providers;
            }
        } catch (err) {
            console.warn("Image provider settings unavailable", err);
        }
    }

    function formatProviderStatus(provider: "unsplash" | "pexels") {
        const status = imageProviderStatus[provider];
        if (!status.configured) return themeStore.t("common.notConfigured");
        return status.source === "runtime"
            ? themeStore.t("settings.providers.configuredSettings")
            : themeStore.t("settings.providers.configuredEnvironment");
    }

    async function saveImageProviderKeys() {
        const payload: Record<string, string> = {};
        if (unsplashAccessKey.trim()) payload.unsplashAccessKey = unsplashAccessKey.trim();
        if (pexelsApiKey.trim()) payload.pexelsApiKey = pexelsApiKey.trim();

        if (!Object.keys(payload).length) {
            imageProviderMessage = themeStore.t("settings.providers.enterKey");
            return;
        }

        imageProviderSaving = true;
        imageProviderMessage = "";
        try {
            const response = await fetch("/api/image-providers/settings", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                imageProviderMessage = data.error || themeStore.t("settings.providers.saveFailed");
                return;
            }
            imageProviderStatus = data.providers;
            unsplashAccessKey = "";
            pexelsApiKey = "";
            imageProviderMessage = themeStore.t("settings.providers.saved");
        } catch {
            imageProviderMessage = themeStore.t("settings.providers.unavailable");
        } finally {
            imageProviderSaving = false;
        }
    }

    async function clearRuntimeImageProviderKeys() {
        imageProviderSaving = true;
        imageProviderMessage = "";
        try {
            const response = await fetch("/api/image-providers/settings", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    unsplashAccessKey: null,
                    pexelsApiKey: null,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                imageProviderMessage = data.error || themeStore.t("settings.providers.clearFailed");
                return;
            }
            imageProviderStatus = data.providers;
            unsplashAccessKey = "";
            pexelsApiKey = "";
            imageProviderMessage = themeStore.t("settings.providers.cleared");
        } catch {
            imageProviderMessage = themeStore.t("settings.providers.unavailable");
        } finally {
            imageProviderSaving = false;
        }
    }

    // Determine if we should show the login form
    const showLoginForm = $derived(
        haStore.connectionState === "disconnected" ||
            haStore.connectionState === "error",
    );

    // Settings Tabs
    const tabs = $derived([
        { id: "general", name: themeStore.t("settings.tabs.general"), icon: "translate" },
        { id: "connections", name: themeStore.t("settings.tabs.connections"), icon: "link" },
        { id: "navigation", name: themeStore.t("settings.tabs.navigation"), icon: "menu_open" },
        { id: "dashboards", name: themeStore.t("settings.tabs.dashboards"), icon: "dashboard" },
        { id: "lockscreen", name: themeStore.t("settings.tabs.lockscreen"), icon: "lock_clock" },
    ]);
    let activeTabId = $state("general");
</script>

<PageShell title={themeStore.t("settings.title")} description={themeStore.t("settings.description")}>
    <!-- Tab Bar -->
    <div class="mb-6">
        <TabBar {tabs} {activeTabId} onselect={(id) => (activeTabId = id)} />
    </div>

    <!-- General Tab -->
    {#if activeTabId === "general"}
        <section class="mb-6">
            <Card variant="outlined" class="w-full">
                <div class="p-6 flex flex-col gap-6">
                    <div class="flex items-center gap-4">
                        <div
                            class="w-10 h-10 rounded-lg bg-m3-primary/10 flex items-center justify-center"
                        >
                            <Translate class="w-6 h-6 text-m3-primary" />
                        </div>
                        <div class="flex-1">
                            <h2 class="text-m3-title-large text-m3-on-surface">
                                {themeStore.t("settings.language.title")}
                            </h2>
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                {themeStore.t("settings.language.description")}
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {#each LANGUAGE_OPTIONS as option}
                            <label
                                class="flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-m3-surface-container-low {themeStore.language === option.value
                                    ? 'border-m3-primary bg-m3-primary-container/30'
                                    : 'border-m3-outline-variant bg-m3-surface'}"
                            >
                                <Radio
                                    value={option.value}
                                    group={themeStore.language}
                                    onchange={(value) =>
                                        themeStore.setLanguage(value as AppLanguage)}
                                />
                                <span class="flex min-w-0 flex-1 flex-col">
                                    <span
                                        class="text-m3-body-large font-medium text-m3-on-surface"
                                    >
                                        {option.nativeLabel}
                                    </span>
                                    <span
                                        class="text-m3-body-small text-m3-on-surface-variant"
                                    >
                                        {themeStore.t(`language.${option.value}`)}
                                    </span>
                                </span>
                                {#if option.dashboardPrimary}
                                    <span
                                        class="rounded-full bg-m3-secondary-container px-2 py-1 text-m3-label-small text-m3-on-secondary-container"
                                    >
                                        {themeStore.t("language.primaryBadge")}
                                    </span>
                                {/if}
                            </label>
                        {/each}
                    </div>

                    <p class="text-m3-body-small text-m3-on-surface-variant">
                        {themeStore.t("settings.language.helper")}
                    </p>
                </div>
            </Card>
        </section>
    {/if}

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
                                {themeStore.t("settings.appearance.title")}
                            </h2>
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                {themeStore.t("settings.appearance.description")}
                            </p>
                        </div>
                    </div>

                    <!-- Navigation Style Selection -->
                    <div class="flex flex-col gap-3">
                        <span class="text-m3-label-large text-m3-on-surface"
                            >{themeStore.t("settings.navigation.style")}</span
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
                                        >{themeStore.t("settings.navigation.standard")}</span
                                    >
                                    <span
                                        class="text-m3-body-small text-m3-on-surface-variant"
                                        >{themeStore.t("settings.navigation.standardDescription")}</span
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
                                        >{themeStore.t("settings.navigation.modern")}</span
                                    >
                                    <span
                                        class="text-m3-body-small text-m3-on-surface-variant"
                                        >{themeStore.t("settings.navigation.modernDescription")}</span
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
                                {themeStore.t("settings.dashboards.title")}
                            </h2>
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                {themeStore.t("settings.dashboards.description")}
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
                                {themeStore.t("settings.lockscreen.title")}
                            </h2>
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                {themeStore.t("settings.lockscreen.description")}
                            </p>
                        </div>
                        <!-- Enable/Disable Switch -->
                        <div class="flex items-center gap-2">
                            <span class="text-m3-label-large text-m3-on-surface"
                                >{themeStore.t("common.enabled")}</span
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
                                    >{themeStore.t("settings.lockscreen.idleTimeout")}</span
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
                                {themeStore.t("settings.lockscreen.timeoutHelp")}
                            </p>
                        </div>

                        <!-- Landscape Image -->
                        <ImagePicker
                            label={themeStore.t("settings.lockscreen.landscape")}
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
                            label={themeStore.t("settings.lockscreen.portrait")}
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
                                    {themeStore.t("settings.homeAssistant.title")}
                                </h2>
                                <p
                                    class="text-m3-body-medium text-m3-on-surface-variant"
                                >
                                    {themeStore.t("settings.homeAssistant.description")}
                                </p>
                            </div>

                            <!-- Connection State Badge -->
                            {#if haStore.connectionState === "connected"}
                                <div
                                    class="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full"
                                >
                                    <CheckCircle class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >{themeStore.t("common.connected")}</span
                                    >
                                </div>
                            {:else if haStore.connectionState === "connecting"}
                                <div
                                    class="flex items-center gap-2 text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full"
                                >
                                    <Sync class="w-5 h-5 animate-spin" />
                                    <span class="text-sm font-medium"
                                        >{themeStore.t("common.connecting")}</span
                                    >
                                </div>
                            {:else if haStore.connectionState === "expired"}
                                <div
                                    class="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1 rounded-full"
                                >
                                    <Error class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >{themeStore.t("settings.homeAssistant.connectionExpired")}</span
                                    >
                                </div>
                            {:else if haStore.connectionState === "error"}
                                <div
                                    class="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1 rounded-full"
                                >
                                    <Error class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >{themeStore.t("settings.homeAssistant.connectionFailed")}</span
                                    >
                                </div>
                            {:else}
                                <div
                                    class="flex items-center gap-2 text-m3-on-surface-variant bg-m3-surface-container px-3 py-1 rounded-full"
                                >
                                    <LinkOff class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >{themeStore.t("common.disconnected")}</span
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
                                            ? themeStore.t("settings.homeAssistant.connectionExpired")
                                            : themeStore.t("settings.homeAssistant.connectionFailed")}
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
                                    {themeStore.t("common.reconnect")}
                                </Button>
                            </div>
                        {/if}

                        {#if showLoginForm}
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div class="md:col-span-2">
                                    <TextField
                                        label={themeStore.t("settings.homeAssistant.host")}
                                        placeholder={themeStore.t("settings.homeAssistant.hostPlaceholder")}
                                        bind:value={host}
                                    />
                                </div>
                                <div>
                                    <TextField
                                        label={themeStore.t("settings.homeAssistant.port")}
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
                                    {loading ? themeStore.t("common.connecting") : themeStore.t("common.connect")}
                                </Button>
                            </div>
                        {:else if haStore.connectionState === "connected"}
                            <div
                                class="bg-m3-surface-container p-4 rounded-md flex flex-col gap-2"
                            >
                                <span
                                    class="text-m3-label-medium text-m3-on-surface-variant"
                                    >{themeStore.t("settings.homeAssistant.connectionDetails")}</span
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
                                    {themeStore.t("common.disconnect")}
                                </Button>
                            </div>
                        {/if}
                    </div>
                </Card>
            </section>

            <!-- Image Providers Section -->
            <section>
                <Card variant="outlined" class="w-full">
                    <div class="p-6 flex flex-col gap-5">
                        <div class="flex items-center gap-4">
                            <div
                                class="w-10 h-10 rounded-lg bg-m3-primary/10 flex items-center justify-center"
                            >
                                <Key class="w-6 h-6 text-m3-primary" />
                            </div>
                            <div class="flex-1">
                                <h2
                                    class="text-m3-title-large text-m3-on-surface"
                                >
                                    {themeStore.t("settings.providers.title")}
                                </h2>
                                <p
                                    class="text-m3-body-medium text-m3-on-surface-variant"
                                >
                                    {themeStore.t("settings.providers.description")}
                                </p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex flex-col gap-2">
                                <TextField
                                    label={themeStore.t("settings.providers.unsplash")}
                                    type="password"
                                    placeholder={themeStore.t("settings.providers.pasteKey")}
                                    bind:value={unsplashAccessKey}
                                    supportingText={formatProviderStatus("unsplash")}
                                />
                            </div>
                            <div class="flex flex-col gap-2">
                                <TextField
                                    label={themeStore.t("settings.providers.pexels")}
                                    type="password"
                                    placeholder={themeStore.t("settings.providers.pasteKey")}
                                    bind:value={pexelsApiKey}
                                    supportingText={formatProviderStatus("pexels")}
                                />
                            </div>
                        </div>

                        {#if imageProviderMessage}
                            <p class="text-m3-body-small text-m3-on-surface-variant">
                                {imageProviderMessage}
                            </p>
                        {/if}

                        <div class="flex flex-wrap justify-end gap-2">
                            <Button
                                variant="outlined"
                                onclick={clearRuntimeImageProviderKeys}
                                disabled={imageProviderSaving}
                            >
                                {themeStore.t("settings.providers.clearRuntime")}
                            </Button>
                            <Button
                                variant="filled"
                                onclick={saveImageProviderKeys}
                                disabled={imageProviderSaving}
                                icon={Key}
                            >
                                {imageProviderSaving ? themeStore.t("common.saving") : themeStore.t("settings.providers.saveKeys")}
                            </Button>
                        </div>
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
                                    {themeStore.t("settings.musicAssistant.title")}
                                </h2>
                                <p
                                    class="text-m3-body-medium text-m3-on-surface-variant"
                                >
                                    {themeStore.t("settings.musicAssistant.description")}
                                </p>
                            </div>

                            <!-- Connection State Badge -->
                            {#if maStore.integrationStatus === "available"}
                                <div
                                    class="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full"
                                >
                                    <CheckCircle class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >{themeStore.t("common.connected")}</span
                                    >
                                </div>
                            {:else if maStore.integrationStatus === "checking"}
                                <div
                                    class="flex items-center gap-2 text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full"
                                >
                                    <Sync class="w-5 h-5 animate-spin" />
                                    <span class="text-sm font-medium"
                                        >{themeStore.t("common.checking")}</span
                                    >
                                </div>
                            {:else if maStore.integrationStatus === "not_installed"}
                                <div
                                    class="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full"
                                >
                                    <Warning class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >{themeStore.t("common.notInstalled")}</span
                                    >
                                </div>
                            {:else}
                                <div
                                    class="flex items-center gap-2 text-m3-on-surface-variant bg-m3-surface-container px-3 py-1 rounded-full"
                                >
                                    <LinkOff class="w-5 h-5" />
                                    <span class="text-sm font-medium"
                                        >{themeStore.t("common.unavailable")}</span
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
                                        {themeStore.t("settings.musicAssistant.required")}
                                    </p>
                                    <p
                                        class="text-m3-body-small text-m3-on-surface-variant mt-1"
                                    >
                                        {themeStore.t("settings.musicAssistant.requiredDescription")}
                                    </p>
                                </div>
                                <a
                                    href="https://music-assistant.io/installation/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-m3-primary hover:underline text-sm font-medium flex items-center gap-1"
                                >
                                    {themeStore.t("common.installGuide")}
                                    <OpenInNew class="w-4 h-4" />
                                </a>
                            </div>
                        {:else if maStore.integrationStatus === "available"}
                            <div class="bg-m3-surface-container p-4 rounded-md">
                                <p
                                    class="text-m3-body-medium text-m3-on-surface-variant"
                                >
                                    {themeStore.t("settings.musicAssistant.connectedDescription")}
                                </p>
                            </div>
                            <div class="flex justify-end">
                                <a
                                    href="/music"
                                    class="inline-flex items-center justify-center h-10 px-6 rounded-full text-m3-label-large font-medium bg-m3-primary text-m3-on-primary hover:bg-m3-primary/92 transition-colors"
                                >
                                    {themeStore.t("settings.musicAssistant.openMusic")}
                                </a>
                            </div>
                        {:else if haStore.connectionState !== "connected"}
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                {themeStore.t("settings.homeAssistant.connectFirst")}
                            </p>
                        {/if}
                    </div>
                </Card>
            </section>
        </div>
    {/if}
</PageShell>
