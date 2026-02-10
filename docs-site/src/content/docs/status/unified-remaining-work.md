---
title: Unified Remaining Work
description: Consolidated production-readiness plan across database foundations, worker architecture, frontend workflows, and deployment.
sidebar:
  order: 1
---

**Date:** 2026-02-09
**Last verified (repo):** 2026-02-10
**Scope:** Everything between current state and production-ready platform
**Sources consolidated:** `0209-projects-hierarchy-plan-review.md`, `0209-grid-toolbar-and-layout-plan.md`, `web-frontend-buildout-checklist.md`, session discussions on staging layer / editing track / AI worker

---

## Current State Snapshot

**What works end-to-end today:**
- Auth (login, register, session, sign-out)
- Multi-file upload (up to 10 files per batch) with drag/drop + per-file status badges
- Schema registration (JSON upload, SHA256 dedup)
- Run creation (generates pending overlay rows per block)
- AG Grid viewer with dynamic schema columns, real-time overlay updates, pagination
- Export JSONL (canonical v3.0 shape: `{ immutable, user_defined }`)
- Projects hierarchy (create project → upload within project → scoped navigation)
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
- No document reconstruction — no way to get a revised document back
- Non-Markdown conversion (Docling track) blocked by Cloud Run access policy (403 per status doc) — DOCX/PDF uploads stall at "converting"

---

## Phase 1 — Database & Architecture Foundations

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
- User confirm action copies `overlay_jsonb_staging` → `overlay_jsonb_confirmed`, stamps `confirmed_at` + `confirmed_by`
- Export reads ONLY `overlay_jsonb_confirmed`
- Grid shows `overlay_jsonb_staging` when reviewing (`ai_complete`), `overlay_jsonb_confirmed` when viewing final (`confirmed`)
- A bug or re-run can never overwrite confirmed data — only the explicit confirm action touches that column

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

Platform validates: is JSON object, has `schema_ref`. Everything else (including `prompt_config`) is opaque — the worker reads it, the platform doesn't enforce its shape.

For the editing track, schemas include a field like `revised_content` (string) alongside any metadata fields. No platform-level distinction between "extraction schema" and "editing schema" — the schema's fields determine the track implicitly.

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

## Phase 2 — AI Worker (Distributed Claim-Based Work Queue)

The single highest-impact missing piece. Blocks both extraction and editing tracks.

### 2.1 Architecture: stateless, concurrent, multi-provider

The worker is **not** a long-running daemon. It is a stateless HTTP function that processes one batch per invocation: claim → process → write → exit. The `block_overlays_v2` table IS the work queue. Run 1 instance or 20 — the behavior is identical because the claim is atomic.

**Why this matters:** A 77-document project with ~5,000 total blocks can be processed by 20 concurrent workers in ~5 minutes instead of 4 hours sequentially. The user watches the grid fill in real time.

**Concurrency model:**

| Workers | Time/block | 5,000 blocks wall clock |
|---|---|---|
| 1 (sequential) | ~3s | ~4 hours |
| 20 concurrent | ~3s | ~12 minutes |
| 50 concurrent | ~3s | ~5 minutes |

Workers can be: multiple invocations of the same edge function, different API keys, different providers (Anthropic + OpenAI), different model tiers (Opus for paragraphs, Haiku for headings). The database doesn't care — `claimed_by` records who processed each block.

### 2.2 Worker edge function: `supabase/functions/worker/index.ts`

**Trigger:** HTTP POST with `run_id` (and optional `batch_size`, `model_override`). Called by:
- User clicking "Run All Pending" (fires N concurrent invocations)
- Per-document "Run Pending" button
- Future: external dispatcher splitting ranges across API keys

**Flow per invocation:**

1. **Claim batch:** Atomically claim N pending overlays using `FOR UPDATE SKIP LOCKED` (valid Postgres pattern — `UPDATE...LIMIT` is not):
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
   `SKIP LOCKED` ensures concurrent workers never claim the same rows. If zero rows returned → nothing to do → exit 200.

