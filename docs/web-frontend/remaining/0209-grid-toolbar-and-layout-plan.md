# Grid Toolbar, Multi-Upload, and Layout Density Plan

**Date:** 2026-02-09
**Scope:** DocumentDetail page layout compression, BlockViewerGrid toolbar expansion, multi-file upload, schema application UX

---

## Problem: The grid gets ~55-62% of viewport height

Current vertical space budget on DocumentDetail:

```
 Component                          Height    Source
 ─────────────────────────────────  ────────  ───────────────────────────────
 AppShell header                    56px      header={{ height: 56 }}
 AppShell padding-top               16px      padding="md"
 "Back to project" + margin         ~28px     <Group mb="xs">
 PageHeader (title + badges + btn)  ~56px     Title heading + children + margin
 Metadata Paper + margin            ~44px     <Paper p="xs" mb="md">
 Grid toolbar Paper + margin        ~56px     <Paper p="sm" mb="md"> in Grid
 ─────────────────────────────────  ────────
 Total above grid                   ~256px
 Pagination below grid              ~48px
 Total non-grid                     ~304px
```

At 900px viewport: grid gets 596px = **66%**
At 800px viewport: grid gets 496px = **62%**
With run progress bar visible: subtract another ~32px, pushing to **~58%**

**Target: grid gets ~75-80% of viewport height.**

---

## Design: Compress the header into one dense bar

Merge the back-link, title, metadata, status badge, and action buttons into a **single compact bar** above the grid. Everything that was 4 separate vertical sections becomes 1.

### Before (4 sections, ~130px):
```
[<- Back to project]
[WSS                                    INGESTED  Export JSONL]
[md  38.8 KB  28,947 chars  Uploaded 2/9/2026]
```

### After (1 section, ~40px):
```
[<- Back  |  WSS  |  md  38.8KB  28,947ch  2/9/26  |  INGESTED  |  Export  |  Apply Schema  |  View: Compact  |  ...more]
```

One horizontal bar. Dense, scannable. All metadata inline as `xs`-sized chips/text. Actions on the right side. The title is the anchor — everything else flows around it.

If the bar gets too crowded on narrow screens, secondary items collapse behind a `Menu` (three-dot icon).

### Height savings:
- Before: ~256px total above grid (header + padding + 4 sections + grid toolbar)
- After: 56px (AppShell header) + 16px (padding) + 44px (one merged bar) = ~116px
- **Saved: ~140px** — grid gains that space immediately

Result at 900px viewport: grid gets **736px = 82%**
Result at 800px viewport: grid gets **636px = 80%**

---

## Grid toolbar merges into the document bar

Currently the grid has its own toolbar (run selector + block count + page size). This merges into the single bar above or becomes a thin sub-bar directly attached to the grid (no gap/margin).

### Combined bar layout:

```
Left side:                                              Right side:
[<- Back] [Title] [md 38.8KB] [INGESTED]    [Apply Schema v] [View: Compact v] [Export v] [190 blocks] [100 v]
```

The run selector moves into the "Apply Schema" dropdown — which shows existing runs (with their schema names) and an option to create a new run. This replaces the current `RunSelector` component and the separate "Apply Schema" concept with one unified control.

---

## Grid: fill remaining viewport height

Instead of a fixed `gridHeight` calculation, the grid should fill all remaining space:

```tsx
// Current: fixed height
const gridHeight = Math.min(600, 44 + rowData.length * 42);

// New: fill viewport minus header/bar
// Use CSS calc or measure the bar height
<div style={{ height: 'calc(100vh - <bar-height>px)', width: '100%' }}>
  <AgGridReact domLayout="normal" ... />
</div>
```

Pagination moves into the grid's status bar area (bottom of the grid container) rather than being a separate component below with margin.

---

## Feature: Multi-file upload

### Upload page changes:
- Replace `FileInput` (single) with Mantine `Dropzone` (multiple)
- Max 10 files per batch (frontend guard)
- On submit: fire N parallel `ingest` calls, each with `project_id`
- Show per-file progress: filename + status badge (uploading / uploaded / ingested / failed)
- After all complete: navigate to ProjectDetail

