import { describe, expect, it, vi } from "vitest";
import { GET } from "./+server";

function thrownStatus(error: unknown) {
    return error && typeof error === "object" && "status" in error
        ? Number((error as { status: number }).status)
        : 0;
}

describe("/rain-proxy", () => {
    it("validates lat/lon before calling the fixed Buienradar endpoint", async () => {
        const fetch = vi.fn(async () => new Response("000|12:00")) as unknown as typeof globalThis.fetch;

        const response = await GET({
            url: new URL("http://localhost/rain-proxy?lat=52.1&lon=5.2"),
            fetch,
        } as never);

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledWith(new URL("https://gadgets.buienradar.nl/data/raintext/?lat=52.1&lon=5.2"));
    });

    it("rejects malformed coordinate input without forwarding it", async () => {
        const fetch = vi.fn() as unknown as typeof globalThis.fetch;

        let thrown: unknown;
        try {
            await GET({
                url: new URL("http://localhost/rain-proxy?lat=52.1%26evil=true&lon=5.2"),
                fetch,
            } as never);
        } catch (error) {
            thrown = error;
        }

        expect(thrownStatus(thrown)).toBe(400);
        expect(fetch).not.toHaveBeenCalled();
    });
});
