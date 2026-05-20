import type { RoomVisualAudience, RoomVisualKind } from '$lib/types/dashboard';
import { resolveMaterialIconName } from '$lib/utils/materialIcon';

export interface RoomVisualProfile {
    kind: RoomVisualKind;
    audience: RoomVisualAudience;
    icon: string;
    promptSeed: string;
    matchedTerms: string[];
}

interface RoomVisualRule {
    kind: RoomVisualKind;
    audience: RoomVisualAudience;
    icon: string;
    terms: string[];
    promptSeed: string;
}

const GENERIC_ROOM_ICONS = new Set(['', 'area', 'devices', 'door_front', 'meeting_room', 'room']);

const ROOM_VISUAL_RULES: RoomVisualRule[] = [
    {
        kind: 'child_boy_room',
        audience: 'boy',
        icon: 'toys',
        terms: ['jongenskamer', 'jongen', 'boy room', 'boys room', 'boy', 'boys'],
        promptSeed: 'stylish modern boys bedroom, calm smart home dashboard preview, warm practical lighting',
    },
    {
        kind: 'child_girl_room',
        audience: 'girl',
        icon: 'toys',
        terms: ['meisjeskamer', 'meisje', 'girl room', 'girls room', 'girl', 'girls'],
        promptSeed: 'stylish modern girls bedroom, calm smart home dashboard preview, warm practical lighting',
    },
    {
        kind: 'child_room',
        audience: 'child',
        icon: 'toys',
        terms: ['kinderkamer', 'kids room', 'kid room', 'children room', 'child room', 'nursery', 'playroom', 'speelkamer'],
        promptSeed: 'stylish modern child bedroom, calm smart home dashboard preview, soft practical lighting',
    },
    {
        kind: 'bathroom',
        audience: 'neutral',
        icon: 'shower',
        terms: ['badkamer', 'bath', 'bathroom', 'douche', 'shower'],
        promptSeed: 'stylish modern bathroom, clean surfaces, calm smart home dashboard preview',
    },
    {
        kind: 'kitchen',
        audience: 'family',
        icon: 'kitchen',
        terms: ['keuken', 'kitchen'],
        promptSeed: 'stylish modern kitchen, warm functional lighting, calm smart home dashboard preview',
    },
    {
        kind: 'living_room',
        audience: 'family',
        icon: 'chair',
        terms: ['woonkamer', 'living', 'lounge', 'salon'],
        promptSeed: 'stylish modern living room, comfortable seating, calm smart home dashboard preview',
    },
    {
        kind: 'bedroom',
        audience: 'adult',
        icon: 'bed',
        terms: ['slaapkamer', 'bedroom'],
        promptSeed: 'stylish modern bedroom, calm evening lighting, smart home dashboard preview',
    },
    {
        kind: 'garage',
        audience: 'neutral',
        icon: 'garage_home',
        terms: ['garage'],
        promptSeed: 'stylish organized garage, practical lighting, calm smart home dashboard preview',
    },
    {
        kind: 'utility',
        audience: 'neutral',
        icon: 'electrical_services',
        terms: ['meterkast', 'utility', 'technical', 'meter', 'electrical'],
        promptSeed: 'stylish utility room, organized technical equipment, calm smart home dashboard preview',
    },
    {
        kind: 'hallway',
        audience: 'neutral',
        icon: 'door_open',
        terms: ['gang', 'hal', 'hall', 'hallway', 'overloop', 'corridor'],
        promptSeed: 'stylish hallway, soft guidance lighting, calm smart home dashboard preview',
    },
    {
        kind: 'office',
        audience: 'adult',
        icon: 'desk',
        terms: ['werkkamer', 'werk', 'office', 'study', 'bureau'],
        promptSeed: 'stylish modern home office, focused workspace, calm smart home dashboard preview',
    },
    {
        kind: 'laundry',
        audience: 'neutral',
        icon: 'local_laundry_service',
        terms: ['washok', 'laundry', 'bijkeuken'],
        promptSeed: 'stylish laundry room, organized appliances, calm smart home dashboard preview',
    },
    {
        kind: 'outdoor',
        audience: 'neutral',
        icon: 'yard',
        terms: ['tuin', 'garden', 'outdoor', 'patio'],
        promptSeed: 'stylish garden patio, soft outdoor lighting, calm smart home dashboard preview',
    },
];

export function normalizeMaterialIcon(icon?: string | null) {
    if (!icon?.trim()) return '';
    return resolveMaterialIconName(icon, '');
}

function normalizeRoomText(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findVisualRule(area: { name: string; icon?: string | null }) {
    const configuredIcon = normalizeMaterialIcon(area.icon);
    const haystack = normalizeRoomText(`${area.name} ${configuredIcon}`);
    const rule = ROOM_VISUAL_RULES.find((candidate) =>
        candidate.terms.some((term) => haystack.includes(normalizeRoomText(term))),
    );

    if (rule) {
        return {
            rule,
            matchedTerms: rule.terms.filter((term) => haystack.includes(normalizeRoomText(term))),
        };
    }

    if (normalizeRoomText(area.name).startsWith('kamer ')) {
        const bedroom = ROOM_VISUAL_RULES.find((candidate) => candidate.kind === 'bedroom');
        if (bedroom) {
            return {
                rule: bedroom,
                matchedTerms: ['kamer'],
            };
        }
    }

    return null;
}

export function resolveRoomVisualProfile(area: { name: string; icon?: string | null }): RoomVisualProfile {
    const configuredIcon = normalizeMaterialIcon(area.icon);
    const visualRule = findVisualRule(area);

    if (visualRule) {
        return {
            kind: visualRule.rule.kind,
            audience: visualRule.rule.audience,
            icon: configuredIcon && !GENERIC_ROOM_ICONS.has(configuredIcon) ? configuredIcon : visualRule.rule.icon,
            promptSeed: visualRule.rule.promptSeed,
            matchedTerms: visualRule.matchedTerms,
        };
    }

    if (configuredIcon && !GENERIC_ROOM_ICONS.has(configuredIcon)) {
        return {
            kind: 'custom',
            audience: 'neutral',
            icon: configuredIcon,
            promptSeed: `stylish ${area.name} room, calm smart home dashboard preview`,
            matchedTerms: [configuredIcon],
        };
    }

    return {
        kind: 'generic_room',
        audience: 'neutral',
        icon: 'meeting_room',
        promptSeed: `stylish ${area.name} room, calm smart home dashboard preview`,
        matchedTerms: [],
    };
}

export function getGeneratedRoomPreviewUrl(profile: Pick<RoomVisualProfile, 'kind' | 'audience'>) {
    return `/api/room-previews/${profile.kind}?audience=${profile.audience}`;
}
