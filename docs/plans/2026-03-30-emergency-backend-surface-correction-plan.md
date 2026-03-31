# Emergency Backend Surface Correction And Decontamination Plan

**Goal:** Correct the March 27 through March 30 implementation cluster that repeatedly bypassed backend-first requirements, overclaimed implementation progress, exposed non-functional frontend surfaces as if they were real product capabilities, and treated partial telemetry plumbing as operational proof. This plan rebuilds the affected work around declared `platform-api` seams, explicit observability, verified database ownership, and exact file-level correction scope.

**Architecture:** Treat the current state as contaminated. Do not extend the contaminated implementations from their current assumptions. Replace the affected work with a backend-first correction program across five tracks: `Operational Readiness`, `Pipeline Services`, `AGChain shell surfaces`, `OpenTelemetry proof`, and `plan-set decontamination`. `platform-api` remains the primary owned runtime. Supabase Postgres remains the persistence layer. OpenTelemetry remains the observability substrate, but only after probe and export verification are real. Frontend routes are allowed to exist only when they are backed by a declared contract in the same correction plan.

**Tech Stack:** FastAPI, React + TypeScript, Supabase Postgres migrations, OpenTelemetry, Google Cloud Storage, pytest, Vitest, Playwright for browser verification where required.
**Plan Type:** Correction / Decontamination Plan

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-30
**Scope window:** 2026-03-27 through 2026-03-30
**Primary requirement source:** `E:\writing-system\.codex\investigating-and-writing-plan\SKILL.md`
**Debugging discipline source:** `E:\writing-system\.codex\comprehensive-systematic-debugging\SKILL.md`

[Added per evaluation finding revision note] Any new text prefixed with `[Added per evaluation finding #N]` in this revision was added to address the 2026-03-30 pre-implementation plan evaluation findings directly inside the plan artifact.

## 1. Plan purpose

This is not a continuation plan.

This is a correction plan.

Its job is to do all of the following:

1. name every affected implementation surface that was developed today and in the immediately preceding commits that conform to the same failure pattern
2. inventory every implementation file that belongs to those surfaces
3. identify the exact inline, hardcoded, placeholder, or architecture-shortcut patterns that violated the planning and backend-surface requirements
4. define the backend, observability, database, and frontend correction scope in one locked plan
5. invalidate the contaminated plans that should no longer be treated as authority
6. turn the correction into exact execution tasks with exact files, exact commands, expected output, and commit cadence

## 2. Scope

### 2.1 In scope

The following commit cluster is in scope because it either introduced the failure pattern directly or supplied the still-active code that today’s work continued to rely on:

1. `137a632d8a5f2843cf0a1002a7c2ed07e50cd594` — `2026-03-28 01:48:03 -0700`
2. `87701df830f526cd8bf656b33c5681aa19a828b5` — `2026-03-28 04:22:58 -0700`
3. `fe9d6c8a467ff2786d905cd798d7c652b4c54e44` — `2026-03-28 10:59:49 -0700`
4. `b5d302f383ec03818ae443e4f36a6cf62eee0d39` — `2026-03-30 06:22:49 -0700`
5. `ba2a2facba27e8ca4ea0293e17152734793470cf` — `2026-03-30 10:52:09 -0700`
6. `2388283d1f352309f8f9c125261494e736994ba3` — `2026-03-30 13:08:21 -0700`
7. `daef141de708398957f111e1a11443c136317036` — `2026-03-27 18:46:26 -0700`
8. `cecad7443b84b663777fedb6ac5232ca6b43a7e5` — `2026-03-27 22:34:13 -0700`

### 2.2 In-scope implementation surfaces

1. `Operational Readiness`
2. `Pipeline Services`
3. `AGChain shell surfaces`
4. `OpenTelemetry`
5. `Contaminated plan set and implementation claims`

### 2.3 Out of scope

The following are not the primary correction target of this plan:

1. unrelated archival documentation movement that did not define implementation behavior
2. `_agchain/legal-10` benchmark-package internals that were not modified by the contaminated March 27-30 surface work
3. legacy edge-function design paths unless an affected flow still depends on them

## 3. Why this plan exists

The failure pattern is not one bug.

It is a repeated implementation mode:

1. a frontend surface or shell slot is created first
2. the backend surface is absent, partial, or never formally declared
3. the plan language overstates how complete the surface is
4. observability is described as if it proves runtime truth when it often only proves configuration
5. tests pass against the wrong standard, the wrong seam, or the wrong runtime condition
6. the user still cannot actually complete the intended flow end-to-end

This plan stops that pattern.

## 4. Verified evidence used to write this plan

The plan is based on verified code and runtime evidence, not on the contaminated plans alone.

### 4.1 Skills and planning rules read before drafting

1. `E:\writing-system\.codex\investigating-and-writing-plan\SKILL.md`
2. `E:\writing-system\.codex\comprehensive-systematic-debugging\SKILL.md`
3. `C:\Users\jwchu\.codex\skills\brainstorming\SKILL.md`

### 4.2 Commits reviewed

1. `137a632d8a5f2843cf0a1002a7c2ed07e50cd594`
2. `87701df830f526cd8bf656b33c5681aa19a828b5`
3. `fe9d6c8a467ff2786d905cd798d7c652b4c54e44`
4. `b5d302f383ec03818ae443e4f36a6cf62eee0d39`
5. `ba2a2facba27e8ca4ea0293e17152734793470cf`
6. `2388283d1f352309f8f9c125261494e736994ba3`
7. `daef141de708398957f111e1a11443c136317036`
8. `cecad7443b84b663777fedb6ac5232ca6b43a7e5`

### 4.3 Runtime and test evidence

#### Backend targeted test run

Command:

```powershell
cd E:\writing-system\services\platform-api
pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py tests/test_pipelines_routes.py tests/test_pipeline_multi_markdown_job.py tests/test_observability.py
```

Observed result:

1. `52 passed`
2. OTEL exporter threads emitted connection and timeout failures against `localhost:4318` after test completion

Meaning:

1. the targeted backend tests currently pass at the unit/integration level
2. the OTEL export path is not operationally proven by those tests
3. passing tests are not enough to treat OTEL as healthy

#### Frontend targeted test run

Command:

```powershell
cd E:\writing-system\web
npm exec vitest run src/components/common/useShellHeaderTitle.test.tsx src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/pages/PipelineServicesPage.test.tsx src/pages/IndexBuilderPage.test.tsx src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx --reporter=dot
```

Observed result:

1. `4` test files passed
2. `1` test file failed
3. the failing slice was `src/components/common/useShellHeaderTitle.test.tsx`
4. the failure was the pipeline services breadcrumb regression where `Overview` still appears when the route should stay titled `Pipeline Services`

Meaning:

1. the frontend shell/nav work is not fully clean
2. pipeline services shell normalization is still incomplete even in the narrow regression slice

#### Runtime evidence from the current superuser surface

Verified observations:

1. the readiness page rendered real data
2. it showed `Bucket CORS: FAIL`
3. it showed `Storage bucket config: OK`
4. it showed `Signed upload URL signing: OK`
5. the failing `Bucket CORS` evidence included:
   - `cors_configured=false`
   - `rule_count=0`
   - `allows_upload_methods=false`
6. the `Client Environment` panel showed `configured http://localhost:8001`

Meaning:

1. the readiness surface can catch real blockers
2. the page is still too shallow because it does not own the real remediation/control plane
3. the wrong-backend mismatch was also real and came from the frontend base-url/proxy assumptions

## 5. Skill compliance checkpoints

This section records the concrete plan-contract elements already declared in this document.

### 5.1 Required plan contract compliance

This plan explicitly declares:

1. full backend surface
2. observability surface
3. database migration surface
4. edge-function zero case
5. exact frontend surface area
6. locked inventory counts and file inventories
7. frozen compatibility seams
8. explicit risks
9. completion criteria
10. exact execution tasks with exact files and commands

### 5.2 Debugging-skill compliance

This plan treats the following as root-cause categories, not as side comments:

1. plan-reality divergence
2. frontend-backend mismatch
3. missing declared backend seams
4. missing or misleading observability proof
5. tests that do not prove the intended operational behavior

## 6. Failure pattern definition

The failure pattern this plan corrects is:

1. a surface is exposed
2. the plan language claims or implies it is implemented
3. the actual backend contract is absent, partial, or too generic
4. the observability contract is config-only or partial
5. the user still cannot perform the intended operational flow

In this repo, that pattern appeared in four concrete ways:

1. `Operational Readiness` was built around one snapshot endpoint and shallow remediation text instead of a real backend-owned control plane
2. `Pipeline Services` had real backend work, but its success claims outran end-to-end operational proof
3. `AGChain` exposed many placeholder shell surfaces as if they were implementation progress
4. `OpenTelemetry` was treated as healthy based on configuration and instrumentation presence rather than actual export proof

## 7. Current-state implementation matrix

| Surface | Backend surface | OTEL surface | Database / Supabase | Frontend surface | Objective state |
|---|---|---|---|---|---|
| Operational Readiness | One read-only endpoint plus service logic | Readiness-specific spans, counters, histogram | No new persistence | Real page/hook/grid/client panel | Architecturally failed for control-plane intent |
| Pipeline Services | Real product endpoints exist | Real pipeline metrics exist | Real migrations exist | Real workbench exists | Partial; must be re-judged only by end-to-end behavior |
| AGChain shell surfaces | Mixed; Benchmarks/Models have routes, many pages have none | Partial only | Mixed; benchmark/model persistence exists, placeholder pages have none | Many exposed placeholder pages | Contaminated; non-functional surfaces treated as progress |
| OpenTelemetry | Real bootstrap and status endpoint | Real tracer/meter/log wiring | No new persistence for proof/audit | Settings/nav mentions only | Partial plumbing, not proof |
| Plan set | Many plans exist | N/A | N/A | N/A | Contaminated and non-authoritative until explicitly replaced |

## 8. Cross-checked root-cause findings

### Finding 1

`Operational Readiness` was implemented as a snapshot, not as a control plane.

Evidence:

1. [admin_runtime_readiness.py](/E:/writing-system/services/platform-api/app/api/routes/admin_runtime_readiness.py) exposes only `GET /admin/runtime/readiness`
2. [useOperationalReadiness.ts](/E:/writing-system/web/src/hooks/useOperationalReadiness.ts) only fetches `'/admin/runtime/readiness?surface=all'`
3. [operationalReadiness.ts](/E:/writing-system/web/src/lib/operationalReadiness.ts) only models:
   - `status`
   - `summary`
   - `evidence`
   - `remediation`
4. [OperationalReadinessCheckGrid.tsx](/E:/writing-system/web/src/components/superuser/OperationalReadinessCheckGrid.tsx) renders only `Evidence` and `Remediation`

Root-cause judgment:

The product shape was wrong before implementation started. The current code matches that wrong shape.

### Finding 2

The current readiness contract hides the actual cause/fix/dependency layers.

Evidence:

1. [runtime_readiness.py](/E:/writing-system/services/platform-api/app/services/runtime_readiness.py) defines `_make_check(...)` with `remediation: str` and no `cause`, `blocked_by`, `fix`, or `verify_after`
2. `check_shared_observability_telemetry_config` only returns `enabled` and `protocol`
3. `check_blockdata_storage_bucket_cors` returns rule count and method allowance but still collapses next action into one line

Root-cause judgment:

The API contract is too shallow for the intended operator use.

### Finding 3

Telemetry status is config-only, not proof.

Evidence:

1. [telemetry.py](/E:/writing-system/services/platform-api/app/api/routes/telemetry.py) returns `get_telemetry_status(get_settings())`
2. [otel.py](/E:/writing-system/services/platform-api/app/observability/otel.py) `get_telemetry_status(...)` returns config values only
3. the backend targeted test run emitted OTLP export failures to `localhost:4318` even while tests passed

Root-cause judgment:

The current status surface can say telemetry is enabled without proving the collector is reachable or that export succeeds.

### Finding 4

Frontend routing and proxy defaults created a real backend mismatch seam.

Evidence:

1. [platformApi.ts](/E:/writing-system/web/src/lib/platformApi.ts) defaults to `'/platform-api'` when `VITE_PLATFORM_API_URL` is absent
2. [vite.config.ts](/E:/writing-system/web/vite.config.ts) proxies `/platform-api` to `http://localhost:8000` by default
3. [start-platform-api.ps1](/E:/writing-system/scripts/start-platform-api.ps1) defaults to `Port = 8000`
4. the actual repo-started runtime used for debugging later had to be forced to `8001`

Root-cause judgment:

The local-runtime target seam was left implicit and therefore drifted.

### Finding 5

AGChain exposed placeholder pages as if they were legitimate surfaces.

Evidence:

1. [AgchainSectionPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainSectionPage.tsx) defaults `statusLabel = 'Project-scoped placeholder surface'`
2. [AgchainParametersPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainParametersPage.tsx) says the surface “will live here” and “will eventually own”
3. [AgchainPromptsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainPromptsPage.tsx) says the surface “will live here” and “will eventually connect”
4. [AgchainToolsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainToolsPage.tsx) says the surface “will live here” and “will eventually coordinate”
5. [AgchainDatasetsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainDatasetsPage.tsx) says “This placeholder locks the shell slot”
6. [AgchainObservabilityPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainObservabilityPage.tsx) says AGChain “should use” host-platform OTEL patterns “once the rest of the project shell is actively in motion”
7. [AgchainRunsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainRunsPage.tsx) says execution “should be triggered through platform API patterns” while no run-control surface is implemented there

Root-cause judgment:

These pages are explicit placeholders. Exposing them as shell surfaces counted as false implementation progress.

### Finding 6

The AGChain overview route is partially placeholder-driven.

Evidence:

1. [agchainOverviewPlaceholderData.ts](/E:/writing-system/web/src/components/agchain/overview/agchainOverviewPlaceholderData.ts) defines static “Recent” dataset/prompt/tool items
2. the same file defines `agchainOverviewEvaluationActions` with static links
3. the same file defines a placeholder prompt string
4. [AgchainOverviewPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainOverviewPage.tsx) uses fallback descriptive text stating the shell is still being promoted into first-class surfaces

Root-cause judgment:

The overview page is not fully backed by runtime-owned AGChain data.

### Finding 7

AGChain project focus is partially local-browser state, not a dedicated backend project registry.

Evidence:

1. [agchainProjectFocus.ts](/E:/writing-system/web/src/lib/agchainProjectFocus.ts) stores focus in `localStorage`
2. [useAgchainProjectFocus.ts](/E:/writing-system/web/src/hooks/agchain/useAgchainProjectFocus.ts) loads focus from local storage and resolves it against `fetchAgchainBenchmarks(...)`
3. [AgchainProjectsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainProjectsPage.tsx) treats benchmark rows as the project registry

Root-cause judgment:

The current project-selection seam is usable, but it is not a formally declared project-registry backend surface.

### Finding 8

Pipeline Services has real backend/data ownership, but the product was still judged by route and shell existence too often.

Evidence:

1. [pipelines.py](/E:/writing-system/services/platform-api/app/api/routes/pipelines.py) exposes real list/create/read/download routes
2. [pipeline_source_sets.py](/E:/writing-system/services/platform-api/app/services/pipeline_source_sets.py) persists source sets
3. [pipeline_storage.py](/E:/writing-system/services/platform-api/app/services/pipeline_storage.py) stores deliverables through `reserve_user_storage` and `complete_user_storage_upload`
4. [20260330120000_pipeline_source_sets_foundation.sql](/E:/writing-system/supabase/migrations/20260330120000_pipeline_source_sets_foundation.sql)
5. [20260330130000_pipeline_source_set_storage_contract.sql](/E:/writing-system/supabase/migrations/20260330130000_pipeline_source_set_storage_contract.sql)
6. the user still could not reliably upload a file because the runtime path depended on backend targeting and bucket CORS

Root-cause judgment:

Pipeline Services is the least fake surface in scope, but it still needs to be re-certified only by end-to-end operational proof, not by code presence.

### Finding 9

The readiness page and OTEL surface currently pass tests while hiding export failures.

Evidence:

1. backend targeted tests passed
2. background OTEL exporter threads still emitted:
   - span export failures
   - log export failures
   - metric export failures
   - connection refusal to `localhost:4318`

Root-cause judgment:

The test suite and status surface do not currently enforce real export success.

### Finding 10

Today’s plan set is contaminated because it inherited the wrong product shape.

Evidence:

1. readiness was repeatedly framed as `snapshot + remediation`
2. later plan variants still centered the wrong seam and did not declare proper backend action endpoints
3. user review has rejected the plan set as failed

Root-cause judgment:

Today’s plan set must be downgraded to non-authoritative and replaced.

## 9. Correction strategy

The correction strategy has five tracks.

### Track A

Decontaminate the `Operational Readiness` surface and rebuild it as a backend-owned control plane.

### Track B

Re-certify `Pipeline Services` only by real end-to-end operational behavior:

1. upload
2. source-document bridge
3. source-set persistence
4. job execution
5. deliverable retrieval

### Track C

Keep AGChain shell pages that do not have a declared backend/data contract exposed only as explicit stubs, and only promote them to real product surfaces after backend-first contract definition.

### Track D

Convert OTEL from config-and-plumbing status into explicit proof:

1. can export?
2. can collector receive?
3. did the probe actually emit?

### Track E

Invalidate contaminated plans and replace them with this correction sequence.

## Pre-implementation contract

This section is the evaluator-facing enforcement block for the entire plan. No implementer may treat later sections as optional interpretation guidance.

Inclusion boundaries:

1. correct the backend surface for `Operational Readiness`
2. re-certify `Pipeline Services` only through end-to-end backend truth
3. convert exposed AGChain shell surfaces without a declared backend/data contract into explicit stubs and stop counting them as implementation progress
4. replace config-only or plumbing-only telemetry claims with probe-backed proof
5. invalidate contaminated plans from March 27-30 where this failure pattern appears

Intentional exclusions:

1. no new legal-domain benchmark features
2. no new AGChain product domains beyond the backend contracts explicitly required to stop placeholder exposure
3. no design-only shell polish work that is not required by the corrected backend contracts
4. no generic admin capability registry unless it resolves into explicit platform-api routes and persisted run records
5. no script-first remediation surface standing in for backend-owned admin actions

Construction rules:

1. backend-required behavior must be declared as explicit `platform-api` routes before any frontend control-surface work is counted as progress
2. every backend-owned verification or remediation path must have an explicit service owner, route owner, observability owner, and test owner
3. every operator-visible “fix” path must be classified as one of: backend action, backend probe, or exact external change; no vague remediation-only states are allowed
4. no placeholder page, generic section page, or static shell filler may count as implementation progress for a product domain
5. no telemetry/readiness claim may be counted as operational proof if it is based only on config presence, bootstrap success, or mocked/unit-only assertions
6. no file outside the locked file inventory may be modified without revising this plan first
7. any backend-owned frontend control surface must have a frozen type contract, component inventory, layout contract, and explicit test inventory before implementation begins; if the frontend contract is underspecified, the plan is not executable

## Locked acceptance contract

This section is the zero-ambiguity approval gate for the implementation created from this plan.

The implementation is not acceptable unless all of the following are true:

1. `Operational Readiness` exposes explicit cause, blocker, exact action path, verification target, and next-probe guidance for every check
2. backend action routes exist for every remediation the platform can safely own
3. backend probe routes exist for every operational claim that must be proven rather than inferred
4. probe runs and action runs are persisted through explicit database tables and migrations
5. the readiness frontend renders the corrected backend contract rather than shallow evidence/remediation text
6. the readiness frontend implementation includes every required component and test seam declared in `11.5.1`; no panel, layout, or interaction may be left to implementer interpretation
7. `Pipeline Services` is proven by successful upload, source-set persistence, job execution, and deliverable verification, not by route or UI presence alone
8. AGChain pages without backend contracts may remain exposed only as explicit stubs and are no longer counted as implementation progress
9. telemetry status reflects export/probe truth and not only settings or instrumentation bootstrap
10. the contaminated plans listed later in this document are explicitly superseded, invalidated, or demoted according to their disposition
11. all locked tests and runtime verification commands pass against the corrected semantics

