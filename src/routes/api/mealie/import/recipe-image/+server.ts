import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { BrowserRecipeImportError, extractRecipeWithBrowser } from "$lib/server/browserRecipeImporter";
import { uploadRecipeImageToMealie } from "$lib/server/mealieRecipeImage";
import { MealieProxyError } from "$lib/server/mealieProxy";

function normalizeSlug(value: unknown) {
    if (typeof value !== "string") return "";
    const slug = value.trim();
    return /^[a-z0-9][a-z0-9_-]*$/i.test(slug) ? slug : "";
}

export const POST: RequestHandler = async ({ request, fetch }) => {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const input = body as {
        slug?: unknown;
        url?: unknown;
    };
    const slug = normalizeSlug(input.slug);
    if (!slug) return json({ error: "Invalid recipe slug" }, { status: 400 });

    try {
        const { image } = await extractRecipeWithBrowser(String(input.url ?? ""));
        if (!image) {
            return json({ error: "No usable recipe image was found on the source page." }, { status: 422 });
        }

        const result = await uploadRecipeImageToMealie({ slug, image, request, fetch });
        if (!result.imported) {
            return json({ error: result.error || "Mealie could not attach the recipe image." }, { status: 502 });
        }

        return json({
            success: true,
            slug,
            imageImported: true,
            sourceUrl: image.sourceUrl,
        });
    } catch (error) {
        if (error instanceof BrowserRecipeImportError || error instanceof MealieProxyError) {
            return json({ error: error.message }, { status: error.status });
        }

        console.error("Browser-assisted Mealie image repair failed:", error);
        return json({ error: "Browser-assisted image repair failed." }, { status: 500 });
    }
};
