import { pathToFileURL } from 'url';
import { resolve } from 'path';

// Set default body size limit to 30MB if not already set
if (!process.env.BODY_SIZE_LIMIT) {
    process.env.BODY_SIZE_LIMIT = '30M';
    console.log('[Server] Defaulting BODY_SIZE_LIMIT to 30M');
}

// Import the build
// We use dynamic import to ensure env vars are set before the app loads
const buildPath = resolve('./build/index.js');
await import(pathToFileURL(buildPath).href);
