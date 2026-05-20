import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
    BrowserRecipeImportError,
    type BrowserRecipeImage,
    extractRecipeWithBrowser,
} from "$lib/server/browserRecipeImporter";
import { MealieProxyError, proxyMealieRequest } from "$lib/server/mealieProxy";

function normalizeBoolean(value: unknown) {
    return typeof value === "boolean" ? value : false;
}

function formatMealieError(data: unknown) {
    if (!data || typeof data !== "object") return undefined;
    const record = data as Record<string, unknown>;
    if (typeof record.error === "string") return record.error;
    if (typeof record.detail === "string") return record.detail;
    if (record.detail && typeof record.detail === "object") {
        const detail = record.detail as Record<string, unknown>;
        if (typeof detail.message === "string") return detail.message;
    }
    return undefined;
}

export const POST: RequestHandler = async ({ request, fetch }) => {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const input = body as {
        url?: unknown;
        includeTags?: unknown;
        includeCategories?: unknown;
    };

    try {
        const { recipe, image } = await extractRecipeWithBrowser(String(input.url ?? ""));
        const importBody = {
            includeTags: normalizeBoolean(input.includeTags),
            includeCategories: normalizeBoolean(input.includeCategories),
            data: JSON.stringify(recipe),
            url: recipe.url,
        };

        const proxyRequest = new Request(request.url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(importBody),
        });

        const response = await proxyMealieRequest({
            path: "recipes/create/html-or-json",
            request: proxyRequest,
            url: new URL(request.url),
            fetch,
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            return json(
                { error: formatMealieError(data) || "Mealie could not import the browser-extracted recipe." },
                { status: response.status },
            );
        }

        const slug = typeof data === "string" ? data : String(data ?? "");
        const imageResult = slug && image
            ? await uploadRecipeImage({ slug, image, request, fetch })
            : { imported: false };

        return json({
            success: true,
            slug,
            name: recipe.name,
            source: "browser-jsonld",
            imageImported: imageResult.imported,
            imageError: imageResult.error,
        });
    } catch (error) {
        if (error instanceof BrowserRecipeImportError || error instanceof MealieProxyError) {
            return json({ error: error.message }, { status: error.status });
        }

        console.error("Browser-assisted Mealie import failed:", error);
        return json({ error: "Browser-assisted import failed." }, { status: 500 });
    }
};

async function uploadRecipeImage({
    slug,
    image,
    request,
    fetch,
}: {
    slug: string;
    image: BrowserRecipeImage;
    request: Request;
    fetch: typeof globalThis.fetch;
}) {
    const form = new FormData();
    const imageBody = image.bytes.buffer.slice(
        image.bytes.byteOffset,
        image.bytes.byteOffset + image.bytes.byteLength,
    ) as ArrayBuffer;
    form.set("extension", image.extension);
    form.set(
        "image",
        new Blob([imageBody], { type: image.contentType }),
        `recipe.${image.extension}`,
    );

    const imageRequest = new Request(request.url, {
        method: "PUT",
        body: form,
    });

    const response = await proxyMealieRequest({
        path: `recipes/${slug}/image`,
        request: imageRequest,
        url: new URL(request.url),
        fetch,
    });

    if (response.ok) return { imported: true };

    const data = await response.json().catch(() => null);
    return {
        imported: false,
        error: formatMealieError(data) || "Mealie could not attach the recipe image.",
    };
}
