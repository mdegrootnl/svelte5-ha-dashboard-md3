<script lang="ts">
    import SideSheet from "./SideSheet.svelte";
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import DashboardCardRenderer from "$lib/features/dashboard/components/cards/DashboardCardRenderer.svelte";
    import GenerationStateBadge from "$lib/features/dashboard/components/GenerationStateBadge.svelte";
    import { generateDashboard } from "$lib/domain/dashboardGenerator";
    import {
        createInventoryIndex,
        type InventoryContext,
        type ResolvedEntity,
    } from "$lib/domain/haInventory";
    import { haRegistryStore } from "$lib/stores/haRegistry.svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import { dashboardStore, DashboardStore } from "$lib/features/dashboard/stores/dashboard.svelte";
    import { normalizeRoomDashboardConfig } from "$lib/features/dashboard/utils/dashboardDefaults";
    import { mergeGeneratedConfigWithExisting } from "$lib/features/dashboard/utils/generationMerge";
    import type {
        DashboardCardType,
        DashboardItem,
        DashboardGenerationQualityCode,
        DashboardGenerationQualityHint,
        DashboardGenerationQualitySeverity,
        DashboardGenerationRecipe,
        DashboardGenerationResult,
        GridConfig,
        ResponsiveLayout,
        RoomDashboardConfig,
    } from "$lib/types/dashboard";
    import IconAutoAwesome from "~icons/material-symbols/auto-awesome";
    import IconArrowDownward from "~icons/material-symbols/arrow-downward";
    import IconArrowUpward from "~icons/material-symbols/arrow-upward";
    import IconCheck from "~icons/material-symbols/check";
    import IconClose from "~icons/material-symbols/close";
    import IconDelete from "~icons/material-symbols/delete";
    import IconEdit from "~icons/material-symbols/edit";
    import IconHome from "~icons/material-symbols/home";
    import IconPushPin from "~icons/material-symbols/push-pin";
    import IconRefresh from "~icons/material-symbols/refresh";
    import IconRoom from "~icons/material-symbols/meeting-room";
    import { untrack } from "svelte";

    const ROOT_PREVIEW_ID = "__root";
    const CARD_FAMILY_ORDER: DashboardCardType[] = [
        "button",
        "thermostat",
        "media",
        "graph",
        "collection",
        "energy",
        "calendar",
        "weather",
        "remote",
        "device_panel",
        "tabs",
        "room",
    ];
    const QUALITY_HINT_GROUP_ORDER: DashboardGenerationQualitySeverity[] = [
        "warning",
        "suggestion",
        "info",
    ];

    interface Props {
        open: boolean;
        targetDashboardId: string;
        areaId?: string | null;
        cleanGenerated?: boolean;
        onapply?: (config: RoomDashboardConfig, relatedConfigs?: RoomDashboardConfig[]) => void;
        onclose?: () => void;
    }

    type EntityReviewSourceFilter =
        | "all"
        | "entity_registry"
        | "device_registry"
        | "name_inference"
        | "unassigned";
    type EntityReviewSourceKey = Exclude<EntityReviewSourceFilter, "all">;

    let {
        open = $bindable(false),
        targetDashboardId,
        areaId = null,
        cleanGenerated = false,
        onapply,
        onclose,
    }: Props = $props();

    let recipe = $state<Extract<DashboardGenerationRecipe, "house" | "room" | "floor" | "entity_type" | "label" | "maintenance">>("house");
    let selectedAreaId = $state("");
    let selectedFloorId = $state("");
    let selectedEntityTypeId = $state("");
    let selectedLabelId = $state("");
    let includeLabels = $state<string[]>([]);
    let excludeLabels = $state<string[]>([]);
    let includeEntityIds = $state<string[]>([]);
    let excludeEntityIds = $state<string[]>([]);
    let disabledCardTypes = $state<DashboardCardType[]>([]);
    let cardFamilyCounts = $state<Partial<Record<DashboardCardType, number>>>({});
    let entityReviewMode = $state<"included" | "skipped">("included");
    let entityReviewSourceFilter = $state<EntityReviewSourceFilter>("all");
    let selectedPreviewConfigId = $state(ROOT_PREVIEW_ID);
    let draft = $state<DashboardGenerationResult | null>(null);
    let inventorySnapshot = $state<InventoryContext | null>(null);
    let initializedForOpen = $state(false);
    let editingItemId = $state<string | null>(null);
    let editName = $state("");
    let editSubtitle = $state("");
    let editIcon = $state("");
    let editPath = $state("");
    let cleanGeneratedBeforeApply = $state(false);
    let cleanApplyConfirmationPending = $state(false);

    interface EntityReviewRow {
        entityId: string;
        reasons: string[];
        importanceReasons: string[];
        count: number;
        importanceScore?: number;
        areaSource?: EntityReviewSourceKey;
        areaSourceLabel?: string;
        areaSourceTone?: "default" | "warning";
    }

    interface InventoryQualityMetric {
        id: EntityReviewSourceKey;
        label: string;
        value: number;
        tone: "default" | "warning";
    }

    interface EntityReviewSourceChoice {
        id: EntityReviewSourceFilter;
        label: string;
        count: number;
        tone: "default" | "warning";
    }

    interface QualityHintReviewTarget {
        mode: "included" | "skipped";
        filter: EntityReviewSourceFilter;
        label: string;
    }

    interface QualityHintGroup {
        severity: DashboardGenerationQualitySeverity;
        label: string;
        description: string;
        entityCount: number;
        hints: DashboardGenerationQualityHint[];
    }

    interface InventoryQualitySummary {
        total: number;
        entityRegistry: number;
        deviceRegistry: number;
        nameInference: number;
        unassigned: number;
        metrics: InventoryQualityMetric[];
    }

    interface PreviewConfigChoice {
        id: string;
        label: string;
        description: string;
        kind: "root" | "related";
        config: RoomDashboardConfig;
    }

    interface EntityTypeChoice {
        id: string;
        label: string;
        description: string;
        domain: string;
        deviceClass?: string;
        count: number;
    }

    interface LabelChoice {
        id: string;
        label: string;
        description: string;
        count: number;
    }

    interface CardFamilyRow {
        cardType: DashboardCardType;
        label: string;
        count: number;
        disabled: boolean;
    }

    const recipeChoices: Array<{
        id: Extract<DashboardGenerationRecipe, "house" | "room" | "floor" | "entity_type" | "label" | "maintenance">;
        label: string;
        description: string;
        icon: typeof IconHome;
    }> = [
        {
            id: "house",
            label: "House Overview",
            description: "Rooms, global status, weather, energy, calendar, media, and maintenance collections.",
            icon: IconHome,
        },
        {
            id: "floor",
            label: "Floor Overview",
            description: "Room navigation and floor-scoped active device and maintenance collections.",
            icon: IconHome,
        },
        {
            id: "room",
            label: "Room Dashboard",
            description: "Area-based Comfort, Media, Status, and Actions sections.",
            icon: IconRoom,
        },
        {
            id: "entity_type",
            label: "Entity Type",
            description: "Focused dashboards for domains or device classes like lights, climate, media, or batteries.",
            icon: IconHome,
        },
        {
            id: "label",
            label: "Label",
            description: "Focused dashboards from explicit Home Assistant entity or device labels.",
            icon: IconHome,
        },
        {
            id: "maintenance",
            label: "Maintenance",
            description: "Unavailable entities, low batteries, available updates, and active alert sensors.",
            icon: IconHome,
        },
    ];

    let areaChoices = $derived(
        [...haRegistryStore.areas].sort((a, b) => a.name.localeCompare(b.name)),
    );
    let floorChoices = $derived(
        [...haRegistryStore.floors].sort((a, b) => a.name.localeCompare(b.name)),
    );

    let selectedAreaName = $derived(
        areaChoices.find((area) => area.area_id === selectedAreaId)?.name ??
            selectedAreaId,
    );
    let selectedFloorName = $derived(
        floorChoices.find((floor) => floor.floor_id === selectedFloorId)?.name ??
            selectedFloorId,
    );
    let entityTypeChoices = $derived.by(() => getEntityTypeChoices(inventorySnapshot));
    let selectedEntityTypeChoice = $derived(
        entityTypeChoices.find((choice) => choice.id === selectedEntityTypeId) ??
            entityTypeChoices[0] ??
            null,
    );
    let availableLabels = $derived(
        Array.from(
            new Set([
                ...haRegistryStore.entityRegistry.flatMap((entity) => entity.labels ?? []),
                ...haRegistryStore.deviceRegistry.flatMap((device) => device.labels ?? []),
            ]),
        ).sort((a, b) => a.localeCompare(b)),
    );
    let labelChoices = $derived.by(() => getLabelChoices(inventorySnapshot, availableLabels));
    let selectedLabelChoice = $derived(
        labelChoices.find((choice) => choice.id === selectedLabelId) ??
            labelChoices[0] ??
            null,
    );

    let previewConfigs = $derived.by((): PreviewConfigChoice[] => {
        if (!draft) return [];

        return [
            {
                id: ROOT_PREVIEW_ID,
                label: draft.config.name || "House Overview",
                description:
                    recipe === "house"
                        ? "Root dashboard"
                        : recipe === "floor"
                          ? "Floor dashboard"
                          : recipe === "entity_type"
                            ? "Entity type dashboard"
                            : recipe === "label"
                              ? "Label dashboard"
                              : recipe === "maintenance"
                                ? "Maintenance dashboard"
                            : "Room dashboard",
                kind: "root",
                config: draft.config,
            },
            ...(draft.relatedConfigs ?? []).map((config) => ({
                id: getPreviewConfigId(config),
                label: config.name || config.tabs[0]?.name || config.id,
                description: "Generated room dashboard",
                kind: "related" as const,
                config,
            })),
        ];
    });
    let selectedPreviewConfig = $derived(
        previewConfigs.find((config) => config.id === selectedPreviewConfigId) ??
            previewConfigs[0] ??
            null,
    );
    let previewTab = $derived(
        selectedPreviewConfig
            ? getPreviewRootGrid(selectedPreviewConfig.config)
            : null,
    );
    let editingItem = $derived(
        editingItemId && selectedPreviewConfig
            ? findItemInConfig(selectedPreviewConfig.config, editingItemId)
            : null,
    );
    let selectedPreviewTitle = $derived(
        selectedPreviewConfig?.label ??
            (recipe === "room"
                ? selectedAreaName
                : recipe === "floor"
                  ? selectedFloorName
                  : recipe === "entity_type"
                    ? selectedEntityTypeChoice?.label ?? "Entity Type"
                    : recipe === "label"
                      ? selectedLabelChoice?.label ?? "Label"
                      : recipe === "maintenance"
                        ? "Maintenance"
                    : "House Overview"),
    );
    let selectedPreviewDescription = $derived(
        selectedPreviewConfig?.description ?? "Generated dashboard draft",
    );
    let rootCardCount = $derived(getConfigCardCount(draft?.config));
    let relatedCardCount = $derived(getRelatedCardCount(draft?.relatedConfigs ?? []));
    let visibleCardCount = $derived(
        rootCardCount + relatedCardCount,
    );
    let relatedDashboardCount = $derived(draft?.relatedConfigs?.length ?? 0);
    let cardFamilyRows = $derived.by(() => getCardFamilyRows(cardFamilyCounts));
    let resolvedEntityById = $derived.by(() => getResolvedEntityMap(inventorySnapshot));
    let inventoryQuality = $derived.by(() => getInventoryQualitySummary(resolvedEntityById));
    let includedEntityRows = $derived(summarizeEntityRefs(draft?.includedEntities ?? []));
    let skippedEntityRows = $derived(summarizeEntityRefs(draft?.skippedEntities ?? []));
    let qualityHintRows = $derived(draft?.qualityHints ?? []);
    let qualityHintGroups = $derived.by(() => groupQualityHints(qualityHintRows));
    let unfilteredEntityRows = $derived(
        entityReviewMode === "included" ? includedEntityRows : skippedEntityRows,
    );
    let entityReviewSourceChoices = $derived.by(() =>
        getEntityReviewSourceChoices(unfilteredEntityRows),
    );
    let activeEntityRows = $derived.by(() =>
        filterEntityReviewRows(unfilteredEntityRows, entityReviewSourceFilter),
    );

    $effect(() => {
        if (!open) {
            initializedForOpen = false;
            draft = null;
            inventorySnapshot = null;
            includeLabels = [];
            excludeLabels = [];
            includeEntityIds = [];
            excludeEntityIds = [];
            disabledCardTypes = [];
            cardFamilyCounts = {};
            entityReviewMode = "included";
            entityReviewSourceFilter = "all";
            selectedPreviewConfigId = ROOT_PREVIEW_ID;
            selectedEntityTypeId = "";
            selectedLabelId = "";
            cleanGeneratedBeforeApply = false;
            cleanApplyConfirmationPending = false;
            closePreviewItemEditor();
            return;
        }

        if (!initializedForOpen) {
            const routeArea =
                areaId && areaChoices.some((area) => area.area_id === areaId)
                    ? areaId
                    : "";
            const routeFloor = areaChoices.find((area) => area.area_id === routeArea)?.floor_id ?? "";
            selectedAreaId = routeArea || selectedAreaId || areaChoices[0]?.area_id || "";
            selectedFloorId = routeFloor || selectedFloorId || floorChoices[0]?.floor_id || "";
            selectedEntityTypeId = selectedEntityTypeId || entityTypeChoices[0]?.id || "";
            selectedLabelId = selectedLabelId || labelChoices[0]?.id || "";
            cleanGeneratedBeforeApply = cleanGenerated;
            cleanApplyConfirmationPending = false;
            recipe = routeArea ? "room" : "house";
            refreshInventorySnapshot();
            initializedForOpen = true;
        }
    });

    $effect(() => {
        if (!open || !initializedForOpen || !inventorySnapshot) return;

        if (recipe === "room" && !selectedAreaId && areaChoices[0]) {
            selectedAreaId = areaChoices[0].area_id;
            return;
        }

        if (recipe === "floor" && !selectedFloorId && floorChoices[0]) {
            selectedFloorId = floorChoices[0].floor_id;
            return;
        }

        if (recipe === "entity_type" && !selectedEntityTypeId && entityTypeChoices[0]) {
            selectedEntityTypeId = entityTypeChoices[0].id;
            return;
        }

        if (recipe === "label" && !selectedLabelId && labelChoices[0]) {
            selectedLabelId = labelChoices[0].id;
            return;
        }

        const generatedDraft = generateDashboard(
            inventorySnapshot,
            {
                recipe,
                targetDashboardId: getGeneratedTargetDashboardId(),
                areaId: recipe === "room" ? selectedAreaId : undefined,
                floorId: recipe === "floor" ? selectedFloorId : undefined,
                entityDomain:
                    recipe === "entity_type" ? selectedEntityTypeChoice?.domain : undefined,
                entityDeviceClass:
                    recipe === "entity_type" ? selectedEntityTypeChoice?.deviceClass : undefined,
                labelId: recipe === "label" ? selectedLabelChoice?.id : undefined,
                includeLabels,
                excludeLabels,
                includeEntityIds,
                excludeEntityIds,
                applyMode: "replace_draft",
            },
        );
        normalizeRoomDashboardConfig(generatedDraft.config);
        for (const config of generatedDraft.relatedConfigs ?? []) {
            normalizeRoomDashboardConfig(config);
        }

        const mergeOptions = {
            preserveUserModifiedGeneratedItems: !cleanGeneratedBeforeApply,
        };
        const rootMerge = mergeGeneratedConfigWithExisting(
            generatedDraft.config,
            dashboardStore.savedConfigs[generatedDraft.config.id],
            mergeOptions,
        );
        generatedDraft.config = rootMerge.config;

        let preservedItems = rootMerge.summary.preservedItems;
        let preservedTabs = rootMerge.summary.preservedTabs;
        generatedDraft.relatedConfigs = (generatedDraft.relatedConfigs ?? []).map((config) => {
            const merge = mergeGeneratedConfigWithExisting(
                config,
                dashboardStore.savedConfigs[config.id],
                mergeOptions,
            );
            preservedItems += merge.summary.preservedItems;
            preservedTabs += merge.summary.preservedTabs;
            return merge.config;
        });

        if (preservedItems > 0 || preservedTabs > 0) {
            generatedDraft.warnings = [
                ...generatedDraft.warnings,
                `Preserved ${preservedItems} user-modified/manual cards and ${preservedTabs} manual tabs from existing dashboards.`,
            ];
        }

        if (cleanGeneratedBeforeApply) {
            generatedDraft.warnings = [
                ...generatedDraft.warnings,
                'Clean regeneration is enabled: edited generated cards in this scope are replaced by the fresh draft. Manual and pinned content is preserved.',
            ];
        }

        cardFamilyCounts = countGeneratedCardFamilies(generatedDraft);
        cleanApplyConfirmationPending = false;
        draft = applyCardTypeExclusions(generatedDraft);
        selectedPreviewConfigId = ROOT_PREVIEW_ID;
        closePreviewItemEditor();
    });

    $effect(() => {
        if (editingItemId && !editingItem) {
            closePreviewItemEditor();
        }
    });

    function getPreviewConfigId(config: RoomDashboardConfig) {
        return `related:${config.id}`;
    }

    function getGridCardCount(grid: GridConfig): number {
        return grid.items.reduce((count, item) => {
            const nestedCount = item.tabs?.reduce(
                (total, tab) => total + getGridCardCount(tab),
                0,
            ) ?? 0;
            return count + 1 + nestedCount;
        }, 0);
    }

    function getConfigCardCount(config?: RoomDashboardConfig | null) {
        return config?.tabs.reduce((count, tab) => count + getGridCardCount(tab), 0) ?? 0;
    }

    function getRelatedCardCount(relatedConfigs: RoomDashboardConfig[]) {
        return relatedConfigs.reduce(
            (count, config) => count + getConfigCardCount(config),
            0,
        );
    }

    function formatCardTypeLabel(cardType: DashboardCardType) {
        const labels: Partial<Record<DashboardCardType, string>> = {
            button: "Buttons",
            thermostat: "Thermostats",
            media: "Media",
            graph: "Graphs",
            collection: "Collections",
            energy: "Energy",
            calendar: "Calendar",
            weather: "Weather",
            remote: "Remotes",
            device_panel: "Device Panels",
            tabs: "Tabs",
            room: "Room Summaries",
            navigation: "Navigation",
            title: "Titles",
        };
        return labels[cardType] ?? cardType;
    }

    function isGeneratedPreviewItem(item: DashboardItem) {
        return Boolean(item.generatedBy || item.generationState);
    }

    function getGridItemsRecursive(grid: GridConfig): DashboardItem[] {
        return grid.items.flatMap((item) => [
            item,
            ...(item.tabs?.flatMap((tab) => getGridItemsRecursive(tab)) ?? []),
        ]);
    }

    function getConfigItems(config: RoomDashboardConfig) {
        return config.tabs.flatMap((tab) => getGridItemsRecursive(tab));
    }

    function getAllPreviewItems(result: DashboardGenerationResult) {
        return [result.config, ...(result.relatedConfigs ?? [])].flatMap((config) =>
            getConfigItems(config),
        );
    }

    function countGeneratedCardFamilies(result: DashboardGenerationResult) {
        const counts: Partial<Record<DashboardCardType, number>> = {};
        for (const item of getAllPreviewItems(result)) {
            if (!isGeneratedPreviewItem(item)) continue;
            if (!CARD_FAMILY_ORDER.includes(item.cardType)) continue;
            counts[item.cardType] = (counts[item.cardType] ?? 0) + 1;
        }
        return counts;
    }

    function getCardFamilyRows(
        counts: Partial<Record<DashboardCardType, number>>,
    ): CardFamilyRow[] {
        return CARD_FAMILY_ORDER
            .map((cardType) => ({
                cardType,
                label: formatCardTypeLabel(cardType),
                count: counts[cardType] ?? 0,
                disabled: disabledCardTypes.includes(cardType),
            }))
            .filter((row) => row.count > 0);
    }

    function compactGeneratedTitles(items: DashboardItem[]) {
        return items.filter((item, index) => {
            if (item.cardType !== "title") return true;
            if (!isGeneratedPreviewItem(item)) return true;
            if (index === 0) return true;

            for (let nextIndex = index + 1; nextIndex < items.length; nextIndex += 1) {
                const nextItem = items[nextIndex];
                if (nextItem.cardType === "title") return false;
                return true;
            }

            return false;
        });
    }

    function getPreviewRootGrid(config: RoomDashboardConfig): GridConfig | null {
        return config.tabs[0] ?? null;
    }

    function collectNestedItemIds(item: DashboardItem): string[] {
        return [
            item.id,
            ...(item.tabs?.flatMap((tab) =>
                getGridItemsRecursive(tab).map((nestedItem) => nestedItem.id),
            ) ?? []),
        ];
    }

    function applyCardTypeExclusions(result: DashboardGenerationResult) {
        const disabled = new Set(disabledCardTypes);
        if (disabled.size === 0) return result;

        const removedCardIds = new Set<string>();
        const filterGrid = (grid: GridConfig): GridConfig => {
            const items = grid.items
                .map((item) => ({
                    ...item,
                    tabs: item.tabs?.map(filterGrid),
                }))
                .filter((item) => {
                    const remove =
                        isGeneratedPreviewItem(item) &&
                        disabled.has(item.cardType);
                    if (remove) {
                        for (const id of collectNestedItemIds(item)) {
                            removedCardIds.add(id);
                        }
                    }
                    return !remove;
                });

            return {
                ...grid,
                items: compactGeneratedTitles(items),
            };
        };
        const filterConfig = (config: RoomDashboardConfig): RoomDashboardConfig => ({
            ...config,
            tabs: config.tabs.map(filterGrid),
        });

        const config = filterConfig(result.config);
        const relatedConfigs = (result.relatedConfigs ?? []).map(filterConfig);
        const includedEntities = result.includedEntities.filter(
            (entityRef) =>
                !entityRef.cardId || !removedCardIds.has(entityRef.cardId),
        );
        const cards = getConfigCardCount(config);
        const relatedCards = getRelatedCardCount(relatedConfigs);

        return {
            ...result,
            config,
            relatedConfigs,
            includedEntities,
            summary: {
                ...result.summary,
                cards,
                included: includedEntities.length,
                relatedDashboards: relatedConfigs.length,
                relatedCards,
            },
        };
    }

    function refreshInventorySnapshot() {
        inventorySnapshot = untrack(() => ({
            states: haStore.getStatesSnapshot(),
            entities: [...haRegistryStore.entityRegistry],
            devices: [...haRegistryStore.deviceRegistry],
            areas: [...haRegistryStore.areas],
            floors: [...haRegistryStore.floors],
        }));
    }

    function prettifyToken(value: string) {
        return value
            .split(/[_\s-]+/)
            .filter(Boolean)
            .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
            .join(" ");
    }

    function pluralizeLabel(value: string) {
        if (value.endsWith("y")) return `${value.slice(0, -1)}ies`;
        if (value.endsWith("s")) return value;
        return `${value}s`;
    }

    function getEntityTypeChoiceId(domain: string, deviceClass?: string) {
        return [domain, deviceClass].filter(Boolean).join(":");
    }

    function getEntityTypeChoiceLabel(domain: string, deviceClass?: string) {
        const domainLabel = pluralizeLabel(prettifyToken(domain));
        return deviceClass ? `${prettifyToken(deviceClass)} ${domainLabel}` : domainLabel;
    }

    function getEntityTypeRouteId(choice: EntityTypeChoice) {
        return choice.id.replace(/[^a-zA-Z0-9_-]+/g, "_");
    }

    function getEntityTypeChoices(context: InventoryContext | null): EntityTypeChoice[] {
        if (!context) return [];

        const choices = new Map<string, EntityTypeChoice>();
        for (const state of Object.values(context.states ?? {})) {
            const domain = state.entity_id.split(".")[0];
            if (!domain) continue;
            const deviceClass =
                typeof state.attributes?.device_class === "string"
                    ? state.attributes.device_class
                    : undefined;

            const domainId = getEntityTypeChoiceId(domain);
            const domainChoice = choices.get(domainId) ?? {
                id: domainId,
                label: getEntityTypeChoiceLabel(domain),
                description: "",
                domain,
                count: 0,
            };
            domainChoice.count += 1;
            domainChoice.description = `${domainChoice.count} matching ${domainChoice.count === 1 ? "entity" : "entities"}`;
            choices.set(domainId, domainChoice);

            if (deviceClass) {
                const classId = getEntityTypeChoiceId(domain, deviceClass);
                const classChoice = choices.get(classId) ?? {
                    id: classId,
                    label: getEntityTypeChoiceLabel(domain, deviceClass),
                    description: "",
                    domain,
                    deviceClass,
                    count: 0,
                };
                classChoice.count += 1;
                classChoice.description = `${classChoice.count} matching ${classChoice.count === 1 ? "entity" : "entities"}`;
                choices.set(classId, classChoice);
            }
        }

        return [...choices.values()].sort((a, b) => {
            const domainCompare = a.domain.localeCompare(b.domain);
            if (domainCompare !== 0) return domainCompare;
            if (!a.deviceClass && b.deviceClass) return -1;
            if (a.deviceClass && !b.deviceClass) return 1;
            return a.label.localeCompare(b.label);
        });
    }

    function getLabelChoices(
        context: InventoryContext | null,
        fallbackLabels: string[],
    ): LabelChoice[] {
        const choices = new Map<string, LabelChoice>();

        for (const label of fallbackLabels) {
            choices.set(label, {
                id: label,
                label: prettifyToken(label),
                description: "No matching loaded entities",
                count: 0,
            });
        }

        if (!context) return [...choices.values()].sort((a, b) => a.label.localeCompare(b.label));

        const registryById = new Map(context.entities.map((entry) => [entry.entity_id, entry]));
        const deviceById = new Map((context.devices ?? []).map((device) => [device.id, device]));

        for (const entityId of Object.keys(context.states ?? {})) {
            const entry = registryById.get(entityId);
            const deviceLabels = entry?.device_id
                ? (deviceById.get(entry.device_id)?.labels ?? [])
                : [];
            const labels = Array.from(new Set([...(entry?.labels ?? []), ...deviceLabels]));

            for (const label of labels) {
                const existing = choices.get(label) ?? {
                    id: label,
                    label: prettifyToken(label),
                    description: "",
                    count: 0,
                };
                existing.count += 1;
                existing.description = `${existing.count} matching ${existing.count === 1 ? "entity" : "entities"}`;
                choices.set(label, existing);
            }
        }

        return [...choices.values()].sort((a, b) => {
            if (a.count !== b.count) return b.count - a.count;
            return a.label.localeCompare(b.label);
        });
    }

    function getLabelRouteId(label: string) {
        return label.replace(/[^a-zA-Z0-9_-]+/g, "_");
    }

    function getGeneratedTargetDashboardId() {
        if (recipe === "floor" && selectedFloorId) {
            return DashboardStore.deriveConfigId(selectedFloorId);
        }

        if (recipe === "room" && selectedAreaId) {
            const area = areaChoices.find((candidate) => candidate.area_id === selectedAreaId);
            return DashboardStore.deriveConfigId(area?.floor_id ?? "unassigned", selectedAreaId);
        }

        if (recipe === "entity_type" && selectedEntityTypeChoice) {
            return DashboardStore.deriveConfigId("entity", getEntityTypeRouteId(selectedEntityTypeChoice));
        }

        if (recipe === "label" && selectedLabelChoice) {
            return DashboardStore.deriveConfigId("label", getLabelRouteId(selectedLabelChoice.id));
        }

        if (recipe === "maintenance") {
            return DashboardStore.deriveConfigId("maintenance");
        }

        return targetDashboardId;
    }

    function getResolvedEntityMap(context: InventoryContext | null) {
        if (!context) return new Map<string, ResolvedEntity>();

        return new Map(
            createInventoryIndex(context).resolvedEntities.map((entity) => [
                entity.entityId,
                entity,
            ]),
        );
    }

    function getInventoryQualitySummary(
        entitiesById: Map<string, ResolvedEntity>,
    ): InventoryQualitySummary {
        const summary = {
            total: entitiesById.size,
            entityRegistry: 0,
            deviceRegistry: 0,
            nameInference: 0,
            unassigned: 0,
        };

        for (const entity of entitiesById.values()) {
            if (entity.areaSource === "entity_registry") {
                summary.entityRegistry += 1;
            } else if (entity.areaSource === "device_registry") {
                summary.deviceRegistry += 1;
            } else if (entity.areaSource === "name_inference") {
                summary.nameInference += 1;
            } else {
                summary.unassigned += 1;
            }
        }

        return {
            ...summary,
            metrics: [
                {
                    id: "entity_registry",
                    label: "Entity registry",
                    value: summary.entityRegistry,
                    tone: "default",
                },
                {
                    id: "device_registry",
                    label: "Device registry",
                    value: summary.deviceRegistry,
                    tone: "default",
                },
                {
                    id: "name_inference",
                    label: "Name inference",
                    value: summary.nameInference,
                    tone: summary.nameInference > 0 ? "warning" : "default",
                },
                {
                    id: "unassigned",
                    label: "No room source",
                    value: summary.unassigned,
                    tone: summary.unassigned > 0 ? "warning" : "default",
                },
            ],
        };
    }

    function getEntityReviewSource(entityId: string): Pick<
        EntityReviewRow,
        "areaSource" | "areaSourceLabel" | "areaSourceTone"
    > {
        const entity = resolvedEntityById.get(entityId);

        if (entity?.areaSource === "name_inference") {
            return {
                areaSource: "name_inference",
                areaSourceLabel: "Name-inferred area",
                areaSourceTone: "warning",
            };
        }

        if (entity?.areaSource === "device_registry") {
            return {
                areaSource: "device_registry",
                areaSourceLabel: "Device area",
                areaSourceTone: "default",
            };
        }

        if (entity?.areaSource === "entity_registry") {
            return {
                areaSource: "entity_registry",
                areaSourceLabel: "Entity area",
                areaSourceTone: "default",
            };
        }

        if (entity) {
            return {
                areaSource: "unassigned",
                areaSourceLabel: "No room source",
                areaSourceTone: "warning",
            };
        }

        return {};
    }

    function getEntityReviewSourceLabel(filter: EntityReviewSourceFilter) {
        if (filter === "entity_registry") return "Entity area";
        if (filter === "device_registry") return "Device area";
        if (filter === "name_inference") return "Name-inferred";
        if (filter === "unassigned") return "No room source";
        return "All sources";
    }

    function getQualityHintLabel(code: string) {
        if (code === "skipped_low_importance") return "Low Importance Skips";
        if (code === "skipped_diagnostic") return "Diagnostic Skips";
        return code
            .split("_")
            .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
            .join(" ");
    }

    function getQualityHintClass(severity: string) {
        if (severity === "warning") {
            return "bg-m3-tertiary-container text-m3-on-tertiary-container";
        }
        if (severity === "suggestion") {
            return "bg-m3-secondary-container text-m3-on-secondary-container";
        }
        return "bg-m3-surface-container-high text-m3-on-surface-variant";
    }

    function getQualityHintGroupLabel(severity: DashboardGenerationQualitySeverity) {
        if (severity === "warning") return "Needs Review";
        if (severity === "suggestion") return "Suggestions";
        return "Confidence";
    }

    function getQualityHintGroupDescription(severity: DashboardGenerationQualitySeverity) {
        if (severity === "warning") {
            return "Area or assignment uncertainty to inspect before applying.";
        }
        if (severity === "suggestion") {
            return "Useful cleanup or optional include opportunities.";
        }
        return "Positive signals and skipped maintenance details.";
    }

    function groupQualityHints(hints: DashboardGenerationQualityHint[]): QualityHintGroup[] {
        return QUALITY_HINT_GROUP_ORDER.map((severity) => {
            const groupHints = hints.filter((hint) => hint.severity === severity);
            const entityCount = new Set(groupHints.flatMap((hint) => hint.entityIds)).size;
            return {
                severity,
                label: getQualityHintGroupLabel(severity),
                description: getQualityHintGroupDescription(severity),
                entityCount,
                hints: groupHints,
            };
        }).filter((group) => group.hints.length > 0);
    }

    function getQualityHintReviewTarget(
        code: DashboardGenerationQualityCode,
    ): QualityHintReviewTarget {
        if (code === "area_matched") {
            return {
                mode: "included",
                filter: "entity_registry",
                label: "Review entity-area matches",
            };
        }

        if (code === "device_area_fallback") {
            return {
                mode: "included",
                filter: "device_registry",
                label: "Review device-area fallbacks",
            };
        }

        if (code === "name_inferred_area") {
            return {
                mode: "included",
                filter: "name_inference",
                label: "Review name-inferred entities",
            };
        }

        if (code === "missing_area") {
            return {
                mode: "skipped",
                filter: "unassigned",
                label: "Review entities without rooms",
            };
        }

        if (code === "skipped_diagnostic") {
            return {
                mode: "skipped",
                filter: "all",
                label: "Review diagnostic skips",
            };
        }

        if (code === "skipped_low_importance") {
            return {
                mode: "skipped",
                filter: "all",
                label: "Review low-importance skips",
            };
        }

        if (
            code === "skipped_unavailable" ||
            code === "duplicate_remote" ||
            code === "duplicate_media_player"
        ) {
            return {
                mode: "skipped",
                filter: "all",
                label: "Review skipped entities",
            };
        }

        if (code === "used_ha_group" || code === "name_review") {
            return {
                mode: "included",
                filter: "all",
                label: "Review generated entity names and groups",
            };
        }

        return {
            mode: "included",
            filter: "all",
            label: "Review manually flagged entities",
        };
    }

    function reviewQualityHint(code: DashboardGenerationQualityCode) {
        const target = getQualityHintReviewTarget(code);
        entityReviewMode = target.mode;
        entityReviewSourceFilter = target.filter;
    }

    function getEntityReviewSourceChoices(
        rows: EntityReviewRow[],
    ): EntityReviewSourceChoice[] {
        const counts: Record<EntityReviewSourceKey, number> = {
            entity_registry: 0,
            device_registry: 0,
            name_inference: 0,
            unassigned: 0,
        };

        for (const row of rows) {
            if (row.areaSource) {
                counts[row.areaSource] += 1;
            }
        }

        return [
            {
                id: "all",
                label: "All sources",
                count: rows.length,
                tone: "default",
            },
            {
                id: "entity_registry",
                label: "Entity area",
                count: counts.entity_registry,
                tone: "default",
            },
            {
                id: "device_registry",
                label: "Device area",
                count: counts.device_registry,
                tone: "default",
            },
            {
                id: "name_inference",
                label: "Name-inferred",
                count: counts.name_inference,
                tone: counts.name_inference > 0 ? "warning" : "default",
            },
            {
                id: "unassigned",
                label: "No room source",
                count: counts.unassigned,
                tone: counts.unassigned > 0 ? "warning" : "default",
            },
        ];
    }

    function filterEntityReviewRows(
        rows: EntityReviewRow[],
        filter: EntityReviewSourceFilter,
    ) {
        if (filter === "all") return rows;
        return rows.filter((row) => row.areaSource === filter);
    }

    function summarizeEntityRefs(
        refs: DashboardGenerationResult["includedEntities"],
    ): EntityReviewRow[] {
        const rows = new Map<string, EntityReviewRow>();

        for (const ref of refs) {
            const existing = rows.get(ref.entityId);
            if (existing) {
                existing.count += 1;
                if (!existing.reasons.includes(ref.reason)) {
                    existing.reasons.push(ref.reason);
                }
                if (typeof ref.importanceScore === "number") {
                    existing.importanceScore = Math.max(
                        existing.importanceScore ?? ref.importanceScore,
                        ref.importanceScore,
                    );
                }
                for (const reason of ref.importanceReasons ?? []) {
                    if (!existing.importanceReasons.includes(reason)) {
                        existing.importanceReasons.push(reason);
                    }
                }
                continue;
            }

            const source = getEntityReviewSource(ref.entityId);
            rows.set(ref.entityId, {
                entityId: ref.entityId,
                reasons: [ref.reason],
                importanceReasons: [...(ref.importanceReasons ?? [])],
                count: 1,
                importanceScore: ref.importanceScore,
                ...source,
            });
        }

        return [...rows.values()].sort((a, b) => a.entityId.localeCompare(b.entityId));
    }

    function toggleLabelFilter(kind: "include" | "exclude", label: string) {
        if (kind === "include") {
            includeLabels = includeLabels.includes(label)
                ? includeLabels.filter((item) => item !== label)
                : [...includeLabels, label];
            excludeLabels = excludeLabels.filter((item) => item !== label);
            return;
        }

        excludeLabels = excludeLabels.includes(label)
            ? excludeLabels.filter((item) => item !== label)
            : [...excludeLabels, label];
        includeLabels = includeLabels.filter((item) => item !== label);
    }

    function toggleCardFamily(cardType: DashboardCardType) {
        disabledCardTypes = disabledCardTypes.includes(cardType)
            ? disabledCardTypes.filter((item) => item !== cardType)
            : [...disabledCardTypes, cardType];
        closePreviewItemEditor();
    }

    function includeEntityInDraft(entityId: string) {
        if (!includeEntityIds.includes(entityId)) {
            includeEntityIds = [...includeEntityIds, entityId];
        }
        excludeEntityIds = excludeEntityIds.filter((item) => item !== entityId);
        entityReviewMode = "included";
    }

    function restoreIncludedEntity(entityId: string) {
        includeEntityIds = includeEntityIds.filter((item) => item !== entityId);
    }

    function excludeEntityFromDraft(entityId: string) {
        if (!excludeEntityIds.includes(entityId)) {
            excludeEntityIds = [...excludeEntityIds, entityId];
        }
        includeEntityIds = includeEntityIds.filter((item) => item !== entityId);
        entityReviewMode = "included";
    }

    function restoreExcludedEntity(entityId: string) {
        excludeEntityIds = excludeEntityIds.filter((item) => item !== entityId);
    }

    function handleClose() {
        open = false;
        onclose?.();
    }

    function handleApply() {
        if (!draft) return;
        if (cleanGeneratedBeforeApply && !cleanApplyConfirmationPending) {
            cleanApplyConfirmationPending = true;
            return;
        }
        const config = JSON.parse(JSON.stringify(draft.config)) as RoomDashboardConfig;
        const relatedConfigs = JSON.parse(
            JSON.stringify(draft.relatedConfigs ?? []),
        ) as RoomDashboardConfig[];
        normalizeRoomDashboardConfig(config);
        for (const relatedConfig of relatedConfigs) {
            normalizeRoomDashboardConfig(relatedConfig);
        }
        onapply?.(config, relatedConfigs);
        handleClose();
    }

    function getRelatedConfigForNavigation(item: DashboardItem) {
        if (
            item.cardType !== "navigation" ||
            item.generatedBy?.sourceType !== "area" ||
            !item.generatedBy.sourceId
        ) {
            return null;
        }

        return (
            draft?.relatedConfigs?.find(
                (config) => config.generatedBy?.sourceId === item.generatedBy?.sourceId,
            ) ?? null
        );
    }

    function inspectNavigationTarget(item: DashboardItem) {
        const relatedConfig = getRelatedConfigForNavigation(item);
        if (!relatedConfig) return;
        selectedPreviewConfigId = getPreviewConfigId(relatedConfig);
    }

    function openPreviewItemEditor(item: DashboardItem) {
        editingItemId = item.id;
        editName = item.name ?? "";
        editSubtitle = item.subtitle ?? "";
        editIcon = item.icon ?? "";
        editPath = item.path ?? "";
    }

    function closePreviewItemEditor() {
        editingItemId = null;
        editName = "";
        editSubtitle = "";
        editIcon = "";
        editPath = "";
    }

    function updateItemInPreviewConfig(
        config: RoomDashboardConfig,
        itemId: string,
        patch: Partial<DashboardItem>,
    ) {
        const updateGrid = (grid: GridConfig): GridConfig => {
            const items = grid.items.map((item) => {
                const nestedItem = {
                    ...item,
                    tabs: item.tabs?.map(updateGrid),
                };
                if (item.id !== itemId) return nestedItem;

                const hasGenerationStatePatch =
                    Object.prototype.hasOwnProperty.call(
                        patch,
                        "generationState",
                    );
                const generationState: DashboardItem["generationState"] =
                    hasGenerationStatePatch
                        ? patch.generationState
                        : item.generationState === "pinned"
                          ? "pinned"
                          : item.generatedBy || item.generationState
                            ? "user_modified"
                            : item.generationState;

                return {
                    ...nestedItem,
                    ...patch,
                    generationState,
                };
            });

            return { ...grid, items };
        };

        return {
            ...config,
            tabs: config.tabs.map(updateGrid),
        };
    }

    function updatePreviewItem(itemId: string, patch: Partial<DashboardItem>) {
        if (!draft || !previewTab) return;

        if (selectedPreviewConfigId === ROOT_PREVIEW_ID) {
            const config = updateItemInPreviewConfig(
                draft.config,
                itemId,
                patch,
            );
            updateDraft(config, draft.relatedConfigs ?? [], draft.includedEntities);
            return;
        }

        const relatedConfigs = (draft.relatedConfigs ?? []).map((relatedConfig) =>
            getPreviewConfigId(relatedConfig) === selectedPreviewConfigId
                ? updateItemInPreviewConfig(
                      relatedConfig,
                      itemId,
                      patch,
                  )
                : relatedConfig,
        );
        updateDraft(draft.config, relatedConfigs, draft.includedEntities);
    }

    function savePreviewItemEdits() {
        if (!editingItem) return;

        updatePreviewItem(editingItem.id, {
            name: editName,
            subtitle: editSubtitle,
            icon: editIcon,
            path: editingItem.cardType === "navigation" ? editPath : editingItem.path,
        });
        closePreviewItemEditor();
    }

    function cloneLayout(layout: ResponsiveLayout): ResponsiveLayout {
        return {
            desktop: { ...layout.desktop },
            mobile: { ...layout.mobile },
        };
    }

    function moveItemInPreviewConfig(
        config: RoomDashboardConfig,
        itemId: string,
        direction: "previous" | "next",
    ) {
        const offset = direction === "previous" ? -1 : 1;
        const moveInGrid = (grid: GridConfig): GridConfig => {
            const itemsWithNestedTabs = grid.items.map((item) => ({
                ...item,
                tabs: item.tabs?.map(moveInGrid),
            }));

            if (!itemsWithNestedTabs.some((item) => item.id === itemId)) {
                return { ...grid, items: itemsWithNestedTabs };
            }

            const movableItems = itemsWithNestedTabs
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.cardType !== "title");
            const movableIndex = movableItems.findIndex(
                ({ item }) => item.id === itemId,
            );
            const itemIndex = movableItems[movableIndex]?.index;
            const targetIndex = movableItems[movableIndex + offset]?.index;
            if (itemIndex === undefined || targetIndex === undefined) {
                return { ...grid, items: itemsWithNestedTabs };
            }

            const items = itemsWithNestedTabs.map((item) => ({
                ...item,
                layout: cloneLayout(item.layout),
            }));
            const currentItem = items[itemIndex];
            const targetItem = items[targetIndex];

            [currentItem.layout, targetItem.layout] = [
                targetItem.layout,
                currentItem.layout,
            ];
            [items[itemIndex], items[targetIndex]] = [
                targetItem,
                currentItem,
            ];

            return { ...grid, items };
        };

        return {
            ...config,
            tabs: config.tabs.map(moveInGrid),
        };
    }

    function movePreviewItem(itemId: string, direction: "previous" | "next") {
        if (!draft || !previewTab || !selectedPreviewConfig) return;

        if (selectedPreviewConfigId === ROOT_PREVIEW_ID) {
            const config = moveItemInPreviewConfig(
                draft.config,
                itemId,
                direction,
            );
            updateDraft(config, draft.relatedConfigs ?? [], draft.includedEntities);
            return;
        }

        const relatedConfigs = (draft.relatedConfigs ?? []).map((relatedConfig) =>
            getPreviewConfigId(relatedConfig) === selectedPreviewConfigId
                ? moveItemInPreviewConfig(
                      relatedConfig,
                      itemId,
                      direction,
                  )
                : relatedConfig,
        );
        updateDraft(draft.config, relatedConfigs, draft.includedEntities);
    }

    function togglePreviewItemPin(item: DashboardItem) {
        updatePreviewItem(item.id, {
            generationState:
                item.generationState === "pinned"
                    ? item.generatedBy
                        ? "generated"
                        : undefined
                    : "pinned",
        });
    }

    function canMovePreviewItem(itemId: string, direction: "previous" | "next") {
        if (!selectedPreviewConfig) return false;
        const containingGrid = findGridContainingItem(selectedPreviewConfig.config, itemId);
        if (!containingGrid) return false;
        const movableItems = containingGrid.items.filter(
            (item) => item.cardType !== "title",
        );
        const itemIndex = movableItems.findIndex((item) => item.id === itemId);
        if (itemIndex < 0) return false;
        return direction === "previous"
            ? itemIndex > 0
            : itemIndex < movableItems.length - 1;
    }

    function updateDraft(
        config: RoomDashboardConfig,
        relatedConfigs: RoomDashboardConfig[],
        includedEntities: DashboardGenerationResult["includedEntities"],
    ) {
        if (!draft) return;

        const cards = getConfigCardCount(config);
        const relatedCards = getRelatedCardCount(relatedConfigs);

        draft = {
            ...draft,
            config,
            relatedConfigs,
            includedEntities,
            summary: {
                ...draft.summary,
                cards,
                included: includedEntities.length,
                relatedDashboards: relatedConfigs.length,
                relatedCards,
            },
        };
    }

    function findItemInGrid(grid: GridConfig, itemId: string): DashboardItem | null {
        for (const item of grid.items) {
            if (item.id === itemId) return item;
            for (const tab of item.tabs ?? []) {
                const nestedItem = findItemInGrid(tab, itemId);
                if (nestedItem) return nestedItem;
            }
        }

        return null;
    }

    function findItemInConfig(config: RoomDashboardConfig, itemId: string): DashboardItem | null {
        for (const tab of config.tabs) {
            const item = findItemInGrid(tab, itemId);
            if (item) return item;
        }

        return null;
    }

    function findGridContainingItemInGrid(grid: GridConfig, itemId: string): GridConfig | null {
        if (grid.items.some((item) => item.id === itemId)) return grid;

        for (const item of grid.items) {
            for (const tab of item.tabs ?? []) {
                const nestedGrid = findGridContainingItemInGrid(tab, itemId);
                if (nestedGrid) return nestedGrid;
            }
        }

        return null;
    }

    function findGridContainingItem(config: RoomDashboardConfig, itemId: string): GridConfig | null {
        for (const tab of config.tabs) {
            const grid = findGridContainingItemInGrid(tab, itemId);
            if (grid) return grid;
        }

        return null;
    }

    function getActiveNestedPreviewTab(item: DashboardItem): GridConfig | null {
        if (item.cardType !== "tabs" || !item.tabs?.length) return null;
        return item.tabs[item.activeTabIndex ?? 0] ?? item.tabs[0] ?? null;
    }

    function removeItemFromGrid(grid: GridConfig, itemId: string): GridConfig {
        const items = grid.items
            .filter((item) => item.id !== itemId)
            .map((item) => ({
                ...item,
                tabs: item.tabs?.map((tab) => removeItemFromGrid(tab, itemId)),
            }));

        return {
            ...grid,
            items: compactGeneratedTitles(items),
        };
    }

    function removeItemFromConfig(config: RoomDashboardConfig, itemId: string): RoomDashboardConfig {
        return {
            ...config,
            tabs: config.tabs.map((tab) => removeItemFromGrid(tab, itemId)),
        };
    }

    function removePreviewItem(itemId: string) {
        if (!draft) return;

        if (selectedPreviewConfigId !== ROOT_PREVIEW_ID) {
            const relatedConfigs = (draft.relatedConfigs ?? []).map((relatedConfig) => {
                if (getPreviewConfigId(relatedConfig) !== selectedPreviewConfigId) {
                    return relatedConfig;
                }

                return removeItemFromConfig(relatedConfig, itemId);
            });
            const includedEntities = draft.includedEntities.filter(
                (entityRef) => entityRef.cardId !== itemId,
            );
            updateDraft(draft.config, relatedConfigs, includedEntities);
            return;
        }

        const removedItem = findItemInConfig(draft.config, itemId);
        const removedAreaId =
            removedItem?.cardType === "navigation" &&
            removedItem.generatedBy?.sourceType === "area"
                ? removedItem.generatedBy.sourceId
                : null;
        const config = removeItemFromConfig(draft.config, itemId);
        const relatedConfigs = removedAreaId
            ? (draft.relatedConfigs ?? []).filter(
                  (relatedConfig) => relatedConfig.generatedBy?.sourceId !== removedAreaId,
              )
            : draft.relatedConfigs;
        const removedRelatedCardIds = new Set(
            removedAreaId
                ? (draft.relatedConfigs ?? [])
                      .filter(
                          (relatedConfig) =>
                              relatedConfig.generatedBy?.sourceId === removedAreaId,
                      )
                      .flatMap((relatedConfig) => getConfigItems(relatedConfig).map((item) => item.id))
                : [],
        );
        const includedEntities = draft.includedEntities.filter(
            (entityRef) =>
                entityRef.cardId !== itemId &&
                !(
                    entityRef.cardId &&
                    removedRelatedCardIds.has(entityRef.cardId)
                ),
        );
        updateDraft(config, relatedConfigs ?? [], includedEntities);
    }
</script>

<SideSheet
    {open}
    title="Generate Dashboard"
    subtitle="Preview first, then apply when it looks right."
    icon={IconAutoAwesome}
    maxWidth="max-w-5xl"
    onclose={handleClose}
>
    <div class="grid grid-cols-1 xl:grid-cols-[20rem_minmax(0,1fr)] gap-6">
        <aside class="flex flex-col gap-5">
            <section class="flex flex-col gap-2">
                <h3 class="text-m3-title-small text-m3-on-surface">
                    Recipe
                </h3>
                <div class="grid grid-cols-1 gap-2">
                    {#each recipeChoices as choice}
                        <button
                            type="button"
                            class="flex items-start gap-3 rounded-m3-card border p-4 text-left transition-colors {recipe ===
                            choice.id
                                ? 'border-m3-primary bg-m3-primary-container text-m3-on-primary-container'
                                : 'border-m3-outline-variant bg-m3-surface-container-high text-m3-on-surface hover:bg-m3-surface-container-highest'}"
                            onclick={() => (recipe = choice.id)}
                        >
                            <choice.icon class="size-6 shrink-0" />
                            <span class="flex flex-col gap-1">
                                <span class="text-m3-title-small">
                                    {choice.label}
                                </span>
                                <span class="text-m3-body-small opacity-80">
                                    {choice.description}
                                </span>
                            </span>
                        </button>
                    {/each}
                </div>
            </section>

            {#if recipe === "room"}
                <section class="flex flex-col gap-2">
                    <h3 class="text-m3-title-small text-m3-on-surface">
                        Area
                    </h3>
                    {#if areaChoices.length > 0}
                        <div class="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                            {#each areaChoices as area}
                                <button
                                    type="button"
                                    class="rounded-m3-card px-3 py-2 text-left text-m3-label-large transition-colors {selectedAreaId ===
                                    area.area_id
                                        ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                        : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}"
                                    onclick={() => (selectedAreaId = area.area_id)}
                                >
                                    {area.name}
                                </button>
                            {/each}
                        </div>
                    {:else}
                        <p class="rounded-m3-card bg-m3-error-container px-3 py-2 text-m3-body-small text-m3-on-error-container">
                            No Home Assistant areas are available yet.
                        </p>
                    {/if}
                </section>
            {/if}

            {#if recipe === "floor"}
                <section class="flex flex-col gap-2">
                    <h3 class="text-m3-title-small text-m3-on-surface">
                        Floor
                    </h3>
                    {#if floorChoices.length > 0}
                        <div class="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                            {#each floorChoices as floor}
                                <button
                                    type="button"
                                    class="rounded-m3-card px-3 py-2 text-left text-m3-label-large transition-colors {selectedFloorId ===
                                    floor.floor_id
                                        ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                        : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}"
                                    onclick={() => (selectedFloorId = floor.floor_id)}
                                >
                                    {floor.name}
                                </button>
                            {/each}
                        </div>
                    {:else}
                        <p class="rounded-m3-card bg-m3-error-container px-3 py-2 text-m3-body-small text-m3-on-error-container">
                            No Home Assistant floors are available yet.
                        </p>
                    {/if}
                </section>
            {/if}

            {#if recipe === "entity_type"}
                <section class="flex flex-col gap-2">
                    <h3 class="text-m3-title-small text-m3-on-surface">
                        Entity Type
                    </h3>
                    {#if entityTypeChoices.length > 0}
                        <div class="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                            {#each entityTypeChoices as choice}
                                <button
                                    type="button"
                                    class="rounded-m3-card px-3 py-2 text-left transition-colors {selectedEntityTypeId ===
                                    choice.id
                                        ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                        : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}"
                                    onclick={() => (selectedEntityTypeId = choice.id)}
                                >
                                    <span class="block text-m3-label-large">
                                        {choice.label}
                                    </span>
                                    <span class="block text-m3-body-small opacity-75">
                                        {choice.description}
                                    </span>
                                </button>
                            {/each}
                        </div>
                    {:else}
                        <p class="rounded-m3-card bg-m3-error-container px-3 py-2 text-m3-body-small text-m3-on-error-container">
                            No Home Assistant entities are available yet.
                        </p>
                    {/if}
                </section>
            {/if}

            {#if recipe === "label"}
                <section class="flex flex-col gap-2">
                    <h3 class="text-m3-title-small text-m3-on-surface">
                        Label
                    </h3>
                    {#if labelChoices.length > 0}
                        <div class="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                            {#each labelChoices as choice}
                                <button
                                    type="button"
                                    class="rounded-m3-card px-3 py-2 text-left transition-colors {selectedLabelId ===
                                    choice.id
                                        ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                        : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}"
                                    onclick={() => (selectedLabelId = choice.id)}
                                >
                                    <span class="block text-m3-label-large">
                                        {choice.label}
                                    </span>
                                    <span class="block text-m3-body-small opacity-75">
                                        {choice.description}
                                    </span>
                                </button>
                            {/each}
                        </div>
                    {:else}
                        <p class="rounded-m3-card bg-m3-error-container px-3 py-2 text-m3-body-small text-m3-on-error-container">
                            No Home Assistant labels are available yet.
                        </p>
                    {/if}
                </section>
            {/if}

            {#if draft}
                <section class="grid grid-cols-3 gap-2">
                    <div class="rounded-m3-card bg-m3-surface-container-high p-3">
                        <div class="text-m3-label-small text-m3-on-surface-variant">
                            Cards
                        </div>
                        <div class="text-m3-title-large text-m3-on-surface">
                            {visibleCardCount}
                        </div>
                    </div>
                    <div class="rounded-m3-card bg-m3-surface-container-high p-3">
                        <div class="text-m3-label-small text-m3-on-surface-variant">
                            Entities
                        </div>
                        <div class="text-m3-title-large text-m3-on-surface">
                            {draft.summary.included}
                        </div>
                    </div>
                    <div class="rounded-m3-card bg-m3-surface-container-high p-3">
                        <div class="text-m3-label-small text-m3-on-surface-variant">
                            Rooms
                        </div>
                        <div class="text-m3-title-large text-m3-on-surface">
                            {relatedDashboardCount}
                        </div>
                    </div>
                </section>

                <section class="flex flex-col gap-3">
                    <div>
                        <h3 class="text-m3-title-small text-m3-on-surface">
                            Regeneration Mode
                        </h3>
                        <p class="text-m3-body-small text-m3-on-surface-variant">
                            Choose whether edited generated cards are kept when this draft is applied.
                        </p>
                    </div>
                    <div class="grid grid-cols-1 gap-2">
                        <button
                            type="button"
                            aria-pressed={!cleanGeneratedBeforeApply}
                            class="rounded-m3-card p-3 text-left transition-colors {!cleanGeneratedBeforeApply
                                ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}"
                            onclick={() => {
                                cleanGeneratedBeforeApply = false;
                                cleanApplyConfirmationPending = false;
                            }}
                        >
                            <span class="block text-m3-label-large">
                                Preserve Edits
                            </span>
                            <span class="block text-m3-body-small opacity-75">
                                Keep manual, pinned, and edited generated cards.
                            </span>
                        </button>
                        <button
                            type="button"
                            aria-pressed={cleanGeneratedBeforeApply}
                            class="rounded-m3-card p-3 text-left transition-colors {cleanGeneratedBeforeApply
                                ? 'bg-m3-error-container text-m3-on-error-container'
                                : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}"
                            onclick={() => {
                                cleanGeneratedBeforeApply = true;
                                cleanApplyConfirmationPending = false;
                            }}
                        >
                            <span class="block text-m3-label-large">
                                Clean Generated
                            </span>
                            <span class="block text-m3-body-small opacity-75">
                                Replace edited generated cards. Manual and pinned content stays.
                            </span>
                        </button>
                    </div>
                    {#if cleanApplyConfirmationPending}
                        <p class="rounded-m3-card bg-m3-error-container px-3 py-2 text-m3-body-small text-m3-on-error-container">
                            Clean regeneration will replace edited generated
                            cards in this scope. Press Confirm Clean Apply to
                            continue, or switch back to Preserve Edits.
                        </p>
                    {/if}
                </section>

                <section class="flex flex-col gap-3">
                    <div>
                        <h3 class="text-m3-title-small text-m3-on-surface">
                            Inventory Quality
                        </h3>
                        <p class="text-m3-body-small text-m3-on-surface-variant">
                            Room source coverage across {inventoryQuality.total}
                            loaded entities.
                        </p>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        {#each inventoryQuality.metrics as metric}
                            <div
                                class="rounded-m3-card p-3 {metric.tone ===
                                'warning'
                                    ? 'bg-m3-tertiary-container text-m3-on-tertiary-container'
                                    : 'bg-m3-surface-container-high text-m3-on-surface'}"
                            >
                                <div class="text-m3-label-small opacity-75">
                                    {metric.label}
                                </div>
                                <div class="text-m3-title-medium">
                                    {metric.value}
                                </div>
                            </div>
                        {/each}
                    </div>
                    {#if inventoryQuality.nameInference > 0 || inventoryQuality.unassigned > 0}
                        <p class="rounded-m3-card bg-m3-surface-container-high px-3 py-2 text-m3-body-small text-m3-on-surface-variant">
                            Name inference is useful for weak HA labels, but
                            these matches should be reviewed before applying.
                        </p>
                    {/if}
                </section>

                {#if cardFamilyRows.length > 0}
                    <section class="flex flex-col gap-3">
                        <div>
                            <h3 class="text-m3-title-small text-m3-on-surface">
                                Card Families
                            </h3>
                            <p class="text-m3-body-small text-m3-on-surface-variant">
                                Toggle generated families before applying the draft.
                            </p>
                        </div>
                        <div class="grid grid-cols-1 gap-2">
                            {#each cardFamilyRows as family}
                                <button
                                    type="button"
                                    aria-pressed={!family.disabled}
                                    aria-label={`${family.disabled ? "Enable" : "Disable"} ${family.label} cards`}
                                    class="flex items-center justify-between gap-3 rounded-m3-card p-3 text-left transition-colors {family.disabled
                                        ? 'bg-m3-surface-container-high text-m3-on-surface-variant'
                                        : 'bg-m3-secondary-container text-m3-on-secondary-container'}"
                                    onclick={() => toggleCardFamily(family.cardType)}
                                >
                                    <span class="min-w-0">
                                        <span class="block truncate text-m3-label-large">
                                            {family.label}
                                        </span>
                                        <span class="block text-m3-body-small opacity-75">
                                            {family.count} generated {family.count === 1 ? "card" : "cards"}
                                        </span>
                                    </span>
                                    <span class="rounded-m3-full bg-m3-surface-container-highest px-2 py-0.5 text-m3-label-small">
                                        {family.disabled ? "Off" : "On"}
                                    </span>
                                </button>
                            {/each}
                        </div>
                    </section>
                {/if}

                {#if previewConfigs.length > 1}
                    <section class="flex flex-col gap-2">
                        <h3 class="text-m3-title-small text-m3-on-surface">
                            Preview
                        </h3>
                        <div class="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                            {#each previewConfigs as previewChoice}
                                <button
                                    type="button"
                                    aria-label={`Preview ${previewChoice.label}`}
                                    class="flex items-center gap-3 rounded-m3-card px-3 py-2 text-left transition-colors {selectedPreviewConfigId ===
                                    previewChoice.id
                                        ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                        : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}"
                                    onclick={() => (selectedPreviewConfigId = previewChoice.id)}
                                >
                                    {#if previewChoice.kind === "root"}
                                        <IconHome class="size-5 shrink-0" />
                                    {:else}
                                        <IconRoom class="size-5 shrink-0" />
                                    {/if}
                                    <span class="min-w-0 flex-1">
                                        <span class="block truncate text-m3-label-large">
                                            {previewChoice.label}
                                        </span>
                                        <span class="block truncate text-m3-body-small opacity-75">
                                            {previewChoice.description} - {getConfigCardCount(previewChoice.config)} cards
                                        </span>
                                    </span>
                                </button>
                            {/each}
                        </div>
                    </section>
                {/if}

                {#if availableLabels.length > 0}
                    <section class="flex flex-col gap-3">
                        <div>
                            <h3 class="text-m3-title-small text-m3-on-surface">
                                Label Filters
                            </h3>
                            <p class="text-m3-body-small text-m3-on-surface-variant">
                                Optional. Area, domain, device class, state, and name still drive generation.
                            </p>
                        </div>
                        <div class="flex flex-col gap-2">
                            {#each availableLabels as label}
                                <div class="flex items-center gap-2 rounded-m3-card bg-m3-surface-container-high p-2">
                                    <span class="min-w-0 flex-1 truncate text-m3-label-large text-m3-on-surface">
                                        {label}
                                    </span>
                                    <button
                                        type="button"
                                        class="rounded-m3-full px-3 py-1 text-m3-label-small transition-colors {includeLabels.includes(
                                            label,
                                        )
                                            ? 'bg-m3-primary text-m3-on-primary'
                                            : 'bg-m3-surface-container-highest text-m3-on-surface-variant hover:text-m3-on-surface'}"
                                        onclick={() => toggleLabelFilter("include", label)}
                                    >
                                        Include
                                    </button>
                                    <button
                                        type="button"
                                        class="rounded-m3-full px-3 py-1 text-m3-label-small transition-colors {excludeLabels.includes(
                                            label,
                                        )
                                            ? 'bg-m3-error-container text-m3-on-error-container'
                                            : 'bg-m3-surface-container-highest text-m3-on-surface-variant hover:text-m3-on-surface'}"
                                        onclick={() => toggleLabelFilter("exclude", label)}
                                    >
                                        Exclude
                                    </button>
                                </div>
                            {/each}
                        </div>
                    </section>
                {/if}

                {#if includeEntityIds.length > 0}
                    <section class="flex flex-col gap-3">
                        <div>
                            <h3 class="text-m3-title-small text-m3-on-surface">
                                Included in Draft
                            </h3>
                            <p class="text-m3-body-small text-m3-on-surface-variant">
                                These entities are pinned into the generated draft until restored.
                            </p>
                        </div>
                        <div class="flex flex-col gap-2">
                            {#each includeEntityIds as entityId}
                                <div class="flex items-center gap-2 rounded-m3-card bg-m3-surface-container-high p-2">
                                    <span class="min-w-0 flex-1 truncate text-m3-label-large text-m3-on-surface">
                                        {entityId}
                                    </span>
                                    <button
                                        type="button"
                                        class="rounded-m3-full bg-m3-surface-container-highest px-3 py-1 text-m3-label-small text-m3-on-surface-variant transition-colors hover:text-m3-on-surface"
                                        aria-label={`Restore ${entityId} to automatic generation`}
                                        onclick={() => restoreIncludedEntity(entityId)}
                                    >
                                        Restore
                                    </button>
                                </div>
                            {/each}
                        </div>
                    </section>
                {/if}

                {#if excludeEntityIds.length > 0}
                    <section class="flex flex-col gap-3">
                        <div>
                            <h3 class="text-m3-title-small text-m3-on-surface">
                                Excluded from Draft
                            </h3>
                            <p class="text-m3-body-small text-m3-on-surface-variant">
                                These entities are ignored until restored or the sheet is closed.
                            </p>
                        </div>
                        <div class="flex flex-col gap-2">
                            {#each excludeEntityIds as entityId}
                                <div class="flex items-center gap-2 rounded-m3-card bg-m3-surface-container-high p-2">
                                    <span class="min-w-0 flex-1 truncate text-m3-label-large text-m3-on-surface">
                                        {entityId}
                                    </span>
                                    <button
                                        type="button"
                                        class="rounded-m3-full bg-m3-surface-container-highest px-3 py-1 text-m3-label-small text-m3-on-surface-variant transition-colors hover:text-m3-on-surface"
                                        aria-label={`Restore ${entityId} to draft`}
                                        onclick={() => restoreExcludedEntity(entityId)}
                                    >
                                        Restore
                                    </button>
                                </div>
                            {/each}
                        </div>
                    </section>
                {/if}

                {#if draft.warnings.length > 0}
                    <section class="flex flex-col gap-2">
                        <h3 class="text-m3-title-small text-m3-on-surface">
                            Warnings
                        </h3>
                        {#each draft.warnings as warning}
                            <p class="rounded-m3-card bg-m3-tertiary-container px-3 py-2 text-m3-body-small text-m3-on-tertiary-container">
                                {warning}
                            </p>
                        {/each}
                    </section>
                {/if}

                {#if qualityHintGroups.length > 0}
                    <section class="flex flex-col gap-2">
                        <div>
                            <h3 class="text-m3-title-small text-m3-on-surface">
                                Quality Hints
                            </h3>
                            <p class="text-m3-body-small text-m3-on-surface-variant">
                                Generation confidence and cleanup opportunities.
                            </p>
                        </div>
                        <div class="flex flex-col gap-2">
                            {#each qualityHintGroups as group}
                                <div class="rounded-m3-card bg-m3-surface-container-high p-2">
                                    <div class="mb-2 flex items-start justify-between gap-2 px-1">
                                        <div>
                                            <h4 class="text-m3-label-large text-m3-on-surface">
                                                {group.label}
                                            </h4>
                                            <p class="text-m3-body-small text-m3-on-surface-variant">
                                                {group.description}
                                            </p>
                                        </div>
                                        <span
                                            class="rounded-m3-full bg-m3-surface-container-highest px-2 py-0.5 text-m3-label-small text-m3-on-surface-variant"
                                            aria-label={`${group.label}: ${group.entityCount} affected entities`}
                                        >
                                            {group.entityCount}
                                        </span>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        {#each group.hints as hint}
                                            {@const reviewTarget = getQualityHintReviewTarget(hint.code)}
                                            <article class="rounded-m3-card p-3 {getQualityHintClass(hint.severity)}">
                                                <div class="flex items-center justify-between gap-2">
                                                    <h5 class="text-m3-label-large">
                                                        {getQualityHintLabel(hint.code)}
                                                    </h5>
                                                    <span class="rounded-m3-full bg-m3-surface-container/60 px-2 py-0.5 text-m3-label-small">
                                                        {hint.entityIds.length}
                                                    </span>
                                                </div>
                                                <p class="mt-1 text-m3-body-small">
                                                    {hint.message}
                                                </p>
                                                {#if hint.suggestedAction}
                                                    <p class="mt-1 text-m3-body-small opacity-80">
                                                        {hint.suggestedAction}
                                                    </p>
                                                {/if}
                                                <button
                                                    type="button"
                                                    class="mt-3 rounded-m3-full bg-m3-surface-container-high px-3 py-1.5 text-m3-label-small text-m3-on-surface transition-colors hover:brightness-95"
                                                    aria-label={`Review ${getQualityHintLabel(hint.code)} entities`}
                                                    onclick={() => reviewQualityHint(hint.code)}
                                                >
                                                    {reviewTarget.label}
                                                </button>
                                            </article>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </section>
                {/if}

                <section class="flex min-h-0 flex-col gap-3">
                    <div>
                        <h3 class="text-m3-title-small text-m3-on-surface">
                            Entity Review
                        </h3>
                        <p class="text-m3-body-small text-m3-on-surface-variant">
                            Why the generator used or skipped entities.
                        </p>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            class="rounded-m3-full px-3 py-2 text-m3-label-medium transition-colors {entityReviewMode ===
                            'included'
                                ? 'bg-m3-primary text-m3-on-primary'
                                : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:text-m3-on-surface'}"
                            onclick={() => (entityReviewMode = "included")}
                        >
                            Included {includedEntityRows.length}
                        </button>
                        <button
                            type="button"
                            class="rounded-m3-full px-3 py-2 text-m3-label-medium transition-colors {entityReviewMode ===
                            'skipped'
                                ? 'bg-m3-primary text-m3-on-primary'
                                : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:text-m3-on-surface'}"
                            onclick={() => (entityReviewMode = "skipped")}
                        >
                            Skipped {skippedEntityRows.length}
                        </button>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        {#each entityReviewSourceChoices as choice}
                            <button
                                type="button"
                                class="rounded-m3-full px-3 py-1 text-m3-label-small transition-colors {entityReviewSourceFilter ===
                                choice.id
                                    ? choice.tone === 'warning'
                                        ? 'bg-m3-tertiary-container text-m3-on-tertiary-container'
                                        : 'bg-m3-primary text-m3-on-primary'
                                    : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:text-m3-on-surface'}"
                                aria-label={`Show ${choice.label} entities`}
                                aria-pressed={entityReviewSourceFilter === choice.id}
                                onclick={() => (entityReviewSourceFilter = choice.id)}
                            >
                                {choice.label} {choice.count}
                            </button>
                        {/each}
                    </div>
                    <div class="max-h-64 overflow-y-auto rounded-m3-card bg-m3-surface-container-high p-2">
                        {#if activeEntityRows.length > 0}
                            <div class="flex flex-col gap-2">
                                {#each activeEntityRows as row}
                                    <div class="rounded-m3-card bg-m3-surface-container-highest p-3">
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="min-w-0 truncate text-m3-label-large text-m3-on-surface">
                                                {row.entityId}
                                            </span>
                                            {#if row.count > 1}
                                                <span class="rounded-m3-full bg-m3-surface-container px-2 py-0.5 text-m3-label-small text-m3-on-surface-variant">
                                                    {row.count} uses
                                                </span>
                                            {/if}
                                        </div>
                                        {#if row.areaSourceLabel}
                                            <div class="mt-2 flex flex-wrap gap-1">
                                                <span
                                                    class="rounded-m3-full px-2 py-0.5 text-m3-label-small {row.areaSourceTone ===
                                                    'warning'
                                                        ? 'bg-m3-tertiary-container text-m3-on-tertiary-container'
                                                        : 'bg-m3-surface-container text-m3-on-surface-variant'}"
                                                >
                                                    {row.areaSourceLabel}
                                                </span>
                                            </div>
                                        {/if}
                                        {#if typeof row.importanceScore === "number" || row.importanceReasons.length > 0}
                                            <div class="mt-2 flex flex-wrap gap-1">
                                                {#if typeof row.importanceScore === "number"}
                                                    <span class="rounded-m3-full bg-m3-surface-container px-2 py-0.5 text-m3-label-small text-m3-on-surface-variant">
                                                        Score {row.importanceScore}
                                                    </span>
                                                {/if}
                                                {#each row.importanceReasons.slice(0, 3) as reason}
                                                    <span class="rounded-m3-full bg-m3-secondary-container px-2 py-0.5 text-m3-label-small text-m3-on-secondary-container">
                                                        {prettifyToken(reason)}
                                                    </span>
                                                {/each}
                                            </div>
                                        {/if}
                                        <p class="mt-1 line-clamp-2 text-m3-body-small text-m3-on-surface-variant">
                                            {row.reasons.join("; ")}
                                        </p>
                                        {#if entityReviewMode === "included"}
                                            <button
                                                type="button"
                                                class="mt-2 rounded-m3-full bg-m3-error-container px-3 py-1 text-m3-label-small text-m3-on-error-container transition-colors hover:brightness-95"
                                                aria-label={`Exclude ${row.entityId} from draft`}
                                                onclick={() => excludeEntityFromDraft(row.entityId)}
                                            >
                                                Exclude
                                            </button>
                                        {:else}
                                            <button
                                                type="button"
                                                class="mt-2 rounded-m3-full bg-m3-primary px-3 py-1 text-m3-label-small text-m3-on-primary transition-colors hover:brightness-95"
                                                aria-label={`Include ${row.entityId} in draft`}
                                                onclick={() => includeEntityInDraft(row.entityId)}
                                            >
                                                Include
                                            </button>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <p class="px-2 py-4 text-center text-m3-body-small text-m3-on-surface-variant">
                                No {entityReviewMode} {getEntityReviewSourceLabel(
                                    entityReviewSourceFilter,
                                ).toLowerCase()} entities for this draft.
                            </p>
                        {/if}
                    </div>
                </section>
            {/if}
        </aside>

        <section class="min-w-0 flex flex-col gap-3">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h3 class="text-m3-title-medium text-m3-on-surface">
                        {selectedPreviewTitle}
                    </h3>
                    <p class="text-m3-body-small text-m3-on-surface-variant">
                        {selectedPreviewDescription}. Remove anything you do not want before applying.
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="rounded-m3-full bg-m3-surface-container-high px-3 py-1 text-m3-label-small text-m3-on-surface-variant">
                        Draft only
                    </span>
                    <button
                        type="button"
                        class="inline-flex h-9 items-center justify-center gap-2 rounded-m3-full bg-m3-surface-container-high px-3 text-m3-label-medium text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface"
                        onclick={refreshInventorySnapshot}
                    >
                        <IconRefresh class="size-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {#if editingItem}
                <section class="rounded-m3-card border border-m3-outline-variant bg-m3-surface-container-high p-4">
                    <div class="mb-4 flex items-start justify-between gap-4">
                        <div>
                            <h4 class="text-m3-title-small text-m3-on-surface">
                                Edit Draft Details
                            </h4>
                            <p class="text-m3-body-small text-m3-on-surface-variant">
                                Changes are kept in this preview until you apply
                                the draft.
                            </p>
                        </div>
                        <button
                            type="button"
                            class="rounded-m3-full p-2 text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface"
                            aria-label="Close draft details editor"
                            onclick={closePreviewItemEditor}
                        >
                            <IconClose class="size-5" />
                        </button>
                    </div>

                    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <TextField
                            variant="outlined"
                            label="Card name"
                            placeholder="Card name"
                            bind:value={editName}
                        />
                        <TextField
                            variant="outlined"
                            label="Icon"
                            placeholder="material symbol name"
                            bind:value={editIcon}
                        />
                        {#if editingItem.cardType === "title"}
                            <TextField
                                variant="outlined"
                                label="Subtitle"
                                placeholder="Optional subtitle"
                                bind:value={editSubtitle}
                                class="md:col-span-2"
                            />
                        {/if}
                        {#if editingItem.cardType === "navigation"}
                            <TextField
                                variant="outlined"
                                label="Route path"
                                placeholder="/dashboard/floor/room"
                                bind:value={editPath}
                                class="md:col-span-2"
                            />
                        {/if}
                    </div>

                    <div class="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            class="inline-flex h-10 items-center justify-center rounded-full px-4 text-m3-label-large text-m3-on-surface-variant hover:bg-m3-surface-container-highest"
                            onclick={closePreviewItemEditor}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            class="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-m3-primary px-5 text-m3-label-large text-m3-on-primary hover:brightness-95"
                            onclick={savePreviewItemEdits}
                        >
                            <IconCheck class="size-5" />
                            Save Draft Changes
                        </button>
                    </div>
                </section>
            {/if}

            {#snippet previewCardControls(item: DashboardItem, nested = false)}
                {#if item.cardType !== "tabs"}
                    <button
                        type="button"
                        class="absolute right-2 top-2 z-20 rounded-full bg-m3-error-container p-2 text-m3-on-error-container opacity-0 shadow-m3-elevation-1 transition-opacity {nested
                            ? 'group-hover/nested-preview-card:opacity-100'
                            : 'group-hover/preview-card:opacity-100'} focus:opacity-100"
                        title="Remove from draft"
                        onclick={() => removePreviewItem(item.id)}
                    >
                        <IconDelete class="size-4" />
                    </button>
                    <button
                        type="button"
                        class="absolute right-12 top-2 z-20 rounded-full bg-m3-surface-container-high p-2 text-m3-on-surface opacity-0 shadow-m3-elevation-1 transition-opacity hover:bg-m3-surface-container-highest {nested
                            ? 'group-hover/nested-preview-card:opacity-100'
                            : 'group-hover/preview-card:opacity-100'} focus:opacity-100"
                        title="Edit draft details"
                        aria-label={`Edit ${item.name || item.cardType} draft details`}
                        onclick={() => openPreviewItemEditor(item)}
                    >
                        <IconEdit class="size-4" />
                    </button>
                    {#if isGeneratedPreviewItem(item)}
                        <button
                            type="button"
                            class="absolute right-[5.5rem] top-2 z-20 rounded-full p-2 opacity-0 shadow-m3-elevation-1 transition-opacity {nested
                            ? 'group-hover/nested-preview-card:opacity-100'
                            : 'group-hover/preview-card:opacity-100'} focus:opacity-100 {item.generationState ===
                            'pinned'
                                ? 'bg-m3-primary text-m3-on-primary'
                                : 'bg-m3-surface-container-high text-m3-on-surface hover:bg-m3-surface-container-highest'}"
                            title={item.generationState === "pinned"
                                ? "Unpin from draft"
                                : "Pin in draft"}
                            aria-label={`${item.generationState === "pinned" ? "Unpin" : "Pin"} ${item.name || item.cardType} in draft`}
                            aria-pressed={item.generationState === "pinned"}
                            onclick={() => togglePreviewItemPin(item)}
                        >
                            <IconPushPin class="size-4" />
                        </button>
                    {/if}
                    {#if item.cardType !== "title"}
                        <div
                            class="absolute bottom-2 right-2 z-20 flex items-center gap-1 opacity-0 transition-opacity {nested
                                ? 'group-hover/nested-preview-card:opacity-100'
                                : 'group-hover/preview-card:opacity-100'} focus-within:opacity-100"
                        >
                            <button
                                type="button"
                                class="inline-flex size-8 items-center justify-center rounded-m3-full bg-m3-surface-container-high text-m3-on-surface shadow-m3-elevation-1 hover:bg-m3-surface-container-highest disabled:pointer-events-none disabled:opacity-40"
                                title="Move earlier in draft"
                                aria-label={`Move ${item.name || item.cardType} earlier`}
                                disabled={!canMovePreviewItem(item.id, "previous")}
                                onclick={() => movePreviewItem(item.id, "previous")}
                            >
                                <IconArrowUpward class="size-4" />
                            </button>
                            <button
                                type="button"
                                class="inline-flex size-8 items-center justify-center rounded-m3-full bg-m3-surface-container-high text-m3-on-surface shadow-m3-elevation-1 hover:bg-m3-surface-container-highest disabled:pointer-events-none disabled:opacity-40"
                                title="Move later in draft"
                                aria-label={`Move ${item.name || item.cardType} later`}
                                disabled={!canMovePreviewItem(item.id, "next")}
                                onclick={() => movePreviewItem(item.id, "next")}
                            >
                                <IconArrowDownward class="size-4" />
                            </button>
                        </div>
                    {/if}
                {/if}
                {#if selectedPreviewConfig?.kind === "root" && getRelatedConfigForNavigation(item)}
                    <button
                        type="button"
                        class="absolute bottom-2 left-2 z-20 inline-flex items-center gap-1 rounded-m3-full bg-m3-primary px-3 py-1.5 text-m3-label-small text-m3-on-primary opacity-0 shadow-m3-elevation-1 transition-opacity {nested
                            ? 'group-hover/nested-preview-card:opacity-100'
                            : 'group-hover/preview-card:opacity-100'} focus:opacity-100"
                        title={`Preview ${item.name} room dashboard`}
                        onclick={() => inspectNavigationTarget(item)}
                    >
                        <IconRoom class="size-4" />
                        Inspect
                    </button>
                {/if}
            {/snippet}

            {#if previewTab && previewTab.items.length > 0}
                <div class="rounded-m3-card border border-m3-outline-variant/50 bg-m3-surface-container-low p-3 overflow-auto max-h-[72vh]">
                    <div
                        class="grid min-w-[48rem]"
                        style:display="grid"
                        style:grid-template-columns="repeat(12, minmax(0, 1fr))"
                        style:gap="{previewTab.gap}px"
                        style:padding="{previewTab.padding}px"
                        style:grid-auto-rows="{previewTab.rowHeight ?? 80}px"
                    >
                        {#each previewTab.items as item, index (item.id)}
                            {@const activeNestedTab = getActiveNestedPreviewTab(item)}
                            <div
                                class="relative group/preview-card"
                                style:grid-column={`${item.layout.desktop.colStart} / span ${item.layout.desktop.colSpan}`}
                                style:grid-row={`${item.layout.desktop.rowStart} / span ${item.layout.desktop.rowSpan}`}
                            >
                                {#if item.cardType === "tabs" && activeNestedTab}
                                    <div class="flex h-full w-full flex-col overflow-hidden rounded-m3-card bg-m3-surface-container">
                                        <div
                                            class="flex w-full items-center justify-center gap-2 overflow-x-auto px-3 py-3"
                                            role="tablist"
                                        >
                                            {#each item.tabs ?? [] as nestedTab, nestedIndex}
                                                <button
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={(item.activeTabIndex ?? 0) === nestedIndex}
                                                    class="relative flex items-center gap-2 whitespace-nowrap border px-4 py-2 text-m3-label-large font-medium transition-all {(item.activeTabIndex ?? 0) ===
                                                    nestedIndex
                                                        ? 'border-transparent bg-m3-primary text-m3-on-primary shadow-m3-elevation-1'
                                                        : 'border-transparent bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface'}"
                                                    style:border-radius="var(--radius-m3-tab-pill)"
                                                    onclick={() =>
                                                        updatePreviewItem(item.id, {
                                                            activeTabIndex: nestedIndex,
                                                        })}
                                                >
                                                    <DynamicIcon name={nestedTab.icon || "grid_view"} class="size-4" />
                                                    <span>{nestedTab.name}</span>
                                                </button>
                                            {/each}
                                        </div>

                                        <div class="min-h-0 flex-1 overflow-auto p-2">
                                            <div
                                                class="grid min-h-full"
                                                style:display="grid"
                                                style:grid-template-columns="repeat(12, minmax(0, 1fr))"
                                                style:gap="{activeNestedTab.gap}px"
                                                style:padding="{activeNestedTab.padding}px"
                                                style:grid-auto-rows="{activeNestedTab.rowHeight ?? 80}px"
                                            >
                                                {#each activeNestedTab.items as nestedItem, nestedIndex (nestedItem.id)}
                                                    {@const nestedLayout = nestedItem.layout.desktop}
                                                    <div
                                                        class="relative group/nested-preview-card"
                                                        style:grid-column={`${nestedLayout.colStart} / span ${nestedLayout.colSpan}`}
                                                        style:grid-row={`${nestedLayout.rowStart} / span ${nestedLayout.rowSpan}`}
                                                    >
                                                        <div class="h-full w-full pointer-events-none">
                                                            <DashboardCardRenderer
                                                                bind:item={activeNestedTab.items[nestedIndex]}
                                                                layoutRows={nestedLayout.rowSpan}
                                                            />
                                                        </div>
                                                        <GenerationStateBadge
                                                            state={nestedItem.generationState ??
                                                                (nestedItem.generatedBy
                                                                    ? "generated"
                                                                    : undefined)}
                                                            sourceReason={nestedItem.generatedBy?.reason}
                                                            class="absolute left-2 top-2 z-20 pointer-events-none"
                                                        />
                                                        {@render previewCardControls(nestedItem, true)}
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                    </div>
                                {:else}
                                    <div class="h-full w-full pointer-events-none">
                                        <DashboardCardRenderer
                                            bind:item={previewTab.items[index]}
                                            layoutRows={item.layout.desktop.rowSpan}
                                        />
                                    </div>
                                {/if}
                                <GenerationStateBadge
                                    state={item.generationState ??
                                        (item.generatedBy
                                            ? "generated"
                                            : undefined)}
                                    sourceReason={item.generatedBy?.reason}
                                    class="absolute left-2 top-2 z-20 pointer-events-none"
                                />
                                {@render previewCardControls(item, false)}
                            </div>
                        {/each}
                    </div>
                </div>
            {:else}
                <div class="flex min-h-80 items-center justify-center rounded-m3-card border border-dashed border-m3-outline-variant bg-m3-surface-container-low p-6 text-center">
                    <p class="text-m3-body-medium text-m3-on-surface-variant">
                        No preview cards were generated for this selection.
                    </p>
                </div>
            {/if}
        </section>
    </div>

    {#snippet actions()}
        <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-m3-label-large text-m3-on-surface-variant hover:bg-m3-surface-container-high"
            onclick={handleClose}
        >
            <IconClose class="size-5" />
            Cancel
        </button>
        <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-m3-primary px-5 text-m3-label-large text-m3-on-primary hover:brightness-95 disabled:opacity-50"
            disabled={!draft || visibleCardCount === 0}
            onclick={handleApply}
        >
            <IconCheck class="size-5" />
            {cleanGeneratedBeforeApply && cleanApplyConfirmationPending
                ? "Confirm Clean Apply"
                : "Apply Draft"}
        </button>
    {/snippet}
</SideSheet>
