import { describe, expect, it } from 'vitest';
import { proxyMealieRequest } from './mealieProxy';

const request = new Request('http://localhost/api/mealie/test');
const url = new URL('http://localhost/api/mealie/test');

describe('Mealie proxy', () => {
    it('rejects path traversal attempts', async () => {
        await expect(
            proxyMealieRequest({
                path: '../mealie-settings.json',
                request,
                url,
                fetch,
            }),
        ).rejects.toMatchObject({ status: 400 });
    });

    it('rejects endpoints outside the dashboard allowlist', async () => {
        await expect(
            proxyMealieRequest({
                path: 'auth/token',
                request,
                url,
                fetch,
            }),
        ).rejects.toMatchObject({ status: 403 });
    });
});
