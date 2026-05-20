import { expect, test } from '@playwright/test';

const ingressBase = '/api/hassio_ingress/test';

test('loads the dashboard through a simulated Home Assistant ingress path', async ({ page }) => {
    const failedResponses: string[] = [];

    page.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin === 'http://127.0.0.1:3000' && response.status() >= 400) {
            failedResponses.push(`${response.status()} ${url.pathname}`);
        }
    });

    await page.goto(`${ingressBase}/dashboard`);

    await expect(page).toHaveTitle(/Home Assistant Dashboard|Dashboard/i);
    await expect(page.locator('main')).toBeVisible();

    const settingsHref = await page.locator('a[href*="/settings"]').first().getAttribute('href');
    expect(settingsHref).toContain(`${ingressBase}/settings`);

    expect(failedResponses).toEqual([]);
});

test('keeps settings navigation and app APIs under the ingress prefix', async ({ page }) => {
    await page.goto(`${ingressBase}/settings`);

    await expect(page.locator('main')).toBeVisible();

    const deployment = await page.evaluate(async () => {
        const response = await fetch('/api/deployment');
        return response.json();
    });

    expect(deployment).toMatchObject({
        mode: 'ha-addon',
        ingressPath: ingressBase,
        zeroConfigAvailable: true,
    });
});
