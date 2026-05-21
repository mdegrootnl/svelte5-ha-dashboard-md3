import { z } from "zod";
import { JsonStorageService } from "$lib/server/storage";
import { DEFAULT_CONFIG, type AppConfig, type MusicLibraryConfig } from "$lib/types/config";
import type { MAMediaItem } from "$lib/types/musicAssistant";

export const MusicLibraryItemSchema = z.object({
    uri: z.string().min(1),
    name: z.string().min(1),
    media_type: z.string().min(1),
}).passthrough();

export const MusicLibraryImportSchema = z.object({
    favorites: z.array(MusicLibraryItemSchema).default([]),
    lastSyncedAt: z.number().optional(),
    defaultPlayerId: z.string().nullable().optional(),
}).strict();

export const MusicLibrarySettingsPatchSchema = z.object({
    defaultPlayerId: z.string().nullable().optional(),
    lastSyncedAt: z.number().optional(),
}).strict();

export type MusicLibraryItemInput = z.infer<typeof MusicLibraryItemSchema> | MAMediaItem;
export type MusicLibraryImportPayload = {
    favorites: MusicLibraryItemInput[];
    lastSyncedAt?: number;
    defaultPlayerId?: string | null;
};

type MusicLibraryUpdateResult = {
    musicLibrary: MusicLibraryConfig;
    changed: boolean;
};

function toMediaItem(item: MusicLibraryItemInput): MAMediaItem {
    const mediaItem = item as Partial<MAMediaItem>;
    return {
        ...item,
        uri: item.uri,
        name: item.name,
        media_type: item.media_type,
        item_id: mediaItem.item_id ?? item.uri,
        provider: mediaItem.provider ?? "library",
    } as MAMediaItem;
}

function dedupeFavorites(favorites: MusicLibraryItemInput[]): MAMediaItem[] {
    const byUri = new Map<string, MAMediaItem>();

    for (const favorite of favorites) {
        if (!favorite?.uri) continue;
        byUri.set(favorite.uri, toMediaItem(favorite));
    }

    return Array.from(byUri.values());
}

function normalizeMusicLibrary(config: MusicLibraryConfig | undefined): MusicLibraryConfig {
    return {
        favorites: dedupeFavorites(config?.favorites ?? DEFAULT_CONFIG.musicLibrary?.favorites ?? []),
        lastSyncedAt: config?.lastSyncedAt ?? DEFAULT_CONFIG.musicLibrary?.lastSyncedAt ?? 0,
        defaultPlayerId: config?.defaultPlayerId,
    };
}

function withMusicLibrary(config: AppConfig, musicLibrary: MusicLibraryConfig): AppConfig {
    return {
        ...config,
        musicLibrary,
    };
}

function sameJson(left: unknown, right: unknown) {
    return JSON.stringify(left) === JSON.stringify(right);
}

export class MusicLibraryService {
    static async load(): Promise<MusicLibraryConfig> {
        const config = await JsonStorageService.load();
        return normalizeMusicLibrary(config.musicLibrary);
    }

    static async addFavorite(item: MusicLibraryItemInput): Promise<MusicLibraryUpdateResult> {
        const favorite = toMediaItem(item);
        let changed = false;
        const updatedConfig = await JsonStorageService.update((config) => {
            const current = normalizeMusicLibrary(config.musicLibrary);
            const existingIndex = current.favorites.findIndex((item) => item.uri === favorite.uri);
            const nextFavorites = [...current.favorites];

            if (existingIndex >= 0) {
                changed = !sameJson(nextFavorites[existingIndex], favorite);
                nextFavorites[existingIndex] = favorite;
            } else {
                changed = true;
                nextFavorites.push(favorite);
            }

            return withMusicLibrary(config, {
                ...current,
                favorites: dedupeFavorites(nextFavorites),
            });
        });

        return {
            musicLibrary: normalizeMusicLibrary(updatedConfig.musicLibrary),
            changed,
        };
    }

    static async removeFavorite(uri: string): Promise<MusicLibraryUpdateResult> {
        let changed = false;
        const updatedConfig = await JsonStorageService.update((config) => {
            const current = normalizeMusicLibrary(config.musicLibrary);
            const favorites = current.favorites.filter((favorite) => favorite.uri !== uri);
            changed = favorites.length !== current.favorites.length;

            return withMusicLibrary(config, {
                ...current,
                favorites,
            });
        });

        return {
            musicLibrary: normalizeMusicLibrary(updatedConfig.musicLibrary),
            changed,
        };
    }

    static async patchSettings(patch: z.infer<typeof MusicLibrarySettingsPatchSchema>): Promise<MusicLibraryUpdateResult> {
        let changed = false;
        const updatedConfig = await JsonStorageService.update((config) => {
            const current = normalizeMusicLibrary(config.musicLibrary);
            const next: MusicLibraryConfig = { ...current };

            if (Object.prototype.hasOwnProperty.call(patch, "defaultPlayerId")) {
                next.defaultPlayerId = patch.defaultPlayerId ?? undefined;
            }

            if (Object.prototype.hasOwnProperty.call(patch, "lastSyncedAt")) {
                next.lastSyncedAt = patch.lastSyncedAt ?? current.lastSyncedAt;
            }

            changed = !sameJson(current, next);
            return withMusicLibrary(config, next);
        });

        return {
            musicLibrary: normalizeMusicLibrary(updatedConfig.musicLibrary),
            changed,
        };
    }

    static async importLocal(payload: MusicLibraryImportPayload): Promise<MusicLibraryUpdateResult> {
        let changed = false;
        const localFavorites = dedupeFavorites(payload.favorites);

        const updatedConfig = await JsonStorageService.update((config) => {
            const current = normalizeMusicLibrary(config.musicLibrary);
            if (current.favorites.length > 0 || localFavorites.length === 0) {
                return withMusicLibrary(config, current);
            }

            const next: MusicLibraryConfig = {
                favorites: localFavorites,
                lastSyncedAt: payload.lastSyncedAt ?? current.lastSyncedAt,
                defaultPlayerId: payload.defaultPlayerId ?? current.defaultPlayerId,
            };
            changed = true;
            return withMusicLibrary(config, next);
        });

        return {
            musicLibrary: normalizeMusicLibrary(updatedConfig.musicLibrary),
            changed,
        };
    }
}
