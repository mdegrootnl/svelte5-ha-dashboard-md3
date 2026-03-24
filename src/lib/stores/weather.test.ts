import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeatherStore } from './weather.svelte';

// Mock haStore
vi.mock('./ha.svelte', () => {
    const mockForecast = Array(24).fill({
        datetime: '2023-01-01T12:00:00',
        temperature: 15,
        condition: 'sunny',
        precipitation: 10
    });

    const mockDailyForecast = Array(7).fill({
        datetime: '2023-01-01T12:00:00',
        temperature: 20,
        templow: 10,
        condition: 'partlycloudy',
        precipitation: 0
    });

    return {
        haStore: {
            connection: true,
            config: { latitude: 52.01, longitude: 4.58 },
            states: {
                'weather.home': {
                    entity_id: 'weather.home',
                    state: 'partlycloudy',
                    attributes: {
                        temperature: 20,
                        humidity: 60,
                        wind_speed: 10,
                        wind_bearing: 180,
                        pressure: 1013,
                        forecast: []
                    },
                    last_changed: '2023-01-01T00:00:00.000Z',
                    last_updated: '2023-01-01T00:00:00.000Z',
                    context: { id: 'test-context-id', parent_id: null, user_id: null }
                },
                'sun.sun': {
                    entity_id: 'sun.sun',
                    state: 'above_horizon',
                    attributes: {
                        next_rising: '2023-01-01T07:00:00.000Z',
                        next_setting: '2023-01-01T19:00:00.000Z'
                    },
                    last_changed: '2023-01-01T00:00:00.000Z',
                    last_updated: '2023-01-01T00:00:00.000Z',
                    context: { id: 'test-context-id', parent_id: null, user_id: null }
                }
            },
            callService: vi.fn((domain, service, data) => {
                if (data && data.type === 'daily') {
                    return { ok: true, value: { response: { 'weather.home': { forecast: mockDailyForecast } } } };
                }
                return { ok: true, value: { response: { 'weather.home': { forecast: mockForecast } } } };
            })
        }
    };
});

// Mock fetch - unlikely to be used now but kept for safety
globalThis.fetch = vi.fn();

describe('WeatherStore', () => {
    let store: WeatherStore;

    beforeEach(async () => {
        store = new WeatherStore();
        vi.clearAllMocks();
    });

    it('should initialize location', () => {
        expect(store.location).toBeDefined();
        expect(store.location.lat).toBeDefined();
    });

    it('getIconUrl returns correct path for known codes', () => {
        // Clear (0) -> clear_day.svg (default day, light)
        expect(store.getIconUrl(0)).toBe('/weather/icons/light/clear_day.svg');
        // Thunderstorm (95) -> thunderstorms_day.svg (default day, light)
        expect(store.getIconUrl(95)).toBe('/weather/icons/light/thunderstorms_day.svg');
    });

    it('getIconUrl respects isDayTime and isDarkTheme', () => {
        // Clear (0), Night, Dark Theme -> dark/clear_night.svg
        expect(store.getIconUrl(0, false, true)).toBe('/weather/icons/dark/clear_night.svg');
        // Clear (0), Day, Dark Theme -> dark/clear_day.svg
        expect(store.getIconUrl(0, true, true)).toBe('/weather/icons/dark/clear_day.svg');
    });

    it('getIconUrl returns fallback for unknown codes', () => {
        expect(store.getIconUrl(999)).toBe('/weather/icons/light/cloudy.svg');
    });

    it('getConditionText returns "Weather" for all codes (implementation placeholder)', () => {
        // Note: getConditionText is a placeholder that always returns "Weather"
        expect(store.getConditionText(0)).toBe('Weather');
        expect(store.getConditionText(2)).toBe('Weather');
        expect(store.getConditionText(3)).toBe('Weather');
        expect(store.getConditionText(61)).toBe('Weather');
        expect(store.getConditionText(95)).toBe('Weather');
    });

    it('getIconUrl maps WMO weather codes to correct icon paths', () => {
        // Clear (0) -> clear_day.svg (in day/night variant list)
        expect(store.getIconUrl(0)).toBe('/weather/icons/light/clear_day.svg');
        // Partly cloudy (2) -> partly_cloudy_day.svg (in day/night variant list)
        expect(store.getIconUrl(2)).toBe('/weather/icons/light/partly_cloudy_day.svg');
        // Cloudy (3) -> cloudy.svg (no day/night suffix)
        expect(store.getIconUrl(3)).toBe('/weather/icons/light/cloudy.svg');
        // Fog (45) -> haze_fog.svg (no day/night suffix)
        expect(store.getIconUrl(45)).toBe('/weather/icons/light/haze_fog.svg');
        // Rain showers (61) -> rain_showers_day.svg (in day/night variant list)
        expect(store.getIconUrl(61)).toBe('/weather/icons/light/rain_showers_day.svg');
        // Heavy rain (65) -> heavy_rain.svg (no day/night suffix)
        expect(store.getIconUrl(65)).toBe('/weather/icons/light/heavy_rain.svg');
        // Snow (71) -> flurries.svg (no day/night suffix)
        expect(store.getIconUrl(71)).toBe('/weather/icons/light/flurries.svg');
        // Thunderstorm (95) -> thunderstorms_day.svg (in day/night variant list)
        expect(store.getIconUrl(95)).toBe('/weather/icons/light/thunderstorms_day.svg');
    });

    it('fetch populates data correctly', async () => {
        const mockResponse = {
            current: {
                temperature_2m: 20,
                weather_code: 1,
                is_day: 1
            },
            hourly: {
                time: Array(24).fill('2023-01-01T12:00:00'),
                temperature_2m: Array(24).fill(15),
                weather_code: Array(24).fill(0),
                precipitation_probability: Array(24).fill(10),
                is_day: Array(24).fill(1)
            },
            daily: {
                time: Array(7).fill('2023-01-01'),
                temperature_2m_min: Array(7).fill(10),
                temperature_2m_max: Array(7).fill(20),
                weather_code: Array(7).fill(1),
                precipitation_probability_max: Array(7).fill(0)
            }
        };

        (globalThis.fetch as any).mockResolvedValue({
            json: () => Promise.resolve(mockResponse)
        });

        await store.fetch();

        expect(store.data).not.toBeNull();
        expect(store.data?.current.temperature_2m).toBe(20);
        expect(store.data?.hourly.length).toBe(24);
        expect(store.data?.daily.length).toBe(7);
        expect(store.data?.daily[0].min).toBe(10);
    });
});
