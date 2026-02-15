# Unstructured Full Pipeline Analysis and Implementation Plan

Last updated: 2026-02-14

## 1) Purpose

This document defines a detailed plan to implement a full Unstructured-based pipeline in this repo, while keeping it as a distinct track from the current pipeline until explicitly merged later.

Primary goals:

- Reuse as much open-source Unstructured code as possible.
- Reproduce the strongest workflow behavior from the UI flows shown in reference images.
- Keep current production ingest behavior intact.
- Implement a second, separate track first; only mix tracks after stabilization.

## 2) Repositories analyzed so far

Analyzed local repos:

- `ref-repos/unstructured`
- `ref-repos/unstructured-api`
- `ref-repos/unstructured-inference`
- `ref-repos/unstructured-ingest`
- `ref-repos/unstructured-python-client`

Current system analyzed for integration constraints:

- `supabase/functions/ingest/index.ts`
- `supabase/functions/ingest/process-convert.ts`
- `supabase/functions/conversion-complete/index.ts`
- `supabase/functions/_shared/representation.ts`
- `services/conversion-service/app/main.py`
- `supabase/migrations/20260208022131_003_v2_parallel_documents_blocks.sql`
- `supabase/migrations/20260213153000_019_ingest_tracks_policy_pandoc_representation.sql`
- `supabase/migrations/20260214190500_020_conversion_representations_multi_artifact_uniqueness.sql`

## 3) High confidence findings

### 3.1 What already exists in OSS and is reusable

1. Core document partitioning and element modeling:
   - `ref-repos/unstructured/unstructured/partition/auto.py:30`
   - `ref-repos/unstructured/unstructured/staging/base.py:85`
2. Layout detection and table structure model internals:
   - `ref-repos/unstructured-inference/unstructured_inference/inference/layout.py:54`
   - `ref-repos/unstructured-inference/unstructured_inference/models/tables.py:30`
   - `ref-repos/unstructured-inference/unstructured_inference/models/tables.py:746`
3. Self-hostable API wrapper with `/general/v0/general` contract:
   - `ref-repos/unstructured-api/prepline_general/api/general.py:638`
4. Full ETL-style ingest orchestrator:
   - `ref-repos/unstructured-ingest/unstructured_ingest/pipeline/pipeline.py:45`
   - Ordered steps include index, download, partition, chunk, embed, stage, upload:
   - `ref-repos/unstructured-ingest/unstructured_ingest/pipeline/pipeline.py:182`
5. Connector registry system:
   - `ref-repos/unstructured-ingest/unstructured_ingest/processes/connector_registry.py:1`
   - Connector bootstrapping imports:
   - `ref-repos/unstructured-ingest/unstructured_ingest/processes/connectors/__init__.py:1`
6. Programmatic workflow/template/job API surface (platform endpoints):
   - `ref-repos/unstructured-python-client/src/unstructured_client/sdk.py:24`
   - `ref-repos/unstructured-python-client/src/unstructured_client/workflows.py:13`
   - `ref-repos/unstructured-python-client/src/unstructured_client/jobs.py:209`
   - `ref-repos/unstructured-python-client/src/unstructured_client/general.py:20`

### 3.2 What is not present in OSS and must be built by us

1. Workflow graph editor UI like the platform canvas.
2. Productized control-plane UX (node inspector, workflow detail pane, run history UX parity).
3. Proprietary enrichment nodes shown in screenshots:
   - "Image summarizer"
   - "OCR enrichment" (managed generative OCR behavior)
   - "Table to HTML" as a managed node abstraction
4. Hosted model behavior parity (if requiring proprietary model quality).

### 3.3 Current system constraints we must preserve

1. Current ingest flow and source identity:
   - `supabase/functions/ingest/index.ts`
2. Conversion callback and first-class representation artifacts:
   - `supabase/functions/conversion-complete/index.ts`
   - `supabase/functions/_shared/representation.ts`
3. First-class representation model is already in place:
   - `markdown_bytes`
   - `pandoc_ast_json`
   - `doclingdocument_json`
4. Documents and blocks persistence contract:
   - `documents_v2`, `blocks_v2`
   - `supabase/migrations/20260208022131_003_v2_parallel_documents_blocks.sql`