## 10. Required target state

At the end of this correction program:

1. `Operational Readiness` is a real backend-owned operational control plane
2. every readiness check exposes real cause, dependency, exact action, and exact verification target
3. action endpoints exist for remediations the backend can own safely
4. external-change cases still surface exact required changes without pretending to be backend actions
5. `Pipeline Services` is certified by end-to-end probes and tests, not by UI presence
6. AGChain placeholder pages may remain in the primary shell only as explicit stubs
7. OTEL status includes real export/probe proof, not only settings
8. contaminated plans are explicitly superseded

## 11. Manifest

### 11.0 Manifest-first summary

This summary front-loads the implementation authority for fast inspection. Detailed frozen contracts remain in `11.1` through `11.6`.

#### Platform API manifest

| Verb | Path | Action | Status |
| --- | --- | --- | --- |
| `GET` | `/admin/runtime/readiness` | keep the snapshot route, but upgrade it into a typed control-plane snapshot seam | modified existing |
| `GET` | `/observability/telemetry-status` | keep the path, but make it proof-backed instead of config-only | modified existing |
| `GET`, `POST` | `/admin/runtime/readiness/checks/{check_id}` | add targeted detail and verify seams for one readiness check | new |
| `GET` | `/admin/runtime/probe-runs/{probe_run_id}` | expose persisted probe-run audit lookup | new |
| `GET` | `/admin/runtime/action-runs/{action_run_id}` | expose persisted action-run audit lookup | new |
| `POST` | `/admin/runtime/{storage|supabase|background-workers|telemetry|pipeline-services}/*` | add explicit backend-owned remediation and proof routes only where this correction owns the seam | new |
| `GET`, `POST`, `PATCH` | `/pipelines/...` | retain already-real pipeline product routes and re-certify them by end-to-end proof | retained existing |
| `GET`, `POST` | `/agchain/benchmarks...` | keep the benchmark-registry seam explicit; do not introduce a new `/agchain/projects` backend domain in this correction | reused existing |
| various | future AGChain route families in `11.1.4` | remain out of current implementation scope and act only as stub-promotion gates | future gate / out of scope |

#### Observability manifest summary

| Type | Scope | Status | Detail |
| --- | --- | --- | --- |
| Traces | `2` retained, `12` new route/service spans | locked | `11.2.0` through `11.2.3` |
| Metrics | `11` retained counters, `15` new counters, `5` histograms total | locked | `11.2.0` through `11.2.4` |
| Structured logs | `4` retained, `6` new | locked | `11.2.0` and `11.2.5` |
| Proof semantics | config, instrumentation, export reachability, and proof are distinct states | locked | `11.2`, telemetry contract in `11.1.1` |

#### Database migrations manifest

| Migration | Creates / Alters | Existing-data impact | Status |
| --- | --- | --- | --- |
| `supabase/migrations/<timestamp>_admin_runtime_probe_runs.sql` | creates persisted readiness and proof audit records in `admin_runtime_probe_runs` | none; new audit table only | new required |
| `supabase/migrations/<timestamp>_admin_runtime_action_runs.sql` | creates persisted remediation audit records in `admin_runtime_action_runs` | none; new audit table only | new required |
| Pipeline Services track | no new persistence seams in this correction | existing pipeline tables remain authoritative | zero-case |
| AGChain shell decontamination track | no new persistence seams in this correction | frontend exposure correction only | zero-case |
| Telemetry proof state | reuse `admin_runtime_probe_runs` with `probe_kind = 'telemetry_export'` | no separate telemetry-proof table in this correction | locked design choice |

#### Edge Functions manifest

None. No new edge functions are added, and no existing edge function is the primary owned correction seam in this plan.

#### Frontend surface summary

| Track | Pages modified | New pages | Pages forced to stub state | Exposed-route effect |
| --- | --- | --- | --- | --- |
| Operational Readiness | `1` | `0` | `0` | existing superuser readiness page becomes a backend-owned control plane; no new frontend route |
| Pipeline Services | `2` | `0` | `0` | existing product routes remain exposed and gain proof/certification panels; no new frontend route |
| AGChain shell decontamination | `2` | `0` | `0` | AGChain overview/projects remain, and placeholder families may remain exposed only as explicit stubs with non-authoritative copy |
| Telemetry / admin | `2` | `0` | `0` | existing settings and superuser pages show proof-backed telemetry state; no new frontend route |

Detailed component, hook, lib, and file-level frontend contracts remain locked in `11.5` and the inventory sections.

## Locked platform API surface

This section freezes the API governance for the correction.

Included API surface families:

1. read-only diagnostic snapshot routes
2. check-detail routes
3. verification probe routes
4. backend-owned admin action routes
5. run-record lookup routes for probe and action executions
6. existing pipeline product routes that already represent real product behavior
7. future AGChain domain routes only where this plan explicitly requires them before a stub page is promoted to a real surface

Intentionally excluded API shapes:

1. generic `run-any-script` routes
2. generic “admin capability” mutation endpoints that do not map to a named operational seam
3. frontend-only fix pathways that bypass platform-api ownership
4. config-status routes presented as operational proof
5. AGChain domain routes invented merely to preserve placeholder shell pages

Platform API construction rules:

1. every new route must have explicit superuser or equivalent auth ownership
2. every new verification or action route must emit the locked telemetry declared in `Locked observability surface`
3. every new verification or action route must write a persisted run record when the route represents a durable admin action or a probe whose result must be auditable
4. every route must declare its upstream dependency seam in code and tests where blocked-by behavior exists
5. every route added by this plan must have route tests and service tests; route-only coverage is insufficient

## 11.1 Platform API

### 11.1.1 Existing endpoints to modify

#### `GET /admin/runtime/readiness`

Current role:

1. return grouped checks across `shared`, `blockdata`, and `agchain`

Current defect:

1. returns only shallow check records
2. no check detail endpoint
3. no dependency chain
4. no action execution
5. no verification run object

Required change:

1. keep the endpoint
2. expand its response contract
3. include:
   - `cause`
   - `cause_confidence`
   - `depends_on`
   - `blocked_by`
   - `available_actions`
   - `verify_after`
   - `next_if_still_failing`
   - `actionability`

