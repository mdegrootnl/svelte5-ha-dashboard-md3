import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
    AhRecipeDiscoveryError,
    discoverAhRecipeLinksFromPage,
    isAhAllerhandeUrl,
    type AhDiscoveredRecipe,
} from "$lib/server/ahRecipeDiscovery";

function normalizeUrls(value: unknown) {
    const input = Array.isArray(value) ? value : [value];
    const seen = new Set<string>();
    return input
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean)
        .filter((url) => {
            if (seen.has(url)) return false;
            seen.add(url);
            return true;
        });
}

function boundedLimit(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 48;
    return Math.min(Math.max(Math.round(parsed), 1), 80);
}

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const input = body as { urls?: unknown; limit?: unknown };
    const urls = normalizeUrls(input.urls).filter(isAhAllerhandeUrl);
    if (!urls.length) {
        return json({ error: "Paste at least one Albert Heijn Allerhande URL." }, { status: 400 });
    }

    const limit = boundedLimit(input.limit);
    const recipes = new Map<string, AhDiscoveredRecipe>();
    const sources: Array<{ url: string; count: number; error?: string }> = [];

    for (const url of urls) {
        try {
            const discovered = await discoverAhRecipeLinksFromPage({ url, fetch: globalThis.fetch, limit });
            for (const recipe of discovered) {
                if (recipes.size >= limit) break;
                if (!recipes.has(recipe.url)) recipes.set(recipe.url, recipe);
            }
            sources.push({ url, count: discovered.length });
        } catch (error) {
            if (error instanceof AhRecipeDiscoveryError) {
                sources.push({ url, count: 0, error: error.message });
                continue;
            }
            sources.push({ url, count: 0, error: "Albert Heijn recipe discovery failed." });
        }

        if (recipes.size >= limit) break;
    }

    return json({
        recipes: [...recipes.values()],
        sources,
    });
};
