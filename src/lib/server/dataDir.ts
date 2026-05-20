import { env } from "$env/dynamic/private";
import path from "path";

export function getDataDir() {
    return env.DASHBOARD_DATA_DIR?.trim() || "data";
}

export function getResolvedDataDir() {
    const dataDir = getDataDir();
    return path.isAbsolute(dataDir) ? dataDir : path.join(process.cwd(), dataDir);
}

export function getDataPath(...segments: string[]) {
    return path.join(getResolvedDataDir(), ...segments);
}
