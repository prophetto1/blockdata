# Filetree Mode — Complete Source

All 14 files that implement the filetree editor mode.

---

## 1. `src/lib/docs/shell-state.ts`

State definitions, event constants, dispatch helpers.

```ts
/**
 * Shared state helpers for the docs shell.
 *
 * - data-shell-mode on <html> is the single shell-mode source of truth.
 * - File selection is communicated through window events.
 */

export type ShellMode = 'sections' | 'filetree';
export type ShellFileSourceKind = 'repo' | 'local';

export type ShellFileInfo = {
  filePath: string;
  extension: string;
  sourceKind: ShellFileSourceKind;
  docsHref?: string;
  localHandleId?: string;
};

export type ShellFileResetEvent = {
  reason?: 'mode-change' | 'folder-cleared' | 'file-missing';
};

export const SHELL_MODE_ATTR = 'data-shell-mode';
export const SHELL_MODE_STORAGE_KEY = 'shell-mode';
export const FILE_STORAGE_KEY = 'shell-selected-file';
export const SPLIT_RATIO_STORAGE_KEY = 'shell-split-ratio';
export const SHELL_FILE_EVENT = 'shell-file-select';
export const SHELL_FILE_RESET_EVENT = 'shell-file-reset';
export const SHELL_EDITOR_MODE_EVENT = 'shell-editor-mode';
export const SHELL_PREVIEW_REFRESH_EVENT = 'shell-preview-refresh';

export function selectFile(file: ShellFileInfo): void {
  window.dispatchEvent(new CustomEvent(SHELL_FILE_EVENT, { detail: file }));
}

export function resetSelectedFile(detail?: ShellFileResetEvent): void {
  window.dispatchEvent(new CustomEvent(SHELL_FILE_RESET_EVENT, { detail }));
}

export function onFileSelect(callback: (file: ShellFileInfo) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as ShellFileInfo | undefined;
    if (detail?.filePath) callback(detail);
  };
  window.addEventListener(SHELL_FILE_EVENT, handler);
  return () => window.removeEventListener(SHELL_FILE_EVENT, handler);
}

export function onFileReset(callback: (detail?: ShellFileResetEvent) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as ShellFileResetEvent | undefined;
    callback(detail);
  };
  window.addEventListener(SHELL_FILE_RESET_EVENT, handler);
  return () => window.removeEventListener(SHELL_FILE_RESET_EVENT, handler);
}
```

---

## 2. `src/lib/docs/local-file-handles.ts`

IndexedDB wrapper for File System Access API handles.

```ts
const IDB_NAME = 'docs-filetree';
const IDB_STORE = 'handles';
const LOCAL_DIR_HANDLE_KEY = 'selectedDir';
export const LOCAL_FILE_HANDLE_PREFIX = 'local:file:';

export function getLocalHandleId(relativePath: string) {
  return `${LOCAL_FILE_HANDLE_PREFIX}${relativePath}`;
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function awaitTransactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, LOCAL_DIR_HANDLE_KEY);
    await awaitTransactionComplete(tx);
    db.close();
  } catch {
    // Ignore.
  }
}

export async function restoreDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(LOCAL_DIR_HANDLE_KEY);
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      tx.onerror = () => db.close();
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearSavedDirectoryHandle() {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(LOCAL_DIR_HANDLE_KEY);
    await awaitTransactionComplete(tx);
    db.close();
  } catch {
    // ignore
  }
}

export async function saveLocalFileHandle(id: string, handle: FileSystemFileHandle) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, id);
    await awaitTransactionComplete(tx);
    db.close();
  } catch {
    // ignore
  }
}

export async function getLocalFileHandle(id: string): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openIDB();
    return await new Promise<FileSystemFileHandle | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      tx.onerror = () => db.close();
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearLocalFileHandles() {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.openKeyCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      if (typeof cursor.key === 'string' && cursor.key.startsWith(LOCAL_FILE_HANDLE_PREFIX)) {
        store.delete(cursor.key);
      }
      cursor.continue();
    };
    await awaitTransactionComplete(tx);
    db.close();
  } catch {
    // ignore
  }
}
```

---

## 3. `src/components/WorkbenchSplitter.tsx`

Ark UI Splitter (editor + preview columns).

```tsx
import { Splitter } from '@ark-ui/react/splitter';
import { ScrollArea } from '@ark-ui/react/scroll-area';
import { useState } from 'react';
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
export default function WorkbenchSplitter() {
  const [defaultSize] = useState(getSavedSize);

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
              <div data-shell="splitter-preview" className="wa-splitter__preview-content" />
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
```

---

## 4. `src/components/SplitEditorView.tsx`

Monaco/MDX editor, file load/save, preview refresh.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorMode } from './EditorTabStrip';
import {
  FILE_STORAGE_KEY,
  SHELL_EDITOR_MODE_EVENT,
  SHELL_PREVIEW_REFRESH_EVENT,
  onFileReset,
  onFileSelect,
  resetSelectedFile,
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
        padding: { top: 12 },
      }}
    />
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

function emitPreviewRefresh(detail: LoadPreviewEvent) {
  window.dispatchEvent(new CustomEvent(SHELL_PREVIEW_REFRESH_EVENT, { detail }));
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
  const [file, setFile] = useState<LoadableFileInfo | null>(readSessionFile);
  const [mode, setMode] = useState<EditorMode>('rich');
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

      if (requestFile.sourceKind === 'local') {
        emitPreviewRefresh({
          sourceKind: requestFile.sourceKind,
          filePath: requestFile.filePath,
          extension: requestFile.extension,
          content: text,
        });
      }
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
      if (file) {
        emitPreviewRefresh({
          sourceKind: file.sourceKind,
          filePath: file.filePath,
          extension: file.extension,
          content: '',
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
          content,
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
    if (file) {
      activeFileRef.current = file;
      reloadCurrentFile();
      return;
    }
    setLoadStatus('idle');
  }, [file, reloadCurrentFile]);

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
      </div>
      <SaveIndicator status={status} errorDetail={saveError} />
    </div>
  );
}
```

---

## 5. `src/components/EditorTabStrip.tsx`

Source/Rich mode toggle.

```tsx
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
```

---

## 6. `src/components/DocsSidebarFileTree.tsx`

File tree, file selection events.

```tsx
import { ScrollArea } from '@ark-ui/react/scroll-area';
import { TreeView, createTreeCollection } from '@ark-ui/react/tree-view';
import {
  AlertCircle,
  ChevronRight,
  File,
  FileCode2,
  FileText,
  FolderClosed,
  FolderOpen,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FILE_STORAGE_KEY,
  resetSelectedFile,
  selectFile,
  type ShellFileSourceKind,
} from '../lib/docs/shell-state';
import {
  clearLocalFileHandles,
  clearSavedDirectoryHandle,
  getLocalHandleId,
  restoreDirectoryHandle,
  saveDirectoryHandle,
  saveLocalFileHandle,
} from '../lib/docs/local-file-handles';
import '../styles/scroll-area.css';

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemDirectoryHandle {
    queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  }
  interface FileSystemFileHandle {
    getFile(): Promise<File>;
  }
}

type RepoTreeNode = {
  id: string;
  name: string;
  relativePath: string;
  docsHref?: string;
  extension?: string;
  children?: RepoTreeNode[];
};

export type DocsSidebarTreeNode = {
  id: string;
  name: string;
  relativePath: string;
  sourceKind: ShellFileSourceKind;
  docsHref?: string;
  extension?: string;
  localHandleId?: string;
  children?: DocsSidebarTreeNode[];
};

