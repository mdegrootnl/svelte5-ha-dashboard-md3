import { describe, expect, it } from 'vitest';
import {
    contrastRatio,
    parseCssColor,
    readableTextColorForBackground,
    relativeLuminance,
} from './contrast';

describe('contrast utilities', () => {
    it('parses hex and rgb colors', () => {
        expect(parseCssColor('#123')).toEqual({ r: 17, g: 34, b: 51 });
        expect(parseCssColor('#112233')).toEqual({ r: 17, g: 34, b: 51 });
        expect(parseCssColor('rgb(12, 34, 56)')).toEqual({ r: 12, g: 34, b: 56 });
        expect(parseCssColor('var(--color-m3-primary)')).toBeNull();
    });

    it('calculates relative luminance and contrast ratio', () => {
        expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
        expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1);
        expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21);
    });

    it('selects readable black or white text for explicit custom backgrounds', () => {
        expect(readableTextColorForBackground('#102010')).toBe('#ffffff');
        expect(readableTextColorForBackground('#f7e8c8')).toBe('#000000');
        expect(readableTextColorForBackground('rgb(20, 32, 20)')).toBe('#ffffff');
    });
});
