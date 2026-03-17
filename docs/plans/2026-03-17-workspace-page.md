# Workspace Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-bleed workspace page where users open project files in type-appropriate editors and apply registered service functions to transform data — with an integrated AI pane and contextual help rail.

**Architecture:** The workspace composes existing building blocks: `Workbench` (pane/tab layout), editor surfaces (CodeMirror/MDX/Tiptap), `DocumentFileTable` (file listing), `useAssistantChat` (AI), `platformApiFetch` (function execution), and `loadPublicServices` (function discovery). New wiring: workspace-specific app shell mode (no header, rail snapped to compact), cloud file loading via signed URLs into editors, file-type→function matching via tags, and 20% denser styling.

**Tech Stack:** React 19, Workbench component (Ark UI Splitter), CodeMirror 6, Tiptap, Supabase storage (signed URLs), platform-api (function execution), SSE streaming (AI chat).

---

## Scope Lock

This plan builds the workspace page with file browsing, editing, and function surfacing. It does NOT add:
- Workflow orchestration (multi-step function chaining)
- New editor surfaces beyond the three that exist
- File creation/upload (reuses existing upload flow from Assets)
- New service function registrations
- Backend changes (all APIs exist)

## Key Codebase References

**App shell:**
- `web/src/components/layout/AppLayout.tsx` — `AppShellInner`, `isWorkspaceRoute` (line 203), `isFullBleedRoute`, `desktopNavOpened` state, `headerHeight`
- `web/src/components/shell/TopCommandBar.tsx` — header bar (60px desktop, 44px mobile)
- `web/src/components/shell/TopCommandBar.css` — grid layout, `.top-command-bar--minimal`
- `web/src/components/shell/LeftRailShadcn.tsx` — `desktopCompact` prop controls icon-only mode
- `web/src/lib/styleTokens.ts` — `headerHeight: 60`, `navbarCompactWidth: 60`

**Workbench:**
- `web/src/components/workbench/Workbench.tsx` — `WorkbenchProps`, `WorkbenchHandle` (imperative: `addTab`, `removeTab`, `toggleTab`)
- `web/src/components/workbench/workbenchState.ts` — `Pane` type, normalization functions

**Editors (in superuser, to be imported):**
- `web/src/pages/superuser/CodeEditorSurface.tsx` — CodeMirror 6 (JS/TS/Python/Go/Rust/YAML/JSON/CSS/HTML)
- `web/src/pages/superuser/MdxEditorSurface.tsx` — MDX editor
- `web/src/pages/superuser/TiptapEditorSurface.tsx` — Tiptap WYSIWYG
- `web/src/pages/superuser/editorRegistry.ts` — `resolveEditorProfile(extension, preferred)` routes file types to editors
- `web/src/pages/superuser/useWorkspaceEditor.tsx` — hook with dirty tracking, view mode, file tree (local FS only)

**Document/file infrastructure:**
- `web/src/hooks/useProjectDocuments.ts` — fetches `source_documents` for a project
- `web/src/hooks/useProjectFocus.ts` — `resolvedProjectId`, `resolvedProjectName`
- `web/src/components/documents/DocumentFileTable.tsx` — file table with selection, sorting, row actions
- `web/src/lib/projectDetailHelpers.ts` — `createSignedUrl`, bucket name from `VITE_DOCUMENTS_BUCKET`
- Supabase storage bucket: `documents`

**Services/functions:**
- `web/src/pages/settings/services-panel.api.ts` — `loadPublicServices()` returns enabled services + functions
- `web/src/pages/settings/services-panel.types.ts` — `ServiceFunctionRow` (tags, entrypoint, http_method, parameter_schema)
- `web/src/lib/platformApi.ts` — `platformApiFetch(path, init)` with JWT auth
- `service_functions.tags` — JSONB array used for matching (e.g. `["javalang","java","parse"]`)

**AI:**
- `web/src/hooks/useAssistantChat.ts` — `sendMessage`, `messages`, `isStreaming`, `newThread`, `stopStreaming`
- `web/src/components/shell/AssistantDockHost.tsx` — floating chat container
- `web/src/components/shell/RightRailChatPanel.tsx` — docked chat in right rail

