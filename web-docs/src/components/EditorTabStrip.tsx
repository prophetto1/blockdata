import { useState } from 'react';
import {
  DEFAULT_EDITOR_MODE,
  SHELL_EDITOR_MODE_EVENT,
  type EditorMode,
} from '../lib/docs/shell-state';

/**
 * EditorTabShell — contracted component.
 *
 * Owns the editor mode toggle (Source | Rich).
 * Broadcasts mode changes via SHELL_EDITOR_MODE_EVENT.
 * Placed inside WorkAreaStripShell (grid col 1).
 */

export default function EditorTabStrip() {
  const [mode, setMode] = useState<EditorMode>(DEFAULT_EDITOR_MODE);

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
