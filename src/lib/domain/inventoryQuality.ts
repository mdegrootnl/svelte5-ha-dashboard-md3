import type { ResolvedEntity } from './haInventory';

export type InventoryAreaSourceKey =
    | 'entity_registry'
    | 'device_registry'
    | 'name_inference'
    | 'unassigned';

export type InventoryQualityIssueId =
    | 'name_inferred_area'
    | 'missing_area'
    | 'diagnostic_or_hidden'
    | 'hidden_runtime_state';

export type InventoryQualitySeverity = 'info' | 'warning' | 'suggestion';

export interface InventoryAreaSourceCounts {
    total: number;
    entityRegistry: number;
    deviceRegistry: number;
    nameInference: number;
    unassigned: number;
}

export interface InventoryQualityIssueGroup {
    id: InventoryQualityIssueId;
    severity: InventoryQualitySeverity;
    entityIds: string[];
}

export interface InventoryQualityReport extends InventoryAreaSourceCounts {
    issueGroups: InventoryQualityIssueGroup[];
}

const HIDDEN_RUNTIME_STATES = new Set(['unknown', 'unavailable']);
const ISSUE_ENTITY_LIMIT = 12;

export function getInventoryAreaSource(entity: ResolvedEntity): InventoryAreaSourceKey {
    if (entity.areaSource === 'entity_registry') return 'entity_registry';
    if (entity.areaSource === 'device_registry') return 'device_registry';
    if (entity.areaSource === 'name_inference') return 'name_inference';
    return 'unassigned';
}

export function summarizeInventoryAreaSources(
    entities: Iterable<ResolvedEntity>,
): InventoryAreaSourceCounts {
    const summary: InventoryAreaSourceCounts = {
        total: 0,
        entityRegistry: 0,
        deviceRegistry: 0,
        nameInference: 0,
        unassigned: 0,
    };

    for (const entity of entities) {
        summary.total += 1;
        const source = getInventoryAreaSource(entity);
        if (source === 'entity_registry') {
            summary.entityRegistry += 1;
        } else if (source === 'device_registry') {
            summary.deviceRegistry += 1;
        } else if (source === 'name_inference') {
            summary.nameInference += 1;
        } else {
            summary.unassigned += 1;
        }
    }

    return summary;
}

export function buildInventoryQualityReport(
    entities: Iterable<ResolvedEntity>,
): InventoryQualityReport {
    const list = Array.from(entities);
    const sourceCounts = summarizeInventoryAreaSources(list);

    const issueGroups = [
        createIssueGroup(
            'name_inferred_area',
            'warning',
            list.filter((entity) => entity.areaSource === 'name_inference'),
        ),
        createIssueGroup(
            'missing_area',
            'warning',
            list.filter((entity) => !entity.areaId && !entity.hidden && !entity.diagnostic),
        ),
        createIssueGroup(
            'diagnostic_or_hidden',
            'info',
            list.filter((entity) => entity.hidden || entity.diagnostic),
        ),
        createIssueGroup(
            'hidden_runtime_state',
            'info',
            list.filter(
                (entity) =>
                    HIDDEN_RUNTIME_STATES.has(entity.state) &&
                    !entity.hidden &&
                    !entity.diagnostic,
            ),
        ),
    ].filter((group): group is InventoryQualityIssueGroup => Boolean(group));

    return {
        ...sourceCounts,
        issueGroups,
    };
}

function createIssueGroup(
    id: InventoryQualityIssueId,
    severity: InventoryQualitySeverity,
    entities: ResolvedEntity[],
): InventoryQualityIssueGroup | null {
    if (entities.length === 0) return null;
    return {
        id,
        severity,
        entityIds: entities.slice(0, ISSUE_ENTITY_LIMIT).map((entity) => entity.entityId),
    };
}
