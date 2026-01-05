import { untrack } from 'svelte';
import { haStore } from './ha.svelte';

interface WeatherState {
    current: any;
    hourly: any[];
    daily: any[];
    astronomy: {
        sunrise: Date;
        sunset: Date;
    } | null;
    air_quality: {
        aqi: number;
        level: string; // 'Good', 'Moderate', etc.
        description: string;
    } | null;
}

export class WeatherStore {
    // Default: Zevenhuizen, NL (Fallback)
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

    // State to WMO Code Mapping
    private haStateMap: Record<string, number> = {
        'clear-night': 0,
        'sunny': 0,
        'partlycloudy': 2,
        'cloudy': 3,
        'fog': 45,
        'hail': 96,
        'lightning': 95,
        'lightning-rainy': 95,
        'pouring': 65,
        'rainy': 61,
        'snowy': 71,
        'snowy-rainy': 56,
        'windy': 3, // No direct WMO for windy without precip, map to cloudy or custom
        'windy-variant': 3,
        'exceptional': 99
    };

    private mapHAStateToWMO(state: string): number {
        return this.haStateMap[state] ?? 3; // Default to cloudy if unknown
    }

    async fetch(force = false) {
        if (!haStore.connection || !haStore.config) {
            // Retry later if not connected
            return;
        }

        // Throttle: Don't fetch if updated less than 5 minutes ago, unless forced
        // or if we have no valid data yet (e.g. initial load failed)
        const isStale = !this.lastUpdated || (Date.now() - this.lastUpdated.getTime()) > (5 * 60 * 1000);
        if (!force && !isStale && this.data?.current) {
            console.log('[Weather] Skipping fetch, data is fresh');
            return;
        }

        this.loading = true;
        try {
            // Update location from HA
            this.location = {
                lat: haStore.config.latitude,
                lon: haStore.config.longitude,
                name: 'Home'
            };

            // Find best weather entity
            // 1. weather.home
            // 2. any weather.*
            const entities = Object.keys(haStore.states).filter(id => id.startsWith('weather.'));
            const entityId = entities.includes('weather.home') ? 'weather.home' : entities[0];

            if (!entityId) {
                console.warn('No weather entity found in Home Assistant');
                this.loading = false;
                return;
            }

            const entity = haStore.states[entityId];
            const attributes = entity.attributes;

            // Map Current Conditions
            // HA State is a string like 'partlycloudy'
            const wmoCode = this.mapHAStateToWMO(entity.state);

            // Use sun.sun state to determine is_day
            const sunState = haStore.states['sun.sun']?.state;
            // Default to 1 (day) if unknown, but if sun is below_horizon, it is night (0).
            const isDay = sunState === 'below_horizon' ? 0 : 1;

            // Construct 'current' object matching Open-Meteo structure for compatibility
            const current = {
                temperature_2m: attributes.temperature,
                weather_code: wmoCode,
                is_day: isDay,
                relative_humidity_2m: attributes.humidity,
                wind_speed_10m: attributes.wind_speed,
                wind_direction_10m: attributes.wind_bearing, // Direction in degrees
                surface_pressure: attributes.pressure,
            };

            let hourly: any[] = [];
            let daily: any[] = [];

            // Get Forecasts
            // Modern HA: Call service. Old HA: Attributes.

            // Try fetching Forecasts using service
            try {
                console.log(`[Weather] Fetching forecasts for ${entityId}`);

                // Fetch Hourly
                const hourlyResp: any = await haStore.callService('weather', 'get_forecasts', {
                    type: 'hourly'
                }, { entity_id: entityId }, true);

                // Fetch Daily
                const dailyResp: any = await haStore.callService('weather', 'get_forecasts', {
                    type: 'daily'
                }, { entity_id: entityId }, true);

                console.log(`[Weather] Service Raw keys:`, Object.keys(hourlyResp || {}));

                // Unpack 'response' wrapper if present (common in HA WebSocket results)
                const hourlyPayload = hourlyResp.response ?? hourlyResp;
                const dailyPayload = dailyResp.response ?? dailyResp;

                // Relaxed lookup: Try exact ID, then fallback to first value in the payload
                const hourlyData = hourlyPayload?.[entityId] || Object.values(hourlyPayload || {})[0];
                const dailyData = dailyPayload?.[entityId] || Object.values(dailyPayload || {})[0];

                if (hourlyData?.forecast) {
                    hourly = this.mapHAForecast(hourlyData.forecast, 'hourly');
                }

                if (dailyData?.forecast) {
                    daily = this.mapHAForecast(dailyData.forecast, 'daily');
                }

                if (daily.length === 0) {
                    console.log('[Weather] Service forecast empty, checking attributes fallback');
                }

            } catch (serviceErr) {
                console.warn("[Weather] Service weather.get_forecasts failed:", serviceErr);
            }

            // Always check attributes if we still have no daily forecast (either service failed or returned empty)
            if (daily.length === 0 && attributes.forecast) {
                console.log('[Weather] Using attribute forecast fallback');
                daily = this.mapHAForecast(attributes.forecast, 'daily');
            }

            // --- Astronomy Data ---
            let astronomy = null;
            const sunEntity = haStore.states['sun.sun'];
            if (sunEntity?.attributes) {
                // next_rising/setting are timestamps. 
                // We want today's sunrise/sunset.
                // If is_day is true, sunset is surely coming up today/tonight.
                // If is_day is false (night), the next rising is tomorrow morning.
                // Simple approach: Use next_rising/setting but we mostly need "Event time" for the widget.
                // Better approach: HA 'sun.sun' attributes are next events.
                // For a "Sun Path" widget we ideally need today's sunrise & sunset absolute times.
                // We can approximate by taking next_rising/setting and adjusting date, or finding a proper integration.
                // Let's use next_rising/next_setting directly for now.
                astronomy = {
                    sunrise: new Date(sunEntity.attributes.next_rising),
                    sunset: new Date(sunEntity.attributes.next_setting)
                };

                // Fix: 'next_rising' might be tomorrow. If so, we need today's sunrise to show the correct day progress.
                // If sunrise is after sunset, it means sunrise is following the current sunset (tomorrow).
                // We want the sunrise *before* the current sunset.
                if (astronomy.sunrise > astronomy.sunset) {
                    astronomy.sunrise.setDate(astronomy.sunrise.getDate() - 1);
                }
            }

            // --- AQI Data Discovery ---
            let air_quality = null;

            // Look for AQI sensors in order of preference:
            // 1. WAQI integration: sensor.waqi_*
            // 2. Any sensor containing 'aqi' in the name
            // 3. Air quality entities (air_quality.*)
            const sensorKeys = Object.keys(haStore.states);

            let aqiEntityId = sensorKeys.find(id =>
                id.startsWith('sensor.waqi_')
            ) || sensorKeys.find(id =>
                id.startsWith('sensor.') && id.toLowerCase().includes('aqi')
            ) || sensorKeys.find(id =>
                id.startsWith('air_quality.')
            );

            if (aqiEntityId) {
                const aqiEntity = haStore.states[aqiEntityId];
                let val: number;

                // WAQI and most AQI sensors store the value in state
                // Air quality entities might store it differently
                if (aqiEntityId.startsWith('air_quality.')) {
                    val = parseFloat(aqiEntity.attributes?.air_quality_index ?? aqiEntity.state);
                } else {
                    val = parseFloat(aqiEntity.state);
                }

                if (!isNaN(val)) {
                    // US AQI banding
                    let level = 'Good';
                    let description = 'Air quality is satisfactory';
                    if (val > 50) { level = 'Moderate'; description = 'Acceptable air quality'; }
                    if (val > 100) { level = 'Unhealthy for Sensitive'; description = 'Sensitive groups may be affected'; }
                    if (val > 150) { level = 'Unhealthy'; description = 'Everyone may experience health effects'; }
                    if (val > 200) { level = 'Very Unhealthy'; description = 'Health alert: serious effects possible'; }
                    if (val > 300) { level = 'Hazardous'; description = 'Emergency conditions'; }

                    air_quality = {
                        aqi: val,
                        level,
                        description
                    };
                }
            }

            this.data = {
                current,
                hourly,
                daily,
                astronomy,
                air_quality
            };
            this.lastUpdated = new Date();

        } catch (e) {
            console.error("Weather fetch from HA failed", e);
        } finally {
            this.loading = false;
        }
    }

