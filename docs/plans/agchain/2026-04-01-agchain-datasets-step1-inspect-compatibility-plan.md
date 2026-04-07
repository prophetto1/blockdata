# AGChain Datasets Step 1: Inspect-Aligned Dataset Surface Implementation Plan

**Goal:** Complete the AGChain Datasets first-level menu as a fully functional, Inspect-aligned surface. A user can navigate to Datasets, see a live registry, create a dataset from CSV/JSON/JSONL/HuggingFace, preview before committing, inspect dataset details with samples/versions/validation tabs, draft a new version, and commit it. The runtime compatibility target is Inspect-native sample semantics (`input`, `messages`, `choices`, `target`, `id`, `metadata`, `sandbox`, `files`, `setup`). The authoring surface is AGChain's own structured UI — not a literal reproduction of Inspect's Python API.

**Architecture:** The backend is route-complete and tested — 17 dataset API routes + 1 shared operations route, the materializer seam, draft lifecycle, and 202 async handling are implemented with 31 passing tests. Inspect semantic parity review remains applicable (see Locked AGChain-to-Inspect Mapping Boundary below). This plan completes the frontend surface and closes minor backend gaps. The umbrella architecture reference remains [2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md](/docs/plans/2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md). This plan is a self-contained derivative scoped exclusively to the Datasets menu.

**Tech Stack:** React + TypeScript, existing `platformApiFetch`, `AgchainPageFrame`, `useAgchainProjectFocus`, `ScrollArea`, `Badge`, `Button` UI primitives, Vitest, existing Supabase Postgres migration.

**Status:** Revised — addressed evaluation findings (phantom import removed, route attribution corrected, browse-only scope clarified, polling bounds added, wizard back-nav specified)  
**Author:** Claude  
**Date:** 2026-04-01  
**Derived from:** [2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md](/docs/plans/2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md) (umbrella architecture reference)

## Relationship to Umbrella Plan

The umbrella plan covers the full AGChain Phase 1 surface across 15 tasks and 7 first-level menus. Execution has been split by menu. This plan covers Datasets only — umbrella Tasks 5 (backend, done) and 11 (frontend, this plan). The umbrella plan remains the architecture authority for locked API contracts, persistence schema, and observability rules. This plan restates the dataset-specific subset as a self-contained locked contract.

## Source Verification Ledger

### Backend: route-complete and tested

The backend routes, draft lifecycle, materializer, and 202 async handling are implemented and passing tests. This does not claim full Inspect semantic parity — see "Locked AGChain-to-Inspect Mapping Boundary" for known deviations between AGChain's sample representation and Inspect's exact types.

| Area | Evidence |
|------|----------|
| 17 dataset API routes + 1 shared operations route | `services/platform-api/app/api/routes/agchain_datasets.py` (547 lines, 17 routes) + `services/platform-api/app/api/routes/agchain_operations.py` (shared poll route) |
| Route mounting | `services/platform-api/app/main.py` lines 196-198 |
| Materializer (CSV, JSON, JSONL, HuggingFace) | `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py` (382 lines) |
| Dataset registry domain | `services/platform-api/app/domain/agchain/dataset_registry.py` |
| Draft lifecycle (create/get/update/preview/commit) | Verified in evaluation — idempotent commit, expiry, dirty state |
| 202 async through durable operations | Threshold-based, 5 operation modes registered |
| Backend tests | `pytest -q tests/test_agchain_datasets.py` → 31 passed |
| Migration SQL (5 tables) | `supabase/migrations/20260331141000_agchain_inspect_dataset_registry.sql` (169 lines) |
| TypeScript types (25+ types) | `web/src/lib/agchainDatasets.ts` (291 lines) |
| Router entry | `web/src/router.tsx` line 312 — flat leaf at `datasets` |
| Placeholder page | `web/src/pages/agchain/AgchainDatasetsPage.tsx` (15 lines, `AgchainSectionPage` wrapper) |
| Operations status type | `AgchainOperationStatus` in `web/src/lib/agchainRuns.ts` |

### Verified as not yet created

| Area | Status |
|------|--------|
| Fetch functions in agchainDatasets.ts | Types only, no `platformApiFetch` calls |
| `useAgchainDatasets` hook | Does not exist |
| `useAgchainDatasetDetail` hook | Does not exist |
| `useAgchainDatasetDraft` hook | Does not exist |
| `web/src/components/agchain/datasets/` directory | Does not exist |
| Dataset sub-routes (create, detail, draft) | Not in router.tsx |
| Frontend tests for dataset pages | Do not exist |

### Backend minor gaps (from compliance evaluation)

| Gap | Severity |
|-----|----------|
| Missing `agchain.inspect.dataset.validation.project` internal span on `project_dataset_validation` | Minor observability |

## Scope Boundary

### Explicitly in scope

- Dataset service functions (fetch wrappers for all 18 routes)
- Three frontend hooks (datasets list, dataset detail, dataset draft)
- Ten frontend components (toolbar, table, wizard, field mapping editor, preview table, validation panel, version switcher, samples table, sample drawer, versions table)
- Four frontend pages (registry, create, detail, version-draft)
- Router sub-routes for dataset pages
- Frontend tests for all four pages
- Backend minor cleanup (missing span)
- Dataset-specific observability verification

### Explicitly out of scope

