# 2026-04-08 Emergency Backend Surface Correction Status Report

**Purpose:** Record the current implementation status of the April 7 successor plan, summarize everything completed in `Phase 1`, capture the exact verification evidence, restate the current written scope of `Phase 2` and `Phase 3`, and propose the plan updates needed so the next implementation steps match current product intent.

**Primary authority reviewed:** `E:\writing-system\docs\plans\2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md`

**Supporting design reviewed:** `E:\writing-system\docs\plans\2026-04-07-emergency-backend-surface-correction-frontend-initiation-design.md`

**Skills explicitly loaded for this report**

1. `using-superpowers`
2. `repo-investigator`
3. `investigating-and-writing-plan`
4. `writing-clearly-and-concisely`

## Executive Summary

`Phase 1` is implemented and verified at the scoped successor-plan level.

The readiness surface at `http://localhost:5374/app/superuser/operational-readiness` is no longer lying in the key ways that triggered the April 7 correction batch:

1. only the real bucket CORS seam remains backend-actionable
2. the false AGChain model-target failure is repaired
3. the real bucket CORS action executes from the mounted page
4. the page refreshes into truthful post-action state
5. the telemetry page at `http://localhost:5374/app/observability/telemetry` is now a real status page rather than placeholder copy

Fresh focused verification in this session is green:

1. backend: `59 passed, 4 warnings`
2. frontend: `14 passed`

The current wording of `Phase 2` in the April 7 plan still treats it as conditional and gate-driven. That wording no longer matches current product direction. If the intended direction is to continue the still-viable remainder of the March 30 program without treating `Phase 2` and `Phase 3` as optional, then the plan should be updated before further implementation so later evaluation does not claim the code exceeded the approved contract.

## Scope Note

This report is intentionally limited to the emergency backend surface correction program. The working tree contains unrelated changes, including PDF.js Express packaging work, study-pattern junction reorganization, and documentation movement. Those are real repository changes, but they are not counted as part of this status report unless they directly touched the correction-plan files.

## Sources Reviewed

### Plan and design sources

1. `E:\writing-system\docs\plans\2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md`
2. `E:\writing-system\docs\plans\2026-04-07-emergency-backend-surface-correction-frontend-initiation-design.md`
3. `E:\writing-system\docs\plans\__superseded\2026-03-30-emergency-backend-surface-correction-plan.md`

### Backend implementation sources

1. `E:\writing-system\services\platform-api\app\api\routes\admin_runtime_readiness.py`
2. `E:\writing-system\services\platform-api\app\services\runtime_action_service.py`
3. `E:\writing-system\services\platform-api\app\services\runtime_readiness.py`
4. `E:\writing-system\services\platform-api\app\observability\runtime_readiness_metrics.py`
5. `E:\writing-system\services\platform-api\tests\test_admin_runtime_readiness_routes.py`
6. `E:\writing-system\services\platform-api\tests\test_runtime_action_service.py`
7. `E:\writing-system\services\platform-api\tests\test_runtime_readiness_service.py`
8. `E:\writing-system\services\platform-api\tests\test_observability.py`

### Frontend implementation sources

1. `E:\writing-system\web\src\lib\operationalReadiness.ts`
2. `E:\writing-system\web\src\hooks\useOperationalReadiness.ts`
3. `E:\writing-system\web\src\components\superuser\OperationalReadinessCheckGrid.tsx`
4. `E:\writing-system\web\src\components\superuser\OperationalReadinessCheckGrid.test.tsx`
5. `E:\writing-system\web\src\hooks\useOperationalReadiness.test.tsx`
6. `E:\writing-system\web\src\pages\superuser\SuperuserOperationalReadiness.tsx`
7. `E:\writing-system\web\src\pages\superuser\SuperuserOperationalReadiness.test.tsx`
8. `E:\writing-system\web\src\pages\ObservabilityTelemetry.tsx`
9. `E:\writing-system\web\src\pages\ObservabilityTelemetry.test.tsx`

## Phase 1 Status

### Phase 1 contract in the April 7 plan

The April 7 successor defines `Phase 1` as the immediate executable tranche. Its required items are:

1. re-lock the current readiness contract and repair stale focused tests
2. add `runtime_action_service.py`
3. add `POST /admin/runtime/storage/browser-upload-cors/reconcile`
4. narrow readiness actionability so the page no longer overclaims backend-owned remediation
5. repair false readiness probe failures where the readiness service is miscalling mounted seams, starting with `agchain.models.targets`
6. wire the concrete action into the current readiness page, hook, and grid
7. replace `ObservabilityTelemetry.tsx` with a real status page backed by `GET /observability/telemetry-status`
8. run focused backend and frontend verification for readiness and telemetry