## 4) Important caveats discovered

1. `unstructured-ingest` docs mention `v2` path examples, but this local snapshot does not include `unstructured_ingest/v2` directory.
   - This means the docs and current tree are not fully aligned in this snapshot.
2. In `unstructured-api`, `chunking_strategy` validation supports `basic` and `by_title`, while form schema currently constrains to `by_title`.
   - Behavior and schema are partially inconsistent.
3. Existing current repo has a separate conversion service design and callback contract that must not be broken while adding the second track.
4. Runtime version constraint:
   - `unstructured-inference` requires Python `>=3.12` and this track should be pinned to `3.12.x`.
   - Current conversion-service runtime is newer (`3.14`), so Track B must run as a separate service/runtime image and not share that runtime.

## 5) Target product shape (based on screenshots + requirements)

Target behavior should support:

1. Multi-file upload and file list.
2. Preview pane with page navigation.
3. Result pane with formatted and JSON views.
4. Optional overlay bounding boxes view.
5. Schema definition and "Run Schema" behavior.
6. Node-based workflow mode (Source -> Partitioner -> optional enrichers -> Destination).
7. Job history and rerun visibility.

Internal terminology to keep:

- User Schema JSON: user-defined extraction schema objects.
- Source Document JSONs: uploaded source documents that are JSON shaped.

### 5.1 User Schema JSON contract (canonical)

User Schema JSON is database-style and flat by design.

Required constraints:

1. One level deep top-level fields only.
2. No nested objects.
3. No arrays of objects.
4. Allowed scalar field types: `string`, `number`, `integer`, `boolean`. Scalar arrays optional only if explicitly enabled.
5. Each top-level field maps to one extractable output column.

Implication for UI:

- "Define Schema" visual editor must be constrained to this flat contract.
- If the editor UI supports nested structures generically, nested controls must be disabled/blocked for User Schema JSON mode.

Boundary note:

1. This is a product contract we control for `User Schema JSON`.
2. It does not constrain `Source Document JSONs`; source JSON documents may remain nested/heterogeneous.

### 5.2 Context snapshot from prior Codex discussion (canonical)

Scope:

1. Five reference screenshots under:
   - `docs/frontend/unstructured/file upload process/1 (1).png`
   - `docs/frontend/unstructured/file upload process/1 (2).png`
   - `docs/frontend/unstructured/file upload process/1 (3).png`
   - `docs/frontend/unstructured/file upload process/1 (4).png`
   - `docs/frontend/unstructured/file upload process/1 (5).png`

Agreed interpretation:

1. Core extraction pipeline capabilities are available in OSS repos (partitioning, element output, coordinates, ingest orchestration, workflow/template API surfaces).
2. Screenshot UX surfaces are mostly product UI concerns and are not directly provided as OSS web components.
3. "Middle preview + right result (Formatted|JSON)" can be built directly from extracted block elements and coordinates.
4. "Define Schema + Run Schema" is functionally the same core behavior as schema upload, but exposed through an interactive editor path.
5. Canonical user schema format remains flat database-style JSON (no nested objects, no arrays of objects).

Non-negotiable product decisions from discussion:

1. Visual preview is required for upload-supported file types by default.
2. Preferred implementation is unified page preview through `preview_pdf` artifacts; native viewers are allowed where stronger.
3. If visual preview is technically impossible for a specific file instance, show reason and keep parsed-result fallback without failing ingestion/extraction.

Implementation consequence:

1. Treat screenshot parity as "behavior parity first" (data model + interactions), not "pixel/UI clone."

## 6) Architecture decision: separate tracks first

Implement two distinct tracks:

1. Track A (existing): current core ingest/conversion path.
2. Track B (new): `unstructured_oss` track using Unstructured OSS pipeline components.

No early mixing:

- Separate runtime policy routing key.
- Separate job/execution tables.
- Separate worker entrypoints.
- Separate output tables/read models for Track B.

Hard rule:

1. Do not mix Track A and Track B execution paths during initial rollout.
2. Track mixing is allowed only after explicit sign-off and a dedicated stabilization review.
3. No shared output normalization during initial rollout.

