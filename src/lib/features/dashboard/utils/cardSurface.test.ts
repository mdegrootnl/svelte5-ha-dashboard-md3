import { describe, expect, it } from "vitest";
import {
    getActiveCardSurfaceStyle,
    getCardSurfaceClasses,
    getCardSurfaceStyle,
    normalizeCardSurfaceStyle,
    normalizeGridCardSurfaceStyle,
    resolveCardSurfaceStyle,
} from "./cardSurface";

describe("cardSurface helpers", () => {
    it("normalizes invalid card surface styles to md3", () => {
        expect(normalizeCardSurfaceStyle("glass")).toBe("glass");
        expect(normalizeCardSurfaceStyle("soft")).toBe("soft");
        expect(normalizeCardSurfaceStyle("neon")).toBe("md3");
    });

    it("normalizes invalid grid overrides to theme", () => {
        expect(normalizeGridCardSurfaceStyle("theme")).toBe("theme");
        expect(normalizeGridCardSurfaceStyle("glass")).toBe("glass");
        expect(normalizeGridCardSurfaceStyle("neon")).toBe("theme");
    });

    it("resolves grid override over theme style", () => {
        expect(resolveCardSurfaceStyle("glass", "theme")).toBe("glass");
        expect(resolveCardSurfaceStyle("glass", "soft")).toBe("soft");
        expect(resolveCardSurfaceStyle(undefined, undefined)).toBe("md3");
    });

    it("returns token-safe classes and active styles", () => {
        expect(getCardSurfaceClasses("glass")).toContain(
            "dashboard-card-surface-glass",
        );
        expect(getActiveCardSurfaceStyle("soft", "var(--color-m3-primary)")).toContain(
            "var(--dashboard-card-surface-shadow)",
        );
    });

    it("adds readable foreground tokens for explicit custom backgrounds", () => {
        expect(getCardSurfaceStyle("md3", "#123456")).toContain(
            "background-color: #123456",
        );
        expect(getCardSurfaceStyle("md3", "#123456")).toContain(
            "--dashboard-card-readable-color: #ffffff",
        );
        expect(getCardSurfaceStyle("md3", "#f7e8c8")).toContain(
            "--dashboard-card-readable-color: #000000",
        );
    });
});
