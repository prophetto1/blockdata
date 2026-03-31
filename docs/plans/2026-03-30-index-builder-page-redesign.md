# Index Builder Page Redesign

**Route:** `/app/pipeline-services/index-builder`
**Status:** Design
**Date:** 2026-03-30

## Problem

The current Index Builder page is over-engineered and unusable:

1. Three metadata cards display internal identifiers (pipeline kind `markdown_index_builder`, deliverable kinds `lexical_sqlite`/`semantic_zip`, source types `md`/`markdown`) that serve no user purpose
2. A hero section wastes the top quarter of the viewport repeating what the nav already says
3. The upload flow forces the user through three separate panels: a drop zone with an "Upload files" button, an "Uploaded markdown files" panel where files appear unselected by default and must be individually toggled on, and a "Source Set" panel where toggled files can be reordered with up/down arrows — all before the user can hit run
4. File reorder controls exist for `source_order` metadata tagging that does not affect indexing quality — sources are consolidated and chunked regardless of order
5. Job progress is hidden behind a separate "Runs & Downloads" tab that users must discover and manually switch to
6. There is no persistent record of past runs — the user sees only the latest job
7. The page uses a workbench wrapper with a single locked column, gaining nothing from the abstraction
8. The "Upload stays manual in this phase and does not auto-start processing" disclaimer tells the user what the page won't do instead of what to do

## Design direction

Simplicity. The user uploads markdown files, hits run, watches progress, downloads outputs. A table records every run. No intermediate selection, toggle, or reorder steps.

## Page layout

One page. Two columns. No tabs, no dialogs, no workbench wrapper.

```
+----------------------------------------------+----------------------+
|                                               |                      |
|  Left column (66%)                            |  Right column (34%)  |
|                                               |                      |
|  Runs table                                   |  Context panel       |
|                                               |                      |
|  - "New Run" button above table               |  Shows one of:       |
|  - Each row: label, status, created,          |                      |
|    output download links                      |  1. Empty state      |
|  - Click row = select it                      |  2. New Run form     |
|  - Click "New Run" = deselect + show form     |  3. Run detail       |
|                                               |                      |
+----------------------------------------------+----------------------+
```

Both columns fill the full viewport height below the shell header. No hero section. No metadata cards.

## Left column: Runs table (66%)

The runs table is the landing view. It appears from the first run attempt.

### Table columns

| Column | Content |
|--------|---------|
| Label | Source set label (user-provided or auto-generated) |
| Status | `queued`, `running`, `complete`, `failed` |
| Created | Timestamp |
| Outputs | Download links for completed runs (inline) |

### Table behavior

- Clicking a row selects it and loads its detail into the right column
- The selected row is visually highlighted
- Status uses color coding: emerald (complete), sky (running), red (failed), neutral (queued)
- Failed rows remain visible with their error state
- Download links appear inline on completed rows — no separate downloads view
- Rows are ordered by creation time, newest first
- "New Run" button sits above the table, top-right

### Empty state

When no runs exist yet, the left column shows a centered prompt directing the user to create their first run with a "New Run" button.

## Right column: Context panel (34%)

The right column reflects the current selection. It has three states:

### State 1: Empty

Nothing selected, runs exist but none is clicked. Brief prompt to select a run or create a new one.

### State 2: New Run form

Triggered by clicking "New Run." Contains:

1. **File drop zone** — drag-and-drop or click to select. Markdown files only. All dropped files go into the run.
2. **Label input** — text field for naming the run. Auto-generates a default if left empty.
3. **Start button** — begins processing immediately.

When the user clicks Start:
- A new row appears in the table (status: `queued`)
- The right column switches to the run detail view for that row
- The new row is auto-selected

No file selection toggle. No reorder controls. No pipeline-kind selector. No chunking config. Drop files, name it, run it.

**Open question:** The upload form may work better as a popup/dialog instead of a right column state, keeping the right column purely for run detail. TBD during implementation.

### State 3: Run detail

Triggered by clicking a table row. Contains:

1. **Run header** — label, status badge, created timestamp
2. **Progress tracker** — vertical list of the 9 pipeline stages:
   - Loading sources
   - Consolidating
   - Parsing
   - Normalizing
   - Structuring
   - Chunking
   - Lexical indexing
   - Embedding
   - Packaging

   Each stage shows its state: pending (neutral), in progress (sky), done (emerald), failed (red). The failed stage shows the error message.

3. **Outputs section** — appears below the progress tracker when status is `complete`. Download buttons for each deliverable with filename and file size.

4. **Error section** — appears when status is `failed`. Error message and which stage failed.

## What is removed

1. The workbench wrapper (`Workbench`, `WorkbenchTab`, `Pane` system)
2. The hero/header card with "PIPELINE SERVICE" label and description
3. The three metadata cards (pipeline kind, deliverables, source types)
4. The "Runs & Downloads" tab
5. The "Uploaded markdown files" panel with per-file toggle selection
6. The "Source Set" panel with up/down reorder arrows
7. The "Upload stays manual in this phase" disclaimer
8. `PipelineSourceFilesPanel` component
9. `PipelineSourceSetPanel` component

## What is kept

1. The file drop zone (simplified — no separate upload button, no file list panel)
2. The 9-stage progress tracker (relocated to right column)
3. The deliverable download flow
4. The 2-second polling for active jobs
5. The source set label concept (simplified to a text input)
6. The pipeline service resolution from backend definitions

## Nav rail

The left nav under Pipeline Services keeps its current entries:

- Overview
- Knowledge Bases
- Index Builder

Overview and Knowledge Bases remain as-is. Knowledge Bases is next to be built.

## Files affected

### Modified
- `web/src/pages/IndexBuilderPage.tsx` — rewrite from workbench to two-column layout
- `web/src/pages/useIndexBuilderWorkbench.tsx` — replace with simpler page hook or inline logic
- `web/src/components/pipelines/PipelineUploadPanel.tsx` — simplify to drop zone only
- `web/src/components/pipelines/PipelineJobStatusPanel.tsx` — relocate to right column
- `web/src/components/pipelines/PipelineDeliverablesPanel.tsx` — inline into run detail

### Removed
- `web/src/components/pipelines/PipelineSourceFilesPanel.tsx` — toggle selection eliminated
- `web/src/components/pipelines/PipelineSourceSetPanel.tsx` — reorder/compose eliminated

### New
- `web/src/components/pipelines/PipelineRunsTable.tsx` — left column runs table
- `web/src/components/pipelines/PipelineRunDetailPanel.tsx` — right column detail view
- `web/src/components/pipelines/PipelineNewRunForm.tsx` — right column create form (or dialog — TBD)