- Scorer registry (separate menu, separate plan)
- Tool registry (separate menu, separate plan)
- Sandbox registry (separate menu, separate plan)
- Benchmark authoring (separate menu — benchmarks reference datasets by UUID FK, no dataset-side work required)
- Run launch (separate menu, separate plan)
- Results/log projection (separate menu, separate plan)
- `shuffle_choices` target-remapping verification and any Step 1 UI exposure of choice shuffling
- Migration `20260331143000_agchain_inspect_component_registries.sql` (belongs to scorer/tool/sandbox plans)
- Migration `20260331145000_agchain_inspect_runs_logs_operations.sql` (belongs to runs plan)
- Operations routes (already landed as prerequisite substrate, not dataset-scoped)

### Allowed dependencies (already landed, not new work)

- Workspace/auth substrate (`useAgchainProjectFocus`, `require_project_access`)
- Durable operations substrate (`agchain_operations` table, worker, `AgchainOperationStatus` type)
- `AgchainPageFrame` layout wrapper
- `platformApiFetch` from `@/lib/platformApi`
- UI primitives: `Badge`, `Button`, `ScrollArea`, `cn`, `Sheet`/`SheetContent` from `@/components/ui/`

## Locked AGChain-to-Inspect Mapping Boundary

AGChain uses a structured mapping editor and source-config UI as its authoring layer. Inspect dataset semantics remain the runtime compatibility target. "Inspect-aligned" in this plan means preservation of the Inspect sample field set and loader behavior for the supported source subset, not literal one-to-one reproduction of Inspect's Python API or FieldSpec dataclass.

### How AGChain's mapping layer differs from Inspect's FieldSpec

Inspect's `FieldSpec` is a Python `@dataclass` where each field is a **column name string** — e.g., `FieldSpec(input="question")` means "read the `question` column as `input`." Inspect also supports a `RecordToSample` callable for arbitrary custom mapping logic.

AGChain's `field_spec_jsonb` stores **objects with JSON path expressions** — e.g., `{"input": {"path": "$.prompt"}}`. This is an AGChain authoring abstraction that supports nested path traversal, not a literal Inspect FieldSpec UI. The AGChain materializer resolves these paths at preview/materialization time and produces canonical sample records that match Inspect's field set.

This is a deliberate design choice: AGChain's path-based mapping is more expressive for nested source formats than Inspect's flat column-name mapping. The trade-off is that AGChain's mapping layer is not interchangeable with Inspect's `FieldSpec` dataclass.

### Known Inspect semantic deviations in AGChain's sample representation

| Field | Inspect type | AGChain representation | Deviation |
|-------|-------------|----------------------|-----------|
| `input` | `str \| list[ChatMessage]` | Stored as arbitrary JSON — string or message list accepted | AGChain does not enforce the `ChatMessage` schema; it preserves whatever structure was loaded |
| `choices` | `list[str] \| None` | Stored as JSON list | Functionally equivalent |
| `target` | `str \| list[str]` | Stored as arbitrary JSON | AGChain does not enforce the `str \| list[str]` constraint |
| `files` | `dict[str, str] \| None` — keys are destination paths, values are source/content | Stored as JSON **list** (materializer coerces non-list to list at line 189-190) | **Structural deviation.** Inspect uses a dict mapping destination path → source. AGChain stores an array of file objects. |
| `setup` | `str \| None` — a shell script string | Stored as arbitrary JSON (TypeScript type: `JsonObject \| null`) | **Type deviation.** Inspect expects a plain string. AGChain stores an object. |
| `sandbox` | `SandboxEnvironmentSpec \| None` — resolves `(type, config_file?)` | Stored as arbitrary JSON dict | AGChain does not enforce the `(type, config_file)` structure |
| `metadata` | `dict[str, Any] \| None` | Stored as JSON dict | Functionally equivalent |
| `id` | `int \| str \| None` | Stored as string | Narrower — Inspect allows int, AGChain stores as string |

These deviations mean AGChain datasets are not byte-for-byte Inspect `Sample` objects. They are AGChain records that carry the same field set and can be translated to Inspect Samples at runtime (when a run bridges AGChain datasets into an Inspect Task). The translation layer is out of scope for this plan — it belongs to the run-launch plan.

### Unsupported or deferred Inspect capabilities

This plan does not claim full Inspect dataset parity. The following are explicitly deferred:

| Capability | Inspect feature | Status in this plan |
|------------|----------------|---------------------|
| `file_dataset` dispatcher | Auto-routes `.csv`/`.json`/`.jsonl` by extension | Not surfaced — AGChain requires explicit source type selection |
| `example_dataset` | Loads from bundled `_examples/` directory | Not applicable — AGChain has no bundled examples |
| Typed metadata model | `metadata: Type[BaseModel]` with Pydantic frozen config | Not surfaced — AGChain stores metadata as untyped JSON dict |
| `RecordToSample` callable | Custom Python function for arbitrary mapping | Not surfaced — AGChain uses declarative JSONPath mapping only |
| `fs_options` | S3 filesystem options for cloud-hosted sources | Not surfaced — AGChain's source loading does not pass fs_options |
| `fieldnames` | Headerless CSV column name override | Not surfaced in UI — AGChain supports `headers: false` but not custom fieldnames |
| `reader_kwargs` | Arbitrary kwargs passed to CSV/JSON readers | Not surfaced |
| Relative file resolution | `resolve_sample_files()` resolves paths relative to dataset location | Not implemented — AGChain stores file references as-is |
| `shuffle_choices` target remapping | Inspect remaps `target` letter when choices are shuffled | Deferred from this plan — Step 1 must keep `shuffle_choices` fixed to `false` and not expose it in the UI until remapping is verified |