2. **Load context:** For each claimed overlay:
   - Fetch `block_content` and `block_type` from `blocks_v2` via `block_uid`
   - Fetch `schema_jsonb` (including `prompt_config`) from `schemas` via run → schema join (cached per batch — same schema for every block in the run)

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
   - On LLM failure → `status = 'failed'`, `last_error = message`, `attempt_count += 1`
   - Each overlay is independent — partial batch success is normal
   - Failed overlays can be retried (re-claim where `status = 'failed' AND attempt_count < max`)

### 2.3 Dispatch strategies (future enhancement)

The worker function is dumb — it claims and processes. Intelligence lives in the **dispatcher** that decides how many workers to launch and how:

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

## Phase 3 — Frontend Cleanup

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
- `/app/documents/:sourceUid` → look up document's `project_id`, redirect to `/app/projects/:projectId/documents/:sourceUid`
- `/app/runs/:runId` → look up run's project via `conv_uid` → `documents_v2.project_id`, redirect
- `/app/upload` → redirect to `/app` (projects list)

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
- Edge function or RPC: cascade delete `block_overlays_v2` → `blocks_v2` → `documents_v2`
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
- Cascade: delete all runs → overlays → blocks → documents → project
- UI: delete button in ProjectDetail edit modal (with strong confirmation — "This will delete 77 documents and all associated data")

---

## Phase 4 — Grid Layout & Toolbar

Make the block viewer the production-quality working surface it needs to be.

### 4.1 Layout compression

Merge the 4 sections above the grid (back link + page header + metadata bar + grid toolbar) into **one dense horizontal bar** (~44px):

```
[<- Back] [Title] [md 38.8KB 28,947ch] [INGESTED] | [Apply Schema v] [View v] [Export v] [190 blocks] [100 v]
```

Left side: navigation + identity + metadata (as `xs`-sized text/badges).
Right side: action controls.
Overflow: secondary items collapse behind a three-dot `Menu` on narrow screens.

**Height savings:** ~256px above grid → ~116px. Grid goes from ~62% to ~80% of viewport.

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
- Click a run → grid shows its overlay columns
- "New run..." option at bottom → popover/modal to select schema + create run
- No run selected → grid shows immutable columns only

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

## Phase 5 — Multi-File Upload

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

## Phase 5B — Project-Level Bulk Operations

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
- **One JSONL per document** — downloads a zip of 77 `.jsonl` files (named by doc title)
- **One merged JSONL** — single file with all blocks across all documents (with `source_uid` for grouping)
- **CSV** — flat table for spreadsheet analysis

Only exports confirmed overlays.

### 5B.5 Project-level progress dashboard

ProjectDetail shows aggregate stats that update in real time:

```
┌─────────────────────────────────────────────────────────────┐
│  77 documents  │  5,012 blocks  │  Schema: spec_review_v1   │
│                                                              │
│  ████████████████████████░░░░░░  78%                        │
│  3,909 confirmed  │  982 staged  │  84 pending  │  37 failed│
└─────────────────────────────────────────────────────────────┘
```

This is the view that lets a user managing 77 documents feel confident they can see the whole picture without opening each document individually.

---

## Phase 6 — Review & Confirm UX (Staging Layer)

This is where both extraction and editing tracks converge. The user reviews AI output before it becomes permanent.

### 6.1 Grid staging indicators

When a run is selected and overlays are in `ai_complete` status:
- Schema field cells show the staged data with a visual indicator (subtle background tint, or small icon)
- A "Staged — awaiting review" banner appears above or below the toolbar
- Confirmed cells show normal styling (no indicator)

### 6.2 Inline editing of staged overlays

- Double-click a staged cell → edit the value
- Edits write back to `overlay_jsonb_staging` via Supabase update (never write to `overlay_jsonb_confirmed` directly)
- Cell renderers handle edit mode per data type (text input, select for enums, etc.)

