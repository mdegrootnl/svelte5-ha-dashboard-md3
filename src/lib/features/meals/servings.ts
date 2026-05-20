const VULGAR_FRACTIONS: Record<string, number> = {
    '¼': 0.25,
    '½': 0.5,
    '¾': 0.75,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
};

const LEADING_AMOUNT =
    /^(\d+\s+\d+\/\d+|\d+[.,]\d+|\d+\/\d+|\d+|[¼½¾⅓⅔⅛⅜⅝⅞])(\s+)(.+)$/u;

export function normalizeServings(value: unknown, fallback = 4) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.max(1, Math.round(parsed));
}

export function servingScale(baseServings: unknown, targetServings: unknown) {
    const base = normalizeServings(baseServings);
    const target = normalizeServings(targetServings, base);
    return target / base;
}

export function scaleIngredientText(value: string | null | undefined, scale: number) {
    const text = (value ?? '').trim();
    if (!text || !Number.isFinite(scale) || scale <= 0 || scale === 1) return text;

    const match = text.match(LEADING_AMOUNT);
    if (!match) return text;

    const amount = parseAmount(match[1]);
    if (amount === null) return text;

    const scaled = formatAmount(amount * scale, match[1]);
    return `${scaled}${match[2]}${match[3]}`;
}

export function scaleIngredientQuantity(value: unknown, scale: number) {
    const quantity = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(scale) || scale <= 0) {
        return value;
    }

    return Number((quantity * scale).toFixed(3));
}

function parseAmount(value: string) {
    if (value in VULGAR_FRACTIONS) return VULGAR_FRACTIONS[value];

    const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) {
        const denominator = Number(mixed[3]);
        if (!denominator) return null;
        return Number(mixed[1]) + Number(mixed[2]) / denominator;
    }

    const fraction = value.match(/^(\d+)\/(\d+)$/);
    if (fraction) {
        const denominator = Number(fraction[2]);
        if (!denominator) return null;
        return Number(fraction[1]) / denominator;
    }

    const decimal = Number(value.replace(',', '.'));
    return Number.isFinite(decimal) ? decimal : null;
}

function formatAmount(value: number, original: string) {
    const rounded = Number(value.toFixed(2));
    const formatted = Number.isInteger(rounded)
        ? String(rounded)
        : rounded.toLocaleString('nl-NL', {
              maximumFractionDigits: 2,
              minimumFractionDigits: 0,
          });

    return original.includes('.') && formatted.includes(',') ? formatted.replace(',', '.') : formatted;
}
