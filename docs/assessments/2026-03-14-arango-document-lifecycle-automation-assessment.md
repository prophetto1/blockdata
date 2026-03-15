# Arango Document Lifecycle Automation Assessment

## Plan Metadata

- Source path: `docs/plans/2026-03-14-arango-document-lifecycle-automation.md`
- Date reviewed: `2026-03-14`
- Reviewer: `Codex`

## Verdict

`Conditional Pass`

## Findings

### Critical

None.

### Major

1. Task 5's worker sample still uses identifiers that do not match the real file and would not compile if copied literally.
   The plan says `run_id` is already parsed in `worker/index.ts` and then uses `run_id` plus `supabaseAdmin` throughout the sample batch-sync block. In the current worker implementation, the parsed variable is `runId` and the admin client variable is `supabase`. The plan's own compile-check rationale is good, but the sample code in [2026-03-14-arango-document-lifecycle-automation.md](E:\writing-system\docs\plans\2026-03-14-arango-document-lifecycle-automation.md) still points the implementer toward the wrong identifiers.

2. Task 5 and Task 6 still have an auth-status mismatch in their sample implementations and test expectations.
   The shared helper [supabase.ts](E:\writing-system\supabase\functions\_shared\supabase.ts) throws on missing or invalid auth, and the sample edge functions in the plan catch that in a broad `catch` that returns `500`. But Task 5 explicitly says `manage-overlays` tests should expect missing auth to return `403`, and Task 6 lists missing auth as a test case without specifying the code path fix. As written, the snippets and the test expectations disagree.

3. Task 3 still treats missing Docling JSON for Arango as non-fatal even though the acceptance criteria require a self-contained projection.
   In the proposed `conversion-complete` snippet, a Storage download failure only logs and continues with `rawBytes = new Uint8Array(0)`. That means the document can still end in a `parsed` state while Arango never receives the full `doclingdocument_json`, which conflicts with the plan's own goal and acceptance criteria that Arango can reconstruct the full Docling document from its own data alone.

### Minor

1. Task 6's missing-auth behavior should be locked the same way Task 5's is.
   The plan improved the caller behavior for `partial: true`, which helps. It should do the same for missing auth: either specify `401/403` and add the explicit branch in the sample function, or say the function returns the generic auth error shape from `requireUserId`.

2. Task 4's example ancestry query and implementation query use different shapes.
   The introductory example shows a relational join through `source_documents!inner(project_id)`, while the implementation sample below uses two queries. Both are workable, but the plan should pick one so the implementer is not left deciding which contract is canonical mid-task.

## Specific Gaps, Contradictions, And Ambiguity

- Task 5's prose says “use it directly,” but the sample still uses `run_id` and `supabaseAdmin`, not the actual `runId` and `supabase` identifiers from the live file.
- Task 5's and Task 6's auth test expectations do not match the sample control flow built around `requireUserId`.
- Task 3 allows Arango payload loss to degrade into a warning even though the self-contained projection is supposed to be a required property, not best-effort behavior.
- The plan is now consistent on migration ordering, outbox scope, and the need to batch worker-side Arango sync. Those earlier issues are resolved.

## Required Changes Before Implementation

1. Fix Task 5's sample code to use the actual worker identifiers from `supabase/functions/worker/index.ts`.
   Recommended change: replace `run_id` with `runId` and `supabaseAdmin` with `supabase` everywhere in the worker snippet.
2. Make the auth contract explicit for both new edge functions.
   Either:
   - add explicit `401/403` handling around `requireUserId(req)`, then keep the test expectations, or
   - change the test expectations to match the generic catch behavior.
3. Tighten Task 3's Arango payload rule.
   If full `doclingdocument_json` is required for acceptance, then a Docling JSON download failure during Arango sync should not silently degrade to a partial projection. At minimum, the plan should require an outbox/retry path or mark the parse as partially failed.
4. Pick one canonical ancestry-fetch pattern in Task 4 and remove the alternative example to reduce implementation drift.

## Verification Expectations

- Verify the worker batch-sync snippet is updated to match the real `worker/index.ts` identifier names before implementation starts.
- Verify `manage-overlays` and `manage-document` both have explicit, testable behavior for missing or invalid auth.
- Verify `conversion-complete` cannot report success for the self-contained Arango projection unless the full Docling payload is either synced or queued for retry.
- Verify the new tests listed in Tasks 3, 5, and 6 are aligned with the actual control flow in the code snippets.

## Acceptance Criteria Check

- Alignment with product direction and constraints: `Pass`
- Clear scope boundaries: `Pass`
- API/data contract clarity: `Partial`
- Dependency and sequencing correctness: `Pass`
- Risk handling and rollback strategy: `Partial`
- Security/auth implications: `Partial`
- Operational readiness: `Partial`
- Test/verification clarity: `Partial`

## Final Recommendation

`No-Go` from this exact draft, but it is close.

This version is substantially better and is near execution-ready. Before handing it to an implementer, fix the worker snippet identifiers, align the auth behavior with the tests, and decide whether missing Docling JSON for Arango is a hard failure or a queued retry instead of a silent best-effort skip.
