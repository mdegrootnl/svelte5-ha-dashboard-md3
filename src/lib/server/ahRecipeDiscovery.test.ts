import { describe, expect, it } from "vitest";
import {
    discoverAhRecipeLinksFromHtml,
    isAhAllerhandeUrl,
    isAhRecipeUrl,
    normalizeAhRecipeUrl,
} from "./ahRecipeDiscovery";

describe("Albert Heijn recipe discovery", () => {
    it("extracts unique Allerhande recipe links from search HTML", () => {
        const recipes = discoverAhRecipeLinksFromHtml(
            `
                <a title="Recept: Panna e limoni van Roberta Pagnier" href="/allerhande/recept/R-R1202687/panna-e-limoni-van-roberta-pagnier">Recipe</a>
                <a aria-label="Recept: Dirty lemon martini, 10 minuten bereidingstijd" href="https://www.ah.nl/allerhande/recept/R-R1202686/dirty-lemon-martini">Recipe</a>
                <a href="/allerhande/recept/R-R1202687/panna-e-limoni-van-roberta-pagnier">Duplicate</a>
                <a href="/producten/product/wi123">Product</a>
            `,
            "https://www.ah.nl/allerhande/recepten-zoeken",
        );

        expect(recipes).toEqual([
            {
                url: "https://www.ah.nl/allerhande/recept/R-R1202687/panna-e-limoni-van-roberta-pagnier",
                title: "Panna e limoni van Roberta Pagnier",
                sourceUrl: "https://www.ah.nl/allerhande/recepten-zoeken",
            },
            {
                url: "https://www.ah.nl/allerhande/recept/R-R1202686/dirty-lemon-martini",
                title: "Dirty lemon martini",
                sourceUrl: "https://www.ah.nl/allerhande/recepten-zoeken",
            },
        ]);
    });

    it("normalizes only AH recipe URLs", () => {
        expect(
            normalizeAhRecipeUrl(
                "/allerhande/recept/R-R1202686/dirty-lemon-martini?x=1#top",
                "https://www.ah.nl/allerhande/recepten-zoeken",
            ),
        ).toBe("https://www.ah.nl/allerhande/recept/R-R1202686/dirty-lemon-martini");
        expect(normalizeAhRecipeUrl("https://example.com/allerhande/recept/R-R1/nope", "https://www.ah.nl")).toBeUndefined();
    });

    it("recognizes AH Allerhande and recipe URLs", () => {
        expect(isAhAllerhandeUrl("https://www.ah.nl/allerhande/recepten-zoeken")).toBe(true);
        expect(isAhAllerhandeUrl("https://login.ah.nl/allerhande/recepten-zoeken")).toBe(false);
        expect(isAhRecipeUrl("https://www.ah.nl/allerhande/recept/R-R1202686/dirty-lemon-martini")).toBe(true);
        expect(isAhRecipeUrl("https://www.ah.nl/allerhande/recepten-zoeken")).toBe(false);
    });
});
