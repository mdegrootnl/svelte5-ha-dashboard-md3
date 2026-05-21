import { describe, expect, it, vi } from "vitest";

class MockAhApiError extends Error {
    constructor(
        message: string,
        public status = 500,
    ) {
        super(message);
    }
}

const exchangeAhCode = vi.fn();

vi.mock("$lib/server/ahClient", () => ({
    AhApiError: MockAhApiError,
    exchangeAhCode,
}));

const { GET } = await import("./+server");

describe("/api/ah/auth/callback", () => {
    it("preserves ingress base path when redirecting back to settings", async () => {
        exchangeAhCode.mockResolvedValueOnce({});

        await expect(
            GET({
                url: new URL("http://localhost/api/hassio_ingress/test/api/ah/auth/callback?code=abc"),
                fetch: vi.fn(),
            } as any),
        ).rejects.toMatchObject({
            status: 303,
            location: "/api/hassio_ingress/test/settings?ah=connected",
        });

        expect(exchangeAhCode).toHaveBeenCalledWith("abc", expect.any(Function));
    });
});
