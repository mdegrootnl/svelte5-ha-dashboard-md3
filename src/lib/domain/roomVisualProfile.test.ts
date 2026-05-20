import { describe, expect, it } from 'vitest';
import { getGeneratedRoomPreviewUrl, normalizeMaterialIcon, resolveRoomVisualProfile } from './roomVisualProfile';

describe('roomVisualProfile', () => {
    it('normalizes Home Assistant material icons', () => {
        expect(normalizeMaterialIcon('mdi:door-open')).toBe('door_open');
        expect(normalizeMaterialIcon('mdi:door-closed')).toBe('door_front');
        expect(normalizeMaterialIcon('mdi:sofa')).toBe('weekend');
        expect(normalizeMaterialIcon('mdi:room')).toBe('meeting_room');
        expect(normalizeMaterialIcon('kitchen')).toBe('kitchen');
        expect(normalizeMaterialIcon(null)).toBe('');
    });

    it('infers common room visual profiles from room names', () => {
        expect(resolveRoomVisualProfile({ name: 'Keuken' })).toMatchObject({
            kind: 'kitchen',
            icon: 'kitchen',
            audience: 'family',
        });
        expect(resolveRoomVisualProfile({ name: 'Badkamer' })).toMatchObject({
            kind: 'bathroom',
            icon: 'shower',
        });
        expect(resolveRoomVisualProfile({ name: 'Werkkamer' })).toMatchObject({
            kind: 'office',
            icon: 'desk',
        });
        expect(resolveRoomVisualProfile({ name: 'Meterkast' })).toMatchObject({
            kind: 'utility',
            icon: 'electrical_services',
        });
    });

    it('keeps named room bedrooms calm without guessing gender from names', () => {
        const profile = resolveRoomVisualProfile({ name: 'Kamer Ben' });

        expect(profile.kind).toBe('bedroom');
        expect(profile.audience).toBe('adult');
        expect(profile.icon).toBe('bed');
        expect(profile.promptSeed).toContain('bedroom');
    });

    it('uses explicit boy and girl room terms when available', () => {
        const boyProfile = resolveRoomVisualProfile({ name: 'Jongenskamer' });
        const girlProfile = resolveRoomVisualProfile({ name: 'Girls Room' });

        expect(boyProfile).toMatchObject({
            kind: 'child_boy_room',
            audience: 'boy',
            icon: 'toys',
        });
        expect(boyProfile.promptSeed).toContain('boys bedroom');
        expect(girlProfile).toMatchObject({
            kind: 'child_girl_room',
            audience: 'girl',
            icon: 'toys',
        });
        expect(girlProfile.promptSeed).toContain('girls bedroom');
    });

    it('honors non-generic configured icons while preserving inferred room kind', () => {
        const profile = resolveRoomVisualProfile({ name: 'Woonkamer', icon: 'mdi:sofa' });

        expect(profile.kind).toBe('living_room');
        expect(profile.icon).toBe('weekend');
        expect(profile.promptSeed).toContain('living room');
    });

    it('falls back to a generic profile for unknown rooms', () => {
        const profile = resolveRoomVisualProfile({ name: 'Zone 12', icon: 'mdi:room' });

        expect(profile).toMatchObject({
            kind: 'generic_room',
            audience: 'neutral',
            icon: 'meeting_room',
            matchedTerms: [],
        });
    });

    it('builds deterministic local generated preview URLs', () => {
        const profile = resolveRoomVisualProfile({ name: 'Woonkamer' });

        expect(getGeneratedRoomPreviewUrl(profile)).toBe('/api/room-previews/living_room?audience=family');
    });
});
