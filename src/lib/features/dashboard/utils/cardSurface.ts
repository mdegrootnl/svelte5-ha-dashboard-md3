import type {
    DashboardCardSurfaceStyle,
    DashboardGridCardSurfaceStyle,
} from "$lib/types/dashboard";
import { readableTextColorForBackground } from "$lib/utils/contrast";

export const CARD_SURFACE_STYLES: DashboardCardSurfaceStyle[] = [
    "md3",
    "glass",
    "soft",
];

export const GRID_CARD_SURFACE_STYLES: DashboardGridCardSurfaceStyle[] = [
    "theme",
    ...CARD_SURFACE_STYLES,
];

export function normalizeCardSurfaceStyle(
    value: unknown,
): DashboardCardSurfaceStyle {
    return CARD_SURFACE_STYLES.includes(value as DashboardCardSurfaceStyle)
        ? (value as DashboardCardSurfaceStyle)
        : "md3";
}

export function normalizeGridCardSurfaceStyle(
    value: unknown,
): DashboardGridCardSurfaceStyle {
    return GRID_CARD_SURFACE_STYLES.includes(
        value as DashboardGridCardSurfaceStyle,
    )
        ? (value as DashboardGridCardSurfaceStyle)
        : "theme";
}

export function resolveCardSurfaceStyle(
    themeStyle?: DashboardCardSurfaceStyle,
    gridStyle?: DashboardGridCardSurfaceStyle,
): DashboardCardSurfaceStyle {
    const normalizedGridStyle = normalizeGridCardSurfaceStyle(gridStyle);
    if (normalizedGridStyle !== "theme") return normalizedGridStyle;
    return normalizeCardSurfaceStyle(themeStyle);
}

export function getCardSurfaceClasses(
    style: DashboardCardSurfaceStyle = "md3",
) {
    const normalizedStyle = normalizeCardSurfaceStyle(style);
    return `dashboard-card-surface dashboard-card-surface-${normalizedStyle}`;
}

export function getCardSurfaceStyle(
    _style: DashboardCardSurfaceStyle = "md3",
    backgroundColor?: string,
) {
    if (!backgroundColor) return "";

    const readableTextColor = readableTextColorForBackground(backgroundColor);
    const readableColorStyle = readableTextColor
        ? ` --dashboard-card-readable-color: ${readableTextColor}; color: var(--dashboard-card-readable-color);`
        : "";

    return `background-color: ${backgroundColor};${readableColorStyle}`;
}

export function getActiveCardSurfaceStyle(
    style: DashboardCardSurfaceStyle,
    color: string,
    opacity = 15,
) {
    const baseMix =
        style === "glass"
            ? "transparent"
            : "var(--color-m3-surface-container-highest)";
    return [
        `background-color: color-mix(in srgb, ${color} ${opacity}%, ${baseMix});`,
        `box-shadow: var(--dashboard-card-surface-shadow), inset 0 0 0 1px color-mix(in srgb, ${color} 20%, transparent);`,
    ].join(" ");
}
