# Unstructured Track B Handoff (Final Review)

Last updated: 2026-02-14
Owner context: continuation handoff for Track B planning and implementation kickoff

## 1) Mission

This handoff captures the final reviewed state of the Track B documentation so implementation can begin without re-litigating scope.

Primary intent:

1. Preserve locked decisions exactly.
2. Prevent scope drift and terminology drift.
3. Start implementation in a deterministic order.

## 2) Canonical source documents

These are the two authoritative planning artifacts:

1. `docs/analysis/unstructured-track-requirements-lock.md`
2. `docs/analysis/unstructured-full-pipeline-analysis-implementation-plan.md`

Use rule:

1. `requirements-lock` is the source of truth for requirements contracts.
2. `implementation-plan` is execution sequencing and integration mapping.
3. If conflict appears, resolve to `requirements-lock`, then patch `implementation-plan`.

## 3) Final review outcome

Overall assessment: strong and implementation-ready after targeted corrections.

Resolved during this pass:

1. Enrichment contract ambiguity fixed:
   - moved from provider-only implication to explicit hybrid model.
   - now aligned with accepted direction:
     - `table_to_html`: OSS baseline + optional provider upgrade.
     - `ocr_enrichment`: baseline OCR path + optional provider upgrade.
     - `image_summarizer`: provider-backed.
2. Run status enum drift fixed in implementation plan:
   - added `partial_success` to plan table status list.
3. Section numbering glitch fixed:
   - corrected misplaced `13.1` subsection to `11.1`.

## 4) Files updated in this review cycle

1. `docs/analysis/unstructured-track-requirements-lock.md`
   - `REQ-ENRICH-001` rewritten to hybrid model.
   - new `REQ-ENRICH-003` added for pluggable provider upgrades and prompt versioning.
   - pre-implementation gate enrichment line updated to hybrid wording.
2. `docs/analysis/unstructured-full-pipeline-analysis-implementation-plan.md`
   - `unstructured_workflow_runs_v2.status` set to `queued|running|partial_success|success|failed|cancelled`.
   - enrichment section updated to hybrid behavior.
   - subsection numbering corrected to `### 11.1 Enrichment implementation path (fixed)`.

## 5) Locked decisions (do not change without explicit user direction)

## 5.1 Architecture

1. Dual-track is mandatory: Track A and Track B are separate initially.
2. No initial track mixing.
3. No shared output normalization initially.

## 5.2 Data and identity

1. Track B has separate output tables:
   - `unstructured_documents_v2`
   - `unstructured_blocks_v2`
   - `unstructured_representations_v2`
2. Track B has separate control-plane tables:
   - `unstructured_workflows_v2`
   - `unstructured_workflow_runs_v2`
   - `unstructured_run_docs_v2`
   - `unstructured_step_artifacts_v2`
3. Canonical identity semantics match Track A.
4. Track B physical UIDs remain separate for now.
5. Raw upstream element IDs/types are preserved.

## 5.3 Taxonomy and schema

1. Raw Unstructured types must map to Track B enum (`platform_block_type`) for operation.
2. Raw taxonomy is preserved in parallel (`raw_element_type`, raw metadata).
3. User Schema JSON is flat, top-level only, one-level deep.
4. Upload schema path and visual Define Schema path produce the same canonical schema object.

## 5.4 Flow and UX contracts

1. Transform and Extract are separate backend flows/routes/contracts.
2. UI can use a tab-like switch, but backend stages remain explicit.
3. Workflow builder MVP uses templates/configs first, not full graph editor.

## 5.5 Preview and enrichers

1. Visual preview is required by default for accepted upload formats.
2. Preferred preview strategy is PDF normalization (`preview_pdf`) for non-PDFs.
3. Extraction must not fail solely due preview failure.
4. Enrichment model is hybrid:
   - OSS baseline where available.
   - provider-backed upgrades optional and pluggable.

## 5.6 Runtime and security

1. Track B runtime is Python 3.12.x, isolated from Track A runtime.
2. Workspace membership check precedes project/document checks.
3. Workspace-scoped storage prefixes are required.
4. Auditability is required for create/cancel/workflow-edit/schema-run actions.

## 6) Non-negotiable user guardrails

These came directly from user direction and must be enforced in future sessions:

1. Do not add MCP/tools/features not explicitly discussed and approved.
2. Do not collapse Track A and Track B during initial rollout.
3. Keep table separation and UID separation for now, with future interop readiness.
4. Preserve terminology:
   - `User Schema JSON`
   - `Source Document JSONs`
5. Track B should support multi-document runs and subset selection; do not force one-file-only behavior.

## 7) Workspace/repo safety notes for next session

1. Worktree is very dirty with many unrelated modified/untracked files.
2. Restrict edits to the Track B target files for each task.
3. Do not revert unrelated changes.
4. Prefer additive changes and new files for Track B migrations/services.

## 8) Implementation start sequence (next session)

Execute in this order:

1. Runtime foundation:
   - scaffold `services/unstructured-track-service` pinned to Python `3.12.x`.
2. Migration foundation:
   - add Track B control-plane and output tables.
   - include canonical compatibility fields from day one.
3. API contract:
   - implement run-create endpoint with required `Idempotency-Key`.
   - enforce idempotency replay/conflict behavior.
4. State machines:
   - enforce run and doc transitions as locked in requirements doc.
5. Partition adapter:
   - integrate `unstructured-api`/`unstructured` contract.
   - persist raw elements + mapped taxonomy.
6. Preview pipeline:
   - generate and persist preview artifacts; hook status model (`pending|ready|failed`).
7. Extract path:
   - wire flat User Schema JSON contract to Track B extract runs.
8. Enrichment:
   - implement hybrid baseline path first.
   - add provider upgrade adapters second.

## 9) Minimum verification gates before claiming implementation complete

1. Track B writes only Track B tables.
2. Track A behavior remains unchanged.
3. Multi-document subset runs pass.
4. `partial_success` behavior works and is observable.
5. Taxonomy mapping persists mapped + raw fields together.
6. Preview failure does not block extraction success.
7. Idempotency contract behaves as specified (`202`, `200`, `409`, `400` cases).

## 10) Known follow-up items (not blockers)

1. Optional cleanup: remove conversational inline notes from requirements text to keep style fully formal.
2. Optional extension: fold additional downloaded Unstructured repos into the same extraction-point matrix once analyzed.
3. Optional future: convergence design for Track A/Track B outputs after stabilization.

## 11) Handoff close state

Current readiness: documentation is now consistent enough to begin implementation work directly.

If any future contradiction appears:

1. patch `docs/analysis/unstructured-track-requirements-lock.md` first,
2. then patch `docs/analysis/unstructured-full-pipeline-analysis-implementation-plan.md`,
3. then append a short dated note in this handoff file.
