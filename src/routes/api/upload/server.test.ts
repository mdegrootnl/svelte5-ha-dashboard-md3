import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("/api/upload", () => {
    let tempDir = "";

    async function loadRoute() {
        vi.resetModules();
        vi.doMock("$lib/server/dataDir", () => ({
            getDataPath: (...segments: string[]) => path.join(tempDir, ...segments),
        }));
        return import("./+server");
    }

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dashboard-upload-"));
    });

    afterEach(async () => {
        vi.doUnmock("$lib/server/dataDir");
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("stores image uploads under opaque filenames without leaking the original filename", async () => {
        const route = await loadRoute();
        const request = new Request("http://localhost/api/upload", {
            method: "POST",
            headers: {
                "content-type": "image/png",
                "x-filename": encodeURIComponent("Family Holiday Kitchen.png"),
            },
            body: pngBytes,
        });

        const response = await route.POST({ request } as any);
        expect(response.status).toBe(200);
        const body = await response.json();

        expect(body.url).toMatch(/^\/api\/uploads\/[0-9a-f-]{36}\.png$/);
        expect(body.url).not.toContain("Family");
        expect(body.url).not.toContain("Kitchen");

        const filename = body.url.split("/").pop();
        await expect(fs.readFile(path.join(tempDir, "uploads", filename))).resolves.toEqual(Buffer.from(pngBytes));
    });

    it("rejects files whose bytes do not match the declared image type", async () => {
        const route = await loadRoute();
        const request = new Request("http://localhost/api/upload", {
            method: "POST",
            headers: { "content-type": "image/png" },
            body: new TextEncoder().encode("not actually an image"),
        });

        const response = await route.POST({ request } as any);
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "Uploaded file is not a valid image",
        });
    });
});