type DocsSidebarFileTreeProps = {
  nodes: RepoTreeNode[];
  currentRelativePath?: string;
};

const ICON_SIZE = 16;
const ICON_STROKE = 2.25;
const SUPPORTED_LOCAL_EXTENSIONS = new Set(['.md', '.mdx']);

function getExtension(name: string) {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return '';
  return name.slice(dot).toLowerCase();
}

function isSupportedLocalFile(extension: string) {
  return SUPPORTED_LOCAL_EXTENSIONS.has(extension);
}

async function readDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string = '',
): Promise<DocsSidebarTreeNode[]> {
  const entries: DocsSidebarTreeNode[] = [];

  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.')) continue;

    const childPath = relativePath ? `${relativePath}/${name}` : name;

    if (handle.kind === 'directory') {
      const children = await readDirectoryHandle(
        handle as FileSystemDirectoryHandle,
        childPath,
      );
      entries.push({
        id: `dir:${childPath}`,
        name,
        relativePath: childPath,
        sourceKind: 'local',
        children,
      });
    } else {
      const extension = getExtension(name);
      if (!isSupportedLocalFile(extension)) continue;

      const localHandleId = getLocalHandleId(childPath);
      await saveLocalFileHandle(localHandleId, handle as FileSystemFileHandle);

      entries.push({
        id: `file:${childPath}`,
        name,
        relativePath: childPath,
        sourceKind: 'local',
        extension,
        localHandleId,
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.children && !b.children) return -1;
    if (!a.children && b.children) return 1;
    return a.name.localeCompare(b.name);
  });
}

function EmptyState({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="docs-tree-empty">
      <FolderOpen size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <span>No folder selected</span>
      <button type="button" className="docs-tree-empty__button" onClick={onSelect}>
        Select Folder
      </button>
    </div>
  );
}

function ReauthState({ folderName, onReconnect, onClear }: { folderName: string; onReconnect: () => void; onClear: () => void }) {
  return (
    <div className="docs-tree-empty">
      <FolderOpen size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <span>Folder access expired</span>
      <span className="docs-tree-empty__detail">{folderName}</span>
      <button type="button" className="docs-tree-empty__button" onClick={onReconnect}>
        <RefreshCw size={12} strokeWidth={ICON_STROKE} aria-hidden="true" />
        Reconnect
      </button>
      <button type="button" className="docs-tree-empty__button docs-tree-empty__button--muted" onClick={onClear}>
        Dismiss
      </button>
    </div>
  );
}

function FolderErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="docs-tree-empty">
      <AlertCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" className="docs-tree-empty__button" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}

function TreeHeader({
  folderName,
  onClear,
}: {
  folderName: string;
  onClear?: () => void;
}) {
  return (
    <div className="docs-tree-header">
      <span className="docs-tree-header__name" title={folderName}>
        {folderName}
      </span>
      {onClear && (
        <div className="docs-tree-header__actions">
          <button
            type="button"
            className="docs-tree-header__button"
            onClick={onClear}
            title="Close folder"
            aria-label="Close folder"
          >
            <X size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DocsSidebarFileTree({
  nodes: serverNodes,
  currentRelativePath = '',
}: DocsSidebarFileTreeProps) {
  const [localNodes, setLocalNodes] = useState<DocsSidebarTreeNode[] | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [folderError, setFolderError] = useState('');

  const hasLocalFolder = localNodes !== null;
  const activeNodes = useMemo(
    () => (hasLocalFolder ? localNodes : enrichRepoNodes(serverNodes)),
    [hasLocalFolder, localNodes, serverNodes],
  );

  const reconnectFolder = useCallback(async () => {
    setFolderError('');
    try {
      const handle = await restoreDirectoryHandle();
      if (!handle) {
        setNeedsReauth(false);
        clearSavedDirectoryHandle();
        return;
      }
      // requestPermission triggers the browser prompt
      const perm = await (handle as any).requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      const children = await readDirectoryHandle(handle);
      setFolderName(handle.name);
      setLocalNodes(children);
      setNeedsReauth(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not reconnect folder';
      setFolderError(message);
    }
  }, []);

  useEffect(() => {
    restoreDirectoryHandle().then(async (handle) => {
      if (!handle) return;
      try {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const children = await readDirectoryHandle(handle);
          setFolderName(handle.name);
          setLocalNodes(children);
        } else {
          // Permission expired — show reconnect UI instead of silently dropping
          setFolderName(handle.name);
          setNeedsReauth(true);
        }
      } catch {
        setFolderName(handle.name);
        setNeedsReauth(true);
      }
    });
  }, []);

  const selectFolder = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      setFolderError('Your browser does not support the File System Access API.');
      return;
    }
    setFolderError('');
    try {
      await clearLocalFileHandles();
      const handle = await window.showDirectoryPicker!({ mode: 'readwrite' });
      const children = await readDirectoryHandle(handle);
      setFolderName(handle.name);
      setLocalNodes(children);
      setNeedsReauth(false);
      saveDirectoryHandle(handle);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Could not open folder';
      setFolderError(message);
    }
  }, []);

  const clearFolder = useCallback(() => {
    setLocalNodes(null);
    setFolderName(null);
    clearSavedDirectoryHandle();
    clearLocalFileHandles();
    try {
      sessionStorage.removeItem(FILE_STORAGE_KEY);
    } catch {}
    resetSelectedFile({ reason: 'folder-cleared' });
  }, []);

  const rootNode = useMemo<DocsSidebarTreeNode>(
    () => ({
      id: 'dir:root',
      name: folderName || 'docs',
      relativePath: '',
      sourceKind: 'repo',
      children: activeNodes,
    }),
    [activeNodes, folderName],
  );

  const collection = useMemo(
    () =>
      createTreeCollection<DocsSidebarTreeNode>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.name,
        rootNode,
      }),
    [rootNode],
  );

  const defaultExpandedValue = useMemo(
    () => (hasLocalFolder ? [] : getExpandedBranchIds(serverNodes, currentRelativePath)),
    [hasLocalFolder, serverNodes, currentRelativePath],
  );

  const defaultSelectedValue = useMemo(
    () => (hasLocalFolder ? null : getSelectedNodeId(serverNodes, currentRelativePath)),
    [hasLocalFolder, serverNodes, currentRelativePath],
  );

  if (folderError) {
    return <FolderErrorState message={folderError} onRetry={selectFolder} />;
  }

  if (needsReauth && !hasLocalFolder) {
    return <ReauthState folderName={folderName || 'Local folder'} onReconnect={reconnectFolder} onClear={clearFolder} />;
  }

  if (!activeNodes.length && !hasLocalFolder) {
    return <EmptyState onSelect={selectFolder} />;
  }

  return (
    <div className="docs-tree-container">
      <TreeHeader
        folderName={hasLocalFolder && folderName ? folderName : 'docs'}
        onClear={hasLocalFolder ? clearFolder : undefined}
      />
      <ScrollArea.Root className="scroll-area-root" style={{ flex: 1, minHeight: 0 }}>
        <ScrollArea.Viewport className="scroll-area-viewport">
          <ScrollArea.Content>
            <TreeView.Root
              aria-label="File tree"
              className="docs-tree"
              collection={collection}
              defaultExpandedValue={defaultExpandedValue}
              defaultSelectedValue={defaultSelectedValue ? [defaultSelectedValue] : []}
              selectionMode="single"
              expandOnClick
            >
              <TreeView.Tree className="docs-tree__list">
                {collection.rootNode.children?.map((node, index) => (
                  <TreeNodeView key={node.id} node={node} indexPath={[index]} />
                ))}
              </TreeView.Tree>
            </TreeView.Root>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="scroll-area-scrollbar">
          <ScrollArea.Thumb className="scroll-area-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}

function TreeNodeView(props: TreeView.NodeProviderProps<DocsSidebarTreeNode>) {
  const { node, indexPath } = props;

  return (
    <TreeView.NodeProvider node={node} indexPath={indexPath}>
      <TreeView.NodeContext>
        {() =>
          isDirectoryNode(node) ? (
            <TreeView.Branch className="docs-tree__branch">
              <TreeView.BranchControl className="docs-tree__branch-control">
                <TreeView.BranchTrigger className="docs-tree__row docs-tree__row--branch">
                  <TreeView.BranchIndicator className="docs-tree__chevron">
                    <ChevronRight size={ICON_SIZE} strokeWidth={ICON_STROKE} />
                  </TreeView.BranchIndicator>
                  <TreeView.BranchText className="docs-tree__label">
                    <FolderClosed
                      size={ICON_SIZE}
                      strokeWidth={ICON_STROKE}
                      className="docs-tree-icon docs-tree-icon--folder-closed"
                    />
                    <FolderOpen
                      size={ICON_SIZE}
                      strokeWidth={ICON_STROKE}
                      className="docs-tree-icon docs-tree-icon--folder-open"
                    />
                    <span className="docs-tree__name">{node.name}</span>
                  </TreeView.BranchText>
                </TreeView.BranchTrigger>
              </TreeView.BranchControl>

              <TreeView.BranchContent className="docs-tree__children">
                <TreeView.BranchIndentGuide className="docs-tree__guide" />
                {(node.children ?? []).map((child, index) => (
                  <TreeNodeView
                    key={child.id}
                    node={child}
                    indexPath={[...indexPath, index]}
                  />
                ))}
              </TreeView.BranchContent>
            </TreeView.Branch>
          ) : (
            <TreeView.Item className="docs-tree__item">
              <button
                type="button"
                className="docs-tree__row docs-tree__row--file"
                onClick={() => {
                  selectFile({
                    filePath: node.relativePath,
                    extension: node.extension || '',
                    sourceKind: node.sourceKind ?? 'repo',
                    docsHref: node.docsHref,
                    localHandleId: node.localHandleId,
                  });
                }}
              >
                <TreeView.ItemText className="docs-tree__label">
                  {node.extension === '.mdx' ? (
                    <FileCode2 size={ICON_SIZE} strokeWidth={ICON_STROKE} className="docs-tree-icon docs-tree-icon--markdown" />
                  ) : node.extension === '.md' ? (
                    <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} className="docs-tree-icon docs-tree-icon--markdown" />
                  ) : (
                    <File size={ICON_SIZE} strokeWidth={ICON_STROKE} className="docs-tree-icon docs-tree-icon--file" />
                  )}
                  <span className="docs-tree__name">{stripExtension(node.name)}</span>
                  <span className="docs-tree__ext">{node.extension}</span>
                </TreeView.ItemText>
              </button>
            </TreeView.Item>
          )
        }
      </TreeView.NodeContext>
    </TreeView.NodeProvider>
  );
}

