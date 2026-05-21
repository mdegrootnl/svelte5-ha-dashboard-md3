import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AhApiError, searchAhProducts } from "$lib/server/ahClient";

export const GET: RequestHandler = async ({ url, fetch }) => {
    const query = url.searchParams.get("query") ?? "";
    const limit = Number(url.searchParams.get("limit") ?? 8);
    if (!query.trim()) return json({ products: [] });

    try {
        const products = await searchAhProducts(query, limit, fetch);
        return json({ products });
    } catch (error) {
        if (error instanceof AhApiError) {
            return json({ error: error.message }, { status: error.status });
        }
        console.error("Albert Heijn product search failed:", error);
        return json({ error: "Albert Heijn product search failed." }, { status: 500 });
    }
};
