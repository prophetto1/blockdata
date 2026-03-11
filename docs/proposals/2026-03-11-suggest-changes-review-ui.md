# Suggest-Changes Review UI — Revised Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up all per-suggestion commands from `prosemirror-suggest-changes` and build a suggestions review panel in pane 3 of layout 2, replacing the empty tab with a live list of tracked changes that supports per-item accept, reject, and navigate-to.

**Architecture:** The Tiptap editor instance is lifted from `TiptapEditorSurface` into `useWorkspaceEditor` via **useState** (not useRef — refs don't trigger re-renders, which would leave the panel stuck). A new `SuggestionsPanel` component receives the editor instance as a prop, walks the ProseMirror document on every transaction to collect suggestion marks on **both text and block nodes**, and renders a scrollable list. Each list item shows the suggestion type, a text preview, and per-item accept/reject buttons. Clicking a row navigates the editor cursor to that suggestion. Layout 2 gets its own tab and pane configuration with a **new saveKey** to avoid stale persisted state. The existing inline Accept All / Reject All toolbar in `TiptapEditorSurface` is removed once the panel owns all review actions.

**Tech Stack:** React, Tiptap (`@tiptap/react`), `@handlewithcare/prosemirror-suggest-changes` v0.1.8, existing Workbench component, Tabler Icons, Vitest + Testing Library

**Reference docs:**
- Library commands API: `web/node_modules/@handlewithcare/prosemirror-suggest-changes/dist/commands.d.ts`
- Library plugin API: `web/node_modules/@handlewithcare/prosemirror-suggest-changes/dist/plugin.d.ts`
- Library utils (mark lookup): `web/node_modules/@handlewithcare/prosemirror-suggest-changes/dist/utils.js`
- Library schema (block marks): `web/node_modules/@handlewithcare/prosemirror-suggest-changes/dist/schema.js`
- Current Tiptap surface: `web/src/pages/superuser/TiptapEditorSurface.tsx`
- Current editor hook: `web/src/pages/superuser/useWorkspaceEditor.tsx`
- Workbench component types: `web/src/components/workbench/Workbench.tsx` (lines 29-53)
- Workbench persisted panes logic: `web/src/components/workbench/Workbench.tsx` (lines 133-163)
- Editor registry: `web/src/pages/superuser/editorRegistry.ts`
- Layout 2: `web/src/pages/superuser/SuperuserLayout2.tsx`
- Vitest config: `web/vitest.config.ts`
- Test setup: `web/src/test/setup.ts`

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
- ~~The editor ref is a `React.RefObject<Editor | null>` managed by the hook~~ **REVISED:** The editor instance is held in `useState<Editor | null>` so that changes trigger re-renders. The panel receives `editor` as a prop, not a ref. This ensures the panel's subscription effect re-runs when the editor becomes available.
- The panel listens to Tiptap's `transaction` event to re-collect suggestions. This fires on every state change, which is the correct granularity — suggestions change whenever the doc changes.
- ~~Suggestion collection walks `editor.state.doc.descendants` and groups consecutive text nodes with the same mark ID.~~ **REVISED:** The collector walks **all** descendants (text and block nodes) and checks for suggestion marks on each. Block-level insertions/deletions and attribute/mark modifications are all represented as marks in this library (see `schema.js`). Each occurrence is tracked as a separate item keyed by `${type}-${id}-${from}` to avoid collapsing disjoint ranges with the same ID.
- The `SuggestionId` type from the library is `number | string`. We use it as-is without wrapping.
- **NEW:** Layout 2's Workbench `saveKey` changes from `"superuser-layout-2"` to `"superuser-layout-2-v2"` to force a clean slate. The Workbench's `readPersistedPanes` filters out unknown tab IDs but falls back to `tabs[0]` (file-tree) when all are invalid — changing saveKey is simpler and more reliable than a migration.
- ~~Per-item accept/reject uses `applySuggestion(id)` / `revertSuggestion(id)`.~~ **REVISED (v2):** Per-item accept/reject uses the **scoped** variants `applySuggestion(id, from, to)` / `revertSuggestion(id, from, to)` (from `commands.d.ts` line 30/54). These act on a single suggestion within a specific range — exactly one row. The earlier revision incorrectly used `applySuggestionsInRange(from, to)` which acts on *all* suggestions in the range regardless of ID. Navigation still uses `selectSuggestion(id)`.
- **NEW:** Block-level suggestion support requires the Tiptap schema to allow suggestion marks on block nodes. The library README (line 67) shows `doc.marks: "insertion modification deletion"`. Without this, the `withSuggestChanges` dispatch wrapper won't produce block-level marks. Task 1 adds a `Node.create` extension that patches the `doc` spec to allow these marks, and updates the mark renderers to spread `HTMLAttributes` for block-context pass-through.

**Revision changelog (from three independent assessments):**

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | Critical | Panel subscription never attaches — `useRef` mutation doesn't re-render | Changed to `useState<Editor \| null>`, panel receives `editor` prop |
| 2 | Critical | Collector only walks text nodes — misses block insertions/deletions and modifications | Collector now checks all node types for suggestion marks |
| 3 | Major | Persisted layout migration — stale `blank` tab in localStorage | Changed `saveKey` to `"superuser-layout-2-v2"` |
| 4 | Major | Grouping merges by ID globally — collapses disjoint ranges | Key includes `from` position: `${type}-${id}-${from}` per-occurrence tracking |
| 5 | Major | No tests for stateful hook/panel/persistence code | Added Task 3 (Vitest tests for collector + layout config) |
| 6 | Minor | `import type { Editor }` placed inside hook function body | Moved to file-level import |
| 7 | Major | Per-item handlers use `applySuggestion(id)` which acts on the whole suggestion, but UI splits disjoint ranges into separate rows — buttons misleadingly act on all occurrences | Switched to scoped commands `applySuggestion(id, from, to)` / `revertSuggestion(id, from, to)` which act on one suggestion in one range. Earlier revision incorrectly used `applySuggestionsInRange` which hits all suggestions in range |
| 8 | Major | Block-level suggestions require `marks: "insertion modification deletion"` on block node specs (per library README line 67), but current Tiptap schema only defines inline mark extensions | Added schema extension in Task 1 to allow suggestion marks on `doc` and block nodes, plus block-aware `renderHTML` updates |
| 9 | Minor | Task 3 lists `SuggestionsPanel.test.ts` but provides no test content for it | Removed phantom file reference; collector tests are sufficient for this phase |
| 10 | Major | v2 revision used `applySuggestionsInRange(from, to)` which acts on *all* suggestions in range, not one | Corrected to `applySuggestion(id, from, to)` / `revertSuggestion(id, from, to)` — scoped by both ID and range |
| 11 | Major | Mark renderers in `TiptapEditorSurface.tsx` don't handle block context (`inline` param) — always emit inline tags | Added `HTMLAttributes` spread to `renderHTML` in all three mark extensions; noted CSS verification step |
| 12 | Minor | No test coverage for layout-2 tab wiring or pane defaults | Added `WORKSPACE_TABS_TIPTAP` / `WORKSPACE_DEFAULT_PANES_TIPTAP` assertions to Task 3 |

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

**Step 4: Add block-level mark support to the Tiptap schema**

The library requires suggestion marks to be allowed on block nodes for block-level insertions/deletions (e.g., inserting a new list item). Without this, `withSuggestChanges` won't produce block marks and the collector won't find them.

Add a new `Node.create` extension alongside the existing mark extensions (after `ModificationMark`, before the `SuggestChangesPlugin`):

```ts
import { Node } from '@tiptap/core';

/**
 * Patches the doc node spec to allow suggestion marks on block-level nodes.
 * Required by prosemirror-suggest-changes for block insertions/deletions.
 * See: library README line 67.
 */
const DocWithSuggestionMarks = Node.create({
  name: 'doc',
  topNode: true,
  content: 'block+',
  marks: 'insertion deletion modification',
});
```

**Also update the mark renderers to handle block context.** The library's own schema (`schema.js`) uses the `inline` parameter in `toDOM` to set `data-inline` and `style: "display: block"` for block marks. The current custom renderers in `TiptapEditorSurface.tsx` (lines 49, 70, 120) always output inline tags. Update the three mark extensions to spread `HTMLAttributes` so Tiptap can pass through block-context attributes:

```ts
// InsertionMark — replace renderHTML:
renderHTML({ mark, HTMLAttributes }) {
  return ['ins', { 'data-id': JSON.stringify(mark.attrs.id), ...HTMLAttributes }, 0];
},

// DeletionMark — replace renderHTML:
renderHTML({ mark, HTMLAttributes }) {
  return ['del', { 'data-id': JSON.stringify(mark.attrs.id), ...HTMLAttributes }, 0];
},

// ModificationMark — replace renderHTML:
renderHTML({ mark, HTMLAttributes }) {
  return [
    'span',
    {
      'data-type': 'modification',
      'data-id': JSON.stringify(mark.attrs.id),
      'data-mod-type': mark.attrs.type,
      'data-mod-prev-val': JSON.stringify(mark.attrs.previousValue),
      'data-mod-new-val': JSON.stringify(mark.attrs.newValue),
      ...HTMLAttributes,
    },
    0,
  ];
},
```

> **Note:** The existing CSS in `tiptap-suggest.css` handles styling via `ins` and `del` tags. Block-level rendering may need a `display: block` rule for block-context `ins` / `del` elements — verify during manual testing (Task 8, step 3).

Then add `DocWithSuggestionMarks` to the `extensions` array in the `useEditor` call, **before** `StarterKit` (so it overrides StarterKit's doc definition):

```ts
extensions: [
  DocWithSuggestionMarks,
  StarterKit.configure({ document: false }), // disable StarterKit's doc since we define our own
  Markdown,
  InsertionMark,
  DeletionMark,
  ModificationMark,
  SuggestChangesPlugin,
],
```

> `StarterKit.configure({ document: false })` prevents a duplicate `doc` node type conflict.

**Step 5: Export the Editor type for consumers**

Add this re-export at the top of the file, after the imports:

```ts
export type { Editor } from '@tiptap/react';
```

**Step 6: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: clean — the prop is optional, so no callers break.

**Step 7: Commit**

```bash
git add web/src/pages/superuser/TiptapEditorSurface.tsx
git commit -m "feat: add onEditorReady prop to TiptapEditorSurface"
```

---

### Task 2: Lift the Tiptap editor into useWorkspaceEditor via useState

> **Why:** The hook's `renderContent` callback renders both the editor pane and the suggestions pane. It needs to pass the editor instance from one to the other. **useState** (not useRef) is the right primitive — when the editor becomes available or changes, the panel must re-render to subscribe to transactions.

**Files:**
- Modify: `web/src/pages/superuser/useWorkspaceEditor.tsx`

**Step 1: Add the state and the callback (file-level import)**

At the **top of the file** (not inside the hook), add the import:

```ts
import type { Editor } from '@tiptap/react';
```

Inside the hook, after the existing state declarations (after `activeViewMode` state):

```ts
const [tiptapEditor, setTiptapEditor] = useState<Editor | null>(null);

const handleEditorReady = useCallback((editor: Editor) => {
  setTiptapEditor(editor);
}, []);
```

**Step 2: Clear the editor when file changes**

In `handleSelectFile` (line 72-83), add a line to clear the editor before the new file loads. This prevents the panel from showing stale suggestions during the load:

```ts
  const handleSelectFile = useCallback(async (node: FsNode) => {
    if (node.kind !== 'file') return;
    setTiptapEditor(null); // ← add this line
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
// Add handleEditorReady alongside the other callbacks
```

**Step 5: Return the editor from the hook**

Change the return (line 269):

```ts
// Before:
return { renderContent };

// After:
return { renderContent, tiptapEditor };
```

**Step 6: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: clean

**Step 7: Commit**

```bash
git add web/src/pages/superuser/useWorkspaceEditor.tsx
git commit -m "feat: lift tiptap editor state into useWorkspaceEditor"
```

---

### Task 3: Write tests for suggestion collector and layout config

> **Why:** The collector logic is stateful and handles multiple node types. The layout tab config change affects persisted state. Both need focused unit tests before implementation. This repo uses Vitest + Testing Library (see `web/vitest.config.ts`).

**Files:**
- Create: `web/src/pages/superuser/collectSuggestions.test.ts`

**Step 1: Write collector tests**

```ts
// web/src/pages/superuser/collectSuggestions.test.ts
import { describe, it, expect } from 'vitest';
import { collectSuggestions, type SuggestionItem } from './collectSuggestions';

// We'll test against a mock Editor-like object whose state.doc.descendants
// yields controlled nodes. This avoids needing a real Tiptap instance.

function makeMockEditor(nodes: Array<{
  isText: boolean;
  isBlock?: boolean;
  text?: string;
  nodeSize: number;
  pos: number;
  marks: Array<{ type: { name: string }; attrs: Record<string, unknown> }>;
}>) {
  const markTypes: Record<string, { isInSet: (marks: any[]) => any }> = {
    insertion: {
      isInSet: (marks) => marks.find(m => m.type.name === 'insertion'),
    },
    deletion: {
      isInSet: (marks) => marks.find(m => m.type.name === 'deletion'),
    },
    modification: {
      isInSet: (marks) => marks.find(m => m.type.name === 'modification'),
    },
  };

  return {
    state: {
      schema: { marks: markTypes },
      doc: {
        descendants: (callback: (node: any, pos: number) => boolean | void) => {
          for (const n of nodes) {
            callback(n, n.pos);
          }
        },
      },
    },
  } as any;
}

describe('collectSuggestions', () => {
  it('returns empty array for document with no suggestion marks', () => {
    const editor = makeMockEditor([
      { isText: true, text: 'hello', nodeSize: 5, pos: 0, marks: [] },
    ]);
    expect(collectSuggestions(editor)).toEqual([]);
  });

  it('collects a text insertion mark', () => {
    const editor = makeMockEditor([
      {
        isText: true,
        text: 'new text',
        nodeSize: 8,
        pos: 5,
        marks: [{ type: { name: 'insertion' }, attrs: { id: 1 } }],
      },
    ]);
    const result = collectSuggestions(editor);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      type: 'insertion',
      text: 'new text',
      from: 5,
      to: 13,
    });
  });

  it('collects a block-level deletion (non-text node with marks)', () => {
    const editor = makeMockEditor([
      {
        isText: false,
        isBlock: true,
        nodeSize: 20,
        pos: 10,
        marks: [{ type: { name: 'deletion' }, attrs: { id: 2 } }],
      },
    ]);
    const result = collectSuggestions(editor);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 2,
      type: 'deletion',
      text: '',
      from: 10,
      to: 30,
    });
  });

  it('collects modification marks with attr metadata', () => {
    const editor = makeMockEditor([
      {
        isText: false,
        isBlock: true,
        nodeSize: 15,
        pos: 0,
        marks: [{
          type: { name: 'modification' },
          attrs: { id: 3, type: 'attr', attrName: 'level', previousValue: 2, newValue: 3 },
        }],
      },
    ]);
    const result = collectSuggestions(editor);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 3, type: 'modification' });
  });

  it('does NOT collapse disjoint ranges with same suggestion ID', () => {
    const editor = makeMockEditor([
      {
        isText: true, text: 'first', nodeSize: 5, pos: 0,
        marks: [{ type: { name: 'insertion' }, attrs: { id: 10 } }],
      },
      { isText: true, text: 'gap', nodeSize: 3, pos: 5, marks: [] },
      {
        isText: true, text: 'second', nodeSize: 6, pos: 8,
        marks: [{ type: { name: 'insertion' }, attrs: { id: 10 } }],
      },
    ]);
    const result = collectSuggestions(editor);
    // Two separate items, not merged
    expect(result).toHaveLength(2);
    expect(result[0].from).toBe(0);
    expect(result[1].from).toBe(8);
  });

  it('merges adjacent text nodes with same ID into one item', () => {
    const editor = makeMockEditor([
      {
        isText: true, text: 'hel', nodeSize: 3, pos: 0,
        marks: [{ type: { name: 'deletion' }, attrs: { id: 5 } }],
      },
      {
        isText: true, text: 'lo', nodeSize: 2, pos: 3,
        marks: [{ type: { name: 'deletion' }, attrs: { id: 5 } }],
      },
    ]);
    const result = collectSuggestions(editor);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      text: 'hello',
      from: 0,
      to: 5,
    });
  });
});
```

**Step 2: Add layout-2 tab/saveKey assertions**

Append to the same test file (or create a separate `layout2Config.test.ts` — implementer's choice):

```ts
import { WORKSPACE_TABS_TIPTAP, WORKSPACE_DEFAULT_PANES_TIPTAP } from './useWorkspaceEditor';

describe('layout 2 tab config', () => {
  it('defines a suggestions tab', () => {
    const ids = WORKSPACE_TABS_TIPTAP.map(t => t.id);
    expect(ids).toContain('suggestions');
  });

  it('pane 3 defaults to suggestions tab', () => {
    const pane3 = WORKSPACE_DEFAULT_PANES_TIPTAP.find(p => p.id === 'pane-3');
    expect(pane3).toBeDefined();
    expect(pane3!.activeTab).toBe('suggestions');
    expect(pane3!.tabs).toContain('suggestions');
  });
});
```

> These assertions catch regressions in the tab wiring and pane defaults that the collector tests don't cover. The `saveKey` change (`"superuser-layout-2-v2"`) is verified during manual testing (Task 8, step 11).

**Step 3: Run tests to verify they fail**

Run: `cd web && npx vitest run src/pages/superuser/collectSuggestions.test.ts`
Expected: FAIL — module `./collectSuggestions` does not exist yet. Layout config tests also fail because `WORKSPACE_TABS_TIPTAP` doesn't exist yet.

**Step 4: Commit test file**

```bash
git add web/src/pages/superuser/collectSuggestions.test.ts
git commit -m "test: add failing tests for suggestion collector and layout config"
```

---

### Task 4: Create the collectSuggestions utility

> **Why:** Extracted from the panel component so it's independently testable. Handles text nodes, block nodes, and modifications. Groups only truly adjacent spans — not globally by ID.

**Files:**
- Create: `web/src/pages/superuser/collectSuggestions.ts`

**Step 1: Create the file**

```ts
// web/src/pages/superuser/collectSuggestions.ts
import type { Editor } from '@tiptap/react';
import type { Mark as PMMark } from '@tiptap/pm/model';

export type SuggestionType = 'insertion' | 'deletion' | 'modification';

export type SuggestionItem = {
  /** Suggestion ID from the mark attrs — number | string */
  id: number | string;
  type: SuggestionType;
  /** Preview of the affected text (empty for block-only nodes) */
  text: string;
  /** Document position range */
  from: number;
  to: number;
};

const MARK_TYPES: SuggestionType[] = ['insertion', 'deletion', 'modification'];

/**
 * Walk the ProseMirror document and collect all suggestion marks into a list.
 *
 * Handles text nodes, block nodes, and attribute/mark modifications.
 * Groups only truly adjacent spans with the same ID — disjoint ranges
 * with the same ID appear as separate items.
 */
export function collectSuggestions(editor: Editor): SuggestionItem[] {
  const items: SuggestionItem[] = [];

  // Track the last item per type+id so we can merge adjacent spans
  let lastByTypeId = new Map<string, SuggestionItem>();

  editor.state.doc.descendants((node, pos) => {
    for (const typeName of MARK_TYPES) {
      const markType = editor.state.schema.marks[typeName];
      if (!markType) continue;

      const mark: PMMark | undefined = markType.isInSet(node.marks);
      if (!mark) continue;

      const id = mark.attrs.id as number | string;
      const key = `${typeName}-${JSON.stringify(id)}`;
      const nodeEnd = pos + node.nodeSize;

      // Only merge if the previous item for this key ends exactly where
      // this node begins (truly adjacent)
      const prev = lastByTypeId.get(key);
      if (prev && prev.to === pos) {
        prev.to = nodeEnd;
        prev.text += node.text ?? '';
      } else {
        const item: SuggestionItem = {
          id,
          type: typeName,
          text: node.text ?? '',
          from: pos,
          to: nodeEnd,
        };
        lastByTypeId.set(key, item);
        items.push(item);
      }
    }

    return true; // continue into children
  });

  return items;
}
```

**Step 2: Run tests**

Run: `cd web && npx vitest run src/pages/superuser/collectSuggestions.test.ts`
Expected: all 6 tests PASS.

**Step 3: Commit**

```bash
git add web/src/pages/superuser/collectSuggestions.ts
git commit -m "feat: add collectSuggestions utility with block-node support"
```

---

### Task 5: Create the SuggestionsPanel component

> **Why:** This is the review UI that goes in pane 3. It receives the editor instance as a **prop** (not a ref), subscribes to transactions, and renders a list with per-item accept/reject/navigate.

**Files:**
- Create: `web/src/pages/superuser/SuggestionsPanel.tsx`

**Step 1: Create the file with the full component**

```tsx
// web/src/pages/superuser/SuggestionsPanel.tsx
import { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  applySuggestion,
  revertSuggestion,
  selectSuggestion,
  applySuggestions,
  revertSuggestions,
} from '@handlewithcare/prosemirror-suggest-changes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collectSuggestions, type SuggestionItem } from './collectSuggestions';

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  /** The Tiptap editor instance, or null if no editor is active. */
  editor: Editor | null;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SuggestionsPanel({ editor }: Props) {
  const [items, setItems] = useState<SuggestionItem[]>([]);

  // Re-collect suggestions on every editor transaction
  useEffect(() => {
    if (!editor) {
      setItems([]);
      return;
    }

    const update = () => setItems(collectSuggestions(editor));
    update(); // initial collection

    editor.on('transaction', update);
    return () => { editor.off('transaction', update); };
  }, [editor]);

  // ── Per-item commands (range-based to act on one occurrence only) ──────

  const handleAccept = useCallback((item: SuggestionItem) => {
    if (!editor) return;
    applySuggestion(item.id, item.from, item.to)(editor.view.state, editor.view.dispatch);
  }, [editor]);

  const handleReject = useCallback((item: SuggestionItem) => {
    if (!editor) return;
    revertSuggestion(item.id, item.from, item.to)(editor.view.state, editor.view.dispatch);
  }, [editor]);

  const handleNavigate = useCallback((id: SuggestionItem['id']) => {
    if (!editor) return;
    selectSuggestion(id)(editor.view.state, editor.view.dispatch);
    editor.view.focus();
  }, [editor]);

  // ── Batch commands ───────────────────────────────────────────────────────

  const handleAcceptAll = useCallback(() => {
    if (!editor) return;
    applySuggestions(editor.view.state, editor.view.dispatch);
  }, [editor]);

  const handleRejectAll = useCallback(() => {
    if (!editor) return;
    revertSuggestions(editor.view.state, editor.view.dispatch);
  }, [editor]);

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
              key={`${item.type}-${JSON.stringify(item.id)}-${item.from}`}
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
                {item.text || '(block change)'}
              </span>

              {/* Per-item accept / reject */}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  title="Accept this suggestion"
                  onClick={(e) => { e.stopPropagation(); handleAccept(item); }}
                  className="rounded p-1 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-950"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Reject this suggestion"
                  onClick={(e) => { e.stopPropagation(); handleReject(item); }}
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

**Key differences from original plan:**
- Receives `editor: Editor | null` prop, not `editorRef: RefObject<Editor | null>`
- `useEffect` depends on `[editor]` (reactive state), not `[editorRef.current]` (broken ref)
- All `useCallback` deps use `[editor]` instead of `[editorRef]`
- React key includes `item.from` to distinguish disjoint items with same ID
- Block changes without text show `"(block change)"` fallback
- Imports `collectSuggestions` from extracted utility
- Per-item accept/reject uses scoped `applySuggestion(id, from, to)` / `revertSuggestion(id, from, to)` so each row acts on one suggestion in one range
- Handlers receive the full `SuggestionItem` (not just `id`) to access `from`/`to` for range-based commands

**Step 2: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: clean.

**Step 3: Commit**

```bash
git add web/src/pages/superuser/SuggestionsPanel.tsx
git commit -m "feat: add SuggestionsPanel component for per-suggestion review"
```

---

### Task 6: Add suggestions tab, pane config, and layout migration for layout 2

> **Why:** Layout 2 needs a `'suggestions'` tab in pane 3 instead of `'blank'`. The tab and pane definitions live in `useWorkspaceEditor.tsx` as exported constants. Layouts 1 and 3 are unchanged. The `saveKey` must change to avoid stale persisted state where pane 3 falls back to `file-tree`.

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

**Step 2: Handle 'suggestions' in renderContent**

In the `renderContent` callback, before the final `return null` (before line 265), add:

```ts
    if (tabId === 'suggestions') {
      return <SuggestionsPanel editor={tiptapEditor} />;
    }
```

Add the import at the top of the file:

```ts
import { SuggestionsPanel } from './SuggestionsPanel';
```

**Step 3: Update SuperuserLayout2 to use the tiptap tab set and new saveKey**

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
          saveKey="superuser-layout-2-v2"
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

> **Note:** `saveKey` changed from `"superuser-layout-2"` to `"superuser-layout-2-v2"`. This forces existing users to get the new default panes with the suggestions tab, instead of the Workbench's fallback logic replacing the stale `'blank'` tab with `'file-tree'`.

**Step 4: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: clean

**Step 5: Commit**

```bash
git add web/src/pages/superuser/useWorkspaceEditor.tsx web/src/pages/superuser/SuperuserLayout2.tsx
git commit -m "feat: wire suggestions panel into layout 2 pane 3 with saveKey migration"
```

---

### Task 7: Remove duplicate Accept All / Reject All from TiptapEditorSurface

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

### Task 8: End-to-end verification

**Step 1: Type check**

Run: `cd web && npx tsc --noEmit`
Expected: clean, zero errors

**Step 2: Run all tests**

Run: `cd web && npx vitest run`
Expected: all tests pass, including new collector tests

**Step 3: Manual verification in browser**

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

3. **Block-level suggestions:**
   - In suggest mode, select a heading and change its level (or wrap text in a list)
   - Pane 3 should show a "mod" badge item for the attribute change
   - Block insertions/deletions should appear with "(block change)" text

4. **Per-item navigation:**
   - Click a row in the suggestions panel → cursor jumps to that suggestion in the editor
   - Editor gains focus

5. **Per-item accept:**
   - Click the checkmark button on an insertion item → insertion is accepted (mark removed, text stays), item disappears from list
   - Click the checkmark button on a deletion item → deletion is accepted (text removed), item disappears from list

6. **Per-item reject:**
   - Create new suggestions
   - Click the X button on an insertion → insertion is rejected (text removed), item disappears
   - Click the X button on a deletion → deletion is rejected (text restored, mark removed), item disappears

7. **Batch accept / reject:**
   - Create several suggestions
   - Click "Accept All" in the panel header → all suggestions applied, list becomes "No suggestions"
   - Create more suggestions
   - Click "Reject All" → all reverted, list becomes "No suggestions"

8. **File switching:**
   - Switch to a different `.md` file → editor reloads, suggestions panel resets to "No suggestions"
   - Open a `.py` file → CodeMirror loads, suggestions panel shows "No suggestions"

9. **Disjoint range display:**
   - Create two separate insertions in different paragraphs
   - Panel should show two separate items, not one merged item

10. **Other layouts unchanged:**
    - Open layout 1 → `.md` file → MDXEditor, pane 3 shows blank (no suggestions tab)
    - Open layout 3 → same as layout 1

11. **Fresh state migration:**
    - Clear localStorage key `"superuser-layout-2"` (old) — confirm it has no effect
    - Confirm pane 3 defaults to suggestions tab (from `"superuser-layout-2-v2"`)

**Step 4: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address verification findings in suggest-changes review UI"
```