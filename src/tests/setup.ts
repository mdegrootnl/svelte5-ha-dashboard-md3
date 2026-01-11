import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Fix for "mount(...) is not available on the server" in Vitest/Svelte 5
// Svelte 5 needs proper browser globals even in jsdom to avoid SSR mode detection
if (typeof window !== 'undefined') {
    (window as any).HTMLCanvasElement.prototype.getContext = vi.fn();

    // Mock Web Animations API for Svelte transitions
    Element.prototype.animate = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        finish: vi.fn(),
        onfinish: null
    });

    // Mock ResizeObserver for Svelte 5 bind:clientWidth/clientHeight
    (window as any).ResizeObserver = class ResizeObserver {
        observe() { }
        unobserve() { }
        disconnect() { }
    };
}

// Mock Home Assistant WebSocket if needed
vi.mock('home-assistant-js-websocket', () => ({
    createConnection: vi.fn(),
    subscribeEntities: vi.fn(),
    createLongLivedTokenAuth: vi.fn(),
    callService: vi.fn(),
    getAuth: vi.fn(),
    ERR_HASS_HOST_REQUIRED: 'ERR_HASS_HOST_REQUIRED'
}));

// Mock $app/environment
vi.mock('$app/environment', () => ({
    browser: true,
    dev: true,
    building: false,
    version: 'any'
}));

// Mock $app/stores
vi.mock('$app/stores', () => {
    const get = (s: any) => {
        let val: any;
        s.subscribe((v: any) => val = v)();
        return val;
    };
    const page = {
        subscribe: vi.fn((fn) => {
            fn({ url: { pathname: '/' }, params: {}, data: {} });
            return () => { };
        })
    };
    return {
        get,
        page,
        navigating: { subscribe: (fn: any) => { fn(null); return () => { }; } },
        updated: { subscribe: (fn: any) => { fn(false); return () => { }; } }
    };
});
