# Parse Runtime Hardening Assessment

## Plan Metadata

- Source path: `docs/plans/2026-03-15-parse-runtime-hardening.md`
- Date reviewed: `2026-03-15`
- Reviewer: `Codex`

## Verdict

`Conditional Pass`

## Findings

### Critical

None.

### Major

1. Task 2 does not resolve whether failed parses should retain runtime metadata in `conversion_parsing` or discard it.
   The revised draft correctly fixes the earlier stale-success problem by deleting `conversion_parsing`, `blocks`, and `conversion_representations` in the failure path ([2026-03-15-parse-runtime-hardening.md](/home/jon/BD2/docs/plans/2026-03-15-parse-runtime-hardening.md#L74)). But `view_documents` exposes `pipeline_config`, `requested_pipeline_config`, `applied_pipeline_config`, and `parser_runtime_meta` from `conversion_parsing`, and the parse UI reads those fields directly ([20260314140000_088_parse_runtime_audit.sql](/home/jon/BD2/supabase/migrations/20260314140000_088_parse_runtime_audit.sql#L20), [parseArtifacts.ts](/home/jon/BD2/web/src/pages/parseArtifacts.ts#L75)). Full deletion fixes divergence, but it also removes the selected profile/runtime context from failed documents. The plan needs to make that contract explicit: either failed attempts intentionally lose parse metadata, or the row should be retained and rewritten to a failure state instead of deleted.

2. Task 3 is internally self-negating and should not remain as a “fix” task.
   The plan now walks through the current `trigger-parse` flow and correctly concludes that the original pending-sentinel bug claim is not real under the current ordering and `UNIQUE(source_uid)` constraint ([2026-03-15-parse-runtime-hardening.md](/home/jon/BD2/docs/plans/2026-03-15-parse-runtime-hardening.md#L185)). After proving that, it still keeps Task 3 in the implementation list and summary as if it were a runtime hardening fix. That makes scope and priority less clear than they should be. This should either be removed entirely or reclassified as optional cleanup.

3. The backend verification plan is still too weak for the riskiest changes.
   Task 1 and Task 2 only say to rerun the existing three `conversion-complete` contract tests ([2026-03-15-parse-runtime-hardening.md](/home/jon/BD2/docs/plans/2026-03-15-parse-runtime-hardening.md#L60), [2026-03-15-parse-runtime-hardening.md](/home/jon/BD2/docs/plans/2026-03-15-parse-runtime-hardening.md#L139)), but those tests do not execute the handler logic that is being changed ([conversion-complete/index.test.ts](/home/jon/BD2/supabase/functions/conversion-complete/index.test.ts#L1)). That is enough for regression smoke coverage, not enough to validate idempotent block upserts, multi-table cleanup on failure, or the non-fatal Arango error path. The plan needs at least one concrete verification method for each modified backend behavior.

### Minor

1. Task 4’s sample test uses an invalid document view mode literal.
   The proposed test returns `'stored_blocks'`, but the current document view mode type only allows `'normalized'` or `'raw_docling'` ([documentViews.ts](/home/jon/BD2/web/src/pages/superuser/documentViews.ts#L4)). The sample should use a real mode value.

2. The optional cache task is now described accurately, but it should stay clearly separated from the hardening core.
   The draft correctly changed the wording from “LRU” to insertion-order eviction ([2026-03-15-parse-runtime-hardening.md](/home/jon/BD2/docs/plans/2026-03-15-parse-runtime-hardening.md#L318)). That is fine as hygiene work, but it should remain explicitly optional so it does not dilute the main failure-state fixes.

## Specific Gaps, Contradictions, And Ambiguity

- The revised draft fixes the earlier schema mismatch, but Task 2 still leaves the failed-parse metadata contract unstated.
- Task 3 explains why the original bug theory was wrong, then still keeps a task slot and summary row for it.
- The frontend scope is now much tighter and better supported.
- The backend scope is directionally correct, but the verification steps still do not test the new behavior directly.

## Required Changes Before Implementation

1. Decide the failure-state contract for `conversion_parsing`.
   Preferred options:
   - retain the row and rewrite it to `conv_status: "failed"` with no surviving blocks/representations, or
   - explicitly document that failed parses intentionally drop requested/applied pipeline metadata from `view_documents`.

2. Remove or reclassify Task 3.
   If the current code is only awkward, call it an optional refactor and do not present it as a runtime bug fix.

3. Strengthen backend verification.
   Add either:
   - a handler-level Deno test harness for `conversion-complete`, or
   - a manual verification section that explicitly exercises duplicate callbacks, post-block failure cleanup, and Arango failure in the catch path.

4. Fix the Task 4 sample test to use a valid `DocumentViewMode`.

## Verification Expectations

- Verify duplicate `conversion-complete` callbacks leave one set of `blocks` rows for the same `conv_uid`.
- Verify a failure after blocks insertion leaves no stale `blocks` or `conversion_representations` rows and leaves the chosen `conversion_parsing` failure state exactly as documented.
- Verify an Arango exception inside the inner catch path still returns HTTP 200 with `status: "parse_failed"`.
- Verify the empty-blocks UI now shows a neutral informational message instead of using the error path.

## Acceptance Criteria Check

- Alignment with product direction and constraints: `Pass`
- Clear scope boundaries: `Partial`
- API/data contract clarity: `Partial`
- Dependency and sequencing correctness: `Pass`
- Risk handling and rollback strategy: `Partial`
- Security/auth implications: `Pass`
- Operational readiness: `Partial`
- Test/verification clarity: `Partial`

## Final Recommendation

`Go` after the three major edits above.

This revision is materially better than the prior draft. It removed the unsupported frontend work, corrected the schema assumptions, and narrowed the plan to real failure-state issues. The remaining gaps are concentrated in contract clarity for failed parse metadata, the still-present non-bug Task 3, and verification depth for the backend changes.
