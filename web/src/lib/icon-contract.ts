export const ICON_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
} as const;

export type IconSizeToken = keyof typeof ICON_SIZES;

/**
 * Semantic icon contexts.
 * Use context first; only pass explicit size when you need a deliberate override.
 */
export const ICON_CONTEXT_SIZE = {
  inline: 'sm',
  content: 'md',
  utility: 'md',
  nav: 'lg',
  hero: 'xl',
} as const;

export type IconContextToken = keyof typeof ICON_CONTEXT_SIZE;

export const ICON_STROKES = {
  light: 1.6,
  regular: 1.8,
  strong: 2.1,
} as const;

export type IconStrokeToken = keyof typeof ICON_STROKES;

export const ICON_TONE_CLASS = {
  current: '',
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  accent: 'text-primary',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
} as const;

export type IconToneToken = keyof typeof ICON_TONE_CLASS;

export const ICON_STANDARD = {
  defaultContext: 'content',
  defaultSize: 'md',
  note: 'Use AppIcon with context tokens only.',
  migrationStatus: 'Hugeicons migration in progress',
  utilityTopRight: {
    context: 'utility',
    stroke: 'regular',
    tone: 'muted',
    buttonClass:
      'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  },
} as const;