## Supported Inspect Subset

### Source types supported in Step 1

| Source type | Inspect equivalent | AGChain loader | Parity notes |
|-------------|-------------------|----------------|--------------|
| CSV | `csv_dataset` | `_load_source_records(source_type="csv")` | Supports delimiter, headers, encoding. Does not support `fs_options`, `fieldnames`, `reader_kwargs`. |
| JSON | `json_dataset` | `_load_source_records(source_type="json")` | Supports array-of-objects and path hints for nested objects. |
| JSONL | `json_dataset` (JSONL mode) | `_load_source_records(source_type="jsonl")` | Line-by-line JSON parsing. |
| HuggingFace | `hf_dataset` | `_load_source_records(source_type="huggingface")` | Supports path, split, name, data_dir, revision, trust, extra_kwargs. |

### Sample fields preserved in Step 1

All 9 Inspect-native sample fields are carried through the AGChain materializer: `input`, `messages`, `choices`, `target`, `id`, `metadata`, `sandbox`, `files`, `setup`. See the deviation table above for type differences.

### Materialization options surfaced in Step 1

`shuffle`, `limit`, `auto_id`, `deterministic_seed`

The payload field `shuffle_choices` remains present in the backend contract but is fixed to `false` in this plan and is not surfaced in the Step 1 UI.

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any locked item below needs to change, implementation must stop and this plan must be revised first.

## Locked Product Decisions

1. The Datasets menu is project-scoped. Every dataset API call requires a `project_id` obtained from `useAgchainProjectFocus`. If no project is focused, the page shows a project-selection prompt (existing pattern in `AgchainSectionPage`).
2. The Datasets registry page replaces the current placeholder. It uses `AgchainPageFrame`, not `AgchainSectionPage`.
3. Dataset creation uses a multi-step wizard (source config → field mapping → preview → name and submit), not a single form.
4. Dataset detail is a workspace-style page with tabs: Samples, Versions, Source, Mapping, Validation.
5. Version drafting is a separate page navigated from the detail page's "New Version" action.
6. 202 async operations show inline polling status using the existing `AgchainOperationStatus` pattern. No new operation UI component is created — use the status type's `poll_url` and poll until terminal status.
7. Step 1 does not expose `shuffle_choices` in the create or draft UI. Requests sent by this plan keep `materialization_options_jsonb.shuffle_choices` fixed to `false`.
8. The frontend consumes the 17 dataset backend routes + 1 shared operations route exactly as implemented. No backend route changes.
9. Step 1 datasets are for authoring and browsing only. Running a dataset through the evaluation pipeline requires an AGChain-to-Inspect translation layer for `files` (JSON list → `dict[str,str]`) and `setup` (JSON object → `str`) that belongs to the run-launch plan, not this plan.

## Locked Platform API Surface

### Backend routes consumed by this plan (all existing, no changes)

| # | Verb | Path | Frontend caller |
|---|------|------|-----------------|
| 1 | GET | `/agchain/datasets` | Registry page |
| 2 | GET | `/agchain/datasets/new/bootstrap` | Create page |
| 3 | POST | `/agchain/datasets/new/preview` | Create page |
| 4 | POST | `/agchain/datasets` | Create page |
| 5 | GET | `/agchain/datasets/{dataset_id}/detail` | Detail page |
| 6 | GET | `/agchain/datasets/{dataset_id}/versions` | Detail page, versions tab |
| 7 | GET | `/agchain/datasets/{dataset_id}/versions/{id}/source` | Detail page, source tab |
| 8 | GET | `/agchain/datasets/{dataset_id}/versions/{id}/mapping` | Detail page, mapping tab |
| 9 | GET | `/agchain/datasets/{dataset_id}/versions/{id}/validation` | Detail page, validation tab |
| 10 | POST | `/agchain/datasets/{dataset_id}/versions/{id}/preview` | Detail page, rerun preview |
| 11 | GET | `/agchain/datasets/{dataset_id}/versions/{id}/samples` | Detail page, samples tab |
| 12 | GET | `/agchain/datasets/{dataset_id}/versions/{id}/samples/{sample_id}` | Detail page, sample drawer |
| 13 | POST | `/agchain/datasets/{dataset_id}/version-drafts` | Draft page, create |
| 14 | GET | `/agchain/datasets/{dataset_id}/version-drafts/{draft_id}` | Draft page, load |
| 15 | PATCH | `/agchain/datasets/{dataset_id}/version-drafts/{draft_id}` | Draft page, save |
| 16 | POST | `/agchain/datasets/{dataset_id}/version-drafts/{draft_id}/preview` | Draft page, preview |
| 17 | POST | `/agchain/datasets/{dataset_id}/version-drafts/{draft_id}/commit` | Draft page, commit |
| 18 | GET | `/agchain/operations/{operation_id}` | 202 polling (shared, not dataset-specific) |

New platform API endpoints: `0`  
Modified platform API endpoints: `0`

## Locked Observability Surface

### Existing route-level spans (verified present, no changes needed)

All 17 dataset route spans are already implemented in `agchain_datasets.py`:

`agchain.datasets.list`, `agchain.datasets.new.bootstrap`, `agchain.datasets.new.preview`, `agchain.datasets.create`, `agchain.datasets.detail.get`, `agchain.datasets.versions.list`, `agchain.datasets.versions.source.get`, `agchain.datasets.versions.mapping.get`, `agchain.datasets.versions.validation.get`, `agchain.datasets.versions.preview`, `agchain.datasets.version_drafts.create`, `agchain.datasets.version_drafts.get`, `agchain.datasets.version_drafts.update`, `agchain.datasets.version_drafts.preview`, `agchain.datasets.version_drafts.commit`, `agchain.datasets.samples.list`, `agchain.datasets.samples.get`

### Existing internal spans (verified present, no changes needed)

`agchain.inspect.dataset.preview`, `agchain.inspect.dataset.draft.create`, `agchain.inspect.dataset.draft.update`, `agchain.inspect.dataset.draft.preview`

### Missing internal span (to be added in Task 1)

`agchain.inspect.dataset.validation.project` — must wrap `project_dataset_validation` in `inspect_dataset_materializer.py`

### Existing counters (verified present)

`agchain.datasets.preview.requests`, `agchain.datasets.drafts.created`, `agchain.datasets.drafts.committed`, `agchain.datasets.draft_preview.requests`, `agchain.datasets.validation.reruns`

### Existing histograms (verified present)

`agchain.datasets.preview.duration_ms`, `agchain.datasets.draft_preview.duration_ms`, `agchain.datasets.detail.duration_ms`, `agchain.datasets.validation.duration_ms`, `agchain.datasets.materialization.duration_ms`

### Forbidden attributes (restated from umbrella)

No raw `user_id`, `email`, `dataset_id`, `project_id` in trace or metric attributes. Use boolean presence flags (`project_id_present: true`) instead. No raw sample payloads, file contents, or source URIs in observability attributes.

### Verification contract for this plan

1. `services/platform-api/tests/test_agchain_datasets.py` continues to prove the route-level telemetry hygiene already present on dataset endpoints: presence flags instead of raw IDs.
2. Task 1 adds one targeted backend test proving `agchain.inspect.dataset.validation.project` is started during preview/materialization.
3. Completion proof for dataset counters and histograms in this plan is source verification in `agchain_datasets.py` plus the passing dataset backend suite. No deployed-environment telemetry artifact is required for this plan because it adds no new route-level instrumentation surface.

## Database Migrations

New migrations: `0`  
Modified migrations: `0`

The migration `20260331141000_agchain_inspect_dataset_registry.sql` already exists (169 lines, 5 tables). No database work in this plan.

## Edge Functions

No edge functions created or modified. Datasets stay entirely in `platform-api`.

## Locked Frontend Surface Area

### New pages: `3`

| Page | File | Backed by |
|------|------|-----------|
| `AgchainDatasetCreatePage` | `web/src/pages/agchain/AgchainDatasetCreatePage.tsx` | bootstrap, preview, create routes |
| `AgchainDatasetDetailPage` | `web/src/pages/agchain/AgchainDatasetDetailPage.tsx` | detail, versions, source, mapping, validation, samples routes |
| `AgchainDatasetVersionDraftPage` | `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx` | draft create/get/update/preview/commit routes |

### Modified pages: `1`

| Page | File | What changes |
|------|------|--------------|
| `AgchainDatasetsPage` | `web/src/pages/agchain/AgchainDatasetsPage.tsx` | Replace placeholder with live registry table, toolbar, and navigation |

### New components: `10`

| Component | File |
|-----------|------|
| `AgchainDatasetsToolbar` | `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx` |
| `AgchainDatasetsTable` | `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx` |
| `AgchainDatasetWizard` | `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx` |
| `AgchainDatasetFieldMappingEditor` | `web/src/components/agchain/datasets/AgchainDatasetFieldMappingEditor.tsx` |
| `AgchainDatasetPreviewTable` | `web/src/components/agchain/datasets/AgchainDatasetPreviewTable.tsx` |
| `AgchainDatasetValidationPanel` | `web/src/components/agchain/datasets/AgchainDatasetValidationPanel.tsx` |
| `AgchainDatasetVersionSwitcher` | `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx` |
| `AgchainDatasetSamplesTable` | `web/src/components/agchain/datasets/AgchainDatasetSamplesTable.tsx` |
| `AgchainDatasetSampleDrawer` | `web/src/components/agchain/datasets/AgchainDatasetSampleDrawer.tsx` |
| `AgchainDatasetVersionsTable` | `web/src/components/agchain/datasets/AgchainDatasetVersionsTable.tsx` |

### New hooks: `3`

| Hook | File |
|------|------|
| `useAgchainDatasets` | `web/src/hooks/agchain/useAgchainDatasets.ts` |
| `useAgchainDatasetDetail` | `web/src/hooks/agchain/useAgchainDatasetDetail.ts` |
| `useAgchainDatasetDraft` | `web/src/hooks/agchain/useAgchainDatasetDraft.ts` |

### Modified service modules: `1`

| Module | File | What changes |
|--------|------|--------------|
| `agchainDatasets` | `web/src/lib/agchainDatasets.ts` | Add fetch functions for all 18 routes (types already exist) |

### Modified routing: `1`

| File | What changes |
|------|--------------|
| `web/src/router.tsx` | Replace flat `datasets` leaf with nested routes: index, `new`, `:datasetId`, `:datasetId/versions/new/:draftId` |

## Locked Inventory Counts

### Backend

- New backend files: `0`
- Modified backend files: `1` (inspect_dataset_materializer.py span)

### Frontend

