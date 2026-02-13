# Consolidated Active Todos 01: Core Pipeline + Schema

This file is a verbatim consolidation of active todo/spec documents.
No summarization or truncation has been applied to source content.

Generated: 2026-02-12 22:10:26 -07:00

## Source Files
- dev-todos\0209-unified-remaining-work.md
- dev-todos\0212-priority7-schema-contracts-master-spec.md
- dev-todos\0212-schema-library-and-assistant-future-task.md
- dev-todos\0213-consolidated-remaining-actions.md


---

<!-- BEGIN SOURCE: dev-todos\0209-unified-remaining-work.md -->

# Unified Remaining Work: BlockData Platform

**Date:** 2026-02-09
**Last verified (repo):** 2026-02-10
**Scope:** Everything between current state and production-ready platform
**Sources consolidated:** `0209-projects-hierarchy-plan-review.md`, `0209-grid-toolbar-and-layout-plan.md`, `web-frontend-buildout-checklist.md`, session discussions on staging layer / editing track / AI worker

**Migration note (2026-02-13):** Remaining open actions from this file are now consolidated in `dev-todos/0213-consolidated-remaining-actions.md`.

---

## Current State Snapshot

**What works end-to-end today:**
- Auth (login, register, session, sign-out)
- Multi-file upload (up to 10 files per batch) with drag/drop + per-file status badges
- Schema registration (JSON upload, SHA256 dedup)
- Run creation (generates pending overlay rows per block)
- AG Grid viewer with dynamic schema columns, real-time overlay updates, pagination
- Export JSONL (canonical v3.0 shape: `{ immutable, user_defined }`)
- Projects hierarchy (create project â†’ upload within project â†’ scoped navigation)
- Breadcrumbs + old-route redirects for legacy flat URLs
- Project-level bulk actions on ProjectDetail: apply schema to all, run all pending, confirm all, export all (ZIP)
- Project-level status dashboard on ProjectDetail (`confirmed/staged/pending/failed`) scoped by selected schema
- Realtime document status updates on ProjectDetail via `documents_v2` subscription
- Review/confirm workflow in DocumentDetail grid: staged indicators, inline staging edits, per-block confirm/reject, and bulk "Confirm All Staged"
- Run export now includes only confirmed overlays (`user_defined.data` is `null` for unconfirmed blocks)
- Dark/light theme toggle, Linear-aesthetic design tokens

**What does NOT work:**
- AI worker is implemented in-repo, but live runs still require invocation wiring + `ANTHROPIC_API_KEY` secret; otherwise overlays stay `pending`
- Bulk export currently targets ZIP of per-document JSONL; merged JSONL/CSV variants are still pending
- No document reconstruction â€” no way to get a revised document back
- Non-Markdown conversion (Docling track) blocked by Cloud Run access policy (403 per status doc) â€” DOCX/PDF uploads stall at "converting"

---

## Phase 1 â€” Database & Architecture Foundations

These are schema and convention changes that other phases depend on. Do these first.

### 1.1 Staging columns on `block_overlays_v2` (Option A)

Rename the existing `overlay_jsonb` and add staging + audit columns:

```sql
-- Rename existing column to be the confirmed store
ALTER TABLE block_overlays_v2
  RENAME COLUMN overlay_jsonb TO overlay_jsonb_confirmed;

-- Add staging column (AI writes here)
ALTER TABLE block_overlays_v2
  ADD COLUMN overlay_jsonb_staging JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add confirmation audit columns
ALTER TABLE block_overlays_v2
  ADD COLUMN confirmed_at TIMESTAMPTZ,
  ADD COLUMN confirmed_by UUID REFERENCES auth.users(id);
```

**Write rules:**
- AI worker writes ONLY to `overlay_jsonb_staging`
- User confirm action copies `overlay_jsonb_staging` â†’ `overlay_jsonb_confirmed`, stamps `confirmed_at` + `confirmed_by`
- Export reads ONLY `overlay_jsonb_confirmed`
- Grid shows `overlay_jsonb_staging` when reviewing (`ai_complete`), `overlay_jsonb_confirmed` when viewing final (`confirmed`)
- A bug or re-run can never overwrite confirmed data â€” only the explicit confirm action touches that column

### 1.2 Expand overlay status enum

Current statuses: `pending`, `claimed`, `complete`, `failed`

New statuses:

| Status | Meaning | Written by |
|---|---|---|
| `pending` | Overlay row created, no work started | System (run creation) |
| `claimed` | Worker has picked up this block | Worker |
| `ai_complete` | AI produced a result, awaiting user review | Worker |
| `confirmed` | User accepted (possibly edited) the result | User action |
| `failed` | Worker encountered an error | Worker |

Migration: Update the check constraint or enum (if one exists) on `block_overlays_v2.status`.

**Current repo note:** Migration 009 updates `block_overlays_v2_status_check` to `pending|claimed|ai_complete|confirmed|failed` (and drops legacy `complete`).

### 1.3 Define schema `prompt_config` convention

Each schema artifact can include a `prompt_config` section that the AI worker reads:

```json
{
  "schema_ref": "scotus_close_reading_v1",
  "prompt_config": {
    "system_instructions": "You are a legal analyst...",
    "per_block_prompt": "For this block, extract the following fields...",
    "model": "claude-sonnet-4-5-20250929",
    "temperature": 0.3,
    "max_tokens_per_block": 2000
  },
  "properties": {
    "rhetorical_function": { "type": "string", "enum": [...] },
    ...
  }
}
```

Platform validates: is JSON object, has `schema_ref`. Everything else (including `prompt_config`) is opaque â€” the worker reads it, the platform doesn't enforce its shape.

For the editing track, schemas include a field like `revised_content` (string) alongside any metadata fields. No platform-level distinction between "extraction schema" and "editing schema" â€” the schema's fields determine the track implicitly.

### 1.4 Make `project_id` NOT NULL

After verifying all upload paths set `project_id`:

```sql
-- Ensure no orphans remain
UPDATE documents_v2 SET project_id = (
  SELECT project_id FROM projects WHERE owner_id = documents_v2.owner_id LIMIT 1
) WHERE project_id IS NULL;

ALTER TABLE documents_v2 ALTER COLUMN project_id SET NOT NULL;
```

Reject uploads without `project_id` in the edge function (400 error).

### 1.5 Reconcile migration version drift

The remote DB records migration 008 under a different timestamp than the repo filename. Add a no-op sync migration or rename the repo file to match. Prevents confusion when running migrations via CLI/CI.

---

## Phase 2 â€” AI Worker (Distributed Claim-Based Work Queue)

The single highest-impact missing piece. Blocks both extraction and editing tracks.

### 2.1 Architecture: stateless, concurrent, multi-provider

The worker is **not** a long-running daemon. It is a stateless HTTP function that processes one batch per invocation: claim â†’ process â†’ write â†’ exit. The `block_overlays_v2` table IS the work queue. Run 1 instance or 20 â€” the behavior is identical because the claim is atomic.

**Why this matters:** A 77-document project with ~5,000 total blocks can be processed by 20 concurrent workers in ~5 minutes instead of 4 hours sequentially. The user watches the grid fill in real time.

**Concurrency model:**

| Workers | Time/block | 5,000 blocks wall clock |
|---|---|---|
| 1 (sequential) | ~3s | ~4 hours |
| 20 concurrent | ~3s | ~12 minutes |
| 50 concurrent | ~3s | ~5 minutes |

Workers can be: multiple invocations of the same edge function, different API keys, different providers (Anthropic + OpenAI), different model tiers (Opus for paragraphs, Haiku for headings). The database doesn't care â€” `claimed_by` records who processed each block.

### 2.2 Worker edge function: `supabase/functions/worker/index.ts`

**Trigger:** HTTP POST with `run_id` (and optional `batch_size`, `model_override`). Called by:
- User clicking "Run All Pending" (fires N concurrent invocations)
- Per-document "Run Pending" button
- Future: external dispatcher splitting ranges across API keys

**Flow per invocation:**

1. **Claim batch:** Atomically claim N pending overlays using `FOR UPDATE SKIP LOCKED` (valid Postgres pattern â€” `UPDATE...LIMIT` is not):
   ```sql
   WITH claimable AS (
     SELECT run_id, block_uid
     FROM block_overlays_v2
     WHERE run_id = $1 AND status = 'pending'
     ORDER BY block_uid
     LIMIT $batch_size
     FOR UPDATE SKIP LOCKED
   )
   UPDATE block_overlays_v2 bo
   SET status = 'claimed', claimed_by = $worker_id, claimed_at = NOW()
   FROM claimable c
   WHERE bo.run_id = c.run_id AND bo.block_uid = c.block_uid
   RETURNING bo.*;
   ```
   `SKIP LOCKED` ensures concurrent workers never claim the same rows. If zero rows returned â†’ nothing to do â†’ exit 200.

2. **Load context:** For each claimed overlay:
   - Fetch `block_content` and `block_type` from `blocks_v2` via `block_uid`
   - Fetch `schema_jsonb` (including `prompt_config`) from `schemas` via run â†’ schema join (cached per batch â€” same schema for every block in the run)

