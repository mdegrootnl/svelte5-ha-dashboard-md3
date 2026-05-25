import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function readText(path: string) {
    return readFileSync(resolve(root, path), "utf8");
}

function readJson<T>(path: string): T {
    return JSON.parse(readText(path)) as T;
}

function readTopLevelYamlScalars(path: string) {
    const values = new Map<string, string>();

    for (const line of readText(path).split(/\r?\n/)) {
        if (!line.trim() || line.trimStart().startsWith("#") || line.startsWith(" ")) continue;

        const match = /^([A-Za-z0-9_/-]+):(?:\s*(.*))?$/.exec(line);
        if (!match) continue;

        const [, key, rawValue = ""] = match;
        values.set(key, rawValue.trim().replace(/^"|"$/g, ""));
    }

    return values;
}

describe("Home Assistant add-on packaging", () => {
    const packageJson = readJson<{ version: string; name: string; license: string }>("package.json");
    const manifest = readTopLevelYamlScalars("ha-dashboard/config.yaml");
    const changelog = readText("ha-dashboard/CHANGELOG.md");
    const repository = readTopLevelYamlScalars("repository.yaml");

    it("keeps the add-on manifest version aligned with the app package", () => {
        expect(manifest.get("version")).toBe(packageJson.version);
        expect(changelog).toContain(`## ${packageJson.version}`);
    });

    it("keeps the add-on installable through ingress with persistent data", () => {
        expect(manifest.get("slug")).toBe("ha_dashboard_md3");
        expect(manifest.get("image")).toBe("ghcr.io/mdegrootnl/svelte5-ha-dashboard-md3");
        expect(manifest.get("arch")).toBe("");
        expect(readText("ha-dashboard/config.yaml")).toContain("  - amd64");
        expect(readText("ha-dashboard/config.yaml")).toContain("  - aarch64");
        expect(manifest.get("homeassistant_api")).toBe("true");
        expect(manifest.get("ingress")).toBe("true");
        expect(manifest.get("ingress_port")).toBe("3000");
        expect(manifest.get("ingress_stream")).toBe("true");
        expect(readText("ha-dashboard/config.yaml")).toContain('DASHBOARD_DEPLOYMENT: "ha-addon"');
        expect(readText("ha-dashboard/config.yaml")).toContain('DASHBOARD_DATA_DIR: "/data"');
        expect(readText("ha-dashboard/config.yaml")).toContain('DASHBOARD_REQUIRE_INGRESS: "true"');
        expect(readText("ha-dashboard/config.yaml")).toContain("  - type: data");
    });

    it("keeps repository metadata pointed at the public add-on repository", () => {
        expect(manifest.get("url")).toBe("https://github.com/mdegrootnl/svelte5-ha-dashboard-md3");
        expect(repository.get("url")).toBe("https://github.com/mdegrootnl/svelte5-ha-dashboard-md3");
        expect(repository.get("name")).toBe("MD3 Home Assistant Dashboard");
    });
});
