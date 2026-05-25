import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import { describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import {
    ADDON_BROWSER_TOKEN,
    isPermittedAddonWebSocketOrigin,
    proxyAddonWebSocket,
} from "../../server/addonWebSocketProxy.js";

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

function requestWithHeaders(headers: IncomingMessage["headers"]) {
    return { headers } as IncomingMessage;
}

describe("add-on websocket proxy security", () => {
    it("allows missing origin and same-origin websocket upgrades", () => {
        expect(isPermittedAddonWebSocketOrigin(requestWithHeaders({
            host: "ha.local:8123",
        }))).toBe(true);

        expect(isPermittedAddonWebSocketOrigin(requestWithHeaders({
            host: "ha.local:8123",
            origin: "http://ha.local:8123",
        }))).toBe(true);
    });

    it("allows explicit websocket origins for proxied Home Assistant deployments", () => {
        expect(isPermittedAddonWebSocketOrigin(requestWithHeaders({
            host: "dashboard-addon:3000",
            origin: "https://ha.example.test",
        }), {
            DASHBOARD_WS_ALLOWED_ORIGINS: "https://ha.example.test",
        } as NodeJS.ProcessEnv)).toBe(true);
    });

    it("rejects cross-origin browser websocket upgrades", () => {
        expect(isPermittedAddonWebSocketOrigin(requestWithHeaders({
            host: "ha.local:8123",
            origin: "https://attacker.example",
        }))).toBe(false);
    });

    it("rewrites only a valid initial browser auth frame to the Supervisor token", () => {
        const client = new FakeSocket();
        const upstream = new FakeSocket();

        proxyAddonWebSocket(client as unknown as WebSocket, {
            supervisorToken: "supervisor-secret",
            createUpstream: () => upstream as unknown as WebSocket,
            logger: { error: vi.fn() },
        });

        client.emit("message", Buffer.from(JSON.stringify({
            type: "auth",
            access_token: ADDON_BROWSER_TOKEN,
        })), false);

        expect(upstream.sent).toHaveLength(0);

        upstream.emit("message", Buffer.from(JSON.stringify({
            type: "auth_required",
            ha_version: "2026.5.4",
        })), false);

        expect(upstream.sent).toHaveLength(1);
        expect(JSON.parse(String(upstream.sent[0].data))).toEqual({
            type: "auth",
            access_token: "supervisor-secret",
        });
        expect(String(upstream.sent[0].data)).not.toContain(ADDON_BROWSER_TOKEN);
        expect(client.closeCalls).toHaveLength(0);
    });

    it("closes the proxy when the first browser frame is not valid add-on auth", () => {
        const client = new FakeSocket();
        const upstream = new FakeSocket();

        proxyAddonWebSocket(client as unknown as WebSocket, {
            supervisorToken: "supervisor-secret",
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
            reason: "Invalid add-on websocket auth",
        });
        expect(upstream.closeCalls[0]).toEqual({
            code: 1008,
            reason: "Invalid add-on websocket auth",
        });
    });

    it("forwards normal websocket commands after the initial auth boundary", () => {
        const client = new FakeSocket();
        const upstream = new FakeSocket();

        proxyAddonWebSocket(client as unknown as WebSocket, {
            supervisorToken: "supervisor-secret",
            createUpstream: () => upstream as unknown as WebSocket,
            logger: { error: vi.fn() },
        });

        client.emit("message", Buffer.from(JSON.stringify({
            type: "auth",
            access_token: ADDON_BROWSER_TOKEN,
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

    it("does not echo reserved received close codes as outbound close frames", () => {
        const client = new FakeSocket();
        const upstream = new FakeSocket();

        proxyAddonWebSocket(client as unknown as WebSocket, {
            supervisorToken: "supervisor-secret",
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
