import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { normalizeAhIngredientKey } from "$lib/features/meals/ahMatching";
import { AhApiError, exportAhShoppingList } from "$lib/server/ahClient";
import { AhMappingsService } from "$lib/server/ahMappings";
import type { ShoppingExportItem } from "$lib/types/ah";

function normalizeExportItems(value: unknown): ShoppingExportItem[] {
    if (!Array.isArray(value)) return [];
    const items: ShoppingExportItem[] = [];
    for (const item of value) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const displayText = typeof record.displayText === "string" ? record.displayText.trim() : "";
        const originalText = typeof record.originalText === "string" ? record.originalText.trim() : displayText;
        const mode = record.mode === "product" ? "product" : "freeText";
        const product = record.product && typeof record.product === "object" ? record.product as ShoppingExportItem["product"] : undefined;
        const productId = typeof record.productId === "number" ? record.productId : product?.id;
        const quantity = typeof record.quantity === "number" && Number.isFinite(record.quantity) ? record.quantity : 1;
        if (!displayText) continue;
        if (mode === "product" && !productId) continue;
        items.push({
            originalText,
            displayText,
            normalizedKey: normalizeAhIngredientKey(String(record.normalizedKey ?? (originalText || displayText))),
            mode,
            productId,
            product,
            quantity,
        });
    }
    return items;
}

export const POST: RequestHandler = async ({ request, fetch }) => {
    const body = await request.json().catch(() => null);
    const items = normalizeExportItems((body as { items?: unknown } | null)?.items);
    if (!items.length) return json({ error: "No exportable shopping items were provided." }, { status: 400 });

    try {
        await exportAhShoppingList(items, fetch);
        await AhMappingsService.saveFromExportItems(items);
        return json({ success: true, count: items.length });
    } catch (error) {
        if (error instanceof AhApiError) {
            return json({ error: error.message }, { status: error.status });
        }
        console.error("Albert Heijn shopping export failed:", error);
        return json({ error: "Albert Heijn shopping export failed." }, { status: 500 });
    }
};
