# Supabase Migration Reconciliation Takeover Notes

## Inherited Inputs

- `docs/plans/__superseded/2026-04-02-storage-parser-replay-remediation-plan.md`
- `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`
- `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`
- `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`
- Current migration files in `supabase/migrations`

## Trust Matrix

| Claim | Source | Classification | Notes |
|---|---|---|---|
| Storage-specific replay blockers through `065` were cleared by the bootstrap plus replay-safe repairs | April 2 verification report | Verified | The report shows replay clearing `040`, `041`, `042`, `048`, `052`, `065`, and `083` before the next failure |
| The April 2 storage replay plan can still restore a fully replayable chain by itself | April 2 goal and completion criteria | Contradicted | Replay now fails at `073` with `public.projects` missing, which is outside the parser/storage seam |
| The active live project table on the connected remote is `public.user_projects`, not `public.projects` | April 1 reconciliation plan | Verified | This is consistent with the remote-state evidence and the `069` rename seam |
| The remaining wrong local-only files are `20260327200000`, `20260330120000`, and `20260331141000` | Older April 1 bucket-C scope | Obsolete | Those files already use `public.user_projects` in the current repo |
| `20260319190000_102_user_storage_quota.sql` still needs ownership-table repair | Inferred from simple string search | Contradicted | `_storage_user_owns_project()` already bridges both `public.user_projects` and `public.projects` |

## Plan Drift Findings

- The April 2 storage replay plan succeeded as a storage-specific blocker-removal plan but failed as a full-chain completion plan.
- The actual remaining post-`069` ownership-table drift lives in `20260309183000_073_normalize_flow_identity.sql` and `20260314180000_091_extraction_tables.sql`.
- The older April 1 reconciliation plan now under-specifies the remaining edit surface because its late-March file list is stale.
- The storage closeout plan cannot truthfully resume until the upstream `public.user_projects` seam is reconciled.

## Salvage Or Rewrite Decision

Rewrite the April 1 reconciliation plan as the active upstream implementation plan, and patch the April 2 storage replay plan into blocked-handoff status. The older April 1 file had enough verified direction to preserve the `public.user_projects` authority decision, but its concrete file inventory was stale and had to be re-locked from current repo state.
