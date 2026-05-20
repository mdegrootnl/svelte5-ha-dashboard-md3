import { describe, expect, it } from 'vitest';
import { detectIngressPathFromPathname, normalizeIngressPath, stripIngressPath } from './deployment';

describe('deployment helpers', () => {
    it('normalizes ingress paths', () => {
        expect(normalizeIngressPath('/api/hassio_ingress/token/')).toBe('/api/hassio_ingress/token');
        expect(normalizeIngressPath('api/hassio_ingress/token')).toBe('/api/hassio_ingress/token');
        expect(normalizeIngressPath('https://ha.local/api/hassio_ingress/token/dashboard')).toBe('/api/hassio_ingress/token/dashboard');
    });

    it('detects and strips Home Assistant ingress prefixes', () => {
        const path = '/api/hassio_ingress/test/dashboard/kitchen';

        expect(detectIngressPathFromPathname(path)).toBe('/api/hassio_ingress/test');
        expect(stripIngressPath(path, '/api/hassio_ingress/test')).toBe('/dashboard/kitchen');
        expect(stripIngressPath('/api/hassio_ingress/test', '/api/hassio_ingress/test')).toBe('/');
    });
});
