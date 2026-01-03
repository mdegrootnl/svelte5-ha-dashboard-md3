<script lang="ts">
    import { haStore, Button, TextField, Card, PageShell } from "$lib";
    import Link from "~icons/material-symbols/link";
    import LinkOff from "~icons/material-symbols/link-off";
    import CheckCircle from "~icons/material-symbols/check-circle";

    let host = $state("homeassistant.local");
    let port = $state("8123");
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
            error = "Failed to connect. Check URL and try again.";
        } finally {
            loading = false;
        }
    }

    function handleDisconnect() {
        haStore.disconnect();
    }
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
                    {#if haStore.connected}
                        <div
                            class="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full"
                        >
                            <CheckCircle class="w-5 h-5" />
                            <span class="text-sm font-medium">Connected</span>
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

                {#if !haStore.connected}
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
                {:else}
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
