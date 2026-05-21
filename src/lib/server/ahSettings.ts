import fs from "fs/promises";
import path from "path";
import { getResolvedDataDir } from "$lib/server/dataDir";
import type { AhSettingsStatus } from "$lib/types/ah";

export interface RuntimeAhSettings {
    accessToken?: string;
    refreshToken?: string;
    memberId?: string;
    expiresAt?: string;
}

const CONFIG_FILE = "ah-settings.json";

let saveLock: Promise<void> = Promise.resolve();

function getConfigPath() {
    return path.join(getResolvedDataDir(), CONFIG_FILE);
}

async function ensureDir() {
    await fs.mkdir(getResolvedDataDir(), { recursive: true });
}

export function sanitizeAhToken(value: unknown) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 8192) return undefined;
    return trimmed;
}

export function normalizeAhExpiry(value: unknown) {
    if (typeof value !== "string") return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
}

function expiryFromSeconds(expiresIn: unknown) {
    const seconds = typeof expiresIn === "number" && Number.isFinite(expiresIn) ? expiresIn : 0;
    return seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : undefined;
}

export class AhSettingsService {
    static async loadRuntime(): Promise<RuntimeAhSettings> {
        try {
            await ensureDir();
            const content = await fs.readFile(getConfigPath(), "utf-8");
            if (!content.trim()) return {};
            const data = JSON.parse(content) as RuntimeAhSettings;
            return {
                accessToken: sanitizeAhToken(data.accessToken),
                refreshToken: sanitizeAhToken(data.refreshToken),
                memberId: sanitizeAhToken(data.memberId),
                expiresAt: normalizeAhExpiry(data.expiresAt),
            };
        } catch {
            return {};
        }
    }

    static async saveRuntime(partial: RuntimeAhSettings) {
        saveLock = saveLock.catch(() => undefined).then(async () => {
            await ensureDir();
            const current = await this.loadRuntime();
            const next: RuntimeAhSettings = { ...current };

            if ("accessToken" in partial) {
                const value = sanitizeAhToken(partial.accessToken);
                if (value) next.accessToken = value;
                else delete next.accessToken;
            }

            if ("refreshToken" in partial) {
                const value = sanitizeAhToken(partial.refreshToken);
                if (value) next.refreshToken = value;
                else delete next.refreshToken;
            }

            if ("memberId" in partial) {
                const value = sanitizeAhToken(partial.memberId);
                if (value) next.memberId = value;
                else delete next.memberId;
            }

            if ("expiresAt" in partial) {
                const value = normalizeAhExpiry(partial.expiresAt);
                if (value) next.expiresAt = value;
                else delete next.expiresAt;
            }

            await fs.writeFile(getConfigPath(), JSON.stringify(next, null, 2), {
                encoding: "utf-8",
                mode: 0o600,
            });
        });

        return saveLock;
    }

    static async saveTokenResponse(data: {
        access_token?: unknown;
        refresh_token?: unknown;
        member_id?: unknown;
        expires_in?: unknown;
    }) {
        const next: RuntimeAhSettings = {};
        if ("access_token" in data) next.accessToken = sanitizeAhToken(data.access_token);
        if ("refresh_token" in data) next.refreshToken = sanitizeAhToken(data.refresh_token);
        if ("member_id" in data) next.memberId = sanitizeAhToken(data.member_id);
        if ("expires_in" in data) next.expiresAt = expiryFromSeconds(data.expires_in);
        await this.saveRuntime(next);
    }

    static async clearRuntime() {
        await this.saveRuntime({
            accessToken: undefined,
            refreshToken: undefined,
            memberId: undefined,
            expiresAt: undefined,
        });
    }

    static async getStatus(): Promise<AhSettingsStatus> {
        const runtime = await this.loadRuntime();
        const configured = Boolean(runtime.accessToken || runtime.refreshToken);
        const expiresAtTime = runtime.expiresAt ? new Date(runtime.expiresAt).getTime() : 0;
        const expired = Boolean(expiresAtTime && Date.now() >= expiresAtTime);
        const authenticated = configured && (!expired || Boolean(runtime.refreshToken));

        return {
            configured,
            authenticated,
            needsReconnect: configured && expired && !runtime.refreshToken,
            expiresAt: runtime.expiresAt,
        };
    }
}
