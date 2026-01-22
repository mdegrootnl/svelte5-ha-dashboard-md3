import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Simple sanitization: keep extension, random name or slugify original
        // For simplicity let's use a timestamp + sanitized original name
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${Date.now()}_${sanitizedName}`;

        // Ensure directory exists
        const uploadDir = join(process.cwd(), 'data', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // Return the public URL
        const url = `/api/uploads/${filename}`;

        return json({ url });
    } catch (e) {
        console.error('Upload failed:', e);
        return json({ error: 'Upload failed' }, { status: 500 });
    }
};
