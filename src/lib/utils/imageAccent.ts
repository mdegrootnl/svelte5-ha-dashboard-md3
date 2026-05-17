import { browser } from '$app/environment';
import { hexFromArgb, sourceColorFromImage } from '@material/material-color-utilities';

interface ImageAccentOptions {
    resolveUrl?: (url: string) => Promise<string | null>;
}

export async function extractAccentColorFromImageUrl(
    url: string | null | undefined,
    options: ImageAccentOptions = {},
) {
    if (!browser || !url) return null;

    let resolvedUrl = url;
    let shouldRevoke = false;

    try {
        resolvedUrl = (await options.resolveUrl?.(url)) ?? url;
        shouldRevoke = resolvedUrl.startsWith('blob:') && resolvedUrl !== url;

        const image = new window.Image();
        image.crossOrigin = 'anonymous';
        image.decoding = 'async';

        const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Image could not be loaded for color extraction.'));
        });

        image.src = resolvedUrl;
        const loadedImage = await loaded;
        return hexFromArgb(await sourceColorFromImage(loadedImage));
    } catch {
        return null;
    } finally {
        if (shouldRevoke) {
            URL.revokeObjectURL(resolvedUrl);
        }
    }
}
