export interface RainDataPoint {
    time: Date;
    value: number;
    intensity: number;
}

/**
 * Service for enriching and parsing weather-specific data.
 */
export class WeatherEnricher {
    /**
     * Parse the raw Buienradar text format into normalized data points.
     * Format: "000|15:30" (value|time)
     */
    static parseBuienradarData(text: string): RainDataPoint[] {
        const lines = text.trim().split("\n");
        const now = new Date();

        return lines.map((l) => {
            const [valStr, timeStr] = l.split("|");
            const val = parseInt(valStr);

            // Parse Time
            const [h, m] = timeStr.split(":").map(Number);
            let date = new Date(now);
            date.setHours(h, m, 0, 0);

            // Handle date rollover (if time is much earlier than now, assume tomorrow)
            // Buienradar gives ~2hr forecast.
            if (date.getTime() < now.getTime() - 4 * 60 * 60 * 1000) {
                date.setDate(date.getDate() + 1);
            }

            // Formula: 10^((val-109)/32)
            let intensity = Math.pow(10, (val - 109) / 32);
            if (val === 0) intensity = 0; // Explicit 0 for no rain

            return {
                time: date,
                value: val,
                intensity,
            };
        });
    }

    /**
     * Calculate a stable Y-scale domain for rain intensity.
     */
    static getRainScaleDomain(data: RainDataPoint[]): [number, number] {
        const maxIntensity = Math.max(0, ...data.map((d) => d.intensity));
        return [0, Math.max(2, maxIntensity)]; // Min max 2 for visual stability
    }
}
