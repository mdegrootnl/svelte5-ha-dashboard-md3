import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import { describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import {
    STANDALONE_BROWSER_TOKEN,
    proxyStandaloneWebSocket,
} from "../../server/standaloneWebSocketProxy.js";

class FakeSocket extends EventEmitter {
    readyState: number = WebSocket.OPEN;
    sent: Array<{ data: unknown; options?: { binary?: boolean } }> = [];
    closeCalls: Array<{ code?: number; reason?: string }> = [];

    send(data: unknown, options?: { binary?: boolean }) {
        this.sent.push({ data, options });
    }

    close(code?: number, reason?: string) {
        this.closeCalls.push({ code, reason });
        this.readyState = WebSocket.CLOSED;
        this.emit("close", code ?? 1000, Buffer.from(reason ?? ""));
    }
}

function requestWithCookie(cookie = "ha_dashboard_session=session-id") {
    return { headers: { cookie } } as IncomingMessage;
}

function session() {
    return {
        sessionId: "session-id",
        tokens: {
            hassUrl: "http://ha.local:8123",
            access_token: "ha-secret",
            refresh_token: "refresh-secret",
            expires: Date.now() + 3600_000,
            expires_in: 1800,
            clientId: "client",
        },
    };
}

describe("standalone websocket proxy security", () => {
    it("rewrites only a valid initial browser auth frame to the server-side HA token", async () => {
        const client = new FakeSocket();
        const upstream = new FakeSocket();
        const createUpstream = vi.fn(() => upstream as unknown as WebSocket);

        await proxyStandaloneWebSocket(client as unknown as WebSocket, requestWithCookie(), {
            resolveSession: vi.fn(async () => session()),
            createUpstream,
            logger: { error: vi.fn() },
        });

        expect(createUpstream).toHaveBeenCalledWith("ws://ha.local:8123/api/websocket");

        client.emit("message", Buffer.from(JSON.stringify({
            type: "auth",
            access_token: STANDALONE_BROWSER_TOKEN,
        })), false);

        expect(upstream.sent).toHaveLength(0);

        upstream.emit("message", Buffer.from(JSON.stringify({
            type: "auth_required",
            ha_version: "2026.5.4",
        })), false);

        expect(upstream.sent).toHaveLength(1);
        expect(JSON.parse(String(upstream.sent[0].data))).toEqual({
            type: "auth",
            access_token: "ha-secret",
        });
        expect(String(upstream.sent[0].data)).not.toContain(STANDALONE_BROWSER_TOKEN);
        expect(client.closeCalls).toHaveLength(0);
    });

    it("buffers the immediate browser auth frame while the server session loads", async () => {
        const client = new FakeSocket();
        const upstream = new FakeSocket();
        let resolveSession!: (value: ReturnType<typeof session>) => void;
        const sessionPromise = new Promise<ReturnType<typeof session>>((resolve) => {
            resolveSession = resolve;
        });

        const proxyPromise = proxyStandaloneWebSocket(client as unknown as WebSocket, requestWithCookie(), {
            resolveSession: vi.fn(() => sessionPromise),
            createUpstream: () => upstream as unknown as WebSocket,
            logger: { error: vi.fn() },
        });

        client.emit("message", Buffer.from(JSON.stringify({
            type: "auth",
            access_token: STANDALONE_BROWSER_TOKEN,
        })), false);
        resolveSession(session());
        await proxyPromise;

        upstream.emit("message", Buffer.from(JSON.stringify({
            type: "auth_required",
            ha_version: "2026.5.4",
        })), false);

        expect(upstream.sent).toHaveLength(1);
        expect(JSON.parse(String(upstream.sent[0].data))).toEqual({
            type: "auth",
            access_token: "ha-secret",
        });
    });

    it("closes the proxy when the first browser frame is not valid standalone auth", async () => {
        const client = new FakeSocket();
        const upstream = new FakeSocket();

        await proxyStandaloneWebSocket(client as unknown as WebSocket, requestWithCookie(), {
            resolveSession: vi.fn(async () => session()),
            createUpstream: () => upstream as unknown as WebSocket,
            logger: { error: vi.fn() },
        });

        client.emit("message", Buffer.from(JSON.stringify({
            type: "subscribe_events",
            id: 1,
        })), false);

        expect(upstream.sent).toHaveLength(0);
        expect(client.closeCalls[0]).toEqual({
            code: 1008,
            reason: "Invalid Home Assistant websocket auth",
        });
        expect(upstream.closeCalls[0]).toEqual({
            code: 1008,
            reason: "Invalid Home Assistant websocket auth",
        });
    });

    it("closes without opening upstream when the server session is unavailable", async () => {
        const client = new FakeSocket();
        const createUpstream = vi.fn();

        await proxyStandaloneWebSocket(client as unknown as WebSocket, requestWithCookie(""), {
            resolveSession: vi.fn(async () => null),
            createUpstream,
            logger: { error: vi.fn() },
        });

        expect(createUpstream).not.toHaveBeenCalled();
        expect(client.closeCalls[0]).toEqual({
            code: 1008,
            reason: "Home Assistant session unavailable",
        });
    });

    it("forwards normal websocket commands after the initial auth boundary", async () => {
        const client = new FakeSocket();
        const upstream = new FakeSocket();

        await proxyStandaloneWebSocket(client as unknown as WebSocket, requestWithCookie(), {
            resolveSession: vi.fn(async () => session()),
            createUpstream: () => upstream as unknown as WebSocket,
            logger: { error: vi.fn() },
        });

        client.emit("message", Buffer.from(JSON.stringify({
            type: "auth",
            access_token: STANDALONE_BROWSER_TOKEN,
        })), false);
        client.emit("message", Buffer.from(JSON.stringify({
            id: 1,
            type: "subscribe_events",
        })), false);

        expect(upstream.sent).toHaveLength(0);

        upstream.emit("message", Buffer.from(JSON.stringify({
            type: "auth_required",
            ha_version: "2026.5.4",
        })), false);
        upstream.emit("message", Buffer.from(JSON.stringify({
            type: "auth_ok",
            ha_version: "2026.5.4",
        })), false);

        expect(upstream.sent).toHaveLength(2);
        expect(JSON.parse(String(upstream.sent[1].data))).toEqual({
            id: 1,
            type: "subscribe_events",
        });
    });

    it("forwards normal websocket commands when the client sends them after upstream auth", async () => {
        const client = new FakeSocket();
        const upstream = new FakeSocket();

        await proxyStandaloneWebSocket(client as unknown as WebSocket, requestWithCookie(), {
            resolveSession: vi.fn(async () => session()),
            createUpstream: () => upstream as unknown as WebSocket,
            logger: { error: vi.fn() },
        });

        client.emit("message", Buffer.from(JSON.stringify({
            type: "auth",
            access_token: STANDALONE_BROWSER_TOKEN,
        })), false);
        upstream.emit("message", Buffer.from(JSON.stringify({
            type: "auth_required",
            ha_version: "2026.5.4",
        })), false);
        upstream.emit("message", Buffer.from(JSON.stringify({
            type: "auth_ok",
            ha_version: "2026.5.4",
        })), false);
        client.emit("message", Buffer.from(JSON.stringify({
            id: 1,
            type: "subscribe_events",
        })), false);

        expect(upstream.sent).toHaveLength(2);
        expect(JSON.parse(String(upstream.sent[1].data))).toEqual({
            id: 1,
            type: "subscribe_events",
        });
    });

    it("does not echo reserved received close codes as outbound close frames", async () => {
        const client = new FakeSocket();
        const upstream = new FakeSocket();

        await proxyStandaloneWebSocket(client as unknown as WebSocket, requestWithCookie(), {
            resolveSession: vi.fn(async () => session()),
            createUpstream: () => upstream as unknown as WebSocket,
            logger: { error: vi.fn() },
        });

        upstream.emit("close", 1005, Buffer.from(""));

        expect(client.closeCalls[0]).toEqual({
            code: undefined,
            reason: undefined,
        });
    });
});
