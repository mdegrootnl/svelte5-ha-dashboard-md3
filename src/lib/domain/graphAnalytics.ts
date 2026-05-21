import type {
    GraphDataSourceMode,
    GraphStatisticsPeriod,
    GraphThreshold,
    HistoryDataPoint,
} from "$lib/types";

export interface GraphAnalysisSummary {
    kind: "threshold" | "spike" | "dip" | "trend_up" | "trend_down" | "range";
    tone: "info" | "warning" | "good";
    latest: number;
    min: number;
    max: number;
    average: number;
    reference?: number;
    deltaPercent?: number;
    threshold?: GraphThreshold;
}

export interface GraphPointStats {
    latest: number;
    min: number;
    max: number;
    average: number;
    count: number;
}

export function getNumericHistoryPoints(points: HistoryDataPoint[]) {
    return points.filter(
        (point): point is HistoryDataPoint & { value: number } =>
            point.value !== null && Number.isFinite(point.value),
    );
}

export function hasNumericHistoryPoints(points: HistoryDataPoint[]) {
    return getNumericHistoryPoints(points).length > 0;
}

export function shiftHistoryPoints(
    points: HistoryDataPoint[],
    offsetMs: number,
): HistoryDataPoint[] {
    return points.map((point) => ({
        ...point,
        timestamp: new Date(point.timestamp.getTime() + offsetMs),
    }));
}

export function normalizeHistoryPoints(points: HistoryDataPoint[]): HistoryDataPoint[] {
    const numericPoints = getNumericHistoryPoints(points);
    if (numericPoints.length === 0) return points;

    const values = numericPoints.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    return points.map((point) => {
        if (point.value === null || !Number.isFinite(point.value)) return point;

        const normalized = range <= 0.0001 ? 50 : ((point.value - min) / range) * 100;
        const value = Number(normalized.toFixed(3));
        return {
            ...point,
            state: String(value),
            value,
        };
    });
}

export function chooseGraphStatisticsPeriod(
    hoursToShow = 24,
): GraphStatisticsPeriod {
    if (hoursToShow <= 6) return "5minute";
    if (hoursToShow <= 72) return "hour";
    if (hoursToShow <= 24 * 90) return "day";
    return "month";
}

export function shouldUseStatistics(
    dataSource: GraphDataSourceMode | undefined,
    hoursToShow = 24,
) {
    if (dataSource === "history") return false;
    if (dataSource === "statistics") return true;
    return hoursToShow >= 48;
}

function average(values: number[]) {
    if (values.length === 0) return Number.NaN;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], avg: number) {
    if (values.length < 4) return 0;
    const variance =
        values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
        values.length;
    return Math.sqrt(variance);
}

function summarizeValues(points: HistoryDataPoint[]) {
    const values = getNumericHistoryPoints(points).map((point) => point.value);
    if (values.length === 0) return null;

    const avg = average(values);
    return {
        latest: values[values.length - 1],
        min: Math.min(...values),
        max: Math.max(...values),
        average: avg,
        deviation: standardDeviation(values, avg),
        count: values.length,
    };
}

export function summarizeGraphPoints(points: HistoryDataPoint[]): GraphPointStats | null {
    const summary = summarizeValues(points);
    if (!summary) return null;

    return {
        latest: summary.latest,
        min: summary.min,
        max: summary.max,
        average: summary.average,
        count: summary.count,
    };
}

export function analyzeGraphSeries(
    points: HistoryDataPoint[],
    previousPoints: HistoryDataPoint[] = [],
    thresholds: GraphThreshold[] = [],
): GraphAnalysisSummary | null {
    const current = summarizeValues(points);
    if (!current) return null;

    const base = {
        latest: current.latest,
        min: current.min,
        max: current.max,
        average: current.average,
    };

    const exceededThreshold = thresholds
        .filter((threshold) => current.latest >= threshold.value)
        .sort((left, right) => right.value - left.value)[0];
    if (exceededThreshold) {
        return {
            ...base,
            kind: "threshold",
            tone: "warning",
            reference: exceededThreshold.value,
            threshold: exceededThreshold,
        };
    }

    if (
        current.count >= 8 &&
        current.deviation > 0 &&
        current.latest > current.average + current.deviation * 2
    ) {
        return {
            ...base,
            kind: "spike",
            tone: "warning",
            reference: current.average,
        };
    }

    if (
        current.count >= 8 &&
        current.deviation > 0 &&
        current.latest < current.average - current.deviation * 2
    ) {
        return {
            ...base,
            kind: "dip",
            tone: "info",
            reference: current.average,
        };
    }

    const previous = summarizeValues(previousPoints);
    if (previous && Math.abs(previous.average) > 0.0001) {
        const deltaPercent =
            ((current.average - previous.average) /
                Math.abs(previous.average)) *
            100;
        if (Math.abs(deltaPercent) >= 10) {
            return {
                ...base,
                kind: deltaPercent > 0 ? "trend_up" : "trend_down",
                tone: deltaPercent > 0 ? "warning" : "good",
                reference: previous.average,
                deltaPercent,
            };
        }
    }

    return {
        ...base,
        kind: "range",
        tone: "info",
    };
}
