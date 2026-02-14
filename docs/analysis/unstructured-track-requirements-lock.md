# Unstructured Track B Requirements Lock

Last updated: 2026-02-14
Status: Locked for implementation kickoff (except explicitly marked open items)

## 1) Purpose of this document

This document is the implementation gate for starting Track B work.

It captures:

1. Requirements that are already decided and must not drift.
2. Discussion context behind each requirement so intent is preserved.
3. Exact boundaries between Track A (existing) and Track B (new).
4. Open slots for remaining decisions to be filled before coding in those areas.

This document is intentionally explicit and verbose so decisions remain stable over time.

## 2) Canonical terms (locked vocabulary)

Use these terms consistently across code, docs, migration names, and UI copy.

1. `Track A`: current production ingest/conversion pipeline.
2. `Track B`: new Unstructured-based pipeline (`unstructured_oss`) with isolated execution and storage.
3. `User Schema JSON`: user-defined extraction schema object for schema extraction flow.
4. `Source Document JSONs`: uploaded source documents that happen to be JSON-shaped content.
5. `Transform`: partition/structure-oriented flow.
6. `Extract`: schema-driven field extraction flow.
7. `Canonical IDs`: identity semantics shared with existing system for future convergence.
8. `Track B UIDs`: temporary physically separate UIDs for Track B isolation.

## 3) Requirements lock checklist (must be true before implementation)

## 3.1 Architecture and isolation requirements

### REQ-ARCH-001: Dual-track model is mandatory

Track B must be implemented as a separate execution track from Track A.

Discussion context:

- You explicitly required no initial mixing.
- This avoids accidental behavior changes in current production path.

Acceptance condition:

- Track A flows continue unchanged while Track B is introduced.

### REQ-ARCH-002: No execution path mixing during initial rollout

1. Do not mix Track A and Track B execution paths during initial rollout.
- Jon: yes this is the specification. Absolutely no mixing of tracks until both are stable. Then what we do thereafter is a TBD.

2. Track B must not write normalized outputs into Track A output tables during initial rollout.
- You explicitly said: no shared output normalization.
- UID separation alone is not enough; table separation is required.

3. Future convergence/merge is allowed, but not part of initial implementation.

- Initial design supports both future options:
  - full merge later, or permanent dual-table interoperability 
  jon: TBD. 

==> for now use separate uid tracks, and separate tables in database but do it in a way that facilitates interoperability in the future IF we decide to do so. 

## 3.2 Data model and persistence requirements

### REQ-DATA-001: Separate Track B output tables

Track B must use separate output tables, at minimum:

1. `unstructured_documents_v2`
2. `unstructured_blocks_v2`
3. `unstructured_representations_v2`

Discussion context:

- You explicitly confirmed that database tables should be separate.
- This is the concrete mechanism that enforces no-mix.

Acceptance condition:

- No Track B writes to `blocks_v2` or `conversion_representations_v2` during initial rollout.

### REQ-DATA-002: Separate Track B control-plane tables

Track B workflow/run control remains isolated through Track B tables:

1. `unstructured_workflows_v2`
2. `unstructured_workflow_runs_v2`
3. `unstructured_run_docs_v2`
4. `unstructured_step_artifacts_v2`

Acceptance condition:

- Workflow execution, run status, and artifacts can be queried without touching Track A run tables.

### REQ-DATA-003: Artifact payloads stored in object storage, not DB blobs

Artifact tables store metadata and storage references, not large binary payloads in table columns.

Discussion context:

- Keep storage pattern consistent and scalable.

Acceptance condition:

- `storage_bucket` + `storage_key` + `size_bytes` pattern is used for artifact records.

### REQ-DATA-004: Workspace source documents are persisted by default

Uploaded source documents must be persisted in workspace storage (Workspace B), not treated as temporary session files.

Discussion context:

- This is a deliberate product difference from ephemeral workbench upload behavior.

Acceptance condition:

1. Upload success creates a durable workspace document record.
2. Source bytes are stored under workspace-scoped storage paths.
3. Navigation away from the page does not delete uploaded source documents.

### REQ-DATA-005: Runs execute against persisted workspace documents

Transform/Extract runs must reference persisted workspace document IDs, not transient upload session handles.

Acceptance condition:

1. Run payloads use workspace document IDs (`source_uid`-style durable identifiers).
2. Run replay/rerun works without re-uploading the original file.

