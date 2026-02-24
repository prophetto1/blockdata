import type { CSSProperties } from 'react'

/**
 * Canonical token names shared by light/dark themes in tailwind.css.
 * Keep this as the contract source; values still come from CSS vars.
 */
export const COLOR_TOKEN_CONTRACT = {
  surface: {
    background: '--background',
    foreground: '--foreground',
    card: '--card',
    cardForeground: '--card-foreground',
    popover: '--popover',
    popoverForeground: '--popover-foreground',
  },
  intent: {
    primary: '--primary',
    primaryForeground: '--primary-foreground',
    secondary: '--secondary',
    secondaryForeground: '--secondary-foreground',
    accent: '--accent',
    accentForeground: '--accent-foreground',
    destructive: '--destructive',
    destructiveForeground: '--destructive-foreground',
  },
  interaction: {
    border: '--border',
    input: '--input',
    ring: '--ring',
  },
  sidebar: {
    background: '--sidebar',
    foreground: '--sidebar-foreground',
    primary: '--sidebar-primary',
    primaryForeground: '--sidebar-primary-foreground',
    accent: '--sidebar-accent',
    accentForeground: '--sidebar-accent-foreground',
    border: '--sidebar-border',
    ring: '--sidebar-ring',
  },
  chart: {
    one: '--chart-1',
    two: '--chart-2',
    three: '--chart-3',
    four: '--chart-4',
    five: '--chart-5',
  },
  typography: {
    fontSans: '"IBM Plex Sans", sans-serif',
  },
} as const

export function tokenVar(token: string) {
  return `var(${token})`
}

export const DEFAULT_APP_SURFACE_STYLE: CSSProperties = {
  color: tokenVar(COLOR_TOKEN_CONTRACT.surface.foreground),
  backgroundColor: tokenVar(COLOR_TOKEN_CONTRACT.surface.background),
}