3. **Call LLM:** For each block:
   - Build prompt from `prompt_config.system_instructions` + `prompt_config.per_block_prompt` + block content
   - Use structured output (JSON schema constraint) matching the schema's `properties`
   - Model from `prompt_config.model`, run's `model_config`, or request param `model_override`

4. **Write staged result:** (note: PK is composite `(run_id, block_uid)`, no `overlay_id` column)
   ```sql
   UPDATE block_overlays_v2
   SET overlay_jsonb_staging = $result, status = 'ai_complete'
   WHERE run_id = $run_id AND block_uid = $block_uid
   ```

5. **Update run rollup:** After processing each block (or at batch end):
   ```sql
   UPDATE runs_v2
   SET completed_blocks = (
     SELECT COUNT(*) FROM block_overlays_v2
     WHERE run_id = $run_id AND status IN ('ai_complete', 'confirmed')
   ),
   failed_blocks = (
     SELECT COUNT(*) FROM block_overlays_v2
     WHERE run_id = $run_id AND status = 'failed'
   )
   WHERE run_id = $run_id;
   ```
   When `completed_blocks + failed_blocks = total_blocks`, set `runs_v2.status = 'complete'` and `completed_at = NOW()`.

6. **Error handling:**
   - On LLM failure â†’ `status = 'failed'`, `last_error = message`, `attempt_count += 1`
   - Each overlay is independent â€” partial batch success is normal
   - Failed overlays can be retried (re-claim where `status = 'failed' AND attempt_count < max`)

### 2.3 Dispatch strategies (future enhancement)

The worker function is dumb â€” it claims and processes. Intelligence lives in the **dispatcher** that decides how many workers to launch and how:

| Strategy | Description |
|---|---|
| **Simple** (v1) | Frontend fires 1 POST per run. Worker processes batch_size blocks, returns. Frontend fires again if pending remain. |
| **Parallel fan-out** | Frontend fires N concurrent POSTs to the same endpoint. Each claims its own non-overlapping batch. |
| **Multi-key** | External orchestrator fires POSTs with different API keys, spreading rate limits across providers. |
| **Model routing** | Dispatcher queries block types first, routes heading/footnote blocks to Haiku, paragraph blocks to Opus. |

All strategies use the same worker function. The atomic claim prevents double-processing regardless of concurrency level.

### 2.4 Worker configuration

| Setting | Source | Default |
|---|---|---|
| Model | `prompt_config.model` or `run.model_config.model` or request param | `claude-sonnet-4-5-20250929` |
| Temperature | `prompt_config.temperature` | 0.2 |
| Max tokens per block | `prompt_config.max_tokens_per_block` | 2000 |
| Batch size | Request param or env var | 25 |
| Max retries per block | Env var | 3 |
| Worker ID | Auto-generated per invocation | `worker-{uuid}` |

### 2.5 API key management

Worker needs an LLM API key. Options:
- **Platform-managed:** Single API key in Supabase secrets, billed to platform (simpler, v1)
- **User-provided:** Users store their own API keys (future, requires encrypted key storage)
- **Multi-key pool:** Multiple keys in a rotation pool for higher throughput (future)

Start with platform-managed for v1.

---

## Phase 3 â€” Frontend Cleanup

Fix what's broken or incomplete in the current frontend before adding new features.

### 3.1 Split Upload.tsx

**Current repo:** Upload is upload-only when accessed via `/app/projects/:projectId/upload`, and now supports multi-file drag/drop with per-file status + retry.

Phase 5 upload work is complete in current repo.

### 3.2 Remove dead pages and flat routes

Delete from disk:
- `web/src/pages/Dashboard.tsx` (replaced by Projects.tsx)
- `web/src/pages/Documents.tsx` (replaced by ProjectDetail)
- `web/src/pages/RunsList.tsx` (replaced by ProjectDetail)

Remove any stale imports/references in router.tsx.

### 3.3 Add redirects for old flat routes

In router.tsx, add catch-all redirects:
- `/app/documents/:sourceUid` â†’ look up document's `project_id`, redirect to `/app/projects/:projectId/documents/:sourceUid`
- `/app/runs/:runId` â†’ look up run's project via `conv_uid` â†’ `documents_v2.project_id`, redirect
- `/app/upload` â†’ redirect to `/app` (projects list)

Prevents 404s from bookmarks or shared links.

### 3.4 Add breadcrumbs

All project-scoped pages get clickable breadcrumbs:

| Route | Breadcrumb |
|---|---|
| `/app/projects/:id` | Projects > Project Name |
| `/app/projects/:id/upload` | Projects > Project Name > Upload |
| `/app/projects/:id/documents/:uid` | Projects > Project Name > Doc Title |
| `/app/projects/:id/runs/:runId` | Projects > Project Name > Run xyz... |

Use Mantine `Breadcrumbs` component. Each segment is a `<Link>`.

### 3.5 Verify route-entity membership

In DocumentDetail and RunDetail, confirm the loaded entity's `project_id` matches the route's `:projectId`. If mismatch: redirect to the correct scoped URL or show "Not found in this project."

### 3.6 Deletion & lifecycle operations

Missing from all existing plans. These are in the buildout checklist but never specified:

**Document deletion:**
- Edge function or RPC: cascade delete `block_overlays_v2` â†’ `blocks_v2` â†’ `documents_v2`
- UI: delete button on DocumentDetail (with confirmation dialog)
- Must also clean up Storage bucket files (`uploads/{source_uid}/...`, `converted/{source_uid}/...`)

**Run deletion / cancellation:**
- Delete: remove `block_overlays_v2` rows for the run, then `runs_v2` row
- Cancel: set `runs_v2.status = 'cancelled'`, stop claiming new overlays (workers check run status before processing)
- UI: delete/cancel buttons on run cards in ProjectDetail

**Schema deletion:**
- Only if no runs reference the schema (FK constraint will enforce this)
- Or: soft-delete (mark inactive) to preserve history
- UI: delete option on schema cards in Schemas page

**Project deletion:**
- Cascade: delete all runs â†’ overlays â†’ blocks â†’ documents â†’ project
- UI: delete button in ProjectDetail edit modal (with strong confirmation â€” "This will delete 77 documents and all associated data")

---

## Phase 4 â€” Grid Layout & Toolbar

Make the block viewer the production-quality working surface it needs to be.

### 4.1 Layout compression

Merge the 4 sections above the grid (back link + page header + metadata bar + grid toolbar) into **one dense horizontal bar** (~44px):

```
[<- Back] [Title] [md 38.8KB 28,947ch] [INGESTED] | [Apply Schema v] [View v] [Export v] [190 blocks] [100 v]
```

Left side: navigation + identity + metadata (as `xs`-sized text/badges).
Right side: action controls.
Overflow: secondary items collapse behind a three-dot `Menu` on narrow screens.

**Height savings:** ~256px above grid â†’ ~116px. Grid goes from ~62% to ~80% of viewport.

### 4.2 Grid fills remaining viewport

Replace fixed height calculation:
```tsx
// Before
const gridHeight = Math.min(600, 44 + rowData.length * 42);

// After
<div style={{ height: 'calc(100vh - 116px)', width: '100%' }}>
  <AgGridReact domLayout="normal" ... />
</div>
```

Pagination moves into the grid's bottom status bar area (inside the container, no external margin).

### 4.3 Apply Schema control (unified run/schema selector)

Replaces the current `RunSelector` dropdown with a richer control:
- Lists existing runs on this document (schema name + status + progress)
- Click a run â†’ grid shows its overlay columns
- "New run..." option at bottom â†’ popover/modal to select schema + create run
- No run selected â†’ grid shows immutable columns only

### 4.4 View mode toggle

Segmented control in toolbar: **Compact** | **Expanded**

| Mode | Row height | Content column | Virtualization |
|---|---|---|---|
| Compact (default) | 42px fixed | Single line, truncated, tooltip on hover | Enabled |
| Expanded | `autoHeight: true` | Full text, `wrapText: true` | Disabled (fine at 25-100 rows/page) |

State stored in `localStorage` for persistence.

### 4.5 Column visibility menu