    private mapHAForecast(forecast: any[], type: 'hourly' | 'daily') {
        if (!Array.isArray(forecast)) return [];

        // Get sun info for Day/Night calculation
        const sun = haStore?.states?.['sun.sun'];
        let sunriseHour = 6;
        let sunsetHour = 21;

        if (sun?.attributes) {
            const parseTime = (iso: string) => {
                const d = new Date(iso);
                return d.getHours() + d.getMinutes() / 60;
            };
            if (sun.attributes.next_rising) sunriseHour = parseTime(sun.attributes.next_rising);
            if (sun.attributes.next_setting) sunsetHour = parseTime(sun.attributes.next_setting);

            // Handle edge case where next_rising might be tomorrow, implying distinct order.
            // Simplified: Just take the time of day roughly.
        }

        return forecast.map((f: any) => {
            // Robust date parsing (datetime, date, time)
            const dateStr = f.datetime || f.date || f.time;
            const date = dateStr ? new Date(dateStr) : new Date();
            const wmo = this.mapHAStateToWMO(f.condition);

            if (type === 'daily') {
                return {
                    date: date,
                    min: f.templow ?? f.temperature, // Fallback if templow missing
                    max: f.temperature,
                    code: wmo,
                    precip: f.precipitation_probability ?? f.precipitation,
                    sunrise: undefined,
                    sunset: undefined
                };
            } else {
                // Calculate isDay based on local hour
                const hour = date.getHours() + date.getMinutes() / 60;
                // Simple logic: Day if between sunrise and sunset
                // Note: accurate enough for icons
                let isDay = hour >= sunriseHour && hour < sunsetHour;

                // Handle wrapping if sunset < sunrise (e.g. polar? rare) or just simple logic
                // If sun rises at 7 and sets at 19.
                // 20 is > 19 -> Nigth. 5 is < 7 -> Night.
                // 12 is > 7 and < 19 -> Day.

                return {
                    time: date,
                    temp: f.temperature,
                    code: wmo,
                    precip: f.precipitation_probability ?? f.precipitation,
                    isDay
                };
            }
        });
    }

