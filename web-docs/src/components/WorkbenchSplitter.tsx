import SplitEditorView from './SplitEditorView.tsx';
import '../styles/splitter.css';

/**
 * WorkbenchSplitter — filetree-mode editor shell.
 *
 * Hidden via CSS when shell-mode !== 'filetree'.
 * The docs page itself remains the preview surface for the app.
 * Filetree mode now shows only the editing workbench.
 */
export default function WorkbenchSplitter() {
  return (
    <div className="wa-splitter wa-splitter--editor-only" data-shell="editor-workbench">
      <div className="wa-splitter__panel wa-splitter__panel--editor" data-shell="editor-column">
        <div className="wa-splitter__panel-body">
          <SplitEditorView />
        </div>
      </div>
    </div>
  );
}
