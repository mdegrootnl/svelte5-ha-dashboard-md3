import type { DeploymentInfo } from "$lib/shared/deployment";

export type CspMode = "compat" | "hardened";

export interface SecurityHeaderOptions {
    connectSrc?: string;
    imageSrc?: string;
    mode?: string;
    reportOnly?: string;
}

const compatibilityConnectSources = ["'self'", "ws:", "wss:", "http:", "https:"];
const strictImageSources = ["'self'", "data:", "blob:", "https:"];

function uniqueSources(sources: string[]) {
    return Array.from(new Set(sources.filter(Boolean)));
}

function parseSourceList(value?: string) {
    if (!value) return [];

    return value
        .split(/[\s,]+/)
        .map((source) => source.trim())
        .filter(Boolean);
}

function isTruthy(value?: string) {
    return value === "1" || value?.toLowerCase() === "true" || value?.toLowerCase() === "yes";
}

function websocketOrigin(url: URL) {
    return `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`;
}

export function resolveCspMode(deployment: DeploymentInfo, value?: string): CspMode {
    const normalized = value?.trim().toLowerCase();
    if (normalized === "hardened" || normalized === "strict") return "hardened";
    if (normalized === "compat" || normalized === "compatibility") return "compat";

    return "hardened";
}

export function buildContentSecurityPolicy(
    deployment: DeploymentInfo,
    url: URL,
    options: SecurityHeaderOptions = {},
) {
    const mode = resolveCspMode(deployment, options.mode);
    const frameAncestors = deployment.mode === "ha-addon" ? "'self'" : "'none'";
    const connectSources =
        mode === "hardened"
            ? ["'self'", websocketOrigin(url), ...parseSourceList(options.connectSrc)]
            : [...compatibilityConnectSources, ...parseSourceList(options.connectSrc)];
    const imageSources =
        mode === "hardened"
            ? [...strictImageSources, ...parseSourceList(options.imageSrc)]
            : [...strictImageSources, "http:", ...parseSourceList(options.imageSrc)];

    return [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        `connect-src ${uniqueSources(connectSources).join(" ")}`,
        `img-src ${uniqueSources(imageSources).join(" ")}`,
        `frame-ancestors ${frameAncestors}`,
        "base-uri 'self'",
        "form-action 'self'",
    ].join("; ");
}

export function buildAhAuthProxyContentSecurityPolicy() {
    return [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
        "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
        "font-src 'self' data: https://*.hcaptcha.com",
        "connect-src 'self' https://*.ah.nl https://*.ah.be https://*.gall.nl https://*.etos.nl https://hcaptcha.com https://*.hcaptcha.com",
        "img-src 'self' data: blob: https:",
        "frame-src https://hcaptcha.com https://*.hcaptcha.com",
        "worker-src 'self' blob: https://hcaptcha.com https://*.hcaptcha.com",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join("; ");
}

export function contentSecurityPolicyHeaderName(options: SecurityHeaderOptions = {}) {
    return isTruthy(options.reportOnly)
        ? "Content-Security-Policy-Report-Only"
        : "Content-Security-Policy";
}
