import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const mockEnv: Record<string, string | undefined> = {};

vi.mock('$env/dynamic/private', () => ({
    env: mockEnv,
}));

const { ImageProviderSettingsService } = await import('./imageProviderSettings');

let tempDir = '';

beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ha-dashboard-images-'));
    mockEnv.DASHBOARD_DATA_DIR = tempDir;
    mockEnv.UNSPLASH_ACCESS_KEY = '';
    mockEnv.PEXELS_API_KEY = '';
});

afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
});

describe('ImageProviderSettingsService', () => {
    it('saves runtime image provider keys and reports runtime status', async () => {
        await ImageProviderSettingsService.saveRuntime({
            unsplashAccessKey: 'unsplash-runtime-key',
            pexelsApiKey: 'pexels-runtime-key',
        });

        await expect(ImageProviderSettingsService.getUnsplashAccessKey()).resolves.toBe('unsplash-runtime-key');
        await expect(ImageProviderSettingsService.getPexelsApiKey()).resolves.toBe('pexels-runtime-key');

        await expect(ImageProviderSettingsService.getStatus()).resolves.toEqual({
            unsplash: { configured: true, source: 'runtime' },
            pexels: { configured: true, source: 'runtime' },
        });
    });

    it('falls back to environment keys when runtime keys are not stored', async () => {
        mockEnv.UNSPLASH_ACCESS_KEY = 'unsplash-env-key';
        mockEnv.PEXELS_API_KEY = 'pexels-env-key';

        await expect(ImageProviderSettingsService.getUnsplashAccessKey()).resolves.toBe('unsplash-env-key');
        await expect(ImageProviderSettingsService.getPexelsApiKey()).resolves.toBe('pexels-env-key');

        await expect(ImageProviderSettingsService.getStatus()).resolves.toEqual({
            unsplash: { configured: true, source: 'env' },
            pexels: { configured: true, source: 'env' },
        });
    });

    it('clears runtime keys without removing environment fallback keys', async () => {
        mockEnv.PEXELS_API_KEY = 'pexels-env-key';

        await ImageProviderSettingsService.saveRuntime({
            pexelsApiKey: 'pexels-runtime-key',
        });
        await ImageProviderSettingsService.saveRuntime({
            pexelsApiKey: null,
        });

        await expect(ImageProviderSettingsService.getPexelsApiKey()).resolves.toBe('pexels-env-key');
        await expect(ImageProviderSettingsService.getStatus()).resolves.toMatchObject({
            pexels: { configured: true, source: 'env' },
        });
    });
});