### What was implemented in Phase 1

#### 1. Re-locked the readiness contract and fixed stale tests

What was wrong before:

1. the readiness grid test file still assumed a simpler one-layer detail model
2. it used stale assertions that no longer matched the mounted page behavior

What was changed:

1. `E:\writing-system\web\src\components\superuser\OperationalReadinessCheckGrid.test.tsx` was updated to match the richer readiness detail contract
2. frontend tests were added or updated to cover executable action behavior through the mounted hook and page flow
3. `E:\writing-system\web\src\hooks\useOperationalReadiness.test.tsx` and `E:\writing-system\web\src\pages\superuser\SuperuserOperationalReadiness.test.tsx` now exercise the action execution and refresh behavior

Result:

1. the readiness tests now track the mounted page semantics instead of an older contract snapshot

#### 2. Added the concrete backend action service

New file:

1. `E:\writing-system\services\platform-api\app\services\runtime_action_service.py`

What it does:

1. declares the concrete action id `storage_browser_upload_cors_reconcile`
2. applies the checked-in `ops/gcs/user-storage-cors.json` policy to the configured bucket
3. emits the required structured log event `runtime_readiness_action`
4. emits success and failure observability data with the actual `error_type` on failure

Important implementation details:

1. the action id is locked in the service as `storage_browser_upload_cors_reconcile`
2. the service no longer lies about failure type; it reports `type(exc).__name__`

#### 3. Added the concrete action route

Modified file:

1. `E:\writing-system\services\platform-api\app\api\routes\admin_runtime_readiness.py`

New route:

1. `POST /admin/runtime/storage/browser-upload-cors/reconcile`

What it does:

1. invokes the runtime action service
2. emits route-side `runtime_readiness_action` logs and metrics
3. returns success or failure through the readiness action path

Important implementation details:

1. the route now emits the structured log event on both success and failure
2. the route-side logging includes `error_type` on failures

#### 4. Narrowed readiness actionability

Modified file:

1. `E:\writing-system\services\platform-api\app\services\runtime_readiness.py`

What changed:

1. `blockdata.storage.bucket_config` no longer advertises a backend-owned action when the fix is actually external
2. `blockdata.storage.signed_url_signing` failure branches no longer advertise backend-owned remediation
3. the missing-bucket `blockdata.storage.bucket_cors` branch now uses `external_change` rather than falsely advertising `backend_action`
4. the concrete `bucket_cors` backend action remains available only when the backend can truly execute it

Result:

1. the readiness page now distinguishes external-change reality from real backend-owned actionability much more honestly

#### 5. Repaired the false AGChain readiness failure

Modified file:

1. `E:\writing-system\services\platform-api\app\services\runtime_readiness.py`

What was wrong before:

1. the readiness probe for `agchain.models.targets` called `list_model_targets` with an unsupported `user_id` argument
2. this caused a false fail on the readiness page even though the underlying seam was mounted and working

What changed:

1. the readiness probe now calls `list_model_targets(limit=1, offset=0)` without the invalid `user_id`

Result:

1. the readiness page no longer misreports the AGChain model-target seam as broken for that reason

#### 6. Wired the concrete action into the mounted readiness page

Modified files:

1. `E:\writing-system\web\src\lib\operationalReadiness.ts`
2. `E:\writing-system\web\src\hooks\useOperationalReadiness.ts`
3. `E:\writing-system\web\src\components\superuser\OperationalReadinessCheckGrid.tsx`
4. `E:\writing-system\web\src\pages\superuser\SuperuserOperationalReadiness.tsx`

What changed:

1. `operationalReadiness.ts` now owns `executeOperationalReadinessAction(...)`
2. `useOperationalReadiness.ts` now calls that helper, manages pending state, success state, failure state, and triggers `refresh()`
3. `OperationalReadinessCheckGrid.tsx` renders executable controls instead of static action text
4. backend-actionable rows start expanded when they have real available actions
5. the page wiring in `SuperuserOperationalReadiness.tsx` connects the action flow to the mounted route

Result:

1. the bucket CORS action is executable from `http://localhost:5374/app/superuser/operational-readiness`
2. the snapshot refreshes after action execution
3. actionable rows expose the control immediately instead of burying it behind a misleading closed state

#### 7. Replaced the telemetry placeholder with a real page

Modified and new files:

1. `E:\writing-system\web\src\pages\ObservabilityTelemetry.tsx`
2. `E:\writing-system\web\src\pages\ObservabilityTelemetry.test.tsx`

What changed:

1. the page now requests `GET /observability/telemetry-status`
2. it renders real config-backed telemetry status instead of placeholder copy
3. it explicitly states that the page does not prove successful OTLP export or collector ingest
4. it has a real error state when the telemetry status request fails

Result:

1. `http://localhost:5374/app/observability/telemetry` is now an honest status page instead of a stub pretending to be more than it is

#### 8. Added and repaired the required observability seam

Modified files:

1. `E:\writing-system\services\platform-api\app\observability\runtime_readiness_metrics.py`
2. `E:\writing-system\services\platform-api\app\api\routes\admin_runtime_readiness.py`
3. `E:\writing-system\services\platform-api\app\services\runtime_action_service.py`

What was required by the plan:

1. span `runtime.readiness.action.execute`
2. counter `runtime_readiness_actions_total`
3. histogram `runtime_readiness_action_duration_ms`
4. structured log event `runtime_readiness_action`
5. emit locations at both the concrete action service and the invoking route

What landed:

1. the route and the service both emit the structured log event
2. the service and route both emit accurate `error_type` values on failure
3. the metric and span surfaces are present and covered by focused tests

### Evaluation and remediation loops already completed during Phase 1

Phase 1 did not land in a single clean pass. Several review loops were required. Those loops are part of the real implementation record and matter for understanding current state.

#### First review loop

Findings raised:

1. route-side structured logging was missing
2. service-side `error_type` was hardcoded incorrectly
3. backend verification evidence needed to be rerun using the correct Python interpreter

Resolution:

1. route-side logging was added
2. real exception-class capture replaced the hardcoded `RuntimeError`
3. backend verification was rerun with `C:\Users\jwchu\AppData\Local\Programs\Python\Python311\python.exe`

#### Second review loop

Findings raised:

1. readiness truthfulness was still incomplete for certain branches
2. the real action was not yet executable from the mounted page
3. telemetry was still placeholder in the earlier state

Resolution:

1. readiness truthfulness narrowing landed in `runtime_readiness.py`
2. action execution landed through the mounted hook/page/grid flow
3. the telemetry page replacement and test landed

#### Final deviation cleanup loop

Findings raised:

1. the missing-bucket `bucket_cors` branch still used `backend_action`
2. the frontend POST helper lived in the hook rather than in `operationalReadiness.ts`

Resolution:

1. missing-bucket `bucket_cors` was changed to `external_change`
2. the POST helper moved into `operationalReadiness.ts`

## Phase 1 Verification Record

### Backend verification

Final focused backend command rerun in this session:

```powershell
C:\Users\jwchu\AppData\Local\Programs\Python\Python311\python.exe -m pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py tests/test_runtime_action_service.py tests/test_observability.py
```

Result:

1. `59 passed, 4 warnings`

What this verification covers:

1. readiness truthfulness and service behavior
2. readiness action route behavior
3. action service behavior
4. observability coverage around the readiness action seam

### Frontend verification

Final focused frontend command rerun in this session:

```powershell
npm.cmd run test -- src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/hooks/useOperationalReadiness.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/pages/ObservabilityTelemetry.test.tsx
```

Result:

1. `14 passed`

What this verification covers:

1. readiness grid rendering and action affordance
2. readiness hook execution/refresh state
3. mounted superuser readiness page behavior
4. telemetry page loading, honesty text, and error state

### Runtime evidence notes

What is proven:

1. code-level implementation matches the scoped `Phase 1` contract
2. focused backend tests pass
3. focused frontend tests pass

What is not independently replayed in this session:

1. live browser verification of `http://localhost:5374/app/superuser/operational-readiness`
2. live browser verification of `http://localhost:5374/app/observability/telemetry`

Why that browser evidence is missing:

1. the local Playwright MCP/browser setup previously failed before launch on this machine due to a `.playwright-mcp` creation issue under `C:\Windows\System32`

### Residual warnings and caveats

There is one real residual environment issue that still appears after backend verification:

1. OTLP exporter shutdown/refused-connection logging still appears after the pytest suite completes because the local collector endpoint on `localhost:4318` is not accepting those exports during the test shutdown path

This is important, but it did not invalidate the focused `Phase 1` test pass. It remains relevant to the larger telemetry-proof discussion for later work.

## Phase 1 File-Level Status

### New files added

1. `E:\writing-system\services\platform-api\app\services\runtime_action_service.py`
2. `E:\writing-system\services\platform-api\tests\test_runtime_action_service.py`
3. `E:\writing-system\web\src\pages\ObservabilityTelemetry.test.tsx`

### Existing files modified as part of Phase 1