## 7) Data model plan (very detailed)

### 7.1 Reuse existing tables

Keep using:

- `documents_v2` as source catalog and project linkage only.
- Existing project/user ownership tables for access control.

Do not write Track B extraction outputs to:

- `blocks_v2`
- `conversion_representations_v2`

Initial Track B outputs must remain isolated in Track B tables.

### 7.2 Add new tables for unstructured pipeline control

Add:

1. `unstructured_workflows_v2`
   - `workflow_uid` (pk)
   - `owner_id`
   - `name`
   - `is_active`
   - `workflow_spec_json` (node/edge graph config)
   - `created_at`, `updated_at`
2. `unstructured_workflow_runs_v2`
   - `run_uid` (pk)
   - `workflow_uid` (fk)
   - `project_id`
   - `owner_id`
   - `status` (`queued|running|partial_success|success|failed|cancelled`)
   - `started_at`, `ended_at`
   - `error`
3. `unstructured_run_docs_v2`
   - `run_uid` (fk)
   - `source_uid` (fk to `documents_v2.source_uid`)
   - `status`
   - `step_indexed_at`, `step_downloaded_at`, `step_partitioned_at`, `step_chunked_at`, `step_embedded_at`, `step_uploaded_at`
   - `error`
4. `unstructured_step_artifacts_v2`
   - `artifact_uid` (pk)
   - `run_uid`
   - `source_uid`
   - `step_name` (`index|download|partition|chunk|embed|stage|upload`)
   - `storage_bucket`, `storage_key`
   - `content_type`
   - `size_bytes` (integer, file size for observability — not raw content)
   - `created_at`
   - Note: artifact content is stored in Supabase Storage only, never in Postgres columns. Matches existing `conversion_representations_v2` pattern.

5. `unstructured_documents_v2`
   - `u_doc_uid` (pk)
   - `canonical_doc_uid` (same identity semantics/type as Track A document identity; preserves original-document continuity)
   - `run_uid`
   - `source_uid`
   - `project_id`
   - `status`
   - `created_at`, `updated_at`
   - unique: (`run_uid`, `source_uid`)
6. `unstructured_blocks_v2`
   - `u_block_uid` (pk)
   - `u_doc_uid` (fk)
   - `canonical_block_uid` (same identity semantics/type as Track A block identity; convergence key)
   - `source_uid`
   - `raw_element_id` (nullable, as emitted by Unstructured if present)
   - `element_ordinal` (integer, stable order within document result)
   - `page_number`
   - `platform_block_type` (Track B enum, required)
   - `raw_element_type` (string, required)
   - `text`
   - `metadata_json`
   - `coordinates_json`
   - `created_at`
7. `unstructured_representations_v2`
   - `u_repr_uid` (pk)
   - `run_uid`
   - `source_uid`
   - `representation_type`
   - `storage_bucket`, `storage_key`
   - `created_at`

### 7.3 Representation expansion (optional but recommended)

Track B stores representations in `unstructured_representations_v2` with:

- `unstructured_elements_json`
- `unstructured_layout_json`
- `unstructured_table_cells_json`

### 7.4 Element taxonomy storage decision (fixed)

Unstructured element taxonomy is mapped to Track B platform enums, while raw type is preserved.

Rules:

1. Persist raw element type exactly as emitted (`raw_element_type`).
2. Map each raw Unstructured type to Track B enum field `platform_block_type`.
3. Persist full raw element payload in `metadata_json` (plus coordinates in `coordinates_json`).
4. Track B enum mapping table is versioned and test-covered.
5. Mapping to Track A enum remains deferred until explicit convergence/mixing phase.

### 7.5 Identity model for Track B entities (fixed)

Track B keeps the same identity semantics as Track A, with a temporary Track B UID namespace.

Rules:

1. Canonical identity:
   - derive `canonical_doc_uid` and `canonical_block_uid` using the same deterministic identity system used by current BlockData (same canonicalization/hashing rules).
2. Track B physical keys:
   - `u_doc_uid` and `u_block_uid` are namespaced Track B UIDs for isolation during initial rollout.
   - They can wrap canonical IDs with Track B/run context for row isolation, but canonical IDs remain the merge key.
