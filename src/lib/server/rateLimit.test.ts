import { beforeEach, describe, expect, it } from "vitest";
import {
    checkRateLimit,
    resetRateLimitState,
    selectRateLimitRule,
    type RateLimitRule,
} from "./rateLimit";

describe("server rate limiting", () => {
    beforeEach(() => {
        resetRateLimitState();
    });

    it("selects specific API rules before the generic mutation rule", () => {
        expect(selectRateLimitRule("POST", "/api/upload")?.id).toBe("upload");
        expect(selectRateLimitRule("POST", "/api/ha-session")?.id).toBe("auth");
        expect(selectRateLimitRule("POST", "/api/settings")?.id).toBe("api-mutation");
        expect(selectRateLimitRule("GET", "/dashboard")).toBeNull();
    });

    it("limits requests per identifier and resets after the window", () => {
        const rules: RateLimitRule[] = [{
            id: "test",
            windowMs: 1000,
            max: 2,
            pathPattern: /^\/api\/test$/,
        }];

        expect(checkRateLimit({
            identifier: "client-a",
            method: "GET",
            pathname: "/api/test",
            now: 0,
            rules,
        }).allowed).toBe(true);
        expect(checkRateLimit({
            identifier: "client-a",
            method: "GET",
            pathname: "/api/test",
            now: 1,
            rules,
        }).allowed).toBe(true);

        const blocked = checkRateLimit({
            identifier: "client-a",
            method: "GET",
            pathname: "/api/test",
            now: 2,
            rules,
        });

        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterSeconds).toBe(1);

        expect(checkRateLimit({
            identifier: "client-b",
            method: "GET",
            pathname: "/api/test",
            now: 3,
            rules,
        }).allowed).toBe(true);
        expect(checkRateLimit({
            identifier: "client-a",
            method: "GET",
            pathname: "/api/test",
            now: 1001,
            rules,
        }).allowed).toBe(true);
    });
});
