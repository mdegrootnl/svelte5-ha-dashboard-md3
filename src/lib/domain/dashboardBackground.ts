import type {
    DashboardBackgroundConfig,
    DashboardImageAttribution,
    GridConfig,
    HAArea,
} from '$lib/types/dashboard';
import { getGeneratedRoomPreviewUrl, resolveRoomVisualProfile } from './roomVisualProfile';

const GENERATED_HOME_URL = '/api/room-previews/home?audience=neutral';
const GENERATED_FLOOR_URL = '/api/room-previews/floor?audience=neutral';
const DEFAULT_BACKGROUND_SCRIM = 0.38;

function normalizeText(value?: string | null) {
    return (value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function idContainsAreaId(id: string | undefined, areaId: string) {
    if (!id) return false;
    const haystack = `_${id.replace(/_root$/, '')}_`;
    return haystack.includes(`_${areaId}_`) || haystack.endsWith(`_${areaId}_`);
}

export function findAreaForGridBackground(config: GridConfig | null | undefined, areas: HAArea[]) {
    if (!config) return undefined;

    const generatedSourceId =
        config.generatedBy?.sourceType === 'area' ? config.generatedBy.sourceId : undefined;
    if (generatedSourceId) {
        const exactSourceMatch = areas.find((area) => area.area_id === generatedSourceId);
        if (exactSourceMatch) return exactSourceMatch;
    }

    const exactName = normalizeText(config.name);
    const nameMatch = areas.find((area) => normalizeText(area.name) === exactName);
    if (nameMatch) return nameMatch;

    return areas.find((area) => idContainsAreaId(config.id, area.area_id));
}

function createAttribution(provider: DashboardImageAttribution['provider'], sourceName: string): DashboardImageAttribution {
    return {
        provider,
        sourceName,
    };
}

function isHouseGrid(config: GridConfig) {
    return (
        config.generatedBy?.sourceType === 'house' ||
        config.id === 'dashboard_home' ||
        normalizeText(config.name) === 'home' ||
        normalizeText(config.name) === 'home overview'
    );
}

function isFloorGrid(config: GridConfig) {
    return config.generatedBy?.sourceType === 'floor' || config.id.startsWith('dashboard_floor_');
}

export function createGeneratedPreviewBackgroundForGrid(
    config: GridConfig,
    areas: HAArea[],
): DashboardBackgroundConfig {
    const area = findAreaForGridBackground(config, areas);
    if (area) {
        const visual = resolveRoomVisualProfile(area);
        return {
            enabled: true,
            source: 'generated_preview',
            imageUrl: getGeneratedRoomPreviewUrl(visual),
            imageAttribution: createAttribution('generated_preview', `Generated ${area.name} preview`),
            accentColor: 'var(--color-m3-primary)',
            objectPosition: 'center',
            scrimOpacity: DEFAULT_BACKGROUND_SCRIM,
        };
    }

    if (isFloorGrid(config)) {
        return {
            enabled: true,
            source: 'generated_preview',
            imageUrl: GENERATED_FLOOR_URL,
            imageAttribution: createAttribution('generated_preview', 'Generated floor preview'),
            accentColor: 'var(--color-m3-secondary)',
            objectPosition: 'center',
            scrimOpacity: DEFAULT_BACKGROUND_SCRIM,
        };
    }

    if (isHouseGrid(config)) {
        return {
            enabled: true,
            source: 'generated_preview',
            imageUrl: GENERATED_HOME_URL,
            imageAttribution: createAttribution('generated_preview', 'Generated home preview'),
            accentColor: 'var(--color-m3-primary)',
            objectPosition: 'center',
            scrimOpacity: DEFAULT_BACKGROUND_SCRIM,
        };
    }

    const visual = resolveRoomVisualProfile({
        name: config.name || 'dashboard',
        icon: config.icon,
    });
    return {
        enabled: true,
        source: 'generated_preview',
        imageUrl: getGeneratedRoomPreviewUrl(visual),
        imageAttribution: createAttribution('generated_preview', `Generated ${config.name || 'dashboard'} preview`),
        accentColor: 'var(--color-m3-primary)',
        objectPosition: 'center',
        scrimOpacity: DEFAULT_BACKGROUND_SCRIM,
    };
}

export function createHaAreaPictureBackgroundForGrid(
    config: GridConfig,
    areas: HAArea[],
): DashboardBackgroundConfig | undefined {
    const area = findAreaForGridBackground(config, areas);
    const picture = area?.picture?.trim();
    if (!area || !picture) return undefined;

    return {
        enabled: true,
        source: 'ha_area_picture',
        imageUrl: picture,
        imageAttribution: createAttribution('ha_area_picture', 'Home Assistant area picture'),
        accentColor: 'var(--color-m3-primary)',
        objectPosition: 'center',
        scrimOpacity: DEFAULT_BACKGROUND_SCRIM,
    };
}
