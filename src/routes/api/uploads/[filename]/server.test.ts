import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("/api/uploads/[filename]", () => {
    let tempDir = "";

    async function loadRoute() {
        vi.resetModules();
        vi.doMock("$lib/server/dataDir", () => ({
            getDataPath: (...segments: string[]) => path.join(tempDir, ...segments),
        }));
        return import("./+server");
    }

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dashboard-uploads-"));
        await fs.mkdir(path.join(tempDir, "uploads"), { recursive: true });
    });

    afterEach(async () => {
        vi.doUnmock("$lib/server/dataDir");
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("serves uploaded images with private cache and nosniff headers", async () => {
        const filename = "11111111-1111-4111-8111-111111111111.png";
        await fs.writeFile(path.join(tempDir, "uploads", filename), pngBytes);
        const route = await loadRoute();

        const response = await route.GET({ params: { filename } } as any);

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("image/png");
        expect(response.headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(response.headers.get("content-disposition")).toBe("inline");
    });
});
