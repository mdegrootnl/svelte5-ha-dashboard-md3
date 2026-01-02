<script lang="ts">
    import { haStore } from "$lib/stores/ha.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import Card from "$lib/components/md3/Card.svelte";
    import Link from "~icons/material-symbols/link";
    import LinkOff from "~icons/material-symbols/link-off";
    import CheckCircle from "~icons/material-symbols/check-circle";

    let host = $state("homeassistant.local");
    let port = $state("8123");
    let loading = $state(false);
    let error = $state<string | null>(null);

    async function handleConnect() {
        loading = true;
        error = null;
        try {
            await haStore.login(host, port);
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

<div class="h-full w-full bg-m3-surface overflow-y-auto p-8">
    <div class="max-w-2xl mx-auto flex flex-col gap-8">
        <!-- Header -->
        <header>
            <h1 class="text-m3-display-small text-m3-on-surface">Settings</h1>
            <p class="text-m3-body-large text-m3-on-surface-variant mt-2">
                Configure application integrations.
            </p>
        </header>

        <!-- HA Integration Card -->
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
                                Connect to your local instance to control
                                devices.
                            </p>
                        </div>
                        {#if haStore.connected}
                            <div
                                class="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full"
                            >
                                <CheckCircle class="w-5 h-5" />
                                <span class="text-sm font-medium"
                                    >Connected</span
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
    </div>
</div>
