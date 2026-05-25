import { describe, expect, it, vi } from "vitest";

class MockAhApiError extends Error {
    constructor(
        message: string,
        public status = 500,
    ) {
        super(message);
    }
}

const searchAhProducts = vi.fn();

vi.mock("$lib/server/ahClient", () => ({
    AhApiError: MockAhApiError,
    searchAhProducts,
}));

const { GET } = await import("./+server");

describe("/api/ah/products/search", () => {
    it("returns an empty list for blank queries", async () => {
        const response = await GET({
            url: new URL("http://localhost/api/ah/products/search?query="),
            fetch: vi.fn(),
        } as any);

        await expect(response.json()).resolves.toEqual({ products: [] });
        expect(searchAhProducts).not.toHaveBeenCalled();
    });

    it("returns mapped products from the AH client", async () => {
        searchAhProducts.mockResolvedValueOnce([{ id: 123, title: "AH Uien" }]);
        const fetchMock = vi.fn();
        const response = await GET({
            url: new URL("http://localhost/api/ah/products/search?query=uien&limit=5"),
            fetch: fetchMock,
        } as any);

        expect(searchAhProducts).toHaveBeenCalledWith("uien", 5, fetchMock);
        await expect(response.json()).resolves.toEqual({
            products: [{ id: 123, title: "AH Uien" }],
        });
    });

    it("returns AH client errors so the review sheet can show row-specific failures", async () => {
        searchAhProducts.mockRejectedValueOnce(new MockAhApiError("Albert Heijn search is rate limited.", 429));

        const response = await GET({
            url: new URL("http://localhost/api/ah/products/search?query=uien&limit=5"),
            fetch: vi.fn(),
        } as any);

        expect(response.status).toBe(429);
        await expect(response.json()).resolves.toEqual({
            error: "Albert Heijn search is rate limited.",
        });
    });
});
