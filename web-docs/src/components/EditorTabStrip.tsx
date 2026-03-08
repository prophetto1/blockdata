import { useState } from 'react';

/**
 * EditorTabShell — contracted component.
 *
 * Owns the editor mode toggle (Source | Rich).
 * Broadcasts mode changes via CustomEvent('shell-editor-mode').
 * Placed inside WorkAreaStripShell (grid col 1).
 */

export type EditorMode = 'source' | 'rich';

export default function EditorTabStrip() {
  const [mode, setMode] = useState<EditorMode>('source');

  function switchMode(next: EditorMode) {
    setMode(next);
    window.dispatchEvent(new CustomEvent('shell-editor-mode', { detail: next }));
  }

  return (
    <div className="wa-strip__editor-tabs" data-shell="editor-tab-area">
      <button
        type="button"
        className="wa-strip__tab"
        aria-pressed={mode === 'source'}
        onClick={() => switchMode('source')}
      >
        Source
      </button>
      <button
        type="button"
        className="wa-strip__tab"
        aria-pressed={mode === 'rich'}
        onClick={() => switchMode('rich')}
      >
        Rich
      </button>
    </div>
  );
}
