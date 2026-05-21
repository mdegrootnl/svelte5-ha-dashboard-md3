import type { AhProduct, AhProductMapping, ShoppingExportItem } from "$lib/types/ah";

const LEADING_UNITS = new Set([
    "g",
    "gr",
    "gram",
    "kg",
    "ml",
    "cl",
    "l",
    "liter",
    "el",
    "eetlepel",
    "eetlepels",
    "tl",
    "theelepel",
    "theelepels",
    "teen",
    "tenen",
    "takje",
    "takjes",
    "stuk",
    "stuks",
    "snuf",
    "snufje",
    "blik",
    "blikken",
    "pak",
    "pakken",
    "bos",
    "bosje",
]);

function cleanToken(value: string) {
    return value.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function isAmountToken(value: string) {
    return /^(\d+([,.]\d+)?|\d+\/\d+|\d+-\d+|\u00BD|\u00BC|\u00BE)$/.test(value);
}

export function normalizeAhIngredientKey(value: string) {
    const normalized = value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/&/g, " en ")
        .replace(/[^\p{L}\p{N}/,.\-\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

    const tokens = normalized.split(" ").map(cleanToken).filter(Boolean);
    while (tokens.length && isAmountToken(tokens[0])) tokens.shift();
    while (tokens.length && LEADING_UNITS.has(tokens[0])) tokens.shift();
    return tokens.join(" ").trim() || normalized;
}

export function ahSearchQueryForIngredient(value: string) {
    return normalizeAhIngredientKey(value).replace(/\b(vers|verse|fijngehakt|gesneden|geraspt)\b/g, "").replace(/\s+/g, " ").trim();
}

export function exportItemFromIngredient(
    originalText: string,
    displayText: string,
    mapping?: AhProductMapping,
): ShoppingExportItem {
    const normalizedKey = normalizeAhIngredientKey(originalText || displayText);
    return {
        originalText,
        displayText,
        normalizedKey,
        mode: mapping?.mode ?? "freeText",
        productId: mapping?.productId,
        product: mapping?.productId
            ? {
                  id: mapping.productId,
                  title: mapping.productTitle || displayText,
                  brand: mapping.productBrand,
                  price: { now: 0 },
                  isBonus: false,
                  isAvailable: true,
                  isOrderable: true,
              }
            : undefined,
        quantity: mapping?.quantity && mapping.quantity > 0 ? mapping.quantity : 1,
    };
}

export function mappingFromExportItem(item: ShoppingExportItem): AhProductMapping {
    return {
        mode: item.mode,
        productId: item.mode === "product" ? item.productId : undefined,
        productTitle: item.mode === "product" ? item.product?.title : undefined,
        productBrand: item.mode === "product" ? item.product?.brand : undefined,
        quantity: item.quantity > 0 ? item.quantity : 1,
        updatedAt: new Date().toISOString(),
    };
}

export function bestProductImage(product: AhProduct) {
    return product.image?.url ?? "";
}
