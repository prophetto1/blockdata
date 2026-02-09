import { Button, createTheme } from '@mantine/core';
import type { CSSVariablesResolver, MantineColorsTuple } from '@mantine/core';

// MantineHub (Shadcn-inspired) neutral palette (Zinc).
const zinc: MantineColorsTuple = [
  '#fafafa',
  '#f4f4f5',
  '#e4e4e7',
  '#d4d4d8',
  '#a1a1aa',
  '#71717a',
  '#52525b',
  '#3f3f46',
  '#27272a',
  '#09090b',
];

export const theme = createTheme({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    fontWeight: '600',
  },

  // Shadcn-like default radius (0.5rem-ish).
  defaultRadius: 'md',

  // Keep Mantine's standard container sizing to avoid unexpected "mobile" layouts
  // in existing pages that rely on `Container size="md" | "lg"` defaults.

  primaryColor: 'zinc',
  colors: {
    zinc,
    // Make "gray" align with the shadcn-neutral palette so surfaces/borders look consistent.
    gray: zinc,
  },

  components: {
    Button: Button.extend({
      vars: (_theme, props) => {
        const variant = props.variant ?? 'filled';
        // Only adjust the default (primary) filled button – respect explicit colors.
        if (variant !== 'filled' || props.color) return { root: {} };

        return {
          root: {
            '--button-color': 'var(--mantine-primary-color-contrast)',
          },
        };
      },
    }),
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--mantine-heading-font-weight': '600',
  },
  light: {
    '--mantine-color-body': '#ffffff',
    '--mantine-color-text': '#09090b',

    '--mantine-color-default': '#ffffff',
    '--mantine-color-default-hover': '#f4f4f5',
    '--mantine-color-default-color': '#09090b',
    '--mantine-color-default-border': '#e4e4e7',

    '--mantine-color-dimmed': '#52525b',
    '--mantine-color-placeholder': '#71717a',
    '--mantine-color-anchor': '#09090b',

    // Shadcn-like "primary" (black button in light mode).
    '--mantine-primary-color-filled': '#09090b',
    '--mantine-primary-color-filled-hover': '#18181b',
    '--mantine-primary-color-contrast': '#fafafa',
    '--mantine-primary-color-light': '#f4f4f5',
    '--mantine-primary-color-light-hover': '#e4e4e7',
    '--mantine-primary-color-light-color': '#09090b',
    '--mantine-primary-color-outline': '#09090b',
    '--mantine-primary-color-outline-hover': '#f4f4f5',
  },
  dark: {
    '--mantine-color-body': '#09090b',
    '--mantine-color-text': '#fafafa',

    '--mantine-color-default': '#09090b',
    '--mantine-color-default-hover': '#18181b',
    '--mantine-color-default-color': '#fafafa',
    '--mantine-color-default-border': '#27272a',

    '--mantine-color-dimmed': '#a1a1aa',
    '--mantine-color-placeholder': '#a1a1aa',
    '--mantine-color-anchor': '#fafafa',

    // Shadcn-like "primary" (white button in dark mode).
    '--mantine-primary-color-filled': '#fafafa',
    '--mantine-primary-color-filled-hover': '#e4e4e7',
    '--mantine-primary-color-contrast': '#09090b',
    '--mantine-primary-color-light': '#18181b',
    '--mantine-primary-color-light-hover': '#27272a',
    '--mantine-primary-color-light-color': '#fafafa',
    '--mantine-primary-color-outline': '#fafafa',
    '--mantine-primary-color-outline-hover': '#18181b',
  },
});