function isDirectoryNode(node: DocsSidebarTreeNode) {
  return node.id.startsWith('dir:');
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

function enrichRepoNodes(nodes: RepoTreeNode[]): DocsSidebarTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    sourceKind: 'repo',
    extension: node.extension?.toLowerCase(),
    children: node.children ? enrichRepoNodes(node.children as RepoTreeNode[]) : undefined,
  }));
}

function getExpandedBranchIds(nodes: RepoTreeNode[], currentRelativePath: string) {
  const expandedIds: string[] = [];

  function visit(list: RepoTreeNode[]) {
    for (const node of list) {
      if (!node.children?.length) continue;
      if (currentRelativePath.startsWith(`${node.relativePath}/`)) {
        expandedIds.push(node.id);
        visit(node.children);
      }
    }
  }

  visit(nodes);
  return expandedIds;
}

function getSelectedNodeId(nodes: RepoTreeNode[], currentRelativePath: string): string | null {
  for (const node of nodes) {
    if (node.children?.length) {
      const childSelectedId = getSelectedNodeId(node.children, currentRelativePath);
      if (childSelectedId) return childSelectedId;
      continue;
    }

    if (node.relativePath === currentRelativePath) return node.id;
  }

  return null;
}
```

---

## 7. `src/components/ScrollWrapper.tsx`

Ark UI ScrollArea wrapper.

```tsx
import { ScrollArea } from '@ark-ui/react/scroll-area';
import type { ReactNode } from 'react';
import '../styles/scroll-area.css';

interface ScrollWrapperProps {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
}

