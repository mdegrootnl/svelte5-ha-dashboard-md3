import { env } from '$env/dynamic/private';
import fs from 'fs/promises';
import path from 'path';
import { getResolvedDataDir } from '$lib/server/dataDir';

export interface RuntimeMealieSettings {
    baseUrl?: string;
    apiToken?: string;
}

export interface MealieSettingsStatus {
    configured: boolean;
    baseUrl: string;
    tokenConfigured: boolean;
    source: 'runtime' | 'env' | 'mixed' | 'none';
}

const CONFIG_FILE = 'mealie-settings.json';

let saveLock: Promise<void> = Promise.resolve();

function getConfigPath() {
    return path.join(getResolvedDataDir(), CONFIG_FILE);
}

async function ensureDir() {
    await fs.mkdir(getResolvedDataDir(), { recursive: true });
}

export function sanitizeMealieBaseUrl(value: unknown) {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim().replace(/\/+$/, '');
    if (!trimmed || trimmed.length > 2048) return undefined;

    try {
        const url = new URL(trimmed);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
        return url.toString().replace(/\/+$/, '');
    } catch {
        return undefined;
    }
}

function sanitizeToken(value: unknown) {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 8192) return undefined;
    return trimmed;
}

function sourceFor(runtimeBase?: string, runtimeToken?: string, envBase?: string, envToken?: string): MealieSettingsStatus['source'] {
    const hasRuntime = Boolean(runtimeBase || runtimeToken);
    const hasEnv = Boolean(envBase || envToken);
    if (hasRuntime && hasEnv) return 'mixed';
    if (hasRuntime) return 'runtime';
    if (hasEnv) return 'env';
    return 'none';
}

export class MealieSettingsService {
    static async loadRuntime(): Promise<RuntimeMealieSettings> {
        try {
            await ensureDir();
            const content = await fs.readFile(getConfigPath(), 'utf-8');
            if (!content.trim()) return {};
            const data = JSON.parse(content) as RuntimeMealieSettings;
            return {
                baseUrl: sanitizeMealieBaseUrl(data.baseUrl),
                apiToken: sanitizeToken(data.apiToken),
            };
        } catch {
            return {};
        }
    }

    static async saveRuntime(partial: {
        baseUrl?: string | null;
        apiToken?: string | null;
    }) {
        saveLock = saveLock.catch(() => undefined).then(async () => {
            await ensureDir();
            const current = await this.loadRuntime();
            const next: RuntimeMealieSettings = { ...current };

            if ('baseUrl' in partial) {
                const value = sanitizeMealieBaseUrl(partial.baseUrl);
                if (value) {
                    next.baseUrl = value;
                } else {
                    delete next.baseUrl;
                }
            }

            if ('apiToken' in partial) {
                const value = sanitizeToken(partial.apiToken);
                if (value) {
                    next.apiToken = value;
                } else {
                    delete next.apiToken;
                }
            }

            await fs.writeFile(getConfigPath(), JSON.stringify(next, null, 2), {
                encoding: 'utf-8',
                mode: 0o600,
            });
        });

        return saveLock;
    }

    static async getCredentials() {
        const runtime = await this.loadRuntime();
        const baseUrl = runtime.baseUrl || sanitizeMealieBaseUrl(env.MEALIE_BASE_URL) || '';
        const apiToken = runtime.apiToken || sanitizeToken(env.MEALIE_API_TOKEN) || '';

        return { baseUrl, apiToken };
    }

    static async getStatus(): Promise<MealieSettingsStatus> {
        const runtime = await this.loadRuntime();
        const envBase = sanitizeMealieBaseUrl(env.MEALIE_BASE_URL);
        const envToken = sanitizeToken(env.MEALIE_API_TOKEN);
        const baseUrl = runtime.baseUrl || envBase || '';
        const tokenConfigured = Boolean(runtime.apiToken || envToken);

        return {
            configured: Boolean(baseUrl && tokenConfigured),
            baseUrl,
            tokenConfigured,
            source: sourceFor(runtime.baseUrl, runtime.apiToken, envBase, envToken),
        };
    }
}
