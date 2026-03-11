# Suggest-Changes Review UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up all per-suggestion commands from `prosemirror-suggest-changes` and build a suggestions review panel in pane 3 of layout 2, replacing the empty tab with a live list of tracked changes that supports per-item accept, reject, and navigate-to.

**Architecture:** The Tiptap editor instance is lifted from `TiptapEditorSurface` into `useWorkspaceEditor` via a ref callback. A new `SuggestionsPanel` component receives that ref, walks the ProseMirror document on every transaction to collect suggestion marks, and renders a scrollable list. Each list item shows the suggestion type, a text preview, and per-item accept/reject buttons. Clicking a row navigates the editor cursor to that suggestion. Layout 2 gets its own tab and pane configuration to show the review panel in pane 3. The existing inline Accept All / Reject All toolbar in `TiptapEditorSurface` is removed once the panel owns all review actions.

**Tech Stack:** React, Tiptap (`@tiptap/react`), `@handlewithcare/prosemirror-suggest-changes` v0.1.8, existing Workbench component, Tabler Icons

**Reference docs:**
- Library commands API: `web/node_modules/@handlewithcare/prosemirror-suggest-changes/dist/commands.d.ts`
- Library plugin API: `web/node_modules/@handlewithcare/prosemirror-suggest-changes/dist/plugin.d.ts`
- Library utils (mark lookup): `web/node_modules/@handlewithcare/prosemirror-suggest-changes/dist/utils.js`
- Current Tiptap surface: `web/src/pages/superuser/TiptapEditorSurface.tsx`
- Current editor hook: `web/src/pages/superuser/useWorkspaceEditor.tsx`
- Workbench component types: `web/src/components/workbench/Workbench.tsx` (lines 29-53)
- Editor registry: `web/src/pages/superuser/editorRegistry.ts`
- Layout 2: `web/src/pages/superuser/SuperuserLayout2.tsx`

**Library commands available (from `commands.d.ts`):**

| Command | Signature | What it does |
|---|---|---|
| `applySuggestions` | `(state, dispatch?) => boolean` | Accept all — delete deletions, keep insertions |
| `applySuggestion` | `(id, from?, to?) => Command` | Accept one suggestion by ID |
| `applySuggestionsInRange` | `(from?, to?) => Command` | Accept all in document range |
| `revertSuggestions` | `(state, dispatch?) => boolean` | Reject all — delete insertions, restore deletions |
| `revertSuggestion` | `(id, from?, to?) => Command` | Reject one suggestion by ID |
| `revertSuggestionsInRange` | `(from?, to?) => Command` | Reject all in document range |
| `selectSuggestion` | `(id) => Command` | Move selection to cover a suggestion |
| `enableSuggestChanges` | `(state, dispatch?) => boolean` | Turn on suggest mode |
| `disableSuggestChanges` | `(state, dispatch?) => boolean` | Turn off suggest mode |
| `toggleSuggestChanges` | `(state, dispatch?) => boolean` | Toggle suggest mode |

> `SuggestionId` is `number | string` (from `generateId.d.ts`).

**Design decisions:**
- The editor ref is a `React.RefObject<Editor | null>` managed by the hook, not a context provider. It's passed directly to the panel. This avoids adding a React context for something used by exactly two components in one layout.
- The panel listens to Tiptap's `transaction` event to re-collect suggestions. This fires on every state change, which is the correct granularity — suggestions change whenever the doc changes.
- Suggestion collection walks `editor.state.doc.descendants` and groups consecutive text nodes with the same mark ID. Without grouping, a single "delete this sentence" would show as many separate items (one per text node).
- The `SuggestionId` type from the library is `number | string`. We use it as-is without wrapping.

---

### Task 1: Add `onEditorReady` prop to TiptapEditorSurface

> **Why:** The suggestions panel (rendered by the hook in pane 3) needs access to the Tiptap editor instance that lives inside the editor surface (rendered in pane 2). The surface must expose its editor to the parent.

**Files:**
- Modify: `web/src/pages/superuser/TiptapEditorSurface.tsx`

**Step 1: Add the prop to the Props type**

In `TiptapEditorSurface.tsx`, change the `Props` type (line 21-27):

