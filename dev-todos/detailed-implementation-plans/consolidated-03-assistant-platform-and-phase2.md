# Consolidated Active Todos 03: Assistant Platform + Phase 2 Integrations

This file is a verbatim consolidation of active todo/spec documents.
No summarization or truncation has been applied to source content.

Generated: 2026-02-12 22:10:26 -07:00

## Source Files
- dev-todos\0211-core-priority-queue-and-optimization-plan.md
- dev-todos\0211-core-workflows-before-assistant-plan.md
- dev-todos\0211-session-handoff-resume-guide.md
- dev-todos\0211-shell-v2-copilot-platform-plan.md
- dev-todos\0211-worker-token-optimization-patterns.md
- dev-todos\phase-2-integrations\0211-internal-assistant-development-direction.md
- dev-todos\phase-2-integrations\0211-internal-assistant-execution-checklist.md


---

<!-- BEGIN SOURCE: dev-todos\0211-core-priority-queue-and-optimization-plan.md -->

# Core Priority Queue + Worker Optimization Pass/Fail Tracker

**Date:** 2026-02-11  
**Status:** Active execution tracker  
**Scope:** One-at-a-time core platform execution with binary gates, hard prerequisites, and mandatory evidence artifacts

> Internal assistant work remains deferred until Priorities 1-9 are passed.

---

## 1) Tracker Objective

This document is the implementation control plane for core work.  
A priority is considered complete only when its `Entry criteria`, `Required execution`, `Required evidence`, and `Exit criteria` are all satisfied and recorded.

---

## 2) Canonical Inputs

- `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`
- `docs/ongoing-tasks/complete/0211-admin-config-registry.md`
- `docs/ongoing-tasks/complete/0211-source-format-reliability-matrix.md`
- `docs/ongoing-tasks/complete/0211-source-format-smoke-results.md`
- `docs/ongoing-tasks/0211-worker-token-optimization-patterns.md`
- `docs/ongoing-tasks/meta-configurator-integration/spec.md`
- `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md`
- `docs/ongoing-tasks/0210-test-driven-hardening-plan.md`

---

## 3) Operating Rules (Strict)

1. Exactly one priority can be `In Progress` at a time.
2. A priority cannot start unless all dependencies are `Passed`.
3. A priority cannot be marked `Passed` without evidence artifacts written to docs.
4. No assistant/KG/vector/MCP implementation until Priorities 1-9 are `Passed`.
5. Do not create parallel planning docs for the same scope; this file is canonical for sequence and gate state.

---

## 4) Gate Status Legend

- `Not Started`: no active execution.
- `In Progress`: currently executing.
- `Blocked`: dependency/precondition not met.
- `Failed`: executed but did not satisfy exit criteria.
- `Passed`: all checklist items complete with evidence.

---

## 5) Priority Dependency + Hard Precursor Map

| Priority | Depends On | Hard Precursors |
|---|---|---|
| 1 | None | `pptx/xlsx` fixtures exist; smoke runner operational; conversion auth/secrets valid for non-MD tests |
| 2 | 1 | Worker runtime path reachable; worker key/secret configured; deterministic test run prepared |
| 3 | 2 | Config inventory complete; owner boundaries agreed; conflict list from registry is current |
| 4 | 3 | Baseline token/cost measurements captured from pre-caching runs |
| 5 | 2, 3, 4 | Deterministic claim ordering defined (numeric `block_index` semantics) |
| 6 | 3, 4, 5 | Config model locked; runtime snapshot strategy defined |
| 7 | 2, 3 | Worker/grid contract stable (`properties`, `prompt_config`) |
| 8 | 2, 7 | Staged/confirmed overlay lifecycle stable; schema outputs compatible |
| 9 | 1-8 | Core flows executable end-to-end; docs aligned with runtime truth |

---

## 6) Global Evidence Contract (Required for Every Priority)

- [ ] Commands/tests used for verification are recorded with timestamp.
- [ ] Priority-specific evidence doc(s) are updated with outcomes.
- [ ] `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md` gate state is updated.
- [ ] `Gate Ledger` entry in this document is appended/updated.
- [ ] If failed/blocked, blocker and next corrective action are documented.

---

## 7) Gate Ledger (Update On Every Status Change)

