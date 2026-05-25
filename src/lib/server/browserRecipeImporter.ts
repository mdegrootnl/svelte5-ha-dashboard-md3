import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class BrowserRecipeImportError extends Error {
    constructor(
        message: string,
        public status = 500,
    ) {
        super(message);
    }
}

const BLOCKED_HOSTS = new Set(["localhost", "ip6-localhost"]);
const MAX_RECIPE_IMAGE_BYTES = 8 * 1024 * 1024;

type DnsLookup = typeof lookup;

export interface BrowserRecipeImage {
    bytes: Uint8Array;
    contentType: string;
    extension: string;
    sourceUrl: string;
}

export interface BrowserRecipeExtraction {
    recipe: Record<string, unknown>;
    image?: BrowserRecipeImage;
}

export function sanitizePublicRecipeUrl(value: unknown) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 2048) return undefined;

    try {
        const url = new URL(trimmed);
        if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;

        const hostname = url.hostname.toLowerCase();
        if (BLOCKED_HOSTS.has(hostname)) return undefined;
        if (isPrivateOrReservedAddress(hostname)) return undefined;

        return url.toString();
    } catch {
        return undefined;
    }
}

export function isPrivateOrReservedAddress(value: string) {
    const address = value.replace(/^\[|\]$/g, "").toLowerCase();
    const type = isIP(address);

    if (type === 4) return isPrivateOrReservedIpv4(address);
    if (type === 6) return isPrivateOrReservedIpv6(address);

    return false;
}

export function normalizeRecipeJsonLd(recipe: Record<string, unknown>, sourceUrl: string) {
    const ingredients = toTextArray(recipe.recipeIngredient);
    const instructions = toInstructionArray(recipe.recipeInstructions);
    const name = toText(recipe.name);

    if (!name || !ingredients.length || !instructions.length) {
        throw new BrowserRecipeImportError("The page did not expose enough structured recipe data.", 422);
    }

    const normalized: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name,
        description: toText(recipe.description),
        recipeYield: recipe.recipeYield,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        totalTime: recipe.totalTime,
        recipeIngredient: ingredients,
        recipeInstructions: instructions.map((text) => ({
            "@type": "HowToStep",
            text,
        })),
        url: sourceUrl,
    };

    const categories = toTextArray(recipe.recipeCategory);
    const keywords = toTextArray(recipe.keywords);
    const cuisine = toText(recipe.recipeCuisine);

    if (categories.length) normalized.recipeCategory = categories;
    if (keywords.length) normalized.keywords = keywords.join(", ");
    if (cuisine) normalized.recipeCuisine = cuisine;

    return normalized;
}

export async function extractRecipeWithBrowser(sourceUrl: string): Promise<BrowserRecipeExtraction> {
    const requestVerifier = createPublicRecipeRequestVerifier();
    const url = await verifiedPublicRecipeUrl(sourceUrl, requestVerifier);

    let chromium: typeof import("playwright-core").chromium;
    try {
        ({ chromium } = await import("playwright-core"));
    } catch {
        throw new BrowserRecipeImportError("Browser-assisted import is not available on this server.", 501);
    }

    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        args: browserLaunchArgs(),
    });
    try {
        const page = await browser.newPage({
            viewport: { width: 1280, height: 900 },
            userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
        });
        await page.route("**/*", async (route) => {
            if (await requestVerifier(route.request().url())) {
                await route.continue();
                return;
            }

            await route.abort("blockedbyclient");
        });

        const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45000,
        });

        if (response?.url()) {
            await verifiedPublicRecipeUrl(response.url(), requestVerifier);
        }

        if (!response || response.status() >= 400) {
            throw new BrowserRecipeImportError(`Recipe page returned HTTP ${response?.status() ?? "unknown"}.`, 502);
        }

        await page.waitForTimeout(1500);
        const recipe = await page.evaluate(() => {
            function flatten(value: unknown): Array<Record<string, unknown>> {
                if (!value) return [];
                if (Array.isArray(value)) return value.flatMap(flatten);
                if (typeof value !== "object") return [];

                const node = value as Record<string, unknown>;
                const nodes = [node];
                if (Array.isArray(node["@graph"])) nodes.push(...node["@graph"].flatMap(flatten));
                if (node.mainEntity) nodes.push(...flatten(node.mainEntity));
                if (node.mainEntityOfPage) nodes.push(...flatten(node.mainEntityOfPage));
                return nodes;
            }

            for (const element of document.querySelectorAll('script[type="application/ld+json"]')) {
                try {
                    const parsed = JSON.parse(element.textContent || "");
                    const found = flatten(parsed).find((node) => {
                        const type = node["@type"];
                        return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
                    });
                    if (found) return found;
                } catch {
                    // Keep scanning the next JSON-LD script.
                }
            }

            return null;
        });

        if (!recipe) {
            throw new BrowserRecipeImportError("No schema.org Recipe data was found on the page.", 422);
        }

        return {
            recipe: normalizeRecipeJsonLd(recipe, url),
            image: await downloadRecipeImage(page, recipe, url, requestVerifier),
        };
    } finally {
        await browser.close();
    }
}

