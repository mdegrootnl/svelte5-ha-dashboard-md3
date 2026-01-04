import { untrack } from 'svelte';

interface WeatherState {
    current: any;
    hourly: any[];
    daily: any[];
}

export class WeatherStore {
    // Default: Zevenhuizen, NL
    location = $state({ lat: 52.01, lon: 4.58, name: 'Zevenhuizen' });
    data = $state<WeatherState | null>(null);
    loading = $state(false);
    lastUpdated = $state<Date | null>(null);
    private intervalId: any;

    constructor() {
        this.init();
    }

    init() {
        // Fetch immediately on load
        if (typeof window !== 'undefined') {
            this.fetch();
            // Poll every 15 minutes
            this.intervalId = setInterval(() => {
                this.fetch();
            }, 15 * 60 * 1000);
        }
    }

    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    // WMO Code Mapping to Google Icon filenames (v2)
    private codeMap: Record<number, string> = {
        0: 'clear', // Special handling for day/night
        1: 'mostly_cloudy', // Special handling for day/night
        2: 'partly_cloudy', // Special handling for day/night
        3: 'cloudy',
        45: 'haze_fog', 48: 'haze_fog',
        51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
        56: 'wintry_mix', 57: 'wintry_mix',
        61: 'rain_showers', 63: 'rain_showers', 65: 'heavy_rain',
        66: 'wintry_mix', 67: 'wintry_mix',
        71: 'flurries', 73: 'snow_showers', 75: 'heavy_snow',
        77: 'flurries',
        80: 'scattered_rain_showers', 81: 'rain_showers', 82: 'heavy_rain',
        85: 'scattered_snow_showers', 86: 'heavy_snow',
        95: 'thunderstorms', 96: 'strong_thunderstorms', 99: 'strong_thunderstorms'
    };

    getConditionText(code: number): string {
        const map: Record<number, string> = {
            0: 'Clear Sky', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing Rime Fog',
            51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
            56: 'Light Freezing Drizzle', 57: 'Freezing Drizzle',
            61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
            66: 'Light Freezing Rain', 67: 'Freezing Rain',
            71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
            77: 'Snow Grains',
            80: 'Slight Rain Showers', 81: 'Moderate Rain Showers', 82: 'Violent Rain Showers',
            85: 'Slight Snow Showers', 86: 'Heavy Snow Showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with Hail', 99: 'Heavy Thunderstorm with Hail'
        };
        return map[code] || 'Unknown';
    }

    async fetch() {
        this.loading = true;
        try {
            const params = new URLSearchParams({
                latitude: this.location.lat.toString(),
                longitude: this.location.lon.toString(),
                current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure,uv_index,is_day,dewpoint_2m',
                hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
                daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
                timezone: 'auto'
            });

            const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
            const json = await res.json();

            this.data = {
                current: json.current,
                hourly: this.mapHourly(json.hourly),
                daily: this.mapDaily(json.daily)
            };
            this.lastUpdated = new Date();
        } catch (e) {
            console.error("Weather fetch failed", e);
        } finally {
            this.loading = false;
        }
    }

    // Helper to map API arrays to usable objects
    private mapHourly(hourly: any) {
        const now = new Date();

        // Map all hours and filter to show only future hours (or current hour)
        const allHours = hourly.time.map((t: string, i: number) => ({
            time: new Date(t),
            temp: hourly.temperature_2m[i],
            code: hourly.weather_code[i],
            precip: hourly.precipitation_probability[i],
            isDay: hourly.is_day[i] === 1
        }));

        // Filter to show only hours >= current hour, take up to 24
        return allHours
            .filter((hour: any) => hour.time >= now)
            .slice(0, 24);
    }

    private mapDaily(daily: any) {
        return daily.time.map((t: string, i: number) => ({
            date: new Date(t),
            min: daily.temperature_2m_min[i],
            max: daily.temperature_2m_max[i],
            code: daily.weather_code[i],
            precip: daily.precipitation_probability_max[i]
        }));
    }

    getIconUrl(code: number, isDayTime = true, isDarkTheme = false) {
        let base = this.codeMap[code];

        // Handle undefined codes
        if (!base) base = 'cloudy';

        // Handle cycle-dependent icons
        if (['clear', 'mostly_cloudy', 'partly_cloudy', 'scattered_rain_showers', 'scattered_snow_showers', 'thunderstorms'].includes(base)) {
            base = `${base}_${isDayTime ? 'day' : 'night'}`;
        }

        // Theme folder: 'dark' folder for Dark Mode, 'light' folder for Light Mode
        const themeFolder = isDarkTheme ? 'dark' : 'light';

        return `/weather/icons/${themeFolder}/${base}.svg`;
    }
}

export const weatherStore = new WeatherStore();
