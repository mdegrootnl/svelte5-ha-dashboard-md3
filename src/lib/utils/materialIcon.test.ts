import { describe, expect, it } from 'vitest';
import { isMaterialIconName, normalizeIconName, resolveMaterialIconName } from './materialIcon';

describe('material icon utilities', () => {
    it('normalizes icon library prefixes and separators', () => {
        expect(normalizeIconName('mdi:door-closed')).toBe('door_closed');
        expect(normalizeIconName('material-symbols:door-front')).toBe('door_front');
        expect(normalizeIconName(' Motion Sensor ')).toBe('motion_sensor');
    });

    it('detects installed Material Symbols icon names', () => {
        expect(isMaterialIconName('door_front')).toBe(true);
        expect(isMaterialIconName('material-symbols:door-front')).toBe(true);
        expect(isMaterialIconName('door_closed')).toBe(false);
    });

    it('maps common Home Assistant MDI icons to available Material Symbols', () => {
        expect(resolveMaterialIconName('mdi:door-closed')).toBe('door_front');
        expect(resolveMaterialIconName('mdi:sofa')).toBe('weekend');
        expect(resolveMaterialIconName('mdi:room')).toBe('meeting_room');
        expect(resolveMaterialIconName('mdi:silverware-fork-knife')).toBe('restaurant');
        expect(resolveMaterialIconName('mdi:robot-vacuum')).toBe('cleaning_services');
        expect(resolveMaterialIconName('mdi:update')).toBe('system_update_alt');
        expect(resolveMaterialIconName('mdi:shopping')).toBe('shopping_cart');
        expect(resolveMaterialIconName('mdi:clipboard-list')).toBe('checklist');
    });

    it('falls back by semantic hints before using the default fallback', () => {
        expect(resolveMaterialIconName('mdi:custom-motion-detector')).toBe('motion_sensor_active');
        expect(resolveMaterialIconName('mdi:very-private-device', 'home')).toBe('home');
        expect(resolveMaterialIconName('', 'definitely_missing')).toBe('devices');
    });
});
