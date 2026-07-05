import { afterEach, describe, expect, it, vi } from "vitest";
import { AhSettingsService } from "./ahSettings";
import { ahShoppingPayload, getAhReceipts, mapAhMember, mapAhProduct, testAhConnection } from "./ahClient";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("Albert Heijn client helpers", () => {
    it("maps AH product search responses into browser-safe products", () => {
        expect(
            mapAhProduct({
                webshopId: 123,
                title: "AH Uien",
                brand: "AH",
                salesUnitSize: "1 kg",
                currentPrice: 1.49,
                priceBeforeBonus: 1.99,
                isBonus: true,
                availableOnline: true,
                images: [
                    { url: "https://static.ah.nl/small.jpg", width: 100 },
                    { url: "https://static.ah.nl/large.jpg", width: 400 },
                ],
            }),
        ).toMatchObject({
            id: 123,
            title: "AH Uien",
            brand: "AH",
            unitSize: "1 kg",
            price: { now: 1.49, was: 1.99 },
            image: { url: "https://static.ah.nl/large.jpg" },
            isBonus: true,
            isAvailable: true,
            isOrderable: true,
        });
    });

    it("builds AH shopping-list payloads for product and free-text items", () => {
        expect(
            ahShoppingPayload([
                {
                    originalText: "4 uien",
                    displayText: "6 uien",
                    normalizedKey: "uien",
                    mode: "product",
                    productId: 123,
                    product: {
                        id: 123,
                        title: "AH Uien",
                        price: { now: 1.49 },
                        isBonus: false,
                        isAvailable: true,
                        isOrderable: true,
                    },
                    quantity: 2,
                },
                {
                    originalText: "Zout naar smaak",
                    displayText: "Zout naar smaak",
                    normalizedKey: "zout naar smaak",
                    mode: "freeText",
                    quantity: 1,
                },
            ]),
        ).toEqual({
            items: [
                {
                    description: "AH Uien",
                    productId: 123,
                    quantity: 2,
                    type: "SHOPPABLE",
                    originCode: "PRD",
                    searchTerm: "6 uien",
                    strikeThrough: false,
                },
                {
                    description: "Zout naar smaak",
                    productId: undefined,
                    quantity: 1,
                    type: "SHOPPABLE",
                    originCode: "PRD",
                    searchTerm: undefined,
                    strikeThrough: false,
                },
            ],
        });
    });

    it("maps GraphQL member profile responses into browser-safe member data", () => {
        expect(
            mapAhMember({
                id: 123456,
                emailAddress: "mijn@voorbeeld.nl",
                name: {
                    first: "Miel",
                    last: "de Groot",
                },
            }),
        ).toEqual({
            id: "123456",
            firstName: "Miel",
            lastName: "de Groot",
            email: "mijn@voorbeeld.nl",
        });
    });

    it("refreshes the saved AH token once after an authenticated 403", async () => {
        vi.spyOn(AhSettingsService, "loadRuntime")
            .mockResolvedValueOnce({
                accessToken: "stale-token",
                refreshToken: "refresh-token",
                expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            })
            .mockResolvedValueOnce({
                refreshToken: "refresh-token",
            });
        const saveSpy = vi.spyOn(AhSettingsService, "saveTokenResponse").mockResolvedValue();
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ error: "forbidden" }), {
                status: 403,
                headers: { "content-type": "application/json" },
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                access_token: "fresh-token",
                refresh_token: "refresh-token",
                expires_in: 7200,
            }), {
                status: 200,
                headers: { "content-type": "application/json" },
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                data: {
                    member: {
                        id: 123456,
                        emailAddress: "mijn@voorbeeld.nl",
                        name: { first: "Miel", last: "de Groot" },
                    },
                },
            }), {
                status: 200,
                headers: { "content-type": "application/json" },
            }));

        await expect(testAhConnection(fetchMock as unknown as typeof globalThis.fetch)).resolves.toMatchObject({
            id: "123456",
            email: "mijn@voorbeeld.nl",
        });

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
            authorization: "Bearer stale-token",
        });
        expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({
            authorization: "Bearer fresh-token",
        });
        expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
            access_token: "fresh-token",
        }));
    });

    it("loads receipt summaries through AH GraphQL", async () => {
        vi.spyOn(AhSettingsService, "loadRuntime").mockResolvedValue({
            accessToken: "receipt-token",
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });
        const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
            data: {
                posReceiptsPage: {
                    posReceipts: [
                        {
                            id: "receipt-1",
                            dateTime: "2026-07-04T10:00:00Z",
                            totalAmount: { amount: 42.5 },
                        },
                    ],
                },
            },
        }), {
            status: 200,
            headers: { "content-type": "application/json" },
        }));

        await expect(getAhReceipts(fetchMock as unknown as typeof globalThis.fetch, 7)).resolves.toEqual([
            {
                transactionId: "receipt-1",
                transactionMoment: "2026-07-04T10:00:00Z",
                totalAmount: 42.5,
                totalCurrency: "EUR",
            },
        ]);

        expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.ah.nl/graphql");
        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
            variables: { offset: 0, limit: 7 },
        });
    });
});
