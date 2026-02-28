export const styleTokens = {
  shell: {
    headerHeight: 72,
    navbarWidth: 280,
    navbarCompactWidth: 60,
    assistantWidth: 360,
    mainPadding: 'md' as const,
    contentMaxWidth: 'var(--app-shell-content-max-width)',
    pageGap: 'var(--app-shell-page-gap)',
    pageBottomPadding: 'var(--app-shell-page-bottom-padding)',
  },
  grid: {
    light: {
      background: '#fafaf9',
      chromeBackground: '#ffffff',
      foreground: '#1c1917',
      border: '#e7e5e4',
      subtleText: '#78716c',
    },
    dark: {
      background: '#0e0e0e',
      chromeBackground: '#0e0e0e',
      foreground: '#eeeeee',
      border: '#2a2a2a',
      subtleText: '#a0a0a0',
    },
  },
  accents: {
    assistantGlow: 'var(--app-accent-assistant-glow)',
  },
  windowDots: {
    danger: 'var(--app-window-dot-danger)',
    warning: 'var(--app-window-dot-warning)',
    success: 'var(--app-window-dot-success)',
    dangerSoft: 'var(--app-window-dot-danger-soft)',
    warningSoft: 'var(--app-window-dot-warning-soft)',
    successSoft: 'var(--app-window-dot-success-soft)',
  },
  marketing: {
    heroPaddingTop: { base: 112, md: 146 },
    heroPaddingBottom: { base: 64, md: 96 },
    sectionPaddingX: { base: 'md', sm: 'lg', md: 'xl' },
    demoRowAlt: 'var(--app-marketing-demo-row-alt)',
    demoFooterBg: 'var(--app-marketing-demo-footer-bg)',
    integrationHubBackground: 'var(--app-marketing-integration-hub-bg)',
    codePaneBg: 'var(--app-code-pane-bg)',
    codePaneBorder: 'var(--app-code-pane-border)',
    codePaneFg: 'var(--app-code-pane-fg)',
  },
} as const;

export function marketingHeroGradient(options: {
  isDark: boolean;
  x: string;
  y: string;
  lightAlpha?: number;
  darkAlpha?: number;
  fadeStop?: number;
}) {
  const {
    isDark,
    x,
    y,
    lightAlpha = 0.03,
    darkAlpha = 0.06,
    fadeStop = 70,
  } = options;

  return isDark
    ? `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,${lightAlpha}) 0%, rgba(255,255,255,0) ${fadeStop}%)`
    : `radial-gradient(circle at ${x} ${y}, rgba(15,23,42,${darkAlpha}) 0%, rgba(15,23,42,0) ${fadeStop}%)`;
}
