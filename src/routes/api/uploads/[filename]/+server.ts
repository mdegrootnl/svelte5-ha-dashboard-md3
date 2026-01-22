import { readFile } from 'fs/promises';
import { join } from 'path';
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
    const { filename } = params;

    if (!filename || filename.includes('..')) {
        throw error(400, 'Invalid filename');
    }

    try {
        const filePath = join(process.cwd(), 'data', 'uploads', filename);
        const file = await readFile(filePath);

        // Determine mime type based on extension
        const ext = filename.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';

        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'gif') contentType = 'image/gif';
        else if (ext === 'webp') contentType = 'image/webp';
        else if (ext === 'svg') contentType = 'image/svg+xml';

        return new Response(file, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000'
            }
        });
    } catch (e) {
        throw error(404, 'File not found');
    }
};
