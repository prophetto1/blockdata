# 2026-04-03 Plans Root Relationship Status Report

**Purpose:** Record the current relationship between the related plan artifacts in `docs/plans`, identify which files still drive implementation, and reduce ambiguity about execution order.

## Files Reviewed

- `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`
- `docs/plans/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`
- `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`
- `docs/plans/2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md`
- `docs/plans/2026-04-03-ark-ui-wrapper-restyling-plan.md`
- `docs/plans/__complete/notes/2026-04-03-supabase-migration-reconciliation-takeover-notes.md`
- `docs/plans/__complete/reports/2026-04-02-storage-surface-separation-status-report.md`
- `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`
- `docs/plans/__superseded/2026-04-02-storage-parser-replay-remediation-plan.md`

## Relationship Map

### 1. Active upstream blocker

`2026-04-01-supabase-migration-reconciliation-plan.md`

- This is the live implementation blocker plan.
- It owns the remaining migration-chain truth work after the `069_user_projects_rename` seam.
- Its current locked edit surface is the remaining post-rename migration repair work, not the broader storage namespace design.

### 2. Blocked follow-up closeout plan

`2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`

- This is a follow-up validation and closeout plan.
- It assumes the storage namespace implementation is already the candidate behavior and focuses on replay proof, linked-project apply, verification evidence, and final approval gaps.
- It should not proceed before the upstream reconciliation blocker is resolved.

### 3. Older behavior-change implementation contract

`2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`

- This is the original behavior-change implementation contract for the storage namespace issue.
- Later artifacts treat it as source-of-truth context for what the storage namespace fix was supposed to do.
- It is no longer the best file to execute first, because the current blocker is upstream migration reconciliation and the later closeout plan already treats the namespace behavior as candidate implemented work.

### 4. Separate future hardening plan

`2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md`

- This is a separate infrastructure-hardening draft.
- It addresses recurring linked-dev schema drift by adding preflight and readiness surfaces.
- It is related to the same broad failure class, but it is not the same implementation step as the current migration-chain repair.

### 5. Separate UI workstream

`2026-04-03-ark-ui-wrapper-restyling-plan.md`

- This is a separate frontend/UI workstream.
- It should not be merged into any storage or Supabase migration plan.

## Non-Root Supporting Artifacts

These files are useful context but do not currently belong in the active implementation lane:

- `__complete/notes/2026-04-03-supabase-migration-reconciliation-takeover-notes.md`
  - Notes only: inherited inputs, trust matrix, drift findings, salvage/rewrite decision.
- `__complete/reports/2026-04-02-storage-surface-separation-status-report.md`
  - Diagnostic current-state report.
- `__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`
  - Execution evidence report.
- `__superseded/2026-04-02-storage-parser-replay-remediation-plan.md`
  - Superseded handoff artifact. Do not execute from this file.

## Recommended Implementation Order

1. Execute `2026-04-01-supabase-migration-reconciliation-plan.md`.
2. After reconciliation is complete, resume `2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`.
3. Treat `2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md` as the next hardening step after the current blocker chain is truthful again.

## Merge Or Separate Recommendation

### Keep separate

- Keep `2026-04-01-supabase-migration-reconciliation-plan.md` separate from `2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`.
  - Reason: the first repairs migration history; the second proves and closes out already-landed storage behavior.
- Keep `2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md` separate from both.
  - Reason: it is prevention tooling, not tactical repair.
- Keep `2026-04-03-ark-ui-wrapper-restyling-plan.md` separate.
  - Reason: unrelated UI workstream.

### Candidate for demotion or reclassification

`2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`

- This file now behaves more like a reference behavior contract than the live execution driver.
- It should remain separate in content, but it should not sit in the same practical tier as the active reconciliation blocker unless it is still intended to drive new behavior work.

## Current Recommendation

If the goal is to reduce ambiguity in `docs/plans`, the next cleanup target is:

- either move `2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md` out of the active root into a non-root reference/completed location
- or keep it in root but add an explicit top-of-file note stating that execution priority currently belongs to `2026-04-01-supabase-migration-reconciliation-plan.md`

## Bottom Line

There is one active upstream blocker, one blocked follow-up closeout plan, one future hardening plan, and one older behavior contract still sitting near them as if it were equally active. The main source of confusion is not that the files say the same thing; it is that they live in the same root tier while serving different roles.
