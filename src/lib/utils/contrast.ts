export interface RgbColor {
    r: number;
    g: number;
    b: number;
}

function clampChannel(value: number) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

export function parseHexColor(value: string): RgbColor | null {
    const trimmed = value.trim();
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
    if (!match) return null;

    const hex = match[1];
    const normalized = hex.length === 3
        ? hex.split('').map((part) => `${part}${part}`).join('')
        : hex;

    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
    };
}

export function parseRgbColor(value: string): RgbColor | null {
    const match = /^rgba?\(\s*([.\d]+)\s*,\s*([.\d]+)\s*,\s*([.\d]+)/i.exec(value.trim());
    if (!match) return null;

    return {
        r: clampChannel(Number(match[1])),
        g: clampChannel(Number(match[2])),
        b: clampChannel(Number(match[3])),
    };
}

export function parseCssColor(value: string): RgbColor | null {
    return parseHexColor(value) ?? parseRgbColor(value);
}

function srgbToLinear(channel: number) {
    const value = channel / 255;
    return value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: RgbColor) {
    return 0.2126 * srgbToLinear(color.r) +
        0.7152 * srgbToLinear(color.g) +
        0.0722 * srgbToLinear(color.b);
}

export function contrastRatio(a: RgbColor, b: RgbColor) {
    const lighter = Math.max(relativeLuminance(a), relativeLuminance(b));
    const darker = Math.min(relativeLuminance(a), relativeLuminance(b));
    return (lighter + 0.05) / (darker + 0.05);
}

export function readableTextColorForBackground(backgroundColor: string) {
    const color = parseCssColor(backgroundColor);
    if (!color) return null;

    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };

    return contrastRatio(color, white) >= contrastRatio(color, black)
        ? '#ffffff'
        : '#000000';
}