| Priority | Status | Date | Executor | Verification Commands | Evidence Artifacts | Notes |
|---|---|---|---|---|---|---|
| 1 | Passed | 2026-02-11 | Session owner | `scripts/run-format-matrix-smoke.ps1` | `0211-source-format-reliability-matrix.md`, `0211-source-format-smoke-results.md`, `scripts/logs/smoke-*-20260211-124133.log` | Added `pptx/xlsx` fixtures; full required-format pass at `20260211-124133` |
| 2 | Passed | 2026-02-12 | Session owner | SQL: `create_run_v2(...)`, `cancel_run(...)`, key-state/overlay/run queries; HTTP: `POST /functions/v1/worker`, `POST /functions/v1/test-api-key`, `POST /functions/v1/user-api-keys` | `docs/ongoing-tasks/complete/0211-worker-runtime-reliability.md`, `supabase/functions/worker/index.ts` | Worker v6 release fix verified; no-key + invalid-key + cancellation safeguards verified; valid-key happy path verified (`ab8a3b40-757c-473f-a0c8-65ac007f74bc`); retry-to-failed verified (`7f50cdcb-f897-4566-bb87-de2f62e79884`) |
| 3 | Passed | 2026-02-12 | Session owner | SQL: `pg_get_functiondef(claim_overlay_batch)`, transactional claim-order probe (`BEGIN ... ROLLBACK`); Supabase mgmt: `apply_migration(017_claim_overlay_batch_block_index_ordering)`, `list_migrations`, `list_edge_functions` | `0211-admin-config-registry.md`, `supabase/migrations/20260211091818_add_base_url_multi_provider.sql`, `supabase/migrations/20260212004639_017_claim_overlay_batch_block_index_ordering.sql`, `supabase/functions/worker/index.ts`, `supabase/functions/user-api-keys/index.ts` | Default drift locked (`temperature=0.3`), `base_url` contract codified, claim ordering moved to `block_index`; deployed `worker` v7 and `user-api-keys` v3 |
| 4 | Passed | 2026-02-12 | Session owner | Deploy: `worker v9 (verify_jwt=false + internal auth)`, `schemas v12 (verify_jwt=false)`; Benchmark: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\benchmark-worker-prompt-caching.ps1 -SchemaId 94ffed2b-364f-453d-9553-fdb05521bf65 -BatchSize 5`; SQL: paired run-state + OFF/ON overlay comparison (`action/final.format/final.content`) | `docs/ongoing-tasks/complete/0211-worker-optimization-benchmark-results.md`, `scripts/logs/prompt-caching-benchmark-20260211-191241.json`, `supabase/functions/worker/index.ts`, `scripts/benchmark-worker-prompt-caching.ps1` | Corrective pair passed: non-zero cache telemetry (`cache_creation_input_tokens=1633`, `cache_read_input_tokens=45724`) and material parity (`material_mismatch_blocks=0`) on `7af1b494-ad4b-401c-9bcb-e59386b9760b` vs `3e9dab67-9ede-491e-b50c-86642d78ad39` |
| 5 | Passed | 2026-02-12 | Session owner | Benchmark: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\benchmark-worker-batching.ps1 -SchemaId 1a28c369-a3ea-48d9-876e-3562ee88eff4 -BatchSize 25`; Benchmark: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\benchmark-worker-batching.ps1 -SchemaId 94ffed2b-364f-453d-9553-fdb05521bf65 -BatchSize 25`; SQL: baseline-vs-batched material parity checks on `overlay_jsonb_staging` by `block_uid` | `supabase/functions/worker/index.ts`, `scripts/benchmark-worker-batching.ps1`, `scripts/logs/worker-batching-benchmark-20260211-224355.json`, `scripts/logs/worker-batching-benchmark-20260211-224635.json`, `docs/ongoing-tasks/complete/0211-priority5-adaptive-batching-prep-spec.md` | Worker v15 batching pass: extraction suite call_count 29 -> 4/2 with material parity (0 mismatches); revision-heavy suite call_count 29 -> 6 with material parity (0 mismatches) and no split-event regressions |
| 6 | Passed | 2026-02-12 | Session owner | Deploy/runtime: `npx supabase secrets set SUPERUSER_EMAIL_ALLOWLIST=... --project-ref dbdzzhshmigewyprahej`; `npx supabase functions deploy admin-config/runs/worker --project-ref dbdzzhshmigewyprahej --no-verify-jwt --use-api`; Supabase Mgmt SQL `POST /v1/projects/dbdzzhshmigewyprahej/database/query` (apply migration `018`, verify counts, record migration row); Auth/API proofs: `POST /auth/v1/token`, `GET/PATCH /functions/v1/admin-config`, `POST /functions/v1/runs`, `POST /functions/v1/worker` | `supabase/migrations/20260212114500_018_admin_runtime_policy_controls.sql`, `supabase/functions/admin-config/index.ts`, `supabase/functions/_shared/admin_policy.ts`, `supabase/functions/_shared/superuser.ts`, `supabase/functions/runs/index.ts`, `supabase/functions/worker/index.ts`, `web/src/pages/SuperuserSettings.tsx`, `web/src/router.tsx`, `docs/ongoing-tasks/complete/0211-admin-config-registry.md`, `docs/ongoing-tasks/complete/0211-admin-optimization-controls-spec.md`, `docs/ongoing-tasks/complete/0211-progress-log.md` | Remote migration + seed verified (`policy_count=19`), superuser gate active, new-run policy-change proof passed, mid-run snapshot proof passed (`run 640cf4b0-6c6f-445b-bd13-ae80c1f2e73f` kept snapshot after policy restore), audit visibility proof passed (API rows present; UI consumes same `admin-config` audit payload). |
| 7 | Not Started |  |  |  |  |  |
| 8 | Not Started |  |  |  |  |  |
| 9 | Not Started |  |  |  |  |  |

---

## 8) Priority 1 - Close Format Reliability Gate

### Entry Criteria
- [x] Fixtures exist for `docs/tests/test-pack/lorem_ipsum.pptx` and `docs/tests/test-pack/lorem_ipsum.xlsx`.
- [x] `scripts/run-format-matrix-smoke.ps1` runs in current environment.
- [x] Required test credentials/secrets are present for non-Markdown conversion path.

### Required Execution
- [x] Run full matrix once with all required formats.
- [x] For any failed format, fix root cause and rerun that format before proceeding.
- [x] Re-run full matrix after fixes to confirm no regressions.

### Required Evidence
- [x] Update `docs/ongoing-tasks/complete/0211-source-format-smoke-results.md` with latest timestamped run.
- [x] Update `docs/ongoing-tasks/complete/0211-source-format-reliability-matrix.md` runtime status per format.
- [x] Attach/reference per-format logs under `scripts/logs/`.

### Exit Criteria (Binary)
Pass only if all are true:
- [x] `md`, `txt`, `docx`, `pdf`, `pptx`, `xlsx`, `html`, `csv` are all marked `Verified` with date.
- [x] No required format is `SKIPPED`, `Blocked`, or `Unverified`.
- [x] Track assertions match expected parsing path (`docling` or `mdast`) for each format.

Fail if any are true:
- [ ] Any required format is not `Verified`.
- [ ] Any smoke run result is missing/undocumented.

---

## 9) Priority 2 - Lock Worker/Run Reliability Baseline

### Entry Criteria
- [x] Priority 1 status is `Passed`.
- [x] Worker runtime path is reachable and authenticated invocation works.
- [x] LLM API key is configured and provider-valid for happy-path execution.
- [x] Test schema and test document are selected for deterministic run checks.

### Required Execution
- [x] Execute deterministic happy path: create run -> invoke worker -> no pending overlays remain.
- [x] Validate transitions: `pending -> claimed -> ai_complete/failed`.
- [x] Validate retries and terminal failure behavior.
- [x] Validate cancellation behavior for claimed/pending overlays.
- [x] Validate no-key fallback behavior releases claimed overlays back to pending.
- [x] Validate invalid-key (401) behavior releases claims and marks key invalid.
- [x] Validate run rollups (`completed_blocks`, `failed_blocks`, run status) against overlay truth.

### Required Evidence
- [x] Add/update worker reliability evidence doc (recommended: `docs/ongoing-tasks/complete/0211-worker-runtime-reliability.md`).
- [x] Record at least one run ID and command/log evidence per scenario (happy, failure/retry, cancellation).
- [x] Add short failure-signature runbook notes.

### Exit Criteria (Binary)
Pass only if all are true:
- [x] Status transitions and rollups are deterministic and repeatable.
- [x] Retry/cancellation semantics match documented contract.
- [x] Worker gate is marked complete in `0211-core-workflows-before-assistant-plan.md`.

Fail if any are true:
- [ ] Rollup counts diverge from overlay state.
- [ ] Claimed overlays can be stranded without documented recovery.

---

## 10) Priority 3 - Lock Config Registry + Ownership Boundaries

### Entry Criteria
- [x] Priority 2 status is `Passed`.
- [x] `docs/ongoing-tasks/complete/0211-admin-config-registry.md` reflects current repo/runtime inventory.

### Required Execution
- [x] Classify each config key as `env`, `admin-policy`, or `run/schema/user scope`.
- [x] Resolve default drift across worker/UI/DB (`model`, `temperature`, `max_tokens`).
- [x] Resolve `base_url` persistence and RPC signature parity.
- [x] Resolve deterministic claim ordering rule for batching workflows (`block_index` semantics).
- [x] Document interim handling for values still hardcoded pending admin controls.

### Required Evidence
- [x] Update `0211-admin-config-registry.md` with resolved status per conflict.
- [x] Reference migrations/code locations that enforce resolved contracts.
- [x] Record unresolved items explicitly as blockers (if any).

### Exit Criteria (Binary)
Pass only if all are true:
- [x] No critical conflicts remain unresolved in registry conflict summary.
- [x] Single approved config registry exists and is linked from core workflow plan.
- [x] Ordering and provider/base URL contracts are unambiguous and codified.

Fail if any are true:
- [ ] Temperature/model/default conflicts remain.
- [ ] `base_url` or claim-ordering parity remains partially specified.

---

## 11) Priority 4 - Implement Prompt Caching

### Entry Criteria
- [x] Priority 3 status is `Passed`.
- [x] Baseline token/cost metrics are captured pre-change.

### Required Execution
- [x] Add prompt caching behavior in worker LLM path.
- [x] Add feature flag for enable/disable rollback.
- [x] Run representative benchmark with caching off and on using same dataset/schema.

### Required Evidence
- [x] Add/update benchmark doc (recommended: `docs/ongoing-tasks/complete/0211-worker-optimization-benchmark-results.md`).
- [x] Record quality comparison notes and token/cost deltas.

### Exit Criteria (Binary)
Pass only if all are true:
- [x] No quality regression on benchmark sample.
- [x] Measurable token/cost reduction is documented.
- [x] Rollback path is tested.

Fail if any are true:
- [ ] Caching changes extraction outputs materially without approved tradeoff.
- [ ] No reproducible measurement exists.

---

## 12) Priority 5 - Implement Adaptive Multi-Block Batching

### Entry Criteria
- [x] Priorities 2, 3, and 4 are `Passed`.
- [x] Deterministic claim ordering is codified and validated.

### Required Execution
- [x] Implement pack sizing based on context and output budgets.
- [x] Implement pack claim/assignment and per-block response validation.
- [x] Implement overflow split-and-retry behavior.
- [x] Benchmark at least one extraction schema and one revision-heavy schema.

### Required Evidence
- [x] Add/update batching implementation spec (recommended: `docs/ongoing-tasks/complete/0211-priority5-adaptive-batching-prep-spec.md`).
- [x] Add/update benchmark results with quality and call-count deltas.

### Exit Criteria (Binary)
Pass only if all are true:
- [x] No quality regression vs baseline benchmark.
- [x] Significant call-count reduction is verified.
- [x] Queue correctness invariants remain true.

Fail if any are true:
- [ ] Batched outputs cannot be deterministically mapped back to source blocks.
- [ ] Retry/overflow behavior creates data-loss risk.

---

## 13) Priority 6 - Build Admin/Superuser Optimization Controls

### Entry Criteria
- [x] Priorities 3, 4, and 5 are `Passed`.
- [x] Final policy key list is approved in config registry.

### Required Execution
- [x] Add admin controls for caching, batching mode, limits, and safety margins.
- [x] Snapshot effective config at run creation.
- [x] Add auditability for policy changes.

### Required Evidence
- [x] Add/update controls spec (recommended: `docs/ongoing-tasks/complete/0211-admin-optimization-controls-spec.md`).
- [x] Record proof that run snapshots prevent mid-run drift.
- [x] Record audit visibility proof.

### Exit Criteria (Binary)
Pass only if all are true:
- [x] Runtime behavior is policy-driven without code deploy.
- [x] Mid-run config drift is prevented by snapshot design.
- [x] Change history is observable.

Fail if any are true:
- [ ] Runtime still depends on conflicting hardcoded policy values.
- [ ] Run behavior can change due to admin edits after run start.

---

## 14) Priority 7 - Complete Schema Core Workflow

### Entry Criteria
- [x] Priorities 2 and 3 are `Passed`.

### Required Execution
- [ ] Deliver wizard-first manual schema creation path.
- [ ] Preserve advanced editor escape hatch and fork-by-default semantics.
- [ ] Enforce compatibility with worker/grid contract (`properties`, `prompt_config`).

Current as-is progress snapshot (2026-02-12):
- Implemented: start/wizard/templates/apply routes, schema workflow nav, wizard 5-step manual flow, existing-schema fork prefill, template prefill + gallery/detail scaffold.
- Remaining for gate closure: upload classifier routing, nullable/nested object parity, preview compatibility pass/warn, in-wizard JSON escape hatch, and required evidence capture.

### Required Evidence
- [ ] Update schema workflow status docs (`meta-configurator-integration/status.md` and related references).
- [ ] Record happy-path and conflict-path (`409`) verification.

### Exit Criteria (Binary)
Pass only if all are true:
- [ ] Non-technical user can create and save compatible schema without hand-authored JSON.
- [ ] Edit/fork/conflict behavior is deterministic and recoverable.

Fail if any are true:
- [ ] Wizard output produces worker/grid contract breakage.
- [ ] Save conflict behavior is ambiguous.

---

## 15) Priority 8 - Review/Export Lifecycle Completion

### Entry Criteria
- [ ] Priorities 2 and 7 are `Passed`.

### Required Execution
- [ ] Validate staged vs confirmed behavior end-to-end.
- [ ] Close in-scope export variants and reconstruction requirements.
- [ ] Validate both project-level and document-level paths.

### Required Evidence
- [ ] Update task-specific export/review docs with test outcomes and known limits.
- [ ] Ensure runtime truth docs reflect final behavior without contradiction.

### Exit Criteria (Binary)
Pass only if all are true:
- [ ] Review/confirm/export gate is complete in core workflow plan.
- [ ] Confirmed-data behavior is consistent and test-verified.

Fail if any are true:
- [ ] Export behavior contradicts staged/confirmed contract.
- [ ] Project and document flows diverge without explicit scope callout.

---

## 16) Priority 9 - Hardening + Ops Baseline

### Entry Criteria
- [ ] Priorities 1-8 are `Passed`.

### Required Execution
- [ ] Expand automated tests for highest-risk paths.
- [ ] Finalize runbooks for conversion, worker, and export failure signatures.
- [ ] Verify RLS/security hardening and CI baseline.

### Required Evidence
- [ ] Update hardening docs with command outputs and pass/fail status.
- [ ] Record operational runbook links and incident handling steps.

### Exit Criteria (Binary)
Pass only if all are true:
- [ ] Core stability gates are complete and documented.
- [ ] Operationally repeatable baseline exists for release.

Fail if any are true:
- [ ] Critical data paths lack automated verification.
- [ ] Known high-severity failure modes lack runbook coverage.

---

## 17) Assistant Activation Lock

Internal assistant implementation can move from deferred to active only when:

- [ ] Priorities 1-9 are all `Passed`.
- [ ] Core workflow plan gate checklist is fully complete.
- [ ] No unresolved critical conflicts remain in config/worker/schema/review pipelines.

<!-- END SOURCE: dev-todos\0211-core-priority-queue-and-optimization-plan.md -->


---

<!-- BEGIN SOURCE: dev-todos\0211-core-workflows-before-assistant-plan.md -->

# Core Workflows First Plan (Assistant Deferred)

**Date:** 2026-02-11  
**Status:** Active execution plan  
**Scope:** Complete and harden core product workflows/pipelines before internal assistant implementation

---

## 1) Sequencing Decision (Locked)

The internal assistant program is deferred until core platform workflows are production-stable.

Execution priority is now:

1. Conversion + ingest reliability.
2. Worker/run pipeline reliability.
3. Schema core workflows (wizard + advanced editor + save/fork/conflict).
4. Review/export/document lifecycle completion.
5. Test/security/ops hardening.
6. Internal assistant (KG/vector/MCP/CLI) after gates are complete.

Related deferred docs:

- `docs/ongoing-tasks/phase-2-integrations/0211-internal-assistant-development-direction.md`
- `docs/ongoing-tasks/phase-2-integrations/0211-internal-assistant-execution-checklist.md`

---

## 2) Active Workstreams (Core)

## Workstream A: Format Conversion + Ingest Reliability

**Goal:** Required formats ingest to blocks reliably and consistently.

1. Establish format matrix and runtime truth source.
2. Validate Cloud Run conversion deployment, revision, and secrets.
3. Run per-format smoke tests and capture outcomes.
4. Resolve format-specific failures and rerun matrix.

Primary references:

- `docs/ongoing-tasks/complete/0211-source-format-reliability-matrix.md`
- `docs/ongoing-tasks/0210-pdf-conversion-pipeline-failure.md`
- `services/conversion-service/app/main.py`
- `supabase/functions/ingest/process-convert.ts`

## Workstream B: Worker/Run Pipeline Completion

**Goal:** Runs move from pending to complete with robust retry/rollup behavior.

1. Verify worker invocation path from UI and API.
2. Verify claim/retry/fail semantics in runtime.
3. Verify run rollup counters/status transitions.
4. Verify key-management behavior for user keys/platform fallback.

Primary references:

- `supabase/functions/worker/index.ts`
- `docs/ongoing-tasks/0209-unified-remaining-work.md` (worker phase)

## Workstream C: Schema Core Workflow Completion

**Goal:** Schema creation and editing are complete without assistant dependency.

1. Complete wizard-first flow (manual path fully usable).
2. Keep advanced editor route and fork-by-default semantics.
3. Ensure save/idempotency/conflict behavior matches schema contract.
4. Verify worker/grid compatibility requirements (`properties`, prompt config conventions).

Primary references:

- `docs/ongoing-tasks/meta-configurator-integration/spec.md`
- `docs/ongoing-tasks/0210-schema-wizard-and-ai-requirements.md`

## Workstream D: Review + Export Workflow Hardening

**Goal:** Review and export pathways are complete and predictable.

1. Confirm staged vs confirmed overlay behavior end-to-end.
2. Close export gaps (merged variants if required by product scope).
3. Verify document-level and project-level export UX and correctness.

Primary references:

- `docs/ongoing-tasks/0209-unified-remaining-work.md`

## Workstream E: Hardening + Ops Baseline

**Goal:** Stabilize release posture before assistant work starts.

1. Expand smoke coverage for critical flows.
2. Ensure permission/RLS hardening remains intact.
3. Add operational runbook entries for common failures (conversion/worker/export).
4. Ensure status docs reflect runtime truth (remove stale contradictions).

Primary references:

- `docs/ongoing-tasks/0210-work-done-status-log.md`
- `docs/ongoing-tasks/0210-test-driven-hardening-plan.md`

---

## 3) Current Risk Concentration (2026-02-12)

1. Conversion runtime truth is inconsistent across docs (some entries say "resolved", others "unverified").  
Action: treat as unverified until fresh smoke matrix passes.

2. Format support widened in code (`pptx`, `xlsx`, `html`, `csv`) and now has runtime verification from full matrix run (`20260211-124133`).  
Action: keep full matrix in regression cadence to prevent drift.

3. Priority 6 admin/superuser optimization controls gate is now passed with deploy/runtime evidence.  
Action: proceed to Priority 7 schema core workflow completion.

4. Edge Function JWT mode mismatch (asymmetric user JWT vs `verify_jwt=true`) was resolved for active runtime paths.  
Action: maintain internal auth checks in functions where gateway verification is disabled.

---

## 4) Execution Gates Before Assistant Work

All must be true:

- [x] Required source formats pass ingest/conversion smoke matrix.
- [x] Worker pipeline is verified live (claim -> ai_complete/failed -> rollup).
- [ ] Schema core workflow is complete and stable.
- [ ] Review/export workflows are complete and tested.
- [ ] Core hardening baseline and runbooks are in place.

Only after these gates are complete should assistant implementation move from deferred to active.

---

## 5) Immediate Next Actions

1. Start Priority 7 schema core workflow closure (`meta-configurator-integration/spec.md`).
2. Treat `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md` as the execution contract and avoid scope drift.
3. Verify wizard-first schema creation path produces worker-compatible schema JSON (`properties`, `prompt_config`).
4. Verify save/fork/conflict (`409`) behavior and record deterministic recovery path evidence.
5. Update gate ledger and advance queue only after Priority 7 exit criteria are satisfied.

---

## 6) Progress Log

### 2026-02-11

Completed:

1. Locked sequencing: assistant work deferred behind core workflow gates.
2. Added active core plan (`0211-core-workflows-before-assistant-plan.md`).
3. Added source-format reliability matrix (`0211-source-format-reliability-matrix.md`).
4. Added matrix runner script (`scripts/run-format-matrix-smoke.ps1`).
5. Executed matrix run (timestamp `20260211-101408`) with results:
   - PASS: `md`, `txt`, `docx`, `pdf`, `html`, `csv`
   - SKIPPED (missing fixtures): `pptx`, `xlsx`
6. Added committed smoke fixtures:
   - `docs/tests/test-pack/lorem_ipsum.pptx`
   - `docs/tests/test-pack/lorem_ipsum.xlsx`
7. Executed matrix run (timestamp `20260211-124133`) with results:
   - PASS: `md`, `txt`, `docx`, `pdf`, `pptx`, `xlsx`, `html`, `csv`
8. Format reliability gate marked complete in matrix/runtime truth docs.
9. Reproduced worker no-key reliability bug (pre-fix): overlays remained `claimed` after worker returned no-key error.
10. Implemented and deployed worker fix (`supabase/functions/worker/index.ts`, deployed worker version `6`) with strict/fallback claim release helper.
11. Verified post-fix no-key behavior: claimed overlays now return to `pending` with `last_error` set.
12. Re-verified cancellation path: overlays are released to `pending` with no claim residue.
13. Re-verified no-key behavior on a fresh run (`ff1905ba-9044-4f40-8d03-232e001c6cf9`) to confirm repeatable non-stranding behavior.
14. Verified invalid-key (401) path with controlled temporary test key (`e055acca-30c5-4642-beb4-500f591d05ba`): claims released to `pending`, `last_error` set, key marked invalid.
15. Removed temporary test key and confirmed no Anthropic key rows remain, preserving the pre-test baseline.
16. Deployed `user-api-keys` edge function (v2) for encrypted key save path.
17. Saved Anthropic key from local `.env` into `user_api_keys` via `POST /functions/v1/user-api-keys` (encrypted at rest).
18. Verified with `test-api-key` + worker run (`de64ec30-1831-4475-ad85-0b00b8f991d3`) that the current key is provider-invalid (`is_valid=false`), while claim-release safeguards remain correct.
19. Re-saved updated Anthropic key from `.env`; provider validation returned valid.
20. Verified happy path run (`ab8a3b40-757c-473f-a0c8-65ac007f74bc`): worker succeeded, overlay `ai_complete`, run `complete`, rollups aligned.
21. Verified retry-to-terminal-failed behavior (`7f50cdcb-f897-4566-bb87-de2f62e79884`) with invalid model override:
   - attempts 1-2: `pending` with incrementing `attempt_count`
   - attempt 3: `failed` with `attempt_count=3`
22. Verified failed-run rollup correctness:
   - run `complete`, `completed_blocks=0`, `failed_blocks=1`
23. Priority 2 worker reliability gate criteria satisfied with evidence doc updates.
24. Executed Priority 3 source/runtime alignment:
   - aligned worker fallback temperature to `0.3` and deployed `worker` v7
   - patched `user-api-keys` PATCH path to enforce provider-aware `base_url` validation and deployed `user-api-keys` v3
   - added missing repo migration `20260211091818_add_base_url_multi_provider.sql` to match live migration history
25. Applied claim-ordering migration (`017_claim_overlay_batch_block_index_ordering`) and verified runtime function body now orders by `blocks_v2.block_index`.
26. Ran transactional claim-order probe (`BEGIN ... ROLLBACK`) proving deterministic numeric ordering (`[0..11]` claimed == expected).
27. Updated canonical registry and gate tracker; Priority 3 marked passed.
28. Implemented prompt caching path in worker with rollback control and usage telemetry:
   - added request/env toggle (`prompt_caching_enabled`, `WORKER_PROMPT_CACHING_ENABLED`)
   - deployed `worker` v8
29. Added benchmark harness and executed paired OFF/ON runs:
   - script: `scripts/benchmark-worker-prompt-caching.ps1`
   - result artifact: `scripts/logs/prompt-caching-benchmark-20260211-183102.json`
   - run IDs: `25ce329c-b4a6-4b05-8634-05e1d8b99672` (OFF), `cc7c4da8-ac17-4491-a14d-50b8fb483589` (ON)
30. Benchmark showed small cost reduction (`~1.59%`) but cache usage counters remained `0` (no observed prompt-cache hits).
31. SQL quality comparison found one material mismatch (`action/final.content`) between OFF and ON on block `...:15`; Priority 4 marked failed pending corrective rerun.
32. Added Priority 4 evidence doc:
    - `docs/ongoing-tasks/complete/0211-worker-optimization-benchmark-results.md`
33. Reproduced JWT-gateway failure for ES256 user tokens on `worker` with `verify_jwt=true` (`401 Invalid JWT`).
34. Deployed `worker` v9 with `verify_jwt=false` plus internal auth (`requireUserId`) and run ownership guard.
35. Deployed `schemas` v12 with `verify_jwt=false` (function already uses `requireUserId`).
36. Updated benchmark auth mode so worker invocations use user access token by default.
37. Executed corrective prompt-caching benchmark pair on cache-eligible schema:
   - `cache_off`: `7af1b494-ad4b-401c-9bcb-e59386b9760b`
   - `cache_on`: `3e9dab67-9ede-491e-b50c-86642d78ad39`
38. Confirmed non-zero cache telemetry on ON run:
   - `cache_creation_input_tokens=1633`
   - `cache_read_input_tokens=45724`
39. Confirmed material parity on corrective pair:
   - `material_mismatch_blocks=0` (`action/final.format/final.content`)
40. Priority 4 marked passed; next active queue item is Priority 5.
41. Completed Priority 5 adaptive batching closure cycle:
   - updated worker batching response parsing/tool shape and schema-aware pack sizing behavior
   - deployed worker through v15 with function-level auth retained
   - final extraction benchmark artifact: `scripts/logs/worker-batching-benchmark-20260211-224355.json`
   - final revision-heavy benchmark artifact: `scripts/logs/worker-batching-benchmark-20260211-224635.json`
42. Verified Priority 5 gate evidence:
   - extraction call_count `29 -> 4 -> 2`, cost down `40.77%` and `46.73%`, material parity `0` mismatch blocks
   - revision-heavy call_count `29 -> 6 -> 6`, cost down `17.18%`, material parity `0` mismatch blocks
   - queue invariants remained true (`completed=29`, `failed=0` in final suites)
43. Priority 5 marked passed; next active queue item is Priority 6.
44. Completed Priority 6 runtime closure:
   - deployed `admin-config`, `runs`, `worker` with `--no-verify-jwt` and internal auth retained
   - set `SUPERUSER_EMAIL_ALLOWLIST` as function secret
   - applied migration `20260212114500_018_admin_runtime_policy_controls` to runtime via Supabase management SQL endpoint
   - verified seed and storage state (`admin_runtime_policy` count = 19)
45. Proved new-run policy uptake and mid-run snapshot stability:
   - toggled `worker.prompt_caching.enabled` from `true` -> `false` -> `true`
   - new-run proof: `d9e80ff2-a61a-49d4-a093-89a7b4b0421e` snapshot `true`, `63cfa335-7f99-4cc0-a3ca-a8ca4d60a7d9` snapshot `false`
   - in-flight proof: run `640cf4b0-6c6f-445b-bd13-ae80c1f2e73f` kept `prompt_caching=false` across two worker invocations even after global restore (`remaining_pending 24 -> 19`)
46. Proved audit visibility:
   - `admin-config` API returned audit rows for both toggles with explicit reasons
   - UI wiring confirmed to consume the same audit payload (`SuperuserSettings` fetches `admin-config?audit_limit=100` and renders `auditRows`)
47. Priority 6 marked passed; next active queue item is Priority 7.

Next:

1. Execute Priority 7 schema core workflow completion.
2. Produce Priority 7 evidence for wizard usability and deterministic save/fork/conflict behavior.
3. Keep queue sequencing strict: Priority 8 remains blocked until Priority 7 is explicitly `Passed`.

<!-- END SOURCE: dev-todos\0211-core-workflows-before-assistant-plan.md -->


---

<!-- BEGIN SOURCE: dev-todos\0211-session-handoff-resume-guide.md -->

# 0211 Session Handoff + Resume Guide

**Date:** 2026-02-12  
**Purpose:** Preserve execution continuity across account/session switches.

---

## 1) Current Truth Snapshot (as of this session)

0. Latest detailed handoff for closed Priority 5 work:
   - `docs/ongoing-tasks/complete/0212-session-handoff-priority5-core-pipeline.md`
1. Canonical admin config doc is:
   - `docs/ongoing-tasks/complete/0211-admin-config-registry.md`
2. Duplicate file was removed:
   - `docs/ongoing-tasks/0211-admin-config-registry-and-conflicts.md` (deleted)
3. Core ordered execution queue is:
   - `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
   - Note: this file is now the canonical pass/fail tracker (dependencies, gate ledger, and evidence contract).
