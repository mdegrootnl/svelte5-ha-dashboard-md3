import { isCameraEntityActive } from '$lib/domain/camera';
import { haStore } from '$lib/stores/ha.svelte';
import type { DashboardItem } from '$lib/types/dashboard';

function resolveCameraEntityIds(item: DashboardItem) {
    const configuredIds = item.options?.camera?.entityIds?.filter(Boolean) ?? [];
    if (configuredIds.length > 0) return configuredIds;
    if (item.entityId) return [item.entityId];
    return haStore.getEntityIdsSnapshot().filter((entityId) => entityId.startsWith('camera.'));
}

export function isCameraCardActive(item: DashboardItem) {
    if (item.cardType !== 'camera') return true;

    haStore.statesVersion;
    haStore.overridesVersion;

    return resolveCameraEntityIds(item).some((entityId) =>
        isCameraEntityActive(haStore.getEntity(entityId), item.options?.camera?.activeStates),
    );
}

export function shouldHideDashboardItem(item: DashboardItem, isEditing: boolean) {
    return item.cardType === 'camera' && !isEditing && !isCameraCardActive(item);
}
