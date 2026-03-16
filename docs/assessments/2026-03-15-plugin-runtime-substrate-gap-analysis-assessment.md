# Plugin Runtime Substrate And Runtime Gap Analysis Assessment

## Plan Metadata

- Source path: `docs/proposal/2026-03-16-plugin-runtime-substrate.md`
- Source path: `docs/proposal/2026-03-16-runtime-gap-analysis.md`
- Date reviewed: `2026-03-15`
- Reviewer: `Codex`

## Verdict

`Fail`

## Findings

### Critical

1. The pair overstates readiness by treating `ExecutionContext` helpers as the main remaining prerequisite, while omitting already verified blockers in execution routing, worker/job handling, and triggers.
   The implementation plan says closing six `ExecutionContext` gaps lets translated plugins run end to end and says there are no other prerequisites. The gap-analysis document similarly concludes that a small set of "easy" and "medium" fixes is enough before translation becomes "purely business logic." That is not supported by current source. The generic plugin route in [plugin_execution.py](E:\writing-system\services\platform-api\app\api\routes\plugin_execution.py:44) still does not pass `user_id` into `ExecutionContext`, while the connection-backed plugins in [gcs.py](E:\writing-system\services\platform-api\app\plugins\gcs.py:23) and [arangodb.py](E:\writing-system\services\platform-api\app\plugins\arangodb.py:19) require `context.user_id`. The paired documents also do not account for verified Kestra runtime pieces above `RunContext`, including worker tasks and trigger interfaces in [WorkerTask.java](E:\kestra\core\src\main\java\io\kestra\core\runners\WorkerTask.java:17), [PollingTriggerInterface.java](E:\kestra\core\src\main\java\io\kestra\core\models\triggers\PollingTriggerInterface.java:14), and [RealtimeTriggerInterface.java](E:\kestra\core\src\main\java\io\kestra\core\models\triggers\RealtimeTriggerInterface.java:11). As written, the plan would give implementers false confidence that broad plugin translation is unblocked when it is not.

2. The proposed streaming substrate is not safe as written because it leaks HTTP clients and leaves lifecycle ownership undefined.
   In the plan, `download_from_storage_stream()` creates an `httpx.AsyncClient()`, returns only an `httpx.Response`, and tells the caller to "close the client" even though the client is no longer accessible. `download_file_stream()` repeats the same pattern for raw HTTP URLs. This is a shared substrate API, so lifecycle mistakes here would be repeated across every translated plugin that streams artifacts. See [2026-03-16-plugin-runtime-substrate.md](E:\writing-system\docs\proposal\2026-03-16-plugin-runtime-substrate.md:50) and [2026-03-16-plugin-runtime-substrate.md](E:\writing-system\docs\proposal\2026-03-16-plugin-runtime-substrate.md:130).

### Major

1. The gap analysis incorrectly marks credential resolution as having "no gap for translation" even though the current generic execution path does not supply the user identity required by connection-backed plugins.
   The analysis says the connection pattern is functionally equivalent and declares "No gap for translation." That conclusion skips a real runtime gap already present in source: `load_runs.py` passes `user_id`, but `plugin_execution.py` does not. This is not a theoretical concern; it directly affects any translated plugin that calls `resolve_connection_sync`. See [2026-03-16-runtime-gap-analysis.md](E:\writing-system\docs\proposal\2026-03-16-runtime-gap-analysis.md:182), [plugin_execution.py](E:\writing-system\services\platform-api\app\api\routes\plugin_execution.py:44), and [load_runs.py](E:\writing-system\services\platform-api\app\api\routes\load_runs.py:142).

2. The Jinja2 upgrade is presented as a near-Pebble-equivalent substrate improvement, but the proposed implementation does not provide the same contract and is too optimistic for a shared runtime abstraction.
   The analysis itself notes missing Pebble behaviors like functions and typed rendering, then the implementation plan proposes a broad Jinja2 replacement and claims that after the plan ships, translation becomes "pure business logic." The proposed renderer preserves only simple undefined names, does not provide Kestra-like helpers such as `secret()` or `now()`, and wraps failures in a blanket fallback that returns the template unchanged, which can hide rendering defects. That makes it a useful enhancement, but not a reliable compatibility claim. See [2026-03-16-runtime-gap-analysis.md](E:\writing-system\docs\proposal\2026-03-16-runtime-gap-analysis.md:130), [2026-03-16-plugin-runtime-substrate.md](E:\writing-system\docs\proposal\2026-03-16-plugin-runtime-substrate.md:642), and [models.py](E:\writing-system\services\platform-api\app\domain\plugins\models.py:73).

3. The paired documents materially under-scope the problem by analyzing only `RunContext`-like conveniences while excluding execution-lifecycle services that many translated plugins need.
   This is the main reason the plan arrives at an "~8 hours" conclusion. The analysis inventories file IO, serialization, temp files, render, metrics, retry, timeout, and secrets, but it does not treat trigger runtime, job polling, worker execution, or flow/execution services as first-class dependencies even though those are present in Kestra core and are required by many non-trivial plugin families. That makes the diagnosis useful for a narrow helper layer, but insufficient as a general plugin-translation prerequisite. See [2026-03-16-runtime-gap-analysis.md](E:\writing-system\docs\proposal\2026-03-16-runtime-gap-analysis.md:21), [2026-03-16-runtime-gap-analysis.md](E:\writing-system\docs\proposal\2026-03-16-runtime-gap-analysis.md:243), [ExecutionService.java](E:\kestra\core\src\main\java\io\kestra\core\services\ExecutionService.java:64), and [FlowService.java](E:\kestra\core\src\main\java\io\kestra\core\services\FlowService.java:46).

