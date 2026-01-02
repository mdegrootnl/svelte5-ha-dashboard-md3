import {
    argbFromHex,
    hexFromArgb,
    themeFromSourceColor,
    applyTheme,
    Blend,
    sourceColorFromImage,
    type Theme
} from '@material/material-color-utilities';
import { browser } from '$app/environment';

export class ThemeStore {
    // Source color for the theme (default: M3 Blue)
    sourceColor = $state('#6750A4');
    // Dark mode toggle
    isDark = $state(false);

    // Derived theme object using material-color-utilities
    theme = $derived.by(() => {
        const argb = argbFromHex(this.sourceColor);
        return themeFromSourceColor(argb);
    });

    constructor() {
        // Effect to apply variables to the document root
        $effect.root(() => {
            $effect(() => {
                if (!browser) return;
                this.applyToDocument();
            });
        });
    }

    async setSourceFromImage(image: HTMLImageElement) {
        const argb = await sourceColorFromImage(image);
        this.sourceColor = hexFromArgb(argb);
    }

    // Apply the current theme to CSS variables
    private applyToDocument() {
        const scheme = this.isDark ? this.theme.schemes.dark : this.theme.schemes.light;
        const root = document.documentElement;

        // Toggle dark class for Tailwind dark mode
        if (this.isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Sets a CSS variable, e.g. --color-m3-primary
        const set = (name: string, argb: number) => {
            root.style.setProperty(`--color-m3-${name}`, hexFromArgb(argb));
        };

        // Core Palette
        set('primary', scheme.primary);
        set('on-primary', scheme.onPrimary);
        set('primary-container', scheme.primaryContainer);
        set('on-primary-container', scheme.onPrimaryContainer);

        set('secondary', scheme.secondary);
        set('on-secondary', scheme.onSecondary);
        set('secondary-container', scheme.secondaryContainer);
        set('on-secondary-container', scheme.onSecondaryContainer);

        set('tertiary', scheme.tertiary);
        set('on-tertiary', scheme.onTertiary);
        set('tertiary-container', scheme.tertiaryContainer);
        set('on-tertiary-container', scheme.onTertiaryContainer);

        set('error', scheme.error);
        set('on-error', scheme.onError);
        set('error-container', scheme.errorContainer);
        set('on-error-container', scheme.onErrorContainer);

        set('background', scheme.background);
        set('on-background', scheme.onBackground);

        set('surface', scheme.surface);
        set('on-surface', scheme.onSurface);
        set('surface-variant', scheme.surfaceVariant);
        set('on-surface-variant', scheme.onSurfaceVariant);

        set('outline', scheme.outline);
        set('outline-variant', scheme.outlineVariant);

        set('inverse-surface', scheme.inverseSurface);
        set('inverse-on-surface', scheme.inverseOnSurface);
        set('inverse-primary', scheme.inversePrimary);

        // Surface Containers (Manual mapping from Palettes as they might be missing in Scheme)
        const neutral = this.theme.palettes.neutral;

        if (this.isDark) {
            // Dark Mode Tones with Contrast Boost & Surface Tinting
            // Tinting mimics MD3 elevation overlay by blending Primary into Surface
            const primaryArg = scheme.primary;
            const tint = (tone: number) => Blend.cam16Ucs(neutral.tone(tone), primaryArg, 0.05); // 5% Primary Blend

            set('surface-container-lowest', tint(4));  // Base is 4
            set('surface-container-low', tint(11));    // Base was 10 -> Boost to 11
            set('surface-container', tint(14));        // Base was 12 -> Boost to 14
            set('surface-container-high', tint(19));   // Base was 17 -> Boost to 19
            set('surface-container-highest', tint(24)); // Base was 22 -> Boost to 24
        } else {
            // Light Mode Tones
            set('surface-container-lowest', neutral.tone(100));
            set('surface-container-low', neutral.tone(96));
            set('surface-container', neutral.tone(94));
            set('surface-container-high', neutral.tone(92));
            set('surface-container-highest', neutral.tone(90));
        }
    }
}

// Global instance
export const themeStore = new ThemeStore();
