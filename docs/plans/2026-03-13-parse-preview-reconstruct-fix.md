# Parse Preview Reconstruct Fix — Use Reconstruct Endpoint

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix `DoclingMdTab` and `BlocksTab` to use the platform-api reconstruct endpoint instead of fetching stale pre-exported artifacts from storage.

**Architecture:** Both tabs call `POST /reconstruct` with a signed URL to the DoclingDocument JSON. The endpoint uses `docling-core` to properly reconstruct HTML via `doc.export_to_html()` and blocks via `extract_docling_blocks(doc)`. The DoclingDocument JSON locator is resolved from `conversion_representations` (not hardcoded paths). Both tabs render the reconstruct response directly.

**Tech Stack:** `platformApiFetch` (authenticated fetch), Supabase storage (signed URLs), `conversion_representations` table

---

## Bug Being Fixed

`DoclingMdTab` fetches `markdown_bytes` from `conversion_representations` — a pre-exported markdown stored during the pipeline. This is the old broken approach from the original ParsePage. The `markdown_bytes` is a stale derived artifact, NOT a proper reconstruction from the canonical DoclingDocument JSON.

The reconstruct endpoint (`POST /reconstruct` on platform-api) exists specifically to fix this. It takes the DoclingDocument JSON and uses the actual `docling-core` Python library to produce:
- `html`: proper HTML via `DoclingDoc.model_validate(dict).export_to_html()`
- `blocks`: proper blocks via `extract_docling_blocks(doc)`

## Correct Data Flow

```
conversion_representations (source_uid, 'doclingdocument_json')
  → artifact_locator (storage key)
  → supabase.storage.createSignedUrl(key)
  → platformApiFetch('/reconstruct', { docling_json_url: signedUrl })
  → { html: string, blocks: [...] }
```

## What is NOT Changing

- `ParseRowActions` — untouched (callback props already wired)
- `ParsePage.tsx` — untouched (ref already passed)
- `ParseTabPanel` — untouched
- Action handlers (`handleDoclingMdPreview`, `handleBlocksPreview`, `handleReset`, `handleDelete`) — untouched
- Tab/pane configuration — untouched
- `getArtifactLocator` function — kept (used for `doclingdocument_json` lookup now)
- `fetchBlocks` function — removed (no longer needed, reconstruct returns blocks)

## Key References

- Reconstruct endpoint: `services/platform-api/app/api/routes/conversion.py:166-174`
- Reconstruct service: `services/platform-api/app/domain/conversion/service.py:457-464`
- Request model: `ReconstructRequest { docling_json_url: string }` (`models.py:29-30`)
- Response shape: `{ html: string, blocks: Array<{ block_type, block_content, pointer, page_no, page_nos, parser_block_type, parser_path }> }`
- Platform API fetch: `web/src/lib/platformApi.ts` — `platformApiFetch(path, init)`
- File to modify: `web/src/pages/useParseWorkbench.tsx`

---