export default function ScrollWrapper({ children, className, viewportClassName }: ScrollWrapperProps) {
  return (
    <ScrollArea.Root className={`scroll-area-root${className ? ` ${className}` : ''}`}>
      <ScrollArea.Viewport className={`scroll-area-viewport${viewportClassName ? ` ${viewportClassName}` : ''}`}>
        <ScrollArea.Content>{children}</ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className="scroll-area-scrollbar">
        <ScrollArea.Thumb className="scroll-area-thumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
```

---

## 8. `src/components/DocsTwoColumnContent.astro`

Layout orchestrator + inline script (preview sync, file navigation, mode routing).

```astro
---
import ScrollWrapper from './ScrollWrapper.tsx';
import WorkbenchSplitter from './WorkbenchSplitter.tsx';

const { toc } = Astro.locals.starlightRoute;
---

{/* ═══════════════════════════════════════════════════════════
    ContentWorkAreaShell
    ═══════════════════════════════════════════════════════════
    Sole owner of the content-area layout contract.

    Sections mode: standard Starlight article (TOC + main-pane).
    Filetree mode: Ark UI Splitter with two panels:

      ┌──────────────────────┬──┬───────────────────────────┐
      │ Source | Rich        │  │ Preview                   │
      ├──────────────────────┤  ├───────────────────────────┤
      │ EditorPanel          │  │ PreviewPanel              │
      │                      │Re│                           │
      │  ┌SourceSurface ──┐  │si│  ┌ Adopted <slot/> ────┐  │
      │  │ Monaco editor  │  │ze│  │ ScrollArea viewport  │  │
      │  └────────────────┘  │  │  └─────────────────────-┘  │
      │  ┌RichSurface ────┐  │  │                           │
      │  │ MDXEditor      │  │  │                           │
      │  └────────────────┘  │  │                           │
      └──────────────────────┴──┴───────────────────────────┘

    Sizing: Ark UI Splitter (flexbox). Resize via ResizeTrigger.
    Preview content adopted from .wa-preview on hydration.
    ═══════════════════════════════════════════════════════════ */}

<div class="content-work-area lg:sl-flex">

  {/* ── Sections mode: right sidebar (TOC) ── */}
  {toc && (
    <aside class="right-sidebar-container print:hidden">
      <div class="right-sidebar">
        <ScrollWrapper client:load className="right-sidebar-scroll">
          <slot name="right-sidebar" />
        </ScrollWrapper>
      </div>
    </aside>
  )}

  {/* ── WorkbenchSplitter ──
       Filetree mode only. Ark UI Splitter owns editor + preview panels,
       each with its own header strip (Source|Rich tabs / Preview label).
       On mount, adopts the content from .wa-preview into its preview panel.
       Hidden in sections mode. */}
  <WorkbenchSplitter client:load />

  {/* ── PreviewColumnShell / Sections-mode main-pane ──
       In sections mode: normal article layout.
       In filetree mode: content is adopted by WorkbenchSplitter on hydration. */}
  <div class="wa-preview" data-shell="preview-column">
    <slot />
  </div>
</div>

<script is:inline>
  (() => {
    // Canonical source: src/lib/docs/shell-state.ts
    // Duplicated here because is:inline scripts cannot import ES modules.
    const FILE_STORAGE_KEY = 'shell-selected-file';      // FILE_STORAGE_KEY
    const PREVIEW_REFRESH_EVENT = 'shell-preview-refresh'; // SHELL_PREVIEW_REFRESH_EVENT
    const FILE_SELECT_EVENT = 'shell-file-select';        // SHELL_FILE_EVENT
    const FILE_RESET_EVENT = 'shell-file-reset';          // SHELL_FILE_RESET_EVENT
    const PREVIEW_REFRESH_QUERY = '_shell_preview';
    const SHELL_ATTR = 'data-shell-mode';

    function isFiletreeMode() {
      return document.documentElement.getAttribute(SHELL_ATTR) === 'filetree';
    }

    function getPreviewEl() {
      if (isFiletreeMode()) {
        return document.querySelector('[data-shell="splitter-preview"]');
      }
      return document.querySelector('.wa-preview[data-shell="preview-column"]');
    }

    function extractRepoPreviewMarkup(source) {
      const scratch = document.createElement('div');
      scratch.innerHTML = source?.innerHTML ?? '';

      const firstChild = scratch.firstElementChild;
      const secondChild = firstChild?.nextElementSibling;
      if (
        firstChild?.classList?.contains('content-panel')
        && secondChild?.classList?.contains('content-panel')
      ) {
        firstChild.remove();
      }

      return scratch.innerHTML;
    }

    function escapeHtml(raw) {
      return String(raw)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function renderInlineMarkdown(raw) {
      return escapeHtml(raw).replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    function renderLocalMarkdown(raw, extension) {
      const lines = String(raw ?? '').replace(/\r\n?/g, '\n').split('\n');
      const blocks = [];
      let inCode = false;
      let inList = false;
      let paragraph = [];

      function closeParagraph() {
        if (!paragraph.length) return;
        blocks.push(`<p>${paragraph.join(' ')}</p>`);
        paragraph = [];
      }

      function closeList() {
        if (!inList) return;
        blocks.push('</ul>');
        inList = false;
      }

      for (const line of lines) {
        if (line.startsWith('```')) {
          if (inCode) {
            blocks.push('</code></pre>');
            inCode = false;
            continue;
          }
          closeParagraph();
          closeList();
          blocks.push('<pre><code>');
          inCode = true;
          continue;
        }

        if (inCode) {
          blocks.push(escapeHtml(line));
          continue;
        }

        if (/^#{1,6}\s+/.test(line)) {
          closeParagraph();
          closeList();
          const level = line.match(/^(#{1,6})\s+/)?.[1]?.length ?? 1;
          blocks.push(`<h${level}>${renderInlineMarkdown(line.replace(/^(#{1,6})\s+/, ''))}</h${level}>`);
          continue;
        }

        if (/^>\s?/.test(line)) {
          closeParagraph();
          closeList();
          blocks.push(`<blockquote>${renderInlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`);
          continue;
        }

        if (/^[-*]\s+/.test(line)) {
          if (!inList) {
            closeParagraph();
            blocks.push('<ul>');
            inList = true;
          }
          blocks.push(`<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`);
          continue;
        }

        if (!line.trim()) {
          closeParagraph();
          closeList();
          continue;
        }

        paragraph.push(renderInlineMarkdown(line.trim()));
      }

      closeParagraph();
      closeList();
      if (inCode) blocks.push('</code></pre>');

      const variant = extension === '.mdx' ? 'split-editor__local-preview--mdx' : '';
      return `<article class="split-editor__local-preview ${variant}">${blocks.join('')}</article>`;
    }

    function syncCurrentPreviewIntoShell(attempt = 0) {
      if (!isFiletreeMode()) return;

      const target = getPreviewEl();
      const source = document.querySelector('.wa-preview[data-shell="preview-column"]');
      if (!target || !source) {
        if (attempt < 30) {
          window.requestAnimationFrame(() => syncCurrentPreviewIntoShell(attempt + 1));
        }
        return;
      }

      if (target.innerHTML.trim()) return;
      target.innerHTML = extractRepoPreviewMarkup(source);
    }

    async function loadRepoPreviewIntoShell(url) {
      const preview = getPreviewEl();
      if (!preview) return;

      preview.innerHTML = '<div class="split-editor__loading">Loading preview...</div>';

      try {
        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed to load preview');
        }

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const source = doc.querySelector('.wa-preview[data-shell="preview-column"]')
          || doc.querySelector('.wa-preview');
        if (!source) {
          throw new Error('Preview content not found');
        }

        preview.innerHTML = extractRepoPreviewMarkup(source);
        history.replaceState(history.state ?? {}, '', url.toString());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load preview';
        preview.innerHTML = `<div class="split-editor__loading split-editor__loading--error">${escapeHtml(message)}</div>`;
      }
    }

    function refreshRepoPreview() {
      if (isFiletreeMode()) {
        loadRepoPreviewIntoShell(new URL(window.location.href));
        return;
      }
      const current = new URL(window.location.href);
      current.searchParams.set(PREVIEW_REFRESH_QUERY, String(Date.now()));
      window.location.replace(current.toString());
    }

    function updateLocalPreview(detail) {
      const preview = getPreviewEl();
      if (!preview) return;
      preview.innerHTML = renderLocalMarkdown(detail?.content ?? '', detail?.extension ?? '');
    }

    // ── File selection: persist and navigate ──
    window.addEventListener(FILE_SELECT_EVENT, (e) => {
      const detail = e.detail;
      if (!detail?.filePath) return;
      try { sessionStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(detail)); } catch {}
      if (detail.sourceKind === 'local') {
        const preview = getPreviewEl();
        if (preview) {
          preview.innerHTML = '<div class="split-editor__loading">Loading local preview...</div>';
        }
        return;
      }

      if (detail.docsHref) {
        const next = new URL(detail.docsHref, window.location.origin);
        if (isFiletreeMode()) {
          loadRepoPreviewIntoShell(next);
          return;
        }
        next.searchParams.set(PREVIEW_REFRESH_QUERY, String(Date.now()));
        window.location.replace(next.toString());
      }
    });

    // ── Preview refresh after save ──
    window.addEventListener(PREVIEW_REFRESH_EVENT, (event) => {
      if (event.detail?.sourceKind === 'local') {
        updateLocalPreview(event.detail);
        return;
      }
      refreshRepoPreview();
    });

    window.addEventListener(FILE_RESET_EVENT, (event) => {
      const reason = event.detail?.reason;
      if (reason !== 'folder-cleared' && reason !== 'file-missing') return;

      const preview = getPreviewEl();
      if (!preview) return;

      preview.innerHTML = '<div class="split-editor__loading">Select a file from the tree</div>';
    });

    syncCurrentPreviewIntoShell();
  })();
</script>

<style>
  @layer starlight.core {

    /* ═══════════════════════════════════════════════════════
       ContentWorkAreaShell — grid authority
       ═══════════════════════════════════════════════════════ */

    /* ── Sections mode (default) ──
       wa-preview acts as the normal main-pane.
       Splitter is hidden. */

    .wa-preview {
      isolation: isolate;
    }

    :global(.wa-splitter) {
      display: none;
    }

    @media (min-width: 72rem) {
      .right-sidebar-container {
        order: 2;
        position: relative;
        width: calc(
          var(--sl-sidebar-width) + (100% - var(--sl-content-width) - var(--sl-sidebar-width)) / 2
        );
      }

      .right-sidebar {
        position: fixed;
        top: 0;
        border-inline-start: 1px solid var(--sl-color-hairline);
        padding-top: var(--sl-nav-height);
        width: 100%;
        height: 100vh;
      }

      :global(.right-sidebar-scroll) {
        height: 100%;
      }

      /* Sections-mode only — scoped so they don't fight filetree grid */
      :global(:not([data-shell-mode='filetree'])) .wa-preview {
        width: 100%;
      }

      :global([data-has-sidebar][data-has-toc]:not([data-shell-mode='filetree'])) .wa-preview {
        --sl-content-margin-inline: auto 0;
        order: 1;
        width: calc(
          var(--sl-content-width) + (100% - var(--sl-content-width) - var(--sl-sidebar-width)) / 2
        );
      }
    }

    /* ═══════════════════════════════════════════════════════
       Filetree mode — activate all sub-shells
       ═══════════════════════════════════════════════════════ */

    :global([data-shell-mode='filetree']) .right-sidebar-container {
      display: none;
    }

    /* Filetree layout: splitter fills the work area.
       The Ark UI Splitter handles column sizing internally.
       Each panel has its own header strip. */
    :global([data-shell-mode='filetree']) .content-work-area {
      display: flex !important; /* override lg:sl-flex */
      flex-direction: column;
      height: calc(100vh - var(--sl-nav-height, 3.5rem));
      overflow: hidden;
    }

    :global([data-shell-mode='filetree']) :global(.wa-splitter) {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    :global([data-shell-mode='filetree']) .wa-preview {
      display: none;
    }

    /* ═══════════════════════════════════════════════════════
       Tab styling — rendered inside React islands (global)
       ═══════════════════════════════════════════════════════ */

    :global(.wa-strip__editor-tabs) {
      display: flex;
      align-items: center;
      gap: 0;
    }

    :global(.wa-strip__tab) {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      border: 0;
      background: transparent;
      padding: 0.4rem 0.65rem;
      color: var(--muted-foreground);
      font-family: var(--app-font-sans);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: color 100ms ease;
    }

    :global(.wa-strip__tab:hover) {
      color: var(--sl-color-text);
    }

    :global(.wa-strip__tab[aria-pressed='true']) {
      color: var(--sl-color-text);
    }

    :global(.wa-strip__tab[aria-pressed='true']::after) {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--sl-color-text);
    }

    :global(.wa-strip__label) {
      color: var(--muted-foreground);
      font-family: var(--app-font-sans);
      font-size: 0.75rem;
      font-weight: 600;
    }
  }
</style>
```

---

## 9. `src/components/DocsSidebar.astro`

Sidebar toggle, sets `data-shell-mode` on `<html>`.

```astro
---
import MobileMenuFooter from '@astrojs/starlight/components/MobileMenuFooter.astro';
import SidebarPersister from '@astrojs/starlight/components/SidebarPersister.astro';
import SidebarSublist from '@astrojs/starlight/components/SidebarSublist.astro';
import { FolderTree, PanelLeft } from 'lucide-react';
import DocsSidebarFileTree from './DocsSidebarFileTree.tsx';
import ScrollWrapper from './ScrollWrapper.tsx';
import { getCurrentDocsRelativePath, getDocsContentTreeState } from '../lib/docs/content-tree.mjs';

const { entry, sidebar } = Astro.locals.starlightRoute;
const { treeRoot } = getDocsContentTreeState();
const currentRelativePath = getCurrentDocsRelativePath(entry.filePath);
---

<div class="docs-sidebar-shell" data-sidebar-view-root data-sidebar-view="nav">
  <div class="docs-sidebar-view-toggle" role="toolbar" aria-label="Sidebar view">
    <button
      type="button"
      class="docs-sidebar-view-toggle__button"
      data-sidebar-view-button
      data-sidebar-view-target="nav"
      aria-pressed="true"
      aria-label="Sections"
      title="Sections"
    >
      <PanelLeft className="docs-sidebar-view-toggle__icon" size={17} strokeWidth={2.35} aria-hidden="true" />
    </button>
    <button
      type="button"
      class="docs-sidebar-view-toggle__button"
      data-sidebar-view-button
      data-sidebar-view-target="files"
      aria-pressed="false"
      aria-label="File tree"
      title="File tree"
    >
      <FolderTree className="docs-sidebar-view-toggle__icon" size={17} strokeWidth={2.35} aria-hidden="true" />
    </button>
  </div>

  <script is:inline>
    (() => {
      // Canonical source: src/lib/docs/shell-state.ts
      // Duplicated here because is:inline scripts cannot import ES modules.
      const SHELL_ATTR = 'data-shell-mode';           // SHELL_MODE_ATTR
      const SHELL_STORAGE = 'shell-mode';              // SHELL_MODE_STORAGE_KEY
      const FILE_STORAGE = 'shell-selected-file';      // FILE_STORAGE_KEY
      const FILE_RESET_EVENT = 'shell-file-reset';     // SHELL_FILE_RESET_EVENT

      function applySidebarView(root, view) {
        root.dataset.sidebarView = view;

        // Set unified shell mode
        const shellMode = view === 'files' ? 'filetree' : 'sections';
        document.documentElement.setAttribute(SHELL_ATTR, shellMode);
        try { localStorage.setItem(SHELL_STORAGE, shellMode); } catch {}

        root.querySelectorAll('[data-sidebar-view-button]').forEach((button) => {
          button.setAttribute(
            'aria-pressed',
            button.dataset.sidebarViewTarget === view ? 'true' : 'false'
          );
        });
      }

      document.querySelectorAll('[data-sidebar-view-root]').forEach((root) => {
        if (root.dataset.sidebarViewReady === 'true') return;
        root.dataset.sidebarViewReady = 'true';

        // Restore from unified shell-mode storage
        let savedMode = null;
        try { savedMode = localStorage.getItem(SHELL_STORAGE); } catch {}
        const initialView = savedMode === 'filetree' ? 'files' : 'nav';

        applySidebarView(root, initialView);

        root.querySelectorAll('[data-sidebar-view-button]').forEach((button) => {
          button.addEventListener('click', () => {
            const nextView = button.dataset.sidebarViewTarget === 'files' ? 'files' : 'nav';
            const wasFileTree = root.dataset.sidebarView === 'files';
            const isEnteringFiles = nextView === 'files';

            if (wasFileTree && !isEnteringFiles) {
              try {
                sessionStorage.removeItem(FILE_STORAGE);
              } catch {}
              window.dispatchEvent(
                new CustomEvent(FILE_RESET_EVENT, { detail: { reason: 'mode-change' } }),
              );
            }

            applySidebarView(root, nextView);
          });
        });
      });
    })();
  </script>

  <div data-sidebar-panel="nav">
    <ScrollWrapper client:load className="docs-sidebar-scroll">
      <SidebarPersister>
        <SidebarSublist sublist={sidebar} />
      </SidebarPersister>
    </ScrollWrapper>
  </div>

  <div data-sidebar-panel="files">
    <DocsSidebarFileTree
      nodes={treeRoot.children}
      currentRelativePath={currentRelativePath}
      client:load
    />
  </div>
</div>

<div class="md:sl-hidden">
  <MobileMenuFooter />
</div>

<style>
  @layer starlight.core {
    .docs-sidebar-shell {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      height: 100%;
      min-height: 0;
    }

    .docs-sidebar-view-toggle {
      flex-shrink: 0;
    }

    [data-sidebar-view-root][data-sidebar-view='nav'] [data-sidebar-panel='files'] {
      display: none;
    }

    [data-sidebar-view-root][data-sidebar-view='files'] [data-sidebar-panel='nav'] {
      display: none;
    }

    .docs-sidebar-view-toggle {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--separator);
      margin-inline: calc(-1 * var(--sl-sidebar-pad-x, 1rem));
      padding-inline: var(--sl-sidebar-pad-x, 1rem);
    }

    .docs-sidebar-view-toggle__button {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 0;
      background: transparent;
      width: 2.25rem;
      height: 2.25rem;
      color: var(--muted-foreground);
      cursor: pointer;
      transition: color 100ms ease;
    }

    .docs-sidebar-view-toggle__button:hover {
      color: var(--sl-color-text);
    }

    :global(.docs-sidebar-view-toggle__icon) {
      display: block;
      opacity: 0.92;
    }

    .docs-sidebar-view-toggle__button[aria-pressed='true'] {
      color: var(--sl-color-text);
    }

    .docs-sidebar-view-toggle__button[aria-pressed='true']::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--sl-color-text);
    }

    .docs-sidebar-view-toggle__button:focus-visible {
      outline: 1px solid var(--ring);
      outline-offset: -1px;
    }

    /* ── File Tree Header ── */

    :global(.docs-tree-container) {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    :global(.docs-tree-header) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem;
      height: 1.5rem;
      padding: 0 0.25rem;
      margin-bottom: 0.35rem;
    }

    :global(.docs-tree-header__name) {
      font-family: var(--app-font-mono);
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted-foreground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :global(.docs-tree-header__actions) {
      display: flex;
      gap: 0.15rem;
      flex-shrink: 0;
    }

    :global(.docs-tree-header__button) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border: 0;
      border-radius: 0.2rem;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 80ms ease, background-color 80ms ease;
    }

    :global(.docs-tree-header__button:hover) {
      opacity: 1;
      background: color-mix(in oklab, var(--foreground) 8%, transparent);
    }

    :global(.docs-tree-header__button:focus-visible) {
      outline: 1px solid var(--ring);
      outline-offset: -1px;
    }

    /* ── Empty State ── */

    :global(.docs-tree-empty) {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      flex: 1;
      padding: 2rem 1rem;
      color: var(--muted-foreground);
      font-family: var(--app-font-mono);
      font-size: 0.72rem;
      text-align: center;
    }

    :global(.docs-tree-empty__button) {
      border: 1px solid var(--separator);
      border-radius: 0.3rem;
      background: transparent;
      padding: 0.35rem 0.75rem;
      color: var(--sl-color-text);
      font-family: var(--app-font-mono);
      font-size: 0.68rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 80ms ease, border-color 80ms ease;
    }

    :global(.docs-tree-empty__button:hover) {
      background: color-mix(in oklab, var(--foreground) 6%, transparent);
      border-color: var(--sl-color-text);
    }

    :global(.docs-tree-empty__button) {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    :global(.docs-tree-empty__button:focus-visible) {
      outline: 1px solid var(--ring);
      outline-offset: 1px;
    }

    :global(.docs-tree-empty__button--muted) {
      border-color: transparent;
      color: var(--muted-foreground);
      font-size: 0.62rem;
    }

    :global(.docs-tree-empty__button--muted:hover) {
      border-color: transparent;
      color: var(--sl-color-text);
      background: transparent;
    }

    :global(.docs-tree-empty__detail) {
      font-size: 0.6rem;
      color: var(--muted-foreground);
      opacity: 0.7;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── File Tree Panel ── */

    [data-sidebar-panel='files'] {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
      padding: 0.4rem 0;
    }

    :global(.docs-sidebar-scroll) {
      flex: 1;
      min-height: 0;
    }

    :global(.docs-tree) {
      font-family: var(--app-font-mono);
      font-size: 0.78rem;
      line-height: 1.4;
      flex: 1;
      min-height: 0;
    }

    :global(.docs-tree__list) {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    :global(.docs-tree__branch) {
      display: grid;
    }

    :global(.docs-tree__branch-control) {
      display: block;
    }

    /* Shared row style */
    :global(.docs-tree__row) {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      height: 1.5rem;
      border-radius: 0.25rem;
      padding: 0 0.4rem;
      color: var(--muted-foreground);
      text-decoration: none;
      transition: background-color 80ms ease, color 80ms ease;
    }

    :global(.docs-tree__row--branch),
    :global(.docs-tree__row--file) {
      border: 0;
      background: transparent;
      width: 100%;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      font-size: inherit;
    }

    :global(.docs-tree__row--branch) {
      font-weight: 500;
      color: var(--sl-color-text);
    }

    :global(.docs-tree__row:hover) {
      background: color-mix(in oklab, var(--foreground) 6%, transparent);
      color: var(--sl-color-text);
    }

    :global(.docs-tree__row:focus-visible) {
      outline: 1px solid var(--ring);
      outline-offset: -1px;
    }

    /* Chevron */
    :global(.docs-tree__chevron) {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 12px;
      height: 12px;
      color: var(--muted-foreground);
      opacity: 0.6;
      transition: transform 120ms ease;
    }

    :global(.docs-tree__branch[data-state='open'] .docs-tree__chevron) {
      transform: rotate(90deg);
    }

    /* Label */
    :global(.docs-tree__label) {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      min-width: 0;
    }

    /* Icons */
    :global(.docs-tree-icon) {
      flex-shrink: 0;
      opacity: 0.7;
    }

    :global(.docs-tree-icon--folder-closed),
    :global(.docs-tree-icon--folder-open) {
      color: var(--icon-folder);
      opacity: 0.98;
    }

    :global(.docs-tree-icon--folder-open) {
      display: none;
    }

    :global(.docs-tree__branch[data-state='open'] .docs-tree-icon--folder-closed) {
      display: none;
    }

    :global(.docs-tree__branch[data-state='open'] .docs-tree-icon--folder-open) {
      display: block;
    }

    :global(.docs-tree-icon--file) {
      color: color-mix(in oklab, var(--sl-color-text) 72%, transparent);
      opacity: 0.88;
    }

    :global(.docs-tree-icon--markdown) {
      color: var(--icon-markdown);
      opacity: 0.96;
    }

    /* Name */
    :global(.docs-tree__name) {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Extension */
    :global(.docs-tree__ext) {
      flex-shrink: 0;
      color: var(--muted-foreground);
      font-size: 0.58rem;
      opacity: 0.4;
    }

    /* Indent guides */
    :global(.docs-tree__children) {
      display: grid;
      margin-inline-start: 6px;
      padding-inline-start: 12px;
      border-inline-start: 1px solid color-mix(in oklab, var(--foreground) 8%, transparent);
    }

    :global(.docs-tree__children[hidden]) {
      display: none;
    }

    :global(.docs-tree__guide) {
      display: none;
    }

    /* Selected */
    :global(.docs-tree__item[data-selected] .docs-tree__row) {
      background: color-mix(in oklab, var(--foreground) 10%, transparent);
      color: var(--sl-color-text);
    }

    :global(.docs-tree__item[data-selected] .docs-tree-icon--file),
    :global(.docs-tree__item[data-selected] .docs-tree-icon--markdown) {
      color: var(--sl-color-text);
      opacity: 1;
    }
  }
</style>
```

---

## 10. `src/styles/splitter.css`

Splitter panels, resize trigger.

```css
/* ------------------------------------------------------------------ */
/*  Ark UI Splitter — workbench editor/preview split                   */
/* ------------------------------------------------------------------ */

.wa-splitter {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.wa-splitter__panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: var(--editor-bg, var(--sl-color-bg));
}

/* ---- panel header (tab strip row) ---- */

.wa-splitter__panel-header {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 2.25rem;
  border-bottom: 1px solid var(--separator, var(--sl-color-hairline));
  padding: 0 0.75rem;
}

/* ---- panel body (fills remaining height) ---- */

.wa-splitter__panel-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---- resize trigger (divider) ---- */

.wa-splitter__trigger {
  outline: 0;
  display: grid;
  place-items: center;
  position: relative;
  background: transparent;
  border: none;
  padding: 0;
  cursor: col-resize;
  min-width: 6px;
}

.wa-splitter__trigger::before {
  content: '';
  position: absolute;
  inset-block: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  background: var(--border, var(--sl-color-hairline));
  transition: background-color 120ms ease;
}

.wa-splitter__trigger:hover::before,
.wa-splitter__trigger[data-dragging]::before {
  background: var(--sl-color-text-accent);
}

.wa-splitter__trigger:focus-visible::before {
  background: var(--sl-color-text-accent);
}
```

---

## 11. `src/styles/split-editor.css`

Editor surface, loading states, MDX styling.

```css
/* Split editor: editor-surface styles only */
/* Shell layout remains owned by DocsTwoColumnContent.astro */

.split-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--editor-bg);
  color: var(--editor-fg);
}

.split-editor__save-status {
  position: absolute;
  right: 0.75rem;
  bottom: 0.65rem;
  z-index: 4;
  border: 1px solid var(--editor-border);
  border-radius: 999px;
  background: color-mix(in oklab, var(--editor-chrome-bg) 92%, var(--editor-bg));
  padding: 0.18rem 0.45rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
  color: var(--editor-muted-fg);
  font-family: var(--app-font-mono);
  font-size: 0.6rem;
  font-weight: 600;
}

.split-editor__save-status[data-status='saving'] {
  color: var(--editor-muted-fg);
}

.split-editor__save-status[data-status='saved'] {
  color: var(--editor-success);
}

.split-editor__save-status[data-status='error'] {
  color: var(--editor-danger);
}

.split-editor__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--editor-bg);
}

.split-editor__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--editor-muted-fg);
  font-family: var(--app-font-mono);
  font-size: 0.8rem;
  background: var(--editor-bg);
}