### REQ-DATA-006: Source-document deletion follows workspace retention policy

Source-document deletion/lifecycle must be governed by workspace retention and user actions, not UI page lifetime.

Acceptance condition:

1. Deletion happens only via explicit delete/archive policy paths.
2. Audit trail records source-document delete actions.
3. Preview/conversion cleanup cannot cascade-delete source documents by accident.

### REQ-DATA-007: Workspace B retention policy matrix is explicit

Retention policy must be pinned so storage cleanup is deterministic and auditable.

Benchmark note:

- Unstructured OSS repos do not publish a full workspace retention policy contract.
- We benchmark their lifecycle concepts, but apply Workspace B persistence rules (not ephemeral test-page behavior).

Retention matrix (locked defaults):

1. Source documents (`documents_v2` + source bytes): retained until explicit user/workspace delete or archive action (no auto-TTL).
2. Final user-visible outputs (Track B blocks/representations needed for grid/viewer): lifecycle follows source-document lifecycle.
3. Run metadata/history (`unstructured_workflow_runs_v2`, `unstructured_run_docs_v2`): retained 365 days minimum, then archive/purge eligible by policy.
4. Intermediate step artifacts (`unstructured_step_artifacts_v2`, temporary parser payloads): retained 30 days by default, configurable up to 90 days.
5. Soft-delete window for source documents: 30 days recoverable before hard-delete.
6. Audit records for destructive actions: retained minimum 365 days.

Acceptance condition:

1. A scheduled retention job enforces policy and writes audit events for purge/delete actions.
2. Purge logic never hard-deletes records under active legal/hold flags (when present).
3. Retention settings are workspace-scoped and policy-versioned.

## 3.3 Identity and UID requirements

### REQ-ID-001: Identity semantics match existing system

Track B must use the same canonical identity semantics as existing BlockData identity logic.

Discussion context:

- You said "same system just different UID system for now."

Acceptance condition:

- Track B computes canonical IDs with the same deterministic hashing/canonicalization semantics as Track A.

### REQ-ID-002: Temporary Track B physical UIDs are allowed

Track B may use temporary namespaced physical keys (`u_doc_uid`, `u_block_uid`) for isolation.

Discussion context:

- You accepted temporary separate UIDs now, with later unification.

Acceptance condition:

- Track B rows have physical Track B UIDs plus canonical convergence keys.

### REQ-ID-003: Raw Unstructured element IDs are preserved

Persist raw `element_id` from Unstructured when present (`raw_element_id`), independent of canonical IDs.

Acceptance condition:

- `unstructured_blocks_v2` contains both canonical/track keys and raw upstream IDs.

## 3.4 Unstructured taxonomy requirements

### REQ-TAX-001: Raw element types are mapped to Track B platform enums

Track B must map Unstructured element types to Track B-specific platform enum values.

Discussion context:

- You required mapped enum behavior so Track B can operate consistently on typed blocks.

Acceptance condition:

1. `unstructured_blocks_v2` stores a required mapped enum field (`platform_block_type`).
2. Mapping coverage exists for supported Unstructured element types used by Track B.

### REQ-TAX-002: Raw Unstructured taxonomy is preserved alongside mapped enum

Raw upstream taxonomy must still be persisted for traceability and future remapping.

Acceptance condition:

1. `raw_element_type` is stored exactly as emitted.
2. `raw_element_id` and raw metadata remain available for audit/debug.

### REQ-TAX-003: Track B mapping table is versioned and test-covered

Track B taxonomy mapping is a governed contract, not ad-hoc branching logic.

Acceptance condition:

1. Mapping table/schema is versioned.
2. Unit tests validate known type mappings and fallback behavior.
3. Unknown raw types map to a safe fallback enum (for example `other`) and are surfaced in monitoring.

## 3.5 Runtime and service requirements

### REQ-RUNTIME-001: Track B Python runtime pinned to 3.12.x

Track B service/container/CI must pin Python to `3.12.x`.

Discussion context:

- You flagged this explicitly: `unstructured-inference` constraint vs current 3.14 conversion runtime.

Acceptance condition:

- Track B runtime is isolated and pinned; Track A runtime stays unchanged.

### REQ-RUNTIME-002: Track B service is separate from current conversion service runtime

Do not co-host Track B Python runtime inside current 3.14 conversion service process.

Acceptance condition:

- Dedicated Track B service or runtime image exists.

