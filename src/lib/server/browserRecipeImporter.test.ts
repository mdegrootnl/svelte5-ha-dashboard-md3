import { describe, expect, it, vi } from "vitest";
import {
    createPublicRecipeRequestVerifier,
    isPrivateOrReservedAddress,
    normalizeRecipeJsonLd,
    sanitizePublicRecipeUrl,
} from "./browserRecipeImporter";

describe("browser recipe importer", () => {
    it("blocks private or malformed URLs", () => {
        expect(sanitizePublicRecipeUrl("http://localhost/recipe")).toBeUndefined();
        expect(sanitizePublicRecipeUrl("http://192.168.0.1/recipe")).toBeUndefined();
        expect(sanitizePublicRecipeUrl("http://169.254.169.254/recipe")).toBeUndefined();
        expect(sanitizePublicRecipeUrl("http://[::1]/recipe")).toBeUndefined();
        expect(sanitizePublicRecipeUrl("ftp://example.com/recipe")).toBeUndefined();
    });

    it("recognizes private or reserved addresses after DNS resolution", () => {
        expect(isPrivateOrReservedAddress("10.0.0.4")).toBe(true);
        expect(isPrivateOrReservedAddress("172.20.0.4")).toBe(true);
        expect(isPrivateOrReservedAddress("8.8.8.8")).toBe(false);
        expect(isPrivateOrReservedAddress("fd00::1")).toBe(true);
        expect(isPrivateOrReservedAddress("2606:4700:4700::1111")).toBe(false);
    });

    it("verifies every browser recipe request against resolved public addresses", async () => {
        const dnsLookup = vi.fn(async (hostname: string) => {
            if (hostname === "private.example") return [{ address: "192.168.0.4" }];
            return [{ address: "8.8.8.8" }];
        });
        const verifier = createPublicRecipeRequestVerifier(dnsLookup as never);

        await expect(verifier("https://recipes.example/recipe")).resolves.toBe(true);
        await expect(verifier("https://private.example/recipe")).resolves.toBe(false);
        await expect(verifier("http://localhost/recipe")).resolves.toBe(false);
        await expect(verifier("ftp://recipes.example/recipe")).resolves.toBe(false);

        await verifier("https://recipes.example/another");
        expect(dnsLookup).toHaveBeenCalledTimes(2);
    });

    it("normalizes schema.org Recipe JSON for Mealie", () => {
        const recipe = normalizeRecipeJsonLd(
            {
                "@type": "Recipe",
                name: "French onion pasta",
                recipeIngredient: ["300 g pasta", "4 uien"],
                recipeInstructions: [
                    { "@type": "HowToStep", text: "Kook de pasta." },
                    { "@type": "HowToStep", text: "Bak de uien." },
                ],
                keywords: ["pasta", "diner"],
            },
            "https://miljuschka.nl/french-onion-pasta/",
        );

        expect(recipe.name).toBe("French onion pasta");
        expect(recipe.recipeIngredient).toEqual(["300 g pasta", "4 uien"]);
        expect(recipe.recipeInstructions).toEqual([
            { "@type": "HowToStep", text: "Kook de pasta." },
            { "@type": "HowToStep", text: "Bak de uien." },
        ]);
        expect(recipe.keywords).toBe("pasta, diner");
    });
});
