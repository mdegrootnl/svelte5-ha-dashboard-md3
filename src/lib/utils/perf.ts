import { dev } from '$app/environment';

interface PerfEntry {
    count: number;
    totalMs: number;
}

const entries = new Map<string, PerfEntry>();

export function perfCount(name: string, amount = 1) {
    if (!dev) return;
    const entry = entries.get(name) ?? { count: 0, totalMs: 0 };
    entry.count += amount;
    entries.set(name, entry);
}

export function perfMeasure<T>(name: string, fn: () => T): T {
    if (!dev) return fn();
    const start = performance.now();
    try {
        return fn();
    } finally {
        const entry = entries.get(name) ?? { count: 0, totalMs: 0 };
        entry.count += 1;
        entry.totalMs += performance.now() - start;
        entries.set(name, entry);
    }
}

export function getPerfSnapshot() {
    return Object.fromEntries(entries);
}

export function resetPerfSnapshot() {
    entries.clear();
}