1. `E:\writing-system\services\platform-api\app\api\routes\admin_runtime_readiness.py`
2. `E:\writing-system\services\platform-api\app\services\runtime_readiness.py`
3. `E:\writing-system\services\platform-api\app\observability\runtime_readiness_metrics.py`
4. `E:\writing-system\services\platform-api\tests\test_admin_runtime_readiness_routes.py`
5. `E:\writing-system\services\platform-api\tests\test_runtime_readiness_service.py`
6. `E:\writing-system\services\platform-api\tests\test_observability.py`
7. `E:\writing-system\web\src\lib\operationalReadiness.ts`
8. `E:\writing-system\web\src\hooks\useOperationalReadiness.ts`
9. `E:\writing-system\web\src\components\superuser\OperationalReadinessCheckGrid.tsx`
10. `E:\writing-system\web\src\components\superuser\OperationalReadinessCheckGrid.test.tsx`
11. `E:\writing-system\web\src\pages\superuser\SuperuserOperationalReadiness.tsx`
12. `E:\writing-system\web\src\hooks\useOperationalReadiness.test.tsx`
13. `E:\writing-system\web\src\pages\superuser\SuperuserOperationalReadiness.test.tsx`
14. `E:\writing-system\web\src\pages\ObservabilityTelemetry.tsx`
15. `E:\writing-system\docs\plans\2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md`

## Current Written Phase 2 Scope

### What the April 7 plan currently says

The current written `Phase 2` section still frames the phase as conditional and gate-driven. Its written purpose is:

1. decide which larger March 30 backend/control-surface ambitions still belong after `Phase 1`

Its current entry questions are:

1. whether honest telemetry visibility is still insufficient
2. whether durable probe/action history is still justified
3. whether pipeline upload and job-execution seams still need backend-owned proof surfaces

### What the current plan says Phase 2 may include

The current written scope allows the following:

1. persisted probe/action audit migrations
2. `runtime_probe_service.py`
3. explicit readiness detail/verify/run lookup routes
4. telemetry export probe semantics
5. pipeline browser-upload and job-execution probes
6. frontend proof panels on Pipeline Services and Index Builder

### Current repo reality for Phase 2 targets

Targets that do not exist yet:

1. `E:\writing-system\services\platform-api\app\services\runtime_probe_service.py`
2. `E:\writing-system\services\platform-api\app\api\routes\admin_runtime_actions.py`
3. `E:\writing-system\web\src\components\pipelines\PipelineOperationalProbePanel.tsx`

Targets that already exist and would be extended rather than created:

1. `E:\writing-system\web\src\pages\ObservabilityTraces.tsx`
2. `E:\writing-system\web\src\pages\PipelineServicesPage.tsx`
3. `E:\writing-system\web\src\pages\IndexBuilderPage.tsx`
4. `E:\writing-system\web\src\components\pipelines\PipelineCatalogPanel.tsx`
5. `E:\writing-system\web\src\components\pipelines\IndexJobFilesTab.tsx`
6. `E:\writing-system\web\src\components\pipelines\IndexJobRunsTab.tsx`
7. `E:\writing-system\web\src\components\pipelines\IndexJobArtifactsTab.tsx`
8. `E:\writing-system\web\src\hooks\useIndexBuilderJob.ts`

## Current Written Phase 3 Scope

### What the April 7 plan currently says

The current written `Phase 3` section defines AGChain cleanup and truthfulness correction as:

1. distinguish stub surfaces from backed surfaces in the main AGChain rail
2. harden `AgchainSectionPage.tsx` so exposed stub pages read unmistakably as stubs
3. remove or sharply demote placeholder-backed overview content
4. keep real AGChain surfaces visually and semantically distinct from stubs

### Current repo reality for Phase 3 targets

All primary Phase 3 targets exist already and would be modified in place:

1. `E:\writing-system\web\src\components\agchain\AgchainLeftNav.tsx`
2. `E:\writing-system\web\src\components\layout\AgchainShellLayout.tsx`
3. `E:\writing-system\web\src\pages\agchain\AgchainOverviewPage.tsx`
4. `E:\writing-system\web\src\components\agchain\overview\agchainOverviewPlaceholderData.ts`
5. `E:\writing-system\web\src\pages\agchain\AgchainSectionPage.tsx`
6. `E:\writing-system\web\src\pages\agchain\AgchainPromptsPage.tsx`
7. `E:\writing-system\web\src\pages\agchain\AgchainScorersPage.tsx`
8. `E:\writing-system\web\src\pages\agchain\AgchainParametersPage.tsx`
9. `E:\writing-system\web\src\pages\agchain\AgchainObservabilityPage.tsx`

