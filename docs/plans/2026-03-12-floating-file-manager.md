a# Unified Project Files Panel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a slide-in files panel — the single, unified project file list — accessible from every section of the app. Upload local files, see them in the list. One file list, one source of truth, everywhere.

**Architecture:** A `ProjectFilesPanel` component rendered at the shell level (`AppLayout.tsx`) as a slide-in overlay panel. It uses `useProjectFocus` for the active project, `fetchAllProjectDocuments` for the file list, and the existing `edgeFetch('ingest', ...)` upload flow. Open/close state is managed via a React context. The panel slides in from the right edge, overlaying content (like the existing right rail pattern). The visual style follows `DocsEditor.tsx`'s sidebar: clean file rows with icon + name + size.

**Key principle:** This is THE project file list. Today, ELT has `AssetsPanel`, Docs has its own sidebar, Flows has its own asset list. This panel replaces them all conceptually — one unified view of project storage, accessible from anywhere.

**Tech Stack:** React, TypeScript, Tailwind CSS, Supabase (storage + edge functions), existing `edgeFetch` client, existing `fetchAllProjectDocuments` paginator.

---

### Task 1: Create the ProjectFilesPanel context (open/close state)

**Files:**
- Create: `web/src/components/shell/ProjectFilesPanelContext.tsx`

**Step 1: Create the context file**

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ProjectFilesPanelState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const ProjectFilesPanelContext = createContext<ProjectFilesPanelState>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function ProjectFilesPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <ProjectFilesPanelContext value={{ isOpen, open, close, toggle }}>
      {children}
    </ProjectFilesPanelContext>
  );
}

export function useProjectFilesPanel() {
  return useContext(ProjectFilesPanelContext);
}
```

**Step 2: Commit**

```bash
git add web/src/components/shell/ProjectFilesPanelContext.tsx
git commit -m "feat: add ProjectFilesPanel open/close context"
```

---

### Task 2: Build the ProjectFilesPanel component

**Files:**
- Create: `web/src/components/shell/ProjectFilesPanel.tsx`

**Dependencies to understand:**
- `fetchAllProjectDocuments` from `web/src/lib/projectDocuments.ts` — paginated Supabase query for all docs in a project
- `edgeFetch` from `web/src/lib/edge.ts` — authenticated fetch to Supabase edge functions; upload uses `edgeFetch('ingest', { method: 'POST', body: formData })`
- `useProjectFocus` from `web/src/hooks/useProjectFocus.ts` — provides `resolvedProjectId` and `resolvedProjectName`
- `ProjectDocumentRow` from `web/src/lib/projectDetailHelpers.ts` — row type with `source_uid`, `doc_title`, `source_type`, `source_filesize`, `status`, etc.
- `formatBytes` from `web/src/lib/projectDetailHelpers.ts` — formats byte count to human-readable string
- `getDocumentFormat` from `web/src/lib/projectDetailHelpers.ts` — returns format badge string (e.g. "DOCX", "PDF")
- `sortDocumentsByUploadedAt` from `web/src/lib/projectDetailHelpers.ts` — sorts docs newest first

**Visual reference:** The file list rows follow the same pattern as `DocsEditor.tsx` lines 98-113 — icon + truncated title + file size, with hover highlight and selection state.

**Step 1: Create the component**

```typescript
import { useCallback, useEffect, useState } from 'react';
import {
  IconFilePlus,
  IconFileText,
  IconLoader2,
  IconX,
} from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useProjectFilesPanel } from '@/components/shell/ProjectFilesPanelContext';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import {
  type ProjectDocumentRow,
  formatBytes,
  getDocumentFormat,
  sortDocumentsByUploadedAt,
} from '@/lib/projectDetailHelpers';
import { edgeFetch } from '@/lib/edge';

