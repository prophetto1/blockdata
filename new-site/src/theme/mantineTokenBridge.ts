import { createTheme, type CSSVariablesResolver } from '@mantine/core'

export const theme = createTheme({
  fontFamily: 'var(--font-family-sans)',
  fontFamilyMonospace: 'var(--font-family-mono)',
  defaultRadius: 'md',
  primaryColor: 'blue',
  fontSizes: {
    xs: 'var(--font-size-xs)',
    sm: 'var(--font-size-sm)',
    md: 'var(--font-size-md)',
    lg: 'var(--font-size-lg)',
    xl: 'var(--font-size-xl)',
  },
  lineHeights: {
    xs: 'var(--line-height-xs)',
    sm: 'var(--line-height-sm)',
    md: 'var(--line-height-md)',
    lg: 'var(--line-height-lg)',
    xl: 'var(--line-height-xl)',
  },
  spacing: {
    xs: 'var(--space-1)',
    sm: 'var(--space-2)',
    md: 'var(--space-3)',
    lg: 'var(--space-4)',
    xl: 'var(--space-6)',
  },
  radius: {
    xs: 'var(--radius-xs)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
  },
})

const mappedSurfaceVars = {
  '--mantine-color-body': 'var(--surface-canvas)',
  '--mantine-color-text': 'var(--text-primary)',
  '--mantine-color-default': 'var(--surface-secondary)',
  '--mantine-color-default-hover': 'var(--surface-tertiary)',
  '--mantine-color-default-color': 'var(--text-primary)',
  '--mantine-color-default-border': 'var(--border-default)',
  '--mantine-color-dimmed': 'var(--text-secondary)',
  '--mantine-color-placeholder': 'var(--text-muted)',
  '--mantine-color-anchor': 'var(--brand-primary)',
  '--mantine-color-error': 'var(--state-danger)',
  '--mantine-color-bright': 'var(--text-primary)',
  '--mantine-primary-color-filled': 'var(--brand-action)',
  '--mantine-primary-color-filled-hover': 'var(--brand-primary)',
  '--mantine-primary-color-contrast': 'var(--text-primary)',
  '--mantine-primary-color-light': 'color-mix(in srgb, var(--brand-action) 24%, transparent)',
  '--mantine-primary-color-light-hover': 'color-mix(in srgb, var(--brand-action) 34%, transparent)',
  '--mantine-primary-color-light-color': 'var(--text-primary)',
  '--mantine-primary-color-outline': 'var(--brand-primary)',
  '--mantine-primary-color-outline-hover': 'var(--surface-tertiary)',
}

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--mantine-font-family': 'var(--font-family-sans)',
    '--mantine-font-family-monospace': 'var(--font-family-mono)',
    '--mantine-heading-font-family': 'var(--font-family-sans)',
    '--mantine-radius-default': 'var(--radius-md)',
    '--mantine-primary-color-6': 'var(--brand-action)',
    '--mantine-focus-ring': 'var(--focus-ring)',
  },
  light: mappedSurfaceVars,
  dark: mappedSurfaceVars,
})
