export class AhRecipeDiscoveryError extends Error {
    constructor(
        message: string,
        public status = 500,
    ) {
        super(message);
    }
}

export interface AhDiscoveredRecipe {
    url: string;
    title: string;
    sourceUrl: string;
}

const AH_HOSTS = new Set(["ah.nl", "www.ah.nl"]);
const AH_RECIPE_PATH = /^\/allerhande\/recept\/R-[^/?#]+(?:\/[^/?#]+)?$/;
const MAX_DISCOVERED_RECIPES = 80;

export function isAhAllerhandeUrl(value: unknown) {
    try {
        const url = new URL(String(value));
        return (url.protocol === "https:" || url.protocol === "http:")
            && AH_HOSTS.has(url.hostname.toLowerCase())
            && url.pathname.startsWith("/allerhande");
    } catch {
        return false;
    }
}

export function isAhRecipeUrl(value: unknown) {
    try {
        const url = new URL(String(value));
        return AH_HOSTS.has(url.hostname.toLowerCase()) && AH_RECIPE_PATH.test(url.pathname);
    } catch {
        return false;
    }
}

export function normalizeAhRecipeUrl(value: string, sourceUrl: string) {
    const url = new URL(value, sourceUrl);
    if (!AH_HOSTS.has(url.hostname.toLowerCase()) || !AH_RECIPE_PATH.test(url.pathname)) return undefined;
    url.protocol = "https:";
    url.hostname = "www.ah.nl";
    url.hash = "";
    url.search = "";
    return url.toString();
}

export function discoverAhRecipeLinksFromHtml(html: string, sourceUrl: string, limit = 48): AhDiscoveredRecipe[] {
    const cappedLimit = Math.min(Math.max(Math.round(limit) || 48, 1), MAX_DISCOVERED_RECIPES);
    const recipes = new Map<string, AhDiscoveredRecipe>();
    const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

    for (const match of html.matchAll(anchorPattern)) {
        if (recipes.size >= cappedLimit) break;
        const attrs = match[1] ?? "";
        const href = htmlAttribute(attrs, "href");
        if (!href) continue;

        const url = normalizeAhRecipeUrl(href, sourceUrl);
        if (!url || recipes.has(url)) continue;

        const title = cleanRecipeTitle(
            htmlAttribute(attrs, "title")
                || htmlAttribute(attrs, "aria-label")
                || stripHtml(match[2] ?? "")
                || titleFromRecipeUrl(url),
        );

        recipes.set(url, { url, title, sourceUrl });
    }

    if (recipes.size < cappedLimit) {
        const hrefPattern = /href=(["'])(.*?)\1/gi;
        for (const match of html.matchAll(hrefPattern)) {
            if (recipes.size >= cappedLimit) break;
            const url = normalizeAhRecipeUrl(match[2] ?? "", sourceUrl);
            if (!url || recipes.has(url)) continue;
            recipes.set(url, { url, title: titleFromRecipeUrl(url), sourceUrl });
        }
    }

    return [...recipes.values()];
}

export async function discoverAhRecipeLinksFromPage({
    url,
    fetch,
    limit = 48,
}: {
    url: string;
    fetch: typeof globalThis.fetch;
    limit?: number;
}) {
    if (!isAhAllerhandeUrl(url)) {
        throw new AhRecipeDiscoveryError("Only Albert Heijn Allerhande URLs are supported.", 400);
    }

    if (isAhRecipeUrl(url)) {
        const normalized = normalizeAhRecipeUrl(url, url);
        return normalized ? [{ url: normalized, title: titleFromRecipeUrl(normalized), sourceUrl: url }] : [];
    }

    const response = await fetch(url, {
        headers: {
            accept: "text/html,application/xhtml+xml",
            "accept-language": "nl-NL,nl;q=0.9,en;q=0.8",
            "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
        },
        redirect: "follow",
    });

    if (response.url && !isAhAllerhandeUrl(response.url)) {
        throw new AhRecipeDiscoveryError("Albert Heijn redirected outside Allerhande.", 400);
    }

    if (!response.ok) {
        throw new AhRecipeDiscoveryError(`Albert Heijn returned HTTP ${response.status}.`, 502);
    }

    const html = await response.text();
    return discoverAhRecipeLinksFromHtml(html, response.url || url, limit);
}

function htmlAttribute(attrs: string, name: string) {
    const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i");
    const match = attrs.match(pattern);
    return match ? decodeHtmlEntities(match[2] ?? "").trim() : "";
}

function cleanRecipeTitle(value: string) {
    return decodeHtmlEntities(value)
        .replace(/^Recept:\s*/i, "")
        .replace(/,\s*\d+\s+(?:minuten|min\.?|uur).*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

function stripHtml(value: string) {
    return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function titleFromRecipeUrl(url: string) {
    const slug = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "Albert Heijn recept";
    return slug
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function decodeHtmlEntities(value: string) {
    const named: Record<string, string> = {
        amp: "&",
        apos: "'",
        euro: "EUR",
        gt: ">",
        lt: "<",
        nbsp: " ",
        quot: '"',
    };

    return value
        .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity);
}
