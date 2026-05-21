import { describe, expect, it, vi } from "vitest";

class MockAhApiError extends Error {
    constructor(
        message: string,
        public status = 500,
    ) {
        super(message);
    }
}

const exportAhShoppingList = vi.fn();
const saveFromExportItems = vi.fn();

vi.mock("$lib/server/ahClient", () => ({
    AhApiError: MockAhApiError,
    exportAhShoppingList,
}));

vi.mock("$lib/server/ahMappings", () => ({
    AhMappingsService: {
        saveFromExportItems,
    },
}));

const { POST } = await import("./+server");

function postBody(body: unknown) {
    return new Request("http://localhost/api/ah/shopping-list/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("/api/ah/shopping-list/export", () => {
    it("rejects empty export payloads", async () => {
        const response = await POST({ request: postBody({ items: [] }), fetch: vi.fn() } as any);
        expect(response.status).toBe(400);
        expect(exportAhShoppingList).not.toHaveBeenCalled();
    });

    it("exports normalized items and saves mappings", async () => {
        exportAhShoppingList.mockResolvedValueOnce(undefined);
        saveFromExportItems.mockResolvedValueOnce(undefined);
        const fetchMock = vi.fn();

        const response = await POST({
            request: postBody({
                items: [
                    {
                        originalText: "4 uien",
                        displayText: "6 uien",
                        mode: "product",
                        productId: 123,
                        product: { id: 123, title: "AH Uien" },
                        quantity: 2,
                    },
                    {
                        originalText: "Zout naar smaak",
                        displayText: "Zout naar smaak",
                        mode: "freeText",
                        quantity: 1,
                    },
                ],
            }),
            fetch: fetchMock,
        } as any);

        expect(exportAhShoppingList).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ normalizedKey: "uien", mode: "product", productId: 123 }),
                expect.objectContaining({ normalizedKey: "zout naar smaak", mode: "freeText" }),
            ]),
            fetchMock,
        );
        expect(saveFromExportItems).toHaveBeenCalledTimes(1);
        await expect(response.json()).resolves.toEqual({ success: true, count: 2 });
    });

    it("returns authentication errors from the AH client", async () => {
        exportAhShoppingList.mockRejectedValueOnce(new MockAhApiError("Albert Heijn is not connected.", 401));
        const response = await POST({
            request: postBody({ items: [{ originalText: "4 uien", displayText: "4 uien", mode: "freeText", quantity: 1 }] }),
            fetch: vi.fn(),
        } as any);

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: "Albert Heijn is not connected." });
    });
});