### ProjectDetail changes:
- Add Supabase Realtime subscription on `documents_v2` filtered by `project_id`
- Or: poll every 3 seconds while any doc has status `uploaded` or `converting`
- Each doc card shows live status badge that updates as processing completes

### Backend:
- One migration: `ALTER PUBLICATION supabase_realtime ADD TABLE documents_v2;` (if using Realtime)
- No edge function changes — `ingest` already handles one file per call

---

## Feature: Apply Schema (unified run/schema control)

### Current flow:
1. Upload page wizard step 2: select schema
2. Upload page wizard step 3: create run
3. DocumentDetail: select run from dropdown to see overlays

### New flow:
1. Upload page: upload only (step 1), navigate to ProjectDetail
2. DocumentDetail toolbar: "Apply Schema" dropdown:
   - Lists existing runs on this document (schema name + status)
   - Click one to view its overlays in the grid
   - "New run..." option at bottom opens a popover/modal:
     - Select from global schemas
     - Click "Apply" -> calls `runs` edge function -> run appears in list
     - Grid immediately shows new overlay columns (initially all pending)

### Grid behavior when a run is selected:
- Immutable columns (pinned left): #, Type, Content
- Schema columns appear to the right: one per field in `schema_jsonb`
- Column group header shows schema ref name
- Status column shows overlay processing state per block

### Grid behavior with no run selected:
- Only immutable columns shown (current "blocks only" view)

---

## Feature: View mode toggle

### Compact mode (default):
- Fixed row height (42px)
- Content truncated to single line with tooltip on hover
- Best for scanning large documents

### Expanded mode:
- `autoHeight: true` + `wrapText: true` on `block_content` column
- Each row sizes to fit its full content
- Best for reading/reviewing individual blocks
- Note: disables row virtualization — fine with pagination at 25-100 rows

### Control:
- Toggle button or segmented control in the toolbar bar
- State stored in component (or localStorage for persistence)

---

## Feature: Column visibility

- Menu with checkboxes for each schema field column
- Toggling a field calls `gridApi.setColumnsVisible()`
- Immutable columns (#, Type, Content) are always visible
- State resets when switching runs (different schemas have different fields)

---

## Feature: Block type filter

- Multi-select chips or dropdown in the toolbar
- Filters `rowData` by `block_type` before passing to AG Grid
- Quick way to see only headings, only paragraphs, etc.

---

## Implementation order

1. **Layout compression** — merge DocumentDetail header sections into one dense bar, grid fills viewport
2. **Multi-file upload** — Dropzone on Upload page, parallel ingest calls, progress indicators
3. **Apply Schema control** — unified run/schema dropdown in toolbar, replaces RunSelector
4. **View mode toggle** — compact/expanded row heights
5. **Column visibility menu** — checkbox menu for schema field columns
6. **Block type filter** — multi-select filter on block_type
7. **Realtime doc status** — Supabase Realtime or polling for upload progress on ProjectDetail

Steps 1-3 are structural. Steps 4-7 are incremental additions to the toolbar.

---

## Files affected

| File | Change |
|---|---|
| `web/src/pages/DocumentDetail.tsx` | Collapse 4 sections into 1 dense bar |
| `web/src/components/blocks/BlockViewerGrid.tsx` | Merge toolbar into document bar, viewport-fill height, view mode toggle, apply schema control, column visibility, block type filter |
| `web/src/components/blocks/RunSelector.tsx` | Replace with unified ApplySchema dropdown |
| `web/src/pages/Upload.tsx` | Dropzone multi-file, remove steps 2-3, parallel ingest |
| `web/src/pages/ProjectDetail.tsx` | Realtime/polling for doc status updates |

### New files (if needed):
| File | Purpose |
|---|---|
| `web/src/components/blocks/GridToolbar.tsx` | Extracted toolbar component (optional — could stay inline) |
| `web/src/components/blocks/ApplySchemaMenu.tsx` | Unified run/schema selector + "new run" action |

### Backend:
| Change | Scope |
|---|---|
| Migration: add `documents_v2` to Realtime publication | 1 SQL line |
| No edge function changes | All existing endpoints sufficient |
| No schema changes | JSONB overlay model already flexible |