- Checkbox menu (Mantine `Menu` with `Menu.Item` per field)
- Toggling calls `gridApi.setColumnsVisible()`
- Immutable columns (#, Type, Content) always visible
- State resets when switching runs (different schemas = different fields)

### 4.6 Block type filter

- Multi-select chips or dropdown in toolbar
- Filters `rowData` by `block_type` before passing to AG Grid
- Shows only headings, only paragraphs, etc.
- "All" option to reset

---

## Phase 5 â€” Multi-File Upload

### 5.1 Replace FileInput with Dropzone

In Upload.tsx (now upload-only per Phase 3.1):
- Mantine `Dropzone` accepting `.md`, `.docx`, `.pdf`, `.pptx`, `.txt`
- Max 10 files per batch (frontend guard)
- File list below dropzone with per-file status

### 5.2 Parallel ingest calls

On submit: fire N parallel calls to `ingest` edge function, each with `project_id`.

Per-file status display:

| Status | Badge | Meaning |
|---|---|---|
| `uploading` | Blue (animated) | HTTP request in flight |
| `uploaded` | Yellow | Server received, parsing |
| `ingested` | Green | Blocks extracted |
| `failed` | Red + retry button | Error occurred |

### 5.3 Real-time document status on ProjectDetail

After upload completes, ProjectDetail shows live status per document:
- Option A: Supabase Realtime subscription on `documents_v2` filtered by `project_id`
- Option B: Poll every 3 seconds while any doc has status `uploaded` or `converting`

Requires migration: `ALTER PUBLICATION supabase_realtime ADD TABLE documents_v2;`

---

## Phase 5B â€” Project-Level Bulk Operations

The 77-document use case: a company uploads all their specs, applies one schema, runs AI across everything, exports all results. This workflow must not require the user to repeat per-document actions 77 times.

### 5B.1 "Apply Schema to All Documents" (ProjectDetail action bar)

One click on ProjectDetail creates a run for every document in the project that doesn't already have a run for the selected schema:

```sql
-- For each document in the project without a run for this schema:
SELECT create_run_v2(owner_id, conv_uid, schema_id)
FROM documents_v2
WHERE project_id = $project_id
  AND status = 'ingested'
  AND conv_uid NOT IN (
    SELECT conv_uid FROM runs_v2 WHERE schema_id = $schema_id
  )
```

Frontend: schema selector dropdown + "Apply to All" button. Shows confirmation: "This will create runs for 77 documents (estimated ~5,012 blocks)."

### 5B.2 "Run All Pending" (ProjectDetail action bar)

Dispatches workers across ALL pending overlays in the project, not one document at a time:

1. Query: `SELECT DISTINCT run_id FROM block_overlays_v2 bo JOIN runs_v2 r USING(run_id) JOIN documents_v2 d ON r.conv_uid = d.conv_uid WHERE d.project_id = $project_id AND bo.status = 'pending'`
2. Fire N concurrent worker invocations (fan-out across all runs)
3. Progress bar on ProjectDetail shows aggregate: "3,847 of 5,012 blocks processed across 77 documents"

### 5B.3 "Confirm All" (ProjectDetail action bar)

After reviewing samples in the grid, user can bulk-confirm all `ai_complete` overlays across the entire project:

```sql
UPDATE block_overlays_v2 bo
SET overlay_jsonb_confirmed = overlay_jsonb_staging,
    status = 'confirmed',
    confirmed_at = NOW(),
    confirmed_by = $user_id
FROM runs_v2 r, documents_v2 d
WHERE bo.run_id = r.run_id
  AND r.conv_uid = d.conv_uid
  AND d.project_id = $project_id
  AND bo.status = 'ai_complete'
```

Shows confirmation dialog: "Confirm 4,891 staged results across 77 documents?"

### 5B.4 "Export All" (ProjectDetail action bar)

Export options:
- **One JSONL per document** â€” downloads a zip of 77 `.jsonl` files (named by doc title)
- **One merged JSONL** â€” single file with all blocks across all documents (with `source_uid` for grouping)
- **CSV** â€” flat table for spreadsheet analysis

Only exports confirmed overlays.

### 5B.5 Project-level progress dashboard

ProjectDetail shows aggregate stats that update in real time:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  77 documents  â”‚  5,012 blocks  â”‚  Schema: spec_review_v1   â”‚
â”‚                                                              â”‚
â”‚  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘  78%                        â”‚
â”‚  3,909 confirmed  â”‚  982 staged  â”‚  84 pending  â”‚  37 failedâ”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

This is the view that lets a user managing 77 documents feel confident they can see the whole picture without opening each document individually.

---

## Phase 6 â€” Review & Confirm UX (Staging Layer)

This is where both extraction and editing tracks converge. The user reviews AI output before it becomes permanent.

### 6.1 Grid staging indicators

When a run is selected and overlays are in `ai_complete` status:
- Schema field cells show the staged data with a visual indicator (subtle background tint, or small icon)
- A "Staged â€” awaiting review" banner appears above or below the toolbar
- Confirmed cells show normal styling (no indicator)

### 6.2 Inline editing of staged overlays

- Double-click a staged cell â†’ edit the value
- Edits write back to `overlay_jsonb_staging` via Supabase update (never write to `overlay_jsonb_confirmed` directly)
- Cell renderers handle edit mode per data type (text input, select for enums, etc.)

### 6.3 Confirm/reject controls

**Per-block:** Checkbox column or action button per row to accept/reject individual blocks.

**Bulk:** Toolbar button "Confirm All Staged" â†’ moves all `ai_complete` overlays to `confirmed`:
```sql
UPDATE block_overlays_v2
SET overlay_jsonb_confirmed = overlay_jsonb_staging,
    status = 'confirmed',
    confirmed_at = NOW(),
    confirmed_by = $user_id
WHERE run_id = $1 AND status = 'ai_complete'
```

**Per-block reject:** Sets status back to `pending` (can be re-run) or `rejected` (skipped).

### 6.4 Export respects confirmation

`export-jsonl` only includes blocks where `status = 'confirmed'` in the `user_defined` section. Blocks without confirmed overlays export with `"user_defined": null` or an empty `data` object.

### 6.5 RLS + RPC requirements (must-have)

Current repo has **SELECT-only** RLS on `block_overlays_v2`. To support staging edits and confirmation safely:

- Allow users to **UPDATE `overlay_jsonb_staging`** for overlays they own (via run ownership).
- Prevent any direct client-side updates to `overlay_jsonb_confirmed` (confirmed data) by default.
- Implement confirmation via an RPC (recommended) so the copy + audit stamp is atomic:
  - Copy `overlay_jsonb_staging` Ã¢â€ â€™ `overlay_jsonb_confirmed`
  - Set `status = 'confirmed'`
  - Stamp `confirmed_at`, `confirmed_by`

---

## Phase 7 â€” Export & Reconstruction

### 7.1 Enhanced export options

From the toolbar or ProjectDetail action bar:
- **Export JSONL (confirmed only)** â€” current canonical format, only confirmed overlays
- **Export JSONL (all including staged)** â€” includes `ai_complete` data, marked as unconfirmed
- **Export CSV** â€” flat table of block fields for spreadsheet use
- **Export per-document** â€” one file per document vs one file for entire project

### 7.2 Document reconstruction (mdast track)

New edge function: `supabase/functions/reconstruct/index.ts`

**Input:** `conv_uid` + `run_id` (identifies which confirmed overlays to use)

**Flow:**
1. Fetch all blocks for the document, ordered by `block_index`
2. Fetch confirmed overlays for the run
3. For each block with a confirmed `revised_content` field:
   - Use `block_locator.start_offset` and `block_locator.end_offset` to locate the block in the original markdown bytes
   - Replace original content with `revised_content`
4. Serialize the reconstructed markdown
5. Return as downloadable `.md` file

**Scope:** mdast track only (markdown â†’ markdown). Docling and Pandoc reconstruction are future work â€” depends on those parsers supporting round-trip serialization.

**Editing track schema convention:** Any schema intended for the editing track includes a `revised_content` (string) field. The reconstruction function looks for this specific field name. If the field doesn't exist in the schema, reconstruction is not available for that run.

---

## Phase 8 â€” Third-Party Integrations

### 8.1 Integrations page (`/app/integrations`)

Shows configured integration targets with connection status. Each integration is a card:
- **Neo4j** â€” push overlay data as nodes and edges
- **Webhook** â€” POST JSONL to a custom endpoint on run completion
- **DuckDB / Parquet** â€” export as Parquet for analytical queries

### 8.2 Neo4j integration

**Configuration flow:**
1. Connection: bolt URL, credentials, database name
2. Field mapping: which overlay fields become nodes, edges, properties
   - If schema has `graph_mapping` key â†’ auto-mapped
   - If not â†’ user maps via form (field â†’ node label / edge type / property)
3. Test: push a single block's overlay to verify
4. Deploy: "Push all confirmed overlays" or "Auto-push on confirmation"

**Backend:** New edge function `integrate-neo4j` that reads confirmed overlays and executes Cypher statements.

### 8.3 Webhook integration

- User configures: URL, headers, auth method
- Trigger: "on run fully confirmed" or manual
- Payload: JSONL stream of confirmed blocks (same format as export)

### 8.4 DuckDB / Parquet export

- Flatten confirmed overlays into columnar format
- Export as `.parquet` file
- Download or push to cloud storage (S3/GCS)

---

## Phase 9 â€” Infrastructure & Polish

### 9.1 GCP conversion service (unblock Docling track)

The conversion service is deployed but returns 403 due to GCP org policy blocking `allUsers` IAM binding. Fix options:
1. Override org policy for the specific Cloud Run service
2. Deploy to a different GCP project without the constraint
3. Add an authentication layer (service account token exchange)

Until fixed, DOCX/PDF uploads stall at "converting." Markdown uploads work fine.

### 9.2 Code-splitting

- `React.lazy()` + `Suspense` for page-level code splitting
- Separate AG Grid into its own chunk (~1MB)
- Target: initial bundle under 500KB

### 9.3 Testing

- Vitest + React Testing Library setup
- Unit tests: `schema-fields.ts`, `edge.ts`, hash utilities
- Component tests: `BlockViewerGrid`, `RunSelector`, cell renderers
- Hook tests: `useBlocks`, `useOverlays`, `useRuns`
- E2E: Playwright for upload â†’ view â†’ export flow

### 9.4 Error handling

- React Error Boundary (global)
- Realtime channel reconnection handling
- Retry logic for failed API calls
- Form validation via Mantine `useForm`

### 9.5 CI/CD

- GitHub Actions: lint + type-check + build on PR
- Automated Vercel deployments on merge to main
- Pre-commit hooks (lint-staged + prettier)

### 9.6 Auth & account lifecycle

- Email confirmation flow (Supabase Auth handles this, but redirect URLs need configuration)
- "Forgot password" flow (password reset email + reset page)
- OAuth providers (Google, GitHub â€” Supabase Auth config + UI buttons on Login page)
- Account settings page (change password, display name, manage API keys in future)

### 9.7 Security hardening

- CSP headers
- Rate limiting on auth attempts
- Session expiry handling in UI
- Audit cell renderers for XSS vectors (React is safe by default, but verify)

---

## Implementation Order & Dependencies

```
Phase 1 (DB foundations)
  â”œâ”€â”€ 1.1 staging + audit columns (Option A: overlay_jsonb_staging, overlay_jsonb_confirmed, confirmed_at/by)
  â”œâ”€â”€ 1.2 status enum expansion (add ai_complete, confirmed)
  â”œâ”€â”€ 1.3 prompt_config convention (documentation, no code)
  â”œâ”€â”€ 1.4 project_id NOT NULL
  â””â”€â”€ 1.5 migration drift reconciliation
         â”‚
Phase 2 (AI Worker) â† depends on 1.1, 1.2, 1.3
  â”œâ”€â”€ 2.1 stateless worker edge function (claim â†’ LLM â†’ write staged)
  â”œâ”€â”€ 2.2 concurrent multi-instance support (atomic claims, claimed_by provenance)
  â”œâ”€â”€ 2.3 dispatch strategies (simple â†’ parallel fan-out â†’ multi-key â†’ model routing)
  â”œâ”€â”€ 2.4 worker configuration
  â””â”€â”€ 2.5 API key management
         â”‚
Phase 3 (Frontend cleanup) â† independent of Phase 2
  â”œâ”€â”€ 3.1 split Upload.tsx
  â”œâ”€â”€ 3.2 remove dead pages
  â”œâ”€â”€ 3.3 old-route redirects
  â”œâ”€â”€ 3.4 breadcrumbs
  â”œâ”€â”€ 3.5 route-entity membership check
  â””â”€â”€ 3.6 deletion/lifecycle ops (doc, run, schema, project delete)
         â”‚
Phase 4 (Grid & toolbar) â† independent of Phase 2
  â”œâ”€â”€ 4.1 layout compression
  â”œâ”€â”€ 4.2 grid fills viewport
  â”œâ”€â”€ 4.3 Apply Schema control
  â”œâ”€â”€ 4.4 view mode toggle
  â”œâ”€â”€ 4.5 column visibility
  â””â”€â”€ 4.6 block type filter
         â”‚
Phase 5 (Multi-file upload) â† depends on 3.1
  â”œâ”€â”€ 5.1 Dropzone
  â”œâ”€â”€ 5.2 parallel ingest
  â””â”€â”€ 5.3 realtime doc status
         â”‚
Phase 5B (Project-level bulk ops) â† depends on 2.1 + 4.3
  â”œâ”€â”€ 5B.1 "Apply Schema to All Documents"
  â”œâ”€â”€ 5B.2 "Run All Pending" (concurrent worker dispatch)
  â”œâ”€â”€ 5B.3 "Confirm All" (project-wide bulk confirm)
  â”œâ”€â”€ 5B.4 "Export All" (zip of JSONL or merged file)
  â””â”€â”€ 5B.5 Project-level progress dashboard
         â”‚
Phase 6 (Review & confirm UX) â† depends on 2.1 (needs AI output to review)
  â”œâ”€â”€ 6.1 grid staging indicators
  â”œâ”€â”€ 6.2 inline editing
  â”œâ”€â”€ 6.3 confirm/reject controls
  â””â”€â”€ 6.4 export respects confirmation
         â”‚
Phase 7 (Export & reconstruction) â† depends on 6.3 (needs confirmed data)
  â”œâ”€â”€ 7.1 enhanced export options
  â””â”€â”€ 7.2 document reconstruction (mdast)
         â”‚
Phase 8 (Integrations) â† depends on 6.3 (needs confirmed data)
  â”œâ”€â”€ 8.1 integrations page
  â”œâ”€â”€ 8.2 Neo4j
  â”œâ”€â”€ 8.3 webhook
  â””â”€â”€ 8.4 DuckDB/Parquet
         â”‚
Phase 9 (Polish) â† can start anytime, intensifies after Phase 6
  â”œâ”€â”€ 9.1 GCP conversion fix
  â”œâ”€â”€ 9.2 code-splitting
  â”œâ”€â”€ 9.3 testing
  â”œâ”€â”€ 9.4 error handling
  â”œâ”€â”€ 9.5 CI/CD
  â”œâ”€â”€ 9.6 auth/account lifecycle (email confirm, forgot password, OAuth)
  â””â”€â”€ 9.7 security hardening
```

**Parallelism:** Phases 3 and 4 can run concurrently with Phase 2. Phase 5 can start as soon as 3.1 is done. Phase 9.1 (GCP fix) is independent of everything and should happen whenever possible.

**Critical path:** Phase 1 â†’ Phase 2 â†’ Phase 5B â†’ Phase 6 â†’ Phase 7/8. Everything else feeds into or runs alongside this path.

**The 77-doc use case flows through:** Phase 5 (bulk upload) â†’ Phase 5B.1 (apply schema to all) â†’ Phase 5B.2 (run all pending) â†’ Phase 6 (review/confirm) â†’ Phase 5B.3 (confirm all) â†’ Phase 5B.4 (export all) â†’ Phase 8 (push to Neo4j).

---

## Checklist (flat, for tracking)

### Phase 1 â€” DB & Architecture âœ… (completed 2026-02-10)
- [x] Migration 009: rename `overlay_jsonb` â†’ `overlay_jsonb_confirmed`, add `overlay_jsonb_staging`, `confirmed_at`, `confirmed_by`
- [x] Migration 009: expand overlay status CHECK constraint (`pending | claimed | ai_complete | confirmed | failed`, dropped legacy `complete`)
- [x] Migration 009: RLS UPDATE policy for overlay owners (run ownership check)
- [x] Migration 009: RPC `confirm_overlays(run_id, block_uids[])` â€” atomic copy staging â†’ confirmed + stamp `confirmed_at/by` + run rollup
- [x] Migration 009: RPC `update_overlay_staging(run_id, block_uid, jsonb)` â€” for inline editing
- [x] Migration 009: `project_id NOT NULL` on `documents_v2`
- [x] Partial indexes: `idx_block_overlays_v2_pending`, `idx_block_overlays_v2_ai_complete`
- [x] Reconciled migration version drift (renamed repo files 002, 007, 008 to match DB timestamps)
- [ ] Document `prompt_config` convention in schema spec (deferred â€” convention is embedded in worker code and Phase 1.3 spec above)

### Phase 2 â€” AI Worker (Distributed) âœ… (completed 2026-02-10)
- [x] Migration 010: `claim_overlay_batch(run_id, batch_size, worker_id)` RPC â€” `FOR UPDATE SKIP LOCKED`
- [x] Created `supabase/functions/worker/index.ts` (stateless, re-entrant, verify_jwt=true)
- [x] Atomic claim via `claim_overlay_batch` RPC with `claimed_by` provenance
- [x] LLM call via Anthropic Messages API with `tool_use` for structured output from schema `prompt_config`
- [x] Write to `overlay_jsonb_staging`, set status `ai_complete`
- [x] Run rollup: update `runs_v2.completed_blocks/failed_blocks/status` after each batch; auto-complete when no pending remain
- [x] Error handling + retry logic (per-block, release to `pending` if attempt_count < max_retries, else `failed`)
- [x] Cancellation check: worker releases claimed blocks if run is cancelled
- [x] API key: platform-managed v1 via `ANTHROPIC_API_KEY` Supabase secret
- [x] Code references updated: `export-jsonl` reads `overlay_jsonb_confirmed`; `types.ts` + `BlockViewerGrid.tsx` reflect new columns/statuses
- [ ] Set `ANTHROPIC_API_KEY` in Supabase secrets (prerequisite for live worker)
- [ ] Test: concurrent worker invocations don't double-process blocks
- [ ] Test: create run â†’ trigger worker â†’ overlays reach `ai_complete` â†’ run status updates

### Phase 3 â€” Frontend Cleanup âœ… (completed 2026-02-10)
- [x] Split Upload.tsx to upload-only (no schema/run steps)
- [x] Delete Dashboard.tsx, Documents.tsx, RunsList.tsx from disk
- [x] Add redirects for old flat routes in router.tsx (`LegacyDocumentRedirect`, `LegacyRunRedirect`)
- [x] Add Mantine Breadcrumbs to all project-scoped pages (`AppBreadcrumbs` component)
- [x] Validate route projectId matches entity's project_id (DocumentDetail, RunDetail redirect on mismatch)
- [x] Migration 011: `delete_document`, `delete_run`, `cancel_run`, `delete_project`, `delete_schema` RPCs
- [x] Document deletion (RPC cascade + confirmation modal)
- [x] Run deletion / cancellation (cancel releases claimed blocks + sets status)
- [x] Schema deletion (FK guard â€” fails if runs reference it)
- [x] Project deletion (cascade all children via `delete_project` RPC, strong confirmation UI)
- [ ] Storage cleanup on document delete (deferred â€” orphaned files are harmless, batch cleanup later)

### Phase 4 â€” Grid & Toolbar âœ… (completed 2026-02-10)
- [x] Merge DocumentDetail header into single dense bar (title + status + metadata + actions in one row)
- [x] Grid fills remaining viewport (`calc(100vh - 230px)`)
- [x] Pagination moves inside grid container (flex column layout)
- [x] RunSelector retained as Apply Schema control (existing component works well)
- [x] View mode toggle: Compact / Comfortable (row density), persists to localStorage
- [x] Column visibility menu (checkbox menu via Mantine Menu, toggles per column)
- [x] Block type filter (MultiSelect, filters rowData before passing to AG Grid)

### Phase 5 â€” Multi-File Upload âœ… (completed 2026-02-10)
- [x] Replace FileInput with Mantine Dropzone-style drag/drop uploader (max 10 files)
- [x] Parallel ingest calls with per-file status display
- [x] Migration: add `documents_v2` to Realtime publication
- [x] ProjectDetail: live document status (Realtime subscription)

### Phase 5B â€” Project-Level Bulk Operations âœ… (completed 2026-02-10)
- [x] "Apply Schema to All Documents" button on ProjectDetail
- [x] "Run All Pending" with concurrent worker dispatch across project
- [x] "Confirm All" project-wide bulk confirm
- [x] "Export All (ZIP)" (one JSONL per document)
- [x] Project-level aggregate progress dashboard (confirmed/staged/pending/failed)

### Phase 6 â€” Review & Confirm UX âœ… (completed 2026-02-10)
- [x] Grid: visual indicator for staged vs confirmed cells
- [x] Grid: inline editing of staged overlay values
- [x] Toolbar: "Confirm All Staged" bulk action
- [x] Per-block accept/reject controls
- [x] Export: filter by confirmation status
- [x] Wire confirmation path through RPC (no direct client writes to confirmed column)

### Phase 7 â€” Export & Reconstruction
- [ ] Enhanced export options (confirmed only, all, CSV, per-doc)
- [ ] `reconstruct` edge function (mdast track, reads confirmed `revised_content`)
- [ ] Download reconstructed markdown from DocumentDetail toolbar

### Phase 8 â€” Integrations
- [ ] Integrations page (`/app/integrations`) with card layout
- [ ] Neo4j: connection config + field mapping + push confirmed overlays
- [ ] Webhook: URL config + trigger on run confirmation
- [ ] DuckDB/Parquet: columnar export of confirmed data

### Phase 9 â€” Polish
- [ ] Fix GCP conversion service 403 (unblock Docling track)
- [ ] Code-splitting (React.lazy, AG Grid chunk)
- [ ] Testing framework (Vitest + RTL) + initial test suite
- [ ] React Error Boundary + Realtime reconnection
- [ ] CI/CD (GitHub Actions: lint, typecheck, build)
- [ ] Auth lifecycle: email confirmation, forgot password, OAuth providers
- [ ] Account settings page
- [ ] Security audit (CSP, rate limiting, session expiry)

<!-- END SOURCE: dev-todos\0209-unified-remaining-work.md -->


---

<!-- BEGIN SOURCE: dev-todos\0212-priority7-schema-contracts-master-spec.md -->

# Priority 7 Master Contracts - Schema Creation, Templates, and Save Semantics

**Date:** 2026-02-12  
**Status:** Canonical implementation contract for Priority 7  
**Authority:** Primary execution contract for Priority 7 route/pipeline/save/evidence decisions; deeper reference docs remain valid where explicitly cited in this document:

- `docs/ongoing-tasks/meta-configurator-integration/spec.md`
- `docs/ongoing-tasks/meta-configurator-integration/status.md`
- `docs/ongoing-tasks/0210-schema-wizard-and-ai-requirements.md`

Those documents remain reference inputs and history; this document is the default tie-breaker for Priority 7 execution decisions unless a section here explicitly delegates to a source section.

---

## 1) Purpose

This document defines exact contracts for how schema creation must operate in Priority 7:

1. wizard-first creation path,
2. template-based starting path,
3. existing-schema fork path,
4. upload-JSON path,
5. advanced-editor escape hatch,
6. single persistence boundary (`POST /schemas`),
7. worker/grid compatibility expectations.

Goal: eliminate implementation ambiguity and prevent rework.

---

## 2) Scope Boundary (Gate-Critical vs Deferred)

### 2.1 Priority 7 gate-critical scope

Required for Priority 7 pass:

1. Wizard-first manual creation is operational.
2. Advanced editor remains operational with fork-by-default save semantics.
3. Save/idempotency/conflict behavior is deterministic and recoverable.
4. Wizard-created schemas are worker/grid compatible via top-level `properties` + optional `prompt_config`.
5. Happy-path and conflict-path evidence is recorded.

### 2.2 Not required for Priority 7 pass

Allowed but not required in this gate:

1. Full template gallery rollout.
2. Dedicated `/app/schemas/apply` route.
3. Schema Co-Pilot (`schema-assist`) implementation.
4. Template admin/moderation/CMS workflows.

---

## 3) Non-Negotiables

1. Schema creation is wizard-first and visual-first.
2. Advanced editor is escape hatch, not default path.
3. All creation branches converge on one save boundary: `POST /schemas`.
4. Edit behavior defaults to fork (save as new schema artifact).
5. Worker/grid compatibility in v0 is defined by top-level `properties` (plus optional `prompt_config`).
6. Conflict behavior must surface explicit, recoverable `409` rename flow.

---

## 4) Canonical Terms

- `schema_ref`: user-facing slug identifier (owner-scoped).
- `schema_uid`: deterministic content hash of canonicalized schema JSON.
- `schema_jsonb`: stored schema artifact JSON.
- `prompt_config`: optional schema-level worker instruction and model controls.
- `run`: binding of `conv_uid` + `schema_id` in `runs_v2`.
- `overlay`: per-block mutable output for a run.

---

## 5) System Requirements List (SRL)

SRL-1. Users can create a schema without writing JSON.  
SRL-2. Users can edit full schema JSON via power-user escape hatch.  
SRL-3. Saved schemas persist with stable `schema_ref` and deterministic `schema_uid`.  
SRL-4. Save is idempotent on identical `(owner_id, schema_ref, schema_uid)` submissions; owner-scoped `schema_ref` and `schema_uid` uniqueness conflicts are explicit and recoverable.  
SRL-5. Editing defaults to fork (new schema artifact), not in-place mutation of in-use schema.  
SRL-6. Wizard-created schemas are compatible with current worker/grid contract.  
SRL-7. Grid columns derive from schema and display staged/confirmed overlays correctly.  
SRL-8. Platform-provided schema assistance, when added, is isolated from user API key pathways.  
SRL-9. Advanced editor embed remains compatible with host app styling and lifecycle.

---

## 6) SRL Traceability Map

| SRL | Implemented By | Verification |
|---|---|---|
| SRL-1 | Wizard route + field editor contracts (Sections 12, 13) | Wizard create-save proof (Section 22) |
| SRL-2 | Advanced editor route + mount/save contract (Sections 15, 16) | Advanced save proof (Section 22) |
| SRL-3 | Save boundary + hash derivation (Sections 9, 10) | Save response and list evidence |
| SRL-4 | `POST /schemas` conflict semantics (Section 10) | `409` tests (`schema_ref` and `schema_uid`) + rename retry proof |
| SRL-5 | Fork-by-default for wizard/advanced edit (Sections 7.3, 16) | Existing-schema fork evidence |
| SRL-6 | Wizard compatibility enforcement (Section 12) | Run/grid compatibility evidence |
| SRL-7 | Grid display/edit/review semantics (Section 18) | Run detail + grid output check |
| SRL-8 | Out-of-scope and boundary lock (Sections 2.2, 19) | No user-key dependency in P7 flow |
| SRL-9 | Embed API/lifecycle/theming contract (Section 15) | Advanced editor lifecycle check |

---

## 7) Data Model Contracts

### 7.1 `schemas` table contract

`schemas` is the source of truth for schema artifacts:

1. `schema_id` UUID primary key.
2. `owner_id` UUID not null.
3. `schema_ref` text not null, owner-scoped unique.
4. `schema_uid` text not null (deterministic content hash), owner-scoped unique.
5. `schema_jsonb` JSONB not null (opaque payload to DB).

### 7.2 `schema_ref` format contract

Format: `^[a-z0-9][a-z0-9_-]{0,63}$`

### 7.3 Provenance contract

Runs reference `schema_id`; therefore edit defaults to fork to preserve run-time lineage.

### 7.4 Deletion contract

Schema deletion is available via `delete_schema` RPC. It succeeds only when the schema has zero referencing rows in `runs_v2`; the RPC fails if any run references the schema. The schemas list page already implements this with a confirmation dialog warning "This will fail if any runs reference it."

### 7.5 Uniqueness constraints (exact)

Database constraints enforce both:

1. `unique (owner_id, schema_ref)`
2. `unique (owner_id, schema_uid)`
3. `schema_uid` must match `^[0-9a-f]{64}$` (sha256 hex)

This means:

1. Different users may have identical `schema_uid` values (same content, different owners).
2. The same user cannot create two schema rows with identical content hash (same `schema_uid`), even under different `schema_ref` slugs.
3. Conflict detection (`409`) can be triggered by either unique key (`owner_id + schema_ref` or `owner_id + schema_uid`).
4. Duplicate `(owner_id, schema_uid)` submissions should be treated as idempotent-by-content at the UX layer (link user back to the existing schema row), even if the current API response is a generic duplicate/409.

---

## 8) Current Runtime Baseline (Must Be Preserved)

Already implemented and must not regress:

1. `POST /schemas` edge function with deterministic hashing and idempotency/conflict behavior.
2. Advanced editor routes:
   - `/app/schemas/advanced`
   - `/app/schemas/advanced/:schemaId`
3. Advanced editor save defaults to fork and handles `409` with rename guidance.
4. New schema workflow routes are wired:
   - `/app/schemas/start`
   - `/app/schemas/wizard`
   - `/app/schemas/templates`
   - `/app/schemas/templates/:templateId`
   - `/app/schemas/apply`
5. Wizard manual 5-step flow exists with save through `POST /schemas` and `409` handling.
6. Existing-schema fork prefill and template prefill paths are wired into wizard flow.
7. Template registry + template gallery/detail scaffold exists (Phase 2-capable surface).

Confirmed remaining gaps to close for P7 gate:

1. Upload JSON classifier path is not implemented end-to-end yet (Path D currently routes to wizard shell without parser/classifier behavior).
2. Wizard authoring parity gaps:
   - nullable union toggle (`type: ["...","null"]`) authoring control,
   - nested object property authoring parity,
   - explicit compatibility pass/warn result in preview step.
3. In-wizard JSON escape hatch contract is not yet implemented as specified in Section 13.6.
4. Section 22.1 gate evidence capture is still incomplete.

---

## 9) Persistence Boundary (Single Save Contract)

All branches save through `POST /schemas` only.

No alternate schema-persistence endpoint is permitted in Priority 7.

---

## 10) `POST /schemas` API Contract

### 10.1 Method

`POST` only.

### 10.2 Accepted payloads

1. `multipart/form-data`
   - `schema_ref` optional
   - `schema` file required
2. `application/json`
   - raw schema object
   - or `{ schema_ref, schema_json }`

### 10.3 Runtime status semantics (current implementation truth)

1. `200` create success.
2. `200` idempotent success when same `schema_ref` + same `schema_uid`.
3. `409` conflict when same `schema_ref` + different `schema_uid`.
4. `409` conflict when same owner submits an existing `schema_uid` under a different `schema_ref`.
5. `400` invalid payload (including non-object schema JSON).
6. `405` wrong method.

### 10.4 `schema_ref` derivation when not provided

1. use `$id` tail if present;
2. else use `title`;
3. else fallback `"schema"`;
4. slugify:
   - lowercase
   - invalid chars -> `_`
   - trim leading/trailing `_`
   - collapse repeated `_`
   - truncate to 64 chars.

### 10.5 `schema_uid` derivation

1. canonicalize by recursively sorting object keys;
2. keep array order unchanged;
3. hash canonical JSON bytes with SHA-256 hex.

---

## 11) Route and IA Contracts

### 11.1 Existing routes (kept)

1. `/app/schemas`
2. `/app/schemas/advanced`
3. `/app/schemas/advanced/:schemaId`

### 11.2 New routes (Priority 7 design set)

1. `/app/schemas/start` (mode chooser)
2. `/app/schemas/wizard` (wizard create/edit)
3. `/app/schemas/templates` (template gallery, optional in P7 gate)
4. `/app/schemas/templates/:templateId` (template detail, optional in P7 gate)
5. `/app/schemas/apply` (optional post-save apply flow)

### 11.3 Global menu contract (left rail)

Priority 7 keeps `Schemas` as the main entry and may expose a dedicated `Schema Library` menu item when template browsing is promoted as a first-class path.

1. Keep `Schemas` -> `/app/schemas` as the primary schema workflow entry.
2. When template path is surfaced in global nav, add `Schema Library` -> `/app/schemas/templates`.
3. Active-state behavior must avoid double-highlight:
   - `Schema Library` active for `/app/schemas/templates*`
   - `Schemas` active for other `/app/schemas*` paths.

### 11.4 Local sub-menu contract (schema workflow)

Schema sub-navigation is local to the schema area (page-level nav/tabs/segmented control), not global left-rail expansion.

1. Required local entries in P7 core:
   - `Start` -> `/app/schemas/start`
   - `Wizard` -> `/app/schemas/wizard`
   - `Advanced` -> `/app/schemas/advanced`
2. Optional local entries (only when shipped):
   - `Templates` -> `/app/schemas/templates`
   - `Apply` -> `/app/schemas/apply`
3. Entry/exit rules:
   - `Create schema` from `/app/schemas` opens `/app/schemas/start`.
   - `Advanced editor` from `/app/schemas` opens `/app/schemas/advanced`.
   - `Back to list` from subflows returns `/app/schemas`.

---

## 12) Wizard Output Contract (Strict)

### 12.1 Wizard must enforce top-level compatibility

Generated `schema_jsonb` must include:

1. `type: "object"`
2. `properties: Record<string, JSONSchemaFragment>`
3. optional `required: string[]`
4. optional `additionalProperties` (default false)
5. optional `$id`, `title`, `description`
6. optional `prompt_config`

### 12.2 Supported JSON Schema subset for visual authoring

Per field supported subset:

1. Common:
   - `type`
   - `description`
   - `enum`
   - `default`
2. String:
   - `minLength`
   - `maxLength`
   - `pattern`
   - `format`
3. Number/integer:
   - `minimum`
   - `maximum`
   - `multipleOf`
4. Array:
   - `items` (single schema)
   - `minItems`
   - `maxItems`
5. Object:
   - `properties`
   - `required`
   - `additionalProperties`
6. Nullable:
   - union style `type: ["string", "null"]` (and equivalents)

### 12.3 Prompt config subset

`prompt_config` optional keys:

1. `system_instructions`
2. `per_block_prompt`
3. `model`
4. `temperature`
5. `max_tokens_per_block`
6. `max_batch_size` (allowed in schema artifact; runtime usage may differ by current worker policy stack)

---

## 13) Wizard Step UX Contracts (Exact)

Wizard steps are a recommended order, not a hard linear lock. Users may jump between steps; save action performs cross-step validation and routes users back to the step requiring correction.

### 13.1 Step 1 - Intent

Required:

1. Textbox: "What do you want to extract or annotate?" (free-text intent string).

Optional:

1. Sample document selector (selects a `conv_uid`) to power preview and AI assistance (when available).
2. Source metadata carried forward from branch controller (`template_id`, `schema_id`, `upload_name`).

### 13.2 Step 2 - Fields (Visual Editor)

Visual field editor is the primary authoring surface; live JSON preview is secondary.

Per-field controls:

1. `key` (required; must be unique within schema).
2. `type` (required; from supported subset in Section 12.2).
3. `description` (recommended; treated as per-field instruction prompt for worker).
4. `required` toggle.
5. Type-specific constraints:
   - enum: allowed values list.
   - string: `minLength`, `maxLength`, `pattern`, `format`.
   - number/integer: `minimum`, `maximum`, `multipleOf`.
   - array: `items` schema, `minItems`, `maxItems`.
   - object: nested `properties`, `required`, `additionalProperties`.
   - nullable: `type: ["string", "null"]` union toggle.

Field reordering (drag or move controls) is recommended but not gate-critical.

### 13.3 Step 3 - Prompt Config (Optional)

Controls:

1. `system_instructions` (textarea).
2. `per_block_prompt` (textarea).
3. Advanced section (collapsed by default):
   - `model` (dropdown).
   - `temperature` (slider/input).
   - `max_tokens_per_block` (input).

User may leave this step entirely blank; schema is valid for manual annotation without prompt config.

### 13.4 Step 4 - Preview

Must show:

1. Column header mock derived from top-level `properties` keys and types.
2. Full schema JSON preview (read-only).
3. Compatibility result: pass/warn based on Section 12.1 rules.

If sample `conv_uid` was selected in Step 1:

4. Show 1-3 sample blocks (read-only) beside the predicted column set.

AI-powered preview (run schema against sample blocks) is deferred to post-P7.

### 13.5 Step 5 - Save

Must show:

1. `schema_ref` slug input with format enforcement (`^[a-z0-9][a-z0-9_-]{0,63}$`).
2. Inline conflict guidance (if `409` is returned, show existing vs incoming and focus rename input).
3. Post-save choices:
   - return to schemas list.
   - continue to apply flow (if `/app/schemas/apply` is implemented).

### 13.6 JSON Escape Hatch (Within Wizard)

The wizard includes a JSON tab/editor that directly edits `schema_jsonb`:

1. If JSON is invalid: wizard blocks "Next" and "Save" and shows parse errors.
2. If JSON is valid but contains constructs outside the wizard's supported subset (Section 12.2): wizard preserves unknown keys intact but may disable the visual editor for unsupported parts.
3. Switching back to visual view after manual JSON edits must not silently drop unknown keys.

---

## 14) Branch Controller Contract (`/app/schemas/start`)

User chooses one mode:

1. Browse Templates
2. From Existing Schema
3. Start from Scratch
4. Upload JSON
5. Advanced Editor

All branches must converge to Section 10 save semantics.

---

## 15) Advanced Editor Embed Contract (No Drift)

### 15.1 Asset contract

Load:

1. `/meta-configurator-embed/meta-configurator-embed.css`
2. `/meta-configurator-embed/meta-configurator-embed.js`

### 15.2 Global mount contract

`window.MetaConfiguratorEmbed.mountSchemaEditor(el, { initialSchema, onChange })`

Must return:

1. `getSchemaJson()`
2. `setSchemaJson(schemaJson)`
3. `destroy()`

Host must call `destroy()` on unmount/navigation.

### 15.3 Styling/theming contract

1. No global CSS reset/preflight that breaks host app.
2. Advanced editor may differ visually but must support host dark/light mode behavior and host color-token control.

### 15.4 Persistence contract

Embed is editor-only; host performs schema persistence via `POST /schemas`.

---

## 16) Branch Pipeline Contracts (A-E)

### 16.1 Path A - Templates (optional for P7 gate)

1. Start chooser -> templates gallery.
2. Category filter + paginated cards.
3. Template detail (route or layer).
4. Apply -> wizard prefilled.
5. Save via `POST /schemas`.
6. End: user-owned saved schema.

### 16.2 Path B - Existing schema fork

1. Start chooser -> existing schema picker (user-owned only).
2. Default new ref suggestion `<old>_v2`.
3. Open in wizard prefilled or advanced prefilled.
4. Save via `POST /schemas`.
5. End: new schema artifact; original untouched.

### 16.3 Path C - Scratch wizard

1. Start chooser -> wizard scratch.
2. Step-by-step flow per Section 13: Intent -> Fields -> Prompt Config -> Preview -> Save.
3. Save via `POST /schemas`.
4. End: new schema artifact.

### 16.4 Path D - Upload JSON

1. Start chooser -> upload file.
2. Parse/classify:
   - invalid -> blocking error
   - compatible -> wizard prefill
   - advanced -> advanced editor prefill
3. Save via `POST /schemas`.
4. End: imported schema artifact.

### 16.5 Path E - Advanced editor direct

1. Start chooser -> advanced route.
2. Edit with compatibility warnings.
3. Save via `POST /schemas`.
4. End: saved artifact.

---

## 17) Template Data Contract (Optional P7, Required for Template Path)

`SchemaTemplate` (proposed contract for Phase 2):

```ts
type SchemaTemplate = {
  template_id: string;
  template_version: string;
  name: string;
  category: string;
  description: string;
  use_case_tags: string[];
  schema_json_seed: Record<string, unknown>;
  preview: {
    fields: Array<{ key: string; type: string; description?: string }>;
    use_case: string;
  };
};
```

Template ownership rule:

1. templates are read-only seeds;
2. applying a template always produces user-owned schema artifact via `POST /schemas`.

---

## 18) Grid Display, Edit, and Review Semantics Contract

### 18.1 Column derivation

For a selected run, derive overlay columns from `schemas.schema_jsonb.properties` keys (via `extractSchemaFields` in `web/src/lib/schema-fields.ts`).

Legacy note: the grid falls back to `schema_jsonb.fields` when `properties` is absent. This is legacy behavior; the wizard MUST output `properties` (not `fields`). The `fields` fallback exists for backward compatibility with older hand-authored schemas.

### 18.2 Value selection per overlay status

1. `status === 'confirmed'` -> display `overlay_jsonb_confirmed[k]`.
2. `status === 'ai_complete'` -> display `overlay_jsonb_staging[k]`.
3. any other status (`pending`, `claimed`, `failed`) -> blank/null.

### 18.3 Cell editing

1. Cells are editable only when `overlay.status === 'ai_complete'` (staged).
2. Edits write to `overlay_jsonb_staging` via `update_overlay_staging` RPC.
3. Type-aware value parsing (number, boolean, array/object JSON) is applied before write.

### 18.4 Review actions (existing implementation)

Per-block actions (available when `status === 'ai_complete'`):

1. **Confirm**: moves overlay from staged to confirmed via `confirm_overlays` RPC (copies staging -> confirmed).
2. **Reject to pending**: reverts overlay to `pending` via `reject_overlays_to_pending` RPC (clears staged data, block returns to worker queue).

Bulk actions:

3. **Confirm All Staged**: confirms all `ai_complete` overlays in the run in one call via `confirm_overlays` RPC (no `p_block_uids` argument = all staged).

### 18.5 Degradation when `properties` is missing

If `schema_jsonb.properties` is absent or not an object, the grid falls back to legacy `schema_jsonb.fields` if present and valid (Section 18.1). If neither `properties` nor legacy `fields` is a valid object, no overlay columns are derived. The grid still shows immutable block columns; overlay data columns are simply absent. This must be warned during authoring (Sections 12.1, 15).

---

## 19) AI Assistance Boundary Contract (Not in P7 Gate)

`schema-assist` and schema copilot are deferred.

If later implemented:

1. proposals only (never auto-save),
2. must preserve compatibility rules,
3. must remain isolated from user-key run-processing path.

---

## 20) Security and Ownership Contracts

1. schema flows require authenticated user.
2. user sees only own schemas in existing-schema picker.
3. template catalog is non-mutating from normal user flow.
4. save calls are host-controlled, including advanced editor flow.

---

## 21) Key File Map (Implementation Immersion)

Backend:

1. `supabase/functions/schemas/index.ts`

Frontend current:

1. `web/src/pages/Schemas.tsx`
2. `web/src/pages/SchemaAdvancedEditor.tsx`
3. `web/src/lib/metaConfiguratorEmbed.ts`
4. `web/src/lib/schema-fields.ts`
5. `web/src/components/blocks/BlockViewerGrid.tsx`
6. `web/src/router.tsx`
7. `web/src/pages/SchemaStart.tsx`
8. `web/src/pages/SchemaWizard.tsx`
9. `web/src/pages/SchemaTemplates.tsx`
10. `web/src/pages/SchemaTemplateDetail.tsx`
11. `web/src/components/schemas/SchemaWorkflowNav.tsx`
12. `web/src/lib/schemaTemplates.ts`
13. `web/src/components/shell/nav-config.ts`
14. `web/src/components/shell/LeftRail.tsx`

Primary reference docs:

1. `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
2. `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`
3. `docs/ongoing-tasks/meta-configurator-integration/status.md`

---

## 22) Priority 7 Evidence Matrix

### 22.1 Gate-required evidence

1. scratch wizard save works (new schema listed).
2. existing-schema fork save works (new schema; source unchanged).
3. advanced editor save path remains working.
4. explicit conflict behavior:
   - `409` on same ref + different content
   - `409` on same owner + same content hash (`schema_uid`) under different ref
   - rename and retry success
   - idempotent `200` on same ref + same content
5. run/grid compatibility:
   - run created with wizard schema
   - grid columns from `properties`
   - staged/confirmed display behavior preserved.

### 22.2 Optional evidence (if template path shipped)

1. template apply -> wizard prefill -> save.
2. template-derived schema appears as user-owned artifact.

---

## 23) Implementation Phasing

### Phase 1 - Priority 7 gate closure

1. Upload classifier (Path D): parse `.json`, classify wizard-compatible vs advanced-required, then route deterministically.
2. Wizard nullable toggle support: allow authoring `type: ["<base>", "null"]` for supported base types.
3. Preview compatibility indicator: explicit pass/warn result against Section 12.1 rules in Step 4.
4. Nested object authoring parity: support nested `properties` in wizard subset or explicitly route unsupported nested structures to advanced editor with non-destructive preservation warning.
5. In-wizard JSON escape hatch: JSON tab with parse/error gating and unknown-key preservation per Section 13.6.
6. Re-verify existing fork + template prefill paths after steps 1-5.
7. Capture Section 22.1 evidence artifacts (scratch save, fork save, conflict cases, run/grid compatibility).
8. Update Priority 7 gate tracker and ledger only after evidence is reproducible.

### Phase 2 - Template path

1. template registry module
2. templates gallery + detail
3. apply -> wizard prefill
4. capture Section 22.2 evidence

### Phase 3 - Post-P7 extensions

1. schema-assist copilot
2. template admin lifecycle
3. deeper schema lineage/version UX

---

## 24) Out of Scope (Priority 7)

1. replacing internal embed widget stack,
2. template CMS workflows,
3. in-place mutation flow for referenced schema artifacts,
4. any assistant/KG/vector/MCP work.

---

## 25) Final Contract Summary

Priority 7 is successful when:

1. non-technical users can create compatible schemas in wizard-first flow,
2. power users retain advanced editor escape hatch,
3. all creation branches share deterministic `POST /schemas` behavior,
4. conflict/fork behavior is explicit and recoverable,
5. saved schemas reliably flow into run + grid behavior via top-level `properties`.

<!-- END SOURCE: dev-todos\0212-priority7-schema-contracts-master-spec.md -->


---

<!-- BEGIN SOURCE: dev-todos\0212-schema-library-and-assistant-future-task.md -->

# Future Task: Schema Library + AI Assistant for User-Defined Schemas

**Filed:** 2026-02-12  
**Status:** Future task (not in current execution queue)  
**Type:** Product-spec direction (prescriptive)

---

## Why this exists

User-defined schemas are powerful but still high-friction when users start from a blank page.

The target experience is:
1. Start from a curated schema library for common use cases.
2. Use an AI assistant to adapt that starting schema to the user's project and documents.
3. Save as a project-owned schema copy that is safe to customize.

This turns schema design from "author from scratch" into "select + adapt + validate".

---

## North-star behavior

On the Schemas workflow, users can:

1. Browse a **Schema Library** of pre-defined templates.
2. Open each template and view:
   - purpose and best-fit use cases,
   - field-by-field explanation,
   - sample output shape,
   - constraints and notes.
3. Choose one of two apply actions:
   - **Apply to existing project**
   - **Apply to new project**
4. Launch an **AI assistant** to adapt the selected schema:
   - propose field edits/additions/removals,
   - draft or refine prompt config,
   - explain tradeoffs in plain language.
5. Save the result as a project schema and run it.

---

## Critical product rules

1. **Library templates are read-only canonical assets.**
2. **Apply always creates a project-owned copy** (no in-place mutation of the library template).
3. **Version identity is explicit** for templates and project copies.
4. **Assistant suggestions are never auto-final**; user confirms changes before save.
5. **Schema contract remains compatible** with current `schema_ref` + schema artifact model.

---

## Template contract (minimum)

Each library template should include:

- `template_id` (stable ID)
- `template_version`
- human-readable `name`
- `description`
- `use_case_tags` (for discovery/filtering)
- schema payload (fields + optional prompt config)
- explanation metadata (field rationale, expected output examples)

Library templates should be indexable by tags such as legal, compliance, research, writing, contracts, and QA.

---

## AI assistant responsibilities

Assistant should support:

1. **Intent-to-schema adaptation**
   - "Adjust this template for X domain and Y output requirements."
2. **Field-level coaching**
   - explain each field and suggested type choices.
3. **Prompt config support**
   - draft system/per-block prompts aligned to selected fields.
4. **Validation support**
   - flag unclear fields, overlaps, or overly broad definitions.

Assistant should not silently alter canonical library assets.

---

## Suggested rollout (when scheduled)

### Phase 1: Library foundation (no assistant required)
- Template registry + browse/filter UI
- Template detail page with explanation and examples
- Apply-to-project / apply-to-new-project copy flow

### Phase 2: Assistant-assisted adaptation
- In-schema assistant panel for edits and guidance
- Prompt config drafting and refinement assistance
- Change preview + user approval before save

### Phase 3: Advanced intelligence
- Recommendation ranking by project/document profile
- "Closest template" auto-suggestions
- Template performance feedback loop

---

## Acceptance criteria

This future task is complete when:

1. Users can discover and apply templates without authoring raw JSON.
2. Applied templates become editable project-owned schemas.
3. Assistant materially reduces time to first usable schema.
4. Template lineage/version is auditable from applied schema back to source template.
5. Existing schema execution pipeline works unchanged with applied/adapted schemas.

---

## Dependencies and timing note

This should be scheduled after core workflow gates that stabilize:
- schema creation and save flow,
- worker/run reliability,
- review/export baseline.

It is intentionally defined now so the decision is persistent and implementation-ready when prioritization opens.

<!-- END SOURCE: dev-todos\0212-schema-library-and-assistant-future-task.md -->


---

<!-- BEGIN SOURCE: dev-todos\0213-consolidated-remaining-actions.md -->

# Consolidated Remaining Actions (0213 P4 + 0209)

**Date:** 2026-02-13  
**Status:** Active consolidated backlog  
**Authority:** Single tracking doc for remaining actions migrated from:
- `dev-todos/complete/0213-ingest-tracks-pandoc-and-representation-artifacts-plan.md` (Phase 4 + open blockers)
- `dev-todos/0209-unified-remaining-work.md` (unchecked checklist items)

---

## 1) Scope

This doc consolidates only the remaining actions explicitly requested for migration:

1. Deferred Phase 4 actions from the 0213 ingest-tracks plan.
2. Unchecked items from the 0209 unified remaining-work checklist.

Notes:

1. 0209 was last verified on 2026-02-10, so some items require revalidation before execution.
2. 0213 remains the evidence record for implemented Phases 1-3 and 5.

---

## 2) Migrated From 0213 (Phase 4 + Open Follow-ups)

### 2.1 Phase 4 - Downstream adapter bootstrap (deferred)

- [ ] Define adapter interface and profile versioning.
- [ ] Build one deterministic reference adapter (`docling -> KG flatten v1`).
- [ ] Add deterministic output tests for adapter outputs.

### 2.2 Open follow-up actions from 0213 blockers

- [ ] Pin Pandoc package version in `services/conversion-service/Dockerfile` (avoid AST drift from package updates).
- [ ] Review temporary runtime rollout policy state (`upload.track_enabled.pandoc`, `upload.allowed_extensions`) and lock intended production values.

---

## 3) Migrated From 0209 (Unchecked Checklist Items)

### 3.1 Worker and runtime validation

- [ ] Document `prompt_config` convention in schema spec.
- [ ] Confirm `ANTHROPIC_API_KEY` is configured in deployed Supabase secrets for live worker usage.
- [ ] Verify concurrent worker invocations do not double-process blocks.
- [ ] Verify end-to-end run flow: create run -> worker execution -> overlays reach `ai_complete` -> run rollup updates.
- [ ] Add storage cleanup for document delete path (or formalize deferred policy + cleanup job).

### 3.2 Export and reconstruction

- [ ] Implement enhanced export variants (confirmed only, all, CSV, per-document).
- [ ] Implement `reconstruct` edge function (mdast track, uses confirmed `revised_content`).
- [ ] Add reconstructed markdown download action in `DocumentDetail` toolbar.

### 3.3 Integrations

- [ ] Build integrations page (`/app/integrations`) with integration cards.
- [ ] Implement Neo4j integration (connection config + field mapping + confirmed overlay push).
- [ ] Implement webhook integration (URL config + trigger on run confirmation).
- [ ] Implement DuckDB/Parquet export integration.

### 3.4 Platform hardening and ops

- [ ] Revalidate and fix conversion service access-policy issue from 0209 (`Cloud Run 403`) if still present in current environment.
- [ ] Add code splitting (`React.lazy`, AG Grid chunk isolation).
- [ ] Add testing baseline (Vitest + RTL + initial suite).
- [ ] Add React error boundary and realtime reconnection handling.
- [ ] Add CI/CD baseline (lint, typecheck, build).
- [ ] Complete auth lifecycle features (email confirmation, password reset, OAuth providers).
- [ ] Add account settings page for lifecycle/admin user controls.
- [ ] Complete security hardening pass (CSP, rate limiting, session expiry handling).

---

## 4) Recommended Execution Order

1. Immediate hardening:
`Pandoc version pin`, `runtime policy lock`, worker concurrency/E2E verification.
2. Core product value:
`Export variants` + `reconstruct` flow.
3. Platform expansion:
Integrations.
4. Ops polish:
Testing, CI/CD, auth lifecycle, security hardening.

---

## 5) Source Migration Notes

1. Keep historical detail in source docs.
2. Track open work updates in this file only.
3. When an item is completed, update here first, then back-reference in evidence docs if needed.


<!-- END SOURCE: dev-todos\0213-consolidated-remaining-actions.md -->


