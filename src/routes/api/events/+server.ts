import { configEvents, CONFIG_CHANGED_EVENT } from '$lib/server/events';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    let listener: (() => void) | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            // Helper to send data
            const send = (event: string, data: string) => {
                try {
                    const message = `event: ${event}\ndata: ${data}\n\n`;
                    controller.enqueue(encoder.encode(message));
                } catch (e) {
                    // Stream closed, ignore
                }
            };

            // Event handler
            listener = () => {
                console.log('[SSE] Sending update to client');
                send('update', 'config-changed');
            };

            // Subscribe
            configEvents.on(CONFIG_CHANGED_EVENT, listener);

            // Send initial ping to establish connection
            send('ping', 'connected');

            // Keep alive interval
            intervalId = setInterval(() => {
                send('ping', 'tick');
            }, 30000);
        },
        cancel() {
            // Cleanup when stream closes
            if (intervalId) {
                clearInterval(intervalId);
            }
            if (listener) {
                configEvents.off(CONFIG_CHANGED_EVENT, listener);
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
};
