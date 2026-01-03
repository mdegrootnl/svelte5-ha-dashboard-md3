export interface DragState {
    isDragging: boolean;
    startX: number;
    didMove: boolean;
    lastCallTime: number;
}

export function createDragState(): DragState {
    return {
        isDragging: false,
        startX: 0,
        didMove: false,
        lastCallTime: 0
    };
}

export function calculatePercentage(
    clientX: number,
    element: HTMLElement
): number {
    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left;
    let pct = Math.round((x / rect.width) * 100);
    return Math.max(0, Math.min(100, pct));
}

export function shouldThrottle(
    lastCallTime: number,
    throttleMs: number = 200
): boolean {
    return Date.now() - lastCallTime < throttleMs;
}
