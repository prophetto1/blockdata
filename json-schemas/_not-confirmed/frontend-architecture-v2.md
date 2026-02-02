# Frontend Architecture v2 (PRD v4–aligned fixes, comparison copy)

This is a **non-destructive** revision of `json-schemas/frontend-architecture.md`.
It keeps the same high-level block-centric UI model, but adjusts the Phase 1 flow to match the **developmental direction** in `json-schemas/prd-v4.md`:

- Phase 1 is immutable end-to-end.
- Non-MD uploads create a `source_uid` immediately, but may not have a `doc_uid` until conversion + ingest complete.
- Phase 2 overlays annotations via `block_annotations` (multi-schema-per-document), not by adding annotation columns to `blocks`.

## 1) Key Fixes (what changes vs v1)

1) **Introduce a first-class `source_uid` route for conversion.**
   - v1 routes only by `doc_uid` (`/documents/:doc_uid`).
   - v2 adds `/sources/:source_uid` as the lifecycle page for `uploaded|converting|ingested|*_failed`.
   - Once `doc_uid` exists, redirect to `/documents/:doc_uid`.

2) **Stop requiring browser-side SHA256 pre-checks for Phase 1.**
   - v1: “compute SHA256 in browser → check existing → upload”.
   - v2: treat `/ingest` as the canonical “create-or-start” operation and use its response (`source_uid`, `status`, optional `doc_uid`) as the next navigation key.
   - Optional: add a “dedupe check” later, but it must match the exact backend hash formula:
     `source_uid = sha256(source_type + "\n" + raw_bytes)`.

3) **Commit to Phase 1 reads via RLS (no extra “status endpoint”).**
   The frontend reads `documents` and `blocks` directly using Supabase client + RLS.
   This matches the developmental direction: clients never mutate tables, but may read their own rows under RLS.

4) **Plan for block pagination/virtualization immediately.**
   - Phase 1 can ingest large `.txt` (e.g., SCOTUS opinions).
   - The UI should not assume `blocks: Block[]` is always fetched all-at-once.

## 2) Route Map (Phase 1 + Phase 2)

### Phase 1 routes (required)

- `/upload`
- `/sources/:source_uid` (conversion/ingest lifecycle + redirect to doc when ready)
- `/documents/:doc_uid` (immutable block viewer)

### Phase 2 routes (planned)

- `/documents/:doc_uid/runs/:run_id`

## 3) Backend Contract Assumptions (Phase 1)

### 3.1 `/ingest` response is authoritative

The frontend should treat `/ingest` as the canonical entry point. It returns:

```ts
type IngestResponse = {
  source_uid: string;
  doc_uid: string | null;
  status: "ingested" | "converting" | "conversion_failed" | "ingest_failed";
  blocks_count?: number;
  error?: string;
};
```

Frontend navigation rule:

- If `status === "ingested"` and `doc_uid` is present → go to `/documents/:doc_uid`
- If `status === "converting"` and `doc_uid` is null → go to `/sources/:source_uid`
- If `*_failed` → show error on `/sources/:source_uid` (or inline on upload page) and allow retry

### 3.2 Document lifecycle states (Phase 1)

Use the PRD v4 set:

`uploaded | converting | ingested | conversion_failed | ingest_failed`

## 4) Data Access Strategy (Phase 1)

Phase 1 uses direct table reads via Supabase client + RLS.

- Poll document status:
  - `documents` WHERE `source_uid = :source_uid` (SELECT via RLS)
- Load blocks:
  - `blocks` WHERE `doc_uid = :doc_uid` ORDER BY `block_index` (SELECT via RLS)

## 5) Page Flows

### 5.1 `/upload` (Phase 1)

UI fields:

- file (accept `.md`, `.docx`, `.pdf`, `.txt`)
- `immutable_schema_ref` (start with `md_prose_v1` only)
- `doc_title` (optional; backend can auto-extract for `.md`)

Action:

- `POST /functions/v1/ingest` with multipart form:
  - `file`, `immutable_schema_ref`, optional `doc_title`

Result:

- If ingested: redirect `/documents/:doc_uid`
- If converting: redirect `/sources/:source_uid`

### 5.2 `/sources/:source_uid` (Phase 1 lifecycle page)

Purpose:

- Show conversion/ingest progress when `doc_uid` is not available yet.

Polling:

- Query `documents` by `source_uid` using Supabase client (SELECT via RLS)

Behavior:

- If status becomes `ingested` and `doc_uid` is now set → redirect to `/documents/:doc_uid`
- If `conversion_failed` or `ingest_failed` → show error + retry CTA (re-upload)

### 5.3 `/documents/:doc_uid` (Phase 1 immutable viewer)

Data:

- Fetch `documents` row by `doc_uid` (title/header display)
- Fetch blocks:
  - initial page load: either first N blocks, or first N + virtualization
  - allow filter/search by:
    - `block_type`
    - full-text search over `content_original` (Phase 1 can be client-side; later server-side)

Export:

- “Export JSONL” calls `GET /functions/v1/export-jsonl?doc_uid=...`

Annotation UI in Phase 1:

- Show annotation panel as read-only placeholder:
  - `schema_ref = null`
  - `data = {}`

## 6) Component Model (kept from v1, minor adjustments)

Keep the same hierarchy:

- App shell
- Document list (optional)
- BlockViewer (core)
- Swappable panel area (Phase 1: placeholder; Phase 2: run overlays)

Change:

- The “document list” should list by **doc_uid** once ingested.
- While converting, show “sources in progress” keyed by **source_uid**.

## 7) Phase 2 overlay model (confirming alignment)

This is already correct in v1 and remains correct here:

- `blocks` stays immutable.
- per-run annotations live in `block_annotations` keyed by `(run_id, block_uid)`.
- Realtime subscriptions target `block_annotations` updates scoped to a `run_id`.

## 8) Stress Test Notes (things to plan for now)

1) Large docs:
   - implement virtualization (`@tanstack/virtual` or `react-window`)
   - fetch blocks in pages by `block_index`

2) Idempotency UX:
   - users may upload the same file twice; handle “already exists” by redirecting via `source_uid` lookup
   - if you keep a pre-check, it must use the exact `source_uid` formula (includes `source_type`)

3) Conversion latency:
   - show clear converting state on `/sources/:source_uid`
   - show TTL-based error messaging (“conversion timed out”) consistent with PRD v4

4) Auth:
   - frontend must be authenticated (Supabase Auth session) to read via RLS and to call `/ingest` (owner_id is required)