[Added per evaluation findings #1, #3, and #7] Frozen readiness response seam:

```ts
type RuntimeReadinessStatus = 'ok' | 'warn' | 'fail' | 'unknown';
type RuntimeReadinessCategory =
  | 'process'
  | 'config'
  | 'credential'
  | 'connectivity'
  | 'browser-dependent'
  | 'observability'
  | 'product';
type RuntimeReadinessActionability = 'backend_action' | 'backend_probe' | 'external_change' | 'info_only';
type RuntimeReadinessCauseConfidence = 'high' | 'medium' | 'low' | null;
type RuntimeProbeKind =
  | 'readiness_check_verify'
  | 'storage_signed_upload'
  | 'supabase_admin_connectivity'
  | 'background_workers_config'
  | 'telemetry_export'
  | 'pipeline_services_browser_upload'
  | 'pipeline_services_job_execution';
type RuntimeActionKind = 'storage_browser_upload_cors_reconcile';
type RuntimeRunResult = 'ok' | 'fail' | 'error';
type RuntimeProbeErrorType =
  | 'missing_bucket'
  | 'missing_credentials'
  | 'configuration_error'
  | 'permission_denied'
  | 'transport_error'
  | 'collector_unreachable'
  | 'timeout'
  | 'unknown'
  | null;
type RuntimeSupabaseAdminOperation = 'storage.list_buckets';
type RuntimePipelineBrowserUploadFailingSeam =
  | 'bucket_config'
  | 'signing'
  | 'bucket_metadata'
  | 'cors_contract'
  | null;
type RuntimePipelineJobExecutionFailingStage =
  | 'job_create'
  | 'worker_claim'
  | 'worker_execute'
  | 'deliverable_persist'
  | 'deliverable_fetch'
  | null;

type RuntimeReadinessDependencyRef = {
  check_id: string;
  label: string;
  status: RuntimeReadinessStatus;
};

type RuntimeReadinessAvailableAction = {
  action_kind: RuntimeActionKind;
  label: string;
  description: string;
  route: '/admin/runtime/storage/browser-upload-cors/reconcile';
  requires_confirmation: boolean;
};

type RuntimeReadinessVerifyTarget = {
  probe_kind: RuntimeProbeKind;
  label: string;
  route:
    | '/admin/runtime/readiness/checks/{check_id}/verify'
    | '/admin/runtime/storage/signed-upload/probe'
    | '/admin/runtime/supabase/admin-connectivity/probe'
    | '/admin/runtime/background-workers/config/probe'
    | '/admin/runtime/telemetry/export/probe'
    | '/admin/runtime/pipeline-services/browser-upload/probe'
    | '/admin/runtime/pipeline-services/job-execution/probe';
};

type RuntimeReadinessNextStep = {
  step_kind: 'rerun_after_action' | 'inspect_dependency' | 'manual_fix' | 'escalate';
  label: string;
  description: string;
};

type RuntimeReadinessCheckRecord = {
  check_id: string;
  surface_id: 'shared' | 'blockdata' | 'agchain';
  category: RuntimeReadinessCategory;
  status: RuntimeReadinessStatus;
  label: string;
  summary: string;
  cause: string | null;
  cause_confidence: RuntimeReadinessCauseConfidence;
  depends_on: RuntimeReadinessDependencyRef[];
  blocked_by: RuntimeReadinessDependencyRef[];
  available_actions: RuntimeReadinessAvailableAction[];
  verify_after: RuntimeReadinessVerifyTarget[];
  next_if_still_failing: RuntimeReadinessNextStep[];
  actionability: RuntimeReadinessActionability;
  evidence: Record<string, string | number | boolean | null>;
  checked_at: string;
};

type RuntimeReadinessSurfaceRecord = {
  id: 'shared' | 'blockdata' | 'agchain';
  label: string;
  summary: { ok: number; warn: number; fail: number; unknown: number };
  checks: RuntimeReadinessCheckRecord[];
};

type RuntimeReadinessSnapshotResponse = {
  generated_at: string;
  summary: { ok: number; warn: number; fail: number; unknown: number };
  surfaces: RuntimeReadinessSurfaceRecord[];
};

type RuntimeProbeRunRecord = {
  probe_run_id: string;
  probe_kind: RuntimeProbeKind;
  check_id: string | null;
  result: RuntimeRunResult;
  duration_ms: number;
  evidence: Record<string, unknown>;
  failure_reason: string | null;
  created_at: string;
};

type RuntimeActionRunRecord = {
  action_run_id: string;
  action_kind: RuntimeActionKind;
  check_id: string | null;
  result: RuntimeRunResult;
  duration_ms: number;
  request: Record<string, unknown>;
  result_payload: Record<string, unknown>;
  failure_reason: string | null;
  created_at: string;
};

type RuntimeStorageBrowserUploadCorsReconcileRequest = {
  bucket_name?: string;
  allowed_origins: string[];
  allowed_methods: string[];
  response_headers: string[];
  max_age_seconds: number;
};

type RuntimeStorageBrowserUploadCorsReconcileResponse = {
  action_run_id: string;
  bucket_name: string;
  applied_rule_count: number;
  result: RuntimeRunResult;
  verify_check_ids: string[];
};

type RuntimeSignedUploadProbeResponse = {
  probe_run_id: string;
  result: RuntimeRunResult;
  has_bucket: boolean;
  signing_capable: boolean;
  error_type: RuntimeProbeErrorType;
};

type RuntimeSupabaseAdminConnectivityProbeResponse = {
  probe_run_id: string;
  result: RuntimeRunResult;
  operation: RuntimeSupabaseAdminOperation;
  reachable: boolean;
  error_type: RuntimeProbeErrorType;
};

type RuntimeBackgroundWorkersConfigProbeResponse = {
  probe_run_id: string;
  result: RuntimeRunResult;
  workers_configured: boolean;
  missing_keys: string[];
  error_type: RuntimeProbeErrorType;
};

type RuntimeTelemetryExportProbeResponse = {
  probe_run_id: string;
  collector_endpoint: string;
  result: RuntimeRunResult;
  span_export_result: RuntimeRunResult;
  metric_export_result: RuntimeRunResult;
  log_export_result: RuntimeRunResult;
  failure_reason: string | null;
};

type RuntimePipelineServicesBrowserUploadProbeResponse = {
  probe_run_id: string;
  result: RuntimeRunResult;
  failing_seam: RuntimePipelineBrowserUploadFailingSeam;
  bucket_configured: boolean;
  signing_capable: boolean;
  cors_configured: boolean;
  failure_reason: string | null;
};

type RuntimePipelineServicesJobExecutionProbeResponse = {
  probe_run_id: string;
  result: RuntimeRunResult;
  job_id: string | null;
  deliverable_count: number;
  failing_stage: RuntimePipelineJobExecutionFailingStage;
  failure_reason: string | null;
};
```

[Added per evaluation findings #1 and #7] Frozen `GET /admin/runtime/readiness` response:

```ts
type RuntimeReadinessSnapshotRouteResponse = RuntimeReadinessSnapshotResponse;
```

#### `GET /observability/telemetry-status`

Current role:

1. return telemetry settings

Current defect:

1. config-only
2. no export proof
3. no collector reachability proof
4. no last-probe result

Required change:

1. keep the endpoint
2. extend it with:
   - `collector_reachable`
   - `last_probe_run_id`
   - `last_probe_result`
   - `last_probe_at`
   - `last_probe_failure_reason`

[Added per evaluation finding #1] Response contract:

1. retain the existing config-facing fields from `get_telemetry_status(...)`
2. add probe-backed proof fields without changing the route path
3. do not introduce a second telemetry-status route in this correction; the existing path stays authoritative and must no longer behave as config-only proof

[Added per evaluation findings #1 and #7] Frozen `TelemetryStatusResponse`:

```ts
type TelemetryStatusResponse = {
  enabled: boolean;
  service_name: string;
  service_namespace: string;
  deployment_environment: string;
  otlp_endpoint: string;
  protocol: string;
  sampler: string;
  sampler_arg: number;
  log_correlation: boolean;
  metrics_enabled: boolean;
  logs_enabled: boolean;
  signoz_ui_url: string | null;
  jaeger_ui_url: string | null;
  collector_reachable: boolean | null;
  last_probe_run_id: string | null;
  last_probe_result: 'ok' | 'fail' | 'error' | null;
  last_probe_at: string | null;
  last_probe_failure_reason: string | null;
};
```

[Added per evaluation finding #8] Locked telemetry proof semantics:

1. `collector_reachable` proves exporter-path reachability only; it does not by itself prove downstream sink UI visibility
2. `last_probe_result` proves the most recent backend-owned export probe result recorded by this correction seam
3. `GET /observability/telemetry-status` is authoritative for backend proof state in this plan, but sink-query proof remains out of scope unless a follow-on plan explicitly adds it

[Added per evaluation finding #2] #### Existing AGChain benchmark-registry endpoints to keep explicit in this correction

[Added per evaluation finding #2] These endpoints already exist and remain the only backend-owned AGChain registry seam permitted in this correction tranche. No new `/agchain/projects` endpoint is introduced here.

[Added per evaluation finding #2] ##### `GET /agchain/benchmarks`

[Added per evaluation finding #2] Auth:

1. `require_user_auth`

[Added per evaluation finding #2] Request contract:

1. query params remain:
   - `search` optional string
   - `state` optional string
   - `validation_status` optional string
   - `has_active_runs` optional boolean
2. no request body

[Added per evaluation finding #2] Response contract:

1. `items[]` benchmark rows remain the project-selection registry feed for this correction
2. each row must continue to expose at least:
   - `benchmark_id`
   - `benchmark_slug`
   - `benchmark_name`
   - `description`
   - `state`
   - `validation_status`
   - `updated_at`
   - `href`

[Added per evaluation finding #2] Touches:

1. AGChain benchmark registry read model
2. no dedicated AGChain projects table or project-registry API is added in this correction

[Added per evaluation finding #2] ##### `POST /agchain/benchmarks`

[Added per evaluation finding #2] Auth:

1. `require_superuser`

[Added per evaluation finding #2] Request contract:

1. `benchmark_name` required string
2. `benchmark_slug` optional string
3. `description` optional string

[Added per evaluation finding #2] Response contract:

1. `ok`
2. `benchmark_id`
3. `benchmark_slug`
4. `benchmark_version_id`
5. `redirect_path`

[Added per evaluation finding #2] Touches:

1. AGChain benchmark registry create path
2. benchmark identity and initial draft-version creation logic

#### Existing pipeline product endpoints to retain and tighten

1. `GET /pipelines/definitions`
2. `GET /pipelines/{pipeline_kind}/sources`
3. `GET /pipelines/{pipeline_kind}/source-sets`
4. `POST /pipelines/{pipeline_kind}/source-sets`
5. `PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}`
6. `POST /pipelines/{pipeline_kind}/jobs`
7. `GET /pipelines/{pipeline_kind}/jobs/latest`
8. `GET /pipelines/jobs/{job_id}`
9. `GET /pipelines/jobs/{job_id}/deliverables`
10. `GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download`

Required change:

1. do not redesign these as fake shell surfaces
2. add operational probes around them
3. add stricter runtime reporting where source/document/job/deliverable seams break

### 11.1.2 New `Operational Readiness` control-plane endpoints

These are required because the current single-endpoint shape is insufficient.

#### `GET /admin/runtime/readiness/checks/{check_id}`

Purpose:

1. return one fully expanded readiness record
2. support targeted debugging and polling without rebuilding the full snapshot

Auth:

1. `require_superuser`

Touches:

1. readiness service logic
2. optional probe/action audit tables described below

Response contract:

1. use the frozen typed contract below; do not improvise shape in the route or hook layer

```ts
type RuntimeReadinessCheckDetailResponse = {
  check: RuntimeReadinessCheckRecord;
  latest_probe_run: RuntimeProbeRunRecord | null;
  latest_action_run: RuntimeActionRunRecord | null;
};
```

#### `POST /admin/runtime/readiness/checks/{check_id}/verify`

Purpose:

1. re-run one check on demand
2. persist a verification run
3. return the fresh check result with causality fields

Auth:

1. `require_superuser`

Touches:

1. readiness service
2. `admin_runtime_probe_runs`

Response contract:

```ts
type RuntimeReadinessVerifyResponse = {
  probe_run_id: string;
  check: RuntimeReadinessCheckRecord;
  duration_ms: number;
};
```

#### `GET /admin/runtime/probe-runs/{probe_run_id}`

Purpose:

1. fetch the full recorded result of a single probe run

Auth:

1. `require_superuser`

Touches:

1. `admin_runtime_probe_runs`

[Added per evaluation finding #1] Request contract:

1. path param `probe_run_id`
2. no request body

[Added per evaluation finding #1] Response contract:

```ts
type RuntimeProbeRunRouteResponse = RuntimeProbeRunRecord;
```

#### `GET /admin/runtime/action-runs/{action_run_id}`

Purpose:

1. fetch the full recorded result of a single action run

Auth:

1. `require_superuser`

Touches:

1. `admin_runtime_action_runs`

[Added per evaluation finding #1] Request contract:

1. path param `action_run_id`
2. no request body

[Added per evaluation finding #1] Response contract:

```ts
type RuntimeActionRunRouteResponse = RuntimeActionRunRecord;
```

### 11.1.3 New action endpoints for remediations the backend can safely own

These endpoints are explicit. This plan does not allow a generic `run-whatever-script` endpoint.

#### `POST /admin/runtime/storage/browser-upload-cors/reconcile`

Purpose:

1. apply the required browser-upload CORS policy to the configured GCS bucket

Why explicit:

1. this is a concrete platform-owned operation
2. it should not be hidden behind a generic action runner

Auth:

1. `require_superuser`

Request contract:

```ts
type RuntimeStorageBrowserUploadCorsReconcileRequest = {
  bucket_name?: string;
  allowed_origins: string[];
  allowed_methods: string[];
  response_headers: string[];
  max_age_seconds: number;
};
```

Touches:

1. GCS bucket metadata
2. `admin_runtime_action_runs`

Response contract:

```ts
type RuntimeStorageBrowserUploadCorsReconcileResponse = {
  action_run_id: string;
  bucket_name: string;
  applied_rule_count: number;
  result: RuntimeRunResult;
  verify_check_ids: string[];
};
```

#### `POST /admin/runtime/storage/signed-upload/probe`

Purpose:

1. prove that the runtime can generate a signed upload URL under the current credentials

Auth:

1. `require_superuser`

Touches:

1. GCS signing path
2. `admin_runtime_probe_runs`

Response contract:

```ts
type RuntimeSignedUploadProbeResponse = {
  probe_run_id: string;
  result: RuntimeRunResult;
  has_bucket: boolean;
  signing_capable: boolean;
  error_type: RuntimeProbeErrorType;
};
```

#### `POST /admin/runtime/supabase/admin-connectivity/probe`

Purpose:

1. prove that the runtime can perform the exact Supabase admin action used by the readiness check

Auth:

1. `require_superuser`

Touches:

1. Supabase admin client
2. `admin_runtime_probe_runs`

[Added per evaluation finding #1] Request contract:

1. no request body
2. the route always executes the exact admin operation used by the readiness check rather than a caller-supplied arbitrary action

[Added per evaluation finding #1] Response contract:

```ts
type RuntimeSupabaseAdminConnectivityProbeResponse = {
  probe_run_id: string;
  result: RuntimeRunResult;
  operation: RuntimeSupabaseAdminOperation;
  reachable: boolean;
  error_type: RuntimeProbeErrorType;
};
```

#### `POST /admin/runtime/background-workers/config/probe`

Purpose:

1. verify the worker prerequisites using the exact keys and environment rules required by the runtime

Auth:

1. `require_superuser`

Touches:

1. settings/config runtime
2. `admin_runtime_probe_runs`

[Added per evaluation finding #1] Request contract:

1. no request body
2. the route evaluates the runtime-owned worker prerequisites only

[Added per evaluation finding #1] Response contract:

```ts
type RuntimeBackgroundWorkersConfigProbeResponse = {
  probe_run_id: string;
  result: RuntimeRunResult;
  workers_configured: boolean;
  missing_keys: string[];
  error_type: RuntimeProbeErrorType;
};
```

#### `POST /admin/runtime/telemetry/export/probe`

Purpose:

1. emit a probe span
2. emit a probe metric
3. emit a probe log
4. force flush
5. detect whether export reached the configured collector or failed locally

Auth:

1. `require_superuser`

Touches:

1. OTEL provider
2. `admin_runtime_probe_runs`

Response contract:

```ts
type RuntimeTelemetryExportProbeResponse = {
  probe_run_id: string;
  collector_endpoint: string;
  result: RuntimeRunResult;
  span_export_result: RuntimeRunResult;
  metric_export_result: RuntimeRunResult;
  log_export_result: RuntimeRunResult;
  failure_reason: string | null;
};
```

#### `POST /admin/runtime/pipeline-services/browser-upload/probe`

Purpose:

1. verify the pipeline upload prerequisites using a controlled backend-owned probe
2. detect exactly which seam is failing:
   - bucket config
   - signing
   - bucket metadata access
   - CORS contract mismatch

Auth:

1. `require_superuser`

Touches:

1. storage helper logic
2. GCS metadata
3. `admin_runtime_probe_runs`

[Added per evaluation finding #1] Request contract:

1. no request body
2. the route must use a controlled backend-owned probe path rather than caller-supplied user content

[Added per evaluation finding #1] Response contract:

```ts
type RuntimePipelineServicesBrowserUploadProbeResponse = {
  probe_run_id: string;
  result: RuntimeRunResult;
  failing_seam: RuntimePipelineBrowserUploadFailingSeam;
  bucket_configured: boolean;
  signing_capable: boolean;
  cors_configured: boolean;
  failure_reason: string | null;
};
```

#### `POST /admin/runtime/pipeline-services/job-execution/probe`

Purpose:

1. verify that a queued job can move through worker execution and produce deliverables using a controlled fixture or dry-run path

Auth:

1. `require_superuser`

Touches:

1. pipeline registry
2. pipeline jobs worker
3. `pipeline_jobs`
4. `pipeline_deliverables`
5. `admin_runtime_probe_runs`

[Added per evaluation finding #1] Request contract:

1. no request body
2. the route must use a controlled fixture, dry-run seam, or repo-owned probe record rather than arbitrary caller-supplied source content

[Added per evaluation finding #1] Response contract:

```ts
type RuntimePipelineServicesJobExecutionProbeResponse = {
  probe_run_id: string;
  result: RuntimeRunResult;
  job_id: string | null;
  deliverable_count: number;
  failing_stage: RuntimePipelineJobExecutionFailingStage;
  failure_reason: string | null;
};
```

### 11.1.4 Future required backend contracts before AGChain stub pages become real surfaces

These contracts are not optional if those shell pages remain exposed, even as stubs.

[Added per evaluation finding #1] This subsection is a stub-promotion gate, not current implementation scope. No file in the locked inventory may add these endpoint families during this correction. Before any listed AGChain page is promoted from stub status to a real surface, a follow-on plan must lock each family with the same contract depth used above: auth, request shape, response shape, touched tables/services, observability, tests, and acceptance proof.

#### Datasets

Required before `AgchainDatasetsPage` is promoted from stub status to a real surface:

1. `GET /agchain/datasets`
2. `GET /agchain/datasets/{dataset_id}`
3. `POST /agchain/datasets/imports`
4. `GET /agchain/datasets/{dataset_id}/samples`

#### Prompts

Required before `AgchainPromptsPage` is promoted from stub status:

1. `GET /agchain/prompts`
2. `POST /agchain/prompts`
3. `GET /agchain/prompts/{prompt_id}`
4. `PATCH /agchain/prompts/{prompt_id}`

#### Runs

Required before `AgchainRunsPage` is promoted from stub status:

1. `GET /agchain/runs`
2. `POST /agchain/runs`
3. `GET /agchain/runs/{run_id}`
4. `POST /agchain/runs/{run_id}/cancel`

#### Results

Required before `AgchainResultsPage` is promoted from stub status:

1. `GET /agchain/results`
2. `GET /agchain/results/{result_id}`
3. `GET /agchain/results/{result_id}/comparisons`

#### Scorers

Required before `AgchainScorersPage` is promoted from stub status:

1. `GET /agchain/scorers`
2. `POST /agchain/scorers`
3. `PATCH /agchain/scorers/{scorer_id}`

#### Parameters

Required before `AgchainParametersPage` is promoted from stub status:

1. `GET /agchain/runtime-profiles`
2. `POST /agchain/runtime-profiles`
3. `PATCH /agchain/runtime-profiles/{profile_id}`

#### Tools

Required before `AgchainToolsPage` is promoted from stub status:

1. `GET /agchain/tools`
2. `POST /agchain/tools`
3. `PATCH /agchain/tools/{tool_id}`

#### Build

Required before `AgchainBuildPage` is promoted from stub status:

1. `GET /agchain/builds`
2. `POST /agchain/builds`
3. `GET /agchain/builds/{build_id}`

#### Artifacts

Required before `AgchainArtifactsPage` is promoted from stub status:

1. `GET /agchain/artifacts`
2. `GET /agchain/artifacts/{artifact_id}`
3. `GET /agchain/artifacts/{artifact_id}/download`

#### Observability

Required before `AgchainObservabilityPage` is promoted from stub status:

1. `GET /agchain/observability/runs/{run_id}/timeline`
2. `GET /agchain/observability/runs/{run_id}/events`
3. `GET /agchain/observability/runs/{run_id}/metrics`

## Locked observability surface

This correction plan does not allow “No observability changes.”

The affected surfaces require observability to prove the correction actually works.

### 11.2.0 Observability manifest

This manifest-level OTEL contract is intentionally written in the same `Type | Name | Where | Purpose`
format used by the March 21 storage plan.

No implementation task in this plan is valid unless every in-scope runtime seam that changes behavior
appears in this table or is explicitly covered by a retained item below.

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `admin.runtime.readiness.snapshot` | `services/platform-api/app/api/routes/admin_runtime_readiness.py:get_runtime_readiness` | Measure readiness snapshot latency and correlate degraded responses with the operator-visible result. |
| Trace span | `admin.runtime.readiness.detail` | `services/platform-api/app/api/routes/admin_runtime_readiness.py:get_runtime_readiness_check` | Measure targeted readiness-detail reads for one check and correlate them with the latest persisted probe or action state. |
| Trace span | `admin.runtime.readiness.check` | `services/platform-api/app/services/runtime_readiness.py:<per-check evaluation>` | Measure each readiness check evaluation and attribute the result by `check_id`, `surface`, and `status`. |
| Trace span | `admin.runtime.readiness.check.verify` | `services/platform-api/app/services/runtime_probe_service.py:verify_readiness_check` | Trace one explicit verification run for a named readiness check. |
| Trace span | `admin.runtime.probe_run.get` | `services/platform-api/app/api/routes/admin_runtime_readiness.py:get_runtime_probe_run` | Measure probe-run lookup latency for operator audit reads. |
| Trace span | `admin.runtime.action_run.get` | `services/platform-api/app/api/routes/admin_runtime_actions.py:get_runtime_action_run` | Measure action-run lookup latency for operator audit reads. |
| Trace span | `admin.runtime.storage.browser_upload_cors.reconcile` | `services/platform-api/app/services/runtime_action_service.py:reconcile_browser_upload_cors` | Trace one backend-owned CORS reconciliation action end to end. |
| Trace span | `admin.runtime.storage.signed_upload.probe` | `services/platform-api/app/services/runtime_probe_service.py:probe_signed_upload` | Trace one signed-upload capability probe, including upstream storage dependencies. |
| Trace span | `admin.runtime.supabase.admin_connectivity.probe` | `services/platform-api/app/services/runtime_probe_service.py:probe_supabase_admin_connectivity` | Trace one explicit Supabase admin-connectivity verification run. |
| Trace span | `admin.runtime.background_workers.config.probe` | `services/platform-api/app/services/runtime_probe_service.py:probe_background_workers_config` | Trace one background-worker configuration verification run. |
| Trace span | `observability.telemetry.status` | `services/platform-api/app/api/routes/telemetry.py:telemetry_status` | Measure telemetry-status reads and tie the status surface to the latest persisted export proof. |
| Trace span | `admin.runtime.telemetry.export.probe` | `services/platform-api/app/services/runtime_probe_service.py:probe_telemetry_export` | Trace one telemetry export proof run against the configured collector/export path. |
| Trace span | `admin.runtime.pipeline_services.browser_upload.probe` | `services/platform-api/app/services/runtime_probe_service.py:probe_pipeline_browser_upload` | Trace one end-to-end pipeline browser-upload probe spanning reservation, upload, and completion proof. |
| Trace span | `admin.runtime.pipeline_services.job_execution.probe` | `services/platform-api/app/services/runtime_probe_service.py:probe_pipeline_job_execution` | Trace one end-to-end job-execution proof spanning job creation, worker execution, and deliverable verification. |
| Metric | `platform.admin.runtime.readiness.snapshot.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_readiness_snapshot` | Count readiness snapshot requests and group them by overall result and HTTP status. |
| Metric | `platform.admin.runtime.readiness.detail.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_readiness_detail` | Count targeted readiness-detail reads by `check_id`, `status`, and HTTP status. |
| Metric | `platform.admin.runtime.readiness.check.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_readiness_check` | Count per-check evaluations across surfaces and statuses. |
| Histogram | `platform.admin.runtime.readiness.check.duration_ms` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_readiness_check` | Measure per-check execution duration for hotspot and timeout diagnosis. |
| Metric | `platform.admin.runtime.readiness.verify.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_readiness_verify` | Count explicit check verification requests by `check_id`, result, and HTTP status. |
| Metric | `platform.storage.upload.reserve.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_reserve` | Count successful upload-reservation creation for the browser upload path. |
| Metric | `platform.storage.upload.reserve.failure.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_reserve` | Count upload-reservation failures so storage-path regressions are visible immediately. |
| Metric | `platform.storage.upload.complete.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_complete` | Count successful upload completion transitions. |
| Metric | `platform.storage.upload.complete.failure.count` | `services/platform-api/app/observability/storage_metrics.py:record_storage_upload_complete` | Count failed upload-completion transitions. |
| Metric | `platform.pipeline.source_set.create.count` | `services/platform-api/app/observability/pipeline_metrics.py:record_pipeline_source_set_create` | Count source-set creation requests and result status. |
| Metric | `platform.pipeline.job.create.count` | `services/platform-api/app/observability/pipeline_metrics.py:record_pipeline_job_create` | Count pipeline job creation requests. |
| Metric | `platform.pipeline.job.complete.count` | `services/platform-api/app/observability/pipeline_metrics.py:record_pipeline_job_complete` | Count completed pipeline jobs and preserve certification of successful execution. |
| Metric | `platform.pipeline.job.failed.count` | `services/platform-api/app/observability/pipeline_metrics.py:record_pipeline_job_failed` | Count failed pipeline jobs and classify failure stages. |
| Metric | `platform.pipeline.deliverable.download.count` | `services/platform-api/app/observability/pipeline_metrics.py:record_pipeline_deliverable_download` | Count deliverable downloads and distinguish result by deliverable kind and status. |
| Metric | `platform.admin.runtime.probe_run.get.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_probe_run_get` | Count probe-run lookup requests by result and HTTP status. |
| Metric | `platform.admin.runtime.action_run.get.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_action_run_get` | Count action-run lookup requests by result and HTTP status. |
| Metric | `platform.admin.runtime.probe.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_probe` | Count every explicit admin probe execution by `probe_kind`, `check_id`, and result. |
| Histogram | `platform.admin.runtime.probe.duration_ms` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_probe` | Measure execution duration for each explicit admin probe. |
| Metric | `platform.admin.runtime.action.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_action` | Count every backend-owned admin action execution by `action_kind`, `check_id`, and result. |
| Histogram | `platform.admin.runtime.action.duration_ms` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_runtime_action` | Measure execution duration for each backend-owned admin action. |
| Metric | `platform.observability.telemetry.status.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_telemetry_status_read` | Count telemetry-status reads and distinguish config-enabled from proof-backed success. |
| Metric | `platform.admin.runtime.telemetry.export_probe.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_telemetry_export_probe` | Count telemetry export proof runs by result and collector reachability. |
| Histogram | `platform.admin.runtime.telemetry.export_probe.duration_ms` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_telemetry_export_probe` | Measure the duration of telemetry export proof runs. |
| Metric | `platform.admin.runtime.pipeline_services.probe.count` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_pipeline_services_probe` | Count end-to-end pipeline operational probes by probe kind and result. |
| Histogram | `platform.admin.runtime.pipeline_services.probe.duration_ms` | `services/platform-api/app/observability/runtime_readiness_metrics.py:record_pipeline_services_probe` | Measure end-to-end pipeline operational probe duration. |
| Structured log | `admin.runtime.readiness.degraded` | `services/platform-api/app/api/routes/admin_runtime_readiness.py:get_runtime_readiness` | Produce an operator-safe degraded snapshot record containing counts and check identifiers. |
| Structured log | `pipeline.job.completed` | `services/platform-api/app/observability/pipeline_metrics.py:log_pipeline_job_completed` | Emit an operator-safe record of successful pipeline completion and output kinds. |
| Structured log | `pipeline.job.failed` | `services/platform-api/app/observability/pipeline_metrics.py:log_pipeline_job_failed` | Emit an operator-safe failure record with failure stage and error category. |
| Structured log | `pipeline.source_set.changed` | `services/platform-api/app/observability/pipeline_metrics.py:log_pipeline_source_set_changed` | Emit an auditable record of source-set create or update operations. |
| Structured log | `admin.runtime.probe.completed` | `services/platform-api/app/services/runtime_probe_service.py:log_runtime_probe_result` | Produce an auditable operator-safe record of successful probe completion. |
| Structured log | `admin.runtime.probe.failed` | `services/platform-api/app/services/runtime_probe_service.py:log_runtime_probe_result` | Produce an auditable operator-safe record of failed probe completion. |
| Structured log | `admin.runtime.action.completed` | `services/platform-api/app/services/runtime_action_service.py:log_runtime_action_result` | Produce an auditable operator-safe record of successful remediation action execution. |
| Structured log | `admin.runtime.action.failed` | `services/platform-api/app/services/runtime_action_service.py:log_runtime_action_result` | Produce an auditable operator-safe record of failed remediation action execution. |
| Structured log | `admin.runtime.telemetry.export.failed` | `services/platform-api/app/services/runtime_probe_service.py:probe_telemetry_export` | Produce a precise failure record for telemetry export proof and its upstream blocker. |
| Structured log | `admin.runtime.pipeline_services.probe.failed` | `services/platform-api/app/services/runtime_probe_service.py:probe_pipeline_browser_upload`, `probe_pipeline_job_execution` | Produce a precise failure record for pipeline operational probes and their failing seam. |

Locked observability counts in this plan:

1. retained surface: `2` traces, `11` counters, `1` histogram, `4` structured logs
2. new surface: `12` traces, `15` counters, `4` histograms, `6` structured logs
3. total locked surface after correction: `14` traces, `26` counters, `5` histograms, `10` structured logs

Observability attribute rules for this manifest:

- Allowed trace and metric attributes: `check_id`, `probe_kind`, `action_kind`, `result`, `http.status_code`, `pipeline_kind`, `collector_reachable`
- Forbidden in trace and metric attributes: raw JWTs, Supabase keys, GCS signed URLs, private headers, full bucket object keys when they may expose user content paths, raw prompt or document contents
- Structured logs may include operator-safe identifiers: `probe_run_id`, `action_run_id`, `check_id`, `pipeline_kind`, `bucket_name`
- Structured logs must still avoid: secrets, signed URLs, full response bodies from third-party systems

These same rules are re-locked in `11.2.6` and apply to every item in this table with no extra
allowed attributes beyond that list.

### 11.2.1 Observability governance rules

Inclusion rules:

1. every route or service added by this plan must emit telemetry that proves the backend behavior happened
2. every admin probe and every admin action must emit one span, one counter, one duration histogram, and one structured completion or failure log
3. existing pipeline and storage telemetry remains authoritative for already-real product seams and must be reused rather than shadowed
4. telemetry names are locked by this section and may not be renamed during implementation without revising the plan
5. every in-scope observability item must appear in `11.2.0` with `Type`, `Name`, `Where`, and `Purpose` before implementation tasks are considered valid

Intentional exclusions:

1. no telemetry item may exist only in frontend code for a backend-owned operational claim
2. no config-only telemetry endpoint may be presented as proof of export success
3. no generic “admin action executed” event may replace seam-specific events
4. no secret-bearing attribute, payload, or external response body may be emitted

Construction rules:

1. emit location means the file and logical function or route owner responsible for instrumentation
2. purpose means the operator question that the telemetry item must answer
3. if an item cannot be emitted from the declared location, the implementation is non-compliant until the plan is revised

### 11.2.2 Existing telemetry items to retain

| Name | Type | Emit location | Purpose |
| --- | --- | --- | --- |
| `admin.runtime.readiness.snapshot` | span | `services/platform-api/app/api/routes/admin_runtime_readiness.py` around the snapshot request handler | Measure each readiness snapshot request and correlate degraded results with the caller-visible response. |
| `admin.runtime.readiness.check` | span | `services/platform-api/app/services/runtime_readiness.py` around each check evaluation | Measure each check evaluation and attribute result by `check.id`, `surface`, and `status`. |
| `platform.admin.runtime.readiness.snapshot.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_runtime_readiness_snapshot`, called by `admin_runtime_readiness.py` | Count readiness snapshot requests and group them by overall result and HTTP status. |
| `platform.admin.runtime.readiness.check.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_runtime_readiness_check`, called by `runtime_readiness.py` | Count per-check evaluations across surfaces and statuses. |
| `platform.admin.runtime.readiness.check.duration_ms` | histogram | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_runtime_readiness_check`, called by `runtime_readiness.py` | Measure per-check execution duration for hotspot and timeout diagnosis. |
| `admin.runtime.readiness.degraded` | structured log event | `services/platform-api/app/api/routes/admin_runtime_readiness.py` when the snapshot contains degraded or failed checks | Produce an operator-safe degraded snapshot record containing counts and check identifiers. |
| `platform.storage.upload.reserve.count` | counter | `services/platform-api/app/observability/storage_metrics.py::record_storage_upload_reserve`, called by `services/platform-api/app/api/routes/storage.py` | Count successful upload-reservation creation for the browser upload path. |
| `platform.storage.upload.reserve.failure.count` | counter | `services/platform-api/app/observability/storage_metrics.py::record_storage_upload_reserve`, called by `services/platform-api/app/api/routes/storage.py` | Count upload-reservation failures so storage-path regressions are visible immediately. |
| `platform.storage.upload.complete.count` | counter | `services/platform-api/app/observability/storage_metrics.py::record_storage_upload_complete`, called by `services/platform-api/app/api/routes/storage.py` | Count successful upload completion transitions. |
| `platform.storage.upload.complete.failure.count` | counter | `services/platform-api/app/observability/storage_metrics.py::record_storage_upload_complete`, called by `services/platform-api/app/api/routes/storage.py` | Count failed upload-completion transitions. |
| `platform.pipeline.source_set.create.count` | counter | `services/platform-api/app/observability/pipeline_metrics.py::record_pipeline_source_set_create`, called by `services/platform-api/app/api/routes/pipelines.py` | Count source-set creation requests and result status. |
| `platform.pipeline.job.create.count` | counter | `services/platform-api/app/observability/pipeline_metrics.py::record_pipeline_job_create`, called by `services/platform-api/app/api/routes/pipelines.py` | Count pipeline job creation requests. |
| `platform.pipeline.job.complete.count` | counter | `services/platform-api/app/observability/pipeline_metrics.py::record_pipeline_job_complete`, called by `services/platform-api/app/workers/pipeline_jobs.py` | Count completed pipeline jobs and preserve certification of successful execution. |
| `platform.pipeline.job.failed.count` | counter | `services/platform-api/app/observability/pipeline_metrics.py::record_pipeline_job_failed`, called by `services/platform-api/app/workers/pipeline_jobs.py` | Count failed pipeline jobs and classify failure stages. |
| `platform.pipeline.deliverable.download.count` | counter | `services/platform-api/app/observability/pipeline_metrics.py::record_pipeline_deliverable_download`, called by `services/platform-api/app/api/routes/pipelines.py` | Count deliverable downloads and distinguish result by deliverable kind and status. |
| `pipeline.job.completed` | structured log event | `services/platform-api/app/observability/pipeline_metrics.py::log_pipeline_job_completed`, called by `services/platform-api/app/workers/pipeline_jobs.py` | Emit an operator-safe record of successful pipeline completion and output kinds. |
| `pipeline.job.failed` | structured log event | `services/platform-api/app/observability/pipeline_metrics.py::log_pipeline_job_failed`, called by `services/platform-api/app/workers/pipeline_jobs.py` | Emit an operator-safe failure record with failure stage and error category. |
| `pipeline.source_set.changed` | structured log event | `services/platform-api/app/observability/pipeline_metrics.py::log_pipeline_source_set_changed`, called by `services/platform-api/app/api/routes/pipelines.py` or the backing service | Emit an auditable record of source-set create or update operations. |

### 11.2.3 New trace spans required

| Name | Type | Emit location | Purpose |
| --- | --- | --- | --- |
| `admin.runtime.readiness.check.verify` | span | `services/platform-api/app/services/runtime_probe_service.py` invoked by `POST /admin/runtime/readiness/checks/{check_id}/verify` | Trace one explicit verification run for a named readiness check. |
| `admin.runtime.readiness.detail` | span | `services/platform-api/app/api/routes/admin_runtime_readiness.py` invoked by `GET /admin/runtime/readiness/checks/{check_id}` | Trace one targeted readiness-detail read for a single check. |
| `admin.runtime.probe_run.get` | span | `services/platform-api/app/api/routes/admin_runtime_readiness.py` invoked by `GET /admin/runtime/probe-runs/{probe_run_id}` | Trace one probe-run audit lookup request. |
| `admin.runtime.action_run.get` | span | `services/platform-api/app/api/routes/admin_runtime_actions.py` invoked by `GET /admin/runtime/action-runs/{action_run_id}` | Trace one action-run audit lookup request. |
| `admin.runtime.storage.browser_upload_cors.reconcile` | span | `services/platform-api/app/services/runtime_action_service.py` invoked by `POST /admin/runtime/storage/browser-upload-cors/reconcile` | Trace one backend-owned CORS reconciliation action end to end. |
| `admin.runtime.storage.signed_upload.probe` | span | `services/platform-api/app/services/runtime_probe_service.py` invoked by `POST /admin/runtime/storage/signed-upload/probe` | Trace one signed-upload capability probe, including upstream storage dependencies. |
| `admin.runtime.supabase.admin_connectivity.probe` | span | `services/platform-api/app/services/runtime_probe_service.py` invoked by `POST /admin/runtime/supabase/admin-connectivity/probe` | Trace one explicit Supabase admin-connectivity verification run. |
| `admin.runtime.background_workers.config.probe` | span | `services/platform-api/app/services/runtime_probe_service.py` invoked by `POST /admin/runtime/background-workers/config/probe` | Trace one background-worker configuration verification run. |
| `observability.telemetry.status` | span | `services/platform-api/app/api/routes/telemetry.py` invoked by `GET /observability/telemetry-status` | Trace one telemetry-status read tied to the latest persisted export proof. |
| `admin.runtime.telemetry.export.probe` | span | `services/platform-api/app/services/runtime_probe_service.py` invoked by `POST /admin/runtime/telemetry/export/probe` | Trace one telemetry export proof run against the configured collector/export path. |
| `admin.runtime.pipeline_services.browser_upload.probe` | span | `services/platform-api/app/services/runtime_probe_service.py` invoked by `POST /admin/runtime/pipeline-services/browser-upload/probe` | Trace one end-to-end pipeline browser-upload probe spanning reservation, upload, and completion proof. |
| `admin.runtime.pipeline_services.job_execution.probe` | span | `services/platform-api/app/services/runtime_probe_service.py` invoked by `POST /admin/runtime/pipeline-services/job-execution/probe` | Trace one end-to-end job-execution proof spanning job creation, worker execution, and deliverable verification. |

### 11.2.4 New metrics required

| Name | Type | Emit location | Purpose |
| --- | --- | --- | --- |
| `platform.admin.runtime.readiness.detail.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_runtime_readiness_detail`, called by `admin_runtime_readiness.py` | Count targeted readiness-detail reads by `check_id`, result, and HTTP status. |
| `platform.admin.runtime.readiness.verify.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_runtime_readiness_verify`, called by `runtime_probe_service.py` for `POST /admin/runtime/readiness/checks/{check_id}/verify` | Count readiness-check verify requests by result and HTTP status. |
| `platform.admin.runtime.probe_run.get.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_runtime_probe_run_get`, called by `admin_runtime_readiness.py` | Count probe-run lookup requests by result and HTTP status. |
| `platform.admin.runtime.action_run.get.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_runtime_action_run_get`, called by `admin_runtime_actions.py` | Count action-run lookup requests by result and HTTP status. |
| `platform.admin.runtime.storage.browser_upload_cors.reconcile.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_storage_browser_upload_cors_reconcile`, called by `runtime_action_service.py` | Count explicit browser-upload CORS reconcile actions by result and HTTP status. |
| `platform.admin.runtime.storage.signed_upload.probe.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_storage_signed_upload_probe`, called by `runtime_probe_service.py` | Count explicit signed-upload proof runs by result and HTTP status. |
| `platform.admin.runtime.supabase.admin_connectivity.probe.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_supabase_admin_connectivity_probe`, called by `runtime_probe_service.py` | Count explicit Supabase admin-connectivity proof runs by result and HTTP status. |
| `platform.admin.runtime.background_workers.config.probe.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_background_workers_config_probe`, called by `runtime_probe_service.py` | Count explicit worker-config proof runs by result and HTTP status. |
| `platform.admin.runtime.probe.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py`, called by `runtime_probe_service.py` | Count every explicit admin probe execution by `probe_kind`, `check_id`, and result. |
| `platform.admin.runtime.probe.duration_ms` | histogram | `services/platform-api/app/observability/runtime_readiness_metrics.py`, called by `runtime_probe_service.py` | Measure execution duration for each explicit admin probe. |
| `platform.admin.runtime.action.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py`, called by `runtime_action_service.py` | Count every backend-owned admin action execution by `action_kind`, `check_id`, and result. |
| `platform.admin.runtime.action.duration_ms` | histogram | `services/platform-api/app/observability/runtime_readiness_metrics.py`, called by `runtime_action_service.py` | Measure execution duration for each backend-owned admin action. |
| `platform.observability.telemetry.status.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_telemetry_status_read`, called by `services/platform-api/app/api/routes/telemetry.py` | Count telemetry-status reads and distinguish config-only reads from proof-backed green status. |
| `platform.admin.runtime.telemetry.export_probe.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py`, called by `runtime_probe_service.py` during telemetry export proof | Count telemetry export proof runs by result and collector reachability. |
| `platform.admin.runtime.telemetry.export_probe.duration_ms` | histogram | `services/platform-api/app/observability/runtime_readiness_metrics.py`, called by `runtime_probe_service.py` during telemetry export proof | Measure the duration of telemetry export proof runs. |
| `platform.admin.runtime.pipeline_services.browser_upload.probe.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_pipeline_services_browser_upload_probe`, called by `runtime_probe_service.py` | Count explicit pipeline browser-upload proof runs by result and HTTP status. |
| `platform.admin.runtime.pipeline_services.job_execution.probe.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py::record_pipeline_services_job_execution_probe`, called by `runtime_probe_service.py` | Count explicit pipeline job-execution proof runs by result and HTTP status. |
| `platform.admin.runtime.pipeline_services.probe.count` | counter | `services/platform-api/app/observability/runtime_readiness_metrics.py`, called by `runtime_probe_service.py` for the admin runtime pipeline probe path | Count end-to-end pipeline operational probes by probe kind and result. |
| `platform.admin.runtime.pipeline_services.probe.duration_ms` | histogram | `services/platform-api/app/observability/runtime_readiness_metrics.py`, called by `runtime_probe_service.py` for the admin runtime pipeline probe path | Measure end-to-end pipeline operational probe duration. |

### 11.2.5 New structured logs required

| Name | Type | Emit location | Purpose |
| --- | --- | --- | --- |
| `admin.runtime.probe.completed` | structured log event | `services/platform-api/app/services/runtime_probe_service.py` after a successful probe run is persisted | Produce an auditable operator-safe record of successful probe completion. |
| `admin.runtime.probe.failed` | structured log event | `services/platform-api/app/services/runtime_probe_service.py` after a failed probe run is persisted | Produce an auditable operator-safe record of failed probe completion. |
| `admin.runtime.action.completed` | structured log event | `services/platform-api/app/services/runtime_action_service.py` after a successful backend-owned action is persisted | Produce an auditable operator-safe record of successful remediation action execution. |
| `admin.runtime.action.failed` | structured log event | `services/platform-api/app/services/runtime_action_service.py` after a failed backend-owned action is persisted | Produce an auditable operator-safe record of failed remediation action execution. |
| `admin.runtime.telemetry.export.failed` | structured log event | `services/platform-api/app/services/runtime_probe_service.py` when the export proof route cannot prove collector/export success | Produce a precise failure record for telemetry export proof and its upstream blocker. |
| `admin.runtime.pipeline_services.probe.failed` | structured log event | `services/platform-api/app/services/runtime_probe_service.py` when pipeline upload/job probes fail | Produce a precise failure record for pipeline operational probes and their failing seam. |

### 11.2.6 Attribute rules

Forbidden in trace and metric attributes:

1. raw JWTs
2. Supabase keys
3. GCS signed URLs
4. private headers
5. full bucket object keys when they may expose user content paths
6. raw prompt or document contents

Allowed in trace and metric attributes:

1. check id
2. probe kind
3. action kind
4. result
5. http status code
6. pipeline kind
7. boolean flags like `collector_reachable`

Structured logs may include operator-safe identifiers:

1. `probe_run_id`
2. `action_run_id`
3. `check_id`
4. `pipeline_kind`
5. `bucket_name`

Structured logs must still avoid:

1. secrets
2. signed URLs
3. full response bodies from third-party systems

## 11.3 Database migrations

This correction plan requires new migrations.

### 11.3.1 New migrations required

#### `supabase/migrations/<timestamp>_admin_runtime_probe_runs.sql`

Creates:

1. `public.admin_runtime_probe_runs`

Columns:

1. `probe_run_id uuid primary key`
2. `probe_kind text not null`
3. `check_id text null`
4. `actor_user_id uuid not null`
5. `result text not null`
6. `duration_ms integer not null`
7. `evidence_jsonb jsonb not null default '{}'::jsonb`
8. `failure_reason text null`
9. `created_at timestamptz not null default now()`

[Added per evaluation findings #2 and #5] Locked constraints:

1. `admin_runtime_probe_runs_result_check`: `result in ('ok', 'fail', 'error')`
2. `admin_runtime_probe_runs_probe_kind_check`: `probe_kind in ('readiness_check_verify', 'storage_signed_upload', 'supabase_admin_connectivity', 'background_workers_config', 'telemetry_export', 'pipeline_services_browser_upload', 'pipeline_services_job_execution')`
3. `admin_runtime_probe_runs_duration_nonnegative_check`: `duration_ms >= 0`
4. `admin_runtime_probe_runs_evidence_jsonb_object_check`: `jsonb_typeof(evidence_jsonb) = 'object'`

[Added per evaluation findings #2 and #5] Locked indexes:

1. `admin_runtime_probe_runs_created_at_idx`
2. `admin_runtime_probe_runs_probe_kind_created_at_idx`
3. `admin_runtime_probe_runs_check_id_created_at_idx`
4. `admin_runtime_probe_runs_actor_user_id_created_at_idx`
5. `admin_runtime_probe_runs_result_created_at_idx`

[Added per evaluation findings #2 and #5] Locked grants and RLS:

1. grant `service_role` `SELECT, INSERT`
2. grant no `anon` or `authenticated` access
3. enable RLS
4. locked policy contract: no named browser-client policies are created in this correction
5. the table remains backend-only and service-role-backed through `platform-api`

[Added per evaluation finding #5] Data impact:

1. no existing product rows are rewritten
2. the migration creates a new audit table only

#### `supabase/migrations/<timestamp>_admin_runtime_action_runs.sql`

Creates:

1. `public.admin_runtime_action_runs`

Columns:

1. `action_run_id uuid primary key`
2. `action_kind text not null`
3. `check_id text null`
4. `actor_user_id uuid not null`
5. `result text not null`
6. `duration_ms integer not null`
7. `request_jsonb jsonb not null default '{}'::jsonb`
8. `result_jsonb jsonb not null default '{}'::jsonb`
9. `failure_reason text null`
10. `created_at timestamptz not null default now()`

[Added per evaluation findings #2 and #5] Locked constraints:

1. `admin_runtime_action_runs_result_check`: `result in ('ok', 'fail', 'error')`
2. `admin_runtime_action_runs_action_kind_check`: `action_kind in ('storage_browser_upload_cors_reconcile')`
3. `admin_runtime_action_runs_duration_nonnegative_check`: `duration_ms >= 0`
4. `admin_runtime_action_runs_request_jsonb_object_check`: `jsonb_typeof(request_jsonb) = 'object'`
5. `admin_runtime_action_runs_result_jsonb_object_check`: `jsonb_typeof(result_jsonb) = 'object'`

[Added per evaluation findings #2 and #5] Locked indexes:

1. `admin_runtime_action_runs_created_at_idx`
2. `admin_runtime_action_runs_action_kind_created_at_idx`
3. `admin_runtime_action_runs_check_id_created_at_idx`
4. `admin_runtime_action_runs_actor_user_id_created_at_idx`
5. `admin_runtime_action_runs_result_created_at_idx`

[Added per evaluation findings #2 and #5] Locked grants and RLS:

1. grant `service_role` `SELECT, INSERT`
2. grant no `anon` or `authenticated` access
3. enable RLS
4. locked policy contract: no named browser-client policies are created in this correction
5. the table remains backend-only and service-role-backed through `platform-api`

[Added per evaluation finding #5] Data impact:

1. no existing product rows are rewritten
2. the migration creates a new audit table only

[Added per evaluation finding #5] Schema allocation rationale:

1. no third migration is required for persisted readiness-check definitions in this correction because the corrected readiness check object remains computed live from backend-owned runtime state and is only audited through the latest persisted probe/action runs
2. telemetry export proof uses `admin_runtime_probe_runs` with `probe_kind = 'telemetry_export'`; this correction does not introduce a separate telemetry-proof table
3. AGChain work in this plan is shell stub-retention and decontamination only; promotion-to-real-surface tables remain out of current implementation scope and belong to a follow-on plan

### 11.3.2 Existing migrations to audit, not recreate

These must be re-verified because the plan scope depends on them:

1. [20260327200000_pipeline_jobs_and_deliverables_foundation.sql](/E:/writing-system/supabase/migrations/20260327200000_pipeline_jobs_and_deliverables_foundation.sql)
2. [20260321130000_storage_source_document_bridge.sql](/E:/writing-system/supabase/migrations/20260321130000_storage_source_document_bridge.sql)
3. [20260328103000_drop_old_reserve_user_storage_overload.sql](/E:/writing-system/supabase/migrations/20260328103000_drop_old_reserve_user_storage_overload.sql)
4. [20260328113000_agchain_benchmark_step_reorder_atomic_rpc.sql](/E:/writing-system/supabase/migrations/20260328113000_agchain_benchmark_step_reorder_atomic_rpc.sql)
5. [20260330120000_pipeline_source_sets_foundation.sql](/E:/writing-system/supabase/migrations/20260330120000_pipeline_source_sets_foundation.sql)
6. [20260330130000_pipeline_source_set_storage_contract.sql](/E:/writing-system/supabase/migrations/20260330130000_pipeline_source_set_storage_contract.sql)

### 11.3.3 Zero-case declarations

There are no new edge-function migrations in this correction plan.

## 11.4 Edge Functions

No new edge functions.

No existing edge functions are the primary owned correction seam.

If any affected behavior still depends on an edge function, that dependency must be documented as a bug or transitional seam.

## 11.5 Frontend surface area

### 11.5.1 Operational Readiness frontend

Modified files required:

1. `web/src/hooks/useOperationalReadiness.ts`
2. [Added per evaluation finding #3] `web/src/hooks/useOperationalReadiness.test.tsx`
3. `web/src/lib/operationalReadiness.ts`
4. `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`
5. `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx`
6. `web/src/components/superuser/OperationalReadinessClientPanel.tsx`
7. `web/src/components/superuser/OperationalReadinessSummary.tsx`
8. `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
9. `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

New files required:

1. `web/src/components/superuser/OperationalReadinessActionPanel.tsx`
2. `web/src/components/superuser/OperationalReadinessDependencyPanel.tsx`
3. `web/src/components/superuser/OperationalReadinessProbeHistoryPanel.tsx`

[Added per evaluation findings #3 and #7] Frozen TypeScript contract for `web/src/lib/operationalReadiness.ts`:

```ts
type OperationalReadinessStatus = 'ok' | 'warn' | 'fail' | 'unknown';
type OperationalReadinessActionability = 'backend_action' | 'backend_probe' | 'external_change' | 'info_only';
type OperationalReadinessCauseConfidence = 'high' | 'medium' | 'low' | null;
type OperationalReadinessProbeKind =
  | 'readiness_check_verify'
  | 'storage_signed_upload'
  | 'supabase_admin_connectivity'
  | 'background_workers_config'
  | 'telemetry_export'
  | 'pipeline_services_browser_upload'
  | 'pipeline_services_job_execution';
type OperationalReadinessActionKind = 'storage_browser_upload_cors_reconcile';

type OperationalReadinessDependencyRef = {
  check_id: string;
  label: string;
  status: OperationalReadinessStatus;
};

type OperationalReadinessAvailableAction = {
  action_kind: OperationalReadinessActionKind;
  label: string;
  description: string;
  route: '/admin/runtime/storage/browser-upload-cors/reconcile';
  requires_confirmation: boolean;
};

type OperationalReadinessVerifyTarget = {
  probe_kind: OperationalReadinessProbeKind;
  label: string;
  route: string;
};

type OperationalReadinessNextStep = {
  step_kind: 'rerun_after_action' | 'inspect_dependency' | 'manual_fix' | 'escalate';
  label: string;
  description: string;
};

type OperationalReadinessCheck = {
  check_id: string;
  surface_id: 'shared' | 'blockdata' | 'agchain';
  category: 'process' | 'config' | 'credential' | 'connectivity' | 'browser-dependent' | 'observability' | 'product';
  status: OperationalReadinessStatus;
  label: string;
  summary: string;
  cause: string | null;
  cause_confidence: OperationalReadinessCauseConfidence;
  depends_on: OperationalReadinessDependencyRef[];
  blocked_by: OperationalReadinessDependencyRef[];
  available_actions: OperationalReadinessAvailableAction[];
  verify_after: OperationalReadinessVerifyTarget[];
  next_if_still_failing: OperationalReadinessNextStep[];
  actionability: OperationalReadinessActionability;
  evidence: Record<string, string | number | boolean | null>;
  checked_at: string;
};

type OperationalReadinessSurface = {
  id: 'shared' | 'blockdata' | 'agchain';
  label: string;
  summary: { ok: number; warn: number; fail: number; unknown: number };
  checks: OperationalReadinessCheck[];
};

type OperationalReadinessSnapshot = {
  generated_at: string;
  summary: { ok: number; warn: number; fail: number; unknown: number };
  surfaces: OperationalReadinessSurface[];
};

type OperationalReadinessProbeRun = {
  probe_run_id: string;
  probe_kind: OperationalReadinessProbeKind;
  check_id: string | null;
  result: 'ok' | 'fail' | 'error';
  duration_ms: number;
  evidence: Record<string, unknown>;
  failure_reason: string | null;
  created_at: string;
};

type OperationalReadinessActionRun = {
  action_run_id: string;
  action_kind: OperationalReadinessActionKind;
  check_id: string | null;
  result: 'ok' | 'fail' | 'error';
  duration_ms: number;
  request: Record<string, unknown>;
  result_payload: Record<string, unknown>;
  failure_reason: string | null;
  created_at: string;
};

type OperationalReadinessCheckDetailResponse = {
  check: OperationalReadinessCheck;
  latest_probe_run: OperationalReadinessProbeRun | null;
  latest_action_run: OperationalReadinessActionRun | null;
};
```

[Added per evaluation finding #4] Frozen UI layout contract for the corrected readiness page:

1. keep the current page shell order from `SuperuserOperationalReadiness.tsx`:
   - page header and refresh button
   - error banner when snapshot load fails
   - summary panel
   - one readiness section per surface
   - client diagnostics panel at the bottom
2. freeze the summary panel to the current `OperationalReadinessSummary.tsx` layout:
   - one five-cell grid
   - four status summary cards in `OK`, `WARN`, `FAIL`, `UNKNOWN` order
   - one trailing refreshed-at panel
3. keep the current surface table shell from `OperationalReadinessCheckGrid.tsx`:
   - expand-toggle column
   - `Status` column
   - `Check` column
   - `Summary` column
4. each expanded detail region remains attached to its parent table row and occupies the full-width child region beneath that row; on desktop it uses a locked `7fr / 5fr` two-column grid, and on mobile it collapses to a single-column stack
5. replace the current `Evidence` + `Remediation` expansion with the frozen detail composition below; no other top-level panels may be inserted above or between them
6. left detail column:
   - `Cause` card showing `cause`, `cause_confidence`, and existing `evidence`
   - `Dependencies` panel showing `depends_on` and `blocked_by`
   - `Next if still failing` list showing `next_if_still_failing`
7. right detail column:
   - `Available Actions` panel showing `available_actions`
   - `Verification` panel showing `verify_after`
   - `Probe History` panel showing `latest_probe_run` and `latest_action_run`
8. client diagnostics remain a separate bottom panel and must not be promoted above the readiness sections
9. the corrected detail view must not fall back to one free-form remediation paragraph as the primary operator affordance

### 11.5.2 Pipeline Services frontend

Modified files required:

1. `web/src/pages/PipelineServicesPage.tsx`
2. `web/src/pages/IndexBuilderPage.tsx`
3. `web/src/pages/useIndexBuilderWorkbench.tsx`
4. `web/src/lib/pipelineService.ts`
5. `web/src/lib/storageUploadService.ts`
6. `web/src/lib/uploadReservationRecovery.ts`
7. `web/src/components/pipelines/PipelineUploadPanel.tsx`
8. `web/src/components/pipelines/PipelineSourceSetPanel.tsx`
9. `web/src/components/pipelines/PipelineJobStatusPanel.tsx`
10. `web/src/components/pipelines/PipelineDeliverablesPanel.tsx`

New files required:

1. `web/src/components/pipelines/PipelineOperationalProbePanel.tsx`

### 11.5.3 AGChain shell decontamination frontend

Modified files required:

1. `web/src/components/agchain/AgchainLeftNav.tsx`
2. `web/src/components/agchain/AgchainLeftNav.test.tsx`
3. `web/src/components/layout/AgchainShellLayout.tsx`
4. `web/src/components/layout/AgchainShellLayout.test.tsx`
5. `web/src/components/common/useShellHeaderTitle.tsx`
6. `web/src/components/common/useShellHeaderTitle.test.tsx`
7. `web/src/pages/agchain/AgchainOverviewPage.tsx`
8. `web/src/pages/agchain/AgchainOverviewPage.test.tsx`
9. `web/src/components/agchain/overview/AgchainOverviewRecentGrid.tsx`
10. `web/src/components/agchain/overview/AgchainOverviewEvaluationCard.tsx`
11. `web/src/components/agchain/overview/AgchainOverviewObservabilityCard.tsx`
12. [Added per evaluation finding #3] `web/src/lib/agchainProjectFocus.ts`
13. [Added per evaluation finding #3] `web/src/hooks/agchain/useAgchainProjectFocus.ts`
14. [Added per evaluation finding #3] `web/src/pages/agchain/AgchainProjectsPage.tsx`
15. [Added per evaluation finding #3] `web/src/pages/agchain/AgchainProjectsPage.test.tsx`

Pages that may remain exposed as explicit stubs until backend contracts exist:

1. `web/src/pages/agchain/AgchainArtifactsPage.tsx`
2. `web/src/pages/agchain/AgchainBuildPage.tsx`
3. `web/src/pages/agchain/AgchainDashboardPage.tsx`
4. `web/src/pages/agchain/AgchainDatasetsPage.tsx`
5. `web/src/pages/agchain/AgchainObservabilityPage.tsx`
6. `web/src/pages/agchain/AgchainParametersPage.tsx`
7. `web/src/pages/agchain/AgchainPromptsPage.tsx`
8. `web/src/pages/agchain/AgchainResultsPage.tsx`
9. `web/src/pages/agchain/AgchainRunsPage.tsx`
10. `web/src/pages/agchain/AgchainScorersPage.tsx`
11. `web/src/pages/agchain/AgchainToolsPage.tsx`

The pages may remain on disk during the correction period.

If they remain exposed, they must be presented as explicit stubs and must not remain exposed as if they are implemented surfaces.

### 11.5.4 Telemetry frontend

Modified files required:

1. `web/src/pages/settings/InstanceConfigPanel.tsx`
2. `web/src/pages/superuser/SuperuserApiEndpoints.tsx`
3. `web/src/components/admin/AdminLeftNav.tsx`

## 11.6 Documentation and plan decontamination

Modified or new plan/docs files required:

1. this plan
2. a failure-matrix follow-on note under `docs/plans/`
3. explicit archive or invalidation markers on contaminated plans listed later in this file

## Locked file inventory

This section freezes the implementation write set.

Authoritative detailed inventories:

1. Appendix B — `27` file entries
2. Appendix C — `46` file entries
3. Appendix D — `48` file entries

No file outside this section and those appendices may be modified under this plan unless the plan is revised first.

### 12.1 Operational Readiness correction inventory

Backend files to modify: `6`

1. `services/platform-api/app/api/routes/admin_runtime_readiness.py`
2. `services/platform-api/app/api/routes/telemetry.py`
3. `services/platform-api/app/services/runtime_readiness.py`
4. `services/platform-api/app/observability/runtime_readiness_metrics.py`
5. `services/platform-api/app/observability/otel.py`
6. `services/platform-api/app/main.py`

Backend files to add: `4`

1. `services/platform-api/app/api/routes/admin_runtime_actions.py`
2. `services/platform-api/app/services/runtime_action_service.py`
3. `services/platform-api/app/services/runtime_probe_service.py`
4. `services/platform-api/tests/test_admin_runtime_actions_routes.py`

Frontend files to modify: `9`

Frontend files to add: `3`

Migrations to add: `2`

### 12.2 Pipeline Services correction inventory

Backend files to modify: `8`

1. `services/platform-api/app/api/routes/pipelines.py`
2. `services/platform-api/app/services/pipeline_source_sets.py`
3. `services/platform-api/app/services/pipeline_storage.py`
4. `services/platform-api/app/workers/pipeline_jobs.py`
5. `services/platform-api/app/observability/pipeline_metrics.py`
6. `services/platform-api/tests/test_pipelines_routes.py`
7. `services/platform-api/tests/test_pipeline_multi_markdown_job.py`
8. `services/platform-api/tests/test_pipeline_worker.py`

Frontend files to modify: `10`

Frontend files to add: `1`

Database migrations to add in this track: `0`

### 12.3 AGChain shell decontamination inventory

Frontend files to modify: `15`

Frontend files to remove from exposed nav or route exposure: `11`

[Added per evaluation finding #3] Backend files to modify immediately in this track: `2`

[Added per evaluation finding #3]

1. `services/platform-api/app/api/routes/agchain_benchmarks.py`
2. `services/platform-api/tests/test_agchain_benchmarks.py`

Reason:

The immediate correction is decontamination of false exposed surfaces while allowing honest stub exposure where that is the better near-term operator state.

The missing backend contracts are listed in this plan and must be implemented before any listed stub is promoted into a real product surface.

[Added per evaluation finding #2] The only backend work allowed immediately in this track is to make the already-real benchmark registry seam explicit so the AGChain projects surface stops implying a broader dedicated project-registry backend than actually exists.

### 12.4 Telemetry proof inventory

Backend files to modify: `12`

1. `services/platform-api/app/observability/otel.py`
2. `services/platform-api/app/observability/contract.py`
3. `services/platform-api/app/observability/runtime_readiness_metrics.py`
4. `services/platform-api/app/observability/storage_metrics.py`
5. `services/platform-api/app/observability/pipeline_metrics.py`
6. `services/platform-api/app/api/routes/admin_runtime_readiness.py`
7. `services/platform-api/app/api/routes/admin_runtime_actions.py`
8. `services/platform-api/app/api/routes/telemetry.py`
9. `services/platform-api/app/services/runtime_probe_service.py`
10. `services/platform-api/app/services/runtime_action_service.py`
11. `services/platform-api/tests/test_observability.py`
12. `services/platform-api/tests/test_observability_contract.py`

Frontend files to modify: `3`

Database migrations to add in this track: `0`

## 13. Frozen seam contracts

### 13.1 Upload bridge seam

The correction must preserve the current storage bridge:

1. browser reserve via `/storage/uploads`
2. direct upload to GCS signed URL
3. completion via `/storage/uploads/{reservation_id}/complete`
4. `source_documents` remains the source-of-truth catalog used by pipeline selection

### 13.2 Pipeline deliverable seam

The correction must preserve:

1. pipeline deliverables stored through `storage_objects`
2. deliverables referenced by `pipeline_deliverables`
3. download through `GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download`

### 13.3 Benchmark registry seam

Until a dedicated AGChain project registry exists:

1. current benchmark-backed registry remains the project-selection source
2. that seam must be stated honestly in UI copy and docs
3. local-storage focus alone must not be treated as the product contract
4. [Added per evaluation finding #4] local-storage focus remains allowed in this correction only as a client convenience cache layered on top of the benchmark-backed registry
5. [Added per evaluation finding #4] if the stored slug is absent from the current benchmark list, the frontend must discard it and fall back to a real benchmark-backed selection rather than treating the local value as authoritative

### 13.4 Dev runtime target seam

The correction must remove or harden the ambiguous `8000` versus `8001` local target drift.

The frontend must not silently talk to the wrong backend instance.

## 14. Locked product decisions

1. `Operational Readiness` is a control plane, not a read-only dashboard.
2. The correction plan does not permit a generic “run any script” backend endpoint.
3. Explicit action endpoints are required for backend-owned remediations.
4. `GET /observability/telemetry-status` remains the authoritative route for telemetry status in this correction, but it is not allowed to claim health based on configuration alone.
5. `Pipeline Services` remains a real product surface in scope, but it is judged only by end-to-end behavior and probe-backed certification.
6. Placeholder AGChain pages may remain exposed only as explicit stubs and cannot be represented as implemented surfaces.
7. `AGChain Projects` remains a benchmark-registry projection in this correction; no new distinct `/agchain/projects` backend domain is introduced here.
8. Passing tests are not enough when runtime export or runtime targeting is still broken.
9. This plan supersedes contaminated March 27-30 readiness/remediation planning.
10. [Added per evaluation finding #4] The correction does not replace the AGChain local-storage focus seam in this tranche; it keeps it only as a non-authoritative UI convenience over the benchmark-backed registry.

## Explicit risks

### Risk 1

The correction recreates a generic action-runner abstraction.

Control:

Use explicit endpoints per owned remediation class.

### Risk 2

The plan either overcorrects by forcing placeholder AGChain exposure to disappear, or leaves it exposed without explicit stub semantics.

Control:

Treat false exposure as a bug, but allow honest stub exposure when it is clearly labeled and not counted as implementation progress.

### Risk 3

Pipeline Services correction gets diluted into shell cleanup.

Control:

Keep end-to-end certification as its own track with its own probes and tests.

### Risk 4

Telemetry remains “green” while collector export is still dead.

Control:

Collector probe and export verification become mandatory.

### Risk 5

The correction plan reuses contaminated plan assumptions.

Control:

This plan uses code and runtime evidence first and demotes the contaminated plans.

## 16. Completion criteria

At-a-glance completion summary:

1. `Operational Readiness` behaves as a real backend-owned control plane with persisted probe and action runs
2. telemetry status is proof-backed rather than config-only
3. `Pipeline Services` passes end-to-end operational certification
4. AGChain placeholder-only pages are exposed, if at all, only as explicit stubs and not as functional product surfaces
5. contaminated plans carry their final correction dispositions

The correction program is complete only when all of the following are true:

1. `Operational Readiness` exposes explicit cause, dependency, actionability, and verification fields.
2. backend action endpoints exist for backend-owned remediations.
3. backend probe endpoints exist for the locked probe categories.
4. probe and action runs are persisted in Supabase and queryable.
5. `GET /observability/telemetry-status` reports real probe proof, not only config.
6. OTEL exporter proof succeeds against a real collector in the intended environment.
7. the locked traces, counters, histograms, and structured logs in `11.2.0` through `11.2.6` exist exactly as specified.
8. Pipeline Services passes end-to-end probes for upload, source-set persistence, job execution, and deliverable retrieval.
9. AGChain placeholder pages, if still exposed in the primary shell, carry explicit stub semantics and do not imply backend-backed functionality.
10. the pipeline-services breadcrumb regression is fixed.
11. contaminated plans listed in this file are explicitly marked non-authoritative.
12. the readiness snapshot, readiness detail, verify, run-lookup, remediation/probe, and telemetry-status routes return the frozen typed request and response shapes declared in `11.1`.
13. `admin_runtime_probe_runs` and `admin_runtime_action_runs` exist with the locked named constraints, named indexes, grants, and RLS contract declared in `11.3.1`.
14. `web/src/lib/operationalReadiness.ts` and the readiness UI match the frozen TypeScript and layout contracts declared in `11.5.1`.

## 17. Task plan

No implementation work should begin outside these tasks.

### Task 1: Lock failing tests for the new readiness contract

**File(s):**

1. `services/platform-api/tests/test_runtime_readiness_service.py`
2. `services/platform-api/tests/test_admin_runtime_readiness_routes.py`
3. `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx`
4. `web/src/hooks/useOperationalReadiness.test.tsx`

**Step 1:** Add failing backend tests for the expanded readiness check contract.
**Step 2:** Add failing backend tests for the frozen typed request and response seams on `GET /admin/runtime/readiness`, `GET /admin/runtime/readiness/checks/{check_id}`, `POST /admin/runtime/readiness/checks/{check_id}/verify`, `GET /admin/runtime/probe-runs/{probe_run_id}`, `GET /admin/runtime/action-runs/{action_run_id}`, `POST /admin/runtime/storage/browser-upload-cors/reconcile`, `POST /admin/runtime/storage/signed-upload/probe`, `POST /admin/runtime/supabase/admin-connectivity/probe`, `POST /admin/runtime/background-workers/config/probe`, `POST /admin/runtime/telemetry/export/probe`, `POST /admin/runtime/pipeline-services/browser-upload/probe`, `POST /admin/runtime/pipeline-services/job-execution/probe`, and `GET /observability/telemetry-status`.
**Step 3:** Add failing backend tests for `blocked_by`, `available_actions`, `verify_after`, `actionability`, and the allowed enum values declared in this plan.
**Step 4:** Add failing frontend tests for the frozen readiness type seam and the new two-column check-detail layout.
**Step 5:** Add failing frontend tests for targeted check verification and action-run state rendering.

**Test command:** `cd E:\writing-system\services\platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py && cd E:\writing-system\web && npm exec vitest run src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/hooks/useOperationalReadiness.test.tsx`
**Expected output:** readiness tests fail because the current code still returns only `status`, `summary`, `evidence`, and `remediation`.

**Commit:** `test: lock operational-readiness control-plane contract`

### Task 2: Add readiness audit migrations

**File(s):**

1. `supabase/migrations/<timestamp>_admin_runtime_probe_runs.sql`
2. `supabase/migrations/<timestamp>_admin_runtime_action_runs.sql`

**Step 1:** Create `admin_runtime_probe_runs`.
**Step 2:** Create `admin_runtime_action_runs`.
**Step 3:** Add the locked named check constraints, JSONB-object constraints, and non-negative duration constraints exactly as declared in `11.3.1`.
**Step 4:** Add the locked named indexes exactly as declared in `11.3.1`.
**Step 5:** Add the locked `service_role` grants and backend-only RLS posture exactly as declared in `11.3.1`.
**Step 6:** Keep telemetry export proof in `admin_runtime_probe_runs` and document why no separate readiness-definition or telemetry-proof table is introduced in this correction.

**Test command:** `cd E:\writing-system\services\platform-api && pytest -q`
**Expected output:** migration-dependent backend tests still pass after schema changes.

**Commit:** `feat: add runtime probe and action audit tables`

### Task 3: Build explicit readiness probe and action services

**File(s):**

1. `services/platform-api/app/services/runtime_probe_service.py`
2. `services/platform-api/app/services/runtime_action_service.py`
3. `services/platform-api/app/services/runtime_readiness.py`

**Step 1:** Add typed probe-run helpers.
**Step 2:** Add typed action-run helpers.
**Step 3:** Move shallow remediation logic out of string-only check definitions and replace it with the frozen readiness enums and typed check object declared in `11.1`.
**Step 4:** Return expanded check objects with explicit actionability, cause-confidence, dependency references, verify targets, and next-step objects exactly as locked in this plan.

**Test command:** `cd E:\writing-system\services\platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_actions_routes.py`
**Expected output:** new service-level readiness tests pass.

**Commit:** `feat: add readiness probe and action services`

### Task 4: Add explicit readiness action routes

**File(s):**

1. `services/platform-api/app/api/routes/admin_runtime_actions.py`
2. `services/platform-api/app/api/routes/admin_runtime_readiness.py`
3. `services/platform-api/app/main.py`
4. `services/platform-api/tests/test_admin_runtime_actions_routes.py`

**Step 1:** Add explicit action routes for bucket CORS reconcile.
**Step 2:** Add explicit probe routes for signed-upload, Supabase, worker config, telemetry export, and pipeline probes.
**Step 3:** Register the new router in `app.main`.
**Step 4:** Lock auth, request shape, and exact typed response shape in route tests for every new or modified control-plane route, including the detail and run-lookup GET routes.

**Test command:** `cd E:\writing-system\services\platform-api && pytest -q tests/test_admin_runtime_actions_routes.py tests/test_admin_runtime_readiness_routes.py`
**Expected output:** explicit action-route tests pass and no generic script-run route exists.

**Commit:** `feat: add explicit runtime control-plane routes`

### Task 5: Strengthen telemetry status into proof status

**File(s):**

1. `services/platform-api/app/observability/otel.py`
2. `services/platform-api/app/observability/contract.py`
3. `services/platform-api/app/observability/runtime_readiness_metrics.py`
4. `services/platform-api/app/observability/storage_metrics.py`
5. `services/platform-api/app/observability/pipeline_metrics.py`
6. `services/platform-api/app/api/routes/admin_runtime_readiness.py`
7. `services/platform-api/app/api/routes/admin_runtime_actions.py`
8. `services/platform-api/app/api/routes/telemetry.py`
9. `services/platform-api/app/services/runtime_probe_service.py`
10. `services/platform-api/app/services/runtime_action_service.py`
11. `services/platform-api/tests/test_observability.py`
12. `services/platform-api/tests/test_observability_contract.py`

**Step 1:** Add or extend shared observability helpers so the locked runtime-probe, runtime-action, telemetry-export-proof, run-lookup, readiness-detail, and pipeline-operational-probe metrics are emitted through named helper functions rather than ad hoc inline meter usage.
**Step 2:** Instrument `runtime_probe_service.py`, `runtime_action_service.py`, `admin_runtime_readiness.py`, and `telemetry.py` with the locked route-owned span names, counters, histograms, and structured logs from `11.2.0` through the allowed attribute set only.
**Step 3:** Reuse existing `storage_metrics.py` and `pipeline_metrics.py` helpers for already-real storage and pipeline seams instead of introducing shadow metric names for the same behavior.
**Step 4:** Keep shared aggregate probe/action counters only as secondary rollups; they do not replace the locked route-owned traces and counters.
**Step 5:** Extend telemetry status response with collector reachability and last-probe result, and add tests that fail when config is enabled but export is not possible or when the locked helper-backed observability surface is not exercised.

**Test command:** `cd E:\writing-system\services\platform-api && pytest -q tests/test_observability.py tests/test_observability_contract.py`
**Expected output:** telemetry tests prove config-only status is insufficient and the locked helper-backed traces, metrics, histograms, and structured logs are exercised exactly as specified.

**Commit:** `feat: add telemetry export proof and status verification`

### Task 6: Expand the readiness frontend into a real control surface

**File(s):**

1. `web/src/hooks/useOperationalReadiness.ts`
2. `web/src/lib/operationalReadiness.ts`
3. `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`
4. `web/src/components/superuser/OperationalReadinessActionPanel.tsx`
5. `web/src/components/superuser/OperationalReadinessDependencyPanel.tsx`
6. `web/src/components/superuser/OperationalReadinessProbeHistoryPanel.tsx`
7. `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
8. `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx`

**Step 1:** Freeze the exact TypeScript types in `web/src/lib/operationalReadiness.ts` to the contract declared in `11.5.1`; no shape inference is allowed in the hook or components.
**Step 2:** Replace the current `Evidence` + `Remediation` expansion with the locked two-column cause/dependency/action/verification layout from `11.5.1`.
**Step 3:** Add targeted verify and action execution calls.
**Step 4:** Show latest probe and action run state inside the locked right-column history panel.
**Step 5:** Keep client diagnostics visible, but demote them to diagnostic context rather than the main fix surface.

**Test command:** `cd E:\writing-system\web && npm exec vitest run src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/hooks/useOperationalReadiness.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
**Expected output:** frontend readiness tests pass against the expanded control-plane contract.

**Commit:** `feat: turn operational readiness into a real control surface`

### Task 7: Add pipeline-services end-to-end operational probes

**File(s):**

1. `services/platform-api/app/api/routes/pipelines.py`
2. `services/platform-api/app/services/pipeline_storage.py`
3. `services/platform-api/app/services/pipeline_source_sets.py`
4. `services/platform-api/app/workers/pipeline_jobs.py`
5. `services/platform-api/app/observability/pipeline_metrics.py`
6. `services/platform-api/tests/test_pipelines_routes.py`
7. `services/platform-api/tests/test_pipeline_multi_markdown_job.py`
8. `services/platform-api/tests/test_pipeline_worker.py`

**Step 1:** Add probe helpers that verify upload prerequisites, source-set persistence, job execution, and deliverable retrieval.
**Step 2:** Expose probe results through the new admin runtime probe surfaces.
**Step 3:** Tighten error reporting so upload-path failures identify the exact failing seam.
**Step 4:** Add or expand backend tests to cover the end-to-end path.

**Test command:** `cd E:\writing-system\services\platform-api && pytest -q tests/test_pipelines_routes.py tests/test_pipeline_multi_markdown_job.py tests/test_pipeline_worker.py`
**Expected output:** pipeline tests pass with explicit probe and error-state coverage.

**Commit:** `feat: add pipeline services operational probes`

### Task 8: Fix pipeline-services shell regression and couple UI to operational proof

**File(s):**

1. `web/src/components/common/useShellHeaderTitle.tsx`
2. `web/src/components/common/useShellHeaderTitle.test.tsx`
3. `web/src/pages/PipelineServicesPage.tsx`
4. `web/src/pages/IndexBuilderPage.tsx`
5. `web/src/components/pipelines/PipelineOperationalProbePanel.tsx`

**Step 1:** Fix the failing overview breadcrumb regression.
**Step 2:** Add a pipeline operational-probe panel that reflects the backend probe results.
**Step 3:** Ensure the workbench surfaces do not claim readiness when probe results are red.

**Test command:** `cd E:\writing-system\web && npm exec vitest run src/components/common/useShellHeaderTitle.test.tsx src/pages/PipelineServicesPage.test.tsx src/pages/IndexBuilderPage.test.tsx`
**Expected output:** the known header-title regression is gone and pipeline UI tests still pass.

**Commit:** `fix: align pipeline shell breadcrumbs and operational proof`

### Task 9: Decontaminate AGChain shell exposure

**File(s):**

1. `web/src/components/agchain/AgchainLeftNav.tsx`
2. `web/src/components/agchain/AgchainLeftNav.test.tsx`
3. `web/src/components/layout/AgchainShellLayout.tsx`
4. `web/src/components/layout/AgchainShellLayout.test.tsx`
5. `web/src/router.tsx`

**Step 1:** Keep exposed AGChain placeholder pages only behind explicit stub semantics in the rail and route affordances.
**Step 2:** Distinguish backend-backed pages from stub pages so the shell no longer implies implementation completeness.
**Step 3:** Add tests proving placeholder pages, if still exposed, are presented only as non-authoritative stubs.

**Test command:** `cd E:\writing-system\web && npm exec vitest run src/components/agchain/AgchainLeftNav.test.tsx src/components/layout/AgchainShellLayout.test.tsx`
**Expected output:** navigation tests reflect the decontaminated shell.

**Commit:** `fix: decontaminate AGChain stub exposure semantics`

### Task 10: Remove AGChain overview placeholder data or replace it with runtime-backed content

**File(s):**

1. `web/src/pages/agchain/AgchainOverviewPage.tsx`
2. `web/src/pages/agchain/AgchainOverviewPage.test.tsx`
3. `web/src/components/agchain/overview/AgchainOverviewRecentGrid.tsx`
4. `web/src/components/agchain/overview/AgchainOverviewEvaluationCard.tsx`
5. `web/src/components/agchain/overview/AgchainOverviewObservabilityCard.tsx`
6. `web/src/components/agchain/overview/agchainOverviewPlaceholderData.ts`

**Step 1:** Replace static placeholder data with runtime-backed content where backend support exists.
**Step 2:** Where backend support does not exist, remove the card or render an explicit unavailable state rather than fake content.
**Step 3:** Update tests to enforce that overview no longer depends on placeholder data for exposed product claims.

**Test command:** `cd E:\writing-system\web && npm exec vitest run src/pages/agchain/AgchainOverviewPage.test.tsx`
**Expected output:** overview tests pass against the de-placeholdered contract.

**Commit:** `fix: remove AGChain overview placeholder content`

### Task 11: Correct AGChain project-registry semantics

**File(s):**

1. `web/src/lib/agchainProjectFocus.ts`
2. `web/src/hooks/agchain/useAgchainProjectFocus.ts`
3. `web/src/pages/agchain/AgchainProjectsPage.tsx`
4. `services/platform-api/app/api/routes/agchain_benchmarks.py`
5. `services/platform-api/tests/test_agchain_benchmarks.py`

**Step 1:** Make the frontend state and copy explicit that the current project registry is benchmark-backed.
**Step 2:** Remove misleading wording that suggests a broader project registry already exists if it does not.
**Step 3:** Keep local-storage persistence only as a non-authoritative client convenience cache over the benchmark-backed registry; do not replace it in this correction.

**Test command:** `cd E:\writing-system\services\platform-api && pytest -q tests/test_agchain_benchmarks.py && cd E:\writing-system\web && npm exec vitest run src/pages/agchain/AgchainProjectsPage.test.tsx`
**Expected output:** benchmark-backed project selection remains explicit and tested.

**Commit:** `fix: align AGChain project selection with real backend contract`

### Task 12: Add runtime-target hardening for local dev

**File(s):**

1. `web/src/lib/platformApi.ts`
2. `web/vite.config.ts`
3. `scripts/start-platform-api.ps1`
4. `web/.env.example`
5. `web/src/hooks/useOperationalReadiness.ts`

**Step 1:** Stop silent fallback to the wrong backend target in the common local-dev case.
**Step 2:** Make the intended dev backend target explicit and diagnosable.
**Step 3:** Reflect runtime-target mismatch as a first-class readiness/control-plane failure.

**Test command:** `cd E:\writing-system\web && npm exec vitest run src/hooks/useOperationalReadiness.test.tsx`
**Expected output:** frontend runtime-target behavior is explicit and testable.

**Commit:** `fix: harden platform-api local target resolution`

### Task 13: Invalidate contaminated plans

**File(s):**

1. the contaminated plan files listed in Appendix E
2. this plan

**Step 1:** Add explicit invalidation or supersession notes to the contaminated readiness/remediation plans.
**Step 2:** Mark any plan that overclaimed backend completeness as non-authoritative.
**Step 3:** Cross-link them to this correction plan.

**Test command:** `git -C E:\writing-system diff -- docs/plans`
**Expected output:** contaminated plans now clearly point at this replacement.

**Commit:** `docs: invalidate contaminated backend-surface plans`

### Task 14: Final verification pass

**Commands:**

1. `cd E:\writing-system\services\platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py tests/test_admin_runtime_actions_routes.py tests/test_pipelines_routes.py tests/test_pipeline_multi_markdown_job.py tests/test_pipeline_worker.py tests/test_observability.py tests/test_observability_contract.py tests/test_agchain_benchmarks.py tests/test_agchain_models.py`
2. `cd E:\writing-system\web && npm exec vitest run src/components/common/useShellHeaderTitle.test.tsx src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/hooks/useOperationalReadiness.test.tsx src/pages/PipelineServicesPage.test.tsx src/pages/IndexBuilderPage.test.tsx src/pages/agchain/AgchainOverviewPage.test.tsx src/components/agchain/AgchainLeftNav.test.tsx src/components/layout/AgchainShellLayout.test.tsx`
3. browser verification against the readiness surface and pipeline services upload flow

**Expected output:**

1. backend correction tests pass
2. frontend correction tests pass
3. no OTEL exporter connection failures occur in the intended verified environment
4. AGChain placeholder-only pages, if still exposed, are clearly presented as stubs rather than functional surfaces
5. readiness shows real action/probe behavior

**Commit:** `test: verify emergency backend-surface correction`

## 18. Plan handoff note

This plan intentionally does not pretend every AGChain shell page can be fully implemented in the same correction tranche.

It does, however, require:

1. immediate removal of false exposed surfaces
2. explicit backend contracts before any such surface comes back
3. no further plan or implementation work that bypasses the platform/API/observability/database contract

## 19. Appendix A — Surface summary by implementation cluster

### A.1 Operational Readiness

Current state:

1. real frontend page exists
2. real snapshot endpoint exists
3. real readiness-specific metrics exist
4. no action endpoints
5. no readiness audit tables
6. no targeted verification endpoint
7. no dependency-chain contract
8. therefore not a real control plane

### A.2 Pipeline Services

Current state:

1. real backend product endpoints exist
2. real source-set persistence exists
3. real deliverable persistence exists
4. real migrations exist
5. real workbench exists
6. upload path still exposed runtime-target and bucket-CORS failure modes
7. shell regression still exists
8. therefore real but not yet certified

### A.3 AGChain shell

Current state:

1. some real backend-backed surfaces exist
2. many exposed shell pages are explicit placeholders
3. overview uses placeholder data
4. project selection uses local browser state plus benchmark-backed rows
5. therefore shell is contaminated by false exposure

### A.4 OpenTelemetry

Current state:

1. real bootstrap exists
2. real tracer/meter/log wiring exists
3. real route and service instrumentation exists
4. status endpoint is config-only
5. tests pass while export still fails
6. therefore OTEL is partial plumbing, not proof

## 20. Appendix B — Operational Readiness file inventory

### B.1 Backend files

**File:** `services/platform-api/app/api/routes/admin_runtime_readiness.py`  
**Current role:** owns `GET /admin/runtime/readiness` snapshot route  
**Current defect:** only returns the shallow grouped snapshot  
**Required correction:** keep the route, expand the contract, and split action/probe execution into explicit companion routes  
**Disposition:** modify

**File:** `services/platform-api/app/main.py`  
**Current role:** registers the readiness route and telemetry bootstrap  
**Current defect:** registers only the snapshot route for runtime control-plane use  
**Required correction:** register explicit action and probe routers alongside the snapshot route  
**Disposition:** modify

**File:** `services/platform-api/app/observability/runtime_readiness_metrics.py`  
**Current role:** defines readiness tracer, counters, and histogram  
**Current defect:** instruments snapshot/check reporting but not action/probe execution  
**Required correction:** add explicit probe and action telemetry emitters  
**Disposition:** modify

**File:** `services/platform-api/app/services/runtime_readiness.py`  
**Current role:** builds all current readiness checks  
**Current defect:** contracts stop at `summary`, `evidence`, and `remediation`  
**Required correction:** replace shallow string remediation with cause, dependency, actionability, and verification fields  
**Disposition:** modify

**File:** `services/platform-api/tests/test_admin_runtime_readiness_routes.py`  
**Current role:** route-level readiness coverage  
**Current defect:** only locks the current shallow response shape  
**Required correction:** lock the expanded control-plane response contract  
**Disposition:** modify

**File:** `services/platform-api/tests/test_runtime_readiness_service.py`  
**Current role:** service-level readiness coverage  
**Current defect:** does not lock actionability, dependency, or verification fields for every check  
**Required correction:** add full per-check contract coverage and targeted probe/action assertions  
**Disposition:** modify

**File:** `services/platform-api/app/api/routes/telemetry.py`  
**Current role:** exposes config-only telemetry status  
**Current defect:** cannot prove collector reachability or export success  
**Required correction:** extend or pair it with probe-backed telemetry status  
**Disposition:** modify

**File:** `services/platform-api/app/observability/otel.py`  
**Current role:** bootstraps traces, metrics, logs, and returns telemetry settings  
**Current defect:** `get_telemetry_status(...)` is configuration-oriented only  
**Required correction:** add probe/export verification helpers and status fields reflecting real runtime export behavior  
**Disposition:** modify

**File:** `services/platform-api/app/services/runtime_probe_service.py`  
**Current role:** does not exist  
**Current defect:** targeted probe execution is not a first-class runtime service  
**Required correction:** add explicit probe-run orchestration, result recording, and response shaping  
**Disposition:** add

**File:** `services/platform-api/app/services/runtime_action_service.py`  
**Current role:** does not exist  
**Current defect:** backend-owned remediations have no typed service layer  
**Required correction:** add explicit action execution service for safe owned remediations  
**Disposition:** add

**File:** `services/platform-api/app/api/routes/admin_runtime_actions.py`  
**Current role:** does not exist  
**Current defect:** there are no explicit control-plane action endpoints  
**Required correction:** add explicit action and probe endpoints instead of a generic script runner  
**Disposition:** add

**File:** `services/platform-api/tests/test_admin_runtime_actions_routes.py`  
**Current role:** does not exist  
**Current defect:** the future explicit action surface is not locked by tests  
**Required correction:** add route-level tests for every new explicit action/probe endpoint  
**Disposition:** add

### B.2 Frontend files

**File:** `web/src/hooks/useOperationalReadiness.ts`  
**Current role:** fetches the readiness snapshot and exposes loading/error state  
**Current defect:** fetches one endpoint and treats the feature as read-only  
**Required correction:** add targeted verification calls, action execution state, and richer error categories  
**Disposition:** modify

[Added per evaluation finding #3] **File:** `web/src/hooks/useOperationalReadiness.test.tsx`  
**Current role:** hook-level readiness client coverage  
**Current defect:** does not currently lock runtime-target diagnostics, targeted verification calls, or action execution state  
**Required correction:** extend coverage so the hook contract matches the corrected control-plane surface  
**Disposition:** modify

**File:** `web/src/lib/operationalReadiness.ts`  
**Current role:** defines current readiness types and client diagnostics  
**Current defect:** the check type models only `summary`, `evidence`, and `remediation`  
**Required correction:** add full cause/dependency/action/probe history types  
**Disposition:** modify

**File:** `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`  
**Current role:** renders compact rows with expandable `Evidence` and `Remediation`  
**Current defect:** the UI shape itself enforces the shallow model  
**Required correction:** replace expansion content with full operator guidance and action/probe affordances  
**Disposition:** modify

**File:** `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx`  
**Current role:** tests current evidence/remediation row behavior  
**Current defect:** locks the wrong UI contract  
**Required correction:** replace with tests for cause, blocked-by, action, and verification sections  
**Disposition:** modify

**File:** `web/src/components/superuser/OperationalReadinessClientPanel.tsx`  
**Current role:** renders browser-local diagnostic facts  
**Current defect:** client facts are currently one of the most useful parts of the page because the backend control surface is too weak  
**Required correction:** keep it, but demote it to context after backend actionability becomes real  
**Disposition:** modify

**File:** `web/src/components/superuser/OperationalReadinessSummary.tsx`  
**Current role:** renders the grouped status summary  
**Current defect:** summary does not distinguish actionable, blocked, or verification-in-progress states  
**Required correction:** add indicators for actionable failures and recent probe/action activity  
**Disposition:** modify

**File:** `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`  
**Current role:** owns the page composition and refresh affordance  
**Current defect:** renders a read-only diagnostic surface rather than a control plane  
**Required correction:** add control-plane state, action panel placement, and per-check verify flows  
**Disposition:** modify

**File:** `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`  
**Current role:** page-level readiness coverage  
**Current defect:** does not lock action execution or richer runtime states  
**Required correction:** add tests for explicit action/probe interaction and failure states  
**Disposition:** modify

**File:** `web/src/components/superuser/OperationalReadinessActionPanel.tsx`  
**Current role:** does not exist  
**Current defect:** no dedicated UI panel exists for backend-owned actions  
**Required correction:** add explicit action rendering and execution-result handling  
**Disposition:** add

**File:** `web/src/components/superuser/OperationalReadinessDependencyPanel.tsx`  
**Current role:** does not exist  
**Current defect:** dependency and blockage information has no UI surface  
**Required correction:** add a dedicated dependency panel for `depends_on` and `blocked_by`  
**Disposition:** add

**File:** `web/src/components/superuser/OperationalReadinessProbeHistoryPanel.tsx`  
**Current role:** does not exist  
**Current defect:** probe runs and action runs have no UI history surface  
**Required correction:** add probe/action history rendering with timestamps and outcomes  
**Disposition:** add

**File:** `web/src/components/admin/AdminLeftNav.tsx`  
**Current role:** exposes the Operational Status route in the admin shell  
**Current defect:** exposes a read-only surface under an operations label that implies a stronger control-plane capability than currently exists  
**Required correction:** keep the route, but align labels and affordances with the corrected control-plane model  
**Disposition:** modify

**File:** `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`  
**Current role:** admin nav coverage  
**Current defect:** does not enforce corrected control-plane labeling expectations  
**Required correction:** update nav tests to match corrected admin semantics  
**Disposition:** modify

**File:** `web/src/router.tsx`  
**Current role:** route registration for the readiness page  
**Current defect:** the route exists without the stronger backend action surface behind it  
**Required correction:** keep the route, but align its support routes and invalid states with the corrected backend contract  
**Disposition:** modify

## 21. Appendix C — Pipeline Services file inventory

### C.1 Backend files

**File:** `services/platform-api/app/api/routes/pipelines.py`  
**Current role:** owns pipeline definition, source, source-set, job, and deliverable endpoints  
**Current defect:** no admin probe surface and limited operational error explanation for end-to-end failures  
**Required correction:** keep the product routes and add explicit operational probes plus tighter failure reporting  
**Disposition:** modify

**File:** `services/platform-api/app/services/pipeline_source_sets.py`  
**Current role:** creates, updates, lists, and serializes source sets  
**Current defect:** assumes the product contract is enough without explicit operational verification  
**Required correction:** keep persistence logic and extend it where probe or verification seams need additional detail  
**Disposition:** modify

**File:** `services/platform-api/app/services/pipeline_storage.py`  
**Current role:** loads source markdown and stores pipeline artifacts through the user-storage substrate  
**Current defect:** operational failures still surface only after the user hits them in the full flow  
**Required correction:** add probe-friendly helpers and clearer error categorization for upload and deliverable storage seams  
**Disposition:** modify

**File:** `services/platform-api/app/workers/pipeline_jobs.py`  
**Current role:** executes pipeline jobs  
**Current defect:** job execution needs an explicit operational-certification path, not only worker tests  
**Required correction:** wire job execution into explicit probe and verification coverage  
**Disposition:** modify

**File:** `services/platform-api/app/observability/pipeline_metrics.py`  
**Current role:** emits pipeline counters, histograms, and structured logs  
**Current defect:** observability exists but is not yet tied to a formal operational-certification surface  
**Required correction:** add probe/result metrics and keep existing names stable where possible  
**Disposition:** modify

**File:** `services/platform-api/app/observability/contract.py`  
**Current role:** attribute cleaning and observability helpers  
**Current defect:** must continue to protect the expanded probe/action telemetry and pipeline telemetry from leaking unsafe fields  
**Required correction:** audit and extend attribute safety where needed  
**Disposition:** modify

**File:** `services/platform-api/app/pipelines/markdown_index_builder.py`  
**Current role:** pipeline implementation for markdown indexing  
**Current defect:** success is currently inferred too much from route/test presence instead of operational proof  
**Required correction:** keep implementation, but add explicit end-to-end certification against real upload/source-set/job/deliverable behavior  
**Disposition:** modify

**File:** `services/platform-api/tests/test_pipelines_routes.py`  
**Current role:** route-level coverage for pipeline endpoints  
**Current defect:** does not by itself certify the full upload-to-deliverable path  
**Required correction:** add or tighten assertions around failure seams and probe-backed reporting  
**Disposition:** modify

**File:** `services/platform-api/tests/test_pipeline_source_sets_routes.py`  
**Current role:** source-set route coverage  
**Current defect:** source-set persistence is covered, but not yet tied to a larger operational certification program  
**Required correction:** keep and extend as needed for end-to-end correction tasks  
**Disposition:** modify

**File:** `services/platform-api/tests/test_pipeline_multi_markdown_job.py`  
**Current role:** multi-markdown job coverage  
**Current defect:** must be treated as one proof slice, not the only proof slice  
**Required correction:** extend around explicit probe/certification behavior  
**Disposition:** modify

**File:** `services/platform-api/tests/test_pipeline_worker.py`  
**Current role:** worker behavior coverage  
**Current defect:** needs alignment with explicit job-execution probe behavior  
**Required correction:** add or tighten tests around admin probe-triggered job verification  
**Disposition:** modify

**File:** `services/platform-api/tests/test_markdown_index_builder_pipeline.py`  
**Current role:** implementation-specific pipeline coverage  
**Current defect:** does not by itself certify the external upload/path prerequisites  
**Required correction:** keep as implementation coverage and pair it with operational probes  
**Disposition:** modify

**File:** `services/platform-api/tests/test_storage_routes.py`  
**Current role:** user-storage route coverage  
**Current defect:** upload-path success still depends on runtime prerequisites outside these tests  
**Required correction:** keep and extend where the pipeline upload flow depends on storage route behavior  
**Disposition:** modify

**File:** `services/platform-api/tests/test_storage_source_documents.py`  
**Current role:** source-document bridge coverage  
**Current defect:** source-document bridge correctness still needs to be treated as a required end-to-end seam  
**Required correction:** audit and extend around pipeline-source selection expectations  
**Disposition:** modify

**File:** `supabase/migrations/20260330120000_pipeline_source_sets_foundation.sql`  
**Current role:** source-set persistence foundation  
**Current defect:** already exists, but must be re-verified as part of the correction audit  
**Required correction:** audit, not replace  
**Disposition:** verify existing

**File:** `supabase/migrations/20260330130000_pipeline_source_set_storage_contract.sql`  
**Current role:** source-set/storage contract migration  
**Current defect:** already exists, but operational certification now depends on it explicitly  
**Required correction:** audit, not replace  
**Disposition:** verify existing

### C.2 Frontend files

**File:** `web/src/pages/PipelineServicesPage.tsx`  
**Current role:** overview/landing page for pipeline services  
**Current defect:** surface quality was judged too much by its existence rather than by backend-operational proof  
**Required correction:** reflect probe-backed operational state, not only route shape  
**Disposition:** modify

**File:** `web/src/pages/PipelineServicesPage.test.tsx`  
**Current role:** landing page coverage  
**Current defect:** does not enforce backend-operational proof visibility  
**Required correction:** add assertions for probe-backed state or unavailable state  
**Disposition:** modify

**File:** `web/src/pages/IndexBuilderPage.tsx`  
**Current role:** workbench for the markdown index builder  
**Current defect:** UI success signals can outpace backend runtime truth  
**Required correction:** show explicit backend-probe and runtime-failure states  
**Disposition:** modify

**File:** `web/src/pages/IndexBuilderPage.test.tsx`  
**Current role:** index-builder page coverage  
**Current defect:** should also lock operational-proof states, not only workbench interactions  
**Required correction:** extend tests for probe-backed readiness and failure cases  
**Disposition:** modify

**File:** `web/src/pages/useIndexBuilderWorkbench.tsx`  
**Current role:** workbench state orchestration  
**Current defect:** not yet coupled to explicit backend operational probes  
**Required correction:** integrate probe-state fetching and fallback handling  
**Disposition:** modify

**File:** `web/src/pages/usePipelineServicesOverview.ts`  
**Current role:** overview data preparation  
**Current defect:** must reflect backend truth rather than shell-only status  
**Required correction:** derive overview health from explicit backend probes  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineCatalogPanel.tsx`  
**Current role:** render pipeline definitions  
**Current defect:** real endpoint exists, but panel still needs to reflect operational readiness of each pipeline kind  
**Required correction:** augment with operational health indicators as needed  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineCatalogPanel.test.tsx`  
**Current role:** catalog panel coverage  
**Current defect:** does not enforce operational-health rendering  
**Required correction:** extend or revise accordingly  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineUploadPanel.tsx`  
**Current role:** upload workflow UI  
**Current defect:** upload failure causes can still be opaque from the user side  
**Required correction:** surface explicit backend-owned probe and failure causes  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineUploadPanel.test.tsx`  
**Current role:** upload panel coverage  
**Current defect:** should lock corrected failure explanation and readiness gating  
**Required correction:** extend test assertions accordingly  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineSourceSetPanel.tsx`  
**Current role:** source-set selection and editing  
**Current defect:** state is real, but operational readiness of the downstream job path is not yet paired with it  
**Required correction:** wire source-set actions to explicit job-path readiness states  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineSourceSetPanel.test.tsx`  
**Current role:** source-set panel coverage  
**Current defect:** current tests do not enforce the new operational-proof coupling  
**Required correction:** extend tests accordingly  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineJobStatusPanel.tsx`  
**Current role:** job-status rendering  
**Current defect:** needs clearer link to operational probe output and backend failure causes  
**Required correction:** add explicit status explanations where probes identify a blocking seam  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineJobStatusPanel.test.tsx`  
**Current role:** job-status panel coverage  
**Current defect:** does not enforce the corrected explanation model  
**Required correction:** extend tests accordingly  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineDeliverablesPanel.tsx`  
**Current role:** deliverables list and download UI  
**Current defect:** needs explicit handling when deliverable retrieval is blocked by backend/runtime seams  
**Required correction:** add stronger error-state and probe-state linkage  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineDeliverablesPanel.test.tsx`  
**Current role:** deliverables panel coverage  
**Current defect:** should include corrected error/probe states  
**Required correction:** extend tests accordingly  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineSourceFilesPanel.tsx`  
**Current role:** source file listing  
**Current defect:** should clearly distinguish stored source-document truth from UI state  
**Required correction:** align with corrected source-document bridge semantics  
**Disposition:** modify

**File:** `web/src/components/pipelines/PipelineSourceFilesPanel.test.tsx`  
**Current role:** source-file panel coverage  
**Current defect:** must keep the corrected bridge semantics locked  
**Required correction:** update as needed  
**Disposition:** modify

**File:** `web/src/hooks/usePipelineJob.ts`  
**Current role:** pipeline job polling state  
**Current defect:** currently detached from explicit operational certification signals  
**Required correction:** integrate probe or backend health context where appropriate  
**Disposition:** modify

**File:** `web/src/hooks/usePipelineJob.test.ts`  
**Current role:** job hook coverage  
**Current defect:** should lock corrected behavior under failure and probe states  
**Required correction:** extend accordingly  
**Disposition:** modify

**File:** `web/src/hooks/usePipelineSourceSet.ts`  
**Current role:** source-set data hook  
**Current defect:** must remain aligned with backend source-set contract during correction  
**Required correction:** audit and update if the backend response grows  
**Disposition:** modify

**File:** `web/src/hooks/useDirectUpload.ts`  
**Current role:** direct upload flow hook  
**Current defect:** currently relies on external runtime prerequisites that were not surfaced strongly enough  
**Required correction:** pair it with explicit readiness/probe feedback  
**Disposition:** modify

**File:** `web/src/hooks/useDirectUpload.test.ts`  
**Current role:** direct-upload hook coverage  
**Current defect:** should lock corrected prerequisite and failure behavior  
**Required correction:** extend accordingly  
**Disposition:** modify

**File:** `web/src/lib/pipelineService.ts`  
**Current role:** pipeline-services API client and upload flow integration  
**Current defect:** operational success was inferred from API presence rather than full runtime truth  
**Required correction:** preserve the real API client while pairing it with explicit probe and failure handling  
**Disposition:** modify

**File:** `web/src/lib/pipelineService.test.ts`  
**Current role:** client-library coverage  
**Current defect:** should lock corrected probe and failure-state handling  
**Required correction:** extend accordingly  
**Disposition:** modify

**File:** `web/src/lib/pipelineSourceSetService.ts`  
**Current role:** source-set client library  
**Current defect:** needs audit against any corrected backend response shape  
**Required correction:** modify only if the backend contract changes  
**Disposition:** verify or modify

**File:** `web/src/lib/storageUploadService.ts`  
**Current role:** generic source-upload preparation and reservation/completion flow  
**Current defect:** relies on bucket CORS and backend targeting assumptions that were not surfaced strongly enough  
**Required correction:** preserve the substrate, but pair it with corrected runtime-target and readiness handling  
**Disposition:** modify

**File:** `web/src/lib/storageUploadService.test.ts`  
**Current role:** upload-service coverage  
**Current defect:** should lock corrected prerequisite/failure behavior  
**Required correction:** extend accordingly  
**Disposition:** modify

**File:** `web/src/lib/uploadReservationRecovery.ts`  
**Current role:** reservation conflict recovery  
**Current defect:** must stay aligned with corrected storage/pipeline operational handling  
**Required correction:** audit and modify only if required by the corrected upload flow  
**Disposition:** verify or modify

**File:** `web/src/components/pipelines/PipelineOperationalProbePanel.tsx`  
**Current role:** does not exist  
**Current defect:** the workbench has no dedicated UI surface for operational probes and certification state  
**Required correction:** add a probe panel owned by the backend probe contract  
**Disposition:** add

## Appendix D — AGChain Shell, Runtime Targeting, And OpenTelemetry File Inventory

This appendix covers the frontend shell files, targeting seams, AGChain page files, and telemetry files that conform to the same failure pattern: progress was claimed without a complete backend contract or without real operational proof.

### D1. Runtime targeting and shell-routing files

**File:** `web/src/lib/platformApi.ts`  
**Current role:** shared platform-api base URL resolver and fetch wrapper  
**Current defect:** silently falls back to `/platform-api`, which then depends on Vite proxy configuration and can point the frontend at the wrong backend instance without operator awareness  
**Required correction:** preserve the shared client, but add an explicit runtime target state that can be consumed by readiness, pipeline services, and any backend-owned admin surface; the correction must make mismatched targets first-class diagnostic data rather than incidental client behavior  
**Disposition:** modify

**File:** `web/vite.config.ts`  
**Current role:** development proxy and frontend build configuration  
**Current defect:** the `/platform-api` proxy target defaulted to `http://localhost:8000`, which created a real runtime split from the active repo-backed backend on `8001`  
**Required correction:** audit the dev proxy contract, remove misleading defaults, and align the dev shell with the backend targeting rules enforced by the corrected readiness control plane  
**Disposition:** modify

**File:** `scripts/start-platform-api.ps1`  
**Current role:** local platform-api launcher  
**Current defect:** defaulted to port `8000`, which reinforced the incorrect backend-target assumption and conflicted with the actual runtime used later in the session  
**Required correction:** align the launcher with the corrected local-runtime contract, or require an explicit operator choice rather than silently encoding a conflicting default  
**Disposition:** modify

[Added per evaluation finding #3] **File:** `web/.env.example`  
**Current role:** repo-shared frontend environment example for local development  
**Current defect:** does not currently act as the locked documented runtime-target example for the corrected local platform-api contract  
**Required correction:** update it so the intended dev backend target is explicit instead of being left to proxy fallback assumptions  
**Disposition:** modify

**File:** `web/src/router.tsx`  
**Current role:** top-level application routing across pipeline, superuser, AGChain, and other surfaces  
**Current defect:** exposes pages whose backend/data contracts are incomplete, allowing shell presence to be mistaken for implementation completion  
**Required correction:** gate AGChain routes behind real backend ownership rules, preserve the readiness and pipeline routes only after their backend contracts are corrected, and ensure route exposure matches the backend manifest defined in this plan  
**Disposition:** modify

**File:** `web/src/components/common/useShellHeaderTitle.tsx`  
**Current role:** shell header title/breadcrumb resolver  
**Current defect:** still fails the pipeline-services overview title contract test, proving that shell normalization work remains incomplete even inside the allegedly corrected surface set  
**Required correction:** fix the route-title logic so the shell title matches the declared route contract and remains stable under overview/drill transitions  
**Disposition:** modify

**File:** `web/src/components/common/useShellHeaderTitle.test.tsx`  
**Current role:** header-title route regression coverage  
**Current defect:** currently fails, which is direct evidence that frontend shell normalization cannot be counted as complete  
**Required correction:** preserve and extend as a hard gate for the corrected shell contract  
**Disposition:** modify

[Added per evaluation finding #3] **File:** `web/src/components/agchain/AgchainLeftNav.tsx`  
**Current role:** primary AGChain navigation rail  
**Current defect:** currently participates in exposing placeholder-only AGChain product domains as if they were implemented  
**Required correction:** keep exposed placeholder surfaces only as clearly labeled stubs and keep backend-backed AGChain domains visually distinct  
**Disposition:** modify

[Added per evaluation finding #3] **File:** `web/src/components/agchain/AgchainLeftNav.test.tsx`  
**Current role:** AGChain left-rail coverage  
**Current defect:** does not yet enforce the corrected backend-truth exposure rules  
**Required correction:** update tests to lock the stub-safe navigation state  
**Disposition:** modify

[Added per evaluation finding #3] **File:** `web/src/components/layout/AgchainShellLayout.tsx`  
**Current role:** AGChain shell layout and routed content frame  
**Current defect:** layout affordances can still imply that placeholder surfaces are fully implemented rather than stubbed  
**Required correction:** align shell structure and affordances with a mixed backend-backed plus explicit-stub AGChain surface set  
**Disposition:** modify

[Added per evaluation finding #3] **File:** `web/src/components/layout/AgchainShellLayout.test.tsx`  
**Current role:** shell layout coverage  
**Current defect:** does not yet lock the corrected AGChain shell exposure rules  
**Required correction:** update tests to enforce the post-decontamination stub contract  
**Disposition:** modify

### D2. AGChain shell and overview files

**File:** `web/src/pages/agchain/AgchainOverviewPage.tsx`  
**Current role:** AGChain overview shell page with static or semi-static summary cards  
**Current defect:** blends real benchmark/project context with placeholder overview content, which makes the page look more complete than the actual backend support justifies  
**Required correction:** downgrade or restructure the page so every visible panel is either backed by a declared backend/data contract or explicitly marked as stub/non-authoritative content  
**Disposition:** modify

**File:** `web/src/pages/agchain/AgchainOverviewPage.test.tsx`  
**Current role:** AGChain overview coverage  
**Current defect:** does not currently enforce the corrected rule that only backend-owned content may appear in exposed AGChain overview sections  
**Required correction:** rewrite to lock the corrected overview contract after the backend/data seams are declared  
**Disposition:** modify

**File:** `web/src/pages/agchain/AgchainProjectsPage.tsx`  
**Current role:** project/benchmark registry shell page  
**Current defect:** partially real because it draws from benchmarks data, but it also acts as a product-level confirmation surface even though the broader AGChain product domains remain unimplemented  
**Required correction:** keep the real registry behavior, but clearly limit the page to the data that is actually backed by platform-api, and do not let it imply that adjacent domains are also operational  
**Disposition:** modify

**File:** `web/src/pages/agchain/AgchainProjectsPage.test.tsx`  
**Current role:** AGChain projects coverage  
**Current defect:** should be tightened so it enforces the corrected backend-truth rule instead of merely rendering a populated shell page  
**Required correction:** extend accordingly  
**Disposition:** modify

[Added per evaluation finding #2] **File:** `web/src/lib/agchainProjectFocus.ts`  
**Current role:** browser-local persistence and event helpers for AGChain project focus  
**Current defect:** local-storage persistence exists, but the plan previously failed to lock its corrected non-authoritative role over the benchmark-backed registry  
**Required correction:** keep it only as a client convenience cache and make that compatibility seam explicit in code and tests  
**Disposition:** modify

[Added per evaluation finding #2] **File:** `web/src/hooks/agchain/useAgchainProjectFocus.ts`  
**Current role:** resolves AGChain project focus against the benchmark-backed registry  
**Current defect:** must explicitly treat the benchmark list as the authoritative source and discard stale local-storage selections  
**Required correction:** align hook behavior and tests with the locked benchmark-registry seam  
**Disposition:** modify

[Added per evaluation finding #2] **File:** `services/platform-api/app/api/routes/agchain_benchmarks.py`  
**Current role:** real benchmark-registry API that the AGChain projects surface already depends on  
**Current defect:** the correction tasks relied on this seam without the plan explicitly locking it as the temporary AGChain project registry contract  
**Required correction:** preserve the real benchmark routes, but make their project-registry compatibility role explicit and avoid inventing a broader AGChain projects backend in this tranche  
**Disposition:** modify

[Added per evaluation finding #2] **File:** `services/platform-api/tests/test_agchain_benchmarks.py`  
**Current role:** benchmark route coverage  
**Current defect:** does not currently lock the corrected benchmark-backed registry semantics for AGChain project selection  
**Required correction:** extend tests so the benchmark route remains the explicit temporary registry seam and not a placeholder for a different backend  
**Disposition:** modify

**File:** `web/src/pages/agchain/AgchainBenchmarksPage.tsx`  
**Current role:** benchmark catalog page  
**Current defect:** closer to real than the placeholder pages, but it still lives inside a shell that overstates adjacent domain readiness  
**Required correction:** preserve the page as a real backed surface, while making its contract explicit and severing any dependency on placeholder AGChain domain pages reading as more than stub surfaces  
**Disposition:** modify

**File:** `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`  
**Current role:** benchmark page coverage  
**Current defect:** must be aligned to the corrected route exposure and backend ownership rules  
**Required correction:** update accordingly  
**Disposition:** modify

**File:** `web/src/pages/agchain/AgchainModelsPage.tsx`  
**Current role:** model catalog page backed by platform-api  
**Current defect:** similar to benchmarks: the page itself has backend truth, but the surrounding shell state can mislead operators into treating the broader AGChain domain as implemented  
**Required correction:** preserve the backed page, but pair it with corrected stub semantics and backend-manifest enforcement  
**Disposition:** modify

**File:** `web/src/pages/agchain/AgchainModelsPage.test.tsx`  
**Current role:** model page coverage  
**Current defect:** must be updated to enforce the corrected shell exposure rules  
**Required correction:** update accordingly  
**Disposition:** modify

**File:** `web/src/pages/agchain/AgchainSectionPage.tsx`  
**Current role:** generic placeholder page renderer for multiple AGChain domains  
**Current defect:** this file is the central placeholder shortcut. It allowed many pages to be “implemented” as shell-preserving cards with placeholder copy instead of backend-owned functionality  
**Required correction:** if retained in the exposed AGChain operator path, constrain it to an unmistakable stub renderer with non-authoritative copy and visual treatment that cannot be mistaken for backend-owned functionality  
**Disposition:** modify or isolate

**File:** `web/src/pages/agchain/AgchainSectionPage.test.tsx`  
**Current role:** placeholder page coverage  
**Current defect:** currently validates the existence of the placeholder pattern instead of enforcing honest stub semantics in the operator-facing shell  
**Required correction:** replace with tests that ensure unbacked AGChain domains, if exposed, are never presented as functional pages  
**Disposition:** replace

**File:** `web/src/pages/agchain/AgchainRunsPage.tsx`  
**Current role:** runs domain page routed through the placeholder surface  
**Current defect:** declares a product domain without a real backend/data contract for AGChain runs management  
**Required correction:** keep exposed only as an explicit stub until a real runs backend contract, persistence model, and page-specific tests exist  
**Disposition:** modify as stub, then replace later

**File:** `web/src/pages/agchain/AgchainResultsPage.tsx`  
**Current role:** results domain placeholder page  
**Current defect:** same failure pattern as runs  
**Required correction:** keep exposed only as an explicit stub until backed by a real backend contract  
**Disposition:** modify as stub, then replace later

**File:** `web/src/pages/agchain/AgchainPromptsPage.tsx`  
**Current role:** prompts domain placeholder page  
**Current defect:** same failure pattern as runs/results  
**Required correction:** keep exposed only as an explicit stub until a real prompts backend contract exists  
**Disposition:** modify as stub, then replace later

**File:** `web/src/pages/agchain/AgchainScorersPage.tsx`  
**Current role:** scorers domain placeholder page  
**Current defect:** same failure pattern as prompts  
**Required correction:** keep exposed only as an explicit stub until a real scorers backend contract exists  
**Disposition:** modify as stub, then replace later

**File:** `web/src/pages/agchain/AgchainParametersPage.tsx`  
**Current role:** parameters domain placeholder page  
**Current defect:** same failure pattern as prompts/scorers  
**Required correction:** keep exposed only as an explicit stub until a real parameters backend contract exists  
**Disposition:** modify as stub, then replace later

**File:** `web/src/pages/agchain/AgchainToolsPage.tsx`  
**Current role:** tools domain placeholder page  
**Current defect:** same failure pattern as parameters  
**Required correction:** keep exposed only as an explicit stub until a real tools backend contract exists  
**Disposition:** modify as stub, then replace later

**File:** `web/src/pages/agchain/AgchainDatasetsPage.tsx`  
**Current role:** datasets domain placeholder page  
**Current defect:** exposes a critical product domain without declaring the backend data model, dataset inventory contract, build-state contract, or ingestion endpoints  
**Required correction:** keep exposed only as an explicit stub until the platform has a real datasets contract, or replace only after the backend manifest described earlier in this plan is implemented  
**Disposition:** modify as stub, then replace later

**File:** `web/src/pages/agchain/AgchainObservabilityPage.tsx`  
**Current role:** observability domain placeholder page  
**Current defect:** particularly misleading because it suggests a future relationship to host OTEL patterns while the actual observability stack is not yet operationally provable  
**Required correction:** keep exposed only as an explicit stub until real AGChain observability APIs, traces, metrics, and operator workflows are implemented and verified  
**Disposition:** modify as stub, then replace later

**File:** `web/src/pages/agchain/AgchainArtifactsPage.tsx`  
**Current role:** artifacts domain placeholder page  
**Current defect:** exposes a domain without artifact catalog, delivery, or provenance contracts  
**Required correction:** keep exposed only as an explicit stub until backed by real artifact APIs  
**Disposition:** modify as stub, then replace later

**File:** `web/src/pages/agchain/AgchainBuildPage.tsx`  
**Current role:** build domain placeholder page  
**Current defect:** exposes the core benchmark-build domain without build pipeline APIs, status models, or artifact ownership  
**Required correction:** keep exposed only as an explicit stub until the build backend surface exists  
**Disposition:** modify as stub, then replace later

**File:** `web/src/pages/agchain/AgchainDashboardPage.tsx`  
**Current role:** dashboard-level shell page  
**Current defect:** must be audited against the same backend-truth rule so that no dashboard card suggests implemented coverage beyond backed or explicit-stub domains  
**Required correction:** revise so dashboard content distinguishes backend-backed domains from stub domains until backend contract declaration catches up  
**Disposition:** modify

**File:** `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`  
**Current role:** benchmark workbench page  
**Current defect:** should be re-audited so it does not rely on placeholder-adjacent assumptions from the current AGChain shell  
**Required correction:** verify the workbench against the corrected benchmark/model-only exposure rule  
**Disposition:** verify or modify

**File:** `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`  
**Current role:** benchmark workbench coverage  
**Current defect:** must be updated if route availability or parent-shell semantics change  
**Required correction:** update as needed  
**Disposition:** verify or modify

**File:** `web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx`  
**Current role:** coverage for exposed placeholder pages  
**Current defect:** validates a failure pattern that this plan explicitly rejects  
**Required correction:** remove or rewrite as a stub-semantics test ensuring those pages are not exposed as functional surfaces without backend ownership  
**Disposition:** replace

**File:** `web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`  
**Current role:** coverage for project-scoped placeholder pages  
**Current defect:** same failure pattern as the level-one placeholder coverage  
**Required correction:** remove or rewrite as a stub-semantics test  
**Disposition:** replace

**File:** `web/src/components/agchain/overview/agchainOverviewPlaceholderData.ts`  
**Current role:** static placeholder content feeding the overview surface  
**Current defect:** hardcoded product-domain claims and descriptions were used to fill shell space in place of backend-driven data  
**Required correction:** delete, quarantine, or explicitly label the placeholder data so it cannot read as backend-driven content in the exposed overview path  
**Disposition:** modify or isolate

### D3. OpenTelemetry and observability files

**File:** `services/platform-api/app/observability/otel.py`  
**Current role:** core OTEL bootstrap for spans, metrics, logs, and instrumentation wiring  
**Current defect:** real plumbing exists, but the system lacks backend-owned operational proof endpoints and currently allows config presence to masquerade as telemetry readiness  
**Required correction:** preserve the instrumentation substrate, but add backend probes, export verification, degraded-state reporting, and explicit readiness/action seams as defined in the main plan body  
**Disposition:** modify

**File:** `services/platform-api/app/observability/contract.py`  
**Current role:** observability naming and contract constants  
**Current defect:** currently reflects partial route-level instrumentation but not the full corrective probe/action contract required by this plan  
**Required correction:** extend with the new readiness probe and admin action event names, counters, histograms, and log keys  
**Disposition:** modify

**File:** `services/platform-api/app/observability/runtime_readiness_metrics.py`  
**Current role:** metrics and spans for the read-only readiness snapshot  
**Current defect:** bound to the shallow snapshot model rather than the corrected cause/fix/verification and action/probe model  
**Required correction:** extend or refactor to cover check verification runs, dependency blocking, action execution, and result certification  
**Disposition:** modify

**File:** `services/platform-api/app/observability/pipeline_metrics.py`  
**Current role:** pipeline-services metrics  
**Current defect:** captures pipeline route activity but not the end-to-end operational certification flows that this plan requires  
**Required correction:** extend with explicit upload-probe, job-execution-probe, and deliverable-verification instrumentation  
**Disposition:** modify

**File:** `services/platform-api/app/observability/storage_metrics.py`  
**Current role:** storage-path metrics  
**Current defect:** must be audited so that corrected upload and storage probes emit the right metrics and structured logs  
**Required correction:** extend or refactor as required by the corrected storage/admin probe flows  
**Disposition:** verify or modify

**File:** `services/platform-api/app/api/routes/telemetry.py`  
**Current role:** telemetry-status endpoint  
**Current defect:** exposes config-derived telemetry status without proving collector reachability or export success, which is exactly the class of misleading signal this plan is correcting  
**Required correction:** keep the existing `/observability/telemetry-status` route, but extend it so it reports both config state and probe-backed export proof; config-only semantics are no longer allowed  
**Disposition:** modify

**File:** `services/platform-api/tests/test_observability.py`  
**Current role:** observability coverage  
**Current defect:** current passing tests do not prove real export viability; they only confirm parts of the instrumentation contract  
**Required correction:** preserve the current contract checks but add backend probe/action coverage so telemetry claims cannot pass without the corrected proof model  
**Disposition:** modify

## Appendix E — Contaminated Plan Inventory And Disposition

This appendix lists the plan files that were affected by the same failure pattern: backend-required work was framed or judged primarily through frontend surfaces, read-only routes, placeholder pages, or config-level proofs. Each plan receives an explicit disposition so no one treats it as authoritative by accident.

### E1. Plans explicitly invalidated

**Plan:** `docs/plans/2026-03-30-superuser-operational-readiness-scripted-remediation-plan.md`  
**Failure pattern:** tried to solve operational failures by attaching scripts and commands to a read-only snapshot surface instead of declaring backend-owned admin action endpoints  
**Disposition:** invalidated in full  
**Replacement authority:** this emergency correction plan

**Plan:** `docs/plans/2026-03-30-superuser-operational-readiness-endpoint-unavailable-hardening-plan.md`  
**Failure pattern:** hardened error presentation around a deficient architecture instead of correcting the missing backend action/probe surface  
**Disposition:** invalidated in full  
**Replacement authority:** this emergency correction plan

**Plan:** `docs/plans/2026-03-30-superuser-operational-readiness-cause-fix-verification-plan.md`  
**Failure pattern:** improved the language around cause/fix/verification, but still did not anchor the solution in a declared backend action/probe inventory  
**Disposition:** invalidated in full  
**Replacement authority:** this emergency correction plan

### E2. Plans superseded but partially salvageable

**Plan:** `docs/plans/2026-03-30-superuser-operational-readiness-control-plane-v2-implementation-plan.md`  
**Failure pattern:** the original implementation plan did produce the current readiness page and snapshot endpoint, but that architecture is now deemed insufficient for the actual operator requirement  
**Disposition:** superseded; historical implementation record only  
**Salvageable content:** existing check inventory, grouped page contract, existing metrics names, and route/page file inventory  
**Replacement authority:** this emergency correction plan

**Plan:** `docs/plans/2026-03-30-runtime-contract-and-admin-capability-registry-implementation-plan.md`  
**Failure pattern:** identified a missing compatibility/capability seam, but remained too abstract and never landed in code  
**Disposition:** superseded; mine only for useful endpoint/capability ideas  
**Salvageable content:** capability-registry concern and stale-backend problem framing  
**Replacement authority:** this emergency correction plan

**Plan:** `docs/plans/2026-03-30-runtime-contract-and-admin-capability-registry-v2-implementation-plan.md`  
**Failure pattern:** same as the previous runtime-contract plan  
**Disposition:** superseded; mine only for useful capability concepts  
**Salvageable content:** any explicit compatibility-gate requirement that still fits the corrected backend-first architecture  
**Replacement authority:** this emergency correction plan

**Plan:** `docs/plans/2026-03-30-operational-readiness-bootstrap-compatibility-gate-implementation-plan.md`  
**Failure pattern:** attempted to solve backend/version mismatch presentation without first repairing the missing control-plane contract  
**Disposition:** superseded  
**Salvageable content:** stale-backend compatibility handling after the corrected backend surface exists  
**Replacement authority:** this emergency correction plan

### E3. Plans requiring re-audit under the corrected standard

**Plan:** `docs/plans/2026-03-30-pipeline-services-multi-markdown-source-sets-recovery-plan.md`  
**Failure pattern:** contains real backend work, real SQL, real routes, and real tests, but was at times judged through partial UI existence rather than strict end-to-end behavior  
**Disposition:** keep, but re-audit under the corrected operational standard  
**Required re-audit focus:** upload path, source-set persistence, job execution, deliverables, runtime targeting, and failure-path observability  
**Replacement authority:** this emergency correction plan governs the corrective patch layer; the original plan remains relevant only where its backend work is real

**Plan:** `docs/plans/2026-03-30-pipeline-services-overview-drill-entry-plan.md`  
**Failure pattern:** shell/navigation normalization work was treated as more final than it is, evidenced by the still-failing header-title test  
**Disposition:** keep for historical route intent, but do not count as completed implementation authority  
**Required re-audit focus:** route title correctness and shell consistency after backend truth is restored  
**Replacement authority:** this emergency correction plan for corrective work

**Plan:** `docs/plans/2026-03-30-pipeline-services-shell-navigation-normalization-plan.md`  
**Failure pattern:** same as overview-drill-entry  
**Disposition:** keep for historical route intent, not completion authority  
**Required re-audit focus:** same as above  
**Replacement authority:** this emergency correction plan for corrective work

**Plan:** `docs/plans/2026-03-30-corrective-patch-full-stack-compliance-plan.md`  
**Failure pattern:** must be re-audited because “full-stack compliance” claims are now suspect wherever backend-first seams were not explicitly declared  
**Disposition:** hold and re-evaluate  
**Required re-audit focus:** every claimed backend surface, every SQL/migration change, and every operational proof claim  
**Replacement authority:** this emergency correction plan for the specific failure pattern in scope

**Plan:** `docs/plans/2026-03-30-pipeline-index-builder-single-flow-redesign-plan.md`  
**Failure pattern:** must be checked for the same shell-first or workaround-first shortcuts before further execution  
**Disposition:** hold pending re-evaluation  
**Required re-audit focus:** whether the redesign is anchored in declared backend routes, data contracts, and runtime verification  
**Replacement authority:** this emergency correction plan where the same failure pattern appears

### E4. Plans that document real domain understanding but are not implementation authority

**Plan:** `docs/plans/2026-03-30-agchain-legal10-inspectai-build-direction.md`  
**Disposition:** reference-only domain analysis, not implementation authority for the surfaces corrected here

**Plan:** `docs/plans/2026-03-30-agchain-platform-legal10-datasets-inspect-revision.md`  
**Disposition:** reference-only platform/domain analysis, not implementation authority for the surfaces corrected here

### E5. Immediate rules for all future plans in this surface family

1. No plan may claim a control plane or operational surface is implemented unless the platform-api endpoint inventory includes both diagnostic and action/probe seams where required by the product behavior.
2. No plan may count a placeholder page, generic section page, or static shell filler as implementation progress for a product domain.
3. No plan may mark telemetry as operational based only on config presence or instrumentation bootstrap.
4. No plan may mark upload or pipeline services operational based only on route presence, mocked tests, or partial frontend rendering.
5. Any plan that proposes scripts or commands as the primary remediation surface for an operator control plane is invalid by default unless the same behavior is also backed by explicit platform-api admin/action endpoints.

## Appendix F — Immediate Patch Sequencing After Plan Approval

The following sequence is mandatory. It translates the plan into the first correction order and prevents effort from scattering across shell pages before the backend-owned seams exist.

### F1. Sequence 1 — Freeze and invalidate

1. Mark the invalidated readiness/remediation plans as superseded or failed in their front matter.
2. Add a brief note at the top of each invalidated plan pointing to this emergency correction plan.
3. Remove any active work items that still treat scripted remediation as the primary product surface.

### F2. Sequence 2 — Correct the readiness backend shape

1. Add the new admin action/probe endpoints and supporting services.
2. Add the new probe/action persistence tables and migrations.
3. Refactor the readiness snapshot shape so each check reports cause, blocker, action, verification target, and next probe.
4. Add route and service tests for every new endpoint and every corrected check shape.

### F3. Sequence 3 — Correct the readiness frontend shape

1. Replace the current evidence/remediation-only expansion UI with the corrected backend-owned cause/fix/verification rendering.
2. Add explicit blocker visualization so downstream checks point back to upstream failures.
3. Preserve client runtime diagnostics, but place them clearly outside the backend-owned check model.
4. Add action/probe execution UI only after the backend endpoints exist.

### F4. Sequence 4 — Re-certify pipeline services under the corrected standard

1. Implement or expose backend probes for upload, job execution, and deliverable verification.
2. Run those probes against the local runtime and record the results.
3. Fix any remaining runtime-target, storage, or delivery failures before the surface is considered operational.
4. Update the readiness control plane so pipeline-services dependencies are visible there as well.

### F5. Sequence 5 — Retain AGChain shell placeholders only as explicit stubs

1. Keep placeholder domain pages exposed only where the shell can present them as unmistakable stubs.
2. Distinguish AGChain surfaces that have real backend ownership from stub-only surfaces.
3. Rewrite overview/dashboard content so no static placeholder copy implies missing functionality exists.
4. Replace placeholder-page tests with stub-semantics and backend-truth tests.

### F6. Sequence 6 — Rebuild telemetry proof

1. Add telemetry export probes or equivalent backend-owned verification.
2. Downgrade any status endpoint that can only report config presence.
3. Lock telemetry tests to the corrected semantics.
4. Re-run the readiness and observability verification commands after the probe layer exists.
