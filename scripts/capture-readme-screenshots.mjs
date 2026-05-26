import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const screenshotDir = path.join(rootDir, 'docs', 'screenshots');
const demoDataDir = path.join(os.tmpdir(), 'ha-dashboard-readme-screenshots');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runChecked(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: rootDir,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        ...options,
    });

    if (result.status !== 0) {
        if (result.error) console.error(result.error);
        process.exit(result.status ?? 1);
    }
}

function findFreePort(start = 4317) {
    return new Promise((resolve, reject) => {
        function tryPort(port) {
            const server = net.createServer();
            server.unref();
            server.on('error', () => tryPort(port + 1));
            server.listen({ port, host: '127.0.0.1' }, () => {
                const address = server.address();
                server.close(() => {
                    if (address && typeof address === 'object') {
                        resolve(address.port);
                    } else {
                        reject(new Error('Could not resolve a free port.'));
                    }
                });
            });
        }

        tryPort(start);
    });
}

function layout(colStart, colSpan, rowStart, rowSpan) {
    return { colStart, colSpan, rowStart, rowSpan };
}

function item({
    id,
    name,
    cardType,
    desktop,
    mobile,
    entityId = '',
    icon,
    color,
    backgroundColor,
    subtitle,
    options,
    ...rest
}) {
    return {
        id,
        name,
        entityId,
        icon,
        cardType,
        layout: { desktop, mobile },
        secondaryEntityId: '',
        secondaryName: '',
        domainFilter: '',
        color,
        backgroundColor,
        subtitle,
        options,
        ...rest,
    };
}

function createDemoConfig() {
    const startTab = {
        id: 'demo-start',
        name: 'Start',
        icon: 'home',
        columns: { desktop: 12, mobile: 4 },
        rows: 'implicit',
        gap: 16,
        padding: 16,
        rowHeight: 80,
        cardSurfaceStyle: 'glass',
        background: {
            enabled: false,
            source: 'none',
            imageUrl: '',
            objectPosition: 'center',
            scrimOpacity: 0.38,
        },
        items: [
            item({
                id: 'demo-title',
                name: 'Woningdashboard',
                subtitle: 'Ruimtes, aandachtspunten en dagelijkse bediening',
                cardType: 'title',
                desktop: layout(1, 12, 1, 1),
                mobile: layout(1, 4, 1, 1),
                icon: 'home',
                alignment: 'start',
            }),
            item({
                id: 'demo-kitchen',
                name: 'Keuken',
                subtitle: '2 lichten aan - 1 raam open',
                cardType: 'navigation',
                desktop: layout(1, 3, 2, 3),
                mobile: layout(1, 4, 2, 3),
                icon: 'kitchen',
                iconType: 'image',
                imageUrl: '/api/room-previews/kitchen?audience=family',
                path: '/dashboard/ground/kitchen',
                shortcuts: [
                    { id: 'kitchen-light', entityId: 'light.demo_kitchen', icon: 'lightbulb' },
                    { id: 'kitchen-window', entityId: 'binary_sensor.demo_kitchen_window', icon: 'sensor_door' },
                ],
            }),
            item({
                id: 'demo-living',
                name: 'Woonkamer',
                subtitle: 'Media actief - 21 graden',
                cardType: 'navigation',
                desktop: layout(4, 3, 2, 3),
                mobile: layout(1, 4, 5, 3),
                icon: 'living',
                iconType: 'image',
                imageUrl: '/api/room-previews/living_room?audience=family',
                path: '/dashboard/ground/living-room',
                shortcuts: [
                    { id: 'living-tv', entityId: 'media_player.demo_tv', icon: 'tv' },
                    { id: 'living-lamp', entityId: 'light.demo_living', icon: 'floor_lamp' },
                ],
            }),
            item({
                id: 'demo-bedroom',
                name: 'Slaapkamers',
                subtitle: 'Stil - nachtmodus klaar',
                cardType: 'navigation',
                desktop: layout(7, 3, 2, 3),
                mobile: layout(1, 4, 8, 3),
                icon: 'bed',
                iconType: 'image',
                imageUrl: '/api/room-previews/bedroom?audience=adult',
                path: '/dashboard/first/bedrooms',
            }),
            item({
                id: 'demo-maintenance',
                name: 'Onderhoud',
                subtitle: 'Lage batterijen - updates - sensoren',
                cardType: 'navigation',
                desktop: layout(10, 3, 2, 3),
                mobile: layout(1, 4, 11, 3),
                icon: 'notifications_active',
                iconType: 'image',
                imageUrl: '/api/room-previews/utility?audience=neutral',
                path: '/attention',
            }),
            item({
                id: 'demo-energy',
                name: 'Energie vandaag',
                cardType: 'graph',
                entityId: 'sensor.demo_solar_power',
                desktop: layout(1, 6, 5, 3),
                mobile: layout(1, 4, 14, 3),
                icon: 'electric_bolt',
                chartType: 'area',
                fetchHistory: false,
                hours_to_show: 24,
                comparisonMode: 'previous_period',
                graphEntities: [
                    {
                        entity_id: 'sensor.demo_solar_power',
                        name: 'Solar',
                        color: 'var(--color-m3-graph-1)',
                        chartType: 'area',
                    },
                    {
                        entity_id: 'sensor.demo_home_power',
                        name: 'Home',
                        color: 'var(--color-m3-graph-3)',
                        chartType: 'line',
                    },
                ],
            }),
            item({
                id: 'demo-security',
                name: 'Veiligheid',
                subtitle: 'Voordeur vergrendeld - geen beweging',
                cardType: 'navigation',
                desktop: layout(7, 6, 5, 3),
                mobile: layout(1, 4, 17, 3),
                icon: 'shield_lock',
                iconType: 'image',
                imageUrl: '/api/room-previews/hallway?audience=neutral',
                path: '/dashboard/security',
                shortcuts: [
                    { id: 'front-door', entityId: 'lock.demo_front_door', icon: 'lock' },
                    { id: 'hall-motion', entityId: 'binary_sensor.demo_hall_motion', icon: 'motion_sensor_active' },
                ],
            }),
        ],
    };

    const dashboard = {
        ...startTab,
        id: 'dashboard_home',
        name: 'Woningdashboard',
        tabs: [startTab],
        activeTabId: startTab.id,
    };

    return {
        theme: {
            sourceColor: '#7DBE73',
            isDark: true,
            language: 'nl',
            navigationStyle: 'modern',
            cardRadius: 12,
            tabPillRadius: 32,
            cardSurfaceStyle: 'glass',
            navigationItems: [
                { id: 'dashboard', label: 'Start', icon: 'home', href: '/dashboard' },
                { id: 'attention', label: 'Voor jou', icon: 'notifications_active', href: '/attention' },
                { id: 'presence', label: 'Aanwezig', icon: 'group', href: '/presence' },
                { id: 'music', label: 'Muziek', icon: 'music_note', href: '/music' },
                { id: 'meals', label: 'Maaltijden', icon: 'restaurant', href: '/meals' },
                { id: 'weather', label: 'Weer', icon: 'partly_cloudy_day', href: '/weather' },
                { id: 'library', label: 'Bibliotheek', icon: 'widgets', href: '/library' },
                { id: 'settings', label: 'Instellingen', icon: 'settings', href: '/settings' },
            ],
        },
        dashboards: {
            dashboard_home: dashboard,
        },
        pages: [],
        musicLibrary: {
            favorites: [],
            lastSyncedAt: 0,
        },
        lockScreen: {
            enabled: false,
            timeout: 300,
            backgroundLandscape: '',
            backgroundPortrait: '',
        },
        kiosk: {
            enabled: false,
            idleTimeout: 60,
            dimOnIdle: true,
            hideNavigationOnIdle: true,
            showScreensaver: true,
            keepAwake: false,
            hideEditControls: true,
            editUnlockMinutes: 15,
        },
    };
}