### 6.3 Confirm/reject controls

**Per-block:** Checkbox column or action button per row to accept/reject individual blocks.

**Bulk:** Toolbar button "Confirm All Staged" → moves all `ai_complete` overlays to `confirmed`:
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
  - Copy `overlay_jsonb_staging` â†’ `overlay_jsonb_confirmed`
  - Set `status = 'confirmed'`
  - Stamp `confirmed_at`, `confirmed_by`

---

## Phase 7 — Export & Reconstruction

### 7.1 Enhanced export options

From the toolbar or ProjectDetail action bar:
- **Export JSONL (confirmed only)** — current canonical format, only confirmed overlays
- **Export JSONL (all including staged)** — includes `ai_complete` data, marked as unconfirmed
- **Export CSV** — flat table of block fields for spreadsheet use
- **Export per-document** — one file per document vs one file for entire project

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

**Scope:** mdast track only (markdown → markdown). Docling and Pandoc reconstruction are future work — depends on those parsers supporting round-trip serialization.

**Editing track schema convention:** Any schema intended for the editing track includes a `revised_content` (string) field. The reconstruction function looks for this specific field name. If the field doesn't exist in the schema, reconstruction is not available for that run.

---

## Phase 8 — Third-Party Integrations

### 8.1 Integrations page (`/app/integrations`)

Shows configured integration targets with connection status. Each integration is a card:
- **Neo4j** — push overlay data as nodes and edges
- **Webhook** — POST JSONL to a custom endpoint on run completion
- **DuckDB / Parquet** — export as Parquet for analytical queries

### 8.2 Neo4j integration

**Configuration flow:**
1. Connection: bolt URL, credentials, database name
2. Field mapping: which overlay fields become nodes, edges, properties
   - If schema has `graph_mapping` key → auto-mapped
   - If not → user maps via form (field → node label / edge type / property)
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

## Phase 9 — Infrastructure & Polish

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
- E2E: Playwright for upload → view → export flow

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
- OAuth providers (Google, GitHub — Supabase Auth config + UI buttons on Login page)
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
  ├── 1.1 staging + audit columns (Option A: overlay_jsonb_staging, overlay_jsonb_confirmed, confirmed_at/by)
  ├── 1.2 status enum expansion (add ai_complete, confirmed)
  ├── 1.3 prompt_config convention (documentation, no code)
  ├── 1.4 project_id NOT NULL
  └── 1.5 migration drift reconciliation
         │
Phase 2 (AI Worker) ← depends on 1.1, 1.2, 1.3
  ├── 2.1 stateless worker edge function (claim → LLM → write staged)
  ├── 2.2 concurrent multi-instance support (atomic claims, claimed_by provenance)
  ├── 2.3 dispatch strategies (simple → parallel fan-out → multi-key → model routing)
  ├── 2.4 worker configuration
  └── 2.5 API key management
         │
Phase 3 (Frontend cleanup) ← independent of Phase 2
  ├── 3.1 split Upload.tsx
  ├── 3.2 remove dead pages
  ├── 3.3 old-route redirects
  ├── 3.4 breadcrumbs
  ├── 3.5 route-entity membership check
  └── 3.6 deletion/lifecycle ops (doc, run, schema, project delete)
         │
Phase 4 (Grid & toolbar) ← independent of Phase 2
  ├── 4.1 layout compression
  ├── 4.2 grid fills viewport
  ├── 4.3 Apply Schema control
  ├── 4.4 view mode toggle
  ├── 4.5 column visibility
  └── 4.6 block type filter
         │
Phase 5 (Multi-file upload) ← depends on 3.1
  ├── 5.1 Dropzone
  ├── 5.2 parallel ingest
  └── 5.3 realtime doc status
         │
