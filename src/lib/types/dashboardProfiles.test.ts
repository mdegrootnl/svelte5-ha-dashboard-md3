import { describe, expect, it } from 'vitest';
import {
    createColumnProfilesFromColumns,
    createLayoutProfilesFromResponsiveLayout,
    profileToLegacyBreakpoint,
    resolveViewportProfile,
} from './dashboard';

describe('dashboard viewport profiles', () => {
    it('classifies iPhone 11 portrait and landscape separately', () => {
        expect(resolveViewportProfile({ width: 414, height: 896, coarsePointer: true })).toBe(
            'phonePortrait',
        );
        expect(resolveViewportProfile({ width: 896, height: 414, coarsePointer: true })).toBe(
            'phoneLandscape',
        );
    });

    it('classifies tablet portrait and landscape separately', () => {
        expect(resolveViewportProfile({ width: 834, height: 1112, coarsePointer: true })).toBe(
            'tabletPortrait',
        );
        expect(resolveViewportProfile({ width: 1112, height: 834, coarsePointer: true })).toBe(
            'tabletLandscape',
        );
    });

    it('keeps wide non-touch workstations in desktop edit mode', () => {
        expect(resolveViewportProfile({ width: 1440, height: 900, coarsePointer: false })).toBe(
            'desktopEdit',
        );
    });

    it('maps only desktop edit to the legacy desktop bucket', () => {
        expect(profileToLegacyBreakpoint('desktopEdit')).toBe('desktop');
        expect(profileToLegacyBreakpoint('tabletLandscape')).toBe('mobile');
        expect(profileToLegacyBreakpoint('phoneLandscape')).toBe('mobile');
    });

    it('derives profile layouts from old desktop/mobile config', () => {
        const profiles = createLayoutProfilesFromResponsiveLayout({
            desktop: { colStart: 3, colSpan: 6, rowStart: 4, rowSpan: 2 },
            mobile: { colStart: 1, colSpan: 2, rowStart: 7, rowSpan: 3 },
        });

        expect(profiles.phonePortrait).toEqual({ colStart: 1, colSpan: 2, rowStart: 7, rowSpan: 3 });
        expect(profiles.phoneLandscape).toEqual({ colStart: 1, colSpan: 2, rowStart: 7, rowSpan: 3 });
        expect(profiles.tabletPortrait).toEqual({ colStart: 1, colSpan: 2, rowStart: 7, rowSpan: 3 });
        expect(profiles.tabletLandscape).toEqual({ colStart: 3, colSpan: 6, rowStart: 4, rowSpan: 2 });
        expect(profiles.desktopEdit).toEqual({ colStart: 3, colSpan: 6, rowStart: 4, rowSpan: 2 });
    });

    it('derives profile columns from old desktop/mobile columns', () => {
        expect(createColumnProfilesFromColumns({ desktop: 12, mobile: 4 })).toEqual({
            phonePortrait: 4,
            phoneLandscape: 4,
            tabletPortrait: 4,
            tabletLandscape: 12,
            desktopEdit: 12,
        });
    });
});
