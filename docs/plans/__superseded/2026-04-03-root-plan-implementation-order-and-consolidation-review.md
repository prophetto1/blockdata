# 2026-04-03 Root Plan Implementation Order And Consolidation Review

**Purpose:** Evaluate the listed root-level plan artifacts by subject scope, implementation role, overlap, and dependency so the active queue can be ordered cleanly.

**Scope Boundary:** This review covers only the seven files named in the request. It does not widen into other root-level plans unless needed for dependency explanation.

**Artifact Type:** This is a queue and consolidation review, not an execution-grade implementation plan. It is intended to help choose among existing plans. It is not the document to execute from directly.

**Explicit exclusion:** `docs/plans/2026-03-30-assets-storage-quota-workbench-placement-fix-plan.md` is adjacent Assets workbench context, but it is not one of the seven reviewed files and is therefore not ordered here.

## Subject Scope Map

| File | Subject scope | Current status | Implementation role | Current recommendation |
| --- | --- | --- | --- | --- |
| `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md` | Repair the post-`069` Supabase migration chain so replay and linked deploy stop failing on `public.projects` references in `073` and `091` | Draft; blocker still open | Active upstream blocker plan | Execute first |
| `docs/plans/2026-04-02-agchain-page-composition-correction-implementation-plan.md` | AGChain frontend architecture correction: shared scope-state hook, page-owned composition, placeholder cleanup, and enforcement | Draft; partially implemented in repo | Separate frontend implementation plan | Keep separate from storage/Supabase lane; parallel or later |
| `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md` | Post-implementation storage namespace closeout: replay proof, schema-contract test, linked DB apply, clean build evidence, and manual acceptance | Draft; still blocked by reconciliation | Follow-up closeout plan | Execute after migration reconciliation |
| `docs/plans/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md` | Original storage namespace behavior-change contract spanning metadata ownership, pipeline source registry, preview/download, delete, quota, and CORS | Draft text; underlying implementation artifacts appear present | Reference implementation contract, not the best current execution driver | Do not execute as the next step; treat as design source of truth behind later storage plans |
| `docs/plans/2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md` | Local linked-dev startup hardening: preflight parity check, launcher-owned startup gate, and readiness surface | Draft; repo artifacts not yet present | Separate infrastructure-hardening plan | Keep separate; execute after reconciliation and closeout, before lower-priority follow-on repairs |
| `docs/plans/2026-04-03-plans-root-relationship-status-report.md` | Meta-analysis of root plan relationships and queue order | Report only | Report only, not an implementation plan | Remove from the active implementation queue and move out of root when no longer needed |
| `docs/plans/2026-04-03-assets-legacy-document-surface-repair-plan.md` | Assets follow-on repair for legacy `source_documents` rows and stable Files pane behavior | Draft; repo artifacts not yet present | Separate additive repair plan | Execute after reconciliation, closeout, and schema-parity hardening |

## Current Status Signals

These are concrete repo spot-checks, not just dependency assertions:

- Reconciliation is still a live blocker:
  - `supabase/migrations/20260309183000_073_normalize_flow_identity.sql` still contains post-`069` `public.projects` references.
  - `supabase/migrations/20260314180000_091_extraction_tables.sql` still contains `public.projects` / `projects` ownership references.
- The storage closeout follow-up is not yet closed:
  - `services/platform-api/tests/test_storage_namespace_schema_contract.py` is not present.
- The original storage namespace behavior plan reads more like candidate-implemented work than the next execution driver:
  - `20260402193000_storage_namespace_metadata_foundation.sql`, `20260402194000_pipeline_source_registry_and_fk_migration.sql`, and `20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql` are present.
- The AGChain plan is not a clean untouched draft anymore:
  - `web/src/hooks/agchain/useAgchainScopeState.ts`, `web/src/components/agchain/AgchainProjectPlaceholderPage.tsx`, and `web/src/pages/agchain/AgchainPageArchitecture.test.ts` are present.
  - `web/src/components/agchain/settings/AgchainSettingsSectionLayout.tsx` is no longer present.
- The linked-dev schema parity plan does not appear landed:
  - `scripts/linked-dev-schema-parity-preflight.mjs` is not present.
  - `services/platform-api/app/services/schema_parity.py` is not present.
  - `web/src/lib/operationalReadiness.ts` does not yet expose a `schema` surface.
- The Assets legacy repair plan does not appear landed:
  - `supabase/migrations/20260403110000_assets_legacy_document_surface_backfill.sql` is not present.
  - `web/src/pages/useAssetsWorkbench.tsx` still removes the Files tab dynamically based on `docs.length`.

## Dependency And Overlap Analysis

### Storage and Supabase lane

The storage/Supabase files form one dependency chain, but they are not all the same kind of artifact:

1. `2026-04-01-supabase-migration-reconciliation-plan.md` repairs the broken migration chain.
2. `2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md` closes proof and linked-project apply gaps on the already-landed storage namespace work.
3. `2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md` hardens local startup and readiness after the migration truth has been restored.
4. `2026-04-03-assets-legacy-document-surface-repair-plan.md` adds a new follow-on repair on top of the stabilized storage namespace model.

`2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md` overlaps with both the closure plan and the Assets legacy repair plan, but only as the original behavior contract:

- The closure plan explicitly treats the storage namespace code as the candidate implementation and focuses on proof and approval gaps.
- The Assets legacy repair plan explicitly uses the storage namespace migrations and current Assets query seam as source of truth.
- Re-executing the separation plan as if it were the next implementation batch would duplicate or blur work that later plans already narrowed.

