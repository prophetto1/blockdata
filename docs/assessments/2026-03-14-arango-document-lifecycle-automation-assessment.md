# Arango Document Lifecycle Automation Assessment

## Plan Metadata

- Source path: `docs/plans/2026-03-14-arango-document-lifecycle-automation.md`
- Date reviewed: `2026-03-14`
- Reviewer: `Codex`

## Verdict

`Fail`

## Findings

### Critical

1. The proposed migration is out of order with the current repo migration history.
   Task 1 proposes `supabase/migrations/20260314103000_085_add_overlay_uid.sql`, but the repo already contains later same-day migrations at `20260314120000_086_registry_source_types_add_binary.sql` and `20260314130000_087_upload_support_all_remove_upload_gates.sql`. Shipping a new migration with an earlier timestamp would create ordering drift for any environment that has already applied `086` and `087`. The plan needs a new monotonic timestamp after the latest committed migration before implementation starts.

2. The delete/reset design does not provide a safe recovery path for partial Postgres-success and Arango-failure cases.
   Task 6 says `manage-document` should call the Postgres RPC first, then call Arango cleanup, then return `502` if Arango fails. That surfaces the failure, but it does not restore the already-committed Postgres delete/reset, nor does it define a durable retry or reconciliation mechanism. Because the current RPCs in `supabase/migrations/20260313210000_080_fix_reset_delete_rpcs_table_names.sql` are transactional only inside Postgres, this plan still allows cross-system divergence in one of the highest-risk lifecycle paths.

3. The plan misses the re-parse cleanup path, so Arango can still retain stale projection data outside delete/reset.
   The current `supabase/functions/trigger-parse/index.ts` clears stale Postgres conversion rows before a retry, but the plan only adds Arango cleanup for delete and reset. A document retried from `conversion_failed` or `parse_failed` could still leave stale Docling payloads, runs, overlays, or blocks in Arango until a later reset or delete. That conflicts with the plan's own goal of making Arango the current self-contained projection.

### Major

1. The auth and ownership model for the new edge functions is under-specified.
   Task 5 and Task 6 say to authenticate the caller, call existing RPCs, fetch affected rows, and sync Arango. That is not enough detail to implement safely. The plan needs to say whether these functions use a user-scoped client under RLS, an admin client with explicit ownership checks, or a mixed pattern. Without that decision, `manage-overlays` and `manage-document` can easily bypass ownership boundaries while reading rows for Arango sync.

2. The verification plan is not executable enough for the amount of new surface area it introduces.
   The repo has current tests for `supabase/functions/_shared/arangodb.test.ts` and some other edge functions, but it does not already have test files for `conversion-complete`, `runs`, `worker`, `manage-overlays`, or `manage-document`. The plan correctly asks for those tests, but it does not define the harness pattern, mocking strategy, or any required refactor to make those functions testable. Task 7 also asks for real Arango smoke verification without specifying the exact AQL/API checks or evidence to record.

3. The reset contract is still ambiguous at the field level.
   The plan says reset should restore the document metadata row to upload-stage shape, but it does not lock the exact target values for `conversion_job_id`, `conv_uid`, `conv_locator`, `conv_status`, `conv_representation_type`, `block_count`, `error`, and `pipeline_config`. Those fields already flow through `supabase/functions/_shared/arangodb.ts`, `supabase/functions/ingest/process-upload-only.ts`, and `supabase/functions/ingest/process-convert.ts`. The implementation needs one explicit reset payload contract so reset behavior matches upload-state behavior across all code paths.

### Minor

1. Task 1 understates the blast radius of adding `overlay_uid`.
   The step text mentions `useOverlays.ts`, `worker/index.ts`, and `export-jsonl/index.ts`, but the current overlay review flow in `web/src/components/blocks/BlockViewerGridRDG.tsx` and several direct `block_overlays` reads in the worker are also part of the compatibility surface. The plan direction is fine, but the verification list should name all current consumers so the work does not stop at type updates.

2. Task 7 should require recording the exact verification commands, not just observed outcomes.
   The plan says to append observed outcomes to the internal Arango doc. It should also require the exact query or API call used for each observation so future regressions can be reproduced instead of re-verified by ad hoc manual inspection.

## Specific Gaps, Contradictions, And Ambiguity

- The migration filename proposed in Task 1 is already older than the latest committed migration timestamps in the repo.
- The plan treats `502` as sufficient handling for cross-system cleanup failure, but that is reporting, not recovery.
- The current retry path in `trigger-parse` already performs Postgres-side cleanup, yet the plan does not extend that lifecycle cleanup to Arango.
- The new edge functions are described functionally, but not from an authorization or row-fetching model perspective.
- The end-to-end verification asks for manual confirmation in Arango without defining the exact checks that make a run pass or fail.

## Required Changes Before Implementation

1. Replace the Task 1 migration filename with a timestamp newer than the latest existing migration in `supabase/migrations/`.
2. Add a reconciliation strategy for delete/reset partial failures.
   Acceptable examples: a durable cleanup queue, a retryable outbox record, a `cleanup_pending` state, or another explicit compensating mechanism.
3. Add Arango cleanup requirements for the re-parse path in `trigger-parse`, not just delete/reset.
4. Specify the auth pattern for `manage-overlays` and `manage-document`.
   The plan should say exactly which operations use a user client, which use an admin client, and where ownership is verified.
5. Define the upload-stage reset payload field-by-field so every caller restores the same Arango document shape.
6. Expand the test plan with the required harness approach for `conversion-complete`, `runs`, `worker`, `manage-overlays`, and `manage-document`, plus concrete Arango verification commands for the smoke test.

## Verification Expectations

- Verify the replacement migration sorts after `20260314130000_087_upload_support_all_remove_upload_gates.sql`.
- Verify `syncParsedDocumentToArango` writes document, Docling payload, and blocks, and that delete/reset helpers remove all five collection types by `source_uid`.
- Verify retrying a failed parse does not leave stale Arango Docling payloads, blocks, runs, or overlays from the previous attempt.
- Verify `manage-document` exposes a detectable retry/reconciliation state when Arango cleanup fails after Postgres success.
- Verify `manage-overlays` and `manage-document` reject unauthorized callers and do not leak rows outside the caller's ownership scope.
- Verify the real-document smoke test records the exact AQL or API request used for each check.

## Acceptance Criteria Check

- Alignment with product direction and constraints: `Pass`
- Clear scope boundaries: `Pass`
- API/data contract clarity: `Partial`
- Dependency and sequencing correctness: `Fail`
- Risk handling and rollback strategy: `Fail`
- Security/auth implications: `Partial`
- Operational readiness: `Partial`
- Test/verification clarity: `Partial`

## Final Recommendation

`No-Go` until the three blocking issues are fixed: migration ordering, missing cross-system reconciliation for delete/reset failures, and missing Arango cleanup on re-parse.

Once those are corrected, this plan should be re-reviewed. The overall direction is strong and lines up with the current codebase, but it is not yet implementation-ready enough to hand to an execution agent without creating avoidable lifecycle drift.