.split-editor__loading--error {
  flex-direction: column;
  gap: 0.5rem;
}

.split-editor__retry {
  border: 1px solid var(--editor-border);
  border-radius: 0.25rem;
  background: color-mix(in oklab, var(--editor-bg) 85%, transparent);
  color: var(--editor-fg);
  padding: 0.2rem 0.55rem;
  font-family: var(--app-font-mono);
  font-size: 0.65rem;
  cursor: pointer;
}

.split-editor__local-preview {
  padding: 1rem;
  font-family: var(--app-font-sans);
  color: var(--editor-fg);
  line-height: 1.5;
}

.split-editor__local-preview pre {
  overflow-x: auto;
  background: color-mix(in oklab, var(--editor-chrome-bg) 85%, transparent);
  border: 1px solid var(--editor-border);
  padding: 0.75rem;
}

.split-editor__local-preview code {
  background: color-mix(in oklab, var(--editor-chrome-bg) 80%, transparent);
  border: 1px solid var(--editor-border);
  padding: 0.05rem 0.25rem;
}

.split-editor__local-preview--mdx {
  font-size: 1rem;
}

/* MDXEditor surface */

.split-editor__mdx {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: var(--editor-bg);
  color: var(--editor-fg);
}

.split-editor__mdx .mdxeditor-toolbar,
.split-editor__mdx [class*='_toolbarRoot'] {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  min-height: 2.25rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.375rem 0.625rem;
  background: var(--editor-chrome-bg);
  color: var(--editor-fg);
  border-bottom: 1px solid var(--editor-border);
  scrollbar-width: thin;
}

