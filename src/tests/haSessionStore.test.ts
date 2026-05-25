import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { IncomingMessage } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    getHomeAssistantWebSocketUrl,
    loadFreshHaSessionTokensFromRequest,
} from "../../server/haSessionStore.js";

function request(cookie: string) {
    return { headers: { cookie } } as IncomingMessage;
}

describe("Node HA session store", () => {
    let tempDir = "";
    const previousDataDir = process.env.DASHBOARD_DATA_DIR;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ha-session-store-"));
        process.env.DASHBOARD_DATA_DIR = tempDir;
    });

    afterEach(async () => {
        process.env.DASHBOARD_DATA_DIR = previousDataDir;
        await fs.rm(tempDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    async function writeSessions(expires: number) {
        await fs.writeFile(path.join(tempDir, "ha-sessions.json"), JSON.stringify({
            "session-id": {
                tokens: {
                    hassUrl: "http://ha.local:8123",
                    clientId: "client",
                    expires,
                    refresh_token: "refresh-secret",
                    access_token: "old-secret",
                    expires_in: 1800,
                },
                updatedAt: new Date().toISOString(),
                lastAccessedAt: new Date().toISOString(),
            },
        }));
    }

    it("loads fresh session tokens from the HttpOnly cookie session file", async () => {
        await writeSessions(Date.now() + 3600_000);

        const session = await loadFreshHaSessionTokensFromRequest(request("ha_dashboard_session=session-id"));

        expect(session?.tokens).toMatchObject({
            hassUrl: "http://ha.local:8123",
            access_token: "old-secret",
        });
    });

    it("refreshes expired Home Assistant access tokens before websocket proxying", async () => {
        await writeSessions(Date.now() - 1);
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
            access_token: "new-secret",
            expires_in: 3600,
        })));

        const session = await loadFreshHaSessionTokensFromRequest(
            request("ha_dashboard_session=session-id"),
            { fetchImpl },
        );

        expect(fetchImpl).toHaveBeenCalledWith(new URL("http://ha.local:8123/auth/token"), expect.objectContaining({
            method: "POST",
        }));
        expect(session?.tokens?.access_token).toBe("new-secret");

        const stored = JSON.parse(await fs.readFile(path.join(tempDir, "ha-sessions.json"), "utf-8"));
        expect(stored["session-id"].tokens.access_token).toBe("new-secret");
    });

    it("builds a websocket URL from the Home Assistant origin", () => {
        expect(String(getHomeAssistantWebSocketUrl("http://ha.local:8123"))).toBe("ws://ha.local:8123/api/websocket");
        expect(String(getHomeAssistantWebSocketUrl("https://ha.local"))).toBe("wss://ha.local/api/websocket");
    });
});
