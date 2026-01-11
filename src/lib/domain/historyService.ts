import type { HistoryData, HistoryDataPoint } from '../types';

/**
 * Service for transforming and normalizing Home Assistant history data.
 * Pure logic, no side effects.
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
}