## 3.6 Product flow requirements

### REQ-FLOW-001: Transform and Extract are distinct flows

Treat `Transform` and `Extract` as separate routes/pages in MVP (not one merged tab surface by default).

Discussion context:

- You wanted clear separation of user flows visible in screenshot behavior.
- UI can still use a tab-like control for speed, but that is presentation only.
- Logical stage order is explicit: `Transform -> enum-typed blocks -> Extract`.

Acceptance condition:

1. Separate route-level entry points and run payload contracts.
2. Extract run can target outputs from a prior Transform run for the same selected docs.
3. Tab UI must not collapse backend stages into one implicit operation.

### REQ-FLOW-002: Workflow builder MVP is scoped down

Phase 1 must use templated/hardcoded workflow config, not a full node-graph editor.

Discussion context:

- Visual graph editor is high complexity and should not block core pipeline delivery.
- Purpose is to ship reliable execution first, then add visual graph UX later.

Acceptance condition:

1. Core run pipeline works without visual canvas dependency.
2. Users can start runs from predefined pipeline templates/config presets.
3. Node-graph editor work is explicitly deferred to a later phase.

### REQ-FLOW-003: Define Schema UI delegates to SCHEMA contract

Define Schema UI behavior is derived from `REQ-SCHEMA-*` (no separate schema rule in FLOW layer).

Discussion context:

- This avoids duplication: FLOW describes UX/route behavior, SCHEMA describes data contract.

Acceptance condition:

1. Define Schema UI enforces `REQ-SCHEMA-001` and `REQ-SCHEMA-002`.
2. FLOW does not redefine schema shape rules.

## 3.7 User Schema JSON requirements

### REQ-SCHEMA-001: User Schema JSON is flat

Allowed structure:

1. Top-level fields only (one level deep).
2. No nested objects.
3. No arrays of objects.

Allowed field type baseline:

1. `string`
2. `number`
3. `integer`
4. `boolean`

Optional (only if explicitly enabled later):

1. scalar arrays (for example `string[]`).

Acceptance condition:

- Upload path and visual authoring path both enforce the same contract.

Boundary note:

1. This flatness constraint is a product contract we control for `User Schema JSON`.
2. It does not constrain `Source Document JSONs`; source JSON payloads may be nested/heterogeneous.

### REQ-SCHEMA-002: Upload and Define Schema are equivalent input paths

Schema upload and visual schema definition are two ways to produce the same canonical User Schema JSON.

Acceptance condition:

- Same backend schema validation and run execution contract regardless of authoring method.

## 3.8 Preview and document rendering requirements

### REQ-PREVIEW-001: Visual preview required for upload-supported formats by default

All accepted document formats should have a visual preview path in the middle pane by default.

Discussion context:

- You stated this explicitly and rejected intentional non-support.

Acceptance condition:

- Accepted formats have a visual preview strategy defined.

### REQ-PREVIEW-002: Exception policy for technically impossible cases

If visual preview is technically impossible for a specific file instance:

1. Show explicit reason in UI.
2. Keep parsed-result fallback available.
3. Do not fail ingestion/extraction due to preview failure.

Acceptance condition:

- Preview failure is isolated from extraction success/failure.

### REQ-PREVIEW-003: Unified preview strategy via PDF conversion is preferred

Preferred strategy:

1. Convert non-PDF docs to `preview_pdf` artifact asynchronously.
2. Render using one viewer surface.
3. Optionally use stronger native viewers for specific formats when needed.

Discussion context:

- You raised this directly ("why not convert docs to pdf") and confirmed platform direction.

Acceptance condition:

- Preview conversion pipeline exists and auto-swaps when ready.

## 3.9 Enrichment requirements

### REQ-ENRICH-001: Enrichment nodes are explicit LLM/inference steps

Nodes such as image summarization, OCR enrichment, and table-to-HTML are implemented as explicit provider-backed steps, not assumed from OSS libraries.

Acceptance condition:

- Node execution path includes prompt/template + provider adapter + artifact persistence.

### REQ-ENRICH-002: Enrichment failures are isolated

Per-doc/per-node failures should not corrupt earlier successful outputs.

Acceptance condition:

- Run state and artifacts accurately reflect partial success/failure.

## 3.10 Batch and execution behavior requirements

### REQ-BATCH-001: No forced single-document parsing

Track B must support multi-document execution in one run request.

