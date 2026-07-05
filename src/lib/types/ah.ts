import type { MealieRecipeSummary } from "$lib/types/mealie";

export type ShoppingProvider = "mealie" | "albert-heijn" | "both";

export interface AhSettingsStatus {
    configured: boolean;
    authenticated: boolean;
    needsReconnect: boolean;
    expiresAt?: string;
}

export interface AhPrice {
    now: number;
    was?: number;
}

export interface AhProductImage {
    url: string;
    width?: number;
    height?: number;
}

export interface AhProduct {
    id: number;
    title: string;
    brand?: string;
    unitSize?: string;
    unitPriceDescription?: string;
    price: AhPrice;
    image?: AhProductImage;
    isBonus: boolean;
    bonusMechanism?: string;
    isAvailable: boolean;
    isOrderable: boolean;
}

export interface AhProductMapping {
    mode: "product" | "freeText";
    productId?: number;
    productTitle?: string;
    productBrand?: string;
    quantity?: number;
    updatedAt: string;
}

export interface ShoppingExportItem {
    originalText: string;
    displayText: string;
    normalizedKey?: string;
    mode: "product" | "freeText";
    productId?: number;
    product?: AhProduct;
    quantity: number;
}

export interface AhReceiptSummary {
    transactionId: string;
    transactionMoment?: string;
    totalAmount?: number;
    totalCurrency?: string;
}

export interface AhReceiptProductLine {
    transactionId: string;
    transactionMoment?: string;
    description: string;
    quantity?: number;
    amount?: string;
    indicator?: string;
}

export interface AhRegularItemSuggestion {
    normalizedKey: string;
    displayText: string;
    purchaseCount: number;
    receiptCount: number;
    totalQuantity: number;
    averageQuantity: number;
    lastPurchasedAt?: string;
    examples: string[];
}

export interface AhRecipeSuggestion {
    recipe: MealieRecipeSummary;
    score: number;
    matchedIngredients: string[];
    matchedPurchaseItems: string[];
}

export interface SundayMealSuggestions {
    generatedAt: string;
    history: {
        receiptsScanned: number;
        productLinesScanned: number;
    };
    mealie: {
        configured: boolean;
        recipesScanned: number;
        error?: string;
    };
    regularItems: AhRegularItemSuggestion[];
    recipeSuggestions: AhRecipeSuggestion[];
}
