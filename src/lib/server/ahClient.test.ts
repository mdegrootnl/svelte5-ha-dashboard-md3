import { describe, expect, it } from "vitest";
import { ahShoppingPayload, mapAhMember, mapAhProduct } from "./ahClient";

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
});
