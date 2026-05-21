<script lang="ts">
    import type {
        DashboardCardSurfaceStyle,
        DashboardItem,
        TabCardConfig,
    } from "$lib/types/dashboard";
    import AirControlCard from "./AirControlCard.svelte";
    import ButtonCard from "./ButtonCard.svelte";
    import CalendarAgendaCard from "./CalendarAgendaCard.svelte";
    import CameraCard from "./CameraCard.svelte";
    import CoverControlCard from "./CoverControlCard.svelte";
    import DevicePanelCard from "./DevicePanelCard.svelte";
    import EnergyFlowCard from "./EnergyFlowCard.svelte";
    import EntityCollectionCard from "./EntityCollectionCard.svelte";
    import GraphCard from "./GraphCard.svelte";
    import LockStatusCard from "./LockStatusCard.svelte";
    import MediaCard from "./MediaCard.svelte";
    import NavigationCard from "./NavigationCard.svelte";
    import PresenceSummaryCard from "./PresenceSummaryCard.svelte";
    import RemotePanelCard from "./RemotePanelCard.svelte";
    import RoomSummaryCard from "./RoomSummaryCard.svelte";
    import SecurityStatusCard from "./SecurityStatusCard.svelte";
    import TabCard from "./TabCard.svelte";
    import ThermostatCard from "./ThermostatCard.svelte";
    import TitleCard from "./TitleCard.svelte";
    import TodoListCard from "./TodoListCard.svelte";
    import UpdateStatusCard from "./UpdateStatusCard.svelte";
    import VacuumControlCard from "./VacuumControlCard.svelte";
    import WeatherOverviewCard from "./WeatherOverviewCard.svelte";

    interface Props {
        item: DashboardItem;
        layoutRows?: number;
        surfaceStyle?: DashboardCardSurfaceStyle;
        ondelete?: (id: string) => void;
    }

    let {
        item = $bindable(),
        layoutRows,
        surfaceStyle = "md3",
        ondelete,
    }: Props = $props();

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
        {surfaceStyle}
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
        {layoutRows}
        {surfaceStyle}
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
        {layoutRows}
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "tabs"}
    <TabCard bind:config={item as TabCardConfig} {surfaceStyle} />
{:else if item.cardType === "graph"}
    <GraphCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:hours_to_show={item.hours_to_show}
        bind:aggregate_func={item.aggregate_func}
        bind:chartType={item.chartType}
        bind:graphEntities={item.graphEntities}
        bind:comparisonMode={item.comparisonMode}
        bind:dataSource={item.dataSource}
        bind:statisticsPeriod={item.statisticsPeriod}
        bind:scaleMode={item.scaleMode}
        bind:showAnalytics={item.showAnalytics}
        bind:color_thresholds={item.color_thresholds}
        bind:rangeBands={item.rangeBands}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:icon={item.icon}
        fetchHistory={item.fetchHistory !== false}
        {layoutRows}
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "navigation"}
    <NavigationCard
        id={item.id}
        bind:name={item.name}
        bind:subtitle={item.subtitle}
        bind:path={item.path}
        bind:icon={item.icon}
        bind:iconType={item.iconType}
        bind:imageUrl={item.imageUrl}
        bind:imageAttribution={item.imageAttribution}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:shortcuts={item.shortcuts}
        bind:entityId={item.entityId}
        {surfaceStyle}
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
        {surfaceStyle}
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
        {surfaceStyle}
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
        {layoutRows}
        {surfaceStyle}
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
        {surfaceStyle}
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
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "camera" && item.options}
    <CameraCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.camera}
        {surfaceStyle}
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
        {surfaceStyle}
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
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "presence" && item.options}
    <PresenceSummaryCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.presence}
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "security" && item.options}
    <SecurityStatusCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.security}
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "lock" && item.options}
    <LockStatusCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.lock}
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "cover" && item.options}
    <CoverControlCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.cover}
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "air" && item.options}
    <AirControlCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.air}
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "update" && item.options}
    <UpdateStatusCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.update}
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "todo" && item.options}
    <TodoListCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.todo}
        {surfaceStyle}
        ondelete={remove}
    />
{:else if item.cardType === "vacuum" && item.options}
    <VacuumControlCard
        id={item.id}
        bind:entityId={item.entityId}
        bind:name={item.name}
        bind:icon={item.icon}
        bind:color={item.color}
        bind:backgroundColor={item.backgroundColor}
        bind:options={item.options.vacuum}
        {surfaceStyle}
        ondelete={remove}
    />
{/if}
