import type { HistoryData, HistoryDataPoint } from '../types';
import { ok, err, type Result } from '../utils/result';

export type AggregateFunc = 'avg' | 'min' | 'max' | 'last';

/**
 * Service for transforming and normalizing Home Assistant history data.
 * Pure logic and network fetching.
 */
export class HistoryService {
    /**
     * Transform raw HA history response to typed HistoryData format.
     */
    static transformResponse(rawData: any[][], entityIds: string[]): HistoryData[] {
        return rawData.map((entityHistory, index) => {
            const entityId = entityIds[index] || entityHistory[0]?.entity_id || 'unknown';
            const isClimate = entityId.startsWith('climate.');

            const points: HistoryDataPoint[] = entityHistory.map((entry: any) => {
                let val: number;

                if (isClimate) {
                    val = parseFloat(entry.attributes?.current_temperature);
                    // Fallback to state if attribute missing (though unlikely for climate)
                    if (isNaN(val)) val = parseFloat(entry.state);
                } else {
                    val = parseFloat(entry.state);
                }

                return {
                    timestamp: new Date(entry.last_changed || entry.last_updated),
                    state: entry.state,
                    value: isNaN(val) ? null : val
                };
            });

            return {
                entityId,
                points
            };
        });
    }



    /**
     * Downsample history data points.
     */
    static aggregateHistory(
        points: HistoryDataPoint[],
        func: AggregateFunc,
        targetCount: number
    ): HistoryDataPoint[] {
        if (points.length <= targetCount || targetCount <= 0) return points;

        const result: HistoryDataPoint[] = [];
        const bucketSize = points.length / targetCount;

        for (let i = 0; i < targetCount; i++) {
            const startIdx = Math.floor(i * bucketSize);
            const endIdx = Math.floor((i + 1) * bucketSize);
            const bucket = points.slice(startIdx, endIdx);

            if (bucket.length === 0) continue;

            const values = bucket
                .map(p => p.value)
                .filter((v): v is number => v !== null);

            let aggregatedValue: number | null = null;

            if (values.length > 0) {
                switch (func) {
                    case 'avg':
                        aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
                        break;
                    case 'min':
                        aggregatedValue = Math.min(...values);
                        break;
                    case 'max':
                        aggregatedValue = Math.max(...values);
                        break;
                    case 'last':
                        aggregatedValue = values[values.length - 1];
                        break;
                }
            }

            result.push({
                timestamp: bucket[Math.floor(bucket.length / 2)].timestamp,
                state: aggregatedValue !== null ? String(aggregatedValue) : 'null',
                value: aggregatedValue
            });
        }

        return result;
    }
}
