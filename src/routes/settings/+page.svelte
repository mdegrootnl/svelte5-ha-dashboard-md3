<script lang="ts">
    import { haStore, Button, TextField, Card, PageShell } from "$lib";
    import Link from "~icons/material-symbols/link";
    import LinkOff from "~icons/material-symbols/link-off";
    import CheckCircle from "~icons/material-symbols/check-circle";
    import Error from "~icons/material-symbols/error";
    import Sync from "~icons/material-symbols/sync";
    import Warning from "~icons/material-symbols/warning";
    import Key from "~icons/material-symbols/key";
    import OpenInNew from "~icons/material-symbols/open-in-new";

    let host = $state("homeassistant.local");
    let port = $state("8123");
    let token = $state("");
    let authMode = $state<"oauth" | "token">("oauth");
    let loading = $state(false);
    let error = $state<string | null>(null);

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

    function validateToken(value: string): string | null {
        if (!value || value.trim() === "") {
            return "Access token is required";
        }
        if (value.trim().length < 10) {
            return "Access token appears too short";
        }
        return null;
    }

    /**
     * Open Home Assistant profile page to create a long-lived access token
     * This opens in a new tab so users can login and copy the token
     */
    function openHATokenPage() {
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

        error = null;
        const protocol = host.trim().startsWith("http") ? "" : "https://";
        const hassUrl = `${protocol}${host.trim()}:${port.trim()}`;
        // Open the HA profile page where users can create long-lived tokens
        window.open(`${hassUrl}/profile/security`, "_blank");
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

        if (authMode === "token") {
            const tokenError = validateToken(token);
            if (tokenError) {
                error = tokenError;
                return;
            }
        }

        loading = true;
        error = null;
        try {
            if (authMode === "token") {
                await haStore.loginWithToken(
                    host.trim(),
                    port.trim(),
                    token.trim(),
                );
            } else {
                await haStore.login(host.trim(), port.trim());
            }
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
</script>

<PageShell title="Settings" description="Configure application integrations.">
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
                        <h2 class="text-m3-title-large text-m3-on-surface">
                            Home Assistant
                        </h2>
                        <p
                            class="text-m3-body-medium text-m3-on-surface-variant"
                        >
                            Connect to your local instance to control devices.
                        </p>
                    </div>

                    <!-- Connection State Badge -->
                    {#if haStore.connectionState === "connected"}
                        <div
                            class="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full"
                        >
                            <CheckCircle class="w-5 h-5" />
                            <span class="text-sm font-medium">Connected</span>
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
                            <span class="text-sm font-medium">Disconnected</span
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
                        <Button variant="outlined" onclick={handleReconnect}>
                            Reconnect
                        </Button>
                    </div>
                {/if}

                {#if showLoginForm}
                    <!-- Auth Mode Toggle -->
                    <div class="flex gap-2">
                        <button
                            class="flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors {authMode ===
                            'oauth'
                                ? 'bg-m3-primary text-m3-on-primary'
                                : 'bg-m3-surface-container text-m3-on-surface-variant hover:bg-m3-surface-container-high'}"
                            onclick={() => (authMode = "oauth")}
                        >
                            OAuth (Recommended)
                        </button>
                        <button
                            class="flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors {authMode ===
                            'token'
                                ? 'bg-m3-primary text-m3-on-primary'
                                : 'bg-m3-surface-container text-m3-on-surface-variant hover:bg-m3-surface-container-high'}"
                            onclick={() => (authMode = "token")}
                        >
                            Long-Lived Token
                        </button>
                    </div>

                    <!-- Security Warning for Token Mode -->
                    {#if authMode === "token"}
                        <div
                            class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex flex-col gap-3"
                        >
                            <div class="flex items-start gap-3">
                                <Warning
                                    class="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5"
                                />
                                <div class="flex-1">
                                    <p
                                        class="text-m3-body-medium text-amber-600 dark:text-amber-400 font-medium"
                                    >
                                        Security Notice
                                    </p>
                                    <p
                                        class="text-m3-body-small text-m3-on-surface-variant mt-1"
                                    >
                                        Long-lived access tokens do not expire
                                        and grant full API access. Only use on
                                        trusted internal networks.
                                    </p>
                                </div>
                            </div>
                            <div class="bg-m3-surface-container rounded-md p-3">
                                <p
                                    class="text-m3-body-small text-m3-on-surface-variant mb-2"
                                >
                                    <strong>To get a token:</strong>
                                </p>
                                <ol
                                    class="text-m3-body-small text-m3-on-surface-variant list-decimal list-inside space-y-1"
                                >
                                    <li>
                                        Enter your Home Assistant host and port
                                        below
                                    </li>
                                    <li>
                                        Click "Get Token from Home Assistant" to
                                        open your HA instance
                                    </li>
                                    <li>
                                        Log in if prompted, then scroll to
                                        "Long-Lived Access Tokens"
                                    </li>
                                    <li>
                                        Create a new token, copy it, and paste
                                        it below
                                    </li>
                                </ol>
                            </div>
                        </div>
                    {/if}

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

                    <!-- Token Input (only for token mode) -->
                    {#if authMode === "token"}
                        <div class="flex flex-col gap-3">
                            <Button
                                variant="tonal"
                                onclick={openHATokenPage}
                                icon={OpenInNew}
                                class="w-full justify-center"
                            >
                                Get Token from Home Assistant
                            </Button>

                            <div class="relative">
                                <TextField
                                    label="Long-Lived Access Token"
                                    placeholder="Paste your token here"
                                    bind:value={token}
                                    type="password"
                                />
                                <Key
                                    class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-m3-on-surface-variant pointer-events-none"
                                />
                            </div>
                        </div>
                    {/if}

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
                            <span class="text-m3-body-large text-m3-on-surface"
                                >{haStore.url}</span
                            >
                        </div>
                    </div>

                    <div class="flex justify-end">
                        <Button variant="outlined" onclick={handleDisconnect}>
                            Disconnect
                        </Button>
                    </div>
                {/if}
            </div>
        </Card>
    </section>
</PageShell>
