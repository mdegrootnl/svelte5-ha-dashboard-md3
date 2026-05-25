import { describe, expect, it } from 'vitest';
import { sanitizeMealieBaseUrl } from './mealieSettings';

describe('Mealie settings', () => {
    it('accepts http and https base URLs without trailing slashes', () => {
        expect(sanitizeMealieBaseUrl('http://192.168.0.113:9925/')).toBe('http://192.168.0.113:9925');
        expect(sanitizeMealieBaseUrl('https://mealie.example.com///')).toBe('https://mealie.example.com');
    });

    it('rejects unsupported or malformed base URLs', () => {
        expect(sanitizeMealieBaseUrl('ftp://mealie.example.com')).toBeUndefined();
        expect(sanitizeMealieBaseUrl('https://user:pass@mealie.example.com')).toBeUndefined();
        expect(sanitizeMealieBaseUrl('not a url')).toBeUndefined();
        expect(sanitizeMealieBaseUrl('')).toBeUndefined();
    });
});
