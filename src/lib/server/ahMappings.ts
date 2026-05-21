import fs from "fs/promises";
import path from "path";
import { normalizeAhIngredientKey, mappingFromExportItem } from "$lib/features/meals/ahMatching";
import { getResolvedDataDir } from "$lib/server/dataDir";
import type { AhProductMapping, ShoppingExportItem } from "$lib/types/ah";

const CONFIG_FILE = "ah-product-mappings.json";

type AhProductMappings = Record<string, AhProductMapping>;

let saveLock: Promise<void> = Promise.resolve();

function getConfigPath() {
    return path.join(getResolvedDataDir(), CONFIG_FILE);
}

async function ensureDir() {
    await fs.mkdir(getResolvedDataDir(), { recursive: true });
}

function validMapping(value: unknown): AhProductMapping | undefined {
    if (!value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    if (record.mode !== "product" && record.mode !== "freeText") return undefined;
    return {
        mode: record.mode,
        productId: typeof record.productId === "number" ? record.productId : undefined,
        productTitle: typeof record.productTitle === "string" ? record.productTitle : undefined,
        productBrand: typeof record.productBrand === "string" ? record.productBrand : undefined,
        quantity: typeof record.quantity === "number" ? record.quantity : undefined,
        updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    };
}

export class AhMappingsService {
    static async load(): Promise<AhProductMappings> {
        try {
            await ensureDir();
            const content = await fs.readFile(getConfigPath(), "utf-8");
            const data = JSON.parse(content) as Record<string, unknown>;
            const mappings: AhProductMappings = {};
            for (const [key, value] of Object.entries(data)) {
                const normalizedKey = normalizeAhIngredientKey(key);
                const mapping = validMapping(value);
                if (normalizedKey && mapping) mappings[normalizedKey] = mapping;
            }
            return mappings;
        } catch {
            return {};
        }
    }

    static async saveFromExportItems(items: ShoppingExportItem[]) {
        saveLock = saveLock.catch(() => undefined).then(async () => {
            await ensureDir();
            const current = await this.load();
            const next: AhProductMappings = { ...current };
            for (const item of items) {
                const key = normalizeAhIngredientKey(item.normalizedKey || item.originalText || item.displayText);
                if (key) next[key] = mappingFromExportItem(item);
            }
            await fs.writeFile(getConfigPath(), JSON.stringify(next, null, 2), {
                encoding: "utf-8",
                mode: 0o600,
            });
        });
        return saveLock;
    }
}