3. Preserve source identity:
   - always store raw `raw_element_id` from Unstructured when available.
4. Hashing utilities:
   - reuse the existing BlockData deterministic hashing implementation for canonical IDs (no parallel formula).
5. Convergence note:
   - merge/convergence later should align on `canonical_*` IDs, then retire Track B-only physical UID namespace.

## 8) Service-level implementation plan

### 8.1 New service: `services/unstructured-track-service`

Responsibilities:

1. Accept run requests for selected documents.
2. Materialize runtime pipeline config from workflow spec.
3. Execute steps using adapted OSS modules:
   - index/downloader/connectors from `unstructured-ingest`
   - partition from `unstructured` or `unstructured-api` mode
   - chunk from `unstructured.chunking`
   - embed from `unstructured-ingest` providers
4. Emit run status events.
5. Persist artifacts and final normalized outputs.
6. Runtime pinned to Python `3.12.x` (container and CI), isolated from Track A runtime.

### 8.2 Adapter boundaries

Implement adapters (explicit interfaces):

1. `SourceAdapter`
   - from project doc selection to local or remote source stream.
2. `PartitionAdapter`
   - local partition mode and hosted/self-host API mode.
3. `EnrichmentAdapter`
   - pluggable node contract for optional enrichments.
4. `PersistenceAdapter`
   - writes Track B blocks to `unstructured_blocks_v2`.
5. `RepresentationAdapter`
   - writes artifacts to `unstructured_representations_v2`.

### 8.3 Track routing

Add runtime policy mapping:

- `upload.extension_track_routing` remains for current flows.
- Add project/workflow-triggered route for `unstructured_oss`.
- Do not mutate current default route for existing documents.

## 9) UI implementation plan

### 9.1 New pages/components

1. Workflow Builder page:
   - Phase 1 MVP: no visual node editor; use hardcoded/templated pipeline configs.
   - Users trigger runs from predefined template/preset configs in Phase 1.
   - Later phase: node canvas + node config side panel.
   - Save workflow and run actions.
2. Extract/Preview page:
   - Left: file list and add file.
   - Middle: document preview with page controls.
   - Right: result view with `Formatted|JSON` toggle.
3. Run status panel:
   - Current run progress by step.
   - Prior run history.

### 9.4 Transform vs Extract routes (fixed)

Model as two distinct flows:

1. `Transform` route:
   - partition/chunk/optional enrichments
   - outputs raw/structured element results
2. `Extract` route:
   - partition + User Schema JSON driven extraction
   - outputs field/value extraction results

These are separate routes/pages/contracts in Track B.
UI can still use a tab-like switch for speed, but backend stages remain explicit:
`Transform -> enum-typed blocks -> Extract`.

### 9.2 Scope discipline

Initial UI parity target:

- Functional parity first.
- Visual polish second.
- Keep current project/doc table flows operational.

### 9.3 Preview module decision (fixed)

Decision:

1. Use `react-pdf` for middle-pane page preview with overlays.
2. Use existing parsed-result pane for right side (`Formatted | JSON`).
3. Use coordinate overlays from persisted element/layout artifacts.

Support requirement (hard rule):

1. Every document type accepted by upload policy must have a visual preview path in the middle pane.
2. No intentional "unsupported preview" state for accepted file types.
3. Parsed-result-only display is temporary while visual preview artifact generation is in progress.
4. Exception only when visual preview is technically not possible for a specific file instance; in that case:
   - show explicit reason in UI,
   - keep parsed-result preview available,
   - do not fail ingestion/extraction because preview failed.

DOCX/PPTX/XLSX policy:

1. Generate a `preview_pdf` artifact asynchronously and display it in the same PDF viewer.
2. If native viewer is stronger for a specific type, it is allowed as equivalent visual-preview implementation.
3. Show parsed text/blocks immediately while visual preview is generating, then auto-swap to visual preview.
4. Never block extraction flow on preview conversion success.

Baseline preview matrix:

1. `pdf` -> native PDF preview.
2. `docx|pptx|xlsx|html|md|txt|csv|json` -> convert to `preview_pdf` for middle-pane visual preview.
3. `png|jpg|jpeg|tiff` -> native image preview or `preview_pdf` normalization (implementation choice).