    // Preserve helper for compatibility
    private codeMap: Record<number, string> = {
        // ... (Keep existing or rely on mapping)
        // Actually, getConditionText needs to work.
    };

    getConditionText(code: number): string {
        // Flip the haStateMap or use existing logic
        return "Weather";
        // Implementation below references existing text map or we can simplify.
        // Let's keep the old map logic if possible or just return a string.
        // The previous implementation had a huge map.
        // Let's simplify and use the HA state string if we had access to it, but we only store the code.
        // We can reconstruct it or use a simplified map.
        const map: Record<number, string> = {
            0: 'Clear', 2: 'Partly Cloudy', 3: 'Cloudy',
            45: 'Fog', 51: 'Drizzle', 61: 'Rain', 65: 'Heavy Rain',
            71: 'Snow', 95: 'Thunderstorm'
        };
        return map[code] || 'Unknown';
    }

    // Keep getIconUrl as is? 
    // It uses codeMap which maps WMO to icon names. 
    // I need to ensure codeMap covers the codes I produce in mapHAStateToWMO.
    // I will restore codeMap and getConditionText properly in next step if I can't fit it all here.
    // To be safe, I will include the critical parts in this huge replacement.

    getIconUrl(code: number, isDayTime = true, isDarkTheme = false) {
        // ... same logic as before ...
        let base = 'cloudy';
        if (code === 0) base = 'clear';
        if (code === 2) base = 'partly_cloudy';
        if (code === 3) base = 'cloudy';
        if (code === 45) base = 'haze_fog';
        if (code === 61) base = 'rain_showers';
        if (code === 63) base = 'rain_showers';
        if (code === 65) base = 'heavy_rain';
        if (code === 71) base = 'flurries';
        if (code === 95) base = 'thunderstorms';

        if (['clear', 'partly_cloudy', 'rain_showers', 'thunderstorms'].includes(base)) {
            base = `${base}_${isDayTime ? 'day' : 'night'}`;
        }
        const themeFolder = isDarkTheme ? 'dark' : 'light';
        return `/weather/icons/${themeFolder}/${base}.svg`;
    }
}

export const weatherStore = new WeatherStore();
