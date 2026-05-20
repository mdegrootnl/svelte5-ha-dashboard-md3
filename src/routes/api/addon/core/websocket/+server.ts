import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
    return new Response("WebSocket upgrade required", {
        status: 426,
        headers: {
            "Content-Type": "text/plain",
            "Upgrade": "websocket",
        },
    });
};
