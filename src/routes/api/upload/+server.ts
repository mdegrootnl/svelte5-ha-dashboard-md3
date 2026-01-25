import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    console.log('[API/Upload] Received upload request');
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            console.warn('[API/Upload] No file found in form data');
            return json({ error: 'No file uploaded' }, { status: 400 });
        }

        console.log(`[API/Upload] Processing file: ${file.name} (${file.size} bytes, type: ${file.type})`);

        const buffer = Buffer.from(await file.arrayBuffer());

        // Robust sanitization
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const safeName = file.name
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
