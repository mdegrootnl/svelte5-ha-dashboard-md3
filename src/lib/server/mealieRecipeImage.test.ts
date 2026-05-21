import { describe, expect, it } from "vitest";
import { formatMealieError } from "./mealieRecipeImage";

describe("Mealie recipe image helpers", () => {
    it("extracts readable errors from Mealie responses", () => {
        expect(formatMealieError({ error: "Upload rejected" })).toBe("Upload rejected");
        expect(formatMealieError({ detail: "Missing image" })).toBe("Missing image");
        expect(formatMealieError({ detail: { message: "Unsupported image type" } })).toBe(
            "Unsupported image type",
        );
        expect(formatMealieError({ detail: { code: "unknown" } })).toBeUndefined();
        expect(formatMealieError(null)).toBeUndefined();
    });
});
