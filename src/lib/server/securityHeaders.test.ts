import { describe, expect, it } from "vitest";
import {
    buildAhAuthProxyContentSecurityPolicy,
    buildContentSecurityPolicy,
    contentSecurityPolicyHeaderName,
    resolveCspMode,
} from "./securityHeaders";
import type { DeploymentInfo } from "$lib/shared/deployment";

const standalone: DeploymentInfo = {
    mode: "standalone",
    ingressPath: "",
    zeroConfigAvailable: false,
    requireIngress: false,
};

const addon: DeploymentInfo = {
    mode: "ha-addon",
    ingressPath: "/api/hassio_ingress/test",
    zeroConfigAvailable: true,
    requireIngress: true,
};

describe("security headers", () => {
    it("uses hardened standalone CSP by default without unsafe eval", () => {
        const policy = buildContentSecurityPolicy(
            standalone,
            new URL("https://dashboard.local/dashboard"),
        );

        expect(resolveCspMode(standalone)).toBe("hardened");
        expect(policy).toContain("script-src 'self' 'unsafe-inline'");
        expect(policy).not.toContain("'unsafe-eval'");
        expect(policy).toContain("connect-src 'self' wss://dashboard.local");
        expect(policy).toContain("img-src 'self' data: blob: https:");
        expect(policy).not.toContain("connect-src 'self' ws: wss: http: https:");
        expect(policy).not.toContain("img-src 'self' data: blob: https: http:");
        expect(policy).toContain("frame-ancestors 'none'");
    });

    it("keeps an explicit standalone compatibility mode for local-network migration", () => {
        const policy = buildContentSecurityPolicy(
            standalone,
            new URL("https://dashboard.local/dashboard"),
            { mode: "compat" },
        );

        expect(resolveCspMode(standalone, "compat")).toBe("compat");
        expect(policy).toContain("connect-src 'self' ws: wss: http: https:");
        expect(policy).toContain("img-src 'self' data: blob: https: http:");
    });

    it("uses a narrowed CSP for Home Assistant add-on deployments by default", () => {
        const policy = buildContentSecurityPolicy(
            addon,
            new URL("https://homeassistant.local/api/hassio_ingress/test/dashboard"),
        );

        expect(resolveCspMode(addon)).toBe("hardened");
        expect(policy).toContain("connect-src 'self' wss://homeassistant.local");
        expect(policy).not.toContain("connect-src 'self' ws: wss: http: https:");
        expect(policy).toContain("img-src 'self' data: blob: https:");
        expect(policy).not.toContain("img-src 'self' data: blob: https: http:");
        expect(policy).toContain("frame-ancestors 'self'");
    });

    it("allows standalone hardened CSP with explicit integration origins", () => {
        const policy = buildContentSecurityPolicy(
            standalone,
            new URL("http://dashboard.local"),
            {
                mode: "hardened",
                connectSrc: "https://ha.local wss://ha.local",
                imageSrc: "http://camera.local",
            },
        );

        expect(resolveCspMode(standalone, "hardened")).toBe("hardened");
        expect(policy).toContain(
            "connect-src 'self' ws://dashboard.local https://ha.local wss://ha.local",
        );
        expect(policy).toContain("img-src 'self' data: blob: https: http://camera.local");
        expect(policy).not.toContain("connect-src 'self' ws: wss: http: https:");
    });

    it("can emit report-only CSP headers for production trials", () => {
        expect(contentSecurityPolicyHeaderName()).toBe("Content-Security-Policy");
        expect(contentSecurityPolicyHeaderName({ reportOnly: "true" })).toBe(
            "Content-Security-Policy-Report-Only",
        );
    });

    it("allows hCaptcha only on the Albert Heijn auth proxy CSP", () => {
        const policy = buildAhAuthProxyContentSecurityPolicy();

        expect(policy).toContain("script-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com");
        expect(policy).toContain("connect-src 'self' https://*.ah.nl");
        expect(policy).toContain("style-src 'self' 'unsafe-inline' https://*.ah.nl");
        expect(policy).toContain("font-src 'self' data: https://*.ah.nl");
        expect(policy).toContain("https://*.hcaptcha.com");
        expect(policy).toContain("frame-src https://hcaptcha.com https://*.hcaptcha.com");
        expect(policy).toContain("worker-src 'self' blob: https://hcaptcha.com https://*.hcaptcha.com");
        expect(policy).toContain("frame-ancestors 'none'");
    });
});
