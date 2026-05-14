import { describe, expect, it } from 'vitest';
import { createServiceCall, defaultServiceForDomain } from './cardActions';

describe('cardActions', () => {
    it('builds an explicit service call with fallback entity id', () => {
        const call = createServiceCall(
            {
                id: 'volume-up',
                domain: 'media_player',
                service: 'volume_up',
            },
            'media_player.living_room',
        );

        expect(call).toEqual({
            domain: 'media_player',
            service: 'volume_up',
            serviceData: { entity_id: 'media_player.living_room' },
        });
    });

    it('infers default services for button-like domains', () => {
        expect(defaultServiceForDomain('scene')).toBe('turn_on');
        expect(defaultServiceForDomain('script')).toBe('turn_on');
        expect(defaultServiceForDomain('button')).toBe('press');
        expect(defaultServiceForDomain('switch')).toBe('toggle');
    });

    it('uses the action entity id before fallback entity id', () => {
        const call = createServiceCall(
            {
                id: 'lamp',
                entityId: 'light.table',
            },
            'light.fallback',
        );

        expect(call?.serviceData.entity_id).toBe('light.table');
    });
});