### AGChain lane

`2026-04-02-agchain-page-composition-correction-implementation-plan.md` is a separate workstream:

- It has no technical dependency on the storage/Supabase plans listed above.
- None of the storage/Supabase plans depend on AGChain page composition work to proceed.
- If there is one implementation lane only, sequence it after the storage/Supabase blocker chain because it is independent of that unblock path, not because the work is inherently less important.
- If there are parallel owners, AGChain can run independently.

### Meta artifact

`2026-04-03-plans-root-relationship-status-report.md` is not an implementation plan:

- It should not appear in the execution order except as a coordination note.
- It would be better stored outside the active root once it has served the current planning decision.

## Merge Recommendations

### Do not merge

- Do not merge `2026-04-01-supabase-migration-reconciliation-plan.md` with `2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`.
  - The first repairs migration history.
  - The second verifies and closes out already-landed storage behavior.

- Do not merge `2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md` with `2026-04-03-assets-legacy-document-surface-repair-plan.md`.
  - The closure plan is verification-only by design.
  - The Assets legacy repair plan introduces a new migration and runtime changes.

- Do not merge `2026-04-01-supabase-migration-reconciliation-plan.md` with `2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md`.
  - Reconciliation is tactical repair of existing migration history.
  - Schema parity is forward-looking startup and readiness hardening.

- Do not merge `2026-04-02-agchain-page-composition-correction-implementation-plan.md` with any storage/Supabase plan in this set.
  - It is a separate frontend architecture initiative.

### Treat as reference, not merge target

- `2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md` should remain separate in content, but it should not be treated as the next executable plan.
- Its role is to define the intended storage architecture that the closure plan and later repairs validate or extend.
- Concrete action: keep it cited as source of truth for now, but add a top-of-file note marking it `Reference architecture only — not the current execution driver`. After reconciliation and closure are complete, move it out of the active root queue if it is no longer needed as a root-level planning artifact.

## Split Recommendations

### Split recommended

`2026-04-02-agchain-page-composition-correction-implementation-plan.md` would benefit from splitting into two execution batches before any additional implementation starts:

1. **AGChain architecture foundation batch**
   - Task 1: add `useAgchainScopeState()` and the small page primitives
   - Task 5: adopt the shared scope-state hook across the already page-owned AGChain real pages
   - the foundation/enforcement subset of Task 6: keep lint and architecture-test protection aligned with the new scope-state model

2. **AGChain surface rebuild batch**
   - Task 2: replace the settings real-page wrapper and rebuild `Organization / Members`
   - Task 3: port `Organization / Permission Groups` and `Benchmark Definition` to the corrected page-owned model
   - Task 4: replace the AGChain placeholder page-generator and migrate the mounted placeholder routes
   - the final verification sweep from Task 6

Rationale:

- The current file spans shared hook design, enforcement, placeholder migration, and visible page rebuilds across a large set of routes and tests.
- The natural batch boundary falls after Task 1 only if Task 6 is also split, because the current Task 6 mixes enduring enforcement with the full end-state verification sweep.
- Splitting at the task level makes the recommendation actionable instead of leaving the batch boundary implicit.

### No split recommended

- `2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md` should stay whole because the preflight, startup gate, and readiness surface are one coherent vertical slice around the same parity-state artifact.
- `2026-04-03-assets-legacy-document-surface-repair-plan.md` should stay whole because the backfill migration and persistent Files pane are two sides of one user-visible Assets repair.

## Recommended Implementation Order

### Primary storage/Supabase queue

1. `2026-04-01-supabase-migration-reconciliation-plan.md`
   - This is the blocker for truthful replay and linked deploy.
   - It directly unblocks the storage closeout plan.

2. `2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`
   - Once the chain is truthful, close out the already-landed storage namespace work.
   - This gives clean proof about replay, linked apply, build evidence, and manual acceptance before adding new storage changes.

3. `2026-04-03-linked-dev-schema-parity-preflight-and-readiness-plan.md`
   - This is the next hardening step after the blocker chain is truthful and the storage namespace closeout is done.
   - It addresses the recurring linked-dev startup/schema failure class and does not need to wait behind the separate Assets repair.

4. `2026-04-03-assets-legacy-document-surface-repair-plan.md`
   - This is the next user-facing storage repair after the namespace work is closed out and the linked-dev recurrence guard is in place.
   - It relies on the stabilized namespace and Assets read model rather than redefining them.

### Separate AGChain queue

5. `2026-04-02-agchain-page-composition-correction-implementation-plan.md`
   - Run in parallel if there is separate ownership.
   - If there is only one implementation lane, place it after the storage/Supabase queue because it does not unblock any of the listed storage or Supabase work.
   - Execute it as two batches if adopted.

### Non-execution items

- `2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`
  - Keep as reference architecture, not as the next execution plan.
  - Immediate action: add a reference-only header note.

- `2026-04-03-plans-root-relationship-status-report.md`
  - Remove from the active queue. It is a report, not an implementation artifact.

## Bottom Line

The cleanest interpretation of this set is:

- one true upstream blocker
- one true storage closeout plan
- one original storage behavior contract that should now behave as reference
- one follow-on Assets repair
- one future schema-parity hardening plan
- one separate AGChain frontend initiative
- one meta report that should not be in the implementation queue

If the goal is to reduce confusion and maximize progress, the next action is not to merge more of these files together. It is to execute the blocker chain in order, bring schema-parity hardening forward ahead of the follow-on Assets repair, split the AGChain plan into two batches before implementation, and remove the meta report from the active root queue.
