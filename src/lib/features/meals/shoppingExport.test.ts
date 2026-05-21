import { describe, expect, it } from "vitest";
import { buildAhShoppingExportRows } from "./shoppingExport";
import type { MealieShoppingListItem } from "$lib/types/mealie";

describe("AH shopping export rows", () => {
    it("deduplicates open Mealie shopping items by normalized ingredient text", () => {
        const rows = buildAhShoppingExportRows([
            { id: "1", checked: false, shoppingListId: "list", display: "4 uien" },
            { id: "2", checked: false, shoppingListId: "list", display: "2 uien" },
            { id: "3", checked: true, shoppingListId: "list", display: "1 pak pasta" },
            { id: "4", checked: false, shoppingListId: "list", display: "300 g pasta" },
        ] satisfies MealieShoppingListItem[]);

        expect(rows).toHaveLength(2);
        expect(rows.find((row) => row.key === "uien")).toMatchObject({
            sourceCount: 2,
            sourceTexts: ["4 uien", "2 uien"],
            itemIds: ["1", "2"],
            item: {
                mode: "freeText",
                displayText: "4 uien + 2 uien",
                originalText: "4 uien + 2 uien",
            },
        });
        expect(rows.find((row) => row.key === "pasta")).toMatchObject({
            sourceCount: 1,
            itemIds: ["4"],
        });
    });

    it("applies saved AH product mappings", () => {
        const rows = buildAhShoppingExportRows(
            [{ id: "1", checked: false, shoppingListId: "list", display: "4 uien" }],
            {
                uien: {
                    mode: "product",
                    productId: 123,
                    productTitle: "AH Uien",
                    quantity: 2,
                    updatedAt: "2026-05-20T12:00:00.000Z",
                },
            },
        );

        expect(rows[0].item).toMatchObject({
            mode: "product",
            productId: 123,
            quantity: 2,
            product: {
                title: "AH Uien",
            },
        });
    });

    it("keeps repeated identical rows visible in the reviewed free-text export", () => {
        const rows = buildAhShoppingExportRows([
            { id: "1", checked: false, shoppingListId: "list", display: "1 avocado" },
            { id: "2", checked: false, shoppingListId: "list", display: "1 avocado" },
        ] satisfies MealieShoppingListItem[]);

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            sourceCount: 2,
            sourceTexts: ["1 avocado", "1 avocado"],
            item: {
                displayText: "1 avocado (2x)",
                originalText: "1 avocado (2x)",
            },
        });
    });
});
