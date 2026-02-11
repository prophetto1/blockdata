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
- `docs/ongoing-tasks/0211-admin-config-registry.md`
- `docs/ongoing-tasks/0211-source-format-reliability-matrix.md`
- `docs/ongoing-tasks/0211-source-format-smoke-results.md`
- `docs/ongoing-tasks/0211-worker-token-optimization-patterns.md`
- `docs/ongoing-tasks/meta-configurator-integration/spec.md`
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
| 2 | In Progress | 2026-02-11 | Session owner | SQL: `create_run_v2(...)`, `cancel_run(...)`, temporary `user_api_keys` setup/cleanup; HTTP: `POST /functions/v1/worker`; SQL: overlay/run/key state checks | `0211-worker-runtime-reliability.md`, `supabase/functions/worker/index.ts` | Fixed stranded-claim bug on no-key path; worker deployed as version `6`; cancellation + no-key + invalid-key release paths verified; happy/retry still blocked by missing valid API key |
| 3 | Not Started |  |  |  |  |  |
| 4 | Not Started |  |  |  |  |  |
| 5 | Not Started |  |  |  |  |  |
| 6 | Not Started |  |  |  |  |  |
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
- [x] Update `docs/ongoing-tasks/0211-source-format-smoke-results.md` with latest timestamped run.
- [x] Update `docs/ongoing-tasks/0211-source-format-reliability-matrix.md` runtime status per format.
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
- [ ] LLM API key is configured for happy-path execution.
- [x] Test schema and test document are selected for deterministic run checks.

### Required Execution
- [ ] Execute deterministic happy path: create run -> invoke worker -> no pending overlays remain.
- [ ] Validate transitions: `pending -> claimed -> ai_complete/failed`.
- [ ] Validate retries and terminal failure behavior.
- [x] Validate cancellation behavior for claimed/pending overlays.
- [x] Validate no-key fallback behavior releases claimed overlays back to pending.
- [x] Validate invalid-key (401) behavior releases claims and marks key invalid.
- [ ] Validate run rollups (`completed_blocks`, `failed_blocks`, run status) against overlay truth.

### Required Evidence
- [x] Add/update worker reliability evidence doc (recommended: `docs/ongoing-tasks/0211-worker-runtime-reliability.md`).
- [ ] Record at least one run ID and command/log evidence per scenario (happy, failure/retry, cancellation).
- [x] Add short failure-signature runbook notes.

### Exit Criteria (Binary)
Pass only if all are true:
- [ ] Status transitions and rollups are deterministic and repeatable.
- [ ] Retry/cancellation semantics match documented contract.
- [ ] Worker gate is marked complete in `0211-core-workflows-before-assistant-plan.md`.

Fail if any are true:
- [ ] Rollup counts diverge from overlay state.
- [ ] Claimed overlays can be stranded without documented recovery.

---

## 10) Priority 3 - Lock Config Registry + Ownership Boundaries

### Entry Criteria
- [ ] Priority 2 status is `Passed`.
- [ ] `docs/ongoing-tasks/0211-admin-config-registry.md` reflects current repo/runtime inventory.

### Required Execution
- [ ] Classify each config key as `env`, `admin-policy`, or `run/schema/user scope`.
- [ ] Resolve default drift across worker/UI/DB (`model`, `temperature`, `max_tokens`).
- [ ] Resolve `base_url` persistence and RPC signature parity.
- [ ] Resolve deterministic claim ordering rule for batching workflows (`block_index` semantics).
- [ ] Document interim handling for values still hardcoded pending admin controls.

### Required Evidence
- [ ] Update `0211-admin-config-registry.md` with resolved status per conflict.
- [ ] Reference migrations/code locations that enforce resolved contracts.
- [ ] Record unresolved items explicitly as blockers (if any).

### Exit Criteria (Binary)
Pass only if all are true:
- [ ] No critical conflicts remain unresolved in registry conflict summary.
- [ ] Single approved config registry exists and is linked from core workflow plan.
- [ ] Ordering and provider/base URL contracts are unambiguous and codified.

Fail if any are true:
- [ ] Temperature/model/default conflicts remain.
- [ ] `base_url` or claim-ordering parity remains partially specified.

---

## 11) Priority 4 - Implement Prompt Caching

### Entry Criteria
- [ ] Priority 3 status is `Passed`.
- [ ] Baseline token/cost metrics are captured pre-change.

### Required Execution
- [ ] Add prompt caching behavior in worker LLM path.
- [ ] Add feature flag for enable/disable rollback.
- [ ] Run representative benchmark with caching off and on using same dataset/schema.

### Required Evidence
- [ ] Add/update benchmark doc (recommended: `docs/ongoing-tasks/0211-worker-optimization-benchmark-results.md`).
- [ ] Record quality comparison notes and token/cost deltas.

### Exit Criteria (Binary)
Pass only if all are true:
- [ ] No quality regression on benchmark sample.
- [ ] Measurable token/cost reduction is documented.
- [ ] Rollback path is tested.

Fail if any are true:
- [ ] Caching changes extraction outputs materially without approved tradeoff.
- [ ] No reproducible measurement exists.

---

## 12) Priority 5 - Implement Adaptive Multi-Block Batching

### Entry Criteria
- [ ] Priorities 2, 3, and 4 are `Passed`.
- [ ] Deterministic claim ordering is codified and validated.

### Required Execution
- [ ] Implement pack sizing based on context and output budgets.
- [ ] Implement pack claim/assignment and per-block response validation.
- [ ] Implement overflow split-and-retry behavior.
- [ ] Benchmark at least one extraction schema and one revision-heavy schema.

### Required Evidence
- [ ] Add/update batching implementation spec (recommended: `docs/ongoing-tasks/0211-worker-runtime-optimization-spec.md`).
- [ ] Add/update benchmark results with quality and call-count deltas.

### Exit Criteria (Binary)
Pass only if all are true:
- [ ] No quality regression vs baseline benchmark.
- [ ] Significant call-count reduction is verified.
- [ ] Queue correctness invariants remain true.

Fail if any are true:
- [ ] Batched outputs cannot be deterministically mapped back to source blocks.
- [ ] Retry/overflow behavior creates data-loss risk.

---

## 13) Priority 6 - Build Admin/Superuser Optimization Controls

### Entry Criteria
- [ ] Priorities 3, 4, and 5 are `Passed`.
- [ ] Final policy key list is approved in config registry.

### Required Execution
- [ ] Add admin controls for caching, batching mode, limits, and safety margins.
- [ ] Snapshot effective config at run creation.
- [ ] Add auditability for policy changes.

### Required Evidence
- [ ] Add/update controls spec (recommended: `docs/ongoing-tasks/0211-admin-optimization-controls-spec.md`).
- [ ] Record proof that run snapshots prevent mid-run drift.
- [ ] Record audit visibility proof.

### Exit Criteria (Binary)
Pass only if all are true:
- [ ] Runtime behavior is policy-driven without code deploy.
- [ ] Mid-run config drift is prevented by snapshot design.
- [ ] Change history is observable.

Fail if any are true:
- [ ] Runtime still depends on conflicting hardcoded policy values.
- [ ] Run behavior can change due to admin edits after run start.

---

## 14) Priority 7 - Complete Schema Core Workflow

### Entry Criteria
- [ ] Priorities 2 and 3 are `Passed`.

### Required Execution
- [ ] Deliver wizard-first manual schema creation path.
- [ ] Preserve advanced editor escape hatch and fork-by-default semantics.
- [ ] Enforce compatibility with worker/grid contract (`properties`, `prompt_config`).

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
