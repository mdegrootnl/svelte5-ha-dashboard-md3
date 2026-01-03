<script lang="ts">
    import { ButtonCard, haStore, PageShell } from "$lib";
    import Lightbulb from "~icons/material-symbols/lightbulb";
    import Thermostat from "~icons/material-symbols/thermostat";
    import Fan from "~icons/material-symbols/mode-fan";
    import Lock from "~icons/material-symbols/lock";

    // Dashboard cards - these would typically be persisted/configured
    interface DashboardCard {
        id: string;
        title: string;
        state: string;
        icon: any;
        variant: "switch" | "slider";
        isActive: boolean;
        value: number;
        entityId: string;
        name: string;
    }

    let cards = $state<DashboardCard[]>([
        {
            id: "1",
            title: "Living Room",
            state: "Off",
            icon: Lightbulb,
            variant: "slider",
            isActive: false,
            value: 0,
            entityId: "",
            name: "",
        },
        {
            id: "2",
            title: "Thermostat",
            state: "21°C",
            icon: Thermostat,
            variant: "switch",
            isActive: true,
            value: 100,
            entityId: "",
            name: "",
        },
        {
            id: "3",
            title: "Ceiling Fan",
            state: "Off",
            icon: Fan,
            variant: "switch",
            isActive: false,
            value: 0,
            entityId: "",
            name: "",
        },
        {
            id: "4",
            title: "Front Door",
            state: "Locked",
            icon: Lock,
            variant: "switch",
            isActive: true,
            value: 100,
            entityId: "",
            name: "",
        },
    ]);

    // Derive connected entity count
    let connectedEntities = $derived(Object.keys(haStore.states).length);
</script>

<PageShell
    title="Dashboard"
    description={haStore.connected
        ? `Connected · ${connectedEntities} entities`
        : "Configure connection in Settings"}
    maxWidth="6xl"
>
    {#snippet actions()}
        {#if !haStore.connected}
            <a
                href="/settings"
                class="inline-flex items-center justify-center h-10 px-6 rounded-full bg-m3-primary text-m3-on-primary text-m3-label-large font-medium hover:bg-m3-primary/92 transition-colors"
            >
                Connect
            </a>
        {/if}
    {/snippet}

    <section>
        <h2 class="text-m3-title-large text-m3-on-surface mb-4">
            Quick Controls
        </h2>
        <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
            {#each cards as card (card.id)}
                <ButtonCard
                    bind:title={card.title}
                    bind:state={card.state}
                    icon={card.icon}
                    variant={card.variant}
                    bind:isActive={card.isActive}
                    bind:value={card.value}
                    bind:entityId={card.entityId}
                    bind:name={card.name}
                />
            {/each}
        </div>
    </section>

    {#if !haStore.connected}
        <section class="mt-8">
            <div
                class="bg-m3-surface-container-high rounded-m3-lg p-6 text-center"
            >
                <p class="text-m3-body-large text-m3-on-surface-variant mb-4">
                    Connect to Home Assistant to control your smart home
                    devices.
                </p>
                <a
                    href="/settings"
                    class="inline-flex items-center justify-center h-10 px-6 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-m3-label-large font-medium hover:bg-m3-secondary-container/92 transition-colors"
                >
                    Go to Settings
                </a>
            </div>
        </section>
    {/if}
</PageShell>
