import { redirect, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AhApiError, exchangeAhCode } from "$lib/server/ahClient";

export const GET: RequestHandler = async ({ url }) => {
    const code = url.searchParams.get("code") ?? "";
    const basePrefix = url.pathname.split("/api/ah/auth/callback")[0] || "";
    try {
        await exchangeAhCode(code, globalThis.fetch);
        throw redirect(303, `${basePrefix}/settings?ah=connected`);
    } catch (error) {
        if ((error as { status?: number }).status === 303) throw error;
        if (error instanceof AhApiError) {
            return json({ error: error.message }, { status: error.status });
        }
        console.error("Albert Heijn login callback failed:", error);
        return json({ error: "Albert Heijn login failed." }, { status: 500 });
    }
};