Discussion context:

- You called out a weakness in the reference platform: forced one-document behavior.
- This is explicitly rejected for our implementation.

Acceptance condition:

1. Run API accepts a selected subset of documents.
2. One run can process many docs.
3. Per-doc statuses are visible during execution.

### REQ-BATCH-002: Subset selection is first-class

Users must be able to run Transform/Extract on a selected subset of project documents.

Acceptance condition:

1. Supports select/deselect and select-all patterns.
2. Run payload contains explicit source document IDs.
3. Execution and results are limited to selected docs only.

### REQ-BATCH-003: Per-doc failure isolation

One document failure must not fail the entire run unless explicitly configured as fail-fast.

Acceptance condition:

1. Run status can be `partial_success`.
2. Failed docs contain error details.
3. Successful docs persist outputs normally.

## 3.11 API contract requirements

### REQ-API-001: Track B run creation contract

Track B must expose a run-create contract with explicit flow mode and selected docs.

Endpoint and auth contract (locked):

1. Endpoint path: `POST /api/v1/workspaces/{workspace_id}/track-b/runs`
2. Auth: `Authorization: Bearer <jwt>` using existing app auth model.
3. Authorization: workspace membership is validated first, then project/document access checks.

Minimum request contract:

1. `project_id`
2. `flow_mode` (`transform` | `extract`)
3. `selected_source_uids[]`
4. `workflow_uid` or `workflow_template_key`
5. `user_schema_uid` (required for extract)

Minimum response contract:

1. `run_uid`
2. `status` (initially `queued`)
3. `accepted_count`
4. `rejected_count` + reasons

### REQ-API-002: Run status/read contract

Status API must expose both run-level and doc-level progress.

Minimum response fields:

1. run state, timestamps, error summary
2. per-doc state and step markers
3. artifact references available so far

### REQ-API-003: Idempotency for run-trigger calls

Run creation should support idempotency keys to prevent accidental duplicate run creation.

Idempotency contract (locked):

1. Key location: required HTTP header `Idempotency-Key` on run-create requests.
2. Key scope: unique within `(workspace_id, actor_id, endpoint_path)`.
3. Fingerprint: canonical hash of the request body (stable key order, excluding transport-only fields).
4. Replay window: key records retained for at least 24 hours (configurable upward).
5. This is a first-party contract for Track B; Unstructured OSS repos do not expose a full idempotency-key API contract we can directly adopt.

Acceptance condition:

1. New key + valid payload returns `202 Accepted` with a queued run response.
2. Duplicate key + same fingerprint returns `200 OK` with the existing run response.
3. Duplicate key + different fingerprint returns `409 Conflict` with a deterministic error code.
4. Missing `Idempotency-Key` on run-create returns `400 Bad Request`.

## 3.12 State machine requirements

### REQ-STATE-001: Run state machine is explicit and enforced

Allowed run states:

1. `queued`
2. `running`
3. `partial_success`
4. `success`
5. `failed`
6. `cancelled`

Allowed transitions must be explicit and validated server-side.

Allowed run transition matrix (locked):

1. `queued -> running | cancelled | failed`
2. `running -> success | partial_success | failed | cancelled`
3. `partial_success ->` terminal
4. `success ->` terminal
5. `failed ->` terminal
6. `cancelled ->` terminal

Benchmark mapping from Unstructured job states (reference mapping):

1. `SCHEDULED -> queued`
2. `IN_PROGRESS -> running`
3. `COMPLETED + SUCCESS -> success`
4. `COMPLETED + COMPLETED_WITH_ERRORS -> partial_success`
5. `STOPPED -> cancelled`
6. `FAILED -> failed`

### REQ-STATE-002: Document state machine is explicit and enforced

Allowed doc states:

1. `queued`
2. `indexing`
3. `downloading`
4. `partitioning`
5. `chunking`
6. `enriching`
7. `persisting`
8. `success`
9. `failed`
10. `cancelled`

Allowed document transition matrix (locked):

1. `queued -> indexing | downloading | partitioning | failed | cancelled`
2. `indexing -> downloading | partitioning | failed | cancelled`
3. `downloading -> partitioning | failed | cancelled`
4. `partitioning -> chunking | enriching | persisting | success | failed | cancelled`
5. `chunking -> enriching | persisting | success | failed | cancelled`
6. `enriching -> persisting | success | failed | cancelled`
7. `persisting -> success | failed | cancelled`
8. `success ->` terminal
9. `failed ->` terminal
10. `cancelled ->` terminal