## How I Recommend Updating the Plan Before Continuing

### Core update

The most important change is conceptual, not cosmetic:

1. stop presenting `Phase 2` as optional or hypothetical
2. stop presenting `Phase 3` as something that happens only if `Phase 2` survives a narrow gate
3. rewrite the successor so the still-viable remainder of the March 30 correction program is explicitly required work

### Specific plan edits I recommend

#### 1. Update locked product decisions

Current problem:

1. the plan says `Phase 2` is conditional and begins with a revalidation gate

Recommended update:

1. change that language so `Phase 2` is the required next tranche
2. preserve only the narrower scope-confirmation logic inside `Phase 2`, not the idea that the whole phase may disappear

#### 2. Update the Phase 0 task disposition table

Current problem:

1. multiple March 30 tasks are still written as `Phase 2 if needed`

Recommended update:

1. rewrite the task-disposition rows so the still-viable portions of Tasks 2 through 8 are explicitly carried forward as required implementation
2. keep only truly obsolete work closed
3. keep only truly superseded work moved to `Phase 4`

#### 3. Rewrite the Phase 2 section itself

Current problem:

1. the section is written as a gate review
2. the `if the answer is yes` / `if the answer is no` structure implies that broad `Phase 2` work might never be implemented

Recommended update:

1. rewrite `Phase 2` as the required backend/control-surface continuation
2. explicitly list what is in scope now
3. remove the rhetorical frame that the whole phase might be skipped

#### 4. Make the persistence decision explicit

Current problem:

1. the plan still leaves durable action/probe history as a deferred conditional question
2. that wording will cause repeated evaluation churn if implementation begins without a firm decision

Recommended update:

1. decide persistence explicitly before `Phase 2` coding starts
2. if the target is to move materially closer to the March 30 correction goal, I recommend bringing persistence back in explicitly as part of `Phase 2`
3. if persistence is brought back in, revise the plan with concrete timestamped migration file paths and updated counts before implementation starts

Reason:

1. readiness detail/verify/run surfaces and telemetry/pipeline proof become more coherent if probe/action runs have a durable audit spine

#### 5. Keep Phase 3 mandatory and narrow

Current problem:

1. `Phase 3` is written correctly in scope, but its place in the overall narrative can still read as secondary if `Phase 2` is treated as optional

Recommended update:

1. explicitly say `Phase 3` is a required tranche after the backend/control-surface continuation
2. keep its scope narrow
3. do not let it expand into new AGChain product-domain work

### My recommended Phase 2 implementation shape after the update

If the plan is updated to match the current product direction, I would make `Phase 2` include:

1. explicit persistence decision and migration addendum if persistence is in
2. `runtime_probe_service.py`
3. `admin_runtime_actions.py` and router registration in `main.py`
4. readiness detail/verify/run lookup surfaces tied to real probe/action semantics
5. telemetry proof work beyond config visibility
6. backend-owned pipeline browser-upload and job-execution probes
7. mounted proof UI on `PipelineServicesPage` and `IndexBuilderPage`
8. focused backend and frontend verification for the new proof surfaces

### My recommended Phase 3 implementation shape after the update

I would keep `Phase 3` narrow and explicit:

1. relabel or visually demote stub entries in the AGChain left rail
2. make stub section pages unmistakably stub-like
3. remove or sharply demote deceptive overview placeholder content
4. preserve backed AGChain surfaces as clearly distinct from stubs
5. verify this entirely through frontend/runtime behavior and tests, without inventing new AGChain backend families

## Proposed Next Execution Order

If the report is accepted, I recommend the following sequence:

1. patch the April 7 successor plan so `Phase 2` and `Phase 3` are no longer framed as optional
2. lock the Phase 2 scope explicitly, including the persistence decision
3. implement `Phase 2` with TDD and focused verification
4. implement `Phase 3` with TDD and focused verification
5. return to `Phase 4` only after `Phase 2` and `Phase 3` land

## Bottom Line

`Phase 1` is done in the successor-plan sense that matters for implementation progress:

1. the readiness page is materially more truthful
2. one real backend-owned action exists and is executable from the mounted page
3. the false AGChain readiness failure is repaired
4. the telemetry page is no longer placeholder copy
5. focused backend and frontend verification are green

The next problem is not implementation readiness. The next problem is plan wording. The current plan still describes `Phase 2` as conditional in a way that does not match the intended execution direction. If the intent is to continue toward the full still-viable target without treating `Phase 2` and `Phase 3` as optional, the plan should be updated first so the next implementation batch is fully authorized and does not trigger avoidable evaluation churn.
