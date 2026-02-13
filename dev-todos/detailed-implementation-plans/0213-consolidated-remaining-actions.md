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

