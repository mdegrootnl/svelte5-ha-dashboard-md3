import fs from 'fs/promises';
import path from 'path';
import { type AppConfig, DEFAULT_CONFIG } from '$lib/types/config';

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const DATA_DIR = 'data';
const CONFIG_FILE = 'config.json';
const CONFIG_PATH = path.join(process.cwd(), DATA_DIR, CONFIG_FILE);

// Simple mutex to prevent concurrent writes causing race conditions
let saveLock: Promise<void> = Promise.resolve();

export class JsonStorageService {
    private static async ensureDir() {
        try {
            await fs.mkdir(path.join(process.cwd(), DATA_DIR), { recursive: true });
        } catch (e) {
            // Ignore error if it exists
        }
    }

    static async load(): Promise<AppConfig> {
        try {
            await this.ensureDir();
            const content = await fs.readFile(CONFIG_PATH, 'utf-8');
            
            // Handle empty file
            if (!content.trim()) {
                return DEFAULT_CONFIG;
            }
            
            const data = JSON.parse(content);

            // Merge with default to ensure structure
            return {
                ...DEFAULT_CONFIG,
                ...data,
                theme: { ...DEFAULT_CONFIG.theme, ...data.theme },
                dashboards: { ...DEFAULT_CONFIG.dashboards, ...data.dashboards }
            };
        } catch (error) {
            // If file doesn't exist or is invalid, return default
            // Only log real errors, not ENOENT
            if ((error as any).code !== 'ENOENT') {
                console.error('[JsonStorageService] Failed to load config:', error);
            }
            return DEFAULT_CONFIG;
        }
    }

    static async save(config: AppConfig): Promise<void> {
        try {
            await this.ensureDir();
            await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
        } catch (error) {
            console.error('[JsonStorageService] Failed to save config:', error);
            throw error;
        }
    }

    static async savePartial(partial: DeepPartial<AppConfig>): Promise<void> {
        // Use mutex to prevent concurrent read-modify-write cycles
        saveLock = saveLock.then(async () => {
            const current = await this.load();
            const newConfig: AppConfig = {
                ...current,
                theme: { ...current.theme, ...(partial.theme || {}) },
                dashboards: { ...current.dashboards, ...(partial.dashboards as any || {}) }
            };
            await this.save(newConfig);
        }).catch(err => {
            console.error('[JsonStorageService] Save failed:', err);
        });
        
        return saveLock;
    }
}