4. Master sequencing gate doc is:
   - `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`
5. Assistant work remains deferred until core gates are complete.
6. Worker reliability evidence doc now exists:
   - `docs/ongoing-tasks/complete/0211-worker-runtime-reliability.md`
7. Worker no-key stranded-claim defect was fixed and deployed:
   - `supabase/functions/worker/index.ts`
   - deployed `worker` function version `6`
8. Additional worker reliability checks completed:
   - no-key path re-verified on fresh run (`ff1905ba-9044-4f40-8d03-232e001c6cf9`)
   - invalid-key 401 path verified (`e055acca-30c5-4642-beb4-500f591d05ba`)
   - temporary test key row removed after verification (no Anthropic key rows currently)
9. Key-management path update:
   - deployed `user-api-keys` edge function v2
   - saved updated Anthropic key from `.env` through encrypted save path
   - provider validation now passes and `user_api_keys.is_valid=true`
10. Priority 2 is now passed with complete evidence:
   - happy path run: `ab8a3b40-757c-473f-a0c8-65ac007f74bc`
   - retry-to-failed run: `7f50cdcb-f897-4566-bb87-de2f62e79884`
11. Priority 3 is now passed with complete evidence:
   - canonical registry locked and updated: `docs/ongoing-tasks/complete/0211-admin-config-registry.md`
   - claim ordering migration applied: runtime version `20260212004639` (`017_claim_overlay_batch_block_index_ordering`)
   - worker deployed at version `7` (temperature fallback aligned to `0.3`)
   - `user-api-keys` deployed at version `3` (PATCH `base_url` validation parity)
