import type { LayoutServerLoad } from './$types';
import { JsonStorageService } from '$lib/server/storage';
import { getDeploymentInfo } from '$lib/server/deployment';

export const load: LayoutServerLoad = async ({ depends, request, url }) => {
    depends('app:config');
    const config = await JsonStorageService.load();
    return {
        config,
        deployment: getDeploymentInfo(request, url)
    };
};
