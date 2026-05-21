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
    import type { SecurityCardOptions } from "$lib/types";
    import type { DashboardCardSurfaceStyle } from "$lib/types/dashboard";
    import type { ResolvedEntity } from "$lib/domain/haInventory";
    import { formatEntityStateLabel } from "$lib/utils/entity";
    import IconEdit from "~icons/material-symbols/edit";

    type SecurityGroup = "alarm" | "lock" | "opening" | "motion" | "safety";
    type SecurityTone = "empty" | "critical" | "warning" | "activity" | "clear";

    interface SecurityRow {
        group: SecurityGroup;
        entity: ResolvedEntity;
        icon: string;
        active: boolean;
        critical: boolean;
        stateLabel: string;
    }

    interface Props {
        id?: string;
        entityId?: string;
        name: string;
        icon?: string;
        color?: string;
        backgroundColor?: string;
        surfaceStyle?: DashboardCardSurfaceStyle;
        options?: SecurityCardOptions;
        ondelete?: () => void;
        class?: string;
    }

    let {
        id,
        entityId = $bindable(""),
        name = $bindable(""),
        icon = $bindable("security"),
        color = $bindable(),
        backgroundColor = $bindable(),
        surfaceStyle = "md3",
        options = $bindable({ source: "auto", showAlarmControls: true, maxItems: 5 }),
        ondelete,
        class: className = "",
    }: Props = $props();

    let smartOptions = $derived(inventoryStore.smartSecurityOptions(options, entityId));
    let maxItems = $derived(Math.max(1, smartOptions.maxItems ?? 5));
    let title = $derived(name || themeStore.t("security.defaultTitle"));
    let alarmEntity = $derived(
        smartOptions.alarmEntityId
            ? inventoryStore.index.getEntity(smartOptions.alarmEntityId)
            : undefined,
    );
    let lockEntities = $derived(inventoryStore.getEntities(smartOptions.lockEntityIds ?? []));
    let openingEntities = $derived(inventoryStore.getEntities(smartOptions.openingEntityIds ?? []));
    let motionEntities = $derived(inventoryStore.getEntities(smartOptions.motionEntityIds ?? []));
    let safetyEntities = $derived(inventoryStore.getEntities(smartOptions.safetyEntityIds ?? []));
    let allEntityIds = $derived(
        uniqueIds([
            smartOptions.alarmEntityId,
            ...(smartOptions.lockEntityIds ?? []),
            ...(smartOptions.openingEntityIds ?? []),
            ...(smartOptions.motionEntityIds ?? []),
            ...(smartOptions.safetyEntityIds ?? []),
        ]),
    );
    let rows = $derived.by(() => {
        const allRows = [
            ...(alarmEntity ? [createRow("alarm", alarmEntity)] : []),
            ...lockEntities.map((entity) => createRow("lock", entity)),
            ...openingEntities.map((entity) => createRow("opening", entity)),
            ...motionEntities.map((entity) => createRow("motion", entity)),
            ...safetyEntities.map((entity) => createRow("safety", entity)),
        ];
        const issueRows = allRows.filter((row) => row.active);
        return (issueRows.length > 0 ? issueRows : allRows).slice(0, maxItems);
    });
    let remainingCount = $derived(Math.max(0, allEntityIds.length - rows.length));
    let openCount = $derived(openingEntities.filter(isOpeningActive).length);
    let unlockedCount = $derived(lockEntities.filter(isLockIssue).length);
    let motionCount = $derived(motionEntities.filter(isMotionActive).length);
    let safetyCount = $derived(safetyEntities.filter(isSafetyActive).length);
    let criticalCount = $derived(
        safetyCount + (alarmEntity && isAlarmCritical(alarmEntity) ? 1 : 0),
    );
    let warningCount = $derived(
        unlockedCount + openCount + (alarmEntity && isAlarmWarning(alarmEntity) ? 1 : 0),
    );
    let tone = $derived<SecurityTone>(
        allEntityIds.length === 0
            ? "empty"
            : criticalCount > 0
              ? "critical"
              : warningCount > 0
                ? "warning"
                : motionCount > 0
                  ? "activity"
                  : "clear",
    );
    let accentColor = $derived(color || toneColor(tone));
    let statusLabel = $derived(themeStore.t(`security.status.${tone}`));
    let detailSourceLabel = $derived(
        themeStore.t("security.summary", {
            open: openCount,
            unlocked: unlockedCount,
            motion: motionCount,
        }),
    );

    function uniqueIds(ids: Array<string | undefined>) {
        return Array.from(new Set(ids.filter((value): value is string => Boolean(value))));
    }

    function isAlarmCritical(entity: ResolvedEntity) {
        return ["triggered", "pending"].includes(entity.state);
    }

    function isAlarmWarning(entity: ResolvedEntity) {
        return ["arming"].includes(entity.state);
    }

    function isLockIssue(entity: ResolvedEntity) {
        return ["unlocked", "open", "opening"].includes(entity.state);
    }

    function isOpeningActive(entity: ResolvedEntity) {
        return ["on", "open", "opening", "unlocked"].includes(entity.state);
    }

    function isMotionActive(entity: ResolvedEntity) {
        return ["on", "open", "detected"].includes(entity.state);
    }

    function isSafetyActive(entity: ResolvedEntity) {
        return ["on", "open", "problem", "detected", "unsafe"].includes(entity.state);
    }

    function rowIcon(group: SecurityGroup, entity: ResolvedEntity) {
        if (group === "alarm") return "security";
        if (group === "lock") return isLockIssue(entity) ? "lock_open" : "lock";
        if (group === "opening") return "sensor_door";
        if (group === "motion") return "motion_sensor_active";
        if (entity.deviceClass === "smoke") return "detector_smoke";
        if (entity.deviceClass === "moisture") return "water_drop";
        if (entity.deviceClass === "gas") return "gas_meter";
        return "shield_alert";
    }

    function createRow(group: SecurityGroup, entity: ResolvedEntity): SecurityRow {
        const active =
            group === "alarm"
                ? isAlarmCritical(entity) || isAlarmWarning(entity)
                : group === "lock"
                  ? isLockIssue(entity)
                  : group === "opening"
                    ? isOpeningActive(entity)
                    : group === "motion"
                      ? isMotionActive(entity)
                      : isSafetyActive(entity);

        return {
            group,
            entity,
            icon: rowIcon(group, entity),
            active,
            critical: group === "alarm" ? isAlarmCritical(entity) : group === "safety" && active,
            stateLabel: formatEntityState(entity),
        };
    }

    function formatEntityState(entity: ResolvedEntity) {
        return formatEntityStateLabel(entity.state, {
            entityId: entity.entityId,
            domain: entity.domain,
            deviceClass: entity.deviceClass,
            unit: entity.unit,
            language: themeStore.language,
        });
    }

    function groupLabel(group: SecurityGroup) {
        return themeStore.t(`security.group.${group}`);
    }

    function toneColor(value: SecurityTone) {
        if (value === "critical" || value === "warning") return "var(--color-m3-error)";
        if (value === "activity") return "var(--color-m3-tertiary)";
        if (value === "clear") return "var(--color-m3-primary)";
        return "var(--color-m3-outline)";
    }

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id,
            entityId,
            name,
            icon,
            type: "security",
            options: { security: options },
            color,
            backgroundColor,
            onSave: (newConfig) => {
                entityId = newConfig.entityId;
                name = newConfig.name;
                icon = newConfig.icon || "security";
                color = newConfig.color;
                backgroundColor = newConfig.backgroundColor;
                options = (newConfig.options as { security?: SecurityCardOptions })?.security ?? options;
            },
            onDelete: ondelete,
        });
    }

    function openRow(row: SecurityRow, e: Event) {
        if (dashboardEditorStore.isEditing) return;
        e.stopPropagation();
        entityDetailStore.openEntities({
            title,
            sourceLabel: detailSourceLabel,
            entityIds: allEntityIds,
            selectedEntityId: row.entity.entityId,
        });
    }

    function callAlarm(service: "alarm_arm_home" | "alarm_arm_away" | "alarm_disarm", e: Event) {
        e.stopPropagation();
        if (!smartOptions.alarmEntityId) return;
        haStore.callService("alarm_control_panel", service, {
            entity_id: smartOptions.alarmEntityId,
        });
    }
