import { Splitter } from '@ark-ui/react/splitter';
import { ScrollArea } from '@ark-ui/react/scroll-area';
import { useEffect, useRef, useState } from 'react';
import EditorTabStrip from './EditorTabStrip.tsx';
import SplitEditorView from './SplitEditorView.tsx';
import '../styles/splitter.css';
import '../styles/scroll-area.css';

const SPLIT_RATIO_KEY = 'shell-split-ratio';
const MIN_PANEL_PCT = 20;

function getSavedSize(): number[] {
  try {
    const saved = localStorage.getItem(SPLIT_RATIO_KEY);
    if (saved) {
      const pct = parseFloat(saved);
      if (pct >= MIN_PANEL_PCT && pct <= 100 - MIN_PANEL_PCT) {
        return [pct, 100 - pct];
      }
    }
  } catch {}
  return [50, 50];
}

/**
 * WorkbenchSplitter — filetree-mode editor/preview split.
 *
 * Hidden via CSS when shell-mode !== 'filetree'.
 * Does NOT adopt DOM from .wa-preview. The preview panel is
 * an independent container targeted by the inline preview scripts
 * via [data-shell="preview-column"]. Both .wa-preview and this
 * panel carry the attribute; CSS ensures only one is visible at a time.
 */
function extractRepoPreviewMarkup(source: Element): string {
  const scratch = document.createElement('div');
  scratch.innerHTML = source.innerHTML;
  const firstChild = scratch.firstElementChild;
  const secondChild = firstChild?.nextElementSibling;
  if (
    firstChild?.classList?.contains('content-panel') &&
    secondChild?.classList?.contains('content-panel')
  ) {
    firstChild.remove();
  }
  return scratch.innerHTML;
}

export default function WorkbenchSplitter() {
  const [defaultSize] = useState(getSavedSize);
  const previewRef = useRef<HTMLDivElement>(null);

  // After mount (hydration complete), adopt the page content from .wa-preview
  // into the splitter preview panel. This must happen in React (not an inline
  // script) to avoid injecting content before hydration and causing a mismatch.
  useEffect(() => {
    const target = previewRef.current;
    if (!target || target.innerHTML.trim()) return;
    const source = document.querySelector('.wa-preview[data-shell="preview-column"]');
    if (!source) return;
    target.innerHTML = extractRepoPreviewMarkup(source);
  }, []);

  return (
    <Splitter.Root
      className="wa-splitter"
      orientation="horizontal"
      panels={[
        { id: 'editor', minSize: MIN_PANEL_PCT },
        { id: 'preview', minSize: MIN_PANEL_PCT },
      ]}
      defaultSize={defaultSize}
      onResizeEnd={({ size }) => {
        try {
          localStorage.setItem(SPLIT_RATIO_KEY, String(size[0]));
        } catch {}
      }}
    >
      <Splitter.Panel id="editor" className="wa-splitter__panel" data-shell="editor-column">
        <div className="wa-splitter__panel-header">
          <EditorTabStrip />
        </div>
        <div className="wa-splitter__panel-body">
          <SplitEditorView />
        </div>
      </Splitter.Panel>

      <Splitter.ResizeTrigger
        id="editor:preview"
        className="wa-splitter__trigger"
        aria-label="Resize editor and preview"
      />

      <Splitter.Panel id="preview" className="wa-splitter__panel">
        <div className="wa-splitter__panel-header">
          <span className="wa-strip__label">Preview</span>
        </div>
        <ScrollArea.Root className="scroll-area-root wa-splitter__panel-body">
          <ScrollArea.Viewport className="scroll-area-viewport">
            <ScrollArea.Content>
              <div ref={previewRef} data-shell="splitter-preview" className="wa-splitter__preview-content" />
            </ScrollArea.Content>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="scroll-area-scrollbar">
            <ScrollArea.Thumb className="scroll-area-thumb" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </Splitter.Panel>
    </Splitter.Root>
  );
}
