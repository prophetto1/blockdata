/**
 * Custom CodeMirror 6 theme that integrates with app design tokens.
 *
 * Uses CSS custom properties (--background, --card, --foreground, etc.) so the
 * editor chrome blends with the surrounding UI in both light and dark modes.
 * Syntax highlighting colors are inherited from oneDark's highlight style,
 * which provides good contrast on both light and dark backgrounds.
 */
import { EditorView } from 'codemirror';
import { type Extension } from '@codemirror/state';
import { syntaxHighlighting } from '@codemirror/language';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';

/**
 * Editor chrome theme — backgrounds, gutters, selection, cursor.
 * All values reference CSS custom properties so they respond to theme changes.
 */
const appEditorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--card)',
      color: 'var(--foreground)',
    },
    '.cm-content': {
      caretColor: 'var(--foreground)',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--foreground)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
    },
    '.cm-panels': {
      backgroundColor: 'var(--card)',
      color: 'var(--foreground)',
    },
    '.cm-panels.cm-panels-top': {
      borderBottomColor: 'var(--border)',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTopColor: 'var(--border)',
    },
    '.cm-searchMatch': {
      backgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
      outline: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'color-mix(in srgb, var(--primary) 35%, transparent)',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in srgb, var(--muted) 50%, transparent)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)',
    },
    '.cm-matchingBracket, .cm-nonmatchingBracket': {
      backgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
      outline: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--card)',
      color: 'var(--muted-foreground)',
      borderRightColor: 'var(--border)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'color-mix(in srgb, var(--muted) 50%, transparent)',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'var(--muted-foreground)',
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--popover)',
      color: 'var(--popover-foreground)',
      border: '1px solid var(--border)',
    },
    '.cm-tooltip .cm-tooltip-arrow::before': {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    '.cm-tooltip .cm-tooltip-arrow::after': {
      borderTopColor: 'var(--popover)',
      borderBottomColor: 'var(--popover)',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-foreground)',
      },
    },
  },
  { dark: false },
);

/**
 * Combined extension: app-themed chrome + oneDark syntax highlighting.
 *
 * The chrome theme uses CSS variables, so it works in both light and dark
 * modes without needing separate extensions. The syntax highlight colors
 * from oneDark provide good readability on both backgrounds.
 */
export const appCodeMirrorTheme: Extension = [
  appEditorTheme,
  syntaxHighlighting(oneDarkHighlightStyle),
];