async function seedDemoData() {
    await fs.rm(demoDataDir, { recursive: true, force: true });
    await fs.mkdir(demoDataDir, { recursive: true });
    await fs.writeFile(
        path.join(demoDataDir, 'config.json'),
        JSON.stringify(createDemoConfig(), null, 2),
        'utf-8',
    );
}

async function waitForHealth(baseUrl, serverProcess) {
    const startedAt = Date.now();
    let lastError = '';

    while (Date.now() - startedAt < 30_000) {
        if (serverProcess.exitCode !== null) {
            throw new Error(`Server exited early with code ${serverProcess.exitCode}. ${lastError}`);
        }

        try {
            const response = await fetch(`${baseUrl}/api/health`);
            if (response.ok) return;
            lastError = `HTTP ${response.status}`;
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Timed out waiting for ${baseUrl}/api/health. ${lastError}`);
}

async function clickOptionalTab(page, name) {
    const tab = page.getByRole('tab', { name });
    if (await tab.count()) {
        await tab.first().click();
        return;
    }

    const button = page.getByRole('button', { name });
    if (await button.count()) {
        await button.first().click();
        return;
    }

    const text = page.getByText(name, { exact: true });
    if (await text.count()) {
        await text.first().click();
    }
}

async function capture(page, baseUrl, shot) {
    await page.goto(`${baseUrl}${shot.path}`, { waitUntil: 'networkidle' });
    await page.locator('main').waitFor({ state: 'visible', timeout: 15_000 });
    if (shot.prepare) await shot.prepare(page);
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(600);
    await page.screenshot({
        path: path.join(screenshotDir, shot.file),
        fullPage: false,
    });
    console.log(`Captured ${shot.file}`);
}

async function main() {
    await fs.mkdir(screenshotDir, { recursive: true });
    await seedDemoData();

    if (process.env.SKIP_SCREENSHOT_BUILD !== '1') {
        runChecked(npmCommand, ['run', 'build']);
    }

    const port = await findFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, ['server.js'], {
        cwd: rootDir,
        env: {
            ...process.env,
            HOST: '127.0.0.1',
            PORT: String(port),
            ORIGIN: baseUrl,
            DASHBOARD_DATA_DIR: demoDataDir,
            DASHBOARD_DEPLOYMENT: 'standalone',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    server.stdout.on('data', (chunk) => process.stdout.write(chunk));
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));

    try {
        await waitForHealth(baseUrl, server);

        const browser = await chromium.launch();
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 1,
        });
        const page = await context.newPage();

        const shots = [
            {
                path: '/dashboard',
                file: 'dashboard-overview.png',
            },
            {
                path: '/library',
                file: 'card-library.png',
                prepare: async (activePage) => {
                    await clickOptionalTab(activePage, 'Specialist');
                },
            },
            {
                path: '/settings',
                file: 'settings-connections.png',
                prepare: async (activePage) => {
                    await clickOptionalTab(activePage, 'Verbindingen');
                },
            },
        ];

        for (const shot of shots) {
            await capture(page, baseUrl, shot);
        }

        await browser.close();
    } finally {
        server.kill('SIGTERM');
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