**Existing patterns:**
- `web/src/pages/ProjectAssetsPage.tsx` — Assets page (Upload/Files/Preview workbench)
- `web/src/pages/useAssetsWorkbench.tsx` — hook returning `renderContent`
- `web/src/pages/Workspace.tsx` — current workspace page (local file system only, to be replaced)

**Nav/routing:**
- `web/src/components/shell/nav-config.ts` — Workspace at line 76: `{ label: 'Workspace', icon: IconFileCode, path: '/app/workspace' }`
- `web/src/router.tsx` — route for `/app/workspace`

## File Layout

All new files in `web/src/pages/workspace/`:
- `WorkspacePage.tsx` — page component
- `workspace-tokens.css` — dense spacing overrides
- `WorkspaceFileBrowser.tsx` — file browser pane
- `useWorkspaceCloud.tsx` — hook: cloud file loading + editor wiring
- `useWorkspaceFunctions.tsx` — hook: function discovery + execution
- `WorkspaceFunctionPanel.tsx` — function action panel
- `WorkspaceAIPane.tsx` — embedded AI chat
- `WorkspaceHelpRail.tsx` — right rail help/docs

Modified files:
- `components/layout/AppLayout.tsx` — workspace shell mode (no header, rail snapped)
- `router.tsx` — point workspace route to new page

---

### Task 1: Workspace app shell mode — no header, rail snapped to compact

The workspace route gets its own app shell behavior. When the user navigates to `/app/workspace`, the top header disappears and the nav rail snaps to icon-only (60px). A small restore icon in the workspace lets the user bring back normal chrome. Navigating away from workspace restores normal layout automatically.

**Files:**
- Modify: `web/src/components/layout/AppLayout.tsx`

**Step 1: Read AppLayout.tsx**

Read: `web/src/components/layout/AppLayout.tsx`
Understand the current `isWorkspaceRoute` detection (line 203), `desktopNavOpened` state, `headerHeight` calculation, and the `<header>` / `<aside>` rendering.

**Step 2: Add workspace shell mode state**

In `AppShellInner`, add workspace-aware header/rail behavior. The workspace route automatically triggers the mode, but a restore button can override it for the session:

```tsx
// After existing state declarations:
const [workspaceRestored, setWorkspaceRestored] = useState(false);

// Workspace shell mode: active on workspace route unless user restored
const workspaceShellMode = isWorkspaceRoute && !workspaceRestored;

// Reset restored state when leaving workspace
useEffect(() => {
  if (!isWorkspaceRoute) setWorkspaceRestored(false);
}, [isWorkspaceRoute]);

// Snap rail to compact when entering workspace
useEffect(() => {
  if (workspaceShellMode) setDesktopNavOpened(false);
}, [workspaceShellMode]);
```

**Step 3: Zero the header height in workspace mode**

Update the `headerHeight` calculation:

```tsx
const headerHeight = workspaceShellMode ? 0
  : isMobile ? styleTokens.shell.headerHeightMobile
  : styleTokens.shell.headerHeight;
```

**Step 4: Conditionally hide the header element**

Wrap the `<header>` element so it doesn't render in workspace mode:

```tsx
{!workspaceShellMode && (
  <header
    style={{
      position: 'fixed',
      insetInlineStart: `${mainInsetStart}px`,
      insetInlineEnd: 0,
      top: 0,
      height: `${headerHeight}px`,
      zIndex: 110,
      backgroundColor: 'var(--chrome, var(--background))',
      borderBottom: 'none',
    }}
  >
    <TopCommandBar ... />
    <div data-testid="app-shell-top-divider" ... />
  </header>
)}
```

**Step 5: Pass restore callback via context or prop**

The workspace page needs a way to call `setWorkspaceRestored(true)`. Add it to a context or pass via outlet context:

```tsx
// In AppShellInner, create context value:
const workspaceContext = useMemo(() => ({
  isWorkspaceShellMode: workspaceShellMode,
  restoreShell: () => setWorkspaceRestored(true),
  enterWorkspaceMode: () => setWorkspaceRestored(false),
}), [workspaceShellMode]);

// Pass through Outlet context:
<main style={shellMainStyle}>
  {isFullBleedRoute ? (
    <Outlet context={workspaceContext} />
  ) : (
    <AppPageShell mode="fluid">
      <Outlet context={workspaceContext} />
    </AppPageShell>
  )}
</main>
```

