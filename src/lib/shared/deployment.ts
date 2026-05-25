export const ADDON_BROWSER_TOKEN = "__dashboard_addon_browser__";
export const STANDALONE_BROWSER_TOKEN = "__dashboard_ha_session__";

export type DeploymentMode = "standalone" | "ha-addon";

export interface DeploymentInfo {
    mode: DeploymentMode;
    ingressPath: string;
    zeroConfigAvailable: boolean;
    requireIngress: boolean;
}

export const DEFAULT_DEPLOYMENT_INFO: DeploymentInfo = {
    mode: "standalone",
    ingressPath: "",
    zeroConfigAvailable: false,
    requireIngress: false,
};

const INGRESS_PATH_PATTERN = /^\/api\/hassio_ingress\/[^/?#]+/;

export function normalizeIngressPath(value: string | null | undefined): string {
    if (!value) return "";

    let path = value.trim();
    if (!path) return "";

    try {
        if (/^https?:\/\//i.test(path)) {
            path = new URL(path).pathname;
        }
    } catch {
        return "";
    }

    if (!path.startsWith("/")) path = `/${path}`;
    path = path.replace(/\/+$/, "");
    return path === "/" ? "" : path;
}

export function detectIngressPathFromPathname(pathname: string): string {
    return normalizeIngressPath(pathname.match(INGRESS_PATH_PATTERN)?.[0] ?? "");
}

export function stripIngressPath(pathname: string, ingressPath: string): string {
    const normalized = normalizeIngressPath(ingressPath);
    if (!normalized) return pathname || "/";
    if (pathname === normalized) return "/";
    if (pathname.startsWith(`${normalized}/`)) {
        return pathname.slice(normalized.length) || "/";
    }
    return pathname || "/";
}

export function isLocalAppPath(value: string): boolean {
    return value.startsWith("/") && !value.startsWith("//");
}
