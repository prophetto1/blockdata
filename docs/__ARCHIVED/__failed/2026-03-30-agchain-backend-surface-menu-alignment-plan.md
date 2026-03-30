# AGChain Backend Surface Menu Alignment Implementation Plan

**Goal:** Surface the AGChain backend capabilities that already exist today without deleting the current `Overview` through `Settings` level-one shell. Expose the real backend-backed functions as explicit AGChain menu entries or routed placements so the shell stops implying that only placeholder surfaces exist.

**Architecture:** Keep the existing FastAPI AGChain backend, Supabase schema, benchmark-backed project-focus seam, and current AGChain routes intact. Do not delete `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Observability`, or `Settings`. Instead, add explicit top-level surfacing for the already-real backend-backed functions (`Projects`, `Models`, and `Benchmark Definition`), preserve the existing benchmark-definition workbench under the current route family, and update `Overview` so it clearly communicates which AGChain surfaces are live versus planned.

**Tech Stack:** React + TypeScript, React Router, existing AGChain shell components, FastAPI, Supabase Postgres, OpenTelemetry, Vitest.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-30

## Source Documents

Primary intent sources:

- `docs/agchain/_essentials/2026-03-26-agchain-platform-requirements.md`
- `docs/agchain/_essentials/2026-03-26-agchain-platform-understanding.md`
- `docs/agchain/platform/agchain-platform-architecture.md`
- `docs/plans/2026-03-28-agchain-evaluation-workspace-direction.md`
- `docs/plans/2026-03-30-agchain-shell-selector-registry-regression-correction-plan.md`

Current implementation seams reviewed:

- `services/platform-api/app/api/routes/agchain_benchmarks.py`
- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/domain/agchain/benchmark_registry.py`
- `services/platform-api/app/domain/agchain/model_registry.py`
- `services/platform-api/app/domain/agchain/model_provider_catalog.py`
- `services/platform-api/app/main.py`
- `supabase/migrations/20260326170000_agchain_model_targets.sql`
- `supabase/migrations/20260326234500_agchain_benchmark_registry.sql`
- `supabase/migrations/20260328113000_agchain_benchmark_step_reorder_atomic_rpc.sql`
- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/router.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`

## Current-State Assessment

### What is real in the backend today

The current AGChain backend already exposes three concrete product surfaces:

1. **Project / evaluation registry** backed by `agchain_benchmarks`, `agchain_benchmark_versions`, `agchain_benchmark_steps`, `agchain_benchmark_model_targets`, and `agchain_runs`.
2. **Model target registry** backed by `agchain_model_targets` and `agchain_model_health_checks`.
3. **Benchmark definition editing** backed by benchmark-step CRUD plus atomic reorder RPC.

Those surfaces are already mounted through:

- `GET/POST /agchain/benchmarks`
- `GET /agchain/benchmarks/{benchmark_slug}`
- `GET/POST/PATCH/DELETE /agchain/benchmarks/{benchmark_slug}/steps`
- `POST /agchain/benchmarks/{benchmark_slug}/steps/reorder`
- `GET /agchain/models/providers`
- `GET/POST/PATCH /agchain/models`
- `GET /agchain/models/{model_target_id}`
- `POST /agchain/models/{model_target_id}/refresh-health`

### What is placeholder or partial today

The current left-rail shell makes `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Observability`, and `Settings` look like the main AGChain product surfaces, but most of those pages are placeholder copy.

Important nuance:

- `Parameters` is not empty conceptually because `_agchain/profiles/*` and `runtime/runtime_config.py` exist, but that seam is still package-internal and phase-blocked, not yet a real host-platform AGChain surface.
- `Scorers` is not empty conceptually because benchmark steps already contain `scoring_mode`, `scorer_ref`, and `judge_prompt_ref`, but there is no separate scorer registry or scorer page backend yet.
- `Observability` is not empty operationally because the existing AGChain routes already emit OTel spans, metrics, and structured logs, but there is no AGChain user-facing observability route family yet.
- `Runs`, `Results`, `Artifacts`, and `Build` exist as route/page placeholders or redirects, and `agchain_runs` exists in the schema, but there is no completed AGChain run-management or result-inspection API surface yet.

### Menu-to-backend truth matrix