**Step 6: Verify**

Navigate to `/app/workspace`. Expect: header gone, rail at 60px icon-only. Navigate to `/app/assets`. Expect: header back, rail state restored. Rail toggle still works on workspace page.

**Step 7: Commit**

```bash
git add web/src/components/layout/AppLayout.tsx
git commit -m "feat: workspace shell mode — no header, rail snapped to compact on /app/workspace"
```

---

### Task 2: Workspace page shell with dense layout and restore button

**Files:**
- Create: `web/src/pages/workspace/WorkspacePage.tsx`
- Create: `web/src/pages/workspace/workspace-tokens.css`
- Modify: `web/src/router.tsx`

**Step 1: Create the dense styling override**

```css
/* web/src/pages/workspace/workspace-tokens.css */
.workspace-dense {
  --workspace-font-size: 0.8125rem;    /* ~13px vs default 16px ≈ 20% smaller */
  --workspace-line-height: 1.35;
  --workspace-gap: 0.25rem;
  --workspace-padding: 0.375rem;
  font-size: var(--workspace-font-size);
  line-height: var(--workspace-line-height);
}

.workspace-dense .workbench-pane {
  gap: var(--workspace-gap);
  padding: var(--workspace-padding);
}

.workspace-dense table th,
.workspace-dense table td {
  padding: 0.25rem 0.5rem;
  font-size: var(--workspace-font-size);
}
```

**Step 2: Create the page component with restore button**

```tsx
// web/src/pages/workspace/WorkspacePage.tsx
import './workspace-tokens.css';

import { useOutletContext } from 'react-router-dom';
import { Workbench, type WorkbenchTab } from '@/components/workbench/Workbench';
import type { Pane } from '@/components/workbench/workbenchState';
import { IconFiles, IconFileCode, IconBrain, IconHelp, IconMaximize } from '@tabler/icons-react';

type WorkspaceOutletContext = {
  isWorkspaceShellMode: boolean;
  restoreShell: () => void;
  enterWorkspaceMode: () => void;
};

const WORKSPACE_TABS: WorkbenchTab[] = [
  { id: 'files', label: 'Files', icon: IconFiles },
  { id: 'editor', label: 'Editor', icon: IconFileCode },
  { id: 'ai', label: 'AI', icon: IconBrain },
  { id: 'help', label: 'Help', icon: IconHelp },
];

const WORKSPACE_DEFAULT_PANES: Pane[] = [
  { id: 'pane-files', tabs: ['files'], activeTab: 'files', width: 18, minWidth: 14, maxWidth: 24, maxTabs: 1 },
  { id: 'pane-editor', tabs: ['editor'], activeTab: 'editor', width: 44, minWidth: 30 },
  { id: 'pane-ai', tabs: ['ai'], activeTab: 'ai', width: 22, minWidth: 16 },
  { id: 'pane-help', tabs: ['help'], activeTab: 'help', width: 16, minWidth: 12, maxWidth: 24, maxTabs: 1 },
];

export function Component() {
  const ctx = useOutletContext<WorkspaceOutletContext>();

  const renderContent = (tabId: string) => {
    switch (tabId) {
      case 'files':
        return <div className="p-2 text-muted-foreground">File browser placeholder</div>;
      case 'editor':
        return <div className="p-2 text-muted-foreground">Editor placeholder</div>;
      case 'ai':
        return <div className="p-2 text-muted-foreground">AI pane placeholder</div>;
      case 'help':
        return <div className="p-2 text-muted-foreground">Help rail placeholder</div>;
      default:
        return null;
    }
  };

  // Restore button — visible when in workspace shell mode (no header)
  const restoreButton = ctx?.isWorkspaceShellMode ? (
    <button
      onClick={ctx.restoreShell}
      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title="Restore header"
    >
      <IconMaximize size={14} stroke={1.75} />
    </button>
  ) : null;

  return (
    <div className="workspace-dense h-full w-full min-h-0">
      <Workbench
        tabs={WORKSPACE_TABS}
        defaultPanes={WORKSPACE_DEFAULT_PANES}
        saveKey="workspace-v1"
        renderContent={renderContent}
        toolbarActions={restoreButton}
        maxColumns={4}
      />
    </div>
  );
}
```

