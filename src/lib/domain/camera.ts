import type { HAEntity } from "$lib/types";

export const DEFAULT_ACTIVE_CAMERA_STATES = [
    "recording",
    "streaming",
    "on",
    "active",
] as const;

const INACTIVE_CAMERA_STATES = new Set(["idle", "off", "unavailable", "unknown"]);

type CameraLikeEntity = Pick<HAEntity, "entity_id" | "state" | "attributes"> | null | undefined;

export function isCameraStateActive(
    state: string | null | undefined,
    activeStates: readonly string[] = DEFAULT_ACTIVE_CAMERA_STATES,
) {
    const normalized = (state ?? "").trim().toLowerCase();
    if (!normalized || INACTIVE_CAMERA_STATES.has(normalized)) return false;
    return activeStates.map((item) => item.toLowerCase()).includes(normalized);
}

export function isCameraEntityActive(
    entity: CameraLikeEntity,
    activeStates: readonly string[] = DEFAULT_ACTIVE_CAMERA_STATES,
) {
    if (!entity || !entity.entity_id.startsWith("camera.")) return false;
    return isCameraStateActive(entity.state, activeStates);
}

export function getCameraSnapshotSource(entity: CameraLikeEntity, refreshKey?: string | number) {
    if (!entity?.entity_id) return null;
    const picture = entity.attributes?.entity_picture;
    const basePath = typeof picture === "string" && picture.length > 0
        ? picture
        : `/api/camera_proxy/${entity.entity_id}`;

    if (refreshKey === undefined || refreshKey === null || refreshKey === "") {
        return basePath;
    }

    const separator = basePath.includes("?") ? "&" : "?";
    return `${basePath}${separator}dashboard_refresh=${encodeURIComponent(String(refreshKey))}`;
}
