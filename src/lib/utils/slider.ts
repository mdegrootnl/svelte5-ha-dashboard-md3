/**
 * Slider gesture utilities for drag/tap interactions.
 * Extracted from ButtonCard for reusability.
 */

export interface SliderState {
    isDragging: boolean;
    startX: number;
    didMove: boolean;
    value: number;
}

export interface SliderCallbacks {
    onValueChange: (value: number) => void;
    onToggle: () => void;
}

const DRAG_THRESHOLD = 5; // pixels
const THROTTLE_MS = 100;

/**
 * Calculate percentage value from pointer X position relative to element.
 */
export function calculatePercentage(clientX: number, element: HTMLElement): number {
    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.round((x / rect.width) * 100);
    return Math.max(0, Math.min(100, percentage));
}

/**
 * Check if enough time has passed since last call for throttling.
 */
export function shouldThrottle(lastCallTime: number, throttleMs = THROTTLE_MS): boolean {
    return Date.now() - lastCallTime < throttleMs;
}

/**
 * Create a slider state manager.
 */
export function createSliderState(): SliderState {
    return {
        isDragging: false,
        startX: 0,
        didMove: false,
        value: 0
    };
}

/**
 * Handle pointer down event for slider.
 */
export function handleSliderPointerDown(
    e: PointerEvent,
    state: SliderState
): void {
    e.preventDefault();
    state.isDragging = true;
    state.startX = e.clientX;
    state.didMove = false;
}

/**
 * Handle pointer move event for slider.
 * Returns the new value, or null if no update needed.
 */
export function handleSliderPointerMove(
    e: PointerEvent,
    state: SliderState,
    element: HTMLElement
): number | null {
    if (!state.isDragging) return null;

    const delta = e.clientX - state.startX;

    if (Math.abs(delta) > DRAG_THRESHOLD) {
        state.didMove = true;
    }

    if (state.didMove) {
        return calculatePercentage(e.clientX, element);
    }

    return null;
}

/**
 * Handle pointer up event for slider.
 * Returns 'toggle' if it was a tap, 'drag' if it was a drag, or null if not dragging.
 */
export function handleSliderPointerUp(
    state: SliderState
): 'toggle' | 'drag' | null {
    if (!state.isDragging) return null;

    state.isDragging = false;

    if (!state.didMove) {
        return 'toggle';
    }

    return 'drag';
}
