import type { RequestHandler } from './$types';
import type { RoomVisualAudience, RoomVisualKind } from '$lib/types/dashboard';

interface PreviewPalette {
    wall: string;
    floor: string;
    surface: string;
    accent: string;
    accentSoft: string;
    line: string;
    glow: string;
}

type PreviewKind = RoomVisualKind | 'home' | 'floor';

const ROOM_KINDS = new Set<PreviewKind>([
    'home',
    'floor',
    'bathroom',
    'bedroom',
    'child_boy_room',
    'child_girl_room',
    'child_room',
    'garage',
    'hallway',
    'kitchen',
    'laundry',
    'living_room',
    'office',
    'outdoor',
    'utility',
    'generic_room',
    'custom',
]);

const ROOM_AUDIENCES = new Set<RoomVisualAudience>(['adult', 'boy', 'girl', 'child', 'family', 'neutral']);

const PALETTES: Record<PreviewKind, PreviewPalette> = {
    home: {
        wall: '#d9dfd8',
        floor: '#b4bdae',
        surface: '#f2f0e6',
        accent: '#61754b',
        accentSoft: '#c1d19c',
        line: '#3d4a32',
        glow: '#ffe9b5',
    },
    floor: {
        wall: '#d9dedc',
        floor: '#b2bbb7',
        surface: '#f1efe7',
        accent: '#536f68',
        accentSoft: '#aec8c0',
        line: '#344842',
        glow: '#edf6ef',
    },
    bathroom: {
        wall: '#dbe8e9',
        floor: '#b8cdcf',
        surface: '#f4f7f5',
        accent: '#4c8b8d',
        accentSoft: '#9cc9c8',
        line: '#2f5558',
        glow: '#eef9f7',
    },
    bedroom: {
        wall: '#dedbd3',
        floor: '#b9afa2',
        surface: '#f3eee6',
        accent: '#715e74',
        accentSoft: '#c7b4c7',
        line: '#463d49',
        glow: '#fff1d7',
    },
    child_boy_room: {
        wall: '#d8e2df',
        floor: '#b1c5c0',
        surface: '#f5f2e7',
        accent: '#437d8d',
        accentSoft: '#a9d1d8',
        line: '#294e58',
        glow: '#ffefb5',
    },
    child_girl_room: {
        wall: '#e5dddf',
        floor: '#c9b7bd',
        surface: '#f7f1ec',
        accent: '#8c5f75',
        accentSoft: '#d6b7c7',
        line: '#58394a',
        glow: '#ffe7bc',
    },
    child_room: {
        wall: '#e0e2d8',
        floor: '#bdc4ac',
        surface: '#f6f1e5',
        accent: '#657d4b',
        accentSoft: '#c2d39c',
        line: '#40502f',
        glow: '#ffe9a9',
    },
    garage: {
        wall: '#d5d9d5',
        floor: '#a9b0aa',
        surface: '#eef0ec',
        accent: '#697c82',
        accentSoft: '#bdc8ca',
        line: '#3f4b50',
        glow: '#f3f0d7',
    },
    hallway: {
        wall: '#dddcd3',
        floor: '#b7b5a9',
        surface: '#f5f1e8',
        accent: '#7c7052',
        accentSoft: '#d4c99f',
        line: '#4e4735',
        glow: '#fff0bb',
    },
    kitchen: {
        wall: '#dedfd8',
        floor: '#b9bab1',
        surface: '#f7f3e9',
        accent: '#806f35',
        accentSoft: '#d8c47d',
        line: '#4e4525',
        glow: '#ffe39b',
    },
    laundry: {
        wall: '#d9e3e1',
        floor: '#afbfbc',
        surface: '#f4f5ef',
        accent: '#587d86',
        accentSoft: '#b3cdd0',
        line: '#344b51',
        glow: '#eff8ff',
    },
    living_room: {
        wall: '#dedbd2',
        floor: '#b8afa1',
        surface: '#f5efe5',
        accent: '#696b47',
        accentSoft: '#c6c18d',
        line: '#42432d',
        glow: '#ffe7a8',
    },
    office: {
        wall: '#d9dedc',
        floor: '#b1bbb8',
        surface: '#f2f0e7',
        accent: '#536f78',
        accentSoft: '#abc6cd',
        line: '#34474e',
        glow: '#eaf5ff',
    },
    outdoor: {
        wall: '#d8e1d3',
        floor: '#aebd9d',
        surface: '#f1eedf',
        accent: '#587948',
        accentSoft: '#b7cf8c',
        line: '#344b2c',
        glow: '#ffe5a2',
    },
    utility: {
        wall: '#d8dcd8',
        floor: '#adb4ad',
        surface: '#f1f2eb',
        accent: '#67726f',
        accentSoft: '#c2c9c4',
        line: '#414947',
        glow: '#f6edc6',
    },
    generic_room: {
        wall: '#dcddd6',
        floor: '#b6b8ae',
        surface: '#f5f1e8',
        accent: '#6b7462',
        accentSoft: '#c7ceb5',
        line: '#42483e',
        glow: '#fff0bd',
    },
    custom: {
        wall: '#dcddd6',
        floor: '#b6b8ae',
        surface: '#f5f1e8',
        accent: '#65776f',
        accentSoft: '#bfccc5',
        line: '#3f4a45',
        glow: '#fff0bd',
    },
};

