import { afterEach, describe, expect, it } from 'vitest';
import { getRoutePath, resetAppBaseForTests, setAppBasePath, withBase } from './appBase';

describe('app base helpers', () => {
    afterEach(() => resetAppBaseForTests());

    it('prefixes local absolute paths when an ingress base is configured', () => {
        setAppBasePath('/api/hassio_ingress/test');

        expect(withBase('/settings')).toBe('/api/hassio_ingress/test/settings');
        expect(withBase('/api/settings')).toBe('/api/hassio_ingress/test/api/settings');
        expect(withBase('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
        expect(withBase('#section')).toBe('#section');
    });

    it('strips the ingress base for route comparisons', () => {
        setAppBasePath('/api/hassio_ingress/test');

        expect(getRoutePath('/api/hassio_ingress/test/dashboard')).toBe('/dashboard');
        expect(getRoutePath('/dashboard')).toBe('/dashboard');
    });
});
