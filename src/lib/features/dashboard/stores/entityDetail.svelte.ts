export interface EntityDetailRequest {
    title?: string;
    sourceLabel?: string;
    entityIds: string[];
    selectedEntityId?: string;
}

function uniqueEntityIds(entityIds: readonly string[]) {
    return Array.from(new Set(entityIds.filter(Boolean)));
}

export class EntityDetailStore {
    open = $state(false);
    title = $state("");
    sourceLabel = $state("");
    entityIds = $state<string[]>([]);
    selectedEntityId = $state("");

    openEntities(request: EntityDetailRequest) {
        const entityIds = uniqueEntityIds(request.entityIds);
        if (entityIds.length === 0) return;

        this.title = request.title ?? "";
        this.sourceLabel = request.sourceLabel ?? "";
        this.entityIds = entityIds;
        this.selectedEntityId = entityIds.includes(request.selectedEntityId ?? "")
            ? request.selectedEntityId!
            : entityIds[0];
        this.open = true;
    }

    select(entityId: string) {
        if (!this.entityIds.includes(entityId)) return;
        this.selectedEntityId = entityId;
    }

    close() {
        this.open = false;
    }

    reset() {
        this.open = false;
        this.title = "";
        this.sourceLabel = "";
        this.entityIds = [];
        this.selectedEntityId = "";
    }
}

export const entityDetailStore = new EntityDetailStore();