```ts
// Before:
type Props = {
  content: string;
  fileKey: string;
  viewMode: ViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
};

// After:
type Props = {
  content: string;
  fileKey: string;
  viewMode: ViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
  /** Called when the Tiptap editor instance is ready. Used by the suggestions panel. */
  onEditorReady?: (editor: Editor) => void;
};
```

Add the `Editor` import at the top — it comes from `@tiptap/react` which is already imported:

```ts
// Before:
import { useEditor, EditorContent } from '@tiptap/react';

// After:
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
```

**Step 2: Destructure the new prop**

Change the component signature (line 154):

```ts
// Before:
export function TiptapEditorSurface({ content, fileKey, viewMode, onChange, onSave }: Props) {

// After:
export function TiptapEditorSurface({ content, fileKey, viewMode, onChange, onSave, onEditorReady }: Props) {
```

**Step 3: Add the effect that calls onEditorReady**

After the `useEditor` call (after line 188), add:

```ts
  // Notify parent when editor is ready
  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);
```

**Step 4: Export the Editor type for consumers**

Add this re-export at the top of the file, after the imports:

```ts
export type { Editor } from '@tiptap/react';
```

**Step 5: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: clean — the prop is optional, so no callers break.

**Step 6: Commit**

```bash
git add web/src/pages/superuser/TiptapEditorSurface.tsx
git commit -m "feat: add onEditorReady prop to TiptapEditorSurface"
```

---

### Task 2: Lift the Tiptap editor ref into useWorkspaceEditor

> **Why:** The hook's `renderContent` callback renders both the editor pane and the suggestions pane. It needs to pass the editor instance from one to the other. A ref is the right primitive — the editor can be null (no file open, or non-tiptap file) and it changes when files change.

**Files:**
- Modify: `web/src/pages/superuser/useWorkspaceEditor.tsx`

**Step 1: Add the ref and the callback**

After the existing state declarations (after line 62), add:

```ts
import type { Editor } from '@tiptap/react';

// inside the hook, after the activeViewMode state:
const tiptapEditorRef = useRef<Editor | null>(null);

const handleEditorReady = useCallback((editor: Editor) => {
  tiptapEditorRef.current = editor;
}, []);
```

**Step 2: Clear the ref when file changes**

In `handleSelectFile` (line 72-83), add a line to clear the ref before the new file loads. This prevents the panel from showing stale suggestions during the load:

```ts
  const handleSelectFile = useCallback(async (node: FsNode) => {
    if (node.kind !== 'file') return;
    tiptapEditorRef.current = null; // ← add this line
    try {
      const content = await readFileContent(node.handle as FileSystemFileHandle);
      // ... rest unchanged
```

**Step 3: Pass `onEditorReady` in the tiptap surfaceProps block**

In the `renderContent` callback, in the `profile.id === 'tiptap'` branch (line 210-212), add the callback:

```ts
// Before:
} else if (profile.id === 'tiptap') {
  surfaceProps.viewMode = activeViewMode;
}

// After:
} else if (profile.id === 'tiptap') {
  surfaceProps.viewMode = activeViewMode;
  surfaceProps.onEditorReady = handleEditorReady;
}
```

**Step 4: Add handleEditorReady to the renderContent dependency array**

In the dependency array (line 267), add `handleEditorReady`:

```ts
// Before:
}, [openFile, fileKey, handleSelectFile, handleChange, handleSave, saving, activeViewMode, preferredEditor, handleMoveNode, ...]);

// After:
}, [openFile, fileKey, handleSelectFile, handleChange, handleSave, saving, activeViewMode, preferredEditor, handleEditorReady, handleMoveNode, ...]);
```

**Step 5: Return the ref from the hook**

Change the return (line 269):

```ts
// Before:
return { renderContent };

// After:
return { renderContent, tiptapEditorRef };
```

**Step 6: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: clean

**Step 7: Commit**

```bash
git add web/src/pages/superuser/useWorkspaceEditor.tsx
git commit -m "feat: lift tiptap editor ref into useWorkspaceEditor"
```

---

### Task 3: Create the SuggestionsPanel component

> **Why:** This is the review UI that goes in pane 3. It reads the editor's document, collects all suggestion marks, and renders a list with per-item accept/reject/navigate.

**Files:**
- Create: `web/src/pages/superuser/SuggestionsPanel.tsx`

**Step 1: Create the file with the full component**

