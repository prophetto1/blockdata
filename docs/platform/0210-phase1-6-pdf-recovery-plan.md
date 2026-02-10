# Phase 1-6 + PDF Recovery Plan (6 Steps)

**Date:** 2026-02-10  
**Scope:** Close remaining gaps for "finalized through Phase 6" and restore verified PDF ingestion.

## Current Baseline (Verified)

- `.pptx` was removed from upload allowlist (`web/src/pages/Upload.tsx`).
- Conversion image prewarm changed to explicit Docling model downloader (`services/conversion-service/Dockerfile`).
- Supabase DB now has Phase 6 review migration effects:
  - `reject_overlays_to_pending` exists.
  - `authenticated` update on `block_overlays_v2` is limited to `overlay_jsonb_staging`.
  - `documents_v2` is in `supabase_realtime` publication.
- Frontend currently fails build due to missing `Settings` page import:
  - `web/src/router.tsx` imports `@/pages/Settings`, but `web/src/pages/Settings.tsx` does not exist.
- PDF is still failing in runtime data:
  - Latest `documents_v2` PDF row is `conversion_failed` with HuggingFace snapshot/cache error.

---

## Step 1. Unblock Frontend Build

**Goal:** Restore a clean build so frontend verification is reliable.

**Actions:**
- Remove or guard the `Settings` route import in `web/src/router.tsx`, or add a valid `web/src/pages/Settings.tsx`.
- Keep the smallest fix (prefer removing dead route if Settings page is not in scope).

**Verification Gate:**
- `npm --prefix web run build` passes.

---

## Step 2. Lock DB to Phase 6 Runtime Contract

**Goal:** Ensure deployed DB behavior matches Phase 6 expectations, not only local migration files.

**Actions:**
- Confirm production DB has:
  - `confirm_overlays`, `update_overlay_staging`, `reject_overlays_to_pending`.
  - `documents_v2` in realtime publication.
  - `authenticated` UPDATE only on `overlay_jsonb_staging`.
- Evaluate `anon` UPDATE grants on `block_overlays_v2`; revoke if not intentionally required by architecture.
- Document migration history drift (`013_*` plus additional similarly named migration) and normalize naming/history.

**Verification Gate:**
- SQL checks return expected privileges/functions/publication entries with no drift ambiguity.

---

## Step 3. Reconcile PDF Conversion Deployment State

**Goal:** Ensure running Cloud Run revision actually contains the new Docker prewarm and app code path.

**Actions:**
- Deploy `services/conversion-service` from current repo.
- Confirm revision and traffic point to new deployment.
- Confirm conversion service auth behavior is correct (401 without key, non-403 reachability).

**Verification Gate:**
- Deployment metadata + probe checks confirm new revision is active.

---

## Step 4. Validate End-to-End PDF Ingestion

**Goal:** Prove PDF pipeline is working now (not inferred from code).

**Actions:**
- Run non-MD smoke flow with a PDF fixture through:
  - `ingest` -> conversion service -> `conversion-complete` -> `documents_v2`/`blocks_v2`.
- Confirm output track is Docling:
  - `conv_parsing_tool='docling'`
  - `conv_representation_type='doclingdocument_json'`
  - block locators use `docling_json_pointer`.

**Verification Gate:**
- New PDF row reaches `status='ingested'` and export pairing checks pass.

---

## Step 5. Validate Phase 6 UX + Worker Progress Loop

**Goal:** Confirm practical "Phase 6 finalized" behavior, not just code presence.

**Actions:**
- Run a focused scenario:
  - Create run -> worker writes staged (`ai_complete`) -> inline edit -> per-block confirm/reject -> bulk confirm.
- Verify run rollups update and export includes only confirmed overlays.
- Verify no direct client path mutates `overlay_jsonb_confirmed`.

**Verification Gate:**
- Scenario passes with expected status transitions and export behavior.

---

## Step 6. Sync Docs to True Runtime State

**Goal:** Make status docs accurate and decision-ready.

**Actions:**
- Update:
  - `docs/platform/0209-unified-remaining-work.md`
  - `docs/issues/0210-pdf-conversion-pipeline-failure.md`
- Replace stale assumptions with date-stamped verified outcomes:
  - what is code-complete,
  - what is runtime-verified,
  - what remains.

**Verification Gate:**
- Both docs reflect the same verified facts and no contradictions remain.

---

## Execution Order Rationale

1) Build unblock first (fastest blocker removal).  
2) DB/runtime contract second (Phase 6 safety baseline).  
3) Redeploy conversion service before PDF test (infra dependency).  
4) Run PDF E2E proof.  
5) Run Phase 6 end-to-end proof.  
6) Final documentation sync.
