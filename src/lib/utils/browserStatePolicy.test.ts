import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const STORAGE_PATTERN = /\b(?:localStorage|sessionStorage|indexedDB)\b/;
const SOURCE_EXTENSIONS = new Set(['.ts', '.svelte']);

const ALLOWED_BROWSER_STORAGE_FILES = new Map<string, string>([
    ['src/lib/components/weather/widgets/AQIWidget.svelte', 'legacy per-widget weather entity cache'],
    ['src/lib/features/dashboard/stores/dashboard.svelte.ts', 'fast cache for backend-backed dashboard config'],
    ['src/lib/features/kiosk/stores/kiosk.svelte.ts', 'backend-backed kiosk cache and local per-device tablet profile'],
    ['src/lib/features/lockscreen/stores/lockscreen.svelte.ts', 'fast cache for backend-backed lock screen config'],
    ['src/lib/features/music/components/MusicBrowser.svelte', 'weekly disposable radio country catalog cache'],
    ['src/lib/features/music/stores/musicLibrary.svelte.ts', 'fast cache and one-time local favorites migration'],
    ['src/lib/stores/theme.svelte.ts', 'fast cache for backend-backed theme and navigation config'],
    ['src/lib/utils/storageProvider.ts', 'standalone Home Assistant auth/session compatibility'],
]);

function extensionFor(path: string) {
    const match = path.match(/(\.[^.]+)$/);
    return match?.[1] ?? '';
}

function walkFiles(dir: string): string[] {
    const entries = readdirSync(dir);
    const files: string[] = [];

    for (const entry of entries) {
        const absolute = join(dir, entry);
        const stats = statSync(absolute);

        if (stats.isDirectory()) {
            files.push(...walkFiles(absolute));
            continue;
        }

        files.push(absolute);
    }

    return files;
}

function normalizePath(path: string) {
    return relative(process.cwd(), path).replace(/\\/g, '/');
}

describe('browser state policy', () => {
    it('keeps direct browser storage usage explicit and allowlisted', () => {
        const sourceFiles = walkFiles(SOURCE_ROOT)
            .map(normalizePath)
            .filter((path) => SOURCE_EXTENSIONS.has(extensionFor(path)))
            .filter((path) => !path.endsWith('.test.ts'))
            .filter((path) => !path.endsWith('.spec.ts'))
            .filter((path) => !path.startsWith('src/tests/'));

        const storageUsers = sourceFiles.filter((path) =>
            STORAGE_PATTERN.test(readFileSync(join(process.cwd(), path), 'utf8')),
        );
        const unexpected = storageUsers.filter((path) => !ALLOWED_BROWSER_STORAGE_FILES.has(path));

        expect(
            unexpected,
            [
                'New shared household state should be backend-backed by default.',
                'If browser storage is intentional, add this file to ALLOWED_BROWSER_STORAGE_FILES with a reason.',
                `Current allowlist: ${Array.from(ALLOWED_BROWSER_STORAGE_FILES.entries())
                    .map(([path, reason]) => `${path} (${reason})`)
                    .join(', ')}`,
            ].join('\n'),
        ).toEqual([]);
    });
});
