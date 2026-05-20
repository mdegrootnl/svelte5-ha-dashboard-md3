export interface MealiePagination<T> {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    items?: T[];
    data?: T[];
    next?: string | null;
    previous?: string | null;
}

export interface MealieNamedItem {
    id?: string;
    name?: string | null;
    slug?: string;
    color?: string;
}

export interface MealieRecipeSummary {
    id?: string | null;
    name?: string | null;
    slug: string;
    image?: unknown;
    description?: string | null;
    recipeServings?: number;
    recipeYield?: string | null;
    totalTime?: string | null;
    prepTime?: string | null;
    cookTime?: string | null;
    recipeCategory?: MealieNamedItem[] | null;
    tags?: MealieNamedItem[] | null;
    rating?: number | null;
    orgURL?: string | null;
    lastMade?: string | null;
}

export interface MealieRecipe extends MealieRecipeSummary {
    recipeIngredient?: Array<{
        id?: string;
        title?: string | null;
        note?: string | null;
        display?: string;
        quantity?: number;
        unit?: MealieNamedItem | null;
        food?: MealieNamedItem | null;
        originalText?: string | null;
        referenceId?: string | null;
    }>;
    recipeInstructions?: Array<{
        id?: string;
        title?: string | null;
        text?: string | null;
        summary?: string | null;
    }> | null;
    notes?: Array<{ title?: string | null; text?: string | null }> | null;
}

export type MealiePlanEntryType =
    | 'breakfast'
    | 'lunch'
    | 'dinner'
    | 'side'
    | 'snack'
    | 'drink'
    | 'dessert';

export interface MealiePlanEntry {
    id: number;
    date: string;
    entryType: MealiePlanEntryType;
    title?: string | null;
    text?: string | null;
    recipeId?: string | null;
    recipe?: MealieRecipeSummary | null;
}

export interface MealieShoppingListItem {
    id: string;
    display?: string;
    note?: string | null;
    checked: boolean;
    quantity?: number;
    shoppingListId: string;
    position?: number;
    labelId?: string | null;
    label?: MealieNamedItem | null;
    food?: MealieNamedItem | null;
    unit?: MealieNamedItem | null;
    recipeReferences?: Array<{
        recipe?: MealieRecipeSummary;
    }>;
}

export interface MealieShoppingList {
    id: string;
    name?: string | null;
    listItems?: MealieShoppingListItem[];
    labelSettings?: Array<{
        id: string;
        label?: MealieNamedItem;
        position?: number;
    }>;
}
