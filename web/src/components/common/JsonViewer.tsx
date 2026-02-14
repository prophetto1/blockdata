import { useCallback, useMemo } from 'react';
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useMantineColorScheme } from '@mantine/core';

interface JsonViewerProps {
  /** The value to display. Objects/arrays are serialized; strings are displayed as-is. */
  value: unknown;
  /** Maximum editor height in pixels. Defaults to 400. */
  maxHeight?: number;
  /** Minimum editor height in pixels. Defaults to 80. */
  minHeight?: number;
  /** Font size in pixels. Defaults to 13. */
  fontSize?: number;
}

/**
 * Read-only Monaco-based JSON viewer with syntax coloring and collapsible regions.
 * Automatically follows the app's dark/light color scheme.
 */
export function JsonViewer({
  value,
  maxHeight = 400,
  minHeight = 80,
  fontSize = 13,
}: JsonViewerProps) {
  const { colorScheme } = useMantineColorScheme();
  const theme = colorScheme === 'dark' ? 'blockdata-json-dark' : 'blockdata-json-light';

  const text = useMemo(() => {
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2) ?? '';
  }, [value]);

  // Compute height from line count, clamped between min and max.
  const lineCount = text.split('\n').length;
  const lineHeight = fontSize + 5; // Monaco default line height ~= fontSize * 1.35.
  const contentHeight = Math.min(maxHeight, Math.max(minHeight, lineCount * lineHeight + 16));

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme('blockdata-json-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '8ab4ff' },
        { token: 'string.value.json', foreground: 'a7f3d0' },
        { token: 'number', foreground: 'f5c16c' },
        { token: 'keyword.json', foreground: 'c4b5fd' },
      ],
      colors: {
        'editor.background': '#0b111b',
        'editor.foreground': '#e6edf3',
        'editor.selectionBackground': '#27415f',
        'editor.lineHighlightBackground': '#0b111b',
        'editorCursor.foreground': '#7dd3fc',
        'editorWhitespace.foreground': '#1f2937',
      },
    });

    monaco.editor.defineTheme('blockdata-json-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '1d4ed8' },
        { token: 'string.value.json', foreground: '0f766e' },
        { token: 'number', foreground: '92400e' },
        { token: 'keyword.json', foreground: '6d28d9' },
      ],
      colors: {
        'editor.background': '#f8fafc',
        'editor.foreground': '#0f172a',
        'editor.selectionBackground': '#dbeafe',
        'editor.lineHighlightBackground': '#f8fafc',
        'editorCursor.foreground': '#1d4ed8',
        'editorWhitespace.foreground': '#e2e8f0',
      },
    });
  }, []);

  const handleMount: OnMount = useCallback((editor) => {
    // Fold nothing by default; user can fold manually via gutter arrows.
    editor.updateOptions({ folding: true });
  }, []);

  return (
    <Editor
      height={contentHeight}
      language="json"
      value={text}
      theme={theme}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        lineNumbers: 'off',
        scrollBeyondLastLine: false,
        folding: true,
        renderLineHighlight: 'none',
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: { vertical: 'auto', horizontal: 'auto' },
        wordWrap: 'on',
        domReadOnly: true,
        contextmenu: false,
        padding: { top: 8, bottom: 8 },
      }}
      loading={<div style={{ padding: 8, fontFamily: 'monospace', fontSize }}>Loading...</div>}
    />
  );
}