**Step 3: Wire the route**

In `web/src/router.tsx`, update the workspace route to point to the new page:

```tsx
{ path: 'workspace', lazy: () => import('./pages/workspace/WorkspacePage') },
```

Remove or rename the old `web/src/pages/Workspace.tsx` if it exists (it uses local file system).

**Step 4: Verify**

Navigate to `/app/workspace`. Expect:
- Header is gone, rail is at icon-only 60px
- Four-pane layout with placeholder text
- Dense font sizing (13px)
- Small restore icon in the toolbar area — clicking it brings back the header
- Navigating away restores normal layout

**Step 5: Commit**

```bash
git add web/src/pages/workspace/ web/src/router.tsx
git commit -m "feat: workspace page shell — dense layout, restore button, four-pane workbench"
```

---

### Task 3: File browser pane — project documents from Supabase

**Files:**
- Create: `web/src/pages/workspace/WorkspaceFileBrowser.tsx`
- Modify: `web/src/pages/workspace/WorkspacePage.tsx`

**Step 1: Create the file browser component**

This wraps `DocumentFileTable` with project-scoped document loading:

```tsx
// web/src/pages/workspace/WorkspaceFileBrowser.tsx
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import type { ProjectDocumentRow } from '@/types';

type Props = {
  activeDoc: string | null;
  onDocSelect: (doc: ProjectDocumentRow) => void;
};

export function WorkspaceFileBrowser({ activeDoc, onDocSelect }: Props) {
  const { resolvedProjectId } = useProjectFocus();
  const {
    docs, loading, error,
    selected, toggleSelect, toggleSelectAll, allSelected, someSelected,
  } = useProjectDocuments(resolvedProjectId);

  if (!resolvedProjectId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a project to view files.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Project Files ({docs.length})
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <DocumentFileTable
          docs={docs}
          loading={loading}
          error={error}
          selected={selected}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          allSelected={allSelected}
          someSelected={someSelected}
          activeDoc={activeDoc}
          onDocClick={onDocSelect}
          hideStatus
          className="workspace-dense"
        />
      </div>
    </div>
  );
}
```

**Step 2: Wire into WorkspacePage**

Add state for selected document and pass to file browser:

```tsx
import { useState } from 'react';
import { WorkspaceFileBrowser } from './WorkspaceFileBrowser';
import type { ProjectDocumentRow } from '@/types';

// Inside Component():
const [activeDoc, setActiveDoc] = useState<ProjectDocumentRow | null>(null);

// In renderContent:
case 'files':
  return (
    <WorkspaceFileBrowser
      activeDoc={activeDoc?.source_uid ?? null}
      onDocSelect={setActiveDoc}
    />
  );
```

**Step 3: Verify**

Select a project via the project switcher (still accessible by expanding the rail), navigate to workspace. Expect: left pane shows project files from Supabase. Clicking a file highlights it.

**Step 4: Commit**

```bash
git add web/src/pages/workspace/
git commit -m "feat: workspace file browser pane from project documents"
```

---

### Task 4: Editor pane — load file content and route to correct editor

**Files:**
- Create: `web/src/pages/workspace/useWorkspaceCloud.tsx`
- Modify: `web/src/pages/workspace/WorkspacePage.tsx`

**Step 1: Create the cloud file loading hook**