- New pages: `3`
- Modified pages: `1`
- New components: `10`
- New hooks: `3`
- Modified service modules: `1`
- Modified routing files: `1`

### Tests

- New frontend test files: `4`
- Modified backend test files: `1`

## Locked File Inventory

### New files

- `web/src/pages/agchain/AgchainDatasetCreatePage.tsx`
- `web/src/pages/agchain/AgchainDatasetDetailPage.tsx`
- `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetFieldMappingEditor.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetPreviewTable.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetValidationPanel.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetSamplesTable.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetSampleDrawer.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetVersionsTable.tsx`
- `web/src/hooks/agchain/useAgchainDatasets.ts`
- `web/src/hooks/agchain/useAgchainDatasetDetail.ts`
- `web/src/hooks/agchain/useAgchainDatasetDraft.ts`
- `web/src/pages/agchain/AgchainDatasetsPage.test.tsx`
- `web/src/pages/agchain/AgchainDatasetCreatePage.test.tsx`
- `web/src/pages/agchain/AgchainDatasetDetailPage.test.tsx`
- `web/src/pages/agchain/AgchainDatasetVersionDraftPage.test.tsx`

### Modified files

- `web/src/pages/agchain/AgchainDatasetsPage.tsx` (replace placeholder)
- `web/src/lib/agchainDatasets.ts` (add fetch functions)
- `web/src/router.tsx` (add dataset sub-routes)
- `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py` (add missing span)
- `services/platform-api/tests/test_agchain_datasets.py` (extend observability proof for the new internal span)

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. The placeholder Datasets page is replaced by a live registry table showing datasets for the focused project.
2. A user can navigate to "Add Dataset" and complete a multi-step wizard: select source type, configure source, map Inspect fields (`input`, `messages`, `choices`, `target`, `id`, `metadata`, `sandbox`, `files`, `setup`), preview samples with validation warnings, name and commit.
3. A user can click a dataset in the registry, see the detail workspace with tabs for Samples (filterable grid), Versions (history table), Source (config snapshot), Mapping (field spec), and Validation (issue groups with counts).
4. A user can select a different version from the version switcher and see the detail page update to reflect that version's data.
5. A user can initiate "New Version" from the detail page, enter the draft page, modify source config or field mapping, preview changes with a diff summary, and commit the draft as a new immutable version.
6. When a preview or commit exceeds the synchronous threshold, the UI shows the 202 operation status and polls until completion.
7. Backend tests prove that dataset route telemetry continues to use presence flags rather than raw IDs and that `agchain.inspect.dataset.validation.project` is started during preview/materialization.
8. Backend tests pass: `cd services/platform-api && pytest -q tests/test_agchain_datasets.py` → 32 passed.
9. Frontend tests pass for all four dataset page test files.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked file inventory matches the actual set of created and modified files.
2. The locked inventory counts match reality.
3. The locked acceptance contract passes end-to-end.
4. No dataset page uses `AgchainSectionPage` (placeholder wrapper) — all use `AgchainPageFrame`.
5. All fetch functions in `agchainDatasets.ts` use `platformApiFetch` and `parseJsonResponse` following the established convention from `agchainBenchmarks.ts`.
6. All hooks follow the established pattern: `useState` + `useCallback` + `useMemo` + `useEffect`, flat return object, separate loading flags per concern.
7. All tables use HTML `<table>` inside `ScrollArea` with `Badge` for status indicators.
8. The missing `validation.project` span is added in `inspect_dataset_materializer.py`, and backend tests cover the new span plus the existing presence-flag telemetry rules.
9. No Step 1 create or draft surface exposes `shuffle_choices`, and requests sent by this plan keep it fixed to `false`.

## Explicit Risks Accepted In This Plan

1. The 202 operation polling uses a simple `setInterval` + `fetch` pattern (3 s interval, 60-attempt ceiling) rather than a reusable polling hook. A shared `useOperationPolling` hook may be extracted in a future plan when runs and other menus also need it.
2. The field mapping editor is a structured form (text inputs for AGChain JSON path expressions per sample field), not a visual drag-and-drop mapper. A richer editor may be built in Phase 2.
3. Hugging Face dataset loading requires the `datasets` Python package on the server. The frontend source config form includes HuggingFace fields, but runtime loading depends on the server environment.
4. AGChain stores `files` as a JSON list and `setup` as a JSON object, which deviates from Inspect's `dict[str,str]` and `str` types respectively. A translation layer will be needed when bridging AGChain datasets into Inspect Tasks at run launch time. That translation belongs to the run-launch plan, not this plan.
5. `shuffle_choices` is explicitly deferred from Step 1. The create and draft UI do not expose it, and requests in this plan keep it `false` until Inspect-style target remapping is verified in a later compatibility pass.

---

## Implementation Tasks

### Task 1: Missing observability span and backend proof

**File(s):** `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py`, `services/platform-api/tests/test_agchain_datasets.py`

