import { describe, expect, it } from "vitest";
import { parseRecipeImportUrls } from "./importUrls";

describe("parseRecipeImportUrls", () => {
    it("extracts unique http URLs from pasted text", () => {
        expect(
            parseRecipeImportUrls(`
                https://miljuschka.nl/pasta-alfredo/
                See also: https://miljuschka.nl/pasta-alfredo/.
                http://example.com/recipe
            `),
        ).toEqual([
            "https://miljuschka.nl/pasta-alfredo/",
            "http://example.com/recipe",
        ]);
    });

    it("ignores malformed or unsupported URLs", () => {
        expect(parseRecipeImportUrls("ftp://example.com nope https://ok.test/recipe)")).toEqual([
            "https://ok.test/recipe",
        ]);
    });
});
