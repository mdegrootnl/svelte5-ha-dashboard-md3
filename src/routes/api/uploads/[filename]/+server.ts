import { readFile } from 'fs/promises';
import { resolve, sep } from 'path';
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';

const CONTENT_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp'
};

export const GET: RequestHandler = async ({ params }) => {
    const { filename } = params;

    if (!filename || !/^[a-zA-Z0-9_-]+\.(jpe?g|png|gif|webp)$/i.test(filename)) {
        throw error(400, 'Invalid filename');
    }

    const uploadDir = resolve(process.cwd(), 'data', 'uploads');
    const filePath = resolve(uploadDir, filename);
    if (!filePath.startsWith(`${uploadDir}${sep}`)) {
        throw error(400, 'Invalid filename');
    }

    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = ext ? CONTENT_TYPES[ext] : undefined;
    if (!contentType) {
        throw error(400, 'Unsupported file type');
    }

    try {
        const file = await readFile(filePath);

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