```tsx
// web/src/pages/workspace/useWorkspaceCloud.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ProjectDocumentRow } from '@/types';

const BUCKET = import.meta.env.VITE_DOCUMENTS_BUCKET || 'documents';

type CloudEditorState = {
  content: string | null;
  originalContent: string | null;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
  extension: string;
};

export function useWorkspaceCloud(doc: ProjectDocumentRow | null) {
  const [state, setState] = useState<CloudEditorState>({
    content: null,
    originalContent: null,
    loading: false,
    error: null,
    isDirty: false,
    extension: '',
  });

  // Load file content when doc changes
  useEffect(() => {
    if (!doc?.source_locator) {
      setState(s => ({ ...s, content: null, originalContent: null, extension: '', error: null }));
      return;
    }

    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));

    (async () => {
      const sourceKey = doc.source_locator.replace(/^\/+/, '');
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(sourceKey, 60 * 20);

      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setState(s => ({ ...s, loading: false, error: error?.message ?? 'Failed to load file' }));
        return;
      }

      try {
        const resp = await fetch(data.signedUrl);
        const text = await resp.text();
        if (cancelled) return;

        const ext = '.' + (doc.doc_title?.split('.').pop() ?? doc.source_type ?? 'txt');
        setState({
          content: text,
          originalContent: text,
          loading: false,
          error: null,
          isDirty: false,
          extension: ext,
        });
      } catch (err) {
        if (cancelled) return;
        setState(s => ({ ...s, loading: false, error: String(err) }));
      }
    })();

    return () => { cancelled = true; };
  }, [doc?.source_uid]);

  const setContent = useCallback((value: string) => {
    setState(s => ({ ...s, content: value, isDirty: value !== s.originalContent }));
  }, []);

  return { ...state, setContent };
}
```

**Step 2: Wire editor surfaces into WorkspacePage**

Import the editor surfaces from superuser (or move to shared if import paths cause issues):

```tsx
import { useWorkspaceCloud } from './useWorkspaceCloud';
import { resolveEditorProfile } from '@/pages/superuser/editorRegistry';

// Inside Component():
const cloudEditor = useWorkspaceCloud(activeDoc);
const editorProfile = resolveEditorProfile(cloudEditor.extension, 'code');

// In renderContent:
case 'editor':
  if (!activeDoc) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a file to edit.</div>;
  }
  if (cloudEditor.loading) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }
  if (cloudEditor.error) {
    return <div className="flex h-full items-center justify-center text-sm text-destructive">{cloudEditor.error}</div>;
  }
  if (cloudEditor.content === null) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No content.</div>;
  }

  // Render the resolved editor surface
  const EditorComponent = editorProfile.component;
  return (
    <EditorComponent
      content={cloudEditor.content}
      originalContent={cloudEditor.originalContent ?? ''}
      extension={cloudEditor.extension}
      fileKey={activeDoc.source_uid}
      viewMode="edit"
      onChange={cloudEditor.setContent}
    />
  );
```

**Step 3: Verify**

Select a project, click a text-based file (.md, .json, .css, .tsx). Expect: file content loads in the appropriate editor (CodeMirror for code, MDX for markdown). Editing marks content as dirty.

**Step 4: Commit**

```bash
git add web/src/pages/workspace/
git commit -m "feat: workspace editor pane — cloud file loading with editor routing"
```

---

### Task 5: Function surfacing — discover and filter by file type

**Files:**
- Create: `web/src/pages/workspace/useWorkspaceFunctions.tsx`
- Create: `web/src/pages/workspace/WorkspaceFunctionPanel.tsx`
- Modify: `web/src/pages/workspace/WorkspacePage.tsx`

**Step 1: Create the function discovery hook**

```tsx
// web/src/pages/workspace/useWorkspaceFunctions.tsx
import { useState, useEffect, useMemo } from 'react';
import { loadPublicServices } from '@/pages/settings/services-panel.api';
import type { ServiceFunctionRow } from '@/pages/settings/services-panel.types';

/** Map file extensions to tag keywords for matching. */
const EXT_TAG_MAP: Record<string, string[]> = {
  '.java': ['java', 'javalang'],
  '.py': ['python'],
  '.json': ['json'],
  '.csv': ['csv', 'tabular'],
  '.md': ['markdown'],
  '.html': ['html'],
  '.xml': ['xml'],
  '.yaml': ['yaml'],
  '.yml': ['yaml'],
};

export function useWorkspaceFunctions(fileExtension: string) {
  const [allFunctions, setAllFunctions] = useState<ServiceFunctionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await loadPublicServices();
      if (cancelled) return;
      setAllFunctions(result.data?.functions ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const matchedFunctions = useMemo(() => {
    if (!fileExtension) return [];
    const ext = fileExtension.toLowerCase();
    const matchTags = EXT_TAG_MAP[ext] ?? [ext.replace('.', '')];

    return allFunctions.filter(fn => {
      if (!fn.tags || fn.tags.length === 0) return false;
      return fn.tags.some(tag => matchTags.includes(tag.toLowerCase()));
    });
  }, [allFunctions, fileExtension]);

  const universalFunctions = useMemo(() => {
    return allFunctions.filter(fn =>
      fn.tags?.some(t => t.toLowerCase() === 'universal')
    );
  }, [allFunctions]);

  return { matchedFunctions, universalFunctions, allFunctions, loading };
}
```