Phase 5B (Project-level bulk ops) ← depends on 2.1 + 4.3
  ├── 5B.1 "Apply Schema to All Documents"
  ├── 5B.2 "Run All Pending" (concurrent worker dispatch)
  ├── 5B.3 "Confirm All" (project-wide bulk confirm)
  ├── 5B.4 "Export All" (zip of JSONL or merged file)
  └── 5B.5 Project-level progress dashboard
         │
Phase 6 (Review & confirm UX) ← depends on 2.1 (needs AI output to review)
  ├── 6.1 grid staging indicators
  ├── 6.2 inline editing
  ├── 6.3 confirm/reject controls
  └── 6.4 export respects confirmation
         │
Phase 7 (Export & reconstruction) ← depends on 6.3 (needs confirmed data)
  ├── 7.1 enhanced export options
  └── 7.2 document reconstruction (mdast)
         │
Phase 8 (Integrations) ← depends on 6.3 (needs confirmed data)
  ├── 8.1 integrations page
  ├── 8.2 Neo4j
  ├── 8.3 webhook
  └── 8.4 DuckDB/Parquet
         │
Phase 9 (Polish) ← can start anytime, intensifies after Phase 6
  ├── 9.1 GCP conversion fix
  ├── 9.2 code-splitting
  ├── 9.3 testing
  ├── 9.4 error handling
  ├── 9.5 CI/CD
  ├── 9.6 auth/account lifecycle (email confirm, forgot password, OAuth)
  └── 9.7 security hardening