**Step 1:** In `inspect_dataset_materializer.py`, wrap the `project_dataset_validation` function body with `with tracer.start_as_current_span("agchain.inspect.dataset.validation.project"):`.
**Step 2:** Extend `services/platform-api/tests/test_agchain_datasets.py` with one targeted test that proves `agchain.inspect.dataset.validation.project` is started during dataset preview/materialization.
**Step 3:** Run tests.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_datasets.py`
**Expected output:** 32 passed

**Commit:** `fix(platform-api): add missing validation span`

### Task 2: Add fetch functions to agchainDatasets.ts

**File(s):** `web/src/lib/agchainDatasets.ts`

**Step 1:** Add `import { platformApiFetch } from '@/lib/platformApi'` and local `parseJsonResponse<T>()` and `trimToNull()` helpers following the `agchainBenchmarks.ts` pattern.
**Step 2:** Add fetch functions for all 18 dataset routes:
- `listDatasets(projectId, params)` → `AgchainDatasetListResponse`
- `getDatasetBootstrap(projectId?)` → `AgchainDatasetBootstrapResponse`
- `previewNewDataset(body)` → `AgchainDatasetPreviewResponse`
- `createDataset(body)` → `AgchainDatasetCreateResponse`
- `getDatasetDetail(datasetId, projectId, versionId?)` → `AgchainDatasetDetailResponse`
- `listDatasetVersions(datasetId, projectId, params)` → `AgchainDatasetVersionsResponse`
- `getDatasetVersionSource(datasetId, versionId)` → `AgchainDatasetSourceResponse`
- `getDatasetVersionMapping(datasetId, versionId)` → `AgchainDatasetMappingResponse`
- `getDatasetVersionValidation(datasetId, versionId)` → `AgchainDatasetVersionValidationResponse`
- `previewDatasetVersion(datasetId, versionId, body)` → `AgchainDatasetVersionPreviewResponse`
- `listDatasetSamples(datasetId, versionId, projectId, params)` → `AgchainDatasetSamplesResponse`
- `getDatasetSampleDetail(datasetId, versionId, sampleId)` → `AgchainDatasetSampleResponse`
- `createDatasetVersionDraft(datasetId, body)` → `AgchainDatasetDraftCreateResponse`
- `getDatasetVersionDraft(datasetId, draftId)` → `AgchainDatasetDraftResponse`
- `updateDatasetVersionDraft(datasetId, draftId, body)` → `AgchainDatasetDraftResponse`
- `previewDatasetVersionDraft(datasetId, draftId, body)` → `AgchainDatasetDraftPreviewResponse`
- `commitDatasetVersionDraft(datasetId, draftId, body)` → `AgchainDatasetDraftCommitResponse`
- `getOperationStatus(operationId)` → `AgchainOperationStatus` (import from agchainRuns)
**Step 3:** All functions use `encodeURIComponent()` for path params, `URLSearchParams` for query strings, `JSON.stringify()` for POST/PATCH bodies.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No type errors

**Commit:** `feat(web): add agchain dataset service functions`

### Task 3: Create useAgchainDatasets hook

**File(s):** `web/src/hooks/agchain/useAgchainDatasets.ts`

**Step 1:** Create the hook following the `useAgchainModels` pattern.
**Step 2:** State: `items: AgchainDatasetListRow[]`, `loading: boolean`, `error: string | null`, `nextCursor: string | null`.
**Step 3:** Actions: `loadDatasets(projectId, params?)` with cursor-based pagination, `refresh()`.
**Step 4:** Use `useAgchainProjectFocus()` to get `projectId`. Auto-load on mount and when `projectId` changes via `useEffect`.
**Step 5:** Return flat object: `{ items, loading, error, nextCursor, refresh }`.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No type errors

**Commit:** `feat(web): add useAgchainDatasets hook`

### Task 4: Create useAgchainDatasetDetail hook

**File(s):** `web/src/hooks/agchain/useAgchainDatasetDetail.ts`

**Step 1:** Create the hook. Accepts `datasetId: string` parameter.
**Step 2:** State: `detail: AgchainDatasetDetailResponse | null`, `versions: AgchainDatasetVersionSummary[]`, `source: AgchainDatasetSourceResponse | null`, `mapping: AgchainDatasetMappingResponse | null`, `validation: AgchainDatasetVersionValidationResponse | null`, `samples: AgchainDatasetSampleSummary[]`, `selectedSample: AgchainDatasetSampleDetail | null`, `loading: boolean`, `tabLoading: boolean`, `error: string | null`.
**Step 3:** Actions: `loadDetail(projectId, versionId?)`, `loadVersions(projectId)`, `loadSource(versionId)`, `loadMapping(versionId)`, `loadValidation(versionId)`, `loadSamples(versionId, params)`, `selectSample(sampleId)`, `rerunPreview(versionId)`, `selectVersion(versionId)`.
**Step 4:** `selectVersion` reloads source, mapping, validation, and samples for the newly selected version.
**Step 5:** Return flat object with all state + actions.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No type errors

**Commit:** `feat(web): add useAgchainDatasetDetail hook`

### Task 5: Create useAgchainDatasetDraft hook

**File(s):** `web/src/hooks/agchain/useAgchainDatasetDraft.ts`

**Step 1:** Create the hook. Accepts `datasetId: string`, `draftId: string | null` parameters.
**Step 2:** State: `draft: AgchainDatasetDraft | null`, `previewSamples: AgchainDatasetSampleSummary[]`, `previewValidation: AgchainDatasetValidationSummary | null`, `diffSummary: JsonObject | null`, `loading: boolean`, `previewing: boolean`, `committing: boolean`, `operationStatus: AgchainOperationStatus | null`, `error: string | null`.
**Step 3:** Actions: `createDraft(baseVersionId)` → returns `draftId`, `loadDraft()`, `updateDraft(payload)`, `previewDraft(payload)`, `commitDraft(message?)`.
**Step 4:** Preview and commit handle 202 responses: detect `operation_id` in response, set `operationStatus`, start polling via `setInterval` (3 s interval, 60-attempt max) on `getOperationStatus(operationId)`, clear interval on terminal status or when max attempts is reached (set error on timeout).
**Step 5:** Return flat object with all state + actions.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No type errors

**Commit:** `feat(web): add useAgchainDatasetDraft hook`

### Task 6: Build dataset registry page and router integration

**File(s):** `web/src/pages/agchain/AgchainDatasetsPage.tsx`, `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx`, `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx`, `web/src/router.tsx`, `web/src/pages/agchain/AgchainDatasetsPage.test.tsx`

**Step 1:** Write `AgchainDatasetsPage.test.tsx` — test that the page renders a table with dataset rows, that search filtering works, that "Add Dataset" navigates to the create page, and that clicking a row navigates to the detail page.
**Step 2:** Create `AgchainDatasetsToolbar.tsx` — search input, source type filter dropdown, validation status filter, "Add Dataset" button linking to `/app/agchain/datasets/new`.
**Step 3:** Create `AgchainDatasetsTable.tsx` — HTML `<table>` inside `ScrollArea`. Columns: Name (with slug subtitle), Source Type (`Badge`), Version, Samples, Validation (`Badge` with pass/warn/fail variant), Updated. Row click navigates to `/app/agchain/datasets/:datasetId`. Three-state rendering: loading skeleton, empty "No datasets yet", data rows.
**Step 4:** Rewrite `AgchainDatasetsPage.tsx` — replace `AgchainSectionPage` with `AgchainPageFrame`. Use `useAgchainDatasets()`. Render hero section, toolbar, table. Project-focus gating via `useAgchainProjectFocus` — if no project, show selection prompt.
**Step 5:** Update `router.tsx` — replace flat `datasets` leaf with nested route structure:
```
datasets/
  index → AgchainDatasetsPage
  new → AgchainDatasetCreatePage
  :datasetId → AgchainDatasetDetailPage
  :datasetId/versions/new/:draftId → AgchainDatasetVersionDraftPage
