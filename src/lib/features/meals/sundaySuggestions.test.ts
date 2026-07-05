import { describe, expect, it } from "vitest";
import { buildRecipeSuggestionsFromHistory, buildRegularAhItemSuggestions } from "./sundaySuggestions";
import type { AhReceiptProductLine } from "$lib/types/ah";
import type { MealieRecipe } from "$lib/types/mealie";

describe("Sunday meal suggestions", () => {
    it("summarizes repeated AH receipt products while ignoring non-grocery receipt rows", () => {
        const lines: AhReceiptProductLine[] = [
            { transactionId: "1", transactionMoment: "2026-07-01T12:00:00Z", description: "AH Uien", quantity: 1 },
            { transactionId: "2", transactionMoment: "2026-07-08T12:00:00Z", description: "AH Uien", quantity: 2 },
            { transactionId: "3", description: "BONUSKAART" },
            { transactionId: "4", description: "PINNEN" },
            { transactionId: "5", description: "AH Bananen", quantity: 1 },
        ];

        expect(buildRegularAhItemSuggestions(lines, 5)).toEqual([
            expect.objectContaining({
                normalizedKey: "ah uien",
                displayText: "AH Uien",
                purchaseCount: 2,
                totalQuantity: 3,
                averageQuantity: 2,
                lastPurchasedAt: "2026-07-08T12:00:00Z",
            }),
        ]);
    });

    it("scores Mealie recipes by overlap with regular AH purchases", () => {
        const regularItems = buildRegularAhItemSuggestions([
            { transactionId: "1", description: "AH Uien" },
            { transactionId: "2", description: "AH Uien" },
            { transactionId: "3", description: "AH Pasta" },
            { transactionId: "4", description: "AH Pasta" },
            { transactionId: "5", description: "AH Rijst" },
            { transactionId: "6", description: "AH Rijst" },
        ], 6);
        const recipes: MealieRecipe[] = [
            {
                id: "a",
                slug: "pasta-ui",
                name: "Pasta met ui",
                recipeIngredient: [{ display: "2 uien" }, { display: "300 g pasta" }],
            },
            {
                id: "b",
                slug: "salade",
                name: "Salade",
                recipeIngredient: [{ display: "sla" }, { display: "komkommer" }],
            },
        ];

        expect(buildRecipeSuggestionsFromHistory(recipes, regularItems)).toEqual([
            expect.objectContaining({
                recipe: expect.objectContaining({ slug: "pasta-ui" }),
                matchedIngredients: expect.arrayContaining(["2 uien", "300 g pasta"]),
                matchedPurchaseItems: expect.arrayContaining(["AH Uien", "AH Pasta"]),
            }),
        ]);
    });
});