```tsx
// web/src/pages/superuser/SuggestionsPanel.tsx
import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import type { Mark as PMMark } from '@tiptap/pm/model';
import {
  applySuggestion,
  revertSuggestion,
  selectSuggestion,
  applySuggestions,
  revertSuggestions,
} from '@handlewithcare/prosemirror-suggest-changes';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Types ───────────────────────────────────────────────────────────────────

type SuggestionType = 'insertion' | 'deletion' | 'modification';

type SuggestionItem = {
  /** Suggestion ID from the mark attrs — number | string */
  id: number | string;
  type: SuggestionType;
  /** Preview of the affected text */
  text: string;
  /** Document position range */
  from: number;
  to: number;
};

type Props = {
  editorRef: RefObject<Editor | null>;
};

// ─── Suggestion collector ────────────────────────────────────────────────────

/**
 * Walk the ProseMirror document and collect all suggestion marks into a list.
 *
 * Groups consecutive text nodes with the same suggestion ID into one item
 * so that a single tracked deletion spanning multiple text nodes appears as
 * one row in the panel, not many.
 */
function collectSuggestions(editor: Editor): SuggestionItem[] {
  const items: SuggestionItem[] = [];
  const markTypes: SuggestionType[] = ['insertion', 'deletion', 'modification'];

  // Track seen IDs to merge spans with the same ID
  const byId = new Map<string, SuggestionItem>();

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return true;

    for (const typeName of markTypes) {
      const markType = editor.state.schema.marks[typeName];
      if (!markType) continue;

      const mark: PMMark | undefined = markType.isInSet(node.marks);
      if (!mark) continue;

      const id = mark.attrs.id as number | string;
      const key = `${typeName}-${JSON.stringify(id)}`;

      const existing = byId.get(key);
      if (existing) {
        // Extend the range and append text
        existing.to = pos + node.nodeSize;
        existing.text += node.text ?? '';
      } else {
        const item: SuggestionItem = {
          id,
          type: typeName,
          text: node.text ?? '',
          from: pos,
          to: pos + node.nodeSize,
        };
        byId.set(key, item);
        items.push(item);
      }
    }

    return true;
  });

  return items;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SuggestionsPanel({ editorRef }: Props) {
  const [items, setItems] = useState<SuggestionItem[]>([]);

  // Re-collect suggestions on every editor transaction
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      setItems([]);
      return;
    }

    const update = () => setItems(collectSuggestions(editor));
    update(); // initial collection

    editor.on('transaction', update);
    return () => { editor.off('transaction', update); };
  }, [editorRef.current]);

  // ── Per-item commands ────────────────────────────────────────────────────

  const handleAccept = useCallback((id: SuggestionItem['id']) => {
    const editor = editorRef.current;
    if (!editor) return;
    applySuggestion(id)(editor.view.state, editor.view.dispatch);
  }, [editorRef]);

  const handleReject = useCallback((id: SuggestionItem['id']) => {
    const editor = editorRef.current;
    if (!editor) return;
    revertSuggestion(id)(editor.view.state, editor.view.dispatch);
  }, [editorRef]);

  const handleNavigate = useCallback((id: SuggestionItem['id']) => {
    const editor = editorRef.current;
    if (!editor) return;
    selectSuggestion(id)(editor.view.state, editor.view.dispatch);
    editor.view.focus();
  }, [editorRef]);

  // ── Batch commands ───────────────────────────────────────────────────────

  const handleAcceptAll = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    applySuggestions(editor.view.state, editor.view.dispatch);
  }, [editorRef]);

  const handleRejectAll = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    revertSuggestions(editor.view.state, editor.view.dispatch);
  }, [editorRef]);

  // ── Empty state ──────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground opacity-50">
        No suggestions
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Header with count and batch actions */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {items.length} suggestion{items.length !== 1 ? 's' : ''}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="rounded px-2 py-0.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={handleRejectAll}
            className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            Reject All
          </button>
        </div>
      </div>

      {/* Suggestion list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col">
          {items.map((item) => (
            <div
              key={`${item.type}-${JSON.stringify(item.id)}`}
              className="flex items-start gap-2 border-b border-border/50 px-3 py-2 hover:bg-accent/50 cursor-pointer"
              onClick={() => handleNavigate(item.id)}
            >
              {/* Type badge */}
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${
                  item.type === 'insertion'
                    ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                    : item.type === 'deletion'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                }`}
              >
                {item.type === 'insertion' ? 'add' : item.type === 'deletion' ? 'del' : 'mod'}
              </span>

              {/* Text preview — truncated to 2 lines */}
              <span className="min-w-0 flex-1 text-xs leading-relaxed line-clamp-2">
                {item.text}
              </span>

              {/* Per-item accept / reject */}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  title="Accept this suggestion"
                  onClick={(e) => { e.stopPropagation(); handleAccept(item.id); }}
                  className="rounded p-1 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-950"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Reject this suggestion"
                  onClick={(e) => { e.stopPropagation(); handleReject(item.id); }}
                  className="rounded p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