12. Repo/runtime migration parity restored for custom provider `base_url` contract:
   - runtime migration `20260211091818 add_base_url_multi_provider` is now represented in repo at
     `supabase/migrations/20260211091818_add_base_url_multi_provider.sql`
13. Priority 4 is now passed after corrective cycle:
    - deployed `worker` version `9` with internal auth (`requireUserId`) and run ownership guard
    - deployed `schemas` version `12` with `verify_jwt=false` (function-level auth retained)
    - corrective benchmark pair completed:
      - OFF run: `7af1b494-ad4b-401c-9bcb-e59386b9760b`
      - ON run: `3e9dab67-9ede-491e-b50c-86642d78ad39`
    - benchmark artifact: `scripts/logs/prompt-caching-benchmark-20260211-191241.json`
    - evidence doc: `docs/ongoing-tasks/complete/0211-worker-optimization-benchmark-results.md`
14. Priority 4 gate-pass evidence summary:
    - cache telemetry is non-zero on ON run (`cache_creation_input_tokens=1633`, `cache_read_input_tokens=45724`)
    - cost reduction recorded (`estimated_cost_usd_reduction_pct=50.24`)
    - material parity confirmed (`material_mismatch_blocks=0`)
15. Priority 5 is now passed with final benchmark/parity evidence:
    - deployed `worker` version `15` (`verify_jwt=false`, internal auth retained)
    - final extraction artifact: `scripts/logs/worker-batching-benchmark-20260211-224355.json`
    - final revision-heavy artifact: `scripts/logs/worker-batching-benchmark-20260211-224635.json`
    - extraction call_count: `29 -> 4 -> 2` with `0` material mismatch blocks
    - revision-heavy call_count: `29 -> 6 -> 6` with `0` material mismatch blocks
16. Priority 6 is now passed with runtime proof:
    - migration `20260212114500_018_admin_runtime_policy_controls` applied remotely
    - `SUPERUSER_EMAIL_ALLOWLIST` configured
    - `admin-config`, `runs`, `worker` deployed (`verify_jwt=false`, internal auth retained)
    - new-run policy change proof passed (`d9e80ff2-a61a-49d4-a093-89a7b4b0421e` vs `63cfa335-7f99-4cc0-a3ca-a8ca4d60a7d9`)
    - in-flight snapshot stability proof passed (`640cf4b0-6c6f-445b-bd13-ae80c1f2e73f`)
    - audit visibility proof passed in API and UI wiring
17. Queue head moved forward:
    - Priority 7 is now the first non-passed priority.
18. Priority 7 doc authority lock:
    - execution authority: `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md`
    - reference-only for P7 execution: `docs/ongoing-tasks/meta-configurator-integration/spec.md`, `docs/ongoing-tasks/0210-schema-wizard-and-ai-requirements.md`

---

## 2) Read-First List for Any New Session

Read in this order before making changes:

1. `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`
2. `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
3. `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md`
4. `docs/ongoing-tasks/complete/0211-admin-config-registry.md`
5. `docs/ongoing-tasks/complete/0211-source-format-reliability-matrix.md`
6. `docs/ongoing-tasks/complete/0211-source-format-smoke-results.md`
7. `docs/ongoing-tasks/0211-worker-token-optimization-patterns.md`
8. `docs/ongoing-tasks/meta-configurator-integration/spec.md`

---

## 3) Immediate Next Work (Do This First)

Current queue says start here:

### Priority 7 implementation cycle (schema core workflow)

1. Use `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md` as the primary execution contract.
2. Use `docs/ongoing-tasks/meta-configurator-integration/spec.md` as the deeper UX/reference spec.
3. Prove wizard-first manual schema creation path produces worker-compatible schema contracts (`properties`, `prompt_config`).
4. Prove deterministic save/fork/conflict (`409`) behavior and capture recovery-path evidence.
5. Update gate ledger and evidence docs only after Priority 7 exit criteria are satisfied.

Current implementation snapshot:

6. Route/navigation scaffold is implemented in web router (`/app/schemas/start|wizard|templates|templates/:templateId|apply`) and local schema workflow nav.
7. Wizard manual path is implemented at `web/src/pages/SchemaWizard.tsx` (5-step flow + `POST /schemas` save + `409` handling), plus template + existing-schema prefill.
8. Open P7 gate gaps are now explicitly narrowed to:
   - upload JSON classifier (wizard vs advanced routing),
   - nullable + nested object authoring parity in wizard subset,
   - preview compatibility pass/warn output,
   - in-wizard JSON escape hatch behavior,
   - Section 22.1 evidence capture.

---

## 4) Key Engineering Constraints (Do Not Drift)

1. One-at-a-time priority execution only.
2. No assistant/KG/vector/MCP build work until core gates are complete.
3. Preserve canonical terms already in docs:
   - run, block, overlay, prompt_config, staging/confirmed
4. Avoid new duplicate planning docs for the same topic.
5. No destructive git cleanup on unrelated workspace changes.

---

## 5) Known Risks to Watch

1. Worker runtime remains Anthropic-specific by contract; provider-policy runtime routing is still deferred.
2. Some non-P6 policy surfaces (provider registry and default prompt text) remain hardcoded by design and should be treated as future-scope work.
3. Prompt-caching rollout must include quality regression checks, not token-only optimization.
4. Existing workspace has many unrelated modified/untracked files; treat carefully.

---

## 6) Recommended Session Startup Checklist

1. `git status --short`
2. Confirm canonical docs exist:
   - `docs/ongoing-tasks/complete/0211-admin-config-registry.md`
   - `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
3. Confirm no stale reference to deleted duplicate file:
   - `rg -n "0211-admin-config-registry-and-conflicts\.md" docs -S`
4. Check Section 7 (`Gate Ledger`) in the core priority tracker and continue from the current non-passed priority.
5. Start execution and write evidence updates as you go.

---

## 7) Paste-Ready Context Prompt for Next Login

Use this prompt at the start of the next session:

```text
I need you to continue exactly from the current core workflow queue.

Start by reading these files in order:
1) docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md
2) docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md
3) docs/ongoing-tasks/complete/0211-admin-config-registry.md
4) docs/ongoing-tasks/complete/0211-source-format-reliability-matrix.md
5) docs/ongoing-tasks/complete/0211-source-format-smoke-results.md

Constraints:
- Execute one priority at a time.
- Assistant development remains deferred.
- Do not create duplicate planning docs.
- Do not run destructive git cleanup.
- Use the pass/fail tracker sections (entry/required evidence/exit) and update the gate ledger.

Continue Priority 7 execution: complete schema core workflow gates, add deterministic save/fork/conflict evidence, and update the pass/fail tracker and gate ledger.
```

---

## 8) Definition of Continuity Success

A resumed session is on track only if it:

1. Uses the same canonical docs.
2. Continues at the first non-passed priority in the gate ledger.
3. Produces date-stamped evidence updates after each completed step.


<!-- END SOURCE: dev-todos\0211-session-handoff-resume-guide.md -->


---

<!-- BEGIN SOURCE: dev-todos\0211-shell-v2-copilot-platform-plan.md -->

# Shell V2 + Copilot Integration Plan (Databricks-Style Baseline)

**Date:** 2026-02-11  
**Status:** Proposed implementation plan (not started)  
**Owner:** Platform frontend + Supabase functions  
**Scope:** Authenticated app shell, navigation IA, Copilot dock, schema-assist integration, visual system pass

---

## 1) Purpose

Define a structured, trackable implementation plan to evolve the platform UI toward a Databricks-like baseline layout and integrate a Copilot-style assistant that is consistent with current schema/worker specs.

This document is the execution tracker for that work.

---

## 2) Canonical References

- `docs/ongoing-tasks/meta-configurator-integration/spec.md`
- `docs/frontend/0208-visual-storyboard.md`
- `docs/frontend/design-tokens.md`
- `web/src/components/layout/AppLayout.tsx`
- `web/src/router.tsx`
- `web/src/pages/SchemaAdvancedEditor.tsx`

---

## 3) Current Repo Baseline

1. `AppShell` foundation exists with header + left navbar + main outlet.
2. Schema advanced editor route is live at `/app/schemas/advanced`.
3. Copilot backend endpoint (`/schema-assist`) is specified in docs but not implemented in `supabase/functions`.
4. Theme/tokens are centralized in `web/src/theme.ts`.
5. Side-nav + top-header direction is already aligned with storyboard decisions.

---

## 4) Intended End State

1. A persistent 3-region workspace shell for authenticated routes:
- left navigation rail
- top command/search bar
- right Copilot assistant dock
2. Copilot is platform-native, context-aware, and action-capable (`ask`, `suggest`, `apply`).
3. Schema authoring stays wizard-first with advanced JSON editor as escape hatch.
4. Copilot schema assistance uses platform keys only and remains separated from user API key infrastructure.
5. Visual system (spacing, density, surfaces, typography, panel proportions) feels consistent with a Databricks-style baseline.

---

## 5) Product Clarifications Locked (2026-02-11)

1. The right-side assistant is the platform's internal, customized, custom-trained assistant surface.
2. This assistant is not the same system as user-key worker AI runs.
3. User-provided API keys remain for worker execution on runs after schemas are defined and documents are processed into blocks.
4. The Databricks screenshot is a layout-density reference, not a literal visual clone target.
5. The left nav and top bar do not need the exact same geometric "joined bar" shape from the screenshot.
6. Priority is tighter spacing, smaller/tighter non-critical UI text, and a unified system-wide look and feel while preserving grid clarity.
7. This redesign should be done now, before the surface area grows and retrofit cost increases.

---

## 6) System Requirements List (Plan SRL)

**SRL-SHELL-1**: All authenticated routes render inside one consistent tri-panel shell on desktop.  
**SRL-SHELL-2**: Mobile behavior is defined and functional (assistant dock collapses to drawer/overlay).  
**SRL-SHELL-3**: Navigation is grouped by workflow area, not a flat utility list.  
**SRL-COPILOT-1**: Copilot state persists across route changes within the same session.  
**SRL-COPILOT-2**: Copilot receives route/page context (`project_id`, `schema_id`, `run_id`, selection metadata when available).  
**SRL-COPILOT-3**: Schema-focused actions are wired to `POST /schema-assist` contract.  
**SRL-COPILOT-4**: Platform key boundary is enforced; no dependency on `user_api_keys` for schema assistance.  
**SRL-COPILOT-5**: UI copy and architecture clearly distinguish internal assistant actions from worker-run actions using user keys.  
**SRL-UX-1**: Wizard-first schema creation remains primary path; advanced editor stays escape hatch.  
**SRL-UX-2**: Theme/tokens drive shell appearance; no page-local one-off styling for core shell regions.
**SRL-UX-3**: The shell follows a density-first system and does not require exact Databricks geometry replication.

---

## 7) Phased Plan

## Phase 0 - UX Contract Freeze

**Goal:** Lock behavior before implementation.  
**Deliverables:**
1. Shell region contract (left/top/main/right).
2. Copilot interaction model (`ask`, `suggest`, `apply`, error/retry).
3. Context contract and feature-flag plan.
4. Mobile fallback behavior.

### 0.1 Shell Region Contract (Desktop)

1. `LeftRail`: primary navigation + workspace switch context.
2. `TopCommandBar`: global search/command surface + session controls.
3. `MainCanvas`: route content area (`<Outlet />`) with page-owned layout.
4. `AssistantDock`: persistent right panel for internal assistant only.

### 0.2 Density + Spacing Contract (Initial v0 values)