.split-editor__mdx :where([data-toolbar-item], button, [role='button']) {
  color: var(--editor-fg);
}

.split-editor__mdx :where([data-toolbar-item], button, [role='button']):hover {
  background: color-mix(in oklab, var(--editor-accent) 12%, var(--editor-chrome-bg));
}

.split-editor__mdx :where([data-toolbar-item][data-state='on'], [aria-pressed='true']) {
  background: color-mix(in oklab, var(--editor-accent) 16%, var(--editor-chrome-bg));
  color: var(--editor-fg);
}

.split-editor__mdx :where(svg) {
  color: currentColor;
  fill: currentColor;
}

.split-editor__mdx :where([class*='_toolbarButton'], [class*='_toolbarToggleItem'], [class*='_selectTrigger'], [class*='_toolbarButtonSelectTrigger']) {
  border: 1px solid transparent;
  background: transparent;
  color: var(--editor-fg);
}

.split-editor__mdx :where([class*='_toolbarButton']:hover, [class*='_toolbarToggleItem']:hover, [class*='_selectTrigger']:hover, [class*='_toolbarButtonSelectTrigger']:hover) {
  border-color: var(--editor-border);
  background: color-mix(in oklab, var(--editor-accent) 10%, var(--editor-chrome-bg));
}

.split-editor__mdx :where([class*='_toolbarButton'][data-state='on'], [class*='_toolbarToggleItem'][data-state='on']) {
  border-color: color-mix(in oklab, var(--editor-accent) 45%, var(--editor-border));
  background: color-mix(in oklab, var(--editor-accent) 16%, var(--editor-chrome-bg));
}