function asRoomKind(rawKind?: string): PreviewKind {
    const kind = (rawKind ?? '').replace(/\.svg$/i, '') as PreviewKind;
    return ROOM_KINDS.has(kind) ? kind : 'generic_room';
}

function asAudience(rawAudience: string | null): RoomVisualAudience {
    const audience = (rawAudience ?? 'neutral') as RoomVisualAudience;
    return ROOM_AUDIENCES.has(audience) ? audience : 'neutral';
}

function withAudience(base: PreviewPalette, audience: RoomVisualAudience): PreviewPalette {
    if (audience === 'boy') return { ...base, accent: '#3f748b', accentSoft: '#a5cdd5' };
    if (audience === 'girl') return { ...base, accent: '#8b6076', accentSoft: '#d4b5c5' };
    if (audience === 'child') return { ...base, accent: '#707b45', accentSoft: '#ccd39d' };
    return base;
}

function wallAndFloor(palette: PreviewPalette) {
    return `
        <rect width="640" height="640" fill="${palette.wall}" />
        <path d="M0 420 C130 392 260 410 386 388 C500 368 575 378 640 356 L640 640 L0 640 Z" fill="${palette.floor}" />
        <path d="M0 426 C140 402 260 420 386 398 C500 378 575 388 640 366" fill="none" stroke="${palette.line}" stroke-opacity=".18" stroke-width="3" />
        <path d="M58 78 H582" stroke="${palette.surface}" stroke-opacity=".4" stroke-width="2" />
        <path d="M92 118 H548" stroke="${palette.surface}" stroke-opacity=".24" stroke-width="2" />
    `;
}

