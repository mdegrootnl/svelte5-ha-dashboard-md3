import fs from 'node:fs';
import path from 'node:path';
import { createClient } from 'pexels';
import { WEATHER_VIDEO_MAP } from '../src/lib/utils/weatherMapping';
import 'dotenv/config';

const PEXELS_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_KEY) {
    console.error('Error: Missing PEXELS_API_KEY in .env');
    process.exit(1);
}

const client = createClient(PEXELS_KEY);
const OUTPUT_DIR = path.resolve('static/weather-videos');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadVideo(query: string, filename: string) {
    const destination = path.join(OUTPUT_DIR, `${filename}.mp4`);

    // Skip if already exists
    if (fs.existsSync(destination)) {
        console.log(`Skipping ${filename}, already exists.`);
        return;
    }

    console.log(`Searching for: ${query}...`);

    try {
        const response = await client.videos.search({ query, per_page: 1, orientation: 'landscape' });

        if ('videos' in response && response.videos.length > 0) {
            const video = response.videos[0];
            // Find a lightweight HD file (720p is usually good for dashboards)
            // Try 720p, then fall back to whatever is first
            const file = video.video_files.find(f => f.height === 720) || video.video_files[0];

            if (file) {
                console.log(`Downloading video for ${filename} (${file.width}x${file.height})...`);

                const vidResp = await fetch(file.link);
                const buffer = await vidResp.arrayBuffer();
                fs.writeFileSync(destination, Buffer.from(buffer));

                console.log(`Saved ${filename}.mp4`);
            } else {
                console.warn(`No suitable video file found for ${query}`);
            }

        } else {
            console.warn(`No video found for ${query}`);
        }
    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
    }
}

async function main() {
    console.log('Starting video download...');
    const states = Object.entries(WEATHER_VIDEO_MAP);

    // Process sequentially to be nice to API limits and network
    for (const [state, query] of states) {
        await downloadVideo(query, state);
    }
    console.log('All downloads finished (or skipped).');
}

main();