Step-skip rule:

1. Optional steps (`chunking`, `enriching`) may be skipped by workflow config, but transitions must still follow the matrix above.

Acceptance condition:

1. Illegal transitions are rejected and logged.
2. State transition history can be reconstructed from DB events.

## 3.13 Non-functional requirements

### REQ-NFR-001: Throughput and concurrency controls

Track B must implement configurable concurrency limits:

1. global max concurrent runs
2. per-user concurrent runs
3. per-run doc parallelism
4. per-node (enrichment/provider) concurrency caps

### REQ-NFR-002: Resource safety

Long-running steps must have:

1. timeout budgets per step
2. retry policies per step
3. circuit-breaker behavior for failing providers

### REQ-NFR-003: Observability baseline

Must emit:

1. per-step latency metrics
2. per-step failure counts/reasons
3. run/doc status counters
4. artifact generation success/failure counts

### REQ-NFR-004: Preview generation latency reporting

Preview pipeline must expose progress and outcome:

1. `pending`
2. `ready`
3. `failed` + reason

Extraction success must remain independent from preview readiness.

## 3.14 Security and access requirements

### REQ-SEC-001: Access control alignment

Track B tables and APIs must enforce Workspace B ownership/membership first, then project-level access, consistent with existing app model.

Acceptance condition:

1. Workspace-level authorization is required before project/document access is evaluated.
2. Project-level checks are applied within authorized workspace scope.

### REQ-SEC-002: Storage path isolation

Track B artifacts and preview files must use Track B-specific storage prefixes/namespaces and include workspace scoping.

Acceptance condition:

1. Paths include workspace scope (for example `workspace_b/{workspace_id}/track_b/...`).
2. Cross-workspace path access is denied by policy.

### REQ-SEC-003: No secret leakage in artifacts

Provider/API credentials must never be persisted in artifact payloads or logs.

### REQ-SEC-004: Auditability

Critical actions must be auditable:

1. run create
2. run cancel
3. workflow edit
4. schema run trigger

Acceptance condition:

1. Audit records include `workspace_id`, `project_id`, actor, action, target, timestamp.
2. Audit events can be filtered by workspace for Workspace B investigations.

## 3.15 Migration and compatibility requirements

### REQ-MIG-001: Forward-only migration policy

Track B migrations must be additive and reversible by migration rollback strategy.

### REQ-MIG-002: Canonical compatibility fields required from day one

`canonical_doc_uid` and `canonical_block_uid` are required fields at initial table creation time.

Clarification:

1. `canonical_doc_uid` uses the same identity type/semantics as Track A document identity.
2. This preserves original-document identity continuity while Track B uses separate physical UIDs.

### REQ-MIG-003: No destructive schema changes during initial rollout

No drops/renames in Track A tables as part of Track B launch.

## 3.16 OSS extraction-point requirements (repo-level explicit lock)

### REQ-OSS-001: Partition API adapter contract comes from `unstructured-api`

Reuse endpoint and parameter behavior from:

1. `ref-repos/unstructured-api/prepline_general/api/general.py` (`general_partition`, `pipeline_api`, `_validate_chunking_strategy`)
2. `ref-repos/unstructured-api/prepline_general/api/models/form_params.py` (`GeneralFormParams`)

Extract exactly:

1. multipart request semantics and response content negotiation
2. request flags: `coordinates`, `strategy`, `output_format`, `unique_element_ids`, `chunking_strategy`
3. multi-file request behavior and joined response handling

Acceptance condition:

1. Track B partition adapter serializes fields with this form contract.
2. Persisted raw output preserves `element_id`, `type`, `text`, `metadata`, and coordinates when requested.

### REQ-OSS-002: SDK call surface comes from `unstructured-python-client`

Reuse generated SDK interfaces from:

1. `ref-repos/unstructured-python-client/src/unstructured_client/general.py` (`General.partition`, `General.partition_async`)
2. `ref-repos/unstructured-python-client/src/unstructured_client/workflows.py` (`create_workflow`, workflow run endpoints)
3. `ref-repos/unstructured-python-client/src/unstructured_client/jobs.py` (`create_job`, `cancel_job`, job status/download endpoints)

Extract exactly:

1. request/response DTO shape and path contracts
2. retry and timeout behavior exposed by SDK methods

Acceptance condition:

1. Track B service wraps SDK methods rather than hand-rolling HTTP payloads for these endpoints.

### REQ-OSS-003: Parameter compatibility filtering comes from `unstructured-ingest`

Reuse:

1. `ref-repos/unstructured-ingest/unstructured_ingest/unstructured_api.py` (`create_partition_request`, `call_api`, `call_api_async`)

Extract exactly:

1. `PartitionParameters` field filtering logic for SDK-version compatibility
2. wrapped provider/client error mapping

Acceptance condition:

1. Unsupported optional params are filtered with debug logging, not run-breaking errors.

### REQ-OSS-004: Local partition fallback comes from `unstructured`

Reuse:

1. `ref-repos/unstructured/unstructured/partition/auto.py` (`partition`)
2. `ref-repos/unstructured/unstructured/staging/base.py` (`elements_to_dicts`, `elements_from_dicts`)

Extract exactly:

1. file-type auto routing behavior
2. deterministic element dict conversion helpers

Acceptance condition:

1. Track B can run local/self-host partition mode without remote API dependency when configured.

### REQ-OSS-005: Layout and overlay primitives come from `unstructured-inference`

Reuse:

1. `ref-repos/unstructured-inference/unstructured_inference/inference/layout.py` (`DocumentLayout`, `PageLayout`, `get_elements_with_detection_model`, `convert_pdf_to_image`)
2. `ref-repos/unstructured-inference/unstructured_inference/visualize.py` (`draw_bbox`)

Extract exactly:

1. page-level element detection with bounding boxes
2. page image conversion path needed for overlay coordinate alignment

Acceptance condition:

1. Track B overlay payload persists page number + bbox coordinates compatible with preview sync.

### REQ-OSS-006: Table-to-HTML conversion primitives come from `unstructured-inference`

Reuse:

1. `ref-repos/unstructured-inference/unstructured_inference/models/tables.py` (`outputs_to_objects`, `structure_to_cells`, `cells_to_html`)

Extract exactly:

1. table structure normalization to cells
2. deterministic HTML generation from cells

Acceptance condition:

1. Track B table enrichment can persist reproducible `table_html` artifacts.

### REQ-OSS-007: Pipeline step orchestration pattern comes from `unstructured-ingest`

Reuse:

1. `ref-repos/unstructured-ingest/unstructured_ingest/pipeline/pipeline.py` (`Pipeline`, `_get_ordered_steps`, `_run`)
2. `ref-repos/unstructured-ingest/unstructured_ingest/cli/base/cmd.py` (`get_pipeline`)
3. `ref-repos/unstructured-ingest/unstructured_ingest/processes/connector_registry.py` (source/destination registry contracts)

Extract exactly:

1. ordered step sequence (`index -> download -> partition -> chunk -> embed -> stage -> upload`)
2. per-step init/precheck/cleanup semantics

Acceptance condition:

1. Track B run engine emits step-scoped artifacts and status transitions aligned to explicit step boundaries.

### REQ-OSS-008: Workflow node vocabulary scope is locked to OSS baseline

Based on:

1. `ref-repos/unstructured-python-client/src/unstructured_client/models/shared/workflownodetype.py`

Extract exactly:

1. baseline node types: `partition`, `prompter`, `chunk`, `embed`

Acceptance condition:

1. MVP does not assume proprietary platform node types exist in OSS.
2. `image_summarizer`, `ocr_enrichment`, and `table_to_html` are first-party Track B custom nodes.

### REQ-OSS-009: Explicit non-reuse boundary

Not available in the analyzed OSS repos:

1. platform middle-pane web preview component
2. platform Formatted/JSON toggle UI
3. platform Define Schema authoring UI
4. platform workflow graph canvas and inspector UX

Acceptance condition:

1. These surfaces are implemented in our frontend from persisted artifacts and internal contracts (no OSS UI dependency).

## 4) Discussion log distilled into design decisions

This section captures the critical "why" context from our discussion.

1. Separation first, merge later:
   - We are intentionally trading short-term duplication for safety and reversibility.
   - This protects existing flows while new pipeline matures.
2. UID separation alone is insufficient:
   - True isolation requires separate writes and separate tables, not just different IDs.
3. Future convergence remains open:
   - You want optional future unification or interop; therefore canonical identity compatibility is required now.
