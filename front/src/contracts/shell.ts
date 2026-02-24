import type { CSSProperties } from 'react'
import { COLOR_TOKEN_CONTRACT, tokenVar } from '@/contracts/colorTokens'

/**
 * Shell behavior contract. Values can be changed here without touching
 * layout/sidebar component code.
 */
export const SHELL_CONTRACT = {
  brand: {
    name: 'datablocks.run',
  },
  sidebar: {
    primary: {
      expandedWidth: '15.5rem',
      collapsedWidth: '3.5rem',
      mobileWidth: '18rem',
      collapsibleMode: 'icon' as const,
    },
    secondary: {
      width: '17rem',
      visibilityClassName: 'hidden lg:flex',
      collapsibleMode: 'none' as const,
    },
  },
  header: {
    expandedHeight: '4rem',
    collapsedHeight: '3rem',
  },
  content: {
    pagePaddingClassName: 'p-4',
  },
  aiPane: {
    snaps: {
      collapsed: '0rem',
      narrow: '22rem',
      wide: '30rem',
    },
    defaultSnap: 'narrow' as const,
  },
} as const

export const SHELL_PROVIDER_STYLE_CONTRACT: CSSProperties = {
  '--sidebar-width': SHELL_CONTRACT.sidebar.primary.expandedWidth,
  '--sidebar-width-icon': SHELL_CONTRACT.sidebar.primary.collapsedWidth,
} as CSSProperties

export const SHELL_HEADER_STYLE_CONTRACT: CSSProperties = {
  '--shell-header-height': SHELL_CONTRACT.header.expandedHeight,
  '--shell-header-height-collapsed': SHELL_CONTRACT.header.collapsedHeight,
  color: tokenVar(COLOR_TOKEN_CONTRACT.surface.foreground),
  backgroundColor: tokenVar(COLOR_TOKEN_CONTRACT.surface.background),
  borderColor: tokenVar(COLOR_TOKEN_CONTRACT.interaction.border),
} as CSSProperties

export const SHELL_SECONDARY_RAIL_STYLE_CONTRACT: CSSProperties = {
  '--sidebar-width': SHELL_CONTRACT.sidebar.secondary.width,
  color: tokenVar(COLOR_TOKEN_CONTRACT.sidebar.foreground),
  backgroundColor: tokenVar(COLOR_TOKEN_CONTRACT.sidebar.background),
  borderColor: tokenVar(COLOR_TOKEN_CONTRACT.sidebar.border),
} as CSSProperties
