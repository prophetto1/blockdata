# Arango Lifecycle Plan Hardening Assessment

## Plan Metadata

- Source path: `docs/plans/2026-03-14-arango-lifecycle-plan-hardening.md`
- Date reviewed: `2026-03-14`
- Reviewer: `Codex`

## Verdict

`Conditional Pass`

## Findings

### Critical

None.

### Major

1. The collection-cache task will make the current Arango helper tests order-dependent unless the plan explicitly resets the cache between tests.
   Task 2 adds a module-level `_collectionCache` and changes `ensureDocumentsCollection` and `ensureBlocksCollection` to use it, but it does not tell the implementer to update `supabase/functions/_shared/arangodb.test.ts` to call `_resetCollectionCache()` before each test. The current tests assert exact call counts and call order. Once the cache persists across tests, those assertions can fail depending on test order rather than product behavior.

2. The parent-plan patch list does not fully propagate the `502` to `207 + partial` contract change.
   Task 4 Step 2 updates the parent plan's failure bullet and one verification checklist item, but it does not also update the parent plan's `manage-document` test expectations or the example frontend helper contract to include the `partial` response shape. That leaves the parent plan internally inconsistent after the hardening edit pass: one section says partial failure returns `207`, while other sections still imply `502` or a simple `{ ok, error }` response.

3. The re-parse hardening still has a recovery gap if Arango cleanup itself fails.
   Task 3 adds a non-fatal `deleteProjectionForSourceFromArango` call in `trigger-parse`, but on failure it only logs and continues. At the same time, Task 1's `cleanup_outbox` migration only allows `action IN ('delete', 'reset')`. If re-parse cleanup fails and the next parse also fails, stale Arango data can still remain with no durable retry path. The plan should either add a retryable re-parse cleanup action to the outbox or state clearly that log-only recovery is an intentional non-goal.

### Minor

1. Task 2 helper coverage is narrower than the surrounding narrative.
   The plan text says these helpers support the parent plan's larger delete/reset contract, but the proposed tests only cover document and block cleanup. That is acceptable as scaffolding for the current codebase, but the plan should say so explicitly to avoid implying that docling-document, run, and overlay cleanup are already covered by this hardening step.

2. The source-of-truth parent-plan path should be stated once and used consistently.
   This hardening plan correctly targets `docs/priority/2026-03-14-arango-document-lifecycle-automation.md`, while the earlier assessment file referenced `docs/plans/...`. The hardening plan should keep the `docs/priority/...` path and call it the canonical parent-plan location to avoid future patching against the wrong file.

## Specific Gaps, Contradictions, And Ambiguity

- Task 2 changes runtime caching behavior, but the plan does not include the test-isolation work needed to keep `arangodb.test.ts` deterministic.
- Task 4 updates only part of the parent plan's partial-failure contract, leaving tests and helper examples behind.
- Task 3 introduces best-effort re-parse cleanup, but the new retry mechanism does not cover that path.
- The helper tests in Task 2 read as final cleanup coverage even though they only validate the currently existing Arango collections.

## Required Changes Before Implementation

1. Add an explicit test-isolation step to Task 2.
   It should import `_resetCollectionCache()` into `supabase/functions/_shared/arangodb.test.ts` and call it before each test that asserts collection-ensure requests.
2. Expand Task 4 Step 2 so the parent plan update also changes:
   - the `manage-document` test case from `502` to `207`
   - the example frontend helper return type to include `partial?: boolean`
   - any user-facing verification text that still expects `502`
3. Decide how re-parse cleanup failure is recovered.
   Preferred option: extend `cleanup_outbox.action` to include a re-parse cleanup action and write an outbox row from `trigger-parse` when Arango cleanup fails.
4. Clarify in Task 2 that the helper tests cover the current two-collection Arango projection and will expand to docling documents, runs, and overlays in the parent implementation plan.

## Verification Expectations

- Verify `arangodb.test.ts` remains deterministic when tests run in different orders after caching is introduced.
- Verify the parent plan contains no remaining `502` references for partial Arango cleanup failure after the hardening edit pass.
- Verify re-parse cleanup failures are either retryable through `cleanup_outbox` or explicitly documented as best-effort only.
- Verify the parent plan still makes a clear distinction between current hardening coverage and later full-projection cleanup across all five Arango collections.

## Acceptance Criteria Check

- Alignment with product direction and constraints: `Pass`
- Clear scope boundaries: `Pass`
- API/data contract clarity: `Partial`
- Dependency and sequencing correctness: `Partial`
- Risk handling and rollback strategy: `Partial`
- Security/auth implications: `Pass`
- Operational readiness: `Partial`
- Test/verification clarity: `Partial`

## Final Recommendation

`No-Go` for implementation from this exact draft, but it is close.

Make the three major plan edits above first, then this hardening plan should be ready to execute before the main Arango lifecycle plan. The direction is strong; the remaining issues are mostly about keeping the hardening changes internally consistent and making failure recovery explicit.