## 10) Feature mapping from screenshot to implementation source

1. Files list and add file:
   - Use current upload storage + new run-doc selection.
2. Preview pane:
   - Use existing viewer stack where possible.
3. Bounding box overlays:
   - Consume `unstructured_layout_json` artifact.
4. Result formatted mode:
   - Render normalized markdown or structured extraction output.
5. Result JSON mode:
   - Render raw unstructured elements JSON.
6. Define Schema + Run Schema:
   - Hook to existing user schema model.
   - Enforce flat User Schema JSON rules in this mode (per `5.1` contract).
   - If nested schema UI is encountered, disable nested additions and show flat-schema validation errors.
   - Run against selected docs (subset support).
7. Workflow graph:
   - Persist graph JSON in `unstructured_workflows_v2.workflow_spec_json`.

## 11) Phase plan with deliverables and acceptance criteria

### Phase 0: Repository completion and lock

Deliverables:

1. Add any missing Unstructured repos (if downloaded later):
   - `unstructured-js-client`
   - `docs`
   - `unstructured-platform-plugins`
   - `UNS-MCP`
2. Record pinned commit SHAs in a lock document.

Acceptance:

- All analyzed repos listed with commit hash and local path.

### Phase 1: Data and control plane foundation

Deliverables:

1. Migrations for new workflow/run tables.
2. Run state machine with retries and failure handling.
3. Basic API endpoints:
   - create workflow
   - run workflow on selected docs
   - get run status
   - list runs
4. Templated/hardcoded workflow configs (no visual graph editor yet).

Acceptance:

- One workflow can run on selected docs and persist run status rows.

### Phase 2: Execution engine

Deliverables:

1. `unstructured-track-service` with pipeline step orchestration.
2. Partition + chunk + embed + upload step wiring.
3. Artifacts saved per step in storage and DB.

Acceptance:

- End-to-end run produces `unstructured_blocks_v2` rows and `unstructured_representations_v2` artifacts.

### Phase 3: Viewer and extract UX

Deliverables:

1. File list + preview + result panes.
2. JSON/formatted toggle.
3. Bounding box overlay toggle.

Acceptance:

- User can run a workflow and inspect result with preview and JSON output.

### Phase 4: Schema extraction integration

Deliverables:

1. User Schema JSON selector integrated in extract flow.
2. Run schema on subset of documents.
3. Persist extraction run outputs to existing schema result model.
4. Flat-schema enforcement in upload and visual schema editor paths.

Acceptance:

- Schema can run on selected docs only; status visible in table and run history.
- Nested schema attempts are rejected with clear validation messages.

### Phase 5: Advanced enrichers

Deliverables:

1. Implement optional nodes:
   - image summarization
   - OCR enrichment
   - table to HTML normalization
2. Mark proprietary parity gaps explicitly in UI labels.
3. Run enrichers in Track B worker path using hybrid execution:
   - OSS baseline where available (`table_to_html`, baseline OCR from partition output).
   - provider-backed upgrade mode for optional quality improvements.

Acceptance:

- Enrichment nodes are functional and produce persisted artifacts.

### 11.1 Enrichment implementation path (fixed)

Enrichment nodes use a hybrid model:

1. `table_to_html` baseline uses OSS deterministic conversion (`cells_to_html`), with optional provider upgrade path.
2. `ocr_enrichment` baseline uses partition/OCR output, with optional provider upgrade path.
3. `image_summarizer` is provider-backed.

Execution path:

1. `services/unstructured-track-service` orchestrates enrichment steps after partition output is available.
2. Each enricher uses a provider adapter (`openai`, `anthropic`, etc.) behind a common interface.
3. Prompt templates/versioning are stored in repo config and referenced by node subtype.
4. Outputs are persisted as Track B artifacts and optionally linked to enriched block rows.
5. Node failures are isolated per-doc/per-node and do not corrupt earlier step outputs.

### Phase 6: Hardening and optional track mixing

Deliverables:

1. Load tests, backpressure, timeouts, job cancellation.
2. Optional mixed-mode experiments (only after sign-off).