export function ProjectFilesPanel() {
  const { isOpen, close } = useProjectFilesPanel();
  const { resolvedProjectId, resolvedProjectName } = useProjectFocus();

  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ── Load documents ──────────────────────────────────────────────────
  const loadDocs = useCallback(async () => {
    if (!resolvedProjectId) {
      setDocs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllProjectDocuments<ProjectDocumentRow>({
        projectId: resolvedProjectId,
        select: '*',
      });
      setDocs(sortDocumentsByUploadedAt(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedProjectId]);

  useEffect(() => {
    if (isOpen) void loadDocs();
  }, [isOpen, loadDocs]);

  // ── Upload local files ──────────────────────────────────────────────
  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !resolvedProjectId) return;
    setUploading(true);
    setError(null);
    let firstError: string | null = null;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('project_id', resolvedProjectId);
      formData.append('ingest_mode', 'upload_only');
      try {
        const response = await edgeFetch('ingest', { method: 'POST', body: formData });
        if (!response.ok) {
          const text = await response.text();
          if (!firstError) firstError = `Upload failed for ${file.name}: ${text.slice(0, 200)}`;
        }
      } catch (err) {
        if (!firstError) {
          firstError = `Upload failed for ${file.name}: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    }

    if (firstError) setError(firstError);
    setUploading(false);
    await loadDocs();
  }, [resolvedProjectId, loadDocs]);

  const openFilePicker = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.className = 'sr-only';
    input.onchange = () => {
      void handleUpload(input.files);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  }, [handleUpload]);

  // ── Don't render when closed ────────────────────────────────────────
  if (!isOpen) return null;

  const hasDocs = docs.length > 0;
  const totalSize = docs.reduce((sum, d) => sum + (d.source_filesize ?? 0), 0);

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 200,
        top: 0,
        bottom: 0,
        right: 0,
        width: '280px',
        borderLeft: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
          {resolvedProjectName ?? 'Project Files'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={!resolvedProjectId || uploading}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
            title="Upload files"
            aria-label="Upload files"
          >
            <IconFilePlus size={16} />
          </button>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Close file panel"
          >
            <IconX size={16} />
          </button>
        </div>
      </div>

      {/* ── File list ── */}
      <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
        {!resolvedProjectId && (
          <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
            Select a project to view files.
          </div>
        )}

        {resolvedProjectId && loading && (
          <div className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground">
            <IconLoader2 size={14} className="animate-spin" />
            Loading...
          </div>
        )}

        {resolvedProjectId && !loading && error && (
          <div className="p-4 text-xs text-destructive">{error}</div>
        )}

        {resolvedProjectId && !loading && !error && !hasDocs && (
          <div className="p-4 text-xs text-muted-foreground">
            No files in this project yet.
          </div>
        )}

        {resolvedProjectId && !loading && !error && hasDocs && docs.map((doc) => (
          <button
            key={doc.source_uid}
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent/60 text-foreground/80"
          >
            <IconFileText size={15} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{doc.doc_title?.split('/').pop() ?? doc.doc_title}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatBytes(doc.source_filesize)}
            </span>
          </button>
        ))}
      </ScrollArea>

      {/* ── Footer ── */}
      <div className="flex h-8 shrink-0 items-center border-t border-border px-3 text-[11px] text-muted-foreground">
        <span>{docs.length} file{docs.length !== 1 ? 's' : ''} · {formatBytes(totalSize)}</span>
        {uploading && (
          <span className="ml-auto flex items-center gap-1">
            <IconLoader2 size={12} className="animate-spin" />
            Uploading...
          </span>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/shell/ProjectFilesPanel.tsx
git commit -m "feat: build ProjectFilesPanel with upload and file list"
```

---

### Task 3: Wire into AppLayout and nav rail

**Files:**
- Modify: `web/src/components/layout/AppLayout.tsx`
- Modify: `web/src/components/shell/LeftRailShadcn.tsx`

**Step 1: Add the provider and component to AppLayout**

In `web/src/components/layout/AppLayout.tsx`:

1. Add imports at the top:

```typescript
import { ProjectFilesPanelProvider } from '@/components/shell/ProjectFilesPanelContext';
import { ProjectFilesPanel } from '@/components/shell/ProjectFilesPanel';
```

2. Wrap the existing providers in `AppLayout()` (line 49-57). Change:

```typescript
export function AppLayout() {
  return (
    <HeaderCenterProvider>
      <RightRailProvider>
        <AppShellInner />
      </RightRailProvider>
    </HeaderCenterProvider>
  );
}
```

to:

```typescript
export function AppLayout() {
  return (
    <HeaderCenterProvider>
      <RightRailProvider>
        <ProjectFilesPanelProvider>
          <AppShellInner />
        </ProjectFilesPanelProvider>
      </RightRailProvider>
    </HeaderCenterProvider>
  );
}
```

3. Render `<ProjectFilesPanel />` inside `AppShellInner`, after the floating detached chat block (after line 427, before the closing `</>`). Add:

```typescript
      <ProjectFilesPanel />
```

**Step 2: Add toggle button to LeftRailShadcn**

In `web/src/components/shell/LeftRailShadcn.tsx`:

1. Add import at the top (IconFolder is already imported):

```typescript
import { useProjectFilesPanel } from '@/components/shell/ProjectFilesPanelContext';
```

2. Inside the `LeftRailShadcn` component (after line 229, the `useProjectFocus` call), add:

```typescript
  const filesPanel = useProjectFilesPanel();
```

3. Add a "Files" button in the footer area, before the account menu. Find the `<SidebarFooter>` section (line 558). Insert a new block just before it:

```typescript
        {/* ---- Files panel toggle ---- */}
        <div className={desktopCompact ? 'px-0 pb-1' : 'px-2 pb-1'}>
          {desktopCompact ? (
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={filesPanel.toggle}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                  filesPanel.isOpen
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
                title="Files"
                aria-label="Toggle project files"
              >
                <IconFolder size={20} stroke={1.75} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={filesPanel.toggle}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 h-9 text-sm leading-snug transition-colors',
                filesPanel.isOpen
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/80 font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <IconFolder size={16} stroke={1.75} className="shrink-0" />
              <span className="truncate">Files</span>
            </button>
          )}
        </div>
```

**Step 3: Commit**

```bash
git add web/src/components/layout/AppLayout.tsx web/src/components/shell/LeftRailShadcn.tsx
git commit -m "feat: wire ProjectFilesPanel into app shell and nav rail"
```

---

### Task 4: Verify TypeScript compiles and test manually

**Step 1: Run TypeScript check**

```bash
cd web && npx tsc --noEmit
```

Expected: zero errors.

**Step 2: Run dev server**

```bash
cd web && npm run dev
```

Expected: Vite starts without errors.

**Step 3: Manual verification checklist**

1. Open the app in browser
2. Nav rail shows a "Files" button near the bottom (above account menu)
3. Click "Files" → panel slides in from the right edge
4. Panel header shows project name
5. If project has files → flat list with file name and size (same style as DocsEditor sidebar)
6. If project is empty → "No files in this project yet"
7. Click upload button (+ icon) → native file picker opens
8. Select a file → "Uploading..." indicator → file appears in list
9. Click X → panel closes
10. Navigate to ELT, Docs, Flows, Database → Files button always works, same file list
11. Switch project in header → file list updates

**Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix: address any TypeScript or runtime issues in ProjectFilesPanel"
```

---

### Verification

1. **TypeScript:** `npx tsc --noEmit` from `web/` — zero errors
2. **Dev server:** `npm run dev` — no console errors
3. **Toggle:** Files button in nav rail opens/closes the slide-in panel
4. **File list:** Shows existing project documents with name and size
5. **Upload:** Upload button → pick file → uploads to Supabase → appears in list
6. **Project switching:** Switch project in header → file list updates
7. **Cross-section:** Navigate to any section — Files button works everywhere, same list