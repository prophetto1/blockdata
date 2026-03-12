# Docs Editor Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standalone document editor page at `/app/docs` with a file list sidebar and full-width OnlyOffice editor, independent of the ELT workbench.

**Architecture:** New page component with two-panel layout. Left sidebar lists DOCX assets from Supabase (project-scoped). Right area renders OnlyOffice editor via existing shared components. Project selection uses `useProjectFocus` hook + `ProjectSwitcher` in the shell. No backend changes.

**Tech Stack:** React, react-router-dom, Supabase, OnlyOffice Document Server, Tabler Icons, existing UI primitives (`ScrollArea`)

---

### Task 1: Create the DocsEditor page component

**Files:**
- Create: `web/src/pages/DocsEditor.tsx`

**Step 1: Write the page component**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconFileText, IconLoader2 } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OnlyOfficeEditorPanel } from '@/components/documents/OnlyOfficeEditorPanel';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import {
  type ProjectDocumentRow,
  isDocxDocument,
  formatBytes,
} from '@/lib/projectDetailHelpers';

export default function DocsEditor() {
  useShellHeaderTitle({ title: 'Docs' });

  const { resolvedProjectId, resolvedProjectName } = useProjectFocus();

  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);

  // Fetch DOCX documents for the active project
  const loadDocs = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllProjectDocuments<ProjectDocumentRow>({
        projectId,
        select: '*',
      });
      const docxOnly = all.filter(isDocxDocument);
      setDocs(docxOnly);
      // Auto-select first doc if nothing selected
      setSelectedSourceUid((prev) => {
        if (prev && docxOnly.some((d) => d.source_uid === prev)) return prev;
        return docxOnly[0]?.source_uid ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!resolvedProjectId) {
      setDocs([]);
      setSelectedSourceUid(null);
      return;
    }
    void loadDocs(resolvedProjectId);
  }, [resolvedProjectId, loadDocs]);

  const selectedDoc = useMemo(
    () => docs.find((d) => d.source_uid === selectedSourceUid) ?? null,
    [docs, selectedSourceUid],
  );

  // ── No project selected ───────────────────────────────────────────
  if (!resolvedProjectId) {
    return (
      <div className="flex h-[calc(100vh-var(--app-shell-header-height))] items-center justify-center text-sm text-muted-foreground">
        Select a project to view documents.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] overflow-hidden">
      {/* ── Left sidebar: file list ── */}
      <div className="flex w-[260px] shrink-0 flex-col border-r border-border bg-card">
        <div className="flex h-10 items-center border-b border-border px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {resolvedProjectName ?? 'Documents'}
        </div>

        <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground">
              <IconLoader2 size={14} className="animate-spin" />
              Loading…
            </div>
          )}

          {!loading && error && (
            <div className="p-4 text-xs text-destructive">{error}</div>
          )}

          {!loading && !error && docs.length === 0 && (
            <div className="p-4 text-xs text-muted-foreground">
              No DOCX files in this project.
            </div>
          )}

          {!loading && !error && docs.map((doc) => (
            <button
              key={doc.source_uid}
              type="button"
              onClick={() => setSelectedSourceUid(doc.source_uid)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent/60 ${
                doc.source_uid === selectedSourceUid
                  ? 'bg-accent/70 text-foreground'
                  : 'text-foreground/80'
              }`}
            >
              <IconFileText size={15} className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{doc.doc_title}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatBytes(doc.source_filesize)}
              </span>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* ── Right area: editor ── */}
      <div className="flex-1 min-w-0">
        {selectedDoc ? (
          <OnlyOfficeEditorPanel doc={selectedDoc} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {docs.length > 0 ? 'Select a document to edit.' : 'No documents available.'}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to DocsEditor.tsx

**Step 3: Commit**

```bash
git add web/src/pages/DocsEditor.tsx
git commit -m "feat(docs): add DocsEditor page component"
```

---

### Task 2: Register the route and nav item

**Files:**
- Modify: `web/src/router.tsx` (add route)
- Modify: `web/src/components/shell/nav-config.ts` (add nav item)

**Step 1: Add route to router.tsx**

After line 114 (`{ path: '/app/database', element: <DatabasePlaceholder /> },`), add:

```tsx
{ path: '/app/docs', element: <DocsEditor /> },
```

Add the import at the top with the other page imports:

```tsx
import DocsEditor from '@/pages/DocsEditor';
```

**Step 2: Add nav item to nav-config.ts**

In the `TOP_LEVEL_NAV` array, after the `Database` entry and before the first `'divider'`, add:

```ts
{ label: 'Docs', icon: IconFileText, path: '/app/docs' },
```

`IconFileText` is already imported in nav-config.ts (line 25).

**Step 3: Verify it compiles**

Run: `cd web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add web/src/router.tsx web/src/components/shell/nav-config.ts
git commit -m "feat(docs): register /app/docs route and nav item"
```

---

### Task 3: Manual smoke test

**Step 1: Start the dev server**

Run: `cd web && npm run dev`

**Step 2: Verify in browser**

1. Navigate to `/app/docs`
2. Confirm left sidebar shows with project name header
3. Confirm DOCX files from the active project are listed
4. Click a file — confirm OnlyOffice editor loads in the right panel
5. Confirm the "Docs" item appears in the left nav rail
6. Confirm the ELT workbench at `/app/elt/:projectId` still works unchanged

**Step 3: Commit (if any tweaks needed)**

```bash
git add -u
git commit -m "fix(docs): smoke test tweaks"
```

---

## Notes

- **Project context:** The page uses `useProjectFocus()` which reads from `localStorage` and the URL. Since `/app/docs` has no `:projectId` param, it falls back to the last focused project (set by ELT or project switcher). This is intentional — the user picks a project via the shell's project switcher.
- **No backend changes:** All endpoints (`/onlyoffice/open`, `/config`, `/doc`, `/callback`) work as-is.
- **Phase 2 (future):** Local file support via File System Access API — separate plan.