.split-editor__mdx :where([role='combobox'], [data-radix-select-trigger]) {
  background: transparent;
  color: var(--editor-fg);
  border-color: transparent;
}

.split-editor__mdx :where([class*='_editorRoot']) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  background: var(--editor-bg);
  color: var(--editor-fg);
}

.split-editor__mdx :where([class*='_editorWrapper']) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--editor-bg);
  color: var(--editor-fg);
  font-family: var(--app-font-sans);
  font-size: 0.9rem;
  line-height: 1.6;
}

.split-editor__mdx :where([class*='_contentEditable']) {
  min-height: 100%;
  padding: 0.875rem 0.875rem 3rem;
  background: var(--card);
  color: var(--editor-fg);
  caret-color: var(--editor-accent);
}

.split-editor__mdx :where([class*='_placeholder']) {
  color: var(--editor-muted-fg);
}

.split-editor__mdx :where(a) {
  color: var(--editor-accent);
}

.split-editor__mdx :where(blockquote) {
  border-inline-start: 3px solid var(--editor-border);
  color: var(--editor-muted-fg);
}

.split-editor__mdx :where(table, th, td) {
  border-color: var(--editor-border);
}

.split-editor__mdx :where(code):not(pre code) {
  background: color-mix(in oklab, var(--editor-chrome-bg) 84%, var(--editor-bg));
  border: 1px solid var(--editor-border);
}

.split-editor__mdx :where(pre) {
  background: color-mix(in oklab, var(--editor-chrome-bg) 86%, var(--editor-bg));
  border: 1px solid var(--editor-border);
}
```

---

## 12. `src/styles/scroll-area.css`

Scrollbar styling.

```css
/* ------------------------------------------------------------------ */
/*  Ark UI ScrollArea — custom thin scrollbar                          */
/*  Ported from web/src/components/ui/scroll-area.css                  */
/* ------------------------------------------------------------------ */

