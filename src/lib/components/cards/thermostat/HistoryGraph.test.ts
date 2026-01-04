import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import HistoryGraph from './HistoryGraph.svelte';
import type { HistoryDataPoint } from '$lib/types';

describe('HistoryGraph', () => {
    it('renders empty state when no data', () => {
        render(HistoryGraph, {
            props: {
                insideData: [],
                outsideData: []
            }
        });

        // SVG should be rendered
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(screen.getByText('No history data')).toBeInTheDocument();
    });

    it('renders with inside data only', () => {
        const insideData: HistoryDataPoint[] = [
            { timestamp: new Date('2026-01-03T10:00:00'), state: '21', value: 21 },
            { timestamp: new Date('2026-01-03T12:00:00'), state: '22', value: 22 },
            { timestamp: new Date('2026-01-03T14:00:00'), state: '21.5', value: 21.5 },
        ];

        render(HistoryGraph, {
            props: {
                insideData,
                outsideData: []
            }
        });

        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();

        // Should have paths for line and area
        const paths = svg?.querySelectorAll('path');
        expect(paths?.length).toBeGreaterThanOrEqual(2);
    });

    it('renders with both inside and outside data', () => {
        const insideData: HistoryDataPoint[] = [
            { timestamp: new Date('2026-01-03T10:00:00'), state: '21', value: 21 },
            { timestamp: new Date('2026-01-03T12:00:00'), state: '22', value: 22 },
        ];
        const outsideData: HistoryDataPoint[] = [
            { timestamp: new Date('2026-01-03T10:00:00'), state: '5', value: 5 },
            { timestamp: new Date('2026-01-03T12:00:00'), state: '6', value: 6 },
        ];

        render(HistoryGraph, {
            props: {
                insideData,
                outsideData
            }
        });

        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();

        // Should have paths for both series (2 per series: line + area)
        const paths = svg?.querySelectorAll('path');
        expect(paths?.length).toBeGreaterThanOrEqual(4);
    });

    it('respects custom dimensions', () => {
        const insideData: HistoryDataPoint[] = [
            { timestamp: new Date('2026-01-03T10:00:00'), state: '21', value: 21 },
        ];

        render(HistoryGraph, {
            props: {
                insideData,
                outsideData: [],
                width: 500,
                height: 200
            }
        });

        const svg = document.querySelector('svg');
        expect(svg?.getAttribute('viewBox')).toBe('0 0 500 200');
    });

    it('handles null values in data', () => {
        const insideData: HistoryDataPoint[] = [
            { timestamp: new Date('2026-01-03T10:00:00'), state: '21', value: 21 },
            { timestamp: new Date('2026-01-03T11:00:00'), state: 'unknown', value: null },
            { timestamp: new Date('2026-01-03T12:00:00'), state: '22', value: 22 },
        ];

        render(HistoryGraph, {
            props: {
                insideData,
                outsideData: []
            }
        });

        // Should render without crashing
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });
    it('enforces minimum range of 10 on y-axis', () => {
        const insideData: HistoryDataPoint[] = [
            { timestamp: new Date('2026-01-03T10:00:00'), state: '20', value: 20 },
            { timestamp: new Date('2026-01-03T12:00:00'), state: '21', value: 21 },
        ];

        render(HistoryGraph, {
            props: {
                insideData,
                outsideData: [],
                height: 100 // Use 100 height for easier calculation
            }
        });

        const svg = document.querySelector('svg');
        const path = svg?.querySelector('path[stroke]'); // The line path
        const d = path?.getAttribute('d');

        // Path format is something like "M0,60L400,?"
        // We know for a range of 10 (domain [15.5, 25.5] centered on 20.5):
        // 20 maps to: (20 - 15.5)/10 = 0.45 from bottom -> y = 100 * (1 - 0.45) = 55
        // 21 maps to: (21 - 15.5)/10 = 0.55 from bottom -> y = 100 * (1 - 0.55) = 45
        // Difference should be 10 pixels.

        // If tight scaling (domain [19.9, 21.1] approx range 1.2):
        // 20 maps to ~0.08 -> y ~ 92
        // 21 maps to ~0.92 -> y ~ 8
        // Difference ~84 pixels.

        expect(d).toBeDefined();

        // Extract y coordinates roughly
        // We expect y values around 45 and 55.
        // Let's just check that neither is < 10 or > 90, which would happen with tight scaling
        const matches = d!.match(/(\d+(\.\d+)?)(?=[,L]|$)/g);
        // This regex is extremely approximate, let's just use manual logic check
        // "M0,55L400,45" approx (with curveMonotoneX it might be complex)

        // The curveMonotoneX makes 'd' complex (C commands).
        // Standard line generator with 2 points usually makes a straight line?
        // Let's assume typical d3 output structure.

        // Actually monotoneX with 2 points IS a straight line.
        // "M...,55L...,45"

        const yValues = d!.match(/,([\d.]+)/g)?.map(s => parseFloat(s.slice(1)));

        // We expect 2 y values.
        expect(yValues!.length).toBeGreaterThanOrEqual(2);
        const y1 = yValues![0];
        const y2 = yValues![1];

        const diff = Math.abs(y1 - y2);

        // With min range 10, diff is 10px (in 100px height).
        // With tight scaling, diff would be > 80px.
        expect(diff).toBeLessThan(20);
    });
});
