<script lang="ts">
    import DynamicIcon from "$lib/components/common/DynamicIcon.svelte";
    import EntityDetailButton from "$lib/features/dashboard/components/EntityDetailButton.svelte";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
    import { dashboardEditorStore } from "$lib/features/dashboard/stores/dashboardEditor.svelte";
    import { entityDetailStore } from "$lib/features/dashboard/stores/entityDetail.svelte";
    import {
        getCardSurfaceClasses,
        getCardSurfaceStyle,
    } from "$lib/features/dashboard/utils/cardSurface";
    import { haStore } from "$lib/stores/ha.svelte";
    import { inventoryStore } from "$lib/stores/inventory.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import type { ResolvedEntity } from "$lib/domain/haInventory";
    import type { TodoCardOptions } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import IconEdit from "~icons/material-symbols/edit";

    type TodoTone = "empty" | "active" | "clear" | "offline" | "loading";

    interface TodoServiceItem {
        uid?: string;
        summary?: string;
        name?: string;
        item?: string;
        status?: string;
        due?: string;
        due_date?: string;
        due_datetime?: string;
        description?: string;
    }

    interface TodoDisplayItem {
        entityId: string;
        listName: string;
        key: string;
        summary: string;
        status: string;
        due?: string;
        description?: string;
    }

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: TodoCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("checklist"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({
            source: "auto",
            showAddControl: true,
            showCompleted: false,
            showDueDates: true,
            maxItems: 6,
        }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let itemsByList = $state<Record<string, TodoDisplayItem[]>>({});
    let itemsLoading = $state(false);
    let itemsRefreshing = $state(false);
    let itemsError = $state("");
    let itemsRequestKey = $state("");
    let newItemText = $state("");

    let smartOptions = $derived(inventoryStore.smartTodoOptions(options, entityId));
    let maxItems = $derived(Math.max(1, smartOptions.maxItems ?? 6));
    let title = $derived(name || themeStore.t("todoCard.defaultTitle"));
    let todoEntities = $derived(inventoryStore.getEntities(smartOptions.entityIds ?? []));
    let allEntityIds = $derived(todoEntities.map((entity) => entity.entityId));
    let targetEntityId = $derived(allEntityIds[0] ?? "");
    let allItems = $derived(Object.values(itemsByList).flat());
    let openItems = $derived(allItems.filter((item) => !isCompleted(item)));
    let completedItems = $derived(allItems.filter(isCompleted));
    let hasLoadedItems = $derived(Object.keys(itemsByList).length > 0);
    let showLoadingState = $derived(itemsLoading && !hasLoadedItems);
    let todoStateSignature = $derived(
        todoEntities
            .map((entity) => `${entity.entityId}:${entity.state}:${entity.lastChanged ?? ""}`)
            .join("|"),
    );
    let totalOpenCount = $derived(hasLoadedItems ? openItems.length : todoEntities.reduce((total, entity) => total + listOpenCount(entity), 0));
    let offlineCount = $derived(todoEntities.filter(isOffline).length);
    let activeListCount = $derived(todoEntities.filter((entity) => listOpenCount(entity) > 0).length);
    let tone = $derived<TodoTone>(
        todoEntities.length === 0
            ? "empty"
            : showLoadingState
              ? "loading"
              : offlineCount > 0 && totalOpenCount === 0
                ? "offline"
                : totalOpenCount > 0
                  ? "active"
                  : "clear",
    );
    let accentColor = $derived(color || toneColor(tone));
    let statusLabel = $derived(themeStore.t(`todoCard.status.${tone}`));
    let detailSourceLabel = $derived(
        themeStore.t("todoCard.summary", {
            open: totalOpenCount,
            lists: todoEntities.length,
        }),
    );
    let displayItems = $derived.by(() => {
        const items = smartOptions.showCompleted === false ? openItems : [...openItems, ...completedItems];
        return [...items].sort((a, b) => itemPriority(b) - itemPriority(a) || a.summary.localeCompare(b.summary));
    });
    let visibleItems = $derived(displayItems.slice(0, maxItems));
    let fallbackLists = $derived(
        todoEntities
            .filter((entity) => listOpenCount(entity) > 0 || isOffline(entity))
            .slice(0, maxItems),
    );
    let remainingCount = $derived(
        Math.max(0, (visibleItems.length > 0 ? displayItems.length : fallbackLists.length) - maxItems),
    );

    $effect(() => {
        const ids = allEntityIds.join("|");
        const key = `${ids}:${smartOptions.showCompleted !== false}:${todoStateSignature}`;
        if (!ids) {
            itemsByList = {};
            itemsRequestKey = "";
            itemsLoading = false;
            itemsRefreshing = false;
            return;
        }
        if (itemsRequestKey === key) return;
        itemsRequestKey = key;
        void loadItems();
    });

    function isOffline(entity: ResolvedEntity) {
        return ["unavailable", "unknown"].includes(entity.state);
    }

    function listOpenCount(entity: ResolvedEntity) {
        const count = Number(entity.state);
        return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
    }

    function isCompleted(item: TodoDisplayItem) {
        return item.status === "completed";
    }

    function itemPriority(item: TodoDisplayItem) {
        let score = isCompleted(item) ? 0 : 10;
        if (item.due) score += 3;
        return score;
    }

    function toneColor(value: TodoTone) {
        if (value === "active") return "var(--color-m3-primary)";
        if (value === "clear") return "var(--color-m3-tertiary)";
        if (value === "offline") return "var(--color-m3-error)";
        if (value === "loading") return "var(--color-m3-secondary)";
        return "var(--color-m3-outline)";
    }

    function normalizeTodoItem(entity: ResolvedEntity, item: TodoServiceItem, index: number): TodoDisplayItem | null {
        const summary = (item.summary ?? item.name ?? item.item ?? "").trim();
        if (!summary) return null;
        const uid = item.uid?.trim();
        return {
            entityId: entity.entityId,
            listName: entity.name,
            key: uid || `${entity.entityId}:${summary}:${index}`,
            summary,
            status: (item.status ?? "needs_action").trim(),
            due: item.due_datetime ?? item.due_date ?? item.due,
            description: item.description,
        };
    }

    function getResponsePayload(value: unknown) {
        if (!value || typeof value !== "object") return {};
        const record = value as Record<string, unknown>;
        if (record.response && typeof record.response === "object") return record.response as Record<string, unknown>;
        if (record.service_response && typeof record.service_response === "object") return record.service_response as Record<string, unknown>;
        return record;
    }

    function parseTodoResponse(value: unknown) {
        const payload = getResponsePayload(value);
        const next: Record<string, TodoDisplayItem[]> = {};

        for (const entity of todoEntities) {
            const bucket = payload[entity.entityId] as { items?: TodoServiceItem[] } | undefined;
            const items = Array.isArray(bucket?.items) ? bucket.items : [];
            next[entity.entityId] = items
                .map((item, index) => normalizeTodoItem(entity, item, index))
                .filter((item): item is TodoDisplayItem => Boolean(item));
        }

        return next;
    }

    async function loadItems(e?: Event) {
        e?.stopPropagation();
        if (allEntityIds.length === 0 || itemsLoading || itemsRefreshing) return;

        const isBackgroundRefresh = !e && hasLoadedItems;
        itemsLoading = !isBackgroundRefresh;
        itemsRefreshing = isBackgroundRefresh;
        itemsError = "";
        const serviceData = smartOptions.showCompleted === false ? { status: "needs_action" } : {};
        const result = await haStore.callService(
            "todo",
            "get_items",
            serviceData,
            { entity_id: allEntityIds },
            true,
        );

        if (result.ok) {
            itemsByList = parseTodoResponse(result.value);
        } else {
            itemsError = result.error.message;
        }
        itemsLoading = false;
        itemsRefreshing = false;
    }

    async function addItem(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        const text = newItemText.trim();
        if (!text || !targetEntityId) return;
        newItemText = "";
        await haStore.callService("todo", "add_item", { item: text }, { entity_id: targetEntityId });
        await loadItems();
    }

    async function completeItem(item: TodoDisplayItem, e: Event) {
        e.stopPropagation();
        const previous = itemsByList;
        itemsByList = {
            ...itemsByList,
            [item.entityId]: (itemsByList[item.entityId] ?? []).map((current) =>
                current.key === item.key ? { ...current, status: "completed" } : current,
            ),
        };
        const result = await haStore.callService(
            "todo",
            "update_item",
            { item: item.key.includes(":") ? item.summary : item.key, status: "completed" },
            { entity_id: item.entityId },
        );
        if (!result.ok) {
            itemsByList = previous;
            itemsError = result.error.message;
        }
    }

    function formatDue(value?: string) {
        if (!smartOptions.showDueDates || !value) return "";
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return value;
        return new Intl.DateTimeFormat(themeStore.language, {
            month: "short",
            day: "numeric",
        }).format(date);
    }

    function itemSubtitle(item: TodoDisplayItem) {
        const parts = [item.listName];
        const due = formatDue(item.due);
        if (due) parts.push(themeStore.t("todoCard.detail.due", { date: due }));
        if (isCompleted(item)) parts.push(themeStore.t("todoCard.state.completed"));
        return parts.join(" - ");
    }

    function openDetails(entityId: string, e: Event) {
        if (dashboardEditorStore.isEditing) return;
        e.stopPropagation();
        entityDetailStore.openEntities({
            title,
            sourceLabel: detailSourceLabel,
            entityIds: allEntityIds,
            selectedEntityId: entityId,
        });
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "todo",
            options: { todo: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "checklist";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { todo?: TodoCardOptions })?.todo ?? options;
            },
            onDelete: ondelete,
        });
    }
