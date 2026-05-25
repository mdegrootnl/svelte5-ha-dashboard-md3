import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { RequestHandler } from './$types';
import { getDataPath } from '$lib/server/dataDir';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
};

function hasImageSignature(buffer: Buffer, mimeType: string): boolean {
    switch (mimeType) {
        case 'image/jpeg':
            return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        case 'image/png':
            return buffer.length >= 8
                && buffer[0] === 0x89
                && buffer[1] === 0x50
                && buffer[2] === 0x4e
                && buffer[3] === 0x47
                && buffer[4] === 0x0d
                && buffer[5] === 0x0a
                && buffer[6] === 0x1a
                && buffer[7] === 0x0a;
        case 'image/webp':
            return buffer.length >= 12
                && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
                && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
        case 'image/gif':
            return buffer.length >= 6
                && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
        default:
            return false;
    }
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const contentType = request.headers.get('content-type');

        let buffer: Buffer;
        let mimeType = contentType?.split(';')[0].trim().toLowerCase() || 'application/octet-stream';

        if (contentType?.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File;

            if (!file) {
                return json({ error: 'No file uploaded' }, { status: 400 });
            }
            buffer = Buffer.from(await file.arrayBuffer());
            mimeType = file.type.toLowerCase();
        } else {
            buffer = Buffer.from(await request.arrayBuffer());
        }

        const ext = EXT_BY_MIME[mimeType];
        if (!ext) {
            return json({ error: 'Only JPEG, PNG, WebP, and GIF uploads are allowed' }, { status: 400 });
        }

        if (buffer.length === 0) {
            return json({ error: 'Uploaded file is empty' }, { status: 400 });
        }

        if (buffer.length > MAX_UPLOAD_BYTES) {
            return json({ error: 'Uploaded file is too large' }, { status: 413 });
        }

        if (!hasImageSignature(buffer, mimeType)) {
            return json({ error: 'Uploaded file is not a valid image' }, { status: 400 });
        }

        const filename = `${randomUUID()}.${ext}`;

        const uploadDir = getDataPath('uploads');
        await mkdir(uploadDir, { recursive: true });

        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);

        const url = `/api/uploads/${filename}`;

        return json({ url });
    } catch (e) {
        console.error('[API/Upload] Critical failure:', e);
        return json({ error: 'Upload failed' }, { status: 500 });
    }
};
