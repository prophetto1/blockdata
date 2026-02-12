import { useCallback, useMemo } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
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
  const theme = colorScheme === 'dark' ? 'vs-dark' : 'light';

  const text = useMemo(() => {
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2) ?? '';
  }, [value]);

  // Compute height from line count, clamped between min and max
  const lineCount = text.split('\n').length;
  const lineHeight = fontSize + 5; // Monaco default line height ≈ fontSize * 1.35
  const contentHeight = Math.min(maxHeight, Math.max(minHeight, lineCount * lineHeight + 16));

  const handleMount: OnMount = useCallback((editor) => {
    // Fold nothing by default — user can fold manually via gutter arrows
    editor.updateOptions({ folding: true });
  }, []);

  return (
    <Editor
      height={contentHeight}
      language="json"
      value={text}
      theme={theme}
      onMount={handleMount}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize,
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
