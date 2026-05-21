import { exportItemFromIngredient, normalizeAhIngredientKey } from "$lib/features/meals/ahMatching";
import type { AhProductMapping, ShoppingExportItem } from "$lib/types/ah";
import type { MealieShoppingListItem } from "$lib/types/mealie";

export interface AhShoppingExportRow {
    key: string;
    sourceCount: number;
    sourceTexts: string[];
    itemIds: string[];
    item: ShoppingExportItem;
}

export function mealieShoppingItemText(item: MealieShoppingListItem) {
    return item.display || item.note || item.food?.name || "";
}

export function buildAhShoppingExportRows(
    items: MealieShoppingListItem[],
    mappings: Record<string, AhProductMapping> = {},
) {
    const rows = new Map<string, AhShoppingExportRow>();

    for (const item of items) {
        if (item.checked) continue;
        const text = mealieShoppingItemText(item).trim();
        if (!text) continue;
        const key = normalizeAhIngredientKey(text);
        const existing = rows.get(key);
        if (existing) {
            existing.sourceCount += 1;
            existing.sourceTexts.push(text);
            existing.itemIds.push(item.id);
            continue;
        }

        rows.set(key, {
            key,
            sourceCount: 1,
            sourceTexts: [text],
            itemIds: [item.id],
            item: exportItemFromIngredient(text, text, mappings[key]),
        });
    }

    return Array.from(rows.values()).sort((a, b) => a.item.displayText.localeCompare(b.item.displayText));
}
