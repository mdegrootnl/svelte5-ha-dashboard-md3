<script lang="ts">
    import ButtonCard from "$lib/components/cards/ButtonCard.svelte";
    import Fan from "~icons/material-symbols/mode-fan";
    import Lightbulb from "~icons/material-symbols/lightbulb";
    import VolumeUp from "~icons/material-symbols/volume-up";

    // Define card data structure
    interface CardData {
        id: number;
        title: string;
        state: string;
        icon: any;
        variant: "switch" | "slider";
        isActive: boolean;
        value?: number;
        entityId?: string;
        name?: string;
    }

    // Initialize cards with state
    let cards = $state<CardData[]>([
        {
            id: 1,
            title: "Office Fan",
            state: "Off",
            icon: Fan,
            variant: "switch",
            isActive: false,
            entityId: "",
            name: "",
            value: 0,
        },
        {
            id: 2,
            title: "Living Room",
            state: "On",
            icon: Lightbulb,
            variant: "switch",
            isActive: true,
            entityId: "",
            name: "",
            value: 100,
        },
        {
            id: 3,
            title: "Kitchen",
            state: "56%",
            icon: Lightbulb,
            variant: "slider",
            value: 56,
            isActive: true,
            entityId: "",
            name: "",
        },
        {
            id: 4,
            title: "Volume",
            state: "85%",
            icon: VolumeUp,
            variant: "slider",
            value: 85,
            isActive: true,
            entityId: "",
            name: "",
        },
    ]);
</script>

<div class="h-full w-full bg-m3-surface overflow-y-auto p-8">
    <div class="max-w-6xl mx-auto flex flex-col gap-8 pb-20">
        <!-- Header -->
        <header>
            <h1 class="text-m3-display-small text-m3-on-surface">
                Card Library
            </h1>
            <p class="text-m3-body-large text-m3-on-surface-variant mt-2">
                Showcase of all available Home Assistant entity cards.
            </p>
        </header>

        <!-- Quick Note -->
        <div
            class="bg-m3-secondary-container text-m3-on-secondary-container p-4 rounded-m3-md border border-m3-outline-variant/20 inline-block"
        >
            <p class="text-m3-body-medium">
                This library is currently empty. As we build Entity Cards
                (Lights, Switches, Sensors), they will appear here.
            </p>
        </div>

        <!-- Grid Container -->
        <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
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
                    onclick={() => console.log(`Clicked card ${card.id}`)}
                />
            {/each}
        </div>
    </div>
</div>