```
**Step 6:** Run tests.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainDatasetsPage.test.tsx`
**Expected output:** Tests pass

**Commit:** `feat(web): build agchain dataset registry page`

### Task 7: Build dataset create page

**File(s):** `web/src/pages/agchain/AgchainDatasetCreatePage.tsx`, `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx`, `web/src/components/agchain/datasets/AgchainDatasetFieldMappingEditor.tsx`, `web/src/components/agchain/datasets/AgchainDatasetPreviewTable.tsx`, `web/src/components/agchain/datasets/AgchainDatasetValidationPanel.tsx`, `web/src/pages/agchain/AgchainDatasetCreatePage.test.tsx`

**Step 1:** Write `AgchainDatasetCreatePage.test.tsx` — test wizard step progression, that preview shows sample rows and validation, that a 202 preview or create response polls to terminal success, and that submit creates the dataset and navigates to detail.
**Step 2:** Create `AgchainDatasetFieldMappingEditor.tsx` — form with one row per Inspect sample field (`input`, `messages`, `choices`, `target`, `id`, `metadata`, `sandbox`, `files`, `setup`). Each row has a label and a text input for the AGChain JSON path expression (e.g., `$.prompt`). This is AGChain's mapping abstraction, not a literal Inspect FieldSpec UI (see "Locked AGChain-to-Inspect Mapping Boundary"). Controlled by `fieldSpec: AgchainFieldSpec` and `onChange: (spec: AgchainFieldSpec) => void`.
**Step 3:** Create `AgchainDatasetPreviewTable.tsx` — HTML `<table>` showing preview samples. Columns: ID, Input (truncated), Target (truncated), Choices, Setup, Sandbox, Files (boolean badges). Props: `samples: AgchainDatasetSampleSummary[]`, `loading: boolean`.
**Step 4:** Create `AgchainDatasetValidationPanel.tsx` — displays validation status badge, warning counts summary, and collapsible issue groups. Props: `validation: AgchainDatasetValidationSummary | null`, `loading: boolean`.
**Step 5:** Create `AgchainDatasetWizard.tsx` — multi-step wizard with steps: (1) Source Config — source type selector, source URI input, source-type-specific config fields, (2) Field Mapping — `AgchainDatasetFieldMappingEditor`, (3) Preview — calls `previewNewDataset`, shows `AgchainDatasetPreviewTable` + `AgchainDatasetValidationPanel`, handles 202 polling, (4) Create — name, slug, description, tags, initial version label inputs, submit button. Calls `createDataset`, handles 202 polling, navigates to `/app/agchain/datasets/:datasetId` on success. The wizard does not expose a `shuffle_choices` control; requests keep `materialization_options_jsonb.shuffle_choices` fixed to `false`. The wizard supports back-navigation between steps (step state held in component state). Navigating away from the page abandons the in-progress wizard — no persistence; drafts are version-only.
**Step 6:** Create `AgchainDatasetCreatePage.tsx` — `AgchainPageFrame` wrapper, hero section with title "Add Dataset", renders `AgchainDatasetWizard`. Loads bootstrap defaults via `getDatasetBootstrap` on mount.
**Step 7:** Run tests.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainDatasetCreatePage.test.tsx`
**Expected output:** Tests pass

**Commit:** `feat(web): build agchain dataset create page`

### Task 8: Build dataset detail page

**File(s):** `web/src/pages/agchain/AgchainDatasetDetailPage.tsx`, `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx`, `web/src/components/agchain/datasets/AgchainDatasetSamplesTable.tsx`, `web/src/components/agchain/datasets/AgchainDatasetSampleDrawer.tsx`, `web/src/components/agchain/datasets/AgchainDatasetVersionsTable.tsx`, `web/src/pages/agchain/AgchainDatasetDetailPage.test.tsx`

**Step 1:** Write `AgchainDatasetDetailPage.test.tsx` — test that the page loads dataset detail, that tabs switch content, that selecting a different version through `AgchainDatasetVersionSwitcher` refreshes the workspace to that version's data, that sample drawer opens on row click, that a 202 rerun-preview response shows operation status and polls to terminal success, and that "New Version" navigates to draft page.
**Step 2:** Create `AgchainDatasetVersionSwitcher.tsx` — dropdown selector showing version labels with sample count and validation badge. Props: `versions: AgchainDatasetVersionSummary[]`, `selectedVersionId: string | null`, `onSelect: (versionId: string) => void`.
**Step 3:** Create `AgchainDatasetSamplesTable.tsx` — HTML `<table>` with search, filter by `has_setup`/`has_sandbox`/`has_files`/`parse_status`. Columns: Sample ID, Input Preview, Target Preview, Setup/Sandbox/Files (boolean badges), Parse Status. Row click calls `onSelectSample(sampleId)`.
**Step 4:** Create `AgchainDatasetSampleDrawer.tsx` — `Sheet`/`SheetContent` side panel showing full sample detail: canonical JSON (formatted), metadata, setup, sandbox, files sections. Props: `sample: AgchainDatasetSampleDetail | null`, `open: boolean`, `onClose: () => void`.
**Step 5:** Create `AgchainDatasetVersionsTable.tsx` — HTML `<table>` showing version history. Columns: Version Label, Created, Samples, Checksum (truncated), Validation (`Badge`), Base Version.
**Step 6:** Create `AgchainDatasetDetailPage.tsx` — `AgchainPageFrame` wrapper. Hero section with dataset name, slug, description, tags, status badge, source type badge. Version switcher. Tab bar with: Samples (default), Versions, Source, Mapping, Validation. Each tab lazy-loads its data via `useAgchainDatasetDetail`. "New Version" button navigates to `/app/agchain/datasets/:datasetId/versions/new/:draftId` after calling `createDraft`. "Rerun Preview" button on the Samples tab calls `rerunPreview`, shows `AgchainOperationStatus` when the response returns 202, and polls until terminal status.
**Step 7:** Reuse `AgchainDatasetValidationPanel` from Task 7 for the Validation tab.
**Step 8:** Run tests.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainDatasetDetailPage.test.tsx`
**Expected output:** Tests pass