**Step 2: Create the function action panel**

```tsx
// web/src/pages/workspace/WorkspaceFunctionPanel.tsx
import { useState } from 'react';
import { platformApiFetch } from '@/lib/platformApi';
import type { ServiceFunctionRow } from '@/pages/settings/services-panel.types';

type Props = {
  functions: ServiceFunctionRow[];
  universalFunctions: ServiceFunctionRow[];
  loading: boolean;
  fileContent: string | null;
  fileName: string | null;
  onResult: (result: unknown) => void;
};

export function WorkspaceFunctionPanel({
  functions, universalFunctions, loading, fileContent, fileName, onResult,
}: Props) {
  const [executing, setExecuting] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const runFunction = async (fn: ServiceFunctionRow) => {
    if (!fileContent) return;
    setExecuting(fn.function_name);
    setLastError(null);
    try {
      const resp = await platformApiFetch(fn.entrypoint, {
        method: fn.http_method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fileContent }),
      });
      const data = await resp.json();
      onResult(data);
    } catch (err) {
      setLastError(String(err));
    } finally {
      setExecuting(null);
    }
  };

  if (loading) {
    return <div className="p-2 text-xs text-muted-foreground">Loading functions...</div>;
  }

  if (!fileName) {
    return <div className="p-2 text-xs text-muted-foreground">Open a file to see available functions.</div>;
  }

  const allFns = [...functions, ...universalFunctions];

  if (allFns.length === 0) {
    return <div className="p-2 text-xs text-muted-foreground">No functions available for this file type.</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Functions ({allFns.length})
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {allFns.map(fn => (
          <button
            key={fn.function_id}
            onClick={() => runFunction(fn)}
            disabled={executing !== null}
            className="w-full text-left px-2 py-1.5 hover:bg-muted/50 border-b border-border/50 transition-colors"
          >
            <div className="text-xs font-medium">{fn.label || fn.function_name}</div>
            {fn.description && (
              <div className="text-[0.6875rem] text-muted-foreground truncate">{fn.description}</div>
            )}
            {executing === fn.function_name && (
              <div className="text-[0.6875rem] text-primary mt-0.5">Running...</div>
            )}
          </button>
        ))}
      </div>
      {lastError && (
        <div className="shrink-0 px-2 py-1 text-xs text-destructive border-t border-border">
          {lastError}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Wire into WorkspacePage**

```tsx
import { useWorkspaceFunctions } from './useWorkspaceFunctions';
import { WorkspaceFunctionPanel } from './WorkspaceFunctionPanel';

// Inside Component():
const { matchedFunctions, universalFunctions, loading: fnsLoading } = useWorkspaceFunctions(cloudEditor.extension);
const [functionResult, setFunctionResult] = useState<unknown>(null);

// Temporarily place functions in the AI pane (AI integration comes in Task 7):
case 'ai':
  return (
    <WorkspaceFunctionPanel
      functions={matchedFunctions}
      universalFunctions={universalFunctions}
      loading={fnsLoading}
      fileContent={cloudEditor.content}
      fileName={activeDoc?.doc_title ?? null}
      onResult={setFunctionResult}
    />
  );
```

**Step 4: Verify**

Open a .java file → expect javalang functions listed. Open a .md file → no javalang functions. Click a function → runs against file content, result stored.

**Step 5: Commit**

```bash
git add web/src/pages/workspace/
git commit -m "feat: workspace function surfacing — discover and execute by file type"
```

---

### Task 6: Function result display

**Files:**
- Modify: `web/src/pages/workspace/WorkspacePage.tsx`

**Step 1: Add a result viewer tab**

```tsx
import { useRef, useCallback } from 'react';
import type { WorkbenchHandle } from '@/components/workbench/Workbench';
import { JsonViewer } from '@/components/json/JsonViewer';

// Add to WORKSPACE_TABS:
{ id: 'result', label: 'Result', icon: IconFileCode },

// Inside Component():
const workbenchRef = useRef<WorkbenchHandle>(null);

