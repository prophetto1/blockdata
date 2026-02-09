import { createTheme } from '@mantine/core';
import type { CSSVariablesResolver, MantineColorsTuple } from '@mantine/core';

/**
 * Linear-inspired desaturated gray scale (cool-tinted, 10 shades).
 * Replaces Mantine's default warm-ish gray with a cooler, lower-saturation palette.
 */
const linearGray: MantineColorsTuple = [
  '#f8f9fa', // 0 — lightest bg
  '#f1f3f5', // 1
  '#e9ecef', // 2
  '#dee2e6', // 3
  '#ced4da', // 4
  '#adb5bd', // 5
  '#868e96', // 6
  '#495057', // 7
  '#343a40', // 8
  '#212529', // 9 — darkest
];

export const theme = createTheme({
  // Typography
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },

  // Geometry — tighter corners, Linear-style
  defaultRadius: 'sm',

  // Spacing — compressed 8px grid
  spacing: {
    xs: '0.25rem',  //  4px
    sm: '0.5rem',   //  8px
    md: '0.75rem',  // 12px
    lg: '1rem',     // 16px
    xl: '1.5rem',   // 24px
  },

  // Colors
  primaryColor: 'indigo',
  colors: {
    gray: linearGray,
  },

  // Custom tokens consumed by cssVariablesResolver
  other: {
    navbarBgLight: '#ffffff',
    navbarBgDark: '#1a1b1e',
    borderColorLight: '#e9ecef',
    borderColorDark: '#2c2e33',
    headerBorderLight: '#e9ecef',
    headerBorderDark: '#2c2e33',
  },
});

export const cssVariablesResolver: CSSVariablesResolver = (t) => ({
  variables: {},
  light: {
    '--mantine-color-navbar-bg': t.other.navbarBgLight as string,
    '--mantine-color-border': t.other.borderColorLight as string,
    '--mantine-color-header-border': t.other.headerBorderLight as string,
  },
  dark: {
    '--mantine-color-navbar-bg': t.other.navbarBgDark as string,
    '--mantine-color-border': t.other.borderColorDark as string,
    '--mantine-color-header-border': t.other.headerBorderDark as string,
  },
});
