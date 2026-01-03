import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDragState, calculatePercentage, shouldThrottle } from './gestures';

describe('gesture utils', () => {
    describe('createDragState', () => {
        it('returns initial drag state', () => {
            const state = createDragState();
            expect(state).toEqual({
                isDragging: false,
                startX: 0,
                didMove: false,
                lastCallTime: 0
            });
        });
    });

    describe('calculatePercentage', () => {
        it('calculates percentage correctly', () => {
            const element = {
                getBoundingClientRect: () => ({
                    left: 100,
                    width: 200
                })
            } as HTMLElement;

            expect(calculatePercentage(100, element)).toBe(0);
            expect(calculatePercentage(200, element)).toBe(50);
            expect(calculatePercentage(300, element)).toBe(100);
        });

        it('clamps values between 0 and 100', () => {
            const element = {
                getBoundingClientRect: () => ({
                    left: 100,
                    width: 200
                })
            } as HTMLElement;

            expect(calculatePercentage(50, element)).toBe(0);
            expect(calculatePercentage(350, element)).toBe(100);
        });

        it('rounds values', () => {
            const element = {
                getBoundingClientRect: () => ({
                    left: 0,
                    width: 3
                })
            } as HTMLElement;

            expect(calculatePercentage(1, element)).toBe(33); // 1/3 = 33.33%
            expect(calculatePercentage(2, element)).toBe(67); // 2/3 = 66.66%
        });
    });

    describe('shouldThrottle', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns true if within throttle time', () => {
            const now = Date.now();
            vi.setSystemTime(now + 100);
            expect(shouldThrottle(now, 200)).toBe(true);
        });

        it('returns false if outside throttle time', () => {
            const now = Date.now();
            vi.setSystemTime(now + 300);
            expect(shouldThrottle(now, 200)).toBe(false);
        });

        it('uses default throttle of 200ms', () => {
            const now = Date.now();
            vi.setSystemTime(now + 150);
            expect(shouldThrottle(now)).toBe(true);
            vi.setSystemTime(now + 250);
            expect(shouldThrottle(now)).toBe(false);
        });
    });
});