.scroll-area-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.scroll-area-viewport {
  min-height: 0;
  flex: 1;
  scrollbar-width: none;
  overscroll-behavior: contain;
  will-change: scroll-position;
}

.scroll-area-viewport::-webkit-scrollbar {
  display: none;
}

/* ---- scrollbar track ---- */

.scroll-area-scrollbar {
  position: absolute;
  z-index: 10;
  opacity: 0;
  transition: opacity 150ms ease;
  pointer-events: none;
  user-select: none;
  touch-action: none;
  background: transparent;
  contain: layout size style;
}

.scroll-area-scrollbar[data-hover],
.scroll-area-scrollbar[data-dragging],
.scroll-area-scrollbar[data-scrolling] {
  opacity: 1;
  pointer-events: auto;
}

.scroll-area-scrollbar[data-orientation='vertical'] {
  top: 2px;
  right: 2px;
  bottom: 2px;
  width: 6px;
}

.scroll-area-scrollbar[data-orientation='horizontal'] {
  left: 2px;
  right: 2px;
  bottom: 2px;
  height: 6px;
}

/* ---- thumb ---- */

.scroll-area-thumb {
  border-radius: 999px;
  background: light-dark(rgba(0, 0, 0, 0.22), rgba(255, 255, 255, 0.22));
  transition: background 120ms ease;
  will-change: transform;
}

.scroll-area-thumb:hover,
.scroll-area-scrollbar[data-dragging] .scroll-area-thumb {
  background: light-dark(rgba(0, 0, 0, 0.38), rgba(255, 255, 255, 0.38));
}

.scroll-area-scrollbar[data-orientation='vertical'] .scroll-area-thumb {
  min-height: 24px;
}

.scroll-area-scrollbar[data-orientation='horizontal'] .scroll-area-thumb {
  min-width: 24px;
}
```

---

## 13. `src/pages/api/docs-file.ts`

GET/POST endpoint for repo file content.

```ts
import type { APIRoute } from 'astro';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { normalize, resolve, extname } from 'node:path';

export const prerender = false;

const ALLOWED_EXTENSIONS = new Set(['.md', '.mdx']);
const DOCS_ROOT = resolve(process.cwd(), 'src/content/docs');

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function normalizeRelativePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.trim()) return null;

  const normalized = normalize(value)
    .replace(/^\\+/, '')
    .replace(/\\/g, '/');
  return normalized;
}

function resolveSafePath(relativePath: string) {
  const absolute = resolve(DOCS_ROOT, relativePath);
  const normalizedAbs = normalize(absolute).replace(/\\/g, '/');
  const normalizedRoot = normalize(DOCS_ROOT).replace(/\\/g, '/');

  const insideRoot = normalizedAbs === normalizedRoot
    || normalizedAbs.startsWith(`${normalizedRoot}/`);
  if (!insideRoot) return null;

  const extension = extname(normalizedAbs).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return null;

  return absolute;
}

function isAuthorized(request: Request) {
  const token = process.env.DOCS_FILE_WRITE_TOKEN;

  // When a write token is configured, enforce it.
  if (token) {
    const auth = request.headers.get('authorization');
    if (!auth) return false;
    const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (supplied !== token) return false;
  } else {
    // No token configured — only allow writes in dev mode.
    if (!import.meta.env.DEV) return false;
  }

  // Same-origin check when both headers are present.
  const host = request.headers.get('host');
  const origin = request.headers.get('origin');
  if (host && origin) {
    try {
      if (new URL(origin).host !== host) return false;
    } catch {
      return false;
    }
  }

  return true;
}

export const GET: APIRoute = async ({ url }) => {
  const rawPath = normalizeRelativePath(url.searchParams.get('path'));
  if (!rawPath) return jsonError(400, 'Missing path parameter');

  const absolutePath = resolveSafePath(rawPath);
  if (!absolutePath) return jsonError(400, 'Invalid path');
  if (!existsSync(absolutePath)) return jsonError(404, 'File not found');

  try {
    const content = await readFile(absolutePath, 'utf-8');
    return new Response(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    return jsonError(500, 'Failed to read file');
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return jsonError(401, 'Unauthorized');

  let body: { path?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Malformed JSON body');
  }

  const rawPath = normalizeRelativePath(body.path);
  if (!rawPath) return jsonError(400, 'Missing path');

  const absolutePath = resolveSafePath(rawPath);
  if (!absolutePath) return jsonError(400, 'Invalid path');

  if (typeof body.content !== 'string') return jsonError(400, 'Missing or invalid content');
  if (!existsSync(absolutePath)) return jsonError(404, 'File not found');

  try {
    await writeFile(absolutePath, body.content, 'utf-8');
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    return jsonError(500, 'Failed to write file');
  }
};
```

---

## 14. `src/lib/docs/content-tree.mjs`

Builds file tree structure at build time.

```js
import { existsSync, readdirSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

const DOCS_ROOT = 'src/content/docs';
const repoRoot = process.cwd();
const docsRootDir = DOCS_ROOT;

function compareEntries(left, right) {
  if (left.isDirectory() && !right.isDirectory()) return -1;
  if (!left.isDirectory() && right.isDirectory()) return 1;
  return left.name.localeCompare(right.name);
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function stripExtension(relativePath) {
  return relativePath.replace(/\.[^.]+$/, '');
}

function toDocsHref(relativePath) {
  let slug = stripExtension(normalizePath(relativePath));

  if (slug === 'index') return '/';
  if (slug.endsWith('/index')) slug = slug.slice(0, -'/index'.length);

  return `/${slug}/`;
}

function buildTreeNodes(absoluteDir, relativeDir = '') {
  return readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .sort(compareEntries)
    .map((entry) => {
      const nextRelativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const absolutePath = resolve(absoluteDir, entry.name);

      if (entry.isDirectory()) {
        return {
          id: `dir:${nextRelativePath}`,
          name: entry.name,
          relativePath: nextRelativePath,
          children: buildTreeNodes(absolutePath, nextRelativePath),
        };
      }

      return {
        id: `file:${nextRelativePath}`,
        name: entry.name,
        relativePath: nextRelativePath,
        docsHref: toDocsHref(nextRelativePath),
        extension: extname(entry.name).toLowerCase(),
      };
    });
}

export function getCurrentDocsRelativePath(filePath) {
  if (!filePath) return '';

  const docsRoot = resolve(repoRoot, docsRootDir);
  const normalizedPath = normalizePath(filePath);

  if (normalizedPath.startsWith(`${docsRootDir}/`)) {
    return normalizePath(normalizedPath.slice(docsRootDir.length + 1));
  }

  const relativePath = normalizePath(relative(docsRoot, resolve(repoRoot, filePath)));
  return relativePath.startsWith('..') ? '' : relativePath;
}

export function getDocsContentTreeState() {
  const absoluteRoot = resolve(repoRoot, docsRootDir);

  if (!existsSync(absoluteRoot)) {
    return {
      treeRoot: {
        id: 'dir:root',
        name: 'docs',
        relativePath: '',
        children: [],
      },
    };
  }

  const children = buildTreeNodes(absoluteRoot);

  return {
    treeRoot: {
      id: 'dir:root',
      name: 'docs',
      relativePath: '',
      children,
    },
  };
}

export { DOCS_ROOT };
```
