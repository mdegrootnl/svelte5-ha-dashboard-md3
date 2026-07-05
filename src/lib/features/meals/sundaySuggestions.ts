import { normalizeAhIngredientKey } from "$lib/features/meals/ahMatching";
import type { AhReceiptProductLine, AhRecipeSuggestion, AhRegularItemSuggestion } from "$lib/types/ah";
import type { MealieRecipe } from "$lib/types/mealie";

const EXCLUDED_RECEIPT_PATTERNS = [
    /\bbonuskaart\b/i,
    /\bkoopzegels?\b/i,
    /\bespaarzegels?\b/i,
    /\bsubtotaal\b/i,
    /\btotaal\b/i,
    /\bpinnen\b/i,
    /\bmaestro\b/i,
    /\bmastercard\b/i,
    /\bvisa\b/i,
    /\bwaarvan\b/i,
];

const TOKEN_STOP_WORDS = new Set([
    "ah",
    "albert",
    "heijn",
    "de",
    "het",
    "een",
    "en",
    "met",
    "voor",
    "van",
    "vers",
    "verse",
    "bio",
    "biologisch",
    "excellent",
    "basic",
]);

function isUsefulReceiptLine(line: AhReceiptProductLine) {
    if (!line.description.trim()) return false;
    if (/bonus/i.test(String(line.quantity ?? ""))) return false;
    if (EXCLUDED_RECEIPT_PATTERNS.some((pattern) => pattern.test(line.description))) return false;
    return true;
}

function tokensFor(value: string) {
    return normalizeAhIngredientKey(value)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !TOKEN_STOP_WORDS.has(token));
}

function overlapScore(left: string, right: string) {
    const leftTokens = new Set(tokensFor(left));
    const rightTokens = new Set(tokensFor(right));
    if (!leftTokens.size || !rightTokens.size) return 0;
    let matches = 0;
    for (const token of leftTokens) {
        if (rightTokens.has(token)) matches += 1;
    }
    return matches / Math.max(rightTokens.size, 1);
}

function mostCommonDescription(descriptions: Map<string, number>) {
    return Array.from(descriptions.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "";
}

export function buildRegularAhItemSuggestions(
    lines: AhReceiptProductLine[],
    receiptCount: number,
    minimumPurchases = 2,
): AhRegularItemSuggestion[] {
    const groups = new Map<string, {
        descriptions: Map<string, number>;
        purchaseCount: number;
        totalQuantity: number;
        lastPurchasedAt?: string;
    }>();

    for (const line of lines) {
        if (!isUsefulReceiptLine(line)) continue;
        const normalizedKey = normalizeAhIngredientKey(line.description);
        if (!normalizedKey) continue;
        const group = groups.get(normalizedKey) ?? {
            descriptions: new Map<string, number>(),
            purchaseCount: 0,
            totalQuantity: 0,
            lastPurchasedAt: undefined,
        };
        group.purchaseCount += 1;
        group.totalQuantity += line.quantity ?? 1;
        group.descriptions.set(line.description, (group.descriptions.get(line.description) ?? 0) + 1);
        if (line.transactionMoment && (!group.lastPurchasedAt || line.transactionMoment > group.lastPurchasedAt)) {
            group.lastPurchasedAt = line.transactionMoment;
        }
        groups.set(normalizedKey, group);
    }

    return Array.from(groups.entries())
        .map(([normalizedKey, group]) => ({
            normalizedKey,
            displayText: mostCommonDescription(group.descriptions) || normalizedKey,
            purchaseCount: group.purchaseCount,
            receiptCount,
            totalQuantity: group.totalQuantity,
            averageQuantity: Math.max(1, Math.round(group.totalQuantity / Math.max(group.purchaseCount, 1))),
            lastPurchasedAt: group.lastPurchasedAt,
            examples: Array.from(group.descriptions.keys()).slice(0, 4),
        }))
        .filter((item) => item.purchaseCount >= minimumPurchases)
        .sort((a, b) => b.purchaseCount - a.purchaseCount || a.displayText.localeCompare(b.displayText));
}

function ingredientText(ingredient: NonNullable<MealieRecipe["recipeIngredient"]>[number]) {
    return ingredient.display || ingredient.originalText || ingredient.note || ingredient.food?.name || ingredient.title || "";
}

export function buildRecipeSuggestionsFromHistory(
    recipes: MealieRecipe[],
    regularItems: AhRegularItemSuggestion[],
    limit = 8,
): AhRecipeSuggestion[] {
    const suggestions: AhRecipeSuggestion[] = [];

    for (const recipe of recipes) {
        const ingredientMatches = new Map<string, number>();
        const purchaseMatches = new Map<string, number>();
        let score = 0;

        for (const ingredient of recipe.recipeIngredient ?? []) {
            const text = ingredientText(ingredient).trim();
            if (!text) continue;
            for (const item of regularItems) {
                const overlap = overlapScore(item.normalizedKey, text);
                if (overlap <= 0) continue;
                const weighted = overlap * Math.log2(item.purchaseCount + 1);
                score += weighted;
                ingredientMatches.set(text, (ingredientMatches.get(text) ?? 0) + weighted);
                purchaseMatches.set(item.displayText, (purchaseMatches.get(item.displayText) ?? 0) + weighted);
            }
        }

        if (score <= 0) continue;
        suggestions.push({
            recipe: {
                id: recipe.id,
                name: recipe.name,
                slug: recipe.slug,
                image: recipe.image,
                description: recipe.description,
                recipeServings: recipe.recipeServings,
                recipeYield: recipe.recipeYield,
                totalTime: recipe.totalTime,
                prepTime: recipe.prepTime,
                cookTime: recipe.cookTime,
                recipeCategory: recipe.recipeCategory,
                tags: recipe.tags,
                rating: recipe.rating,
                orgURL: recipe.orgURL,
                lastMade: recipe.lastMade,
            },
            score: Math.round(score * 100) / 100,
            matchedIngredients: Array.from(ingredientMatches.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([text]) => text),
            matchedPurchaseItems: Array.from(purchaseMatches.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([text]) => text),
        });
    }

    return suggestions
        .sort((a, b) => b.score - a.score || (a.recipe.name ?? "").localeCompare(b.recipe.name ?? ""))
        .slice(0, limit);
}
