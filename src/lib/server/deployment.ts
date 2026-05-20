import { env } from "$env/dynamic/private";
import {
    ADDON_BROWSER_TOKEN,
    DEFAULT_DEPLOYMENT_INFO,
    detectIngressPathFromPathname,
    normalizeIngressPath,
    type DeploymentInfo,
} from "$lib/shared/deployment";

function isTruthy(value: string | undefined) {
    return value === "1" || value?.toLowerCase() === "true" || value?.toLowerCase() === "yes";
}

export function isHaAddonDeployment() {
    return env.DASHBOARD_DEPLOYMENT === "ha-addon" || Boolean(env.SUPERVISOR_TOKEN?.trim());
}

export function getSupervisorToken() {
    return env.SUPERVISOR_TOKEN?.trim() || "";
}

export function isAddonBrowserAuthorization(value: string | null) {
    return value === `Bearer ${ADDON_BROWSER_TOKEN}`;
}

export function getIngressPathFromRequest(request: Request, url?: URL) {
    const headerPath =
        request.headers.get("x-dashboard-ingress-path") ||
        request.headers.get("x-ingress-path");

    return (
        normalizeIngressPath(headerPath) ||
        (url ? detectIngressPathFromPathname(url.pathname) : "")
    );
}

export function getDeploymentInfo(request?: Request, url?: URL): DeploymentInfo {
    if (!isHaAddonDeployment()) return DEFAULT_DEPLOYMENT_INFO;

    return {
        mode: "ha-addon",
        ingressPath: request ? getIngressPathFromRequest(request, url) : "",
        zeroConfigAvailable: Boolean(getSupervisorToken()),
        requireIngress: isTruthy(env.DASHBOARD_REQUIRE_INGRESS),
    };
}
