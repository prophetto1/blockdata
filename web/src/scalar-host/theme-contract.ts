export const SCALAR_THEME_SYNC_EVENT = 'scalar-theme-sync';

export const SHELL_TOKEN_KEYS = [
  '--radius',
  '--app-font-sans',
  '--app-font-mono',
  '--background',
  '--card',
  '--card-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--foreground',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--popover',
  '--popover-foreground',
  '--border',
  '--input',
  '--ring',
  '--primary',
  '--primary-foreground',
  '--destructive',
  '--destructive-foreground',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-border',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
] as const;

export type ShellTokenKey = (typeof SHELL_TOKEN_KEYS)[number];
export type ScalarThemeMode = 'dark' | 'light';

export type ScalarThemeSyncMessage = {
  type: typeof SCALAR_THEME_SYNC_EVENT;
  mode: ScalarThemeMode;
  tokens: Partial<Record<ShellTokenKey, string>>;
};

export const SHELL_TO_SCALAR_TOKEN_MAP = [
  ['--radius', '--scalar-radius'],
  ['--radius', '--scalar-radius-lg'],
  ['--radius', '--scalar-radius-xl'],
  ['--app-font-sans', '--scalar-font'],
  ['--app-font-mono', '--scalar-font-code'],
  ['--background', '--scalar-background-1'],
  ['--card', '--scalar-background-2'],
  ['--secondary', '--scalar-background-3'],
  ['--muted', '--scalar-background-4'],
  ['--foreground', '--scalar-color-1'],
  ['--card-foreground', '--scalar-color-1'],
  ['--muted-foreground', '--scalar-color-2'],
  ['--secondary-foreground', '--scalar-color-2'],
  ['--accent-foreground', '--scalar-color-3'],
  ['--accent', '--scalar-background-accent'],
  ['--popover', '--scalar-tooltip-background'],
  ['--popover-foreground', '--scalar-tooltip-color'],
  ['--border', '--scalar-border-color'],
  ['--input', '--scalar-sidebar-search-border-color'],
  ['--ring', '--scalar-color-accent'],
  ['--primary', '--scalar-color-accent'],
  ['--primary', '--scalar-button-1'],
  ['--primary-foreground', '--scalar-button-1-color'],
  ['--primary', '--scalar-link-color'],
  ['--primary', '--scalar-link-color-hover'],
  ['--destructive', '--scalar-color-red'],
  ['--destructive', '--scalar-color-danger'],
  ['--destructive', '--scalar-background-danger'],
  ['--sidebar', '--scalar-sidebar-background-1'],
  ['--sidebar-foreground', '--scalar-sidebar-color-1'],
  ['--muted-foreground', '--scalar-sidebar-color-2'],
  ['--sidebar-border', '--scalar-sidebar-border-color'],
  ['--sidebar-accent', '--scalar-sidebar-item-hover-background'],
  ['--sidebar-accent', '--scalar-sidebar-item-active-background'],
  ['--sidebar-accent-foreground', '--scalar-sidebar-item-hover-color'],
  ['--sidebar-foreground', '--scalar-sidebar-color-active'],
  ['--sidebar-accent', '--scalar-sidebar-search-background'],
  ['--sidebar-border', '--scalar-sidebar-search-border-color'],
  ['--muted-foreground', '--scalar-sidebar-search-color'],
] as const;
