import { describe, it, expect } from 'vitest';
import { supportsBrightness, getDomain, getEntityName, isEntityActive } from './entity';

describe('entity utils', () => {
    describe('supportsBrightness', () => {
        it('returns true when supported_color_modes includes brightness-related modes', () => {
            expect(supportsBrightness({ supported_color_modes: ['brightness'] })).toBe(true);
            expect(supportsBrightness({ supported_color_modes: ['hs'] })).toBe(true);
            expect(supportsBrightness({ supported_color_modes: ['rgbw'] })).toBe(true);
        });

        it('returns false when supported_color_modes does not include brightness-related modes', () => {
            expect(supportsBrightness({ supported_color_modes: ['onoff'] })).toBe(false);
            expect(supportsBrightness({ supported_color_modes: [] })).toBe(false);
        });

        it('falls back to supported_features bit 1 when supported_color_modes is missing', () => {
            expect(supportsBrightness({ supported_features: 1 })).toBe(true);
            expect(supportsBrightness({ supported_features: 3 })).toBe(true);
            expect(supportsBrightness({ supported_features: 2 })).toBe(false);
            expect(supportsBrightness({ supported_features: 0 })).toBe(false);
            expect(supportsBrightness({})).toBe(false);
        });
    });

    describe('getDomain', () => {
        it('extracts domain from entity ID', () => {
            expect(getDomain('light.living_room')).toBe('light');
            expect(getDomain('switch.kitchen')).toBe('switch');
            expect(getDomain('media_player.tv')).toBe('media_player');
        });

        it('handles entity IDs without dots', () => {
            expect(getDomain('unknown')).toBe('unknown');
        });
    });

    describe('getEntityName', () => {
        it('returns friendly_name if present', () => {
            expect(getEntityName('light.test', { friendly_name: 'Test Light' })).toBe('Test Light');
        });

        it('falls back to entityId if friendly_name is missing', () => {
            expect(getEntityName('light.test', {})).toBe('light.test');
        });

        it('returns "Unknown" as absolute fallback', () => {
            // @ts-ignore
            expect(getEntityName(null, {})).toBe('Unknown');
        });
    });

    describe('isEntityActive', () => {
        it('returns true for "on" state', () => {
            expect(isEntityActive('on')).toBe(true);
        });

        it('returns false for "off", "unavailable", and "unknown"', () => {
            expect(isEntityActive('off')).toBe(false);
            expect(isEntityActive('unavailable')).toBe(false);
            expect(isEntityActive('unknown')).toBe(false);
        });

        it('returns true for other states (e.g. playing, home)', () => {
            expect(isEntityActive('playing')).toBe(true);
            expect(isEntityActive('home')).toBe(true);
            expect(isEntityActive('locked')).toBe(true);
        });
    });
});