**Step 2: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: clean — the component is not imported anywhere yet, but it should compile standalone.

**Step 3: Commit**

```bash
git add web/src/pages/superuser/SuggestionsPanel.tsx
git commit -m "feat: add SuggestionsPanel component for per-suggestion review"
```

---

### Task 4: Add suggestions tab and pane config for layout 2

> **Why:** Layout 2 needs a `'suggestions'` tab in pane 3 instead of `'blank'`. The tab and pane definitions live in `useWorkspaceEditor.tsx` as exported constants. Layout 2 imports its own set. Layouts 1 and 3 are unchanged.

**Files:**
- Modify: `web/src/pages/superuser/useWorkspaceEditor.tsx`
- Modify: `web/src/pages/superuser/SuperuserLayout2.tsx`

**Step 1: Add the suggestions tab set**

In `useWorkspaceEditor.tsx`, after the existing `WORKSPACE_TABS` and `WORKSPACE_DEFAULT_PANES` constants (after line 18), add:

```ts
import { IconGitPullRequest } from '@tabler/icons-react';

export const WORKSPACE_TABS_TIPTAP = [
  { id: 'file-tree', label: 'Files', icon: IconFolderCode },
  { id: 'editor', label: 'Editor', icon: IconFileCode },
  { id: 'suggestions', label: 'Review', icon: IconGitPullRequest },
];

export const WORKSPACE_DEFAULT_PANES_TIPTAP: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['file-tree'], activeTab: 'file-tree', width: 18 },
  { id: 'pane-2', tabs: ['editor'], activeTab: 'editor', width: 60 },
  { id: 'pane-3', tabs: ['suggestions'], activeTab: 'suggestions', width: 22 },
]);
```

> `IconGitPullRequest` is used because the review panel is functionally a PR-style accept/reject review. If unavailable, `IconChecklist` is the fallback.

**Step 2: Handle 'suggestions' in renderContent**

In the `renderContent` callback, before the final `return null` (before line 265), add:

```ts
    if (tabId === 'suggestions') {
      return <SuggestionsPanel editorRef={tiptapEditorRef} />;
    }
```

Add the import at the top of the file:

```ts
import { SuggestionsPanel } from './SuggestionsPanel';
```

**Step 3: Add tiptapEditorRef to the renderContent dependency array**

The `tiptapEditorRef` is a ref (stable identity), so it doesn't cause re-renders. But the `renderContent` callback closes over it, so it should be in the array for correctness. It's already stable from `useRef`, so this won't cause extra renders.

**Step 4: Update SuperuserLayout2 to use the tiptap tab set**

Replace the entire content of `SuperuserLayout2.tsx`:

```tsx
// web/src/pages/superuser/SuperuserLayout2.tsx
import { Workbench } from '@/components/workbench/Workbench';
import { useWorkspaceEditor, WORKSPACE_TABS_TIPTAP, WORKSPACE_DEFAULT_PANES_TIPTAP } from './useWorkspaceEditor';

export function Component() {
  const { renderContent } = useWorkspaceEditor('layout-2-dir', 'tiptap');
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={WORKSPACE_TABS_TIPTAP}
          defaultPanes={WORKSPACE_DEFAULT_PANES_TIPTAP}
          saveKey="superuser-layout-2"
          renderContent={renderContent}
          hideToolbar
          maxColumns={4}
          maxTabsPerPane={2}
        />
      </div>
    </div>
  );
}
```

**Step 5: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: clean

**Step 6: Commit**