Acceptance:

- Stable run completion and predictable failure behavior under concurrency.

## 12) Testing strategy

### 12.1 Unit tests

1. Adapter input/output contracts.
2. State transitions and retry logic.
3. Artifact persistence and idempotency.

### 12.2 Integration tests

1. Local source -> local destination.
2. Selected docs subset run behavior.
3. Schema run and result visibility.

### 12.3 Golden-output tests

1. Compare `unstructured_elements_json` against known fixtures.
2. Table HTML output deterministic snapshots.
3. Parser metadata presence checks.

## 13) Operational concerns

1. Resource profile:
   - OCR and table inference are CPU and memory heavy.
2. Queueing:
   - enforce per-user and global concurrency limits.
3. Cost controls:
   - provider-backed embed/enrichment usage caps.
4. Security:
   - enforce Workspace B ownership/membership, then project-level access checks.
   - scope Track B storage paths by workspace (for example `workspace_b/{workspace_id}/track_b/...`).
   - never persist provider credentials in artifacts/logs.
   - include `workspace_id` in audit events for run create/cancel, workflow edit, and schema run.
5. Observability:
   - per-step durations, failure reasons, and artifact links.

## 14) Risks and mitigations

1. Risk: mismatch between unstructured-ingest docs and local code snapshot.
   - Mitigation: code-first integration; do not trust docs-only claims.
2. Risk: model quality gap vs hosted proprietary models.
   - Mitigation: document expected quality tier; keep provider-backed enrichers pluggable.
3. Risk: coupling too early with current track.
   - Mitigation: enforce separate track tables and workers until explicit merge decision.
4. Risk: state drift across long-running runs.
   - Mitigation: strict run state machine and heartbeat-based stale run cleanup.

## 15) Immediate execution checklist (next 10 tasks)

1. Pin Track B service runtime to Python `3.12.x` (Dockerfile + CI matrix).
2. Implement and test deterministic Track B hash helper (`u_doc_uid`, `u_block_uid`).
3. Create migration for `unstructured_workflows_v2`.
4. Create migration for `unstructured_workflow_runs_v2`.
5. Create migration for `unstructured_run_docs_v2`.
6. Create migration for `unstructured_step_artifacts_v2`.
7. Create migrations for `unstructured_documents_v2`, `unstructured_blocks_v2`, `unstructured_representations_v2`.
8. Scaffold `services/unstructured-track-service`.
9. Implement run API endpoint to queue selected docs.
10. Add first end-to-end integration test with local source input.

## 16) Implementation rule when encountering "Define Schema" page

If implementation reaches a generic "Define Schema" screen:

1. Switch screen mode to `User Schema JSON (flat)`.
2. Disable nested field creation controls.
3. Keep only flat field rows with allowed scalar types.
4. Validate schema on every edit and block invalid save/run.
5. Route "Run Schema" through the same backend contract as uploaded schemas.

## 17) Optional future repos to include when available

If these are added under `ref-repos`, integrate their analysis into this plan:

1. `unstructured-js-client`
2. `docs`
3. `unstructured-platform-plugins`
4. `UNS-MCP`

For each newly added repo, append:

- capability summary
- direct reuse candidates
- exact integration points
- blockers

## 18) Exact extraction map for the five screenshot surfaces

This section answers: exactly where in the repos we should pull contracts/logic from, and what to reuse vs rebuild.

### 18.1 Screenshot: Extract page (Files | Preview | Result + Define Schema/Run Schema)

Use these as the API and partition contracts:

1. `ref-repos/unstructured-api/prepline_general/api/general.py:629`
   - `general_partition` route handler for `POST /general/v0/general`.
   - Extract: multipart request/response contract, auth header behavior, multi-file handling pattern.
2. `ref-repos/unstructured-api/prepline_general/api/general.py:215`
   - `pipeline_api(...)` partition execution entry.
   - Extract: parameter surface (`strategy`, `coordinates`, `skip_infer_table_types`, `extract_image_block_types`, `output_format`, chunk params).
3. `ref-repos/unstructured-api/prepline_general/api/models/form_params.py:61`
   - `GeneralFormParams.as_form(...)`.
   - Extract: strongly-typed form parameter schema and defaults.
