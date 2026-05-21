import type { BrowserRecipeImage } from "$lib/server/browserRecipeImporter";
import { proxyMealieRequest } from "$lib/server/mealieProxy";

export function formatMealieError(data: unknown) {
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

export async function uploadRecipeImageToMealie({
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