```bash
git add web/src/pages/superuser/useWorkspaceEditor.tsx web/src/pages/superuser/SuperuserLayout2.tsx
git commit -m "feat: wire suggestions panel into layout 2 pane 3"
```

---

### Task 5: Remove duplicate Accept All / Reject All from TiptapEditorSurface

> **Why:** The suggestions panel now owns all review actions (per-item and batch). The inline toolbar in the editor surface is redundant and would cause confusion about which Accept All to use.

**Files:**
- Modify: `web/src/pages/superuser/TiptapEditorSurface.tsx`

**Step 1: Remove the handleAcceptAll and handleRejectAll callbacks**

Delete lines 201-209:

```ts
// DELETE:
  const handleAcceptAll = useCallback(() => {
    if (!editor) return;
    applySuggestions(editor.view.state, editor.view.dispatch);
  }, [editor]);

  const handleRejectAll = useCallback(() => {
    if (!editor) return;
    revertSuggestions(editor.view.state, editor.view.dispatch);
  }, [editor]);
```

**Step 2: Remove the suggestActive toolbar block**

Delete the `const suggestActive = ...` line and the entire `{suggestActive && (...)}` JSX block (lines 213-236).

**Step 3: Remove unused imports**

From the `@handlewithcare/prosemirror-suggest-changes` import, remove `applySuggestions` and `revertSuggestions`:

```ts
// Before:
import {
  suggestChanges,
  enableSuggestChanges,
  disableSuggestChanges,
  applySuggestions,
  revertSuggestions,
  withSuggestChanges,
} from '@handlewithcare/prosemirror-suggest-changes';

// After:
import {
  suggestChanges,
  enableSuggestChanges,
  disableSuggestChanges,
  withSuggestChanges,
} from '@handlewithcare/prosemirror-suggest-changes';
```

Also remove `useCallback` from the React import if it's no longer used (check — the `onEditorReady` effect doesn't use it, so it can be removed).

**Step 4: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: clean

**Step 5: Commit**

```bash
git add web/src/pages/superuser/TiptapEditorSurface.tsx
git commit -m "refactor: remove duplicate batch actions from TiptapEditorSurface"
```

---

### Task 6: End-to-end verification

**Step 1: Type check**

Run: `cd web && npx tsc --noEmit`
Expected: clean, zero errors

**Step 2: Manual verification in browser**

> Start the dev server if not running: `cd web && npm run dev`

1. **Layout 2, `.md` file, visual mode:**
   - Open layout 2 → open any `.md` file
   - Pane 2: Tiptap editor loads
   - Pane 3: "No suggestions" message
   - View mode buttons show "Visual" and "Suggest"

2. **Layout 2, suggest mode, create suggestions:**
   - Click "Suggest" button
   - Type new text → text appears green (insertion mark)
   - Select existing text and delete → text appears red with strikethrough (deletion mark)
   - Pane 3 updates live — shows items with "add" and "del" badges

3. **Per-item navigation:**
   - Click a row in the suggestions panel → cursor jumps to that suggestion in the editor
   - Editor gains focus

4. **Per-item accept:**
   - Click the ✓ button on an insertion item → insertion is accepted (mark removed, text stays), item disappears from list
   - Click the ✓ button on a deletion item → deletion is accepted (text removed), item disappears from list

5. **Per-item reject:**
   - Create new suggestions
   - Click the ✕ button on an insertion → insertion is rejected (text removed), item disappears
   - Click the ✕ button on a deletion → deletion is rejected (text restored, mark removed), item disappears

6. **Batch accept / reject:**
   - Create several suggestions
   - Click "Accept All" in the panel header → all suggestions applied, list becomes "No suggestions"
   - Create more suggestions
   - Click "Reject All" → all reverted, list becomes "No suggestions"

7. **File switching:**
   - Switch to a different `.md` file → editor reloads, suggestions panel resets to "No suggestions"
   - Open a `.py` file → CodeMirror loads, suggestions panel shows "No suggestions"
   - Open a `.mdx` file → MDXEditor loads (fallback), suggestions panel shows "No suggestions"

8. **Other layouts unchanged:**
   - Open layout 1 → `.md` file → MDXEditor, pane 3 shows blank (no suggestions tab)
   - Open layout 3 → same as layout 1

**Step 3: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address verification findings in suggest-changes review UI"
```