**Commit:** `feat(web): build agchain dataset detail page`

### Task 9: Build dataset version draft page

**File(s):** `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx`, `web/src/pages/agchain/AgchainDatasetVersionDraftPage.test.tsx`

**Step 1:** Write `AgchainDatasetVersionDraftPage.test.tsx` — test that the page loads draft state, that editing marks dirty fields, that a 202 preview or commit response polls to terminal success, that preview shows diff summary, and that commit navigates back to detail.
**Step 2:** Create `AgchainDatasetVersionDraftPage.tsx` — `AgchainPageFrame` wrapper. Uses `useAgchainDatasetDraft(datasetId, draftId)` with route params. Layout: version label input, source config section (reuse source-type-specific fields), field mapping editor (reuse `AgchainDatasetFieldMappingEditor`), materialization options section for `shuffle`, `limit`, `auto_id`, and `deterministic_seed` only. Action bar: "Save Draft" (calls `updateDraft`), "Preview" (calls `previewDraft`, shows `AgchainDatasetPreviewTable` + `AgchainDatasetValidationPanel` + diff summary), "Commit" (calls `commitDraft`, handles 202, navigates to detail on success). Dirty state indicator based on `draft.dirty_state`. Operation status display when 202 is active. `shuffle_choices` remains fixed to `false`.
**Step 3:** Run tests.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainDatasetVersionDraftPage.test.tsx`
**Expected output:** Tests pass

**Commit:** `feat(web): build agchain dataset version draft page`

### Task 10: Integration verification and final audit

**File(s):** All dataset files

**Step 1:** Run full backend test suite: `cd services/platform-api && pytest -q tests/test_agchain_datasets.py` → 32 passed.
**Step 2:** Run all frontend dataset tests: `cd web && npx vitest run src/pages/agchain/AgchainDatasetsPage.test.tsx src/pages/agchain/AgchainDatasetCreatePage.test.tsx src/pages/agchain/AgchainDatasetDetailPage.test.tsx src/pages/agchain/AgchainDatasetVersionDraftPage.test.tsx`.
**Step 3:** Verify locked inventory counts match actual file count.
**Step 4:** Verify no `AgchainSectionPage` usage remains in dataset pages (all must use `AgchainPageFrame`).
**Step 5:** Verify `agchain.inspect.dataset.validation.project` span exists in `inspect_dataset_materializer.py` and that `services/platform-api/tests/test_agchain_datasets.py` contains the targeted proof for it.
**Step 6:** Verify create and draft flows do not expose `shuffle_choices` and keep it fixed to `false`.
**Step 7:** Walk through the locked acceptance contract steps 1-9.

**Test command:** Full test suite (both commands above)
**Expected output:** All tests pass, all acceptance criteria met

**Commit:** `chore: verify agchain datasets step 1 completion`
