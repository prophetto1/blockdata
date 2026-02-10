# Work Done Status Log (Phase 1-6 + PDF)

**Date:** 2026-02-10  
**Purpose:** Detailed operational log of verified work completed, current runtime status, and remaining blockers.

---

## 1) Executive Status

- Phase 6 review permissions and RPC hardening are now present in the live Supabase project.
- Frontend build blocker (missing `Settings` import target) was removed from router and `web` build passes.
- PDF pipeline is **not yet verified as fixed in runtime**.
- A new conversion-service image build completed successfully, but Cloud Run traffic is still on the older revision/image.

---

## 2) Verified Changes Already Present (Before This Session)

### Repo Changes (verified in workspace)

- Upload allowlist no longer includes `.pptx`.
  - File: `web/src/pages/Upload.tsx`
- Conversion Dockerfile changed to explicit Docling model download.
  - File: `services/conversion-service/Dockerfile`
  - Includes:
    - `DOCLING_CACHE_DIR=/opt/docling-cache`
    - `HF_HOME=/opt/hf`
    - `download_models()` prewarm step

### Remote Supabase State (verified)

- Migrations `012` and `013` are recorded remotely.
- `reject_overlays_to_pending` function exists.
- `documents_v2` is included in realtime publication.

---

## 3) Work Completed In This Session

### 3.1 Plan Document Created

- Created 6-step execution plan:
  - `docs/platform/0210-phase1-6-pdf-recovery-plan.md`

### 3.2 Frontend Build Unblocked

- Removed missing route import/usage that referenced non-existent `@/pages/Settings`.
  - File changed: `web/src/router.tsx`
- Verification:
  - `npm --prefix web run build` passed.

### 3.3 Supabase Permission Hardening Added + Applied

- Added migration file:
  - `supabase/migrations/20260210203000_015_overlay_permissions_hardening.sql`
- Added follow-up migration file:
  - `supabase/migrations/20260210204000_016_revoke_anon_phase6_rpc_execute.sql`
- Applied both to live Supabase DB.

### 3.4 Supabase Hardening Verification Results

- `block_overlays_v2` UPDATE privileges:
  - `authenticated`: only `overlay_jsonb_staging`
  - `anon`: none
- Phase 6 RPC EXECUTE privileges:
  - `confirm_overlays`: `authenticated`, `service_role`
  - `update_overlay_staging`: `authenticated`, `service_role`
  - `reject_overlays_to_pending`: `authenticated`, `service_role`
- Realtime publication:
  - `block_overlays_v2`, `documents_v2`

---

## 4) Cloud Run / PDF Runtime Status (Current)

### Build Status

- Cloud Build ID: `ec437a01-f887-4621-bb78-43e657008aa0`
- Build status: `SUCCESS`
- Built/pushed digest: `sha256:e13c3bbc403337a94bdd446fd3ea05a049d4a6dda77738db237c41c06b4b383c`

### Serving Status

- Cloud Run service: `writing-system-conversion-service` (project `agchain`, region `us-central1`)
- Current serving revision: `writing-system-conversion-service-00002-g7t`
- Current serving image digest:
  - `sha256:0e7f5128aafd9cf6a73c52a3d7edd917648eb4cac1b99943c1b8af0113feba3f`
- Result:
  - New built image digest is **not** yet the one serving traffic.

### PDF Data Signal in Supabase

- `documents_v2` currently shows:
  - `docx`: ingested (2)
  - `md`: ingested (5)
  - `pdf`: conversion_failed (1)
- Latest PDF failure error indicates missing Hub/snapshot artifacts at conversion time.

---

## 5) Current Gaps / Blockers

- Cloud Run traffic has not switched to the newly built conversion image.
- PDF end-to-end smoke verification has not yet passed.
- Workspace has concurrent edits from another agent/session; coordination is required before large refactors or commits.

---

## 6) Immediate Next Actions (Operational)

1. Complete/redo Cloud Run deploy so traffic serves the new digest `sha256:e13c3bbc...`.
2. Run a fresh PDF ingest and verify:
   - `documents_v2.status='ingested'`
   - `conv_parsing_tool='docling'`
   - `conv_representation_type='doclingdocument_json'`
3. Update status docs with runtime-confirmed state:
   - `docs/issues/0210-pdf-conversion-pipeline-failure.md`
   - `docs/platform/0209-unified-remaining-work.md`

---

## 7) File-Level Work Ledger (This Session)

- Added: `docs/platform/0210-phase1-6-pdf-recovery-plan.md`
- Added: `docs/platform/0210-work-done-status-log.md`
- Modified: `web/src/router.tsx`
- Added: `supabase/migrations/20260210203000_015_overlay_permissions_hardening.sql`
- Added: `supabase/migrations/20260210204000_016_revoke_anon_phase6_rpc_execute.sql`