function roomShapes(kind: PreviewKind, palette: PreviewPalette) {
    switch (kind) {
        case 'home':
            return `
                <path d="M118 318 L320 166 L522 318 V492 H390 V370 H250 V492 H118 Z" fill="${palette.surface}" />
                <path d="M88 322 L320 142 L552 322" fill="none" stroke="${palette.accent}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />
                <rect x="150" y="350" width="72" height="82" rx="18" fill="${palette.accentSoft}" />
                <rect x="418" y="350" width="72" height="82" rx="18" fill="${palette.accentSoft}" />
                <path d="M250 492 V370 H390 V492" fill="${palette.wall}" stroke="${palette.line}" stroke-opacity=".28" stroke-width="8" />
                <path d="M146 530 H494" stroke="${palette.accentSoft}" stroke-width="20" stroke-linecap="round" />
            `;
        case 'floor':
            return `
                <rect x="116" y="172" width="408" height="320" rx="34" fill="${palette.surface}" />
                <path d="M166 242 H474 M166 320 H474 M166 398 H474" stroke="${palette.line}" stroke-opacity=".22" stroke-width="10" stroke-linecap="round" />
                <path d="M230 172 V492 M320 172 V492 M410 172 V492" stroke="${palette.line}" stroke-opacity=".16" stroke-width="8" />
                <rect x="182" y="218" width="92" height="66" rx="18" fill="${palette.accentSoft}" />
                <rect x="366" y="336" width="92" height="66" rx="18" fill="${palette.accentSoft}" />
                <path d="M128 522 H512" stroke="${palette.accent}" stroke-width="20" stroke-linecap="round" />
            `;
        case 'kitchen':
            return `
                <rect x="78" y="292" width="484" height="164" rx="24" fill="${palette.surface}" />
                <rect x="112" y="326" width="104" height="96" rx="16" fill="${palette.accentSoft}" />
                <rect x="238" y="326" width="104" height="96" rx="16" fill="${palette.wall}" />
                <rect x="364" y="326" width="104" height="96" rx="16" fill="${palette.accentSoft}" />
                <path d="M88 292 H552" stroke="${palette.line}" stroke-width="10" stroke-linecap="round" />
                <path d="M202 132 V230 M320 104 V230 M438 132 V230" stroke="${palette.line}" stroke-opacity=".55" stroke-width="8" stroke-linecap="round" />
                <path d="M174 230 H230 L214 272 H190 Z M292 230 H348 L334 272 H306 Z M410 230 H466 L450 272 H426 Z" fill="${palette.glow}" />
            `;
        case 'living_room':
            return `
                <rect x="94" y="318" width="452" height="118" rx="30" fill="${palette.accentSoft}" />
                <rect x="132" y="266" width="376" height="122" rx="34" fill="${palette.surface}" />
                <rect x="174" y="232" width="102" height="96" rx="26" fill="${palette.accentSoft}" />
                <rect x="364" y="232" width="102" height="96" rx="26" fill="${palette.accentSoft}" />
                <rect x="238" y="456" width="164" height="36" rx="18" fill="${palette.line}" fill-opacity=".46" />
                <path d="M510 172 V346" stroke="${palette.line}" stroke-width="12" stroke-linecap="round" />
                <path d="M472 168 H548 L526 222 H494 Z" fill="${palette.glow}" />
            `;
        case 'bedroom':
        case 'child_boy_room':
        case 'child_girl_room':
        case 'child_room':
            return `
                <rect x="118" y="282" width="404" height="178" rx="32" fill="${palette.surface}" />
                <rect x="148" y="244" width="166" height="94" rx="28" fill="${palette.accentSoft}" />
                <rect x="340" y="244" width="132" height="94" rx="28" fill="${palette.accentSoft}" />
                <path d="M118 384 H522" stroke="${palette.accent}" stroke-width="18" stroke-linecap="round" />
                <rect x="82" y="412" width="70" height="76" rx="18" fill="${palette.line}" fill-opacity=".36" />
                <rect x="494" y="412" width="64" height="76" rx="18" fill="${palette.line}" fill-opacity=".32" />
            `;
        case 'bathroom':
            return `
                <rect x="140" y="148" width="168" height="196" rx="34" fill="${palette.surface}" />
                <rect x="174" y="184" width="100" height="110" rx="30" fill="${palette.accentSoft}" />
                <rect x="356" y="256" width="150" height="150" rx="32" fill="${palette.surface}" />
                <path d="M376 232 H486" stroke="${palette.line}" stroke-opacity=".5" stroke-width="12" stroke-linecap="round" />
                <path d="M384 406 H478 L498 482 H364 Z" fill="${palette.accentSoft}" />
                <path d="M156 402 H310" stroke="${palette.accent}" stroke-width="16" stroke-linecap="round" />
            `;
        case 'office':
            return `
                <rect x="128" y="352" width="384" height="54" rx="18" fill="${palette.accent}" />
                <rect x="214" y="206" width="212" height="122" rx="22" fill="${palette.surface}" />
                <rect x="238" y="228" width="164" height="76" rx="14" fill="${palette.accentSoft}" />
                <path d="M320 328 V352" stroke="${palette.line}" stroke-width="12" stroke-linecap="round" />
                <path d="M176 406 L146 502 M464 406 L494 502" stroke="${palette.line}" stroke-opacity=".5" stroke-width="12" stroke-linecap="round" />
                <rect x="256" y="442" width="128" height="76" rx="26" fill="${palette.surface}" />
            `;
        case 'garage':
            return `
                <rect x="126" y="176" width="388" height="286" rx="28" fill="${palette.surface}" />
                <path d="M158 232 H482 M158 292 H482 M158 352 H482 M158 412 H482" stroke="${palette.line}" stroke-opacity=".28" stroke-width="8" />
                <path d="M188 176 V462 M320 176 V462 M452 176 V462" stroke="${palette.line}" stroke-opacity=".18" stroke-width="7" />
                <rect x="88" y="426" width="464" height="54" rx="22" fill="${palette.accentSoft}" />
            `;
        case 'hallway':
            return `
                <path d="M210 134 H430 L490 486 H150 Z" fill="${palette.surface}" />
                <path d="M260 180 H380 L408 430 H232 Z" fill="${palette.wall}" stroke="${palette.line}" stroke-opacity=".35" stroke-width="8" />
                <path d="M320 180 V430" stroke="${palette.line}" stroke-opacity=".2" stroke-width="6" />
                <path d="M190 498 H450" stroke="${palette.accent}" stroke-width="18" stroke-linecap="round" />
                <path d="M144 372 H496" stroke="${palette.accentSoft}" stroke-width="12" stroke-linecap="round" />
            `;
        case 'laundry':
            return `
                <rect x="150" y="224" width="154" height="238" rx="26" fill="${palette.surface}" />
                <rect x="336" y="224" width="154" height="238" rx="26" fill="${palette.surface}" />
                <circle cx="227" cy="354" r="54" fill="${palette.accentSoft}" />
                <circle cx="413" cy="354" r="54" fill="${palette.accentSoft}" />
                <path d="M186 270 H268 M372 270 H454" stroke="${palette.line}" stroke-opacity=".48" stroke-width="10" stroke-linecap="round" />
                <path d="M174 172 H466" stroke="${palette.accent}" stroke-width="18" stroke-linecap="round" />
            `;
        case 'utility':
            return `
                <rect x="132" y="164" width="162" height="286" rx="26" fill="${palette.surface}" />
                <rect x="346" y="164" width="162" height="286" rx="26" fill="${palette.surface}" />
                <path d="M168 226 H258 M168 284 H258 M168 342 H258 M382 226 H472 M382 284 H472 M382 342 H472" stroke="${palette.line}" stroke-opacity=".36" stroke-width="10" stroke-linecap="round" />
                <path d="M214 450 V512 M426 450 V512" stroke="${palette.accent}" stroke-width="14" stroke-linecap="round" />
            `;
        case 'outdoor':
            return `
                <path d="M96 438 C172 350 248 352 320 436 C388 346 468 350 544 438" fill="none" stroke="${palette.accent}" stroke-width="26" stroke-linecap="round" />
                <rect x="142" y="384" width="356" height="92" rx="28" fill="${palette.surface}" />
                <path d="M180 214 C220 144 278 150 306 236 C350 154 438 162 456 256" fill="none" stroke="${palette.accentSoft}" stroke-width="32" stroke-linecap="round" />
                <path d="M318 258 V432" stroke="${palette.line}" stroke-opacity=".5" stroke-width="14" stroke-linecap="round" />
            `;
        default:
            return `
                <rect x="150" y="190" width="340" height="248" rx="34" fill="${palette.surface}" />
                <path d="M238 438 V244 H402 V438" fill="${palette.wall}" stroke="${palette.line}" stroke-opacity=".35" stroke-width="10" />
                <path d="M292 342 H306" stroke="${palette.accent}" stroke-width="14" stroke-linecap="round" />
                <rect x="104" y="456" width="432" height="44" rx="22" fill="${palette.accentSoft}" />
            `;
    }
}

function renderPreviewSvg(kind: PreviewKind, audience: RoomVisualAudience) {
    const palette = withAudience(PALETTES[kind], audience);
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" role="img" aria-label="${kind.replace(/_/g, ' ')} preview">
    <defs>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="${palette.line}" flood-opacity=".18"/>
        </filter>
    </defs>
    ${wallAndFloor(palette)}
    <g filter="url(#soft-shadow)">
        ${roomShapes(kind, palette)}
    </g>
    <rect x="26" y="26" width="588" height="588" rx="44" fill="none" stroke="${palette.surface}" stroke-opacity=".22" stroke-width="3" />
</svg>`;
}

export const GET: RequestHandler = ({ params, url }) => {
    const kind = asRoomKind(params.kind);
    const audience = asAudience(url.searchParams.get('audience'));

    return new Response(renderPreviewSvg(kind, audience), {
        headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        },
    });
};
