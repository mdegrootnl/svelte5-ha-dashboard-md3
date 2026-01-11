import type { LayoutServerLoad } from './$types';
import { JsonStorageService } from '$lib/server/storage';

export const load: LayoutServerLoad = async ({ depends }) => {
    depends('app:config');
    const config = await JsonStorageService.load();
    return {
        config
    };
};
