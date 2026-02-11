# Core Priority Queue + Worker Optimization Plan

**Date:** 2026-02-11  
**Status:** Active planning doc  
**Scope:** Order core platform work, document optimization ideas, execute one task at a time with clear gates

> Internal assistant remains deferred until core workflow gates are complete.

---

## 1) Planning Objective

Create a single execution queue that:

1. Aligns with `0211-core-workflows-before-assistant-plan.md`.
2. Incorporates worker token/cost optimization (`prompt caching` + `multi-block batching`).
3. Adds an admin/superuser control plane for runtime optimization policies.
4. Forces one-at-a-time execution with explicit exit criteria before moving to the next item.

---

## 2) Source Inputs (Current Repo)

- Core sequencing: `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`
- Remaining backlog snapshot: `docs/ongoing-tasks/0209-unified-remaining-work.md`
- Format gate: `docs/ongoing-tasks/0211-source-format-reliability-matrix.md`
- Token optimization analysis: `docs/ongoing-tasks/0211-worker-token-optimization-patterns.md`
- Hardening baseline: `docs/ongoing-tasks/0210-test-driven-hardening-plan.md`
- Schema workflow requirements: `docs/ongoing-tasks/0210-schema-wizard-and-ai-requirements.md`
- Schema contract: `docs/ongoing-tasks/meta-configurator-integration/spec.md`
- Config registry + conflicts: `docs/ongoing-tasks/0211-admin-config-registry.md`

---

## 3) Locked Priority Order (One-at-a-Time)

### Priority 1: Close format reliability gate

**Goal:** Mark all required formats verified in runtime truth.

**Do:**
1. Add missing smoke fixtures for `pptx` and `xlsx`.
2. Run `scripts/run-format-matrix-smoke.ps1`.
3. Update `0211-source-format-reliability-matrix.md` + `0211-source-format-smoke-results.md` with date-stamped outcomes.

**Exit criteria:**
- `md`, `txt`, `docx`, `pdf`, `pptx`, `xlsx`, `html`, `csv` all verified.

---

### Priority 2: Lock worker/run reliability baseline (before optimization)

**Goal:** Prove deterministic run behavior before changing worker execution strategy.

**Do:**
1. Run deterministic live test: create run -> invoke worker -> overlays move `pending -> ai_complete/failed`.
2. Validate claim/retry/rollup semantics and cancellation behavior.
3. Capture evidence logs and add a short runbook entry for common failure signatures.

**Exit criteria:**
- Worker gate in `0211-core-workflows-before-assistant-plan.md` is demonstrably met.

---

### Priority 3: Lock config registry + ownership boundaries

**Goal:** Remove ambiguity about where runtime policy is defined before optimization implementation.

**Do:**
1. Convert confirmed hardcoded inventory into an approved config registry.
2. Classify each key as env-level, admin-policy-level, or run/schema/user-level.
3. Resolve conflicting defaults across worker/UI/DB (for example temperature fallback drift).
4. Resolve custom-provider `base_url` contract drift between app/edge code and migrations/RPC signatures.
5. Resolve claim-ordering risk for batching (do not rely on `ORDER BY block_uid` as canonical execution order; enforce numeric `block_index` ordering, and define future grouping rules if batching ever spans multiple runs/documents).
6. Document interim behavior for keys that remain hardcoded until admin controls ship.

**Exit criteria:**
- Single approved registry document exists and is linked from the core workflow plan.
- No unresolved conflicts for worker optimization keys, including `base_url` migration/RPC parity and deterministic claim ordering for batching.

---

### Priority 4: Implement prompt caching (low risk, immediate savings)

**Goal:** Reduce repeated system prompt cost without changing extraction behavior.

**Do:**
1. Add prompt caching headers/controls in worker LLM call path.
2. Add feature flag (`enabled/disabled`) for safe rollback.
3. Record before/after token and cost measurements for one representative run.

**Exit criteria:**
- Quality parity with baseline run.
- Cost reduction measured and documented.

---

### Priority 5: Implement adaptive multi-block batching

**Goal:** Reduce number of model calls while preserving output quality.

**Do:**
1. Implement pack sizing based on input/output token budget and safety margins.
2. Introduce pack assignment/claim flow (or equivalent) and response validation.
3. Add overflow behavior: auto-split and retry when a pack exceeds practical limits.
4. Run quality/performance benchmark across at least one extraction schema and one revision-heavy schema.

**Exit criteria:**
- No quality regression vs baseline on agreed evaluation sample.
- Significant call-count reduction validated in logs.

---

### Priority 6: Build admin/superuser optimization controls

**Goal:** Centralize runtime policy controls (no hardcoded behavior changes).

**Do:**
1. Add admin-accessible settings surface for:
   - prompt caching on/off
   - batching on/off
   - batching mode (adaptive/fixed)
   - min/max batch caps
   - safety margins
   - retry split behavior
2. Snapshot effective config at run creation for determinism.
3. Add audit visibility (who changed what, when).

**Exit criteria:**
- Runtime behavior is configurable without code deploy.
- Mid-run config drift is prevented by run-level snapshot.

---

### Priority 7: Complete schema core workflow

**Goal:** Deliver wizard-first schema authoring and preserve contract compatibility.

**Do:**
1. Complete manual wizard path first.
2. Keep advanced editor + fork-by-default save semantics.
3. Ensure compatibility with worker/grid contract (`properties` + `prompt_config` conventions).

**Exit criteria:**
- Schema creation/editing flow is fully usable without hand-authored JSON.

---

### Priority 8: Review/export lifecycle completion

**Goal:** Ensure confirmed-data workflow and export pathways are complete/predictable.

**Do:**
1. Close remaining export variants and reconstruction requirements in scope.
2. Validate project-level and document-level flows end-to-end.
3. Confirm status docs match runtime truth.

**Exit criteria:**
- Review/confirm/export gate complete per core workflow plan.

---

### Priority 9: Hardening + ops baseline

**Goal:** Stabilize release posture.

**Do:**
1. Expand automated tests for highest-risk data paths.
2. Finalize runbooks for conversion, worker, and export failures.
3. Verify RLS/security hardening and CI baseline.

**Exit criteria:**
- Core stability gates complete; internal assistant can move from deferred to active.

---

## 4) Documentation Deliverables by Priority

For each completed priority, update at minimum:

1. `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md` (gate state + date)
2. One task-specific doc with evidence and decisions
3. `docs/ongoing-tasks/_completed/0210-work-done-status-log.md` (or move this log back to active tracking)

Recommended new docs:

- `docs/ongoing-tasks/0211-worker-runtime-optimization-spec.md`
- `docs/ongoing-tasks/0211-admin-optimization-controls-spec.md`
- `docs/ongoing-tasks/0211-worker-optimization-benchmark-results.md`

---

## 5) Operating Rule (Strict)

Do not start the next priority until:

1. Exit criteria for the current priority are met.
2. Evidence is written to docs.
3. Gate status is updated in the core workflow plan.

This keeps execution linear, auditable, and stable.
