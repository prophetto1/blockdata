import { Button, Container, createTheme } from '@mantine/core';
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

// Brand teal – derived from the logo turquoise (~#2DD4BF).
const teal: MantineColorsTuple = [
  '#f0fdfa',
  '#ccfbf1',
  '#99f6e4',
  '#5eead4',
  '#2dd4bf',
  '#14b8a6',
  '#0d9488',
  '#0f766e',
  '#115e59',
  '#134e4a',
];

export const theme = createTheme({
  fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",

  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },

  lineHeights: {
    xs: '1.5',
    sm: '1.6',
    md: '1.6',
    lg: '1.6',
    xl: '1.6',
  },

  headings: {
    fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.25rem', lineHeight: '1.2', fontWeight: '800' },
      h2: { fontSize: '2rem', lineHeight: '1.25', fontWeight: '700' },
      h3: { fontSize: '1.5rem', lineHeight: '1.3', fontWeight: '600' },
      h4: { fontSize: '1.25rem', lineHeight: '1.4', fontWeight: '600' },
      h5: { fontSize: '1rem', lineHeight: '1.5', fontWeight: '600' },
      h6: { fontSize: '0.875rem', lineHeight: '1.5', fontWeight: '600' },
    },
  },

  defaultRadius: 'md',

  primaryColor: 'zinc',
  colors: {
    zinc,
    teal,
    // Make "gray" align with the shadcn-neutral palette so surfaces/borders look consistent.
    gray: zinc,
  },

  components: {
    Container: Container.extend({
      defaultProps: {
        size: 'xl',
      },
      vars: () => ({
        root: {
          '--container-size': '1360px',
        },
      }),
    }),
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
    '--mantine-heading-font-weight': '700',
    '--app-shell-header-height': '48px',
    '--app-shell-navbar-width': '270px',
    '--app-shell-content-max-width': '1460px',
    '--app-shell-page-gap': 'var(--mantine-spacing-md)',
    '--app-shell-page-bottom-padding': 'var(--mantine-spacing-xl)',
    '--app-accent-assistant-glow': 'rgba(255, 77, 109, 0.25)',
    '--app-window-dot-danger': '#ef4444',
    '--app-window-dot-warning': '#f59e0b',
    '--app-window-dot-success': '#22c55e',
    '--app-window-dot-danger-soft': '#ff5f56',
    '--app-window-dot-warning-soft': '#ffbd2e',
    '--app-window-dot-success-soft': '#27c93f',
    '--app-code-pane-bg': '#14161b',
    '--app-code-pane-border': 'rgba(255,255,255,0.08)',
    '--app-code-pane-fg': 'rgba(255,255,255,0.88)',
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

    '--app-grid-background': '#ffffff',
    '--app-grid-chrome-background': '#ffffff',
    '--app-grid-foreground': '#09090b',
    '--app-grid-border': '#e4e4e7',
    '--app-grid-subtle-text': '#52525b',

    '--app-overlay-staged-bg': 'rgba(250, 176, 5, 0.14)',
    '--app-overlay-confirmed-bg': 'rgba(46, 189, 89, 0.12)',
    '--app-card-hover-shadow': '0 8px 24px rgba(0, 0, 0, 0.12)',
    '--app-marketing-demo-row-alt': 'rgba(9, 9, 11, 0.02)',
    '--app-marketing-demo-footer-bg': 'rgba(9, 9, 11, 0.03)',
    '--app-marketing-integration-hub-bg': 'rgba(32, 201, 151, 0.06)',
    '--app-left-rail-track-a': '#2b6cb0',
    '--app-left-rail-automation': '#2b6cb0',
    '--app-left-rail-link-hover': 'rgba(0, 0, 0, 0.04)',
    '--app-left-rail-link-active': 'rgba(0, 0, 0, 0.06)',
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

    '--app-grid-background': '#09090b',
    '--app-grid-chrome-background': '#09090b',
    '--app-grid-foreground': '#fafafa',
    '--app-grid-border': '#27272a',
    '--app-grid-subtle-text': '#a1a1aa',

    '--app-overlay-staged-bg': 'rgba(250, 176, 5, 0.14)',
    '--app-overlay-confirmed-bg': 'rgba(46, 189, 89, 0.12)',
    '--app-card-hover-shadow': '0 8px 24px rgba(0, 0, 0, 0.12)',
    '--app-marketing-demo-row-alt': 'rgba(255, 255, 255, 0.01)',
    '--app-marketing-demo-footer-bg': 'rgba(255, 255, 255, 0.02)',
    '--app-marketing-integration-hub-bg': 'rgba(32, 201, 151, 0.10)',
    '--app-left-rail-track-a': '#8cc6ff',
    '--app-left-rail-automation': '#8cc6ff',
    '--app-left-rail-link-hover': 'rgba(255, 255, 255, 0.05)',
    '--app-left-rail-link-active': 'rgba(255, 255, 255, 0.08)',
  },
});