const handleFunctionResult = useCallback((result: unknown) => {
  setFunctionResult(result);
  workbenchRef.current?.addTab('result', 'pane-editor');
}, []);

// Pass ref and use handler:
<Workbench ref={workbenchRef} ... />

// In renderContent:
case 'result':
  if (!functionResult) {
    return <div className="p-2 text-sm text-muted-foreground">Run a function to see results.</div>;
  }
  return (
    <div className="h-full overflow-auto p-2">
      <JsonViewer data={functionResult} />
    </div>
  );
```

**Step 2: Update WorkspaceFunctionPanel to use handleFunctionResult**

Pass `handleFunctionResult` instead of `setFunctionResult` as the `onResult` prop.

**Step 3: Verify**

Open a .java file, run `javalang_parse`. Expect: result tab opens in the editor pane with parsed AST JSON.

**Step 4: Commit**

```bash
git add web/src/pages/workspace/
git commit -m "feat: workspace function result display with auto-tab switch"
```

---

### Task 7: AI pane — embedded context-aware chat with quick actions

**Files:**
- Create: `web/src/pages/workspace/WorkspaceAIPane.tsx`
- Modify: `web/src/pages/workspace/WorkspacePage.tsx`

**Step 1: Create the embedded AI pane**

```tsx
// web/src/pages/workspace/WorkspaceAIPane.tsx
import { useRef, useEffect } from 'react';
import { useAssistantChat } from '@/hooks/useAssistantChat';
import type { ServiceFunctionRow } from '@/pages/settings/services-panel.types';

type Props = {
  fileName: string | null;
  fileExtension: string;
  fileContent: string | null;
  availableFunctions: ServiceFunctionRow[];
};

