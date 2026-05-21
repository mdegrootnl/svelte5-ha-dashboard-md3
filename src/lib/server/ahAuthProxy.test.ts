import { describe, expect, it } from "vitest";
import {
    ahCallbackUrl,
    ahLoginUrl,
    ahProxyBase,
    copyAhProxyResponseHeaders,
    rewriteAhLocation,
    rewriteAhLoginBody,
    rewriteAhRequestHeader,
    sanitizeAhCookie,
} from "./ahAuthProxy";

describe("Albert Heijn auth proxy helpers", () => {
    const proxyUrl = new URL("http://localhost:5173/api/ah/auth/proxy/login");

    it("builds app-relative login, proxy, and callback URLs", () => {
        expect(ahLoginUrl(new URL("http://localhost:5173/api/ah/auth/start"))).toContain("/api/ah/auth/proxy/login?");
        expect(ahProxyBase(proxyUrl)).toBe("http://localhost:5173/api/ah/auth/proxy");
        expect(ahCallbackUrl(proxyUrl)).toBe("http://localhost:5173/api/ah/auth/callback");
    });

    it("preserves an ingress base path in AH auth URLs", () => {
        const ingressStart = new URL("http://localhost:5173/api/hassio_ingress/test/api/ah/auth/start");
        const ingressProxy = new URL("http://localhost:5173/api/hassio_ingress/test/api/ah/auth/proxy/login");

        expect(ahLoginUrl(ingressStart)).toContain("/api/hassio_ingress/test/api/ah/auth/proxy/login?");
        expect(ahProxyBase(ingressProxy)).toBe("http://localhost:5173/api/hassio_ingress/test/api/ah/auth/proxy");
        expect(ahCallbackUrl(ingressProxy)).toBe("http://localhost:5173/api/hassio_ingress/test/api/ah/auth/callback");
    });

    it("rewrites appie redirects and login host references", () => {
        expect(rewriteAhLocation("appie://login-exit?code=abc", proxyUrl)).toBe(
            "http://localhost:5173/api/ah/auth/callback?code=abc",
        );
        expect(rewriteAhLocation("/login/consent", proxyUrl)).toBe(
            "http://localhost:5173/api/ah/auth/proxy/login/consent",
        );
        expect(rewriteAhLoginBody("https://login.ah.nl/authorize appie://login-exit", proxyUrl)).toBe(
            "http://localhost:5173/api/ah/auth/proxy/authorize http://localhost:5173/api/ah/auth/callback",
        );
    });

    it("rebases AH root-relative assets and script requests through the proxy", () => {
        const body = [
            '<link href="/login/_next/static/app.css"/>',
            '<script src="/login/_next/static/app.js"></script>',
            '<form action="/submit"></form>',
            'fetch("/login/api/js-error")',
            'window.location.href="/login/passkeys"',
            "background:url('/login/static/logo.svg')",
        ].join("");

        expect(rewriteAhLoginBody(body, proxyUrl)).toBe(
            [
                '<link href="http://localhost:5173/api/ah/auth/proxy/login/_next/static/app.css"/>',
                '<script src="http://localhost:5173/api/ah/auth/proxy/login/_next/static/app.js"></script>',
                '<form action="http://localhost:5173/api/ah/auth/proxy/submit"></form>',
                'fetch("http://localhost:5173/api/ah/auth/proxy/login/api/js-error")',
                'window.location.href="http://localhost:5173/api/ah/auth/proxy/login/passkeys"',
                "background:url('http://localhost:5173/api/ah/auth/proxy/login/static/logo.svg')",
            ].join(""),
        );
    });

    it("converts proxied request headers back to the AH login host", () => {
        expect(rewriteAhRequestHeader("http://localhost:5173/api/ah/auth/proxy/login", proxyUrl)).toBe(
            "https://login.ah.nl/login",
        );
    });

    it("drops compression headers because server fetch returns decoded bodies", () => {
        const response = new Response("body", {
            headers: {
                "content-encoding": "gzip",
                "content-length": "120",
                "content-type": "text/css",
            },
        });
        const headers = copyAhProxyResponseHeaders(response, proxyUrl, false);

        expect(headers.has("content-encoding")).toBe(false);
        expect(headers.has("content-length")).toBe(false);
        expect(headers.get("content-type")).toBe("text/css");
    });

    it("removes cookie attributes that break local proxying", () => {
        expect(sanitizeAhCookie("session=abc; Domain=login.ah.nl; Secure; SameSite=None; Path=/")).toBe(
            "session=abc; Path=/",
        );
    });
});
