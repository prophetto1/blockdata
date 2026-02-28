/**
 * Color contract — documents the day/night token pairs.
 *
 * Actual values live in tailwind.css as CSS custom properties.
 * This file exposes them to TypeScript so the superadmin
 * Design Standards page can render a live comparison.
 */

export type ColorPair = {
  dark: string;
  light: string;
  cssVar: string;
  note: string;
};

export const SURFACE_TOKENS: Record<string, ColorPair> = {
  background: {
    dark: '#0e0e0e',
    light: '#faf9f7',
    cssVar: '--background',
    note: 'Page background',
  },
  chrome: {
    dark: '#0e0e0e',
    light: '#f2f1ef',
    cssVar: '--chrome',
    note: 'Header + sidebar surface',
  },
  card: {
    dark: '#141414',
    light: '#ffffff',
    cssVar: '--card',
    note: 'Card / elevated surface',
  },
  secondary: {
    dark: '#1a1a1a',
    light: '#f0eeed',
    cssVar: '--secondary',
    note: 'Secondary surface (pills, tags)',
  },
  muted: {
    dark: '#1a1a1a',
    light: '#e8e6e3',
    cssVar: '--muted',
    note: 'Muted / disabled surface',
  },
  accent: {
    dark: '#1a1a1a',
    light: '#f5ebe6',
    cssVar: '--accent',
    note: 'Accent surface (warm tint)',
  },
  popover: {
    dark: '#141414',
    light: '#ffffff',
    cssVar: '--popover',
    note: 'Dropdown / popover surface',
  },
};

export const TEXT_TOKENS: Record<string, ColorPair> = {
  foreground: {
    dark: '#eeeeee',
    light: '#1c1917',
    cssVar: '--foreground',
    note: 'Primary text',
  },
  'muted-foreground': {
    dark: '#a0a0a0',
    light: '#44403c',
    cssVar: '--muted-foreground',
    note: 'Secondary / helper text',
  },
  'card-foreground': {
    dark: '#eeeeee',
    light: '#1c1917',
    cssVar: '--card-foreground',
    note: 'Text on card surface',
  },
  'secondary-foreground': {
    dark: '#eeeeee',
    light: '#292524',
    cssVar: '--secondary-foreground',
    note: 'Text on secondary surface',
  },
};

export const BORDER_TOKENS: Record<string, ColorPair> = {
  border: {
    dark: '#2a2a2a',
    light: '#d6d3d1',
    cssVar: '--border',
    note: 'Default border',
  },
  input: {
    dark: '#2a2a2a',
    light: '#d6d3d1',
    cssVar: '--input',
    note: 'Form input border',
  },
  'sidebar-border': {
    dark: '#2a2a2a',
    light: '#d6d3d1',
    cssVar: '--sidebar-border',
    note: 'Sidebar dividers',
  },
};

export const BRAND_TOKENS: Record<string, ColorPair> = {
  primary: {
    dark: '#EB5E41',
    light: '#EB5E41',
    cssVar: '--primary',
    note: 'Brand primary (same both modes)',
  },
  'primary-foreground': {
    dark: '#ffffff',
    light: '#ffffff',
    cssVar: '--primary-foreground',
    note: 'Text on primary',
  },
  ring: {
    dark: '#EB5E41',
    light: '#EB5E41',
    cssVar: '--ring',
    note: 'Focus ring',
  },
  destructive: {
    dark: '#dc2626',
    light: '#dc2626',
    cssVar: '--destructive',
    note: 'Error / destructive action',
  },
};

export const ADMIN_CONFIG_TOKENS: Record<string, ColorPair> = {
  'admin-config-rail-bg': {
    dark: '#101113',
    light: '#ffffff',
    cssVar: '--admin-config-rail-bg',
    note: 'Second rail background for settings/admin pages.',
  },
  'admin-config-rail-border': {
    dark: '#2a2a2a',
    light: '#e8e5e3',
    cssVar: '--admin-config-rail-border',
    note: 'Second rail divider/border color.',
  },
  'admin-config-frame-bg': {
    dark: '#141414',
    light: '#ffffff',
    cssVar: '--admin-config-frame-bg',
    note: 'Admin config frame/card surface.',
  },
  'admin-config-header-bg': {
    dark: '#181818',
    light: '#f5f3f1',
    cssVar: '--admin-config-header-bg',
    note: 'Admin config section header surface.',
  },
  'admin-config-content-bg': {
    dark: '#0f0f10',
    light: '#faf9f7',
    cssVar: '--admin-config-content-bg',
    note: 'Scrollable content area background inside admin config frame.',
  },
  'admin-config-status-success-bg': {
    dark: 'rgba(34, 197, 94, 0.16)',
    light: 'rgba(22, 163, 74, 0.12)',
    cssVar: '--admin-config-status-success-bg',
    note: 'Success status banner background.',
  },
  'admin-config-status-success-border': {
    dark: 'rgba(34, 197, 94, 0.40)',
    light: 'rgba(22, 163, 74, 0.38)',
    cssVar: '--admin-config-status-success-border',
    note: 'Success status banner border.',
  },
  'admin-config-status-success-fg': {
    dark: '#86efac',
    light: '#166534',
    cssVar: '--admin-config-status-success-fg',
    note: 'Success status banner text/icon color.',
  },
  'admin-config-status-error-bg': {
    dark: 'rgba(220, 38, 38, 0.18)',
    light: 'rgba(220, 38, 38, 0.10)',
    cssVar: '--admin-config-status-error-bg',
    note: 'Error status banner background.',
  },
  'admin-config-status-error-border': {
    dark: 'rgba(248, 113, 113, 0.42)',
    light: 'rgba(220, 38, 38, 0.32)',
    cssVar: '--admin-config-status-error-border',
    note: 'Error status banner border.',
  },
  'admin-config-status-error-fg': {
    dark: '#fca5a5',
    light: '#b91c1c',
    cssVar: '--admin-config-status-error-fg',
    note: 'Error status banner text/icon color.',
  },
};

export const COLOR_CONTRACT_GROUPS = [
  { label: 'Surfaces', tokens: SURFACE_TOKENS },
  { label: 'Text', tokens: TEXT_TOKENS },
  { label: 'Borders', tokens: BORDER_TOKENS },
  { label: 'Brand & Status', tokens: BRAND_TOKENS },
  { label: 'Admin Config', tokens: ADMIN_CONFIG_TOKENS },
] as const;
