import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { BrowserRecipeImportError, extractRecipeWithBrowser } from "$lib/server/browserRecipeImporter";
import { formatMealieError, uploadRecipeImageToMealie } from "$lib/server/mealieRecipeImage";
import { MealieProxyError, proxyMealieRequest } from "$lib/server/mealieProxy";

function normalizeBoolean(value: unknown) {
    return typeof value === "boolean" ? value : false;
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
            ? await uploadRecipeImageToMealie({ slug, image, request, fetch })
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
