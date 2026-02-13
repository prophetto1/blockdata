# Todos Backlog (Canonical Open Work)

**Date:** 2026-02-13  
**Status:** Canonical open backlog  
**Rule:** Only open work lives here. Completed items move to `dev-todos/todos-done-log.md`.

---

## Operating Contract

1. Every item has an ID, owner, and exit criteria.
2. No open checkboxes in legacy/reference docs.
3. Execution ordering is controlled by `dev-todos/todos-queue.md`.

---

## Open Items

## Priority 7 Gate Closure (Schema Core Workflow)

- [ ] `P7-001` In-wizard JSON escape hatch: add editable JSON tab with parse/error gating and unknown-key preservation.
- [ ] `P7-002` Nested object parity: add nested object property authoring in wizard, or deterministic advanced-editor routing with non-destructive preservation contract.
- [ ] `P7-003` Conflict UX hardening: explicitly handle both `schema_ref` and `schema_uid` duplicate conflicts with recoverable rename flow.
- [ ] `P7-004` Gate evidence capture: produce reproducible evidence for scratch save, fork save, conflict cases, and run/grid compatibility.
- [ ] `P7-005` Queue gate update: mark Priority 7 passed only after evidence is reproducible.

## Priority 8 Review/Export Lifecycle

- [ ] `P8-001` Export variants: confirmed-only, all, CSV, per-document options.
- [ ] `P8-002` `reconstruct` edge function for mdast track using confirmed `revised_content`.
- [ ] `P8-003` Reconstructed markdown download action in `DocumentDetail`.
- [ ] `P8-004` End-to-end staged vs confirmed behavior verification across project and document scopes.
- [ ] `P8-005` Priority 8 evidence docs and queue gate update.

## UX Fixes (Develop Later)

- [ ] `UX-001` ProjectDetail 3-column layout (`documents | schema+actions | runs`).
- [ ] `UX-002` Fix document count scoping bug when schema is selected (`0 documents` mismatch).
- [ ] `UX-003` Hide/replace zero-state overlay badges when no runs exist.

## Priority 9 Hardening/Ops

- [ ] `P9-001` Testing baseline (Vitest + RTL + initial high-risk suite).
- [ ] `P9-002` Error boundary + realtime reconnection handling.
- [ ] `P9-003` CI/CD baseline (lint, typecheck, build).
- [ ] `P9-004` Auth lifecycle completion (email confirm, password reset, OAuth).
- [ ] `P9-005` Security hardening pass (CSP, rate limiting, session expiry handling).
- [ ] `P9-006` Hardening evidence + runbooks + queue gate update.
- [ ] `P9-007` Code-splitting pass (`React.lazy`, AG Grid chunk isolation).
- [ ] `P9-008` Account settings page completion.

--- 

## Ingest Track Follow-Up Development - Integrations Related

- [ ] `ING-001` Downstream adapter interface/profile versioning.
- [ ] `ING-002` Deterministic reference adapter (`docling -> KG flatten v1`) + deterministic tests.
- [ ] `ING-003` Pin Pandoc package version in conversion service Dockerfile.
- [ ] `ING-004` Lock intended runtime policy state for Pandoc rollout keys.
- [ ] `ING-005` Worker runtime verification: concurrent worker no-double-processing + end-to-end run flow verification.
- [ ] `ING-006` Storage cleanup strategy for document deletion path (implement or formalize deferred policy).
- [ ] `ING-007` Fix representation metadata quality issue: `artifact_size_bytes = 0` for existing rows (backfill/recompute strategy).
- [ ] `ING-008` Document `prompt_config` convention in schema spec and align with worker/grid contract expectations.
- [ ] `ING-009` Verify `ANTHROPIC_API_KEY` is configured in deployed Supabase secrets for live worker runs.
- [ ] `ING-010` Revalidate historical conversion-service `Cloud Run 403` issue and record closure evidence (or active fix plan).

---

## Integrations and Phase-2 Deferred

- [ ] `INT-001` Integrations app-route parity + page skeleton (`/app/integrations`) so shell nav never points to a missing authenticated route.
- [ ] `INT-002` Neo4j integration.
- [ ] `INT-003` Webhook integration.
- [ ] `INT-004` DuckDB/Parquet integration.
- [ ] `INT-005` Agents + MCP configuration foundation (build-only): implement schema/API/UI behind feature flags with runtime binding explicitly deferred.
- [ ] `ASST-001` Internal assistant / Phase-2 integrations (remain deferred until queue gates allow).

## Assistant Platform (Develop Later)

- [ ] `ASST-002` Copilot dock UI framework (shell phase).
- [ ] `ASST-003` `schema-assist` backend edge function.
- [ ] `ASST-004` Wizard + copilot integration.
- [ ] `ASST-005` Visual system pass for assistant surfaces.
- [ ] `ASST-006` Assistant QA/observability/rollout.

## Optimization Opportunities (Develop Later)

- [ ] `OPT-001` Tier 3 optimization: retrieval-augmented system instruction context.
- [ ] `OPT-002` Tier 4 optimization: async batch API processing path.
- [ ] `OPT-003` Model routing by block profile ("right model for the job").
- [ ] `OPT-004` Pre-filtering to skip blocks that do not require processing.

---

## Ownership

- **Owner:** Session owner
- **Cadence:** Re-rank weekly; move completed items to `todos-done-log.md`.