### Task 1: Replace DoclingMdTab to use reconstruct endpoint

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx` (DoclingMdTab component + imports)

**Step 1: Add platformApiFetch import**

Add to existing imports:

```tsx
import { platformApiFetch } from '@/lib/platformApi';
```

**Step 2: Replace DoclingMdTab component**

Replace the entire `DoclingMdTab` function with:

```tsx
function DoclingMdTab({ sourceUid }: { sourceUid: string | null }) {
  const [state, setState] = useState<{ html: string; loading: boolean } | null>(null);

  useEffect(() => {
    if (!sourceUid) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ html: '', loading: true });

    (async () => {
      // 1. Get the doclingdocument_json artifact locator
      const locator = await getArtifactLocator(sourceUid, 'doclingdocument_json');
      if (cancelled) return;
      if (!locator) {
        setState({ html: '<p>No DoclingDocument JSON available. Reset and re-parse with Docling.</p>', loading: false });
        return;
      }

      // 2. Create signed URL for the JSON artifact
      const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(locator, 60 * 20);
      if (cancelled) return;
      if (!data?.signedUrl) {
        setState({ html: '<p>Could not generate download URL.</p>', loading: false });
        return;
      }

      // 3. Call reconstruct endpoint
      try {
        const resp = await platformApiFetch('/reconstruct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docling_json_url: data.signedUrl }),
        });
        if (cancelled) return;
        if (!resp.ok) {
          setState({ html: `<p>Reconstruct failed (${resp.status}).</p>`, loading: false });
          return;
        }
        const result = await resp.json();
        setState({ html: result.html ?? '<p>No HTML returned.</p>', loading: false });
      } catch {
        if (cancelled) return;
        setState({ html: '<p>Failed to reconstruct document.</p>', loading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [sourceUid]);

  if (!sourceUid) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a parsed file to preview its Docling markdown.
      </div>
    );
  }

  if (!state || state.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" viewportClass="h-full overflow-auto">
      <div className="parse-markdown-preview px-6 py-4" dangerouslySetInnerHTML={{ __html: state.html }} />
    </ScrollArea>
  );
}
```

**Step 3: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors

**Step 4: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx
git commit -m "fix: DoclingMdTab uses reconstruct endpoint instead of stale markdown_bytes"
```

---

### Task 2: Replace BlocksTab to use reconstruct endpoint

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx` (BlocksTab component)

**Step 1: Update BlockRow type**

The reconstruct endpoint returns a richer block shape than the database. Change the `BlockRow` type from:

```tsx
type BlockRow = {
  block_uid: string;
  block_index: number;
  block_type: string;
  block_content: string;
};
```

To:

```tsx
type ReconstructBlock = {
  block_type: string;
  block_content: string;
  pointer: string;
  page_no: number | null;
  page_nos: number[];
  parser_block_type: string;
  parser_path: string;
};
```

**Step 2: Replace BlocksTab component**

Replace the entire `BlocksTab` function with:

```tsx
function BlocksTab({ sourceUid }: { sourceUid: string | null }) {
  const [state, setState] = useState<{ blocks: ReconstructBlock[]; loading: boolean } | null>(null);

  useEffect(() => {
    if (!sourceUid) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ blocks: [], loading: true });

    (async () => {
      // 1. Get the doclingdocument_json artifact locator
      const locator = await getArtifactLocator(sourceUid, 'doclingdocument_json');
      if (cancelled) return;
      if (!locator) {
        setState({ blocks: [], loading: false });
        return;
      }

      // 2. Create signed URL for the JSON artifact
      const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(locator, 60 * 20);
      if (cancelled) return;
      if (!data?.signedUrl) {
        setState({ blocks: [], loading: false });
        return;
      }

      // 3. Call reconstruct endpoint
      try {
        const resp = await platformApiFetch('/reconstruct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docling_json_url: data.signedUrl }),
        });
        if (cancelled) return;
        if (!resp.ok) {
          setState({ blocks: [], loading: false });
          return;
        }
        const result = await resp.json();
        setState({ blocks: result.blocks ?? [], loading: false });
      } catch {
        if (cancelled) return;
        setState({ blocks: [], loading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [sourceUid]);

  if (!sourceUid) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a parsed file to preview its blocks.
      </div>
    );
  }

  if (!state || state.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.blocks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No blocks found. Reset and re-parse with Docling.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" viewportClass="h-full overflow-auto">
      <div className="divide-y divide-border">
        {state.blocks.map((b, i) => (
          <div key={`${b.pointer}-${i}`} className="px-4 py-2">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex rounded bg-muted/60 px-1.5 py-0 text-[9px] font-semibold uppercase leading-4 text-muted-foreground">
                {b.block_type}
              </span>
              {b.page_no != null && (
                <span className="text-[10px] text-muted-foreground">p.{b.page_no}</span>
              )}
            </div>
            <div className="whitespace-pre-wrap text-xs text-foreground">{b.block_content}</div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
```

**Step 3: Remove dead code**

Remove the `fetchBlocks` function (no longer used — reconstruct endpoint returns blocks). Keep `getArtifactLocator` (still used by both tabs for looking up `doclingdocument_json`).

**Step 4: Remove unused imports**

Remove `react-markdown` and `remark-gfm` imports (no longer rendering markdown — rendering HTML now).

**Step 5: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors

**Step 6: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx
git commit -m "fix: BlocksTab uses reconstruct endpoint, remove fetchBlocks and markdown deps"
```

---

### Task 3: Verify end-to-end

**No code changes.** Manual smoke test.

**Step 1: Start dev server**

Run: `cd web && npm run dev`

**Step 2: Test Docling MD tab**

1. Navigate to `/app/parse`, select a project with parsed documents
2. Click a parsed file row → right pane "Preview" tab shows source file (unchanged)
3. Click 3-dot menu → "Docling MD Preview" → right pane switches to "Docling MD" tab
4. Should show loading spinner, then proper HTML rendered from the DoclingDocument JSON
5. The HTML should be structurally correct (headings, tables, lists) — NOT stale pre-exported markdown

**Step 3: Test Blocks tab**

1. Click 3-dot menu → "Blocks Preview" → right pane switches to "Blocks" tab
2. Should show block cards with `block_type` badge, page number, and content
3. Blocks should match what the reconstruct endpoint produces from the DoclingDocument JSON

**Step 4: Test error cases**

1. Select an unparsed file → Docling MD tab shows "Select a parsed file..."
2. File with no DoclingDocument JSON → shows "No DoclingDocument JSON available..."

**Step 5: Commit (only if fixes needed)**

---

## Summary of Changes

| File | Change |
|------|--------|
| `web/src/pages/useParseWorkbench.tsx` | `DoclingMdTab`: fetch `doclingdocument_json` → signed URL → `POST /reconstruct` → render HTML |
| `web/src/pages/useParseWorkbench.tsx` | `BlocksTab`: same reconstruct call → render blocks from response |
| `web/src/pages/useParseWorkbench.tsx` | Remove `fetchBlocks` function (dead code) |
| `web/src/pages/useParseWorkbench.tsx` | Remove `react-markdown`/`remark-gfm` imports (render HTML now, not markdown) |
| `web/src/pages/useParseWorkbench.tsx` | Add `platformApiFetch` import |
| `web/src/pages/useParseWorkbench.tsx` | `BlockRow` type → `ReconstructBlock` type (richer shape from endpoint) |

## What is NOT Changed

- `ParseRowActions` — untouched
- `ParsePage.tsx` — untouched
- `ParseTabPanel.tsx` — untouched
- Action handlers in `useParseWorkbench` — untouched
- Tab/pane configuration — untouched
- `getArtifactLocator` — kept (now looks up `doclingdocument_json` instead of `markdown_bytes`)
- Platform API reconstruct endpoint — untouched (already exists and works)