</script>

<article
    data-testid="todo-card"
    class="relative h-full w-full overflow-hidden rounded-m3-card text-m3-on-surface group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
    aria-label={title}
>
    <div class="todo-card">
        <header class="todo-card__header">
            <div
                class="todo-card__icon"
                style:background-color={`color-mix(in srgb, ${accentColor} 18%, transparent)`}
                style:color={accentColor}
            >
                <DynamicIcon name={icon || "checklist"} class="size-[58%]" />
            </div>
            <div class="min-w-0 flex-1">
                <h3 class="todo-card__title">{title}</h3>
                <p class="todo-card__status" style:color={accentColor}>{statusLabel}</p>
            </div>
            <div class="todo-card__badge" style:color={accentColor}>
                {totalOpenCount}
            </div>
        </header>

        <div class="todo-card__metrics">
            <span>{themeStore.t("todoCard.metric.open", { count: totalOpenCount })}</span>
            <span>{themeStore.t("todoCard.metric.lists", { count: todoEntities.length })}</span>
            <span>{themeStore.t("todoCard.metric.activeLists", { count: activeListCount })}</span>
        </div>

        {#if smartOptions.showAddControl !== false && targetEntityId}
            <form class="todo-card__add" onsubmit={addItem}>
                <input
                    value={newItemText}
                    oninput={(event) => (newItemText = (event.target as HTMLInputElement).value)}
                    placeholder={themeStore.t("todoCard.controls.itemPlaceholder")}
                    aria-label={themeStore.t("todoCard.controls.itemPlaceholder")}
                />
                <button type="submit" disabled={!newItemText.trim()}>
                    <DynamicIcon name="add_task" class="size-4" />
                    <span>{themeStore.t("todoCard.controls.add")}</span>
                </button>
            </form>
        {/if}

        <div class="todo-card__rows">
            {#if visibleItems.length > 0}
                {#each visibleItems as item (item.key)}
                    <div class="todo-card__item" class:todo-card__item--completed={isCompleted(item)}>
                        <button type="button" class="todo-card__item-main" onclick={(e) => openDetails(item.entityId, e)}>
                            <DynamicIcon name={isCompleted(item) ? "task_alt" : "radio_button_unchecked"} class="size-5 shrink-0" />
                            <span class="todo-card__item-body">
                                <span class="todo-card__item-title">{item.summary}</span>
                                <span class="todo-card__item-subtitle">{itemSubtitle(item)}</span>
                            </span>
                        </button>
                        {#if !isCompleted(item)}
                            <button
                                type="button"
                                class="todo-card__item-action"
                                onclick={(e) => completeItem(item, e)}
                            >
                                {themeStore.t("todoCard.controls.done")}
                            </button>
                        {/if}
                    </div>
                {/each}
                {#if remainingCount > 0}
                    <p class="todo-card__more">{themeStore.t("todoCard.moreItems", { count: remainingCount })}</p>
                {/if}
            {:else if fallbackLists.length > 0}
                {#each fallbackLists as list (list.entityId)}
                    <button type="button" class="todo-card__list-row" onclick={(e) => openDetails(list.entityId, e)}>
                        <DynamicIcon name={isOffline(list) ? "error" : "checklist"} class="size-5 shrink-0" />
                        <span class="todo-card__item-body">
                            <span class="todo-card__item-title">{list.name}</span>
                            <span class="todo-card__item-subtitle">
                                {isOffline(list)
                                    ? themeStore.t("common.unavailable")
                                    : themeStore.t("todoCard.listOpen", { count: listOpenCount(list) })}
                            </span>
                        </span>
                    </button>
                {/each}
            {:else}
                <div class="todo-card__empty">
                    <DynamicIcon name={showLoadingState ? "progress_activity" : "checklist"} class="size-7" />
                    <span>{showLoadingState ? themeStore.t("todoCard.loading") : themeStore.t("todoCard.noItems")}</span>
                    {#if itemsError}
                        <span class="todo-card__error">{itemsError}</span>
                    {/if}
                </div>
            {/if}
        </div>

        <button type="button" class="todo-card__refresh" onclick={loadItems}>
            <DynamicIcon name="refresh" class="size-4" />
            <span>{themeStore.t("todoCard.controls.refresh")}</span>
        </button>
    </div>

    <button
        class="touch-edit-control absolute right-[clamp(0.25rem,2cqmin,0.75rem)] top-[clamp(0.25rem,2cqmin,0.75rem)] z-30 rounded-full bg-m3-primary-container p-[clamp(0.25rem,1.7cqmin,0.5rem)] text-m3-on-primary-container opacity-0 shadow-sm transition-opacity hover:brightness-110 group-hover/card:opacity-100"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title={themeStore.t("todoCard.editTitle")}
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>

    <EntityDetailButton
        entityIds={allEntityIds}
        selectedEntityId={targetEntityId}
        {title}
        sourceLabel={detailSourceLabel}
    />
</article>

<style>
    .todo-card {
        display: flex;
        height: 100%;
        min-height: 0;
        flex-direction: column;
        gap: clamp(0.45rem, 2.5cqmin, 0.8rem);
        padding: clamp(0.625rem, 4cqmin, 1.25rem);
    }

    .todo-card__header {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: clamp(0.5rem, 3cqmin, 1rem);
        padding-right: clamp(2rem, 7cqi, 3rem);
    }

    .todo-card__icon {
        display: flex;
        width: clamp(2.4rem, 18cqmin, 4rem);
        height: clamp(2.4rem, 18cqmin, 4rem);
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
    }

    .todo-card__title,
    .todo-card__status,
    .todo-card__item-title,
    .todo-card__item-subtitle {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .todo-card__title {
        font-size: clamp(0.95rem, max(5.4cqb, 1.8cqi), 1.3rem);
        font-weight: 800;
        line-height: 1.1;
    }

    .todo-card__status {
        font-size: clamp(0.75rem, 3.4cqmin, 0.9rem);
        font-weight: 700;
    }

    .todo-card__badge {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-surface-container-high);
        padding: 0.25rem 0.55rem;
        font-size: clamp(0.75rem, 3cqmin, 0.9rem);
        font-weight: 800;
    }

    .todo-card__metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .todo-card__metrics span,
    .todo-card__more {
        min-width: 0;
        overflow: hidden;
        border-radius: 999px;
        background: var(--color-m3-surface-container-high);
        padding: 0.35rem 0.55rem;
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.625rem, 2.6cqmin, 0.8125rem);
        font-weight: 700;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .todo-card__add {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 0.4rem;
    }

    .todo-card__add input {
        min-width: 0;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container-high);
        padding: 0.5rem 0.65rem;
        color: var(--color-m3-on-surface);
        font-size: clamp(0.7rem, 2.7cqmin, 0.86rem);
        outline: 1px solid transparent;
    }

    .todo-card__add input:focus {
        outline-color: color-mix(in srgb, var(--color-m3-primary) 70%, transparent);
    }

    .todo-card__add button,
    .todo-card__refresh {
        display: flex;
        min-width: 0;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-primary);
        padding: 0.5rem 0.6rem;
        color: var(--color-m3-on-primary);
        font-size: clamp(0.62rem, 2.5cqmin, 0.82rem);
        font-weight: 800;
        transition: filter 140ms ease;
    }

    .todo-card__add button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
    }

    .todo-card__add button:hover,
    .todo-card__refresh:hover {
        filter: brightness(1.06);
    }

    .todo-card__rows {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .todo-card__item,
    .todo-card__list-row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.45rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container-high);
        padding: clamp(0.3rem, 1.4cqmin, 0.45rem);
        text-align: left;
    }

    .todo-card__item--completed {
        opacity: 0.72;
    }

    .todo-card__item-main,
    .todo-card__list-row {
        min-width: 0;
        flex: 1;
        color: var(--color-m3-on-surface);
    }

    .todo-card__item-main {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        text-align: left;
    }

    .todo-card__item-body {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 0.05rem;
    }

    .todo-card__item-title {
        font-size: clamp(0.75rem, 3.1cqmin, 0.9rem);
        font-weight: 800;
    }

    .todo-card__item-subtitle {
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.625rem, 2.6cqmin, 0.78rem);
    }

    .todo-card__item-action {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-secondary-container);
        padding: 0.35rem 0.65rem;
        color: var(--color-m3-on-secondary-container);
        font-size: clamp(0.625rem, 2.4cqmin, 0.78rem);
        font-weight: 800;
    }

    .todo-card__more {
        margin-top: auto;
        text-align: left;
    }

    .todo-card__empty {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        color: var(--color-m3-on-surface-variant);
        text-align: center;
        font-size: clamp(0.75rem, 3cqmin, 0.9rem);
        font-weight: 700;
    }

    .todo-card__error {
        max-width: 100%;
        overflow: hidden;
        color: var(--color-m3-error);
        font-size: clamp(0.625rem, 2.4cqmin, 0.76rem);
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .todo-card__refresh {
        width: 100%;
        background: var(--color-m3-surface-container-high);
        color: var(--color-m3-on-surface);
    }

    @container (max-height: 175px) {
        .todo-card__metrics,
        .todo-card__refresh {
            display: none;
        }
    }

    @container (max-height: 245px) {
        .todo-card__add {
            display: none;
        }
    }
</style>
