/**
 * Font contract — single source of truth for typography tokens.
 *
 * CSS custom properties live in tailwind.css (:root).
 * This file exposes the same values to TypeScript so the superadmin
 * Design Standards page can render a live preview.
 */

export const FONT_FAMILIES = {
  sans: {
    stack: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    label: 'IBM Plex Sans',
    cssVar: '--app-font-sans',
    use: 'All UI text, headings, nav, labels, body copy',
  },
  mono: {
    stack: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
    label: 'JetBrains Mono',
    cssVar: '--app-font-mono',
    use: 'Code blocks, data grid cells, JSON values, IDs, hashes, technical identifiers',
  },
} as const;

export type FontFamilyToken = keyof typeof FONT_FAMILIES;

/**
 * Size scale — maps token names to rem values.
 * Tailwind `text-{token}` classes use these via @theme inline.
 * Sizes below `xs` (micro tier) exist for dense data UIs only.
 */
export const FONT_SIZES = {
  '2xs': { rem: '0.625rem', px: 10, note: 'Grid cells, dense badges' },
  xs: { rem: '0.75rem', px: 12, note: 'Captions, labels, helper text' },
  sm: { rem: '0.875rem', px: 14, note: 'Body small, secondary text' },
  base: { rem: '1rem', px: 16, note: 'Body, nav items' },
  lg: { rem: '1.125rem', px: 18, note: 'Subheadings, nav strong' },
  xl: { rem: '1.25rem', px: 20, note: 'Section headings' },
  '2xl': { rem: '1.5rem', px: 24, note: 'Page titles' },
  '3xl': { rem: '1.875rem', px: 30, note: 'Marketing headings' },
  '4xl': { rem: '2.25rem', px: 36, note: 'Hero headings' },
} as const;

export type FontSizeToken = keyof typeof FONT_SIZES;

export const FONT_WEIGHTS = {
  normal: { value: 400, note: 'Body text' },
  medium: { value: 500, note: 'Labels, nav items' },
  semibold: { value: 600, note: 'Subheadings, card titles' },
  bold: { value: 700, note: 'Page headings' },
} as const;

export type FontWeightToken = keyof typeof FONT_WEIGHTS;

export const FONT_STANDARD = {
  primaryFamily: 'IBM Plex Sans',
  monoFamily: 'JetBrains Mono',
  note: 'Use font-sans for all UI. Use font-mono for code, data cells, and technical values.',
} as const;

/**
 * Usage recipes — maps common UI contexts to exact Tailwind classes.
 * The Design Standards preview renders each recipe as a live sample.
 */
export const FONT_RECIPES = [
  {
    context: 'Page title',
    classes: 'text-2xl font-bold',
    sample: 'Schema Library',
    family: 'sans' as FontFamilyToken,
  },
  {
    context: 'Section heading',
    classes: 'text-xl font-semibold',
    sample: 'Upload Settings',
    family: 'sans' as FontFamilyToken,
  },
  {
    context: 'Card title',
    classes: 'text-sm font-semibold',
    sample: 'worker.max_tokens_per_call',
    family: 'sans' as FontFamilyToken,
  },
  {
    context: 'Body text',
    classes: 'text-sm font-normal',
    sample: 'Configure how the extraction worker processes blocks across your documents.',
    family: 'sans' as FontFamilyToken,
  },
  {
    context: 'Nav item',
    classes: 'text-sm font-medium',
    sample: 'Design Standards',
    family: 'sans' as FontFamilyToken,
  },
  {
    context: 'Label / caption',
    classes: 'text-xs font-medium text-muted-foreground',
    sample: 'Last updated 2 hours ago',
    family: 'sans' as FontFamilyToken,
  },
  {
    context: 'Section label (uppercase)',
    classes: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
    sample: 'Superuser',
    family: 'sans' as FontFamilyToken,
  },
  {
    context: 'Badge / pill',
    classes: 'text-xs font-medium',
    sample: 'boolean',
    family: 'sans' as FontFamilyToken,
  },
  {
    context: 'Data cell (mono)',
    classes: 'text-xs',
    sample: 'conv_abc123:7',
    family: 'mono' as FontFamilyToken,
  },
  {
    context: 'Code / JSON key (mono)',
    classes: 'text-xs',
    sample: '{ "schema_ref": "legal-citation-v2" }',
    family: 'mono' as FontFamilyToken,
  },
  {
    context: 'Dense grid cell',
    classes: 'text-2xs',
    sample: '2026-02-27T18:00:00Z',
    family: 'mono' as FontFamilyToken,
  },
] as const;