| Surface | Current UI state | Backend reality | Required action |
|---------|------------------|-----------------|-----------------|
| Projects | Real route, not top-level in left rail | Real backend-backed registry | Promote into top-level rail |
| Models | Real route, not top-level in left rail | Real backend-backed registry + health | Promote into top-level rail |
| Benchmark Definition | Real route hidden under `Settings > Project` and compat redirects | Real backend-backed benchmark-step workbench | Promote into top-level rail via explicit menu path while preserving current route |
| Overview | Real page with mostly shell/orientation copy | Can summarize current project + real surfaces using existing routes | Keep, but make live capabilities explicit |
| Datasets | Placeholder | No route/domain/migration yet | Keep placeholder, do not pretend it is backed |
| Prompts | Placeholder | No route/domain/migration yet | Keep placeholder |
| Scorers | Placeholder | Partial benchmark-step fields only, no dedicated backend surface | Keep placeholder |
| Parameters | Placeholder | Package-internal profile/runtime seam only | Keep placeholder |
| Tools | Placeholder | No AGChain host backend surface yet | Keep placeholder |
| Observability | Placeholder | Route instrumentation exists, user-facing product surface does not | Keep placeholder |
| Settings | Partition placeholder with real benchmark-definition CTA | Only benchmark definition is materially backed | Keep settings, but stop making it the only visible access path to benchmark definition |

## Manifest

### Platform API

No platform API contract changes.

#### Existing platform API endpoints reused as-is

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/benchmarks` | Drive AGChain project/evaluation registry, project-focus seam, and overview surfacing | Existing - reused as-is |
| POST | `/agchain/benchmarks` | Create AGChain project/evaluation rows | Existing - reused as-is |
| GET | `/agchain/benchmarks/{benchmark_slug}` | Read selected benchmark/project summary | Existing - reused as-is |
| GET | `/agchain/benchmarks/{benchmark_slug}/steps` | Drive benchmark-definition workbench | Existing - reused as-is |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps` | Create benchmark step | Existing - reused as-is |
| PATCH | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Update benchmark step | Existing - reused as-is |
| DELETE | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Delete benchmark step | Existing - reused as-is |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps/reorder` | Persist ordered benchmark steps | Existing - reused as-is |
| GET | `/agchain/models/providers` | Populate provider catalog | Existing - reused as-is |
| GET | `/agchain/models` | Drive model registry table | Existing - reused as-is |
| GET | `/agchain/models/{model_target_id}` | Drive model inspector | Existing - reused as-is |
| POST | `/agchain/models` | Create model target | Existing - reused as-is |
| PATCH | `/agchain/models/{model_target_id}` | Update model target | Existing - reused as-is |
| POST | `/agchain/models/{model_target_id}/refresh-health` | Refresh model target health | Existing - reused as-is |

Justification:

- the requested change is surfacing and menu alignment, not backend capability creation,
- the real AGChain-backed surfaces already exist and are being under-exposed, not absent,
- new endpoints would create the wrong impression that missing information architecture must be solved by new backend work first.

### Observability

No new observability surface in this batch.

Justification:

- this plan does not add a new owned runtime seam,
- it only exposes already-traced AGChain route families more honestly in the shell,
- existing route-level traces, counters, histograms, and structured logs in `agchain_benchmarks.py` and `agchain_models.py` remain the observability spine for the reused backend.

### Database Migrations

No database migrations.

Justification:

- the existing schema already contains the backend-backed surfaces this plan is exposing,
- the problem is menu visibility and product framing, not missing persistence for this batch.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages/routes:** `0`

**New components:** `0`

**New hooks/libs:** `0`

**Modified existing pages:** `2`

| Page | File | What changes |
|------|------|--------------|
| `AgchainOverviewPage` | `web/src/pages/agchain/AgchainOverviewPage.tsx` | Add explicit backed-surface disclosure and direct navigation to the real backend-backed surfaces |
| `AgchainSettingsPage` | `web/src/pages/agchain/AgchainSettingsPage.tsx` | Clarify that benchmark definition remains available here but is no longer the only visible access path |

**Modified existing components/layout:** `1`

| File | What changes |
|------|--------------|
| `web/src/components/agchain/AgchainLeftNav.tsx` | Add explicit top-level entries for `Projects`, `Models`, and `Benchmark Definition` above the existing `Overview` through `Settings` shell nouns |

**Modified existing router/support files:** `1`

| File | What changes |
|------|--------------|
| `web/src/router.tsx` | Add a first-class top-level AGChain route alias for benchmark definition while preserving existing settings and compat redirects |

**New test modules:** `0`

**Modified existing test modules:** `3`

| File | What changes |
|------|--------------|
| `web/src/components/agchain/AgchainLeftNav.test.tsx` | Lock the new menu order and preserved existing shell nouns |
| `web/src/pages/agchain/AgchainOverviewPage.test.tsx` | Lock the surfaced live-capability links and messaging |
| `web/src/pages/agchain/AgchainSettingsPage.test.tsx` | Lock the preserved benchmark-definition access semantics |

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The current `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Observability`, and `Settings` left-rail nouns remain mounted in this batch. They are not deleted or renamed away.
2. The AGChain project/evaluation registry remains benchmark-backed in this batch. `agchain_benchmarks` stays the system of record for the focused AGChain project seam.
3. `Projects` must become an explicit top-level AGChain menu entry because it is already a real backend-backed route.
4. `Models` must become an explicit top-level AGChain menu entry because it is already a real backend-backed route.
5. `Benchmark Definition` must become an explicit top-level AGChain menu entry or alias because it is already a real backend-backed workbench and should not remain discoverable only through `Settings`.
6. The benchmark-definition workbench keeps its existing secondary-rail child taxonomy (`Steps`, `Questions`, `Context`, `State`, `Scoring`, `Models`, `Runner`, `Validation`, `Runs`) in this batch.
7. The existing backend routes, tables, and OTel route instrumentation are reused as-is; no new AGChain platform API or database work is allowed in this batch.
8. Placeholder shells for `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, and `Observability` remain visible, but they must stop visually eclipsing the real AGChain-backed surfaces that already exist.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. The AGChain left rail contains explicit entries for `Projects`, `Models`, and `Benchmark Definition`.
2. The existing `Overview` through `Settings` menu nouns still remain visible after those additions.
3. Clicking `Projects` opens the current AGChain project/evaluation registry at `/app/agchain/projects`.
4. Clicking `Models` opens the current model-registry page at `/app/agchain/models`.
5. Clicking `Benchmark Definition` opens the existing benchmark-definition workbench without removing the current settings-path access route.
6. The benchmark-definition page still shows the current secondary rail and uses the existing benchmark-step backend endpoints.
7. The Overview page explicitly identifies `Projects`, `Models`, and `Benchmark Definition` as the currently live backend-backed AGChain surfaces.
8. No backend files, migrations, or edge functions change.

### Locked Platform API Surface

#### New platform API endpoints: `0`

#### Existing platform API endpoints modified: `0`

#### Existing platform API endpoints reused as-is: `14`

1. `GET /agchain/benchmarks`
2. `POST /agchain/benchmarks`
3. `GET /agchain/benchmarks/{benchmark_slug}`
4. `GET /agchain/benchmarks/{benchmark_slug}/steps`
5. `POST /agchain/benchmarks/{benchmark_slug}/steps`
6. `PATCH /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}`
7. `DELETE /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}`
8. `POST /agchain/benchmarks/{benchmark_slug}/steps/reorder`
9. `GET /agchain/models/providers`
10. `GET /agchain/models`
11. `GET /agchain/models/{model_target_id}`
12. `POST /agchain/models`
13. `PATCH /agchain/models/{model_target_id}`
14. `POST /agchain/models/{model_target_id}/refresh-health`

### Locked Observability Surface

#### New traces: `0`

#### New metrics: `0`

#### New structured logs: `0`

Existing AGChain route observability reused as-is:

- `agchain.benchmarks.*` trace family and matching counters/histograms
- `agchain.models.*` trace family and matching counters/histograms
- existing `agchain.benchmarks.*` and `agchain.models.*` structured logs

### Locked Inventory Counts

#### Database

- New migrations: `0`
- Modified existing migrations: `0`

#### Backend

- New platform API route files: `0`
- Modified platform API route files: `0`
- New domain files: `0`
- Modified domain files: `0`

#### Frontend

- New top-level pages/routes: `0`
- Modified existing pages: `2`
- Modified existing components/layout files: `1`
- Modified router/support files: `1`
- New hooks/libs: `0`

#### Tests

- New test modules: `0`
- Modified existing test modules: `3`

### Locked File Inventory

#### Modified files

- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/router.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/components/agchain/AgchainLeftNav.test.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.test.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.test.tsx`

#### No-change files explicitly preserved

- `services/platform-api/app/api/routes/agchain_benchmarks.py`
- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/domain/agchain/benchmark_registry.py`
- `services/platform-api/app/domain/agchain/model_registry.py`
- `supabase/migrations/20260326170000_agchain_model_targets.sql`
- `supabase/migrations/20260326234500_agchain_benchmark_registry.sql`
- `supabase/migrations/20260328113000_agchain_benchmark_step_reorder_atomic_rpc.sql`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`

## Frozen Menu/Backend Exposure Contract

This batch is not allowed to solve the shell honesty problem by inventing new placeholder backend semantics.

Do not implement this by:

- creating fake dataset, prompt, scorer, parameter, tool, or observability APIs just to justify the current shell,
- deleting existing placeholder shell nouns to hide the mismatch,
- moving the benchmark-definition workbench out of AGChain’s current routing seam in a way that breaks the existing compat redirects,
- replacing the benchmark-backed project seam with a new system of record.

This batch must instead expose the backend-backed truth that already exists.

## Explicit Risks Accepted In This Plan

1. `Projects` remain benchmark-backed in this phase even though the long-term AGChain shell language speaks in terms of projects and evaluations rather than pure benchmark objects.
2. `Parameters`, `Scorers`, and `Observability` still remain partially misleading after this batch because their deeper backend seams are not yet implemented; this plan only reduces the damage by making real surfaces explicit.
3. `Benchmark Definition` remains accessible through both a new top-level route alias and the existing settings path, so temporary route duplication is accepted for discoverability.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked frontend file inventory in this plan matches the actual implementation.
2. No backend, migration, or edge-function file changed.
3. The AGChain shell visibly exposes the current real backend-backed surfaces without removing the current placeholder shell nouns.
4. A user can discover the AGChain project registry, model registry, and benchmark-definition workbench directly from the left rail without first navigating through placeholder partitions.

## Task 1: Lock the top-level menu inventory

**File(s):** `web/src/components/agchain/AgchainLeftNav.tsx`

**Step 1:** Add new explicit top-level left-rail entries for `Projects`, `Models`, and `Benchmark Definition`.
**Step 2:** Place those entries above the existing `Overview` through `Settings` shell nouns.
**Step 3:** Preserve every current `Overview` through `Settings` entry so none of the current shell nouns disappear.

**Test command:** `cd web && npm run test -- AgchainLeftNav`
**Expected output:** Vitest passes for the left-nav suite with assertions updated for the preserved shell nouns plus the newly exposed backend-backed entries.

**Commit:** `feat: expose agchain backed surfaces in left rail`

## Task 2: Add the benchmark-definition top-level route alias

**File(s):** `web/src/router.tsx`

**Step 1:** Add a top-level AGChain route alias for benchmark definition.
**Step 2:** Point that alias at the existing benchmark-definition workbench instead of creating a duplicate page.
**Step 3:** Preserve the existing settings-path route and compat benchmark redirect behavior.

**Test command:** `cd web && npm run test -- AgchainBenchmarkWorkbenchPage`
**Expected output:** Vitest passes with the benchmark workbench still resolving through the preserved compat path while the new top-level alias is mounted.

**Commit:** `feat: add agchain benchmark definition alias route`

## Task 3: Make Overview honest about what is live today

**File(s):** `web/src/pages/agchain/AgchainOverviewPage.tsx`

**Step 1:** Add an explicit “live AGChain surfaces” section or equivalent UI block to Overview.
**Step 2:** Link that section to the real backend-backed routes: `Projects`, `Models`, and `Benchmark Definition`.
**Step 3:** Keep the existing overview cards in place while making the backed-versus-planned distinction visible.

**Test command:** `cd web && npm run test -- AgchainOverviewPage`
**Expected output:** Vitest passes with new assertions proving that Overview now exposes the live backend-backed routes.

**Commit:** `feat: disclose agchain live surfaces in overview`

## Task 4: Preserve settings while removing its benchmark-definition monopoly

**File(s):** `web/src/pages/agchain/AgchainSettingsPage.tsx`

**Step 1:** Update Settings copy so it no longer implies benchmark definition is only discoverable through Settings.
**Step 2:** Preserve the `Project`, `Organization`, and `Personal` partitions.
**Step 3:** Keep the benchmark-definition CTA intact as a secondary access path.

**Test command:** `cd web && npm run test -- AgchainSettingsPage`
**Expected output:** Vitest passes with the settings page still exposing the same partitions while acknowledging the top-level benchmark-definition path.

**Commit:** `chore: align agchain settings copy with backed surface exposure`

## Task 5: Update tests to lock the preservation seam

**File(s):** `web/src/components/agchain/AgchainLeftNav.test.tsx`, `web/src/pages/agchain/AgchainOverviewPage.test.tsx`, `web/src/pages/agchain/AgchainSettingsPage.test.tsx`

**Step 1:** Update nav tests to prove that the new backend-backed entries exist and the old shell nouns remain.
**Step 2:** Update overview tests to prove the real surfaced routes are visible.
**Step 3:** Update settings tests to prove the settings partitions remain intact and benchmark definition remains accessible there.

**Test command:** `cd web && npm run test -- AgchainLeftNav AgchainOverviewPage AgchainSettingsPage`
**Expected output:** All affected Vitest suites pass with the new preservation and exposure expectations locked.

**Commit:** `test: lock agchain backend surface menu alignment`
