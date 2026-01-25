import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    console.log('[API/Upload] Received upload request');
    try {
        const contentType = request.headers.get('content-type');
        const filenameHeader = request.headers.get('x-filename');

        let buffer: Buffer;
        let originalName: string;
        let mimeType: string = contentType || 'application/octet-stream';

        if (contentType?.includes('multipart/form-data')) {
            console.log('[API/Upload] Processing as multipart/form-data');
            const formData = await request.formData();
            const file = formData.get('file') as File;

            if (!file) {
                console.warn('[API/Upload] No file found in form data');
                return json({ error: 'No file uploaded' }, { status: 400 });
            }
            buffer = Buffer.from(await file.arrayBuffer());
            originalName = file.name;
            mimeType = file.type;
        } else {
            console.log('[API/Upload] Processing as binary data');
            buffer = Buffer.from(await request.arrayBuffer());
            originalName = filenameHeader ? decodeURIComponent(filenameHeader) : 'upload.bin';
        }

        console.log(`[API/Upload] Processing file: ${originalName} (${buffer.length} bytes, type: ${mimeType})`);

        // Robust sanitization
        const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
        const safeName = originalName
            .split('.')[0]
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50);

        const filename = `${Date.now()}_${safeName}.${ext}`;

        // Ensure directory exists
        const uploadDir = join(process.cwd(), 'data', 'uploads');
        console.log(`[API/Upload] Upload directory: ${uploadDir}`);

        await mkdir(uploadDir, { recursive: true });

        const filePath = join(uploadDir, filename);
        console.log(`[API/Upload] Writing to: ${filePath}`);

        await writeFile(filePath, buffer);

        // Return the public URL
        const url = `/api/uploads/${filename}`;
        console.log(`[API/Upload] Success. URL: ${url}`);

        return json({ url });
    } catch (e) {
        console.error('[API/Upload] Critical failure:', e);
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        return json({ error: `Upload failed: ${errorMsg}` }, { status: 500 });
    }
};
