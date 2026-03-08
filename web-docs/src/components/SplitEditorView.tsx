import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_EDITOR_MODE,
  FILE_STORAGE_KEY,
  SHELL_EDITOR_MODE_EVENT,
  SHELL_PREVIEW_REFRESH_EVENT,
  onFileReset,
  onFileSelect,
  resetSelectedFile,
  type EditorMode,
  type ShellFileInfo,
} from '../lib/docs/shell-state';
import { getLocalFileHandle } from '../lib/docs/local-file-handles';

declare global {
  interface FileSystemWritableFileStream {
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }
  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }
}

type SaveResult = { ok: boolean; error?: string };
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
type ResolvedTheme = 'light' | 'dark';
type MonacoEditorModule = typeof import('@monaco-editor/react');
type MDXEditorModule = typeof import('@mdxeditor/editor');
type ModuleLoadState = 'idle' | 'loading' | 'ready' | 'failed';

type LoadableFileInfo = ShellFileInfo & {
  sourceKind: 'repo' | 'local';
  docsHref: string | undefined;
};

function getExtension(path: string) {
  const base = path.split(/[\\/]/).at(-1) ?? '';
  const dot = base.lastIndexOf('.');
  if (dot < 0) return '';
  return base.slice(dot).toLowerCase();
}

type LoadPreviewEvent = {
  sourceKind: 'repo' | 'local';
  extension?: string;
  content?: string;
  filePath?: string;
  docsHref?: string;
  reason?: 'load' | 'save';
};

function readResolvedTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function useResolvedTheme() {
  const [theme, setTheme] = useState<ResolvedTheme>(readResolvedTheme);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(readResolvedTheme());
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((next: SaveStatus) => {
    setStatus(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    const duration = next === 'error' ? 3000 : 1800;
    if (next === 'saved' || next === 'error') {
      timerRef.current = setTimeout(() => setStatus('idle'), duration);
    }
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { status, flash };
}

function SaveIndicator({ status, errorDetail }: { status: SaveStatus; errorDetail: string }) {
  if (status === 'idle') return null;
  const label =
    status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : (errorDetail || 'Save failed');
  return (
    <span className="split-editor__save-status" data-status={status}>
      {label}
    </span>
  );
}

function EditorLoadError({
  fileType,
  onRetry,
}: {
  fileType: 'Monaco' | 'MDX editor';
  onRetry: () => void;
}) {
  return (
    <div className="split-editor__loading split-editor__loading--error">
      {fileType} failed to load.
      <button
        type="button"
        className="split-editor__retry"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}

class EditorErrorBoundary extends Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Editor crashed' };
  }

  componentDidCatch(error: Error) {
    console.error('[EditorErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="split-editor__loading split-editor__loading--error">
          {this.state.errorMessage}
          <button
            type="button"
            className="split-editor__retry"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              this.props.onReset();
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MonacoPane({
  content,
  extension,
  onContentChange,
  onSave,
}: {
  content: string | null;
  extension: string;
  onContentChange: (next: string) => void;
  onSave: () => void;
}) {
  const [Editor, setEditor] = useState<MonacoEditorModule['default'] | null>(null);
  const [moduleState, setModuleState] = useState<ModuleLoadState>('idle');
  const resolvedTheme = useResolvedTheme();

  const loadEditor = useCallback(() => {
    setModuleState('loading');
    import('@monaco-editor/react')
      .then((mod) => {
        setEditor(() => mod.default);
        setModuleState('ready');
      })
      .catch((err) => {
        console.error('[MonacoPane] Failed to load @monaco-editor/react:', err);
        setModuleState('failed');
      });
  }, []);

  useEffect(() => {
    loadEditor();
  }, [loadEditor]);

  if (moduleState === 'failed') {
    return <EditorLoadError fileType="Monaco" onRetry={loadEditor} />;
  }

  if (!Editor || content === null || moduleState === 'loading') {
    return <div className="split-editor__loading">Loading editor...</div>;
  }

  return (
    <div className="split-editor__monaco-surface">
      <Editor
        height="100%"
        language={extension === '.mdx' ? 'mdx' : 'markdown'}
        value={content}
        theme={resolvedTheme === 'light' ? 'vs' : 'vs-dark'}
        onChange={(value: string | undefined) => onContentChange(value ?? '')}
        onMount={(editor, monaco) => {
          editor.addAction({
            id: 'docs-save-keyboard',
            label: 'Save File',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: onSave,
          });
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          scrollBeyondLastColumn: 2,
          revealHorizontalRightPadding: 16,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}

function RichEditorPane({
  content,
  onContentChange,
  onSave,
}: {
  content: string | null;
  onContentChange: (next: string) => void;
  onSave: () => void;
}) {
  const [MDXEditorMod, setMDXEditorMod] = useState<MDXEditorModule | null>(null);
  const [moduleState, setModuleState] = useState<ModuleLoadState>('idle');
  const resolvedTheme = useResolvedTheme();

  const loadEditor = useCallback(() => {
    setModuleState('loading');
    Promise.all([
      import('@mdxeditor/editor'),
      import('@mdxeditor/editor/style.css'),
    ])
      .then(([mod]) => {
        setMDXEditorMod(mod as unknown as MDXEditorModule);
        setModuleState('ready');
      })
      .catch((err) => {
        console.error('[RichEditorPane] Failed to load @mdxeditor/editor:', err);
        setModuleState('failed');
      });
  }, []);

  useEffect(() => {
    loadEditor();
  }, [loadEditor]);

  function handleSaveKeyDown(event: {
    preventDefault: () => void;
    ctrlKey: boolean;
    metaKey: boolean;
    key: string;
  }) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      onSave();
    }
  }

  if (moduleState === 'failed') {
    return <EditorLoadError fileType="MDX editor" onRetry={loadEditor} />;
  }

  if (!MDXEditorMod || content === null || moduleState === 'loading') {
    return <div className="split-editor__loading">Loading editor...</div>;
  }

  const {
    MDXEditor,
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    linkPlugin,
    linkDialogPlugin,
    tablePlugin,
    codeBlockPlugin,
    codeMirrorPlugin,
    frontmatterPlugin,
    markdownShortcutPlugin,
    toolbarPlugin,
    BoldItalicUnderlineToggles,
    BlockTypeSelect,
    CreateLink,
    ListsToggle,
    InsertTable,
    InsertThematicBreak,
    InsertFrontmatter,
    UndoRedo,
  } = MDXEditorMod as unknown as {
    MDXEditor: any;
    headingsPlugin: any;
    listsPlugin: any;
    quotePlugin: any;
    thematicBreakPlugin: any;
    linkPlugin: any;
    linkDialogPlugin: any;
    tablePlugin: any;
    codeBlockPlugin: any;
    codeMirrorPlugin: any;
    frontmatterPlugin: any;
    markdownShortcutPlugin: any;
    toolbarPlugin: any;
    BoldItalicUnderlineToggles: any;
    BlockTypeSelect: any;
    CreateLink: any;
    ListsToggle: any;
    InsertTable: any;
    InsertThematicBreak: any;
    InsertFrontmatter: any;
    UndoRedo: any;
  };

  return (
    <div
      className={`split-editor__mdx ${resolvedTheme === 'light' ? 'light-theme' : 'dark-theme'}`}
      onKeyDownCapture={handleSaveKeyDown}
      tabIndex={0}
      role="presentation"
    >
      <MDXEditor
        markdown={content}
        onChange={(value: string) => {
          onContentChange(value);
        }}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
          codeMirrorPlugin({ codeBlockLanguages: { '': 'Plain', js: 'JavaScript', ts: 'TypeScript', css: 'CSS', yaml: 'YAML' } }),
          frontmatterPlugin(),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <BlockTypeSelect />
                <BoldItalicUnderlineToggles />
                <CreateLink />
                <ListsToggle />
                <InsertTable />
                <InsertThematicBreak />
                <InsertFrontmatter />
              </>
            ),
          }),
        ]}
      />
    </div>
  );
}

function readSessionFile(): LoadableFileInfo | null {
  try {
    const saved = sessionStorage.getItem(FILE_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<LoadableFileInfo>;
    if (!parsed.filePath) return null;

    const extension = (parsed.extension || getExtension(parsed.filePath))?.toLowerCase();
    if (!extension) return null;

    const sourceKind = parsed.sourceKind === 'local' ? 'local' : 'repo';
    if (sourceKind === 'local' && !parsed.localHandleId) return null;
    return {
      filePath: parsed.filePath,
      extension,
      sourceKind,
      docsHref: parsed.docsHref,
      localHandleId: parsed.localHandleId,
    };
  } catch {
    return null;
  }
}

function readCurrentRepoFileFromDocument(): LoadableFileInfo | null {
  if (typeof document === 'undefined') return null;
  const preview = document.querySelector('.wa-preview[data-shell="preview-column"]');
  if (!(preview instanceof HTMLElement)) return null;

  const filePath = preview.dataset.currentFilePath?.trim();
  const extension = preview.dataset.currentFileExtension?.trim().toLowerCase();
  const docsHref = preview.dataset.currentDocsHref?.trim();
  if (!filePath || !extension) return null;

  return {
    filePath,
    extension,
    docsHref: docsHref || undefined,
    sourceKind: 'repo',
  };
}

function resolveInitialFile(): LoadableFileInfo | null {
  const currentRepo = readCurrentRepoFileFromDocument();
  const saved = readSessionFile();

  if (saved?.sourceKind === 'local') return saved;
  return currentRepo ?? saved;
}

function emitPreviewRefresh(detail: LoadPreviewEvent) {
  window.dispatchEvent(new CustomEvent(SHELL_PREVIEW_REFRESH_EVENT, { detail }));
}

function resolveDocsHref(file: LoadableFileInfo): string | undefined {
  if (file.sourceKind !== 'repo') return undefined;
  return file.docsHref || readCurrentRepoFileFromDocument()?.docsHref || window.location.pathname;
}

async function readRepoFile(filePath: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(`/api/docs-file?path=${encodeURIComponent(filePath)}`, { signal });
  if (!res.ok) {
    const body = await res.text().catch(() => 'Failed to load file');
    throw new Error(body || 'Failed to load file');
  }
  return res.text();
}

async function readLocalFile(localHandleId: string): Promise<string> {
  const handle = await getLocalFileHandle(localHandleId);
  if (!handle) {
    throw new Error('Missing local file handle');
  }
  const file = await handle.getFile();
  return file.text();
}

async function writeRepoFile(filePath: string, content: string): Promise<SaveResult> {
  const res = await fetch('/api/docs-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, content }),
  });
  if (res.ok) return { ok: true };
  let error = 'Save failed';
  try {
    const body = await res.json();
    if (body?.error) error = body.error;
  } catch {
    /* non-JSON response */
  }
  return { ok: false, error };
}

async function writeLocalFile(localHandleId: string, content: string): Promise<SaveResult> {
  const handle = await getLocalFileHandle(localHandleId);
  if (!handle) return { ok: false, error: 'Missing local file handle' };
  const writable = await handle.createWritable();
  try {
    await writable.write(content);
    await writable.close();
    return { ok: true };
  } catch (err) {
    await writable.close().catch(() => {});
    const message = err instanceof Error ? err.message : 'Failed to write local file';
    return { ok: false, error: message };
  }
}

async function loadFile(file: LoadableFileInfo, signal: AbortSignal): Promise<string> {
  if (file.sourceKind === 'local') {
    if (!file.localHandleId) throw new Error('Missing local handle');
    return readLocalFile(file.localHandleId);
  }
  return readRepoFile(file.filePath, signal);
}

async function saveFile(file: LoadableFileInfo, content: string): Promise<SaveResult> {
  if (file.sourceKind === 'local') {
    if (!file.localHandleId) return { ok: false, error: 'Missing local file handle' };
    return writeLocalFile(file.localHandleId, content);
  }
  return writeRepoFile(file.filePath, content);
}

export default function SplitEditorView() {
  const [file, setFile] = useState<LoadableFileInfo | null>(null);
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [mode, setMode] = useState<EditorMode>(DEFAULT_EDITOR_MODE);
  const [content, setContent] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const { status, flash } = useSaveStatus();
  const [saveError, setSaveError] = useState('');
  const loadSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const saveSeq = useRef(0);
  const activeFileRef = useRef<LoadableFileInfo | null>(null);

  function isSameFile(a: LoadableFileInfo | null, b: LoadableFileInfo | null) {
    if (!a || !b) return false;
    return (
      a.sourceKind === b.sourceKind &&
      a.filePath === b.filePath &&
      (a.localHandleId ?? '') === (b.localHandleId ?? '')
    );
  }

  const reloadCurrentFile = useCallback(async () => {
    if (!file) return;

    const requestId = ++loadSeq.current;
    saveSeq.current += 1;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadStatus('loading');
    setLoadErrorMessage('');
    setContent(null);

    try {
      const requestFile = file;
      const text = await loadFile(requestFile, controller.signal);
      if (requestId !== loadSeq.current || controller.signal.aborted) return;
      setContent(text);
      setLoadStatus('loaded');

      emitPreviewRefresh({
        sourceKind: requestFile.sourceKind,
        filePath: requestFile.filePath,
        extension: requestFile.extension,
        docsHref: resolveDocsHref(requestFile),
        content: requestFile.sourceKind === 'local' ? text : undefined,
        reason: 'load',
      });
    } catch (error) {
      if (requestId !== loadSeq.current || controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : 'Unable to load file';
      const shouldReset =
        message.includes('Missing local file handle') ||
        message.includes('File not found') ||
        message.includes('Invalid path');

      if (shouldReset) {
        resetSelectedFile({ reason: 'file-missing' });
        return;
      }
      setLoadErrorMessage(message);
      setLoadStatus('error');
      setContent('');
      if (file?.sourceKind === 'local') {
        emitPreviewRefresh({
          sourceKind: file.sourceKind,
          filePath: file.filePath,
          extension: file.extension,
          content: '',
          reason: 'load',
        });
      }
    }
  }, [file]);

  const clearState = useCallback(() => {
    setFile(null);
    setContent(null);
    setLoadStatus('idle');
    setLoadErrorMessage('');
    activeFileRef.current = null;
    saveSeq.current += 1;
    flash('idle');
    try {
      sessionStorage.removeItem(FILE_STORAGE_KEY);
    } catch {}
  }, [flash]);

  const save = useCallback(async () => {
    if (!file || loadStatus !== 'loaded' || content === null) return;
    const requestFile = file;
    const seq = ++saveSeq.current;
    flash('saving');
    setSaveError('');
    try {
      const result = await saveFile(requestFile, content);
      if (seq !== saveSeq.current || !isSameFile(activeFileRef.current, requestFile)) return;
      if (result.ok) {
        flash('saved');
        emitPreviewRefresh({
          sourceKind: requestFile.sourceKind,
          filePath: requestFile.filePath,
          extension: requestFile.extension,
          docsHref: resolveDocsHref(requestFile),
          content,
          reason: 'save',
        });
      } else {
        setSaveError(result.error || 'Save failed');
        flash('error');
      }
    } catch (err) {
      if (seq !== saveSeq.current || !isSameFile(activeFileRef.current, requestFile)) return;
      setSaveError(err instanceof Error ? err.message : 'Save failed');
      flash('error');
    }
  }, [content, file, flash, loadStatus]);

  useEffect(() => {
    const root = document.documentElement;

    const restoreSelection = () => {
      if (root.getAttribute('data-shell-mode') !== 'filetree') {
        setHasRestoredSession(true);
        return;
      }

      const restored = resolveInitialFile();
      if (restored) {
        setFile(restored);
        activeFileRef.current = restored;
        try {
          sessionStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(restored));
        } catch {}
      }
      setHasRestoredSession(true);
    };

    restoreSelection();

    const observer = new MutationObserver(() => {
      if (root.getAttribute('data-shell-mode') !== 'filetree') return;
      if (activeFileRef.current) return;

      const restored = resolveInitialFile();
      if (!restored) return;
      setFile(restored);
      activeFileRef.current = restored;
      try {
        sessionStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(restored));
      } catch {}
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-shell-mode'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const detachFileSelect = onFileSelect((detail) => {
      if (!detail?.filePath || !detail.extension) return;
      const next: LoadableFileInfo = {
        filePath: detail.filePath,
        extension: detail.extension,
        sourceKind: detail.sourceKind === 'local' ? 'local' : 'repo',
        docsHref: detail.docsHref,
        localHandleId: detail.localHandleId,
      };
      setFile(next);
      activeFileRef.current = next;
      try {
        sessionStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(next));
      } catch {}
    });

    const detachFileReset = onFileReset(() => {
      clearState();
    });

    const detachMode = (e: Event) => {
      const detail = (e as CustomEvent).detail as EditorMode | undefined;
      if (detail === 'source' || detail === 'rich') setMode(detail);
    };
    window.addEventListener(SHELL_EDITOR_MODE_EVENT, detachMode);

    return () => {
      detachFileSelect();
      detachFileReset();
      window.removeEventListener(SHELL_EDITOR_MODE_EVENT, detachMode);
      abortRef.current?.abort();
    };
  }, [clearState]);

  useEffect(() => {
    if (!hasRestoredSession) return;
    if (file) {
      activeFileRef.current = file;
      reloadCurrentFile();
      return;
    }
    setLoadStatus('idle');
  }, [file, hasRestoredSession, reloadCurrentFile]);

  if (!hasRestoredSession) {
    return <div className="split-editor__loading">Loading file...</div>;
  }

  if (!file) {
    return (
      <div className="split-editor__loading">
        Select a file from the tree
      </div>
    );
  }

  if (loadStatus === 'loading' || loadStatus === 'idle') {
    return <div className="split-editor__loading">Loading file...</div>;
  }

  if (loadStatus === 'error') {
    return (
      <div className="split-editor__loading split-editor__loading--error">
        {loadErrorMessage || 'Failed to load file'}
        <button type="button" className="split-editor__retry" onClick={reloadCurrentFile}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="split-editor">
      <div className="split-editor__body">
        <EditorErrorBoundary onReset={reloadCurrentFile}>
          {mode === 'source' ? (
            <MonacoPane
              content={content}
              extension={file.extension}
              onContentChange={setContent}
              onSave={save}
            />
          ) : (
            <RichEditorPane
              content={content}
              onContentChange={setContent}
              onSave={save}
            />
          )}
        </EditorErrorBoundary>
      </div>
      <SaveIndicator status={status} errorDetail={saveError} />
    </div>
  );
}