</script>

<article
    data-testid="security-card"
    class="relative h-full w-full overflow-hidden rounded-m3-card text-m3-on-surface group/card @container {getCardSurfaceClasses(surfaceStyle)} {className}"
    style={`container-type: size;${getCardSurfaceStyle(surfaceStyle, backgroundColor)}`}
    aria-label={title}
>
    <div class="security-card">
        <header class="security-card__header">
            <div
                class="security-card__icon"
                style:background-color={`color-mix(in srgb, ${accentColor} 18%, transparent)`}
                style:color={accentColor}
            >
                <DynamicIcon name={icon || "security"} class="size-[58%]" />
            </div>
            <div class="min-w-0 flex-1">
                <h3 class="security-card__title">{title}</h3>
                <p class="security-card__status" style:color={accentColor}>{statusLabel}</p>
            </div>
            <div class="security-card__badge" style:color={accentColor}>
                {allEntityIds.length}
            </div>
        </header>

        <div class="security-card__metrics">
            <span>{themeStore.t("security.metric.open", { count: openCount })}</span>
            <span>{themeStore.t("security.metric.unlocked", { count: unlockedCount })}</span>
            <span>{themeStore.t("security.metric.motion", { count: motionCount })}</span>
        </div>

        {#if smartOptions.showAlarmControls !== false && alarmEntity}
            <div class="security-card__actions">
                <button type="button" onclick={(e) => callAlarm("alarm_arm_home", e)}>
                    {themeStore.t("security.controls.armHome")}
                </button>
                <button type="button" onclick={(e) => callAlarm("alarm_arm_away", e)}>
                    {themeStore.t("security.controls.armAway")}
                </button>
                <button type="button" onclick={(e) => callAlarm("alarm_disarm", e)}>
                    {themeStore.t("security.controls.disarm")}
                </button>
            </div>
        {/if}

        <div class="security-card__rows">
            {#if rows.length > 0}
                {#each rows as row (row.entity.entityId)}
                    <button
                        type="button"
                        class="security-card__row"
                        class:security-card__row--active={row.active}
                        class:security-card__row--critical={row.critical}
                        onclick={(e) => openRow(row, e)}
                    >
                        <DynamicIcon name={row.icon} class="size-5 shrink-0" />
                        <span class="security-card__row-body">
                            <span class="security-card__row-title">{row.entity.name}</span>
                            <span class="security-card__row-subtitle">
                                {groupLabel(row.group)} - {row.stateLabel}
                            </span>
                        </span>
                    </button>
                {/each}
                {#if remainingCount > 0}
                    <p class="security-card__more">
                        {themeStore.t("security.moreItems", { count: remainingCount })}
                    </p>
                {/if}
            {:else}
                <div class="security-card__empty">
                    <DynamicIcon name="shield_lock" class="size-7" />
                    <span>{themeStore.t("security.noEntities")}</span>
                </div>
            {/if}
        </div>
    </div>

    <button
        class="touch-edit-control absolute right-[clamp(0.25rem,2cqmin,0.75rem)] top-[clamp(0.25rem,2cqmin,0.75rem)] z-30 rounded-full bg-m3-primary-container p-[clamp(0.25rem,1.7cqmin,0.5rem)] text-m3-on-primary-container opacity-0 shadow-sm transition-opacity hover:brightness-110 group-hover/card:opacity-100"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title={themeStore.t("security.editTitle")}
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>

    <EntityDetailButton
        entityIds={allEntityIds}
        selectedEntityId={alarmEntity?.entityId ?? rows[0]?.entity.entityId}
        {title}
        sourceLabel={detailSourceLabel}
    />
</article>

<style>
    .security-card {
        display: flex;
        height: 100%;
        min-height: 0;
        flex-direction: column;
        gap: clamp(0.45rem, 2.5cqmin, 0.8rem);
        padding: clamp(0.625rem, 4cqmin, 1.25rem);
    }

    .security-card__header {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: clamp(0.5rem, 3cqmin, 1rem);
        padding-right: clamp(2rem, 7cqi, 3rem);
    }

    .security-card__icon {
        display: flex;
        width: clamp(2.4rem, 18cqmin, 4rem);
        height: clamp(2.4rem, 18cqmin, 4rem);
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
    }

    .security-card__title,
    .security-card__status,
    .security-card__row-title,
    .security-card__row-subtitle {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .security-card__title {
        font-size: clamp(0.95rem, max(5.4cqb, 1.8cqi), 1.3rem);
        font-weight: 800;
        line-height: 1.1;
    }

    .security-card__status {
        font-size: clamp(0.75rem, 3.4cqmin, 0.9rem);
        font-weight: 700;
    }

    .security-card__badge {
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--color-m3-surface-container-high);
        padding: 0.25rem 0.55rem;
        font-size: clamp(0.75rem, 3cqmin, 0.9rem);
        font-weight: 800;
    }

    .security-card__metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .security-card__metrics span,
    .security-card__more {
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

    .security-card__actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .security-card__actions button {
        min-width: 0;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-secondary-container);
        padding: 0.5rem 0.4rem;
        color: var(--color-m3-on-secondary-container);
        font-size: clamp(0.625rem, 2.8cqmin, 0.8125rem);
        font-weight: 800;
        transition: filter 140ms ease;
    }

    .security-card__actions button:hover {
        filter: brightness(1.06);
    }

    .security-card__rows {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: clamp(0.25rem, 1.6cqmin, 0.5rem);
    }

    .security-card__row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.55rem;
        border-radius: var(--radius-m3-md);
        background: var(--color-m3-surface-container-high);
        padding: clamp(0.4rem, 1.8cqmin, 0.6rem);
        text-align: left;
        color: var(--color-m3-on-surface);
    }

    .security-card__row--active {
        background: color-mix(in srgb, var(--color-m3-tertiary) 13%, var(--color-m3-surface-container-high));
    }

    .security-card__row--critical {
        background: color-mix(in srgb, var(--color-m3-error) 16%, var(--color-m3-surface-container-high));
    }

    .security-card__row-body {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 0.05rem;
    }

    .security-card__row-title {
        font-size: clamp(0.75rem, 3.1cqmin, 0.9rem);
        font-weight: 800;
    }

    .security-card__row-subtitle {
        color: var(--color-m3-on-surface-variant);
        font-size: clamp(0.625rem, 2.6cqmin, 0.78rem);
    }

    .security-card__more {
        margin-top: auto;
        text-align: left;
    }

    .security-card__empty {
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

    @container (max-height: 175px) {
        .security-card__actions,
        .security-card__metrics {
            display: none;
        }
    }
</style>