4. Schema model simplicity is strategic:
   - Flat schema avoids user confusion, avoids deeply nested extraction complexity, and maps well to tabular/grid outcomes.
5. Preview as product requirement:
   - Visual review experience is not optional for accepted formats; fallback is only an exception path.
6. MVP scope discipline:
   - Workflow canvas UX is delayed; execution reliability and data correctness come first.
7. Batch execution is non-negotiable:
   - The system must not force one-document-at-a-time parsing.
8. Workspace persistence is mandatory:
   - Uploaded source docs are durable workspace assets, not temporary page-session files.
9. Taxonomy mapping is mandatory:
   - Track B must persist mapped platform enum + raw upstream taxonomy at write time.

## 5) Pre-implementation gate (must be green)

All items below should be green before development starts in each area.

1. `ARCH`: Track separation and no-mix rules accepted.
2. `DATA`: Track B table set approved.
3. `ID`: canonical vs Track B UID scheme approved.
4. `RUNTIME`: Python 3.12 pin confirmed for Track B service.
5. `FLOW`: Transform vs Extract route split approved.
6. `SCHEMA`: flat User Schema JSON contract approved.
7. `TAXONOMY`: mapped enum + raw taxonomy persistence contract approved.
8. `PREVIEW`: visual-preview-by-default + exception policy approved.
9. `ENRICH`: provider adapter path approved.
10. `BATCH`: multi-doc run behavior and per-doc status model approved.
11. `API`: run contracts and idempotency rules approved.
12. `STATE`: run/doc state machines approved.
13. `SECURITY`: table/storage/API access controls approved.
14. `MIGRATION`: Track B migration set reviewed.
15. `WORKSPACE`: persisted-source contract and retention rules approved.

## 5.1 Delivery readiness checklist (implementation start)

These must be materially ready before coding starts:

1. Track B service skeleton exists and pins Python `3.12.x`.
2. Hash utility module for canonical + Track B IDs is selected.
3. Initial migration bundle drafted and reviewed.
4. Taxonomy mapping table + fallback policy drafted and reviewed.
5. API DTOs/request-response schemas drafted.
6. Test harness scaffolded for unit + integration + E2E.

## 5.2 Rollout and rollback requirements

### REQ-ROLLOUT-001: Feature-flagged rollout

Track B must launch behind explicit feature flags.

### REQ-ROLLOUT-002: Safe rollback path

Rollback plan must include:

1. API-level disable switch
2. worker stop switch
3. no-impact guarantee on Track A

### REQ-ROLLOUT-003: Launch quality gates

Before enabling broad access:

1. smoke tests pass
2. integration tests pass
3. representative E2E runs pass for both Transform and Extract
4. preview generation works on supported sample set

## 5.3 Acceptance test matrix (explicit)

Minimum matrix:

1. Flow tests:
   - Transform single doc
   - Transform multi-doc subset
   - Extract single doc with flat schema
   - Extract multi-doc subset with flat schema
2. Preview tests:
   - PDF native preview
   - non-PDF -> preview_pdf conversion
   - preview failure fallback behavior
3. Isolation tests:
   - Track B writes only Track B tables
   - Track A behavior unchanged
4. Workspace persistence tests:
   - uploaded source survives page/session exit
   - run references durable source UID
   - explicit source delete path enforces retention/audit rules
5. Identity tests:
   - canonical ID consistency with existing system
   - Track B UID uniqueness and idempotency
6. Taxonomy tests:
   - raw element type persisted unchanged
   - mapped enum persisted for every block
   - unknown type falls back to safe enum and is observable
7. State machine tests:
   - valid transitions accepted
   - invalid transitions rejected
8. Security tests:
   - unauthorized access blocked
   - project-owner access permitted
9. Enrichment tests:
   - node success artifact persistence
   - node failure isolation and reporting

## 6) Non-goals for initial Track B rollout

These are explicitly out of scope for initial implementation.

1. Full visual workflow graph editor parity with screenshot UX.
2. Full Track A/Track B output merge.
3. Full cross-track taxonomy convergence and shared query-layer abstraction.
4. Preview perfect fidelity for every edge-case format before extraction can ship.

## 7) Change control rule for this document

Any requirement in sections 2-5 is treated as locked unless explicitly changed by user direction.

When changed:

1. Add a dated note.
2. Update affected acceptance conditions.
3. Update migration/service implications before coding.
