import { env } from '$env/dynamic/private';
import fs from 'fs/promises';
import path from 'path';

interface RuntimeImageProviderSettings {
    unsplashAccessKey?: string;
    pexelsApiKey?: string;
}

export interface ImageProviderStatus {
    configured: boolean;
    source: 'runtime' | 'env' | 'none';
}

const CONFIG_FILE = 'image-provider-secrets.json';

let saveLock: Promise<void> = Promise.resolve();

function getDataDir() {
    return env.DASHBOARD_DATA_DIR?.trim() || 'data';
}

function getResolvedDataDir() {
    const dataDir = getDataDir();
    return path.isAbsolute(dataDir) ? dataDir : path.join(process.cwd(), dataDir);
}

function getConfigPath() {
    return path.join(getResolvedDataDir(), CONFIG_FILE);
}

async function ensureDir() {
    await fs.mkdir(getResolvedDataDir(), { recursive: true });
}

function sanitizeKey(value: unknown) {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, 512);
}

export class ImageProviderSettingsService {
    static async loadRuntime(): Promise<RuntimeImageProviderSettings> {
        try {
            await ensureDir();
            const content = await fs.readFile(getConfigPath(), 'utf-8');
            if (!content.trim()) return {};
            const data = JSON.parse(content) as RuntimeImageProviderSettings;
            return {
                unsplashAccessKey: sanitizeKey(data.unsplashAccessKey),
                pexelsApiKey: sanitizeKey(data.pexelsApiKey),
            };
        } catch {
            return {};
        }
    }

    static async saveRuntime(partial: {
        unsplashAccessKey?: string | null;
        pexelsApiKey?: string | null;
    }) {
        saveLock = saveLock.catch(() => undefined).then(async () => {
            await ensureDir();
            const current = await this.loadRuntime();
            const next: RuntimeImageProviderSettings = { ...current };

            if ('unsplashAccessKey' in partial) {
                const value = sanitizeKey(partial.unsplashAccessKey);
                if (value) {
                    next.unsplashAccessKey = value;
                } else {
                    delete next.unsplashAccessKey;
                }
            }

            if ('pexelsApiKey' in partial) {
                const value = sanitizeKey(partial.pexelsApiKey);
                if (value) {
                    next.pexelsApiKey = value;
                } else {
                    delete next.pexelsApiKey;
                }
            }

            await fs.writeFile(getConfigPath(), JSON.stringify(next, null, 2), {
                encoding: 'utf-8',
                mode: 0o600,
            });
        });

        return saveLock;
    }

    static async getUnsplashAccessKey() {
        const runtime = await this.loadRuntime();
        return runtime.unsplashAccessKey || env.UNSPLASH_ACCESS_KEY?.trim() || '';
    }

    static async getPexelsApiKey() {
        const runtime = await this.loadRuntime();
        return runtime.pexelsApiKey || env.PEXELS_API_KEY?.trim() || '';
    }

    static async getStatus(): Promise<{
        unsplash: ImageProviderStatus;
        pexels: ImageProviderStatus;
    }> {
        const runtime = await this.loadRuntime();
        return {
            unsplash: getProviderStatus(runtime.unsplashAccessKey, env.UNSPLASH_ACCESS_KEY),
            pexels: getProviderStatus(runtime.pexelsApiKey, env.PEXELS_API_KEY),
        };
    }
}

function getProviderStatus(runtimeValue?: string, envValue?: string): ImageProviderStatus {
    if (runtimeValue) {
        return { configured: true, source: 'runtime' };
    }

    if (envValue?.trim()) {
        return { configured: true, source: 'env' };
    }

    return { configured: false, source: 'none' };
}
