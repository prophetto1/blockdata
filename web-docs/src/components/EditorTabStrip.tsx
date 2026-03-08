import { useState } from 'react';
import { SHELL_EDITOR_MODE_EVENT } from '../lib/docs/shell-state';

/**
 * EditorTabShell — contracted component.
 *
 * Owns the editor mode toggle (Source | Rich).
 * Broadcasts mode changes via SHELL_EDITOR_MODE_EVENT.
 * Placed inside WorkAreaStripShell (grid col 1).
 */

export type EditorMode = 'source' | 'rich';

export default function EditorTabStrip() {
  const [mode, setMode] = useState<EditorMode>('rich');

  function switchMode(next: EditorMode) {
    setMode(next);
    window.dispatchEvent(new CustomEvent(SHELL_EDITOR_MODE_EVENT, { detail: next }));
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