1. Header height target: `48px` (reduce non-critical vertical space).
2. Left rail width target: `220px` expanded, `72px` collapsed.
3. Assistant dock width target: `360px` default, resizable `320-520px`.
4. Global page padding target: `12px` default on desktop.
5. Non-critical UI copy target size: `12-13px` (labels, metadata, helper text).
6. Grid readability guardrail: do not reduce core grid text below current readable baseline.

### 0.3 Mobile Behavior Contract

1. `LeftRail` becomes drawer (overlay).
2. `AssistantDock` becomes slide-over panel; default closed on mobile.
3. `TopCommandBar` remains visible with compact controls.
4. Main content stays first priority; assistant never permanently consumes canvas width on mobile.

### 0.4 Assistant Context Contract

Each assistant request payload includes:
1. `route` (current pathname + key params).
2. Optional `project_id`.
3. Optional `schema_id`.
4. Optional `run_id`.
5. Optional selection summary (count + type only; not full data by default).
6. Timestamp + client session id for traceability.

### 0.5 Assistant Action Contract (v0)

1. `ask`: explanation/guidance response.
2. `suggest`: propose schema fields/prompt changes.
3. `apply`: apply user-approved suggestion into wizard/editor state.
4. `retry`: repeat failed call with same payload.

Hard boundary:
1. Assistant actions for schema authoring route to platform `schema-assist`.
2. Worker-run execution paths remain separate and continue to use user-key logic where applicable.

### 0.6 Feature Flags Contract

1. `ff_shell_v2`: enables new shell regions/layout.
2. `ff_assistant_dock`: enables right assistant panel UI.
3. `ff_schema_assist`: enables server-backed assistant actions.

Rollout order:
1. Internal only.
2. Selected pilot users.
3. General availability.

### 0.7 UI Copy Guardrails

1. Internal assistant label must not imply user-key run execution.
2. Worker actions must remain explicitly named as run processing/execution.
3. Help text must state separation when both assistant and worker actions are visible.

**Verification:**
1. SRL checklist approved in this doc.
2. No unresolved contract ambiguity for shell regions or copilot actions.
3. Product language for assistant vs worker AI is unambiguous in all new shell surfaces.

---

## Phase 1 - Shell V2 Foundation

**Goal:** Replace current app chrome with explicit shell regions and right dock host.

**Primary files:**
- `web/src/components/layout/AppLayout.tsx`
- `web/src/components/shell/LeftRail.tsx` (new)
- `web/src/components/shell/TopCommandBar.tsx` (new)
- `web/src/components/shell/AssistantDockHost.tsx` (new)
- `web/src/components/shell/ShellState.tsx` (new)

**Key tasks:**
1. Extract shell regions into dedicated components.
2. Add right-panel docking behavior (open/close, resize, persisted preference).
3. Ensure `/app/*` routes render correctly inside the new shell.

**Verification:**
1. Manual route sweep: `/app`, `/app/schemas`, `/app/projects/:projectId`, `/app/projects/:projectId/documents/:sourceUid`.
2. Desktop and mobile layout checks.

---

## Phase 2 - Navigation IA + Workspace Home

**Goal:** Make navigation and workspace entry aligned with a Databricks-like baseline.

**Primary files:**
- `web/src/components/shell/nav-config.ts` (new)
- `web/src/components/layout/AppLayout.tsx`
- `web/src/router.tsx`
- `web/src/pages/WorkspaceHome.tsx` (new) or `web/src/pages/Projects.tsx` extension

**Key tasks:**
1. Move nav structure into config with section groups.
2. Add global workspace home surface with quick actions + recent items + status summary.
3. Preserve existing deep links and breadcrumbs.

**Verification:**
1. Active nav state is correct for nested routes.
2. Top-level workflows are reachable in <=2 clicks.

---

## Phase 3 - Copilot Dock UI Framework

**Goal:** Ship a persistent, reusable assistant UI shell before backend wiring.

**Primary files:**
- `web/src/components/assistant/AssistantPanel.tsx` (new)
- `web/src/components/assistant/AssistantThread.tsx` (new)
- `web/src/components/assistant/AssistantComposer.tsx` (new)
- `web/src/components/assistant/ContextChips.tsx` (new)
- `web/src/lib/assistant/store.ts` (new)

**Key tasks:**
1. Implement dock UI and thread state.
2. Add route/context chips to each prompt turn.
3. Add loading/error/empty states and keyboard behavior.

**Verification:**
1. Panel remains mounted across route transitions.
2. Thread and draft persist while navigating.

---

## Phase 4 - Backend `schema-assist` Edge Function

**Goal:** Implement server contract for schema copilot operations.

**Primary files:**
- `supabase/functions/schema-assist/index.ts` (new)
- `supabase/functions/_shared/*` (reuse/create helpers)
- `docs/ongoing-tasks/0210-schema-wizard-and-ai-requirements.md` (update status section)

**Required operations:**
1. `suggest_fields`
2. `suggest_prompts`
3. `modify_schema`
4. `question`

**Constraints:**
1. Authenticated JWT required.
2. JSON-only responses.
3. Suggested schemas maintain v0 compatibility (`type: object`, top-level `properties` for worker/grid path).
4. No dependency on user-key storage.

**Verification:**
1. Contract-level request/response validation.
2. Failure-path tests for invalid operation and malformed payload.

---

## Phase 5 - Wizard + Copilot Integration

**Goal:** Make schema creation wizard-first with assistant help integrated into steps.

**Primary files:**
- `web/src/pages/Schemas.tsx`
- `web/src/pages/SchemaWizard.tsx` (new)
- `web/src/components/schema-wizard/*` (new)
- `web/src/pages/SchemaAdvancedEditor.tsx` (compatibility + handoff tightening)

**Key tasks:**
1. Implement wizard steps per canonical spec.
2. Connect Copilot suggestions into field/prompt authoring flow.
3. Keep advanced editor as full-screen power-user route.
4. Preserve fork-by-default save semantics and 409 conflict handling.

**Verification:**
1. User creates schema without writing JSON.
2. Suggested schema can be applied and saved through existing `POST /schemas` path.
3. Wizard output remains compatible with worker/grid conventions.

---

## Phase 6 - Visual System Pass (Databricks-Like Baseline)

**Goal:** Align shell and key surfaces around one coherent density/visual language.

**Primary files:**
- `web/src/theme.ts`
- `web/src/theme.css`
- `docs/frontend/design-tokens.md`
- `web/src/components/blocks/BlockViewerGrid.tsx` (visual token alignment only)

**Key tasks:**
1. Define shell-specific tokens: rail width, command bar height, assistant dock width, panel spacing.
2. Increase hierarchy clarity (surface levels, borders, section headers, list density).
3. Align AG Grid container styling with shell tokens.

**Verification:**
1. No major visual mismatch across Projects, ProjectDetail, DocumentDetail, Schemas.
2. Dark/light mode remains legible and structurally consistent.

---

## Phase 7 - QA, Observability, Rollout

**Goal:** Ship safely with staged rollout and measurable behavior.

**Primary files:**
- frontend smoke/interaction tests (location TBD in `web/`)
- `docs/ongoing-tasks/0210-work-done-status-log.md` (status updates)

**Key tasks:**
1. Add smoke tests for shell rendering and assistant open/send flows.
2. Add schema-assist API contract checks.
3. Add event logging for assistant actions and error categories.
4. Gate rollout behind feature flags for internal users first.

**Verification:**
1. Core smoke checks pass before enabling broadly.
2. Rollback path is documented (feature flag off restores old behavior).

---

## 8) Risks and Mitigations

1. **Risk:** Layout refactor breaks existing page spacing and nav behavior.  
**Mitigation:** Phase 1 is structure-only, preserve route surfaces and run route sweep after each shell change.

2. **Risk:** Copilot scope expands into generic chat before action wiring is stable.  
**Mitigation:** Keep v0 action set strict (`ask`, `suggest`, `apply`) with schema-first workflows.

3. **Risk:** Advanced editor and wizard diverge on schema conventions.  
**Mitigation:** Shared schema normalizer + compatibility validator used by both flows.

4. **Risk:** Key boundary confusion between platform AI and user-run AI.  
**Mitigation:** Enforce separate code path and configuration for `schema-assist`.

---

## 9) Tracking Checklist

- [ ] Phase 0 complete
- [ ] Phase 1 complete
- [ ] Phase 2 complete
- [ ] Phase 3 complete
- [ ] Phase 4 complete
- [ ] Phase 5 complete
- [ ] Phase 6 complete
- [ ] Phase 7 complete

---

## 10) Definition of Done

1. Tri-panel shell is the default authenticated app layout.
2. Copilot panel is persistent, context-aware, and operational.
3. `schema-assist` endpoint is implemented and wired to frontend assistant actions.
4. Schema creation path is wizard-first and supports assisted authoring.
5. Visual/token system produces consistent shell behavior across core pages.
6. Rollout is feature-flagged with baseline observability.

---

## 11) Progress Log

### 2026-02-11 (Phase 1 partial)

Completed:
1. Added right-side assistant dock in app shell with explicit open/close controls (visible/not visible).
2. Refactored shell layout into dedicated components:
- `web/src/components/shell/TopCommandBar.tsx`
- `web/src/components/shell/LeftRail.tsx`
- `web/src/components/shell/AssistantDockHost.tsx`
3. Rewired `web/src/components/layout/AppLayout.tsx` to use extracted shell components.

Verification:
1. `npm exec tsc -- -b` (from `web/`) passed.
2. `npm exec vite build` (from `web/`) passed.

### 2026-02-11 (Phase 1 hardening)

Completed:
1. Added shell feature flags:
- `VITE_FF_SHELL_V2`
- `VITE_FF_ASSISTANT_DOCK`
2. Added centralized flag parser at `web/src/lib/featureFlags.ts`.
3. Wired `AppLayout` to conditionally render assistant dock/toggle from flags.
4. Persisted assistant open/closed state using local storage key:
- `blockdata.shell.assistant_open`
5. Updated `web/.env.example` with the new flag keys.

Verification:
1. `npm exec tsc -- -b` (from `web/`) passed.
2. `npm exec vite build` (from `web/`) passed.

### 2026-02-11 (Phase 2 partial: nav IA extraction)

Completed:
1. Added grouped nav configuration at `web/src/components/shell/nav-config.ts`.
2. Updated `LeftRail` to render sectioned nav groups from config (Workspace/Platform).
3. Preserved active-route logic for project-scoped paths.

Verification:
1. `npm exec tsc -- -b` (from `web/`) passed.
2. `npm exec vite build` (from `web/`) passed.

### 2026-02-11 (Phase 2 partial: workspace-home route cutover)

Completed:
1. Added `WorkspaceHome` page as a compact launch surface:
- quick actions (open projects, open schemas, upload to latest project)
- compact workspace stats (projects, documents, ingested, processing)
- recent projects and recent documents panels
2. Changed router mapping:
- `/app` -> `WorkspaceHome`
- `/app/projects` -> `Projects`
3. Updated project-oriented breadcrumbs and redirects to use `/app/projects`.
4. Updated left-rail nav grouping to keep Home and Projects as separate entries.

Verification:
1. `npm exec tsc -- -b` (from `web/`) passed.
2. `npm exec vite build` (from `web/`) passed.

<!-- END SOURCE: dev-todos\0211-shell-v2-copilot-platform-plan.md -->


---

<!-- BEGIN SOURCE: dev-todos\0211-worker-token-optimization-patterns.md -->

# Worker Token Optimization Patterns

**Date:** 2026-02-11
**Status:** Design analysis â€” informs worker v2 implementation
**Depends on:** Worker pipeline (Workstream B in `0211-core-workflows-before-assistant-plan.md`)

---

## 1) Problem Statement

The current worker (`supabase/functions/worker/index.ts`) processes blocks one-per-call, sending the full system instructions (schema global prompt) with every API call. For a representative workload â€” a 50K-word document with a 25K-token reference document as system instructions â€” this means:

- 200 blocks, 200 API calls
- 25,000 tokens of identical system instructions repeated 200 times
- **5,000,000 tokens of pure waste** ($15 of a $16 total cost)
- Actual block content across the entire document: ~65,000 tokens ($0.20)

The system instructions constitute **97% of the input cost** and are identical on every call.

---

## 2) Reference Calculation

Parameters (concrete example):

| Parameter | Value | Source |
|---|---|---|
| Document | 50,000 words | ~65,000 tokens |
| System instructions | 12,500 words | ~25,000 tokens (e.g. Elements of Style) |
| Block count | ~200 | Avg ~250 words/block (paragraph-level mdast) |
| Tokens per block | ~325 | 65,000 / 200 |
| Tool/schema definition | ~500 tokens | Stable across calls |
| Per-block prompt template | ~100 tokens | "Extract the following fields..." |
| Output per block | ~200 tokens | Structured JSON extraction result |
| Model | Claude Sonnet 4.5 | $3/M input, $15/M output |

### Cost by approach

| Approach | API Calls | Total Cost | Savings | Implementation Effort |
|---|---|---|---|---|
| **Current (1 block/call)** | 200 | **$15.97** | â€” | â€” |
| Prompt caching only | 200 | $2.27 | 86% | Trivial (1 header) |
| Multi-block batching (10/call) | 20 | $2.12 | 87% | Medium (restructure worker) |
| Caching + batching | 20 | $0.89 | 94% | Medium |
| Caching + batching + Batch API | 20 | $0.45 | 97% | Medium + async queue |

### Where the money goes (current approach)

| Component | Total Tokens | Cost | % of Input |
|---|---|---|---|
| System instructions repeated 200x | 5,000,000 | $15.00 | 97.2% |
| Tool definition repeated 200x | 100,000 | $0.30 | 1.5% |
| Per-block prompts | 20,000 | $0.06 | 0.3% |
| **Actual block content** | **65,000** | **$0.20** | **1.0%** |

---

## 3) Optimization Tiers

### Tier 1: Prompt Caching (Immediate Win)

**What:** Anthropic's prompt caching stores the system prompt server-side across calls. Subsequent calls pay 10% of the input price for cached tokens.

**How:** Add `cache_control: { type: "ephemeral" }` to the system message in `callLLM`.

**Savings:** 86% (system instructions go from $3/M to $0.30/M on reads).

**Quality risk:** None. The model receives identical content.

**Pricing (Anthropic):**
- Cache write (first call): input price x 1.25
- Cache read (subsequent): input price x 0.10
- Cache TTL: 5 minutes (refreshed on each hit)

**Implementation:** One-line change in the worker's `callLLM` function. The system message gets a `cache_control` block, and the `anthropic-beta: prompt-caching-2024-07-31` header is added.

### Tier 2: Multi-Block Batching

**What:** Pack multiple blocks into a single API call. The system instructions are sent once per batch instead of once per block.

**How:** Restructure the worker to:
1. Calculate available context budget: `context_limit - system_tokens - tool_tokens - output_reserve`
2. Pack as many blocks as fit into the remaining input budget
3. Modify the tool schema to return an array of per-block results
4. Split into batches and call the API once per batch

**Batch sizing for the reference workload:**

| Context Window | System + Tool | Output Reserve | Available for Blocks | Blocks/Call | Total Calls |
|---|---|---|---|---|---|
| 200K (Sonnet) | 25,500 | 20,000 | 154,500 | ~363 (all 200 fit) | 1-2 |
| 128K (GPT-4.1) | 25,500 | 16,000 | 86,500 | ~203 (all 200 fit) | 1 |
| 32K (smaller models) | 25,500 | 4,000 | 2,500 | ~5 | 40 |

**Output token constraint:** The real limiter is often output, not input. With 200 tokens output per block and 8,192 max output tokens, that's ~40 blocks per call. With higher output limits (some models support 16K-64K), more blocks fit.

**Practical batch size:** 10-40 blocks per call depending on model output limits.

**Quality risk:** Low for extraction tasks. The model processes each block independently within the same call. Quality may slightly degrade at very high block counts if the model loses focus, but structured tool output with per-block keys mitigates this.

### Tier 3: RAG Over System Instructions (Selective Retrieval)

**What:** Instead of sending the full 25K-token reference document on every call, pre-index it and retrieve only the rules relevant to each block's content.

**How:**
1. Chunk the reference document by rule/chapter
2. Embed chunks into a vector index (pgvector in Supabase, or an external service)
3. For each block (or batch), retrieve the top-K most relevant chunks
4. Send only those chunks (~2-3K tokens) as system context

**Savings:** Reduces system instruction overhead from 25K to ~2-3K tokens per call â€” a further 8-10x on the system portion.

**Quality risk:** **Moderate.** Retrieval misses mean the model won't apply rules it didn't receive. For a style guide with 18 distinct chapters, retrieval quality is decent but imperfect. A rule about comma usage won't be retrieved for a block that happens to have a comma problem that's described differently than the retrieval query expects.

**When it's worth it:** Large reference corpora (legal codes, multi-document style guides, domain knowledge bases) where only a fraction is relevant per block. Less valuable for a single coherent style guide applied uniformly.

### Tier 4: Batch API (Async Processing)

**What:** Anthropic's Batch API accepts up to 10,000 requests and processes them asynchronously within 24 hours at 50% discount on all token costs.

**How:** Instead of calling the Messages API synchronously per batch, submit all batches as a single Batch API request. Poll for completion or register a webhook.

**Savings:** 50% off the already-optimized cost. Stacks with caching and batching.

**Quality risk:** None. Same model, same outputs â€” just async.

**Tradeoff:** Results are not immediate. Acceptable for batch document processing, not for interactive/real-time use cases.

---

## 4) Architecture Pattern: Worker as MCP Bridge

### Constraint

Models called via API (Anthropic, OpenAI, Google) **cannot** make outbound connections. They cannot connect to MCP servers, databases, or any external service. They only see what the caller puts in the request: messages, tools, system prompt.

### Pattern

The **worker** acts as the MCP client, bridging between the model's tool calls and the platform's data layer:

```
User's model       Worker              Platform MCP Server     PostgreSQL
(on Anthropic)  â†â†’  (Supabase Edge)  â†â†’  (Streamable HTTP)  â†â†’  (Supabase DB)
     â†‘                    â†‘
 tool_use/result      MCP protocol
 (API wire format)    (standard)
```

1. Platform hosts an MCP server (Streamable HTTP transport) exposing data access tools
2. Worker connects to the MCP server as a client
3. Worker translates MCP tool definitions into the provider's tool format (Anthropic `tools[]`, OpenAI `functions[]`, etc.)
4. Model returns `tool_use` â†’ worker relays to MCP server â†’ gets result â†’ sends `tool_result` back to model
5. Multi-turn loop until the model produces its final structured output

### MCP Tools for Token Optimization

| Tool | Purpose | Token Impact |
|---|---|---|
| `search_style_rules(query)` | RAG over reference document â€” return relevant rules only | 25K â†’ ~2K per call |
| `get_block_batch(start, count)` | Model pulls blocks on demand, enabling streaming/pagination | Enables lazy loading |
| `get_schema_for_block_type(type)` | Return only schema fields relevant to this block type | Reduces schema overhead |
| `lookup_previous_results(block_uid)` | Check neighboring blocks' results for consistency | Avoids redundant analysis |

### Multi-Provider Benefit

The platform already supports 4 providers (Anthropic, OpenAI, Google AI, Custom). A single MCP server defines the data access layer once. Each provider's worker adapter translates between:

- MCP tool definitions â†” Anthropic `tools[]`
- MCP tool definitions â†” OpenAI `functions[]`
- MCP tool definitions â†” Google `functionDeclarations[]`

One data layer, any model.

### When the Model Decides What It Needs

The shift from "worker pre-loads everything into the prompt" to "model requests what it needs via tools" enables:

- **Heading block?** Model skips `search_style_rules`. Zero reference tokens consumed.
- **Long paragraph?** Model calls `search_style_rules("comma splices, passive voice")` â†’ gets 2K tokens of relevant rules.
- **Block references a defined term?** Model calls `lookup_previous_results` for consistency checking.
- **Simple block type (e.g., image caption)?** Model uses a cheaper/faster sub-tool or skips entirely.

This is fundamentally different from prompt caching (still sends everything, just cheaper). The model consumes only the tokens it actually needs.

---

## 5) Pre-Filtering: Skip Blocks That Don't Need Processing

Not all blocks in a document need LLM analysis. The worker can skip blocks before calling the API:

| Block Type | Skip Condition | Savings |
|---|---|---|
| `image` | No text content to analyze | 100% for these blocks |
| `table` | Schema doesn't define table-relevant fields | 100% for these blocks |
| `heading` | Length < 10 words, no style rules apply | 100% for these blocks |
| `code_block` | Schema is about prose style, not code | 100% for these blocks |
| Empty/whitespace | No content | 100% for these blocks |

For a typical document, 10-30% of blocks may be skippable, reducing the total block count before any API calls.

---

## 6) Model Routing: Right Model for the Job

Not all blocks need the most capable (and expensive) model:

| Block Characteristic | Suggested Model | Cost Ratio |
|---|---|---|
| Complex analysis, nuanced rules | Claude Sonnet 4.5 / GPT-4.1 | 1x (baseline) |
| Simple extraction, clear fields | Claude Haiku / GPT-4.1-mini | 0.04-0.10x |
| Binary classification (relevant/not) | Haiku / Flash | 0.04x |

The worker can route based on block type, content length, or schema complexity. A two-pass approach:
1. **Pass 1 (cheap model):** Classify blocks as simple/complex
2. **Pass 2 (appropriate model):** Process each block with the model matched to its complexity

---

## 7) Implementation Priority

Ordered by impact-to-effort ratio:

| Priority | Optimization | Effort | Impact | Cumulative Cost |
|---|---|---|---|---|
| **1** | Prompt caching | Trivial | 86% savings | $2.27 |
| **2** | Multi-block batching | Medium | +8% savings | $0.89 |
| **3** | Pre-filtering | Low | Variable (10-30% fewer blocks) | $0.60-0.80 |
| **4** | Batch API (async) | Medium | +50% off remaining | $0.30-0.45 |
| **5** | Model routing | Medium | Variable per schema | Depends on mix |
| **6** | MCP bridge + RAG | High | Replaces system instructions with retrieval | $0.20-0.30 |

### Recommended implementation sequence

**Phase 1 (immediate):** Add prompt caching to the existing worker. One-line change, zero risk, 86% savings.

**Phase 2 (worker v2):** Restructure worker for multi-block batching. This is the natural point to also add pre-filtering. Combined with caching, achieves 94%+ savings.

**Phase 3 (platform maturity):** MCP bridge architecture for multi-provider tool access, RAG over reference documents, and model routing. This is the long-term architecture that scales to large reference corpora and diverse schemas.

---

## 8) Key Constraints and Tradeoffs

| Constraint | Impact | Mitigation |
|---|---|---|
| Output token limits (8K default) | Caps blocks-per-batch at ~40 | Use models with higher output limits; split into more batches |
| Prompt cache TTL (5 min) | Cache evicts if worker is idle | Keep batches flowing; pre-warm cache |
| RAG retrieval quality | Missed rules = missed analysis | Use full context for critical schemas; RAG for large corpora |
| Multi-block quality degradation | Model may lose focus on large batches | Test quality at various batch sizes; find the sweet spot |
| Multi-provider tool format differences | Each API has different tool calling conventions | MCP abstraction layer normalizes this |
| Batch API latency (up to 24h) | Not suitable for interactive use | Offer both: real-time (Tier 1-2) and async batch (Tier 4) |

---

## 9) Context Window Reference

For batch sizing calculations:

| Model | Context Window | Max Output | Provider |
|---|---|---|---|
| Claude Sonnet 4.5 | 200K | 8,192 (default) / 64K (extended) | Anthropic |
| Claude Haiku 4.5 | 200K | 8,192 | Anthropic |
| GPT-4.1 | 1M | 32,768 | OpenAI |
| GPT-4.1-mini | 1M | 32,768 | OpenAI |
| Gemini 2.5 Pro | 1M | 65,536 | Google |
| Gemini 2.5 Flash | 1M | 65,536 | Google |

With GPT-4.1 or Gemini 2.5's 1M context, the entire 50K-word document + 25K-token reference + all 200 blocks could be processed in a **single call** if the output token limit allows.

<!-- END SOURCE: dev-todos\0211-worker-token-optimization-patterns.md -->


---

<!-- BEGIN SOURCE: dev-todos\phase-2-integrations\0211-internal-assistant-development-direction.md -->

# Phase 2 Integrations: Internal Assistant Development Direction

**Date:** 2026-02-11  
**Status:** Directional architecture + delivery plan (**deferred until core workflows/pipelines are production-stable**)  
**Core-first active plan:** `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`  
**Scope:** Internal platform assistant grounded in platform data (BlockData artifacts, specs, guides), with KG + vector retrieval + MCP tool access to platform CLI  
**Audience:** Platform engineering, data/ML engineering, product, and operations

---

## 1) Executive Direction

Use a **retrieval-first, tool-augmented assistant** architecture:

1. Keep the base model general-purpose.
2. Ground responses using platform-owned context (KG + vectors + lexical retrieval).
3. Route operational actions through explicit tools (CLI via MCP), not free-form model output.
4. Enforce strict separation between:
- `Internal Assistant AI` (platform-owned assistant in side panel)
- `Worker AI` (user-key execution for runs after schema definition)

This approach is the current production standard for specialized assistants and avoids the risk/cost of premature base-model fine-tuning.

---

## 1.1 Activation Gate (Sequencing Lock)

This assistant program is **intentionally sequenced after core platform completion**.

Do not start assistant implementation until the following gates are met:

1. Conversion/ingest pipeline is stable for required source formats.
2. Worker/run processing is live, reliable, and operationally monitored.
3. Schema core workflows (wizard + advanced editor + persistence/fork semantics) are complete.
4. Review/export core workflows are complete and hardened.
5. Core operational hardening (tests, permissions, smoke matrix, incident basics) is in place.

Until these gates are met, this document remains architectural guidance only.

---

## 2) Non-Negotiable Boundaries

### 2.1 AI system boundary

1. Internal assistant:
- Uses platform-managed credentials.
- Serves product guidance, schema guidance, and platform operations.
- Lives in the right-side assistant dock in the app shell.

2. Worker AI:
- Uses user-provided API keys (or worker-specific path already defined by platform policy).
- Performs run/block processing according to schema-defined fields and prompt config.
- Must remain a separate execution path from assistant requests.

### 2.2 Action safety boundary

1. Read-only operations are default.
2. Mutating operations require explicit confirmation and auditable execution.
3. Tool execution must be constrained to authorized project/user scope.

### 2.3 Grounding boundary

1. Assistant answers should include citations/evidence references.
2. Assistant must prefer "not enough evidence" over speculative answers when context confidence is low.

---

## 3) Current Platform Assets to Reuse

Leverage existing platform artifacts and conventions:

1. Core data flow and IDs:
- `projects` -> `documents_v2` -> `blocks_v2` -> `runs_v2` -> `block_overlays_v2`
- schema artifacts in `schemas`

2. Existing schema guidance contract:
- `schema-assist` operations already specified in `docs/ongoing-tasks/meta-configurator-integration/spec.md`

3. Existing shell surface:
- right-side assistant area already integrated in app layout and can be shown/hidden

4. Existing docs/spec ecosystem:
- `docs/ongoing-tasks/*`
- platform guides and future "how to use platform" documentation

---

## 4) Target Architecture (Reference Blueprint)

## 4.1 Layers

1. **UI layer (web app):**
- Assistant panel (thread + composer + context chips + action cards)
- Receives citations and action confirmations

2. **Assistant orchestration layer:**
- Intent classification
- Retrieval planning (KG/vector/lexical blend)
- Tool routing and confirmation logic
- Final response assembly with citations

3. **Knowledge layer:**
- Vector index for semantic retrieval
- Lexical index for exact terminology and identifiers
- Knowledge graph for hierarchical and relational traversal

4. **Tool layer:**
- Platform CLI commands (JSON outputs)
- MCP server exposing read/action tools with policy checks

5. **Policy + observability layer:**
- Access control, action logs, result traceability, eval metrics

## 4.2 Request lifecycle

1. User asks question in assistant panel.
2. Orchestrator determines intent (`question`, `suggest`, `action`).
3. Orchestrator retrieves scoped context (project/user constrained).
4. If action intent: produce plan + request confirmation.
5. Execute via MCP tool (CLI wrapper) when confirmed.
6. Return response with citations, tool results, and confidence signal.

---

## 5) Knowledge Subsystem Direction

## 5.1 Source corpus (v1)

1. BlockData artifacts:
- processed block content and metadata from `blocks_v2`
- schema and run metadata from `schemas` and `runs_v2`

2. Product/platform knowledge:
- specs, issues, status docs, implementation direction docs
- "how to use platform" guides as they are authored

## 5.2 Chunking and indexing strategy

1. Docs/specs:
- chunk by semantic sections (heading-based), paragraph-level fallback
- preserve section path metadata

2. Block content:
- chunk by block identity; optionally merge adjacent small blocks for retrieval quality
- keep `project_id`, `source_uid`, `block_uid`, `block_type`, and locator metadata

3. Vector index:
- embeddings for semantic retrieval
- include stable IDs and source metadata in each vector record

4. Lexical index:
- support exact match on schema fields, IDs, table names, error strings, and operator terms

## 5.3 KG construction direction

Build a hierarchical + relational graph from platform artifacts:

1. Node types:
- `Project`, `Document`, `Block`, `Schema`, `Run`, `OverlayField`, `GuideSection`, `SpecRequirement`, `IntegrationCapability`

2. Edge types:
- `contains`, `references`, `defines`, `generated_from`, `uses_schema`, `belongs_to`, `depends_on`, `maps_to`

3. KG goals:
- support relationship-aware retrieval ("how does X relate to Y?")
- support path-based explanations and citations

## 5.4 Sync model

1. Initial backfill pipeline.
2. Incremental updates on document/schema/run changes.
3. Scheduled reconciliation to fix drift.

---

## 6) MCP + CLI Integration Direction

## 6.1 CLI contract (required)

1. Commands return strict JSON (`--json` default for assistant-facing pathways).
2. Each action supports:
- `dry-run`
- `execute`
- machine-readable status/result/error

3. Command families:
- `read` (status, metadata, diagnostics)
- `action` (safe mutations, retries, orchestrated operations)

## 6.2 MCP tool exposure

Expose CLI and knowledge operations through an MCP server with capability-scoped tools:

1. Knowledge tools:
- `search_docs`
- `search_vectors`
- `traverse_kg`
- `resolve_context_bundle`

2. Platform read tools:
- `get_project_summary`
- `get_document_state`
- `get_run_status`
- `get_schema_summary`

3. Platform action tools:
- `apply_schema_to_project`
- `trigger_run_pending`
- `retry_failed_blocks`
- `export_project_outputs`

All action tools require explicit user confirmation in assistant UX.

## 6.3 Access control model

1. Tool invocation includes authenticated user context.
2. MCP layer validates project ownership/authorization before CLI execution.
3. No cross-tenant or cross-user leakage in retrieval or tool access.

---

## 7) Assistant Orchestration Design

## 7.1 Intent routing

Route each request to one of:

1. `KnowledgeQnA` (read-only answer + citations)
2. `SchemaGuidance` (field/prompt/schema suggestions; integrates with `schema-assist` path)
3. `PlatformAction` (proposal + confirmation + tool execution)

## 7.2 Retrieval policy

Use hybrid retrieval by default:

1. Vector candidates (semantic).
2. Lexical candidates (exact terms and IDs).
3. KG expansion (relationship and hierarchy).
4. Rerank combined candidates for final context window.

## 7.3 Response policy

1. Include source references/citations.
2. Separate "facts from retrieved context" vs "assistant inference".
3. For low confidence or low evidence, return explicit uncertainty and suggested next checks.

---

## 8) Data and API Contracts (v1 Direction)

Define assistant API contracts early:

1. `POST /assistant/query`
- input: message + UI context (`route`, `project_id`, optional `schema_id`, optional `run_id`)
- output: response text + citations + optional action plan

2. `POST /assistant/action/confirm`
- input: action token + confirmation
- output: execution result with tool logs (sanitized for UI)

3. `POST /assistant/feedback`
- input: thumbs up/down + reason category + optional correction
- output: logged feedback id

Keep contracts versioned (`v1`, `v1.1`) to avoid client/server drift.

---

## 9) Security, Governance, and Audit

1. Maintain full execution audit for every assistant action:
- who asked
- what context used
- what tool executed
- what changed
- result code

2. Redact secrets and sensitive payloads in logs.

3. Add policy checks before action execution:
- authorization
- resource state preconditions
- dry-run feasibility

4. Add reversible operations where possible (or explicit rollback guidance in action responses).

---

## 10) Evaluation and Quality Program

## 10.1 Offline eval set

Build a curated test set from:

1. platform docs/spec questions
2. schema authoring questions
3. operations diagnostics questions
4. action-intent prompts with safe/unsafe variants

## 10.2 Core metrics

1. Grounded answer rate
2. Citation precision
3. Action success rate
4. Wrong-action prevention rate
5. Hallucination/error incidence
6. Latency percentile (P50/P95)

## 10.3 Human-in-loop review

1. Weekly review of failed/low-confidence sessions.
2. Feed corrections into retrieval/reranking and prompt policy improvements.

---

## 11) Phased Delivery Plan

## Phase A â€” Foundation (read-only assistant)

1. Build ingestion/chunking/indexing for docs + block artifacts.
2. Implement hybrid retrieval and citation response.
3. Ship assistant for read-only knowledge help in the side panel.

**Exit criteria:** grounded Q&A with citations in authorized scope.

## Phase B â€” Schema guidance integration

1. Integrate schema guidance flows with `schema-assist` contract.
2. Support "suggest/apply" into schema wizard and advanced editor context.

**Exit criteria:** assistant can produce schema-help suggestions that are compatible with platform schema conventions.

## Phase C â€” Action tools with confirmation

1. Add MCP-exposed CLI read/action tools.
2. Enforce explicit confirmation UX for mutation actions.
3. Add action audit logs.

**Exit criteria:** assistant can execute approved operational workflows safely.

## Phase D â€” Optimization and governance hardening

1. Improve reranking and KG traversal quality.
2. Expand eval suite and policy checks.
3. Add progressive rollout gates and incident playbooks.

**Exit criteria:** production readiness with measurable quality and operational controls.

---

## 12) Anti-Patterns to Avoid

1. Training/fine-tuning a base model before retrieval/tool architecture is mature.
2. Letting assistant execute mutating commands without confirmation.
3. Mixing assistant credentials and worker/user-key execution paths.
4. Shipping without traceable citations or execution audit.
5. Building vector-only retrieval without lexical/KG complement.

---

## 13) Immediate Next Steps (Recommended)

1. Ratify this direction as the Phase 2 assistant architecture baseline.
2. Define v1 API contracts (`/assistant/query`, `/assistant/action/confirm`, `/assistant/feedback`).
3. Implement knowledge ingestion MVP for:
- `docs/ongoing-tasks/*`
- platform guides
- selected block artifacts with strict scope metadata
4. Stand up MCP read tools first, then add guarded action tools.
5. Run internal pilot with feature flags and capture eval telemetry before broad rollout.

---

## 14) Decision Summary

Yes, the proposed path (hierarchical KG + vectors + CLI + MCP) is architecturally correct.  
This document sets the recommended execution pattern so the assistant is:

1. grounded,
2. auditable,
3. safe for operational use,
4. aligned with BlockDataâ€™s existing schema/run/worker model.