```

**Parallelism:** Phases 3 and 4 can run concurrently with Phase 2. Phase 5 can start as soon as 3.1 is done. Phase 9.1 (GCP fix) is independent of everything and should happen whenever possible.

**Critical path:** Phase 1 → Phase 2 → Phase 5B → Phase 6 → Phase 7/8. Everything else feeds into or runs alongside this path.

**The 77-doc use case flows through:** Phase 5 (bulk upload) → Phase 5B.1 (apply schema to all) → Phase 5B.2 (run all pending) → Phase 6 (review/confirm) → Phase 5B.3 (confirm all) → Phase 5B.4 (export all) → Phase 8 (push to Neo4j).

---

## Checklist (flat, for tracking)

### Phase 1 — DB & Architecture ✅ (completed 2026-02-10)
- [x] Migration 009: rename `overlay_jsonb` → `overlay_jsonb_confirmed`, add `overlay_jsonb_staging`, `confirmed_at`, `confirmed_by`
- [x] Migration 009: expand overlay status CHECK constraint (`pending | claimed | ai_complete | confirmed | failed`, dropped legacy `complete`)
- [x] Migration 009: RLS UPDATE policy for overlay owners (run ownership check)
- [x] Migration 009: RPC `confirm_overlays(run_id, block_uids[])` — atomic copy staging → confirmed + stamp `confirmed_at/by` + run rollup
- [x] Migration 009: RPC `update_overlay_staging(run_id, block_uid, jsonb)` — for inline editing
- [x] Migration 009: `project_id NOT NULL` on `documents_v2`
- [x] Partial indexes: `idx_block_overlays_v2_pending`, `idx_block_overlays_v2_ai_complete`
- [x] Reconciled migration version drift (renamed repo files 002, 007, 008 to match DB timestamps)
- [ ] Document `prompt_config` convention in schema spec (deferred — convention is embedded in worker code and Phase 1.3 spec above)

### Phase 2 — AI Worker (Distributed) ✅ (completed 2026-02-10)
- [x] Migration 010: `claim_overlay_batch(run_id, batch_size, worker_id)` RPC — `FOR UPDATE SKIP LOCKED`
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
- [ ] Test: create run → trigger worker → overlays reach `ai_complete` → run status updates

### Phase 3 — Frontend Cleanup ✅ (completed 2026-02-10)
- [x] Split Upload.tsx to upload-only (no schema/run steps)
- [x] Delete Dashboard.tsx, Documents.tsx, RunsList.tsx from disk
- [x] Add redirects for old flat routes in router.tsx (`LegacyDocumentRedirect`, `LegacyRunRedirect`)
- [x] Add Mantine Breadcrumbs to all project-scoped pages (`AppBreadcrumbs` component)
- [x] Validate route projectId matches entity's project_id (DocumentDetail, RunDetail redirect on mismatch)
- [x] Migration 011: `delete_document`, `delete_run`, `cancel_run`, `delete_project`, `delete_schema` RPCs
- [x] Document deletion (RPC cascade + confirmation modal)
- [x] Run deletion / cancellation (cancel releases claimed blocks + sets status)
- [x] Schema deletion (FK guard — fails if runs reference it)
- [x] Project deletion (cascade all children via `delete_project` RPC, strong confirmation UI)
- [ ] Storage cleanup on document delete (deferred — orphaned files are harmless, batch cleanup later)

### Phase 4 — Grid & Toolbar ✅ (completed 2026-02-10)
- [x] Merge DocumentDetail header into single dense bar (title + status + metadata + actions in one row)
- [x] Grid fills remaining viewport (`calc(100vh - 230px)`)
- [x] Pagination moves inside grid container (flex column layout)
- [x] RunSelector retained as Apply Schema control (existing component works well)
- [x] View mode toggle: Compact / Comfortable (row density), persists to localStorage
- [x] Column visibility menu (checkbox menu via Mantine Menu, toggles per column)
- [x] Block type filter (MultiSelect, filters rowData before passing to AG Grid)

### Phase 5 — Multi-File Upload ✅ (completed 2026-02-10)
- [x] Replace FileInput with Mantine Dropzone-style drag/drop uploader (max 10 files)
- [x] Parallel ingest calls with per-file status display
- [x] Migration: add `documents_v2` to Realtime publication
- [x] ProjectDetail: live document status (Realtime subscription)

### Phase 5B — Project-Level Bulk Operations ✅ (completed 2026-02-10)
- [x] "Apply Schema to All Documents" button on ProjectDetail
- [x] "Run All Pending" with concurrent worker dispatch across project
- [x] "Confirm All" project-wide bulk confirm
- [x] "Export All (ZIP)" (one JSONL per document)
- [x] Project-level aggregate progress dashboard (confirmed/staged/pending/failed)

### Phase 6 — Review & Confirm UX ✅ (completed 2026-02-10)
- [x] Grid: visual indicator for staged vs confirmed cells
- [x] Grid: inline editing of staged overlay values
- [x] Toolbar: "Confirm All Staged" bulk action
- [x] Per-block accept/reject controls
- [x] Export: filter by confirmation status
- [x] Wire confirmation path through RPC (no direct client writes to confirmed column)

### Phase 7 — Export & Reconstruction
- [ ] Enhanced export options (confirmed only, all, CSV, per-doc)
- [ ] `reconstruct` edge function (mdast track, reads confirmed `revised_content`)
- [ ] Download reconstructed markdown from DocumentDetail toolbar

### Phase 8 — Integrations
- [ ] Integrations page (`/app/integrations`) with card layout
- [ ] Neo4j: connection config + field mapping + push confirmed overlays
- [ ] Webhook: URL config + trigger on run confirmation
- [ ] DuckDB/Parquet: columnar export of confirmed data

### Phase 9 — Polish
- [ ] Fix GCP conversion service 403 (unblock Docling track)
- [ ] Code-splitting (React.lazy, AG Grid chunk)
- [ ] Testing framework (Vitest + RTL) + initial test suite
- [ ] React Error Boundary + Realtime reconnection
- [ ] CI/CD (GitHub Actions: lint, typecheck, build)
- [ ] Auth lifecycle: email confirmation, forgot password, OAuth providers
- [ ] Account settings page
- [ ] Security audit (CSP, rate limiting, session expiry)