export function WorkspaceAIPane({ fileName, fileExtension, fileContent, availableFunctions }: Props) {
  const {
    messages, isStreaming, error,
    sendMessage, newThread, stopStreaming,
  } = useAssistantChat();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async () => {
    const input = inputRef.current?.value.trim();
    if (!input || isStreaming) return;

    const contextParts: string[] = [];
    if (fileName) contextParts.push(`Open file: ${fileName} (${fileExtension})`);
    if (availableFunctions.length > 0) {
      contextParts.push(`Available functions: ${availableFunctions.map(f => f.function_name).join(', ')}`);
    }

    const contextPrefix = contextParts.length > 0
      ? `[Context: ${contextParts.join('. ')}]\n\n`
      : '';

    inputRef.current!.value = '';
    await sendMessage(contextPrefix + input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-2 py-1 space-y-2">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {fileName
              ? `Ask about ${fileName} or request a transformation.`
              : 'Open a file to get started.'}
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`text-xs leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user' ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <span className="font-medium">{msg.role === 'user' ? 'You' : 'AI'}:</span>{' '}
            {msg.content}
          </div>
        ))}
        {isStreaming && (
          <div className="text-xs text-primary animate-pulse">Thinking...</div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-1.5">
        <div className="flex gap-1">
          <textarea
            ref={inputRef}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 resize-none rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={isStreaming ? stopStreaming : handleSend}
            className="shrink-0 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
          >
            {isStreaming ? 'Stop' : 'Send'}
          </button>
        </div>
        <div className="flex justify-between mt-0.5">
          <button onClick={newThread} className="text-[0.625rem] text-muted-foreground hover:text-foreground">
            New thread
          </button>
          <span className="text-[0.625rem] text-muted-foreground">Enter to send</span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Replace the function panel in the AI pane with quick actions + chat**

```tsx
import { WorkspaceAIPane } from './WorkspaceAIPane';

// In renderContent, replace the 'ai' case:
case 'ai':
  return (
    <div className="flex h-full flex-col">
      {/* Quick function actions */}
      {matchedFunctions.length > 0 && (
        <div className="shrink-0 border-b border-border px-2 py-1.5">
          <div className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Quick Actions
          </div>
          <div className="flex flex-wrap gap-1">
            {matchedFunctions.slice(0, 6).map(fn => (
              <button
                key={fn.function_id}
                onClick={() => handleRunFunction(fn)}
                className="rounded border border-border px-1.5 py-0.5 text-[0.6875rem] hover:bg-muted"
              >
                {fn.label || fn.function_name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <WorkspaceAIPane
          fileName={activeDoc?.doc_title ?? null}
          fileExtension={cloudEditor.extension}
          fileContent={cloudEditor.content}
          availableFunctions={matchedFunctions}
        />
      </div>
    </div>
  );
```

**Step 3: Verify**

Open a .java file. Expect: AI pane shows quick-action buttons for javalang functions + chat input below. Sending a message includes file context. Streaming response works.

**Step 4: Commit**

```bash
git add web/src/pages/workspace/
git commit -m "feat: workspace AI pane with context-aware chat and quick function actions"
```

---

### Task 8: Help rail — contextual documentation

**Files:**
- Create: `web/src/pages/workspace/WorkspaceHelpRail.tsx`
- Modify: `web/src/pages/workspace/WorkspacePage.tsx`

**Step 1: Create the help rail component**

```tsx
// web/src/pages/workspace/WorkspaceHelpRail.tsx
import type { ServiceFunctionRow } from '@/pages/settings/services-panel.types';

type Props = {
  functions: ServiceFunctionRow[];
  fileName: string | null;
  fileExtension: string;
};

export function WorkspaceHelpRail({ functions, fileName, fileExtension }: Props) {
  if (!fileName) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground text-center">
        Open a file to see contextual help and available tools.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-2 py-1.5">
        <div className="text-xs font-medium truncate">{fileName}</div>
        <div className="text-[0.625rem] text-muted-foreground">Type: {fileExtension}</div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {functions.length === 0 ? (
          <div className="p-2 text-xs text-muted-foreground">
            No specialized functions available for {fileExtension} files.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {functions.map(fn => (
              <div key={fn.function_id} className="px-2 py-2">
                <div className="text-xs font-medium">{fn.label || fn.function_name}</div>
                {fn.description && (
                  <div className="text-[0.625rem] text-muted-foreground mt-0.5">{fn.description}</div>
                )}
                {fn.parameter_schema && fn.parameter_schema.length > 0 && (
                  <div className="mt-1">
                    <div className="text-[0.5625rem] font-medium text-muted-foreground uppercase">Parameters</div>
                    {fn.parameter_schema.map((p: any, i: number) => (
                      <div key={i} className="text-[0.625rem] text-muted-foreground">
                        <span className="font-mono">{p.name}</span>
                        {p.type && <span className="ml-1 opacity-60">({p.type})</span>}
                        {p.required && <span className="ml-1 text-primary">*</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Wire into WorkspacePage**

```tsx
import { WorkspaceHelpRail } from './WorkspaceHelpRail';

// In renderContent:
case 'help':
  return (
    <WorkspaceHelpRail
      functions={matchedFunctions}
      fileName={activeDoc?.doc_title ?? null}
      fileExtension={cloudEditor.extension}
    />
  );
```

**Step 3: Verify**

Open a .java file → help rail shows javalang function documentation with parameters. Open a .md → shows no specialized functions.

**Step 4: Commit**

```bash
git add web/src/pages/workspace/
git commit -m "feat: workspace help rail with contextual function documentation"
```

---

## Out Of Scope

- Workflow orchestration (multi-step function chaining)
- File upload within workspace (use Assets page, then switch to workspace)
- Save-back-to-storage (editing is read-only for v1; save requires signed upload URL pattern)
- New service function registrations
- Backend/migration changes
- Mobile workspace layout (desktop-first)
- Drag-and-drop file reordering
- File search/filter in the browser pane

## Acceptance Criteria

- `/app/workspace` automatically enters workspace shell mode: no header, rail snapped to 60px icon-only
- Restore button in workspace toolbar brings back header; navigating away auto-restores
- Rail toggle still works in workspace mode
- Workspace content area uses 20% denser typography and spacing
- Four-pane layout: files, editor, AI, help — all resizable via Workbench splitter
- File browser loads project documents from Supabase storage
- Clicking a file loads content via signed URL into the appropriate editor surface (CodeMirror/MDX/Tiptap)
- Function panel surfaces registered functions matching the open file's type via tags
- Running a function sends file content to platform-api and displays the result in a new tab
- AI pane shows context-aware chat with quick-action function buttons
- Help rail shows function documentation for the current file type