async function downloadRecipeImage(
    page: import("playwright-core").Page,
    recipe: Record<string, unknown>,
    sourceUrl: string,
    requestVerifier: ReturnType<typeof createPublicRecipeRequestVerifier>,
): Promise<BrowserRecipeImage | undefined> {
    const imageUrl = await firstPublicImageUrl(recipe.image, sourceUrl, requestVerifier);
    if (!imageUrl) return undefined;

    const response = await page.context().request.get(imageUrl, {
        headers: { referer: sourceUrl },
        timeout: 30000,
    }).catch(() => null);

    if (!response?.ok()) return undefined;

    const contentType = response.headers()["content-type"]?.split(";")[0]?.trim().toLowerCase() ?? "";
    const extension = imageExtension(contentType, imageUrl);
    if (!extension) return undefined;

    const contentLength = Number(response.headers()["content-length"] ?? 0);
    if (contentLength > MAX_RECIPE_IMAGE_BYTES) return undefined;

    const body = await response.body();
    if (!body.byteLength || body.byteLength > MAX_RECIPE_IMAGE_BYTES) return undefined;

    return {
        bytes: new Uint8Array(body),
        contentType,
        extension,
        sourceUrl: imageUrl,
    };
}

async function firstPublicImageUrl(
    value: unknown,
    sourceUrl: string,
    requestVerifier: ReturnType<typeof createPublicRecipeRequestVerifier>,
) {
    const candidates = toTextArray(value);
    for (const candidate of candidates) {
        try {
            const absolute = new URL(candidate, sourceUrl).toString();
            return await verifiedPublicRecipeUrl(absolute, requestVerifier);
        } catch {
            // Try the next image candidate.
        }
    }

    return undefined;
}

function imageExtension(contentType: string, imageUrl: string) {
    if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg";
    if (contentType === "image/png") return "png";
    if (contentType === "image/webp") return "webp";

    const extension = new URL(imageUrl).pathname.split(".").pop()?.toLowerCase();
    if (extension === "jpg" || extension === "jpeg") return "jpg";
    if (extension === "png" || extension === "webp") return extension;
    return undefined;
}

export function createPublicRecipeRequestVerifier(dnsLookup: DnsLookup = lookup) {
    const hostCache = new Map<string, Promise<boolean>>();

    return async function verifyPublicRecipeRequest(value: unknown) {
        const url = sanitizePublicRecipeUrl(value);
        if (!url) return false;

        const hostname = new URL(url).hostname;
        const address = hostname.replace(/^\[|\]$/g, "");
        if (isIP(address)) return true;

        let result = hostCache.get(hostname);
        if (!result) {
            result = dnsLookup(hostname, { all: true }).then((addresses) => {
                return addresses.length > 0 && addresses.every(({ address }) => !isPrivateOrReservedAddress(address));
            }).catch(() => false);
            hostCache.set(hostname, result);
        }

        return result;
    };
}

async function verifiedPublicRecipeUrl(
    value: unknown,
    requestVerifier: ReturnType<typeof createPublicRecipeRequestVerifier>,
) {
    const url = sanitizePublicRecipeUrl(value);
    if (!url) {
        throw new BrowserRecipeImportError("Enter a valid public http:// or https:// recipe URL.", 400);
    }

    const allowed = await requestVerifier(url);
    if (!allowed) {
        throw new BrowserRecipeImportError("Could not verify the recipe host.", 400);
    }

    return url;
}

function browserLaunchArgs() {
    const configured = process.env.PLAYWRIGHT_CHROMIUM_ARGS;
    if (configured) return configured.split(/\s+/).filter(Boolean);
    return ["--no-sandbox", "--disable-dev-shm-usage"];
}

function isPrivateOrReservedIpv4(address: string) {
    const parts = address.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        return true;
    }

    const [first, second] = parts;
    return (
        first === 0 ||
        first === 10 ||
        first === 127 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 100 && second >= 64 && second <= 127) ||
        (first === 198 && (second === 18 || second === 19)) ||
        first >= 224
    );
}

function isPrivateOrReservedIpv6(address: string) {
    if (address === "::" || address === "::1") return true;
    if (address.startsWith("fc") || address.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(address)) return true;
    if (address.startsWith("::ffff:")) {
        const mapped = address.slice("::ffff:".length);
        if (isIP(mapped) === 4) return isPrivateOrReservedIpv4(mapped);
    }
    return false;
}

function toText(value: unknown): string {
    if (!value) return "";
    if (typeof value === "string") return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map(toText).filter(Boolean).join("\n");
    if (typeof value === "object") {
        const record = value as Record<string, unknown>;
        return toText(record.text ?? record.name ?? record.description ?? record.itemListElement);
    }
    return String(value).trim();
}

function toTextArray(value: unknown): string[] {
    if (!value) return [];
    if (typeof value === "string") {
        return value
            .split(/\s*,\s*/)
            .map(toText)
            .filter(Boolean);
    }
    if (Array.isArray(value)) return value.map(toText).filter(Boolean);
    return [toText(value)].filter(Boolean);
}

function toInstructionArray(value: unknown): string[] {
    if (!value) return [];
    if (typeof value === "string") return [toText(value)].filter(Boolean);
    if (!Array.isArray(value)) return [toText(value)].filter(Boolean);

    return value.flatMap((step) => {
        if (step && typeof step === "object") {
            const record = step as Record<string, unknown>;
            if (Array.isArray(record.itemListElement)) return toInstructionArray(record.itemListElement);
        }
        return [toText(step)].filter(Boolean);
    });
}
