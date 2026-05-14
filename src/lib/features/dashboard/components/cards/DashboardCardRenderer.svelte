<script lang="ts">
    import type { DashboardItem, TabCardConfig } from "$lib/types/dashboard";
    import ButtonCard from "./ButtonCard.svelte";
    import CalendarAgendaCard from "./CalendarAgendaCard.svelte";
    import DevicePanelCard from "./DevicePanelCard.svelte";
    import EnergyFlowCard from "./EnergyFlowCard.svelte";
    import EntityCollectionCard from "./EntityCollectionCard.svelte";
    import GraphCard from "./GraphCard.svelte";
    import MediaCard from "./MediaCard.svelte";
    import NavigationCard from "./NavigationCard.svelte";
    import RemotePanelCard from "./RemotePanelCard.svelte";
    import RoomSummaryCard from "./RoomSummaryCard.svelte";
    import TabCard from "./TabCard.svelte";
    import ThermostatCard from "./ThermostatCard.svelte";
    import TitleCard from "./TitleCard.svelte";
    import WeatherOverviewCard from "./WeatherOverviewCard.svelte";

    interface Props {
        item: DashboardItem;
        ondelete?: (id: string) => void;
    }

    let { item = $bindable(), ondelete }: Props = $props();

    function applyRenderableDefaults() {
        item.entityId ??= "";
        item.name ??= "";
        item.domainFilter ??= "";
        item.secondaryEntityId ??= "";
        item.secondaryName ??= "";

        item.options ??= {};
        if (item.cardType === "button") item.options.button ??= {};
        if (item.cardType === "room") item.options.room ??= { source: "auto" };
        if (item.cardType === "collection") item.options.collection ??= { mode: "auto", showState: true };
        if (item.cardType === "energy") item.options.energy ??= { source: "auto" };
        if (item.cardType === "calendar") item.options.calendar ??= { source: "auto", daysToShow: 7, maxEvents: 4 };
        if (item.cardType === "weather") item.options.weather ??= { source: "auto" };
        if (item.cardType === "remote") item.options.remote ??= { preset: "tv" };
        if (item.cardType === "device_panel") item.options.device_panel ??= { preset: "auto" };
        if (item.cardType === "title") {
            item.subtitle ??= "";
            item.alignment ??= "start";
        }
        if (item.cardType === "graph") {
            item.hours_to_show ??= 24;
            item.aggregate_func ??= "avg";
            item.graphEntities ??= [];
        }
        if (item.cardType === "navigation") {
            item.path ??= "";
            item.iconType ??= "icon";
            item.imageUrl ??= "";
            item.shortcuts ??= [];
        }
    }

    applyRenderableDefaults();

    $effect(() => {
        applyRenderableDefaults();
    });

    function remove() {
        ondelete?.(item.id);
    }
</script>

{#if item.cardType === "button" && item.options}
    <ButtonCard
        id={item.id}
        bind:name={item.name}
        bind:entityId={item.entityId}
        bind:domainFilter={item.domainFilter}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:icon={item.icon}
        bind:options={item.options.button}
        ondelete={remove}
    />
{:else if item.cardType === "media"}
    <MediaCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:domainFilter={item.domainFilter}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:icon={item.icon}
        ondelete={remove}
    />
{:else if item.cardType === "title"}
    <TitleCard
        id={item.id}
        bind:name={item.name}
        bind:subtitle={item.subtitle}
        bind:alignment={item.alignment}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        ondelete={remove}
    />
{:else if item.cardType === "thermostat"}
    <ThermostatCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:secondaryEntityId={item.secondaryEntityId}
        bind:secondaryName={item.secondaryName}
        bind:domainFilter={item.domainFilter}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:icon={item.icon}
        ondelete={remove}
    />
{:else if item.cardType === "tabs"}
    <TabCard bind:config={item as TabCardConfig} />
{:else if item.cardType === "graph"}
    <GraphCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:hours_to_show={item.hours_to_show}
        bind:aggregate_func={item.aggregate_func}
        bind:graphEntities={item.graphEntities}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:icon={item.icon}
        fetchHistory={item.fetchHistory !== false}
        ondelete={remove}
    />
{:else if item.cardType === "navigation"}
    <NavigationCard
        id={item.id}
        bind:name={item.name}
        bind:path={item.path}
        bind:icon={item.icon}
        bind:iconType={item.iconType}
        bind:imageUrl={item.imageUrl}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:shortcuts={item.shortcuts}
        bind:entityId={item.entityId}
        ondelete={remove}
    />
{:else if item.cardType === "room" && item.options}
    <RoomSummaryCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.room}
        ondelete={remove}
    />
{:else if item.cardType === "collection" && item.options}
    <EntityCollectionCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.collection}
        ondelete={remove}
    />
{:else if item.cardType === "energy" && item.options}
    <EnergyFlowCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.energy}
        ondelete={remove}
    />
{:else if item.cardType === "calendar" && item.options}
    <CalendarAgendaCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.calendar}
        ondelete={remove}
    />
{:else if item.cardType === "weather" && item.options}
    <WeatherOverviewCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.weather}
        ondelete={remove}
    />
{:else if item.cardType === "remote" && item.options}
    <RemotePanelCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.remote}
        ondelete={remove}
    />
{:else if item.cardType === "device_panel" && item.options}
    <DevicePanelCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.device_panel}
        ondelete={remove}
    />
{/if}
