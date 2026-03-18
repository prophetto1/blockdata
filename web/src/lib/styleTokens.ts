export const styleTokens = {
  shell: {
    headerHeight: 60,
    headerHeightMobile: 44,
    navbarWidth: 220,
    navbarCompactWidth: 60,
    navbarMobileWidth: 200,
    navbarMinWidth: 220,
    navbarMaxWidth: 350,
    rightRailWidth: 350,
    assistantWidth: 360,
    mainPadding: 'md' as const,
    contentMaxWidth: 'var(--app-shell-content-max-width)',
    pageGap: 'var(--app-shell-page-gap)',
    pageBottomPadding: 'var(--app-shell-page-bottom-padding)',
  },
  grid: {
    light: {
      background: '#ffffff',
      chromeBackground: '#faf9f7',
      foreground: '#1c1917',
      border: '#d6d3d1',
      subtleText: '#78716c',
    },
    dark: {
      background: '#09090b',
      chromeBackground: '#09090b',
      foreground: '#fafafa',
      border: '#27272a',
      subtleText: '#a1a1aa',
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
  adminConfig: {
    railBackground: 'var(--admin-config-rail-bg)',
    railBorder: 'var(--admin-config-rail-border)',
    frameBackground: 'var(--admin-config-frame-bg)',
    headerBackground: 'var(--admin-config-header-bg)',
    contentBackground: 'var(--admin-config-content-bg)',
    status: {
      success: {
        background: 'var(--admin-config-status-success-bg)',
        border: 'var(--admin-config-status-success-border)',
        foreground: 'var(--admin-config-status-success-fg)',
      },
      error: {
        background: 'var(--admin-config-status-error-bg)',
        border: 'var(--admin-config-status-error-border)',
        foreground: 'var(--admin-config-status-error-fg)',
      },
    },
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
  admin: {
    navWidth: 200,
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
