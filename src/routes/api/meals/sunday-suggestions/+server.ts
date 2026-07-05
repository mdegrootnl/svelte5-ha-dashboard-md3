import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { buildRecipeSuggestionsFromHistory, buildRegularAhItemSuggestions } from "$lib/features/meals/sundaySuggestions";
import { AhApiError, getAhReceiptProductLines } from "$lib/server/ahClient";
import { MealieSettingsService } from "$lib/server/mealieSettings";
import type { SundayMealSuggestions } from "$lib/types/ah";
import type { MealiePagination, MealieRecipe, MealieRecipeSummary } from "$lib/types/mealie";

function boundedInt(value: string | null, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.round(parsed), min), max);
}

function paginationItems<T>(page: MealiePagination<T>) {
    return page.items ?? page.data ?? [];
}

async function fetchMealieJson<T>(path: string, fetchImpl: typeof globalThis.fetch) {
    const { baseUrl, apiToken } = await MealieSettingsService.getCredentials();
    if (!baseUrl || !apiToken) throw new Error("Mealie is not configured");

    const response = await fetchImpl(new URL(`/api/${path}`, baseUrl), {
        headers: {
            accept: "application/json",
            authorization: `Bearer ${apiToken}`,
        },
        redirect: "manual",
    });
    if (!response.ok) throw new Error(`Mealie request failed: ${response.status}`);
    return await response.json() as T;
}

async function loadMealieRecipes(fetchImpl: typeof globalThis.fetch, limit: number) {
    const page = await fetchMealieJson<MealiePagination<MealieRecipeSummary>>(
        `recipes?perPage=${limit}&orderBy=name&orderDirection=asc`,
        fetchImpl,
    );
    const summaries = paginationItems(page).filter((recipe) => recipe.slug);
    const recipes: MealieRecipe[] = [];
    for (const summary of summaries) {
        try {
            recipes.push(await fetchMealieJson<MealieRecipe>(`recipes/${encodeURIComponent(summary.slug)}`, fetchImpl));
        } catch {
            // Keep suggestions best-effort when one imported recipe has malformed data.
        }
    }
    return recipes;
}

export const GET: RequestHandler = async ({ url }) => {
    const receiptLimit = boundedInt(url.searchParams.get("receiptLimit"), 12, 1, 50);
    const recipeLimit = boundedInt(url.searchParams.get("recipeLimit"), 48, 0, 100);

    try {
        const { receipts, lines } = await getAhReceiptProductLines(globalThis.fetch, receiptLimit);
        const regularItems = buildRegularAhItemSuggestions(lines, receipts.length);
        const mealieStatus = await MealieSettingsService.getStatus();
        let recipesScanned = 0;
        let recipeSuggestions: SundayMealSuggestions["recipeSuggestions"] = [];
        let mealieError: string | undefined;

        if (mealieStatus.configured && recipeLimit > 0) {
            try {
                const recipes = await loadMealieRecipes(globalThis.fetch, recipeLimit);
                recipesScanned = recipes.length;
                recipeSuggestions = buildRecipeSuggestionsFromHistory(recipes, regularItems);
            } catch (error) {
                mealieError = error instanceof Error ? error.message : "Mealie suggestions failed";
            }
        }

        return json({
            generatedAt: new Date().toISOString(),
            history: {
                receiptsScanned: receipts.length,
                productLinesScanned: lines.length,
            },
            mealie: {
                configured: mealieStatus.configured,
                recipesScanned,
                error: mealieError,
            },
            regularItems,
            recipeSuggestions,
        } satisfies SundayMealSuggestions);
    } catch (error) {
        if (error instanceof AhApiError) {
            return json({ error: error.message }, { status: error.status });
        }
        console.error("Sunday meal suggestions failed:", error);
        return json({ error: "Sunday meal suggestions failed." }, { status: 500 });
    }
};
