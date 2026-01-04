import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeatherStore } from './weather.svelte';

// Mock fetch
globalThis.fetch = vi.fn();

describe('WeatherStore', () => {
    let store: WeatherStore;

    beforeEach(() => {
        store = new WeatherStore();
        vi.resetAllMocks();
    });

    it('should initialize with default location (Zevenhuizen)', () => {
        expect(store.location.name).toBe('Zevenhuizen');
        expect(store.location.lat).toBe(52.01);
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
