import { describe, expect, it } from "vitest";
import { normalizeServings, scaleIngredientQuantity, scaleIngredientText, servingScale } from "./servings";

describe("meal serving helpers", () => {
    it("normalizes serving counts", () => {
        expect(normalizeServings(4)).toBe(4);
        expect(normalizeServings("6")).toBe(6);
        expect(normalizeServings(0)).toBe(4);
    });

    it("calculates a serving scale", () => {
        expect(servingScale(4, 6)).toBe(1.5);
    });

    it("scales leading ingredient amounts", () => {
        expect(scaleIngredientText("4 uien", 1.5)).toBe("6 uien");
        expect(scaleIngredientText("120 ml witte wijn", 1.5)).toBe("180 ml witte wijn");
        expect(scaleIngredientText("1 el olijfolie", 1.5)).toBe("1,5 el olijfolie");
        expect(scaleIngredientText("1/2 tl zout", 2)).toBe("1 tl zout");
        expect(scaleIngredientText("Zout en peper naar smaak", 2)).toBe("Zout en peper naar smaak");
    });

    it("scales structured quantities when Mealie parsed them", () => {
        expect(scaleIngredientQuantity(2, 1.5)).toBe(3);
        expect(scaleIngredientQuantity(0, 1.5)).toBe(0);
    });
});
