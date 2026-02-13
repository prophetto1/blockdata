## Reflections on Current Development State

At this stage, I want to focus on two priority areas.

## Issue 1: Pipeline Sequencing and Integration Contracts

1. Post-ingest integration work should be sequenced after core pipeline hardening and ingest-track extensions.
2. Even though full integrations are deferred, we still need a high-level but precise integration output contract now.
3. The goal is to ensure current system outputs are compatible with downstream integrations and do not require redesign later.

Reference repos for integration shape and pipeline patterns:
- `E:\writing-system\ref-repos\unstructured-ingest`
- `E:\writing-system\ref-repos\unstructured`

## User-Centered Ingest Experience

1. From the user perspective, the workflow is: create a project, upload files, monitor processing, and review completion status.
2. Users should not need to understand internal representation tracks (`mdast`, `docling JSON`, `pandoc AST`).
3. UI feedback should clearly show per-file progress and status (`processing`, `complete`, `failed`) during multi-file upload.
4. Upload progress can be implemented either as:
- a modal/layer progress experience, or
- an in-page project document grid (for example, AG Grid) with inline progress indicators.

## Project Page Information Architecture Refactor

Current view reference: `E:\writing-system\dev-todos\image.png`

1. The current side-by-side Documents/Runs layout should be refactored.
2. The Projects page should use a document-first master/detail layout:
- Left pane: uploaded document list.
- Right pane (wider): grid/detail view for the selected document.
3. Right-pane content should switch based on the active selection in the left pane.
4. The right-pane grid should keep header and row index fixed/sticky while content updates.

### Left Pane Component Choice

1. The left document list does not need to use AG Grid.
2. The left pane should prioritize fast selection, clear status visibility, and low complexity.
3. A lightweight list/table implementation is preferred for the left pane.
4. AG Grid should remain focused on the right pane where block-level grid capabilities are required.

## Run Execution Model

1. Runs should not be presented as a permanent side column in this view.
2. Runs should be initiated as explicit actions on selected documents.
3. The document table should include stable metadata columns (for example: source format, source file size, and ingest status).
4. Bulk and manual selection controls should be first-class at the table header/row level.

## Issue 2 (MISSION CRITICAL): Pipeline Hardening

1. Make intermediary artifacts truly multi-artifact, not single-artifact.
- We have already made parser representations first-class (`conversion_representations_v2`) (`20260213153000_019_ingest_tracks_policy_pandoc_representation.sql:33`).
- Current schema/insert path allows only one representation per `conv_uid` (`20260213153000_019_ingest_tracks_policy_pandoc_representation.sql:36`, `representation.ts:29`).
- Next step: multi-artifact support per conversion (and optional multi-conversion history per source), not only one artifact row per `conv_uid`.
- Source document uploaded -> parsed into intermediary artifact (currently 3: mdast, pandoc AST, docling JSON) -> transformed to destination-ready artifacts.
- A document should support multiple downstream pipelines (for example: knowledge base, vector DB, database table, md/csv export).
- For the new direction (`md/json/csv/yaml/parquet`, etc.), this is the next bottleneck.

2. Add explicit source adapter contracts (storage + DB), not just upload.
- In several docs/discussions, integrations are framed as source integrations and destination integrations, with BlockData as the hub.
- "Source" means anything that can feed pipeline input: storage systems (Google Drive, Dropbox), databases, and structured file stores.
- If we can parse it, it should be pluggable.
- Current ingest entry is still file-upload centric (`index.ts:29`).
- Unstructured's indexer/downloader split is a useful pattern (`connector_development.md:261`, `indexer.py:18`, `downloader.py:32`).

3. Borrow/reference Unstructured patterns.
- `E:\writing-system\ref-repos\unstructured-ingest`
- `E:\writing-system\ref-repos\unstructured`
- Add destination staging contracts per integration class.
- Our canonical JSONL boundary is strong, but not sufficient for all downstream shapes (`0209-downstream-integration-pipelines.md:202`, `export-jsonl/index.ts:122`).
- Unstructured's stager/uploader split is a strong pattern for downstream transforms (`upload_stager.py:22`, `connector_development.md:189`).
- It enables format/shape normalization before destination-specific writes (Neo4j, webhook, DuckDB/Parquet, etc.).

4. Other important points.
- 4.1 Improve routing from extension-only to extension+content detection. Current routing is policy + extension (`routing.ts:14`). Unstructured routes with file-type detection fallback (`auto.py:166`). This reduces bad routes from mislabeled files.
- 4.2 Move from single sidecar assumption to artifact manifest. Callback currently rejects multiple sidecars (`conversion-complete/index.ts:84`). Future pipeline needs multiple artifacts per conversion (parser IR + normalized IR + destination-ready views). Unstructured's per-step cached outputs are a useful model (`connector_development.md:56`, `partition.py:40`).
- 4.3 Security/ops hardening for connector era. Current sanitize layer is filename-level (`sanitize.ts:1`). Unstructured has explicit secret-bearing connection configs + log sanitization (`connector.py:21`, `sanitizer.py:80`).
- 4.4 Correction note: Unstructured OSS chunking is not character-only. It also supports token-aware options (`max_tokens`, `new_after_n_tokens`, `tokenizer`) in core chunking APIs.
