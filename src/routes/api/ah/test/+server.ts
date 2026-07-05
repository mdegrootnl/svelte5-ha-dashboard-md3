import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AhApiError, testAhConnection } from "$lib/server/ahClient";
import { AhSettingsService } from "$lib/server/ahSettings";

export const GET: RequestHandler = async () => {
    try {
        const member = await testAhConnection(globalThis.fetch);
        return json({ ok: true, member, settings: await AhSettingsService.getStatus() });
    } catch (error) {
        if (error instanceof AhApiError) {
            return json({ ok: false, error: error.message, settings: await AhSettingsService.getStatus() }, { status: error.status });
        }
        console.error("Albert Heijn connection test failed:", error);
        return json({ ok: false, error: "Albert Heijn connection test failed." }, { status: 500 });
    }
};