<!-- END SOURCE: dev-todos\phase-2-integrations\0211-internal-assistant-development-direction.md -->


---

<!-- BEGIN SOURCE: dev-todos\phase-2-integrations\0211-internal-assistant-execution-checklist.md -->

# Phase 2 Integrations: Internal Assistant Execution Checklist

**Date:** 2026-02-11  
**Status:** Implementation backlog (task-by-task, **deferred until core workflows/pipelines are complete**)  
**Companion doc:** `docs/ongoing-tasks/phase-2-integrations/0211-internal-assistant-development-direction.md`  
**Core-first active plan:** `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`  
**Scope:** Deliver the internal assistant with grounded retrieval and safe tool execution

---

## 1) Delivery Objective

Ship an internal assistant that is:

1. Grounded on platform knowledge (docs/specs/block artifacts).
2. Separated from worker AI execution paths.
3. Safe for operational actions through confirmed, auditable tools.
4. Measurable by quality, safety, and latency metrics.

---

## 1.1 Activation Gate (Must Be True Before Starting)

- [ ] Conversion + ingest core pipeline verified on required formats.
- [ ] Worker invocation/retry/rollup flows verified in runtime.
- [ ] Schema creation/edit core workflows verified (without assistant dependency).
- [ ] Review/export core workflows verified.
- [ ] Core hardening baseline complete (tests + security + smoke checks).

If any gate is unchecked, this checklist stays in backlog mode only.

---

## 2) Constraints and Boundaries (Must Hold)

- [ ] Internal assistant credentials and worker/user-key paths remain separated.
- [ ] Retrieval and actions enforce project/user authorization.
- [ ] Mutating actions require explicit confirmation in UX.
- [ ] Every assistant action is auditable (request, context, tool, result).
- [ ] Citations are returned for grounded answers.

---

## 3) Workstream Plan

## Workstream A: Contracts and Governance

### A1. Freeze v1 assistant API contracts
- [ ] Define request/response schemas for:
  - `POST /assistant/query`
  - `POST /assistant/action/confirm`
  - `POST /assistant/feedback`
- [ ] Add JSON schema definitions in repo.
- [ ] Add error taxonomy (`auth_error`, `validation_error`, `insufficient_context`, `tool_denied`, `tool_failed`).

**Suggested files:**
- `supabase/functions/_shared/assistant/contracts.ts` (new)
- `docs/ongoing-tasks/phase-2-integrations/assistant-api-v1.md` (new)

**Exit check:**
- [ ] Contract docs and schema definitions match implementation stubs.

### A2. Policy and access-control model
- [ ] Define authorization checks for all assistant read/action operations.
- [ ] Define redaction rules for logs and tool output.
- [ ] Define confirmation policy for mutating operations.

**Suggested files:**
- `docs/ongoing-tasks/phase-2-integrations/assistant-policy-model.md` (new)

**Exit check:**
- [ ] Policy approved and referenced by implementation tasks.

---

## Workstream B: Knowledge Ingestion and Indexing

### B1. Define canonical source registry
- [ ] Register doc/spec sources (`docs/ongoing-tasks`, platform guides, integration docs).
- [ ] Register platform artifact sources (project/document/block/schema/run references).
- [ ] Assign canonical source IDs and freshness strategy.

### B2. Build chunking pipeline
- [ ] Implement heading-aware chunker for docs.
- [ ] Implement block-aware chunking for block artifacts.
- [ ] Preserve metadata (`project_id`, `source_uid`, `block_uid`, section path, timestamps).

**Suggested files:**
- `services/assistant-indexer/chunkers/docs.ts` (new)
- `services/assistant-indexer/chunkers/blocks.ts` (new)
- `services/assistant-indexer/types.ts` (new)

### B3. Build embedding + lexical indexing jobs
- [ ] Generate embeddings for chunks.
- [ ] Build lexical index for exact matching on terms/IDs.
- [ ] Add incremental sync jobs and scheduled reconciliation.

**Suggested files:**
- `services/assistant-indexer/jobs/embed.ts` (new)
- `services/assistant-indexer/jobs/lexical.ts` (new)
- `services/assistant-indexer/jobs/reconcile.ts` (new)

**Exit checks:**
- [ ] Backfill completes without schema drift.
- [ ] Incremental sync updates changed records only.

---

## Workstream C: Knowledge Graph (KG)

### C1. Define KG ontology v1
- [ ] Node types: `Project`, `Document`, `Block`, `Schema`, `Run`, `OverlayField`, `GuideSection`, `SpecRequirement`.
- [ ] Edge types: `contains`, `references`, `defines`, `uses_schema`, `belongs_to`, `depends_on`.
- [ ] Define storage model and traversal query API.

### C2. Implement KG builder and sync
- [ ] Initial graph build from existing sources.
- [ ] Incremental edge/node updates on relevant events.
- [ ] Integrity checks (dangling node/edge detection).

**Suggested files:**
- `services/assistant-indexer/kg/ontology.ts` (new)
- `services/assistant-indexer/kg/build.ts` (new)
- `services/assistant-indexer/kg/sync.ts` (new)

**Exit checks:**
- [ ] KG traversal returns valid, scoped path results.
- [ ] No unauthorized cross-project traversal results.

---

## Workstream D: Retrieval and Orchestration

### D1. Build hybrid retrieval service
- [ ] Implement vector retrieval adapter.
- [ ] Implement lexical retrieval adapter.
- [ ] Implement KG expansion retrieval.
- [ ] Implement reranking merge layer.

**Suggested files:**
- `supabase/functions/assistant-retrieve/index.ts` (new) or service equivalent
- `supabase/functions/_shared/assistant/retrieval.ts` (new)

### D2. Build orchestration service
- [ ] Intent classification (`knowledge_qna`, `schema_guidance`, `platform_action`).
- [ ] Retrieval plan generator by intent.
- [ ] Response assembler with citations and confidence markers.
- [ ] Low-evidence fallback behavior.

**Suggested files:**
- `supabase/functions/assistant-query/index.ts` (new)
- `supabase/functions/_shared/assistant/orchestrator.ts` (new)
- `supabase/functions/_shared/assistant/prompts.ts` (new)

**Exit checks:**
- [ ] Responses include citations for grounded answers.
- [ ] Low-evidence requests return explicit uncertainty.

---

## Workstream E: MCP + CLI Tooling

### E1. Define platform CLI contract
- [ ] Ensure assistant-facing commands support JSON output.
- [ ] Add `dry-run` mode for action commands.
- [ ] Standardize result envelope (`ok`, `code`, `message`, `data`, `trace_id`).

### E2. Expose CLI via MCP server
- [ ] Add read tools first (`get_project_summary`, `get_run_status`, etc.).
- [ ] Add action tools with confirmation token flow.
- [ ] Add tool-level authorization checks and deny responses.

**Suggested files:**
- `tools/platform-cli/*` (new/updated)
- `tools/platform-mcp/server.ts` (new)
- `tools/platform-mcp/policies.ts` (new)

**Exit checks:**
- [ ] Read tools return scoped results only.
- [ ] Action tools require explicit confirmation token.

---

## Workstream F: Frontend Assistant Productization

### F1. Assistant panel core
- [ ] Add thread list and message timeline.
- [ ] Add composer with context chips.
- [ ] Add citation render blocks.
- [ ] Add action card UI with confirm/cancel.

**Suggested files:**
- `web/src/components/assistant/AssistantPanel.tsx` (new)
- `web/src/components/assistant/AssistantThread.tsx` (new)
- `web/src/components/assistant/AssistantComposer.tsx` (new)
- `web/src/components/assistant/CitationList.tsx` (new)
- `web/src/components/assistant/ActionCard.tsx` (new)

### F2. API integration
- [ ] Wire `/assistant/query`.
- [ ] Wire `/assistant/action/confirm`.
- [ ] Wire `/assistant/feedback`.
- [ ] Persist local UI state and request session IDs.

**Suggested files:**
- `web/src/lib/assistant/client.ts` (new)
- `web/src/lib/assistant/store.ts` (new)

### F3. UX safeguards
- [ ] Distinguish assistant guidance from worker execution in UI copy.
- [ ] Mark mutating actions explicitly and require confirmation.
- [ ] Show evidence/citation status with each answer.

**Exit checks:**
- [ ] No UI flow conflates assistant and worker AI systems.
- [ ] Action confirmations are mandatory and traceable.

---

## Workstream G: Evaluation and Observability

### G1. Telemetry
- [ ] Log each assistant request with trace ID.
- [ ] Log retrieval sources and ranks (sanitized).
- [ ] Log tool invocation attempts and outcomes.

### G2. Eval harness
- [ ] Build gold-set question suite for platform docs/specs.
- [ ] Build action-intent safety suite (allowed/denied/unsafe cases).
- [ ] Automate periodic eval runs and regression reports.

**Suggested files:**
- `tests/assistant/evals/*.json` (new)
- `tests/assistant/eval-runner.ts` (new)
- `docs/ongoing-tasks/phase-2-integrations/assistant-eval-report-template.md` (new)

**Exit checks:**
- [ ] Groundedness and citation thresholds met for pilot.
- [ ] Unsafe action prevention threshold met.

---

## Workstream H: Rollout and Operations

### H1. Feature flags
- [ ] `ff_assistant_query`
- [ ] `ff_assistant_actions`
- [ ] `ff_assistant_schema_guidance`

### H2. Environment and secrets
- [ ] Configure platform assistant model credentials.
- [ ] Configure retrieval/index service credentials.
- [ ] Verify secrets are isolated from worker key paths.

### H3. Rollout stages
- [ ] Stage 0: internal engineering only.
- [ ] Stage 1: small pilot users.
- [ ] Stage 2: expanded rollout with monitored thresholds.

### H4. Incident playbook
- [ ] Disable action tools quickly via flag.
- [ ] Degrade to read-only retrieval mode.
- [ ] Capture failure traces and recovery steps.

---

## 4) Suggested Milestones and Gates

### Milestone M1: Read-only grounded assistant
- [ ] A + B + D1 + F1 + F2 (query only) complete.
- [ ] Citations present and authorization scoped.

### Milestone M2: Schema guidance integration
- [ ] D2 schema-guidance path complete.
- [ ] UI apply flow integrated in schema surfaces.

### Milestone M3: Safe action tooling
- [ ] E + F3 + G1 + H1 complete.
- [ ] Confirmation + audit for actions verified.

### Milestone M4: Production readiness
- [ ] G2 + H2 + H3 + H4 complete.
- [ ] Eval and incident thresholds signed off.

---

## 5) Verification Commands (Template)

Use command equivalents appropriate to your runtime; keep machine-readable output where possible.

- [ ] Run backend tests for assistant contracts.
- [ ] Run retrieval integration tests.
- [ ] Run MCP tool policy tests (allow/deny).
- [ ] Run frontend build + assistant interaction tests.
- [ ] Run eval harness and compare to baseline thresholds.

---

## 6) Risks and Mitigations

1. **Risk:** Tool misuse for unintended mutation.  
Mitigation: strict confirmation + policy enforcement + dry-run by default.

2. **Risk:** Retrieval quality drifts as corpus grows.  
Mitigation: scheduled evals, reranking improvements, source freshness checks.

3. **Risk:** Assistant/worker boundary erosion in UX or API.  
Mitigation: explicit contract separation, copy guardrails, separate credentials and services.

4. **Risk:** Latency becomes unacceptable with hybrid retrieval.  
Mitigation: cache common retrieval bundles, tune top-k, async prefetch.

---

## 7) Definition of Done (Phase 2 Assistant)

- [ ] Internal assistant answers are grounded with citations.
- [ ] Assistant can safely perform approved platform actions with confirmation.
- [ ] Authorization boundaries hold for retrieval and actions.
- [ ] Assistant and worker AI systems remain clearly separated.
- [ ] Eval thresholds and incident playbook are in place for rollout.

<!-- END SOURCE: dev-todos\phase-2-integrations\0211-internal-assistant-execution-checklist.md -->


