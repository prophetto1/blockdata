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

- `docs/ongoing-tasks/0211-source-format-reliability-matrix.md`
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

## 3) Current Risk Concentration (2026-02-11)

1. Conversion runtime truth is inconsistent across docs (some entries say "resolved", others "unverified").  
Action: treat as unverified until fresh smoke matrix passes.

2. Format support widened in code (`pptx`, `xlsx`, `html`, `csv`) but runtime verification is incomplete.  
Action: verify each format explicitly, not by assumption.

3. Worker reliability still depends on live key/config conditions and run dispatch behavior.  
Action: perform runtime verification with controlled test runs and captured logs.

---

## 4) Execution Gates Before Assistant Work

All must be true:

- [ ] Required source formats pass ingest/conversion smoke matrix.
- [ ] Worker pipeline is verified live (claim -> ai_complete/failed -> rollup).
- [ ] Schema core workflow is complete and stable.
- [ ] Review/export workflows are complete and tested.
- [ ] Core hardening baseline and runbooks are in place.

Only after these gates are complete should assistant implementation move from deferred to active.

---

## 5) Immediate Next Actions

1. Execute and maintain `0211-source-format-reliability-matrix.md` as single runtime truth.
   - Use `scripts/run-format-matrix-smoke.ps1` for repeatable runs and log capture.
2. Close highest-severity conversion blocker first (currently PDF verification/deploy truth).
3. Validate worker runtime path with one deterministic test run.
4. Update this plan and status docs with date-stamped outcomes after each gate.

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

Next:

1. Add `pptx`/`xlsx` smoke fixtures.
2. Complete matrix verification for those two formats.
3. Move to worker/run reliability gate once format gate is complete.
