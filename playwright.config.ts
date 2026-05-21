import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT || process.env.PORT || '3000';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: {
        timeout: 5_000,
    },
    use: {
        baseURL: `http://127.0.0.1:${port}`,
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'npm run preview:addon',
        url: `http://127.0.0.1:${port}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