4. `ref-repos/unstructured/unstructured/partition/auto.py:30`
   - `partition(...)` filetype router.
   - Extract: filetype-based dispatch behavior.
5. `ref-repos/unstructured/unstructured/partition/pdf.py:130`
   - `partition_pdf(...)`.
   - Extract: PDF-specific options and `infer_table_structure -> text_as_html` behavior.
6. `ref-repos/unstructured/unstructured/partition/image.py:17`
   - `partition_image(...)`.
   - Extract: image partition path with similar semantics.

Define Schema / Run Schema for our platform:

1. Keep our canonical flat User Schema JSON contract (`type=object`, top-level `properties` only).
2. Use our existing schema execution path, not Unstructured nested schema UX:
   - `supabase/functions/schemas/index.ts`
   - `supabase/functions/runs/index.ts`
   - `supabase/functions/worker/index.ts`

### 18.2 Screenshot: Result pane JSON mode

Use these for canonical JSON element output:

1. `ref-repos/unstructured-api/prepline_general/api/general.py:455`
   - `convert_to_isd(elements)` for JSON response.
2. `ref-repos/unstructured/unstructured/staging/base.py:125`
   - `elements_to_dicts(...)` and alias `convert_to_isd`.
3. `ref-repos/unstructured/unstructured/staging/base.py:185`
   - `elements_to_json(...)` serializer.
4. `ref-repos/unstructured/unstructured/documents/elements.py:149`
   - `ElementMetadata` fields (`coordinates`, `page_number`, `text_as_html`, etc.).
5. `ref-repos/unstructured-docs/api-reference/legacy-api/partition/api-parameters.mdx:16`
   - authoritative parameter mapping and output-format docs.

For Formatted vs JSON toggle behavior, extract only data contracts. UI is ours.

### 18.3 Screenshot: Preview pane with bounding boxes and sync

Use these for geometry/layout primitives:

1. `ref-repos/unstructured-inference/unstructured_inference/inference/layout.py:30`
   - `DocumentLayout` (`from_file`, `from_image_file`) page/object model.
2. `ref-repos/unstructured-inference/unstructured_inference/inference/layout.py:226`
   - `PageLayout.annotate(...)` bbox drawing semantics.
3. `ref-repos/unstructured-inference/unstructured_inference/inference/layoutelement.py:214`
   - `LayoutElement` and `to_dict()` coordinate/text/type shape.
4. `ref-repos/unstructured/unstructured/partition/pdf_image/analysis/tools.py:57`
   - `save_analysis_artifiacts(...)` and `render_bboxes_for_file(...)` debug artifact path.
5. `ref-repos/unstructured-docs/snippets/general-shared-text/get-started-single-file-ui.mdx:87`
   - expected UX: bbox click -> formatted pane sync; show-all-bounding-boxes toggle.

Implementation note:

1. We should not copy their UI code (not present in these repos).
2. We should implement our own React preview module and feed it coordinates from parsed element metadata.

### 18.4 Screenshot: Create Workflow graph (Source -> Partitioner -> Enrichment -> Destination)

Use these for workflow orchestration contracts:

1. `ref-repos/unstructured-ingest/unstructured_ingest/pipeline/pipeline.py:45`
   - `Pipeline` and `_get_ordered_steps`.
2. `ref-repos/unstructured-ingest/unstructured_ingest/pipeline/steps/partition.py:23`
   - `PartitionStep` and NDJSON artifact output shape.
3. `ref-repos/unstructured-ingest/unstructured_ingest/processes/partitioner.py:16`
   - `PartitionerConfig` and local-vs-API partition mode.
4. `ref-repos/unstructured-ingest/unstructured_ingest/processes/connector_registry.py:34`
   - source/destination registry contracts.
5. `ref-repos/unstructured-ingest/unstructured_ingest/processes/connectors/__init__.py:73`
   - connector registration list.

Use these for API-level workflow operations:

1. `ref-repos/unstructured-python-client/src/unstructured_client/workflows.py:13`
   - `create_workflow`.
