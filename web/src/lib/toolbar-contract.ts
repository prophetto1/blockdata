/**
 * Toolbar button contract — single source of truth for toolbox strip buttons.
 *
 * Toolbar buttons are the toggle/action buttons inside toolbox strips
 * (Schema view toggles, FlowWorkbench panel buttons, MCP filters, etc.).
 *
 * The Design Standards page renders a live preview from these tokens.
 */

export const TOOLBAR_BUTTON = {
  height: 'h-7',
  px: 'px-2',
  gap: 'gap-1.5',
  fontSize: 'text-xs',
  fontWeight: 'font-medium',
  lineHeight: 'leading-4',
  radius: 'rounded-md',
  border: 'border',
  transition: 'transition-colors',
  press: 'active:scale-[0.97]',
  iconContext: 'inline',
} as const;

export const TOOLBAR_BUTTON_STATES = {
  active: 'border-border bg-background text-foreground',
  inactive: 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
} as const;

export const TOOLBAR_STRIP = {
  layout: 'flex flex-wrap items-center',
  gap: 'gap-1',
  padding: 'p-2',
  background: 'bg-card',
  border: 'border border-border rounded-md',
  groupGap: 'gap-2',
} as const;

/**
 * Base class string for a toolbar button (no state).
 * Combine with TOOLBAR_BUTTON_STATES.active or .inactive.
 */
export const TOOLBAR_BUTTON_BASE = [
  'inline-flex items-center',
  TOOLBAR_BUTTON.height,
  TOOLBAR_BUTTON.px,
  TOOLBAR_BUTTON.gap,
  TOOLBAR_BUTTON.fontSize,
  TOOLBAR_BUTTON.fontWeight,
  TOOLBAR_BUTTON.lineHeight,
  TOOLBAR_BUTTON.radius,
  TOOLBAR_BUTTON.border,
  TOOLBAR_BUTTON.transition,
  TOOLBAR_BUTTON.press,
].join(' ');