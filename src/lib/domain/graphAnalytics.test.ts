import { describe, expect, it } from 'vitest';
import {
    analyzeGraphSeries,
    chooseGraphStatisticsPeriod,
    hasNumericHistoryPoints,
    normalizeHistoryPoints,
    shiftHistoryPoints,
    shouldUseStatistics,
    summarizeGraphPoints,
} from './graphAnalytics';
import type { HistoryDataPoint } from '$lib/types';

function point(hour: number, value: number | null): HistoryDataPoint {
    return {
        timestamp: new Date(Date.UTC(2026, 4, 21, hour)),
        state: value === null ? 'unknown' : String(value),
        value,
    };
}

describe('graphAnalytics', () => {
    it('detects numeric points and shifts comparison windows', () => {
        const points = [point(10, null), point(11, 20)];
        expect(hasNumericHistoryPoints(points)).toBe(true);
        expect(shiftHistoryPoints(points, 60 * 60 * 1000)[1].timestamp.toISOString()).toBe('2026-05-21T12:00:00.000Z');
    });

    it('selects statistics periods from graph duration', () => {
        expect(chooseGraphStatisticsPeriod(4)).toBe('5minute');
        expect(chooseGraphStatisticsPeriod(48)).toBe('hour');
        expect(chooseGraphStatisticsPeriod(24 * 14)).toBe('day');
        expect(chooseGraphStatisticsPeriod(24 * 120)).toBe('month');
        expect(shouldUseStatistics('auto', 24)).toBe(false);
        expect(shouldUseStatistics('auto', 72)).toBe(true);
        expect(shouldUseStatistics('history', 120)).toBe(false);
        expect(shouldUseStatistics('statistics', 12)).toBe(true);
    });

    it('normalizes mixed-unit series without changing timestamps', () => {
        const normalized = normalizeHistoryPoints([
            point(8, 10),
            point(9, 15),
            point(10, 20),
        ]);

        expect(normalized.map((item) => item.value)).toEqual([0, 50, 100]);
        expect(normalized[1].timestamp.toISOString()).toBe('2026-05-21T09:00:00.000Z');
    });

    it('centers flat normalized series', () => {
        const normalized = normalizeHistoryPoints([point(8, 3), point(9, 3)]);
        expect(normalized.map((item) => item.value)).toEqual([50, 50]);
    });

    it('summarizes latest, average, and range for metric strips', () => {
        const summary = summarizeGraphPoints([
            point(8, 10),
            point(9, 15),
            point(10, 20),
        ]);

        expect(summary).toEqual({
            latest: 20,
            min: 10,
            max: 20,
            average: 15,
            count: 3,
        });
    });

    it('prioritizes configured threshold callouts', () => {
        const summary = analyzeGraphSeries(
            [point(8, 18), point(9, 22), point(10, 28)],
            [],
            [{ value: 27, label: 'Warm' }],
        );

        expect(summary?.kind).toBe('threshold');
        expect(summary?.threshold?.label).toBe('Warm');
    });

    it('compares the previous period when no threshold is crossed', () => {
        const summary = analyzeGraphSeries(
            [point(8, 20), point(9, 22), point(10, 24)],
            [point(5, 10), point(6, 12), point(7, 14)],
        );

        expect(summary?.kind).toBe('trend_up');
        expect(summary?.deltaPercent).toBeGreaterThan(50);
    });
});
