import { describe, expect, it } from "vitest";
import { exportItemFromIngredient, normalizeAhIngredientKey } from "./ahMatching";

describe("Albert Heijn ingredient matching", () => {
    it("normalizes scaled Dutch ingredient text into stable product keys", () => {
        expect(normalizeAhIngredientKey("4 uien")).toBe("uien");
        expect(normalizeAhIngredientKey("1 el olijfolie")).toBe("olijfolie");
        expect(normalizeAhIngredientKey("300 g pasta")).toBe("pasta");
        expect(normalizeAhIngredientKey("1/2 tl zout")).toBe("zout");
    });

    it("builds export items from saved product mappings", () => {
        expect(
            exportItemFromIngredient("4 uien", "6 uien", {
                mode: "product",
                productId: 1234,
                productTitle: "AH Uien",
                quantity: 2,
                updatedAt: "2026-05-20T12:00:00.000Z",
            }),
        ).toMatchObject({
            normalizedKey: "uien",
            mode: "product",
            productId: 1234,
            quantity: 2,
            product: {
                id: 1234,
                title: "AH Uien",
            },
        });
    });
});