2. `ref-repos/unstructured-python-client/src/unstructured_client/workflows.py:815`
   - `run_workflow`.
3. `ref-repos/unstructured-python-client/src/unstructured_client/templates.py:13`
   - `get_template`.
4. `ref-repos/unstructured-python-client/src/unstructured_client/models/shared/createworkflow.py:33`
   - workflow payload shape (`workflow_nodes`).
5. `ref-repos/unstructured-python-client/src/unstructured_client/models/shared/workflownode.py:16`
   - node object schema (`name`, `type`, `subtype`, `settings`).
6. `ref-repos/unstructured-python-client/src/unstructured_client/models/shared/workflownodetype.py:7`
   - enum values (`partition`, `prompter`, `chunk`, `embed`).

### 18.5 Screenshot: Enrichment nodes (Image summary, OCR enrichment, Table to HTML)

Use these for node taxonomy and settings contracts:

1. `ref-repos/unstructured-docs/api-reference/workflow/workflows.mdx:1481`
   - enrichment node has `type="prompter"`.
2. `ref-repos/unstructured-docs/api-reference/workflow/workflows.mdx:1491`
   - image description task payload examples.
3. `ref-repos/unstructured-docs/api-reference/workflow/workflows.mdx:1637`
   - table-to-HTML task payload examples.
4. `ref-repos/unstructured-docs/api-reference/workflow/workflows.mdx:1843`
   - generative OCR task section.

Use these for table-HTML generation primitive in OSS:

1. `ref-repos/unstructured-inference/unstructured_inference/models/tables.py:139`
   - `run_prediction(..., result_format="html")`.
2. `ref-repos/unstructured-inference/unstructured_inference/models/tables.py:746`
   - `cells_to_html(...)`.

### 18.6 JS/Python client extraction (request assembly and page-split behavior)

If we want SDK-equivalent behavior in our own gateway client:

1. `ref-repos/unstructured-js-client/src/funcs/generalPartition.ts:45`
   - complete multipart request assembly for partition endpoint.
2. `ref-repos/unstructured-js-client/src/hooks/custom/FixArrayParamsHook.ts:28`
   - array form-key normalization (`extract_image_block_types[]`).
3. `ref-repos/unstructured-js-client/src/hooks/custom/SplitPdfHook.ts:38`
   - client-side PDF split/retry/merge logic.
4. `ref-repos/unstructured-js-client/src/hooks/custom/utils/request.ts:27`
   - response merge helper for split requests.
5. `ref-repos/unstructured-js-client/README.md:18`
   - current scope note: partition endpoint support; workflow endpoint support pending.

### 18.7 Where to plug this into our codebase

Current repo insertion points:

1. `supabase/functions/ingest/routing.ts`
   - add/select Track B route choice when unstructured pipeline is requested.
2. `supabase/functions/ingest/process-convert.ts`
   - extend conversion job provisioning for Track B artifacts/jobs.
3. `services/conversion-service/app/main.py`
   - add Track B conversion callback/artifact path for unstructured outputs.
4. `web/src/pages/DocumentDetail.tsx`
   - host the new preview + result split-pane module.
5. `web/src/components/blocks/BlockViewerGrid.tsx`
   - consume extracted schema/run outputs after Track B run completion.
6. `supabase/functions/schemas/index.ts`, `supabase/functions/runs/index.ts`, `supabase/functions/worker/index.ts`
   - keep schema creation/run contract unchanged for flat User Schema JSON.

### 18.8 Reuse vs rebuild decision (strict)

Reuse directly (high value):

1. Partition contracts and parameter surface from `unstructured-api`.
2. Element metadata and staging serializers from `unstructured`.
3. Layout/table primitives from `unstructured-inference`.
4. Pipeline ordering + connector registry concepts from `unstructured-ingest`.

Reuse as reference only (do not copy as-is):

1. Platform UI/UX from screenshots (not present as OSS frontend).
2. Managed workflow product affordances tied to hosted control plane/billing.

Rebuild in our product:

1. Dual-pane preview/result UI.
2. Formatted vs JSON toggle UX.
3. Define Schema visual editor constrained to flat User Schema JSON.
4. Workflow canvas UI with our own visual language.