4. The effort and dependency claims are not credible enough for implementation planning.
   The implementation plan says there are "no other prerequisites" and the gap analysis says the substrate is "~6-8 hours of work." Those may be reasonable instincts for a small helper extraction, but they are not justified by source evidence and they ignore the adoption work needed in existing plugins, dependency additions, behavioral verification, and the current routing/auth gap. These numbers are too aggressive to serve as a real execution estimate. See [2026-03-16-plugin-runtime-substrate.md](E:\writing-system\docs\proposal\2026-03-16-plugin-runtime-substrate.md:11), [2026-03-16-runtime-gap-analysis.md](E:\writing-system\docs\proposal\2026-03-16-runtime-gap-analysis.md:243), and [2026-03-16-runtime-gap-analysis.md](E:\writing-system\docs\proposal\2026-03-16-runtime-gap-analysis.md:374).

### Minor

1. The implementation plan mixes a narrow substrate objective with broader claims about MongoDB, JDBC, and GCP translation, which makes scope boundaries blurry.
   If the document is only a helper-layer plan, the claims about making broad translation "pure business logic" should be reduced. If it is a platform prerequisite plan, then the missing worker, trigger, auth, and registry dependencies need to move into scope explicitly. See [2026-03-16-plugin-runtime-substrate.md](E:\writing-system\docs\proposal\2026-03-16-plugin-runtime-substrate.md:13) and [2026-03-16-plugin-runtime-substrate.md](E:\writing-system\docs\proposal\2026-03-16-plugin-runtime-substrate.md:770).

2. Some storage API details in the plan are not source-verified inside this repo and should be marked as assumptions before implementation.
   The proposed `list_storage()` and `delete_from_storage()` helpers introduce new request shapes that are not exercised anywhere else in current source, so they should be explicitly flagged as API-contract assumptions rather than treated as settled implementation detail. See [2026-03-16-plugin-runtime-substrate.md](E:\writing-system\docs\proposal\2026-03-16-plugin-runtime-substrate.md:65) and [storage.py](E:\writing-system\services\platform-api\app\infra\storage.py:1).

## Specific Gaps, Contradictions, And Ambiguity

- The gap-analysis document is valuable as a narrow `ExecutionContext` helper audit, but it is not a complete end-to-end runtime dependency map.
- The implementation plan treats helper extraction as if it closes the whole platform prerequisite chain for translation, which is not true for connection-backed execution, worker-bound jobs, or triggers.
- The plan does not distinguish between what is safe for a MongoDB-family helper layer and what is safe to generalize across the full Kestra plugin surface.
- The proposed streaming API needs an explicit ownership model for response and client lifecycle before it can be adopted as shared infrastructure.

## Required Changes Before Implementation

1. Reframe both documents so they explicitly cover only the helper-layer substrate they actually analyze.
   Recommended change: rename the scope from "translated plugins can run end-to-end" to "shared helper/runtime utilities for file IO, temp files, JSONL, and rendering."

2. Add the missing routing/auth prerequisite to the dependency list.
   Recommended change: treat `plugin_execution.py` user propagation as a prerequisite fix, not as an unrelated issue.

3. Split helper-layer substrate from higher-order runtime dependencies.
   Recommended change: create a dependency section for worker jobs, trigger runtime, scheduler/state, and execution lifecycle so implementers know what remains outside this plan.

4. Redesign the streaming API before implementation.
   Recommended change: return an owned async context manager, or centralize streaming inside helper functions that fully manage client lifetime instead of returning a naked response.

5. Downgrade or remove the aggressive effort and readiness claims.
   Recommended change: replace "~8 hours" and "no other prerequisites" with bounded estimates plus explicit assumptions and exclusions.

6. Mark unverified storage request shapes and Jinja2/Pebble parity claims as assumptions requiring verification.

## Verification Expectations

- Verify that the generic plugin execution route passes `user_id` before calling any connection-backed translated plugin.
- Verify any new streaming storage helper has a testable ownership model for both response and client cleanup.
- Verify added dependencies are installed and exercised through real tests under `services/platform-api/tests/`.
- Verify the Jinja2 renderer contract is intentionally narrower than Pebble, or else add explicit compatibility tests for every promised feature.
- Verify the revised plan separates helper-layer substrate from worker/trigger/execution-layer prerequisites.

## Acceptance Criteria Check

- Alignment with product direction and constraints: `Partial`
- Clear scope boundaries: `Fail`
- API/data contract clarity: `Partial`
- Dependency and sequencing correctness: `Fail`
- Risk handling and rollback strategy: `Partial`
- Security/auth implications: `Partial`
- Operational readiness: `Fail`
- Test/verification clarity: `Partial`

## Final Recommendation

`No-Go` from this draft pair.

The runtime-gap-analysis document is the stronger of the two. It asks a better question than the earlier proposal set and it does surface real helper-layer gaps. The implementation plan, however, turns that useful analysis into an over-broad readiness claim and includes at least one unsafe shared-API design.

These documents should be revised, not discarded. The right next version is:

1. keep the helper-layer substrate work
2. explicitly add the current `user_id` routing gap as a prerequisite
3. clearly separate helper substrate from worker/trigger/job/runtime dependencies
4. remove the claim that plugin translation becomes generally "pure business logic" after this plan alone
