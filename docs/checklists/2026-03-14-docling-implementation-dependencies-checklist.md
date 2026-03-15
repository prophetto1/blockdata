# Docling Implementation Dependencies Checklist

Reviewed on `2026-03-14`.

Legend:
- `[x]` Source-verified in this repo
- `[ ]` Not verified in this repo, not implemented yet, or depends on external runtime configuration

## 1. Core parse orchestration

- [x] Supabase has a dedicated parse trigger entrypoint.
  Verification: [trigger-parse/index.ts](e:\writing-system\supabase\functions\trigger-parse\index.ts#L1) accepts `source_uid`, validates ownership and document state, resolves `pipeline_config`, creates signed URLs, and posts to `${CONVERSION_SERVICE_URL}/convert`.

- [x] Supabase has a dedicated conversion callback endpoint.
  Verification: [conversion-complete/index.ts](e:\writing-system\supabase\functions\conversion-complete\index.ts#L1) accepts the callback, validates `X-Conversion-Service-Key`, persists parse results, writes artifacts, inserts blocks, and updates `source_documents.status`.

- [x] Parsing is explicitly Docling-only in the current live data model.
  Verification: [20260313220000_081_docling_only_parsing.sql](e:\writing-system\supabase\migrations\20260313220000_081_docling_only_parsing.sql#L1) removes non-Docling parsed data and constrains parsing state to Docling-only outputs.

- [x] Parse dispatch from the web app exists.
  Verification: [useBatchParse.ts](e:\writing-system\web\src\hooks\useBatchParse.ts#L1) posts `source_uid`, `profile_id`, and `pipeline_config` to `trigger-parse`.

## 2. Required platform secrets and service wiring

- [x] The repo declares the required Supabase-side conversion service secrets.
  Verification: [README.md](e:\writing-system\supabase\functions\README.md#L29) lists `CONVERSION_SERVICE_URL` and `CONVERSION_SERVICE_KEY` as required env vars, alongside `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DOCUMENTS_BUCKET`.

- [ ] The conversion service is actually deployed, reachable, and correctly configured in the target runtime.
  Verification: the repo references `CONVERSION_SERVICE_URL`, but the live service deployment and secret values are not visible here. There is no source proof in this workspace that the external service is up or healthy.

- [ ] The callback shared secret is configured identically on both sides.
  Verification: [conversion-complete/index.ts](e:\writing-system\supabase\functions\conversion-complete\index.ts#L84) requires `X-Conversion-Service-Key`, but the external service configuration is not present in this repo.

- [ ] Supabase Storage permissions and bucket config are correctly set in the runtime environment.
  Verification: [trigger-parse/index.ts](e:\writing-system\supabase\functions\trigger-parse\index.ts#L100) depends on signed download and upload URLs for source, markdown, Docling JSON, HTML, and doctags. The code exists, but live bucket policy correctness is not proven here.

## 3. Runtime policy and routing

- [x] Runtime policy defaults route supported source types to the Docling track.
  Verification: [admin_policy.ts](e:\writing-system\supabase\functions\_shared\admin_policy.ts#L60) defines Docling-supported extensions and default `extension_track_routing`.

- [x] Admin policy migrations pin the current parser routing to Docling.
  Verification: [20260313220000_081_docling_only_parsing.sql](e:\writing-system\supabase\migrations\20260313220000_081_docling_only_parsing.sql#L59) updates `upload.track_enabled`, `upload.extension_track_routing`, and `upload.parser_artifact_source_types` to Docling-only values.

- [x] Parser artifact source types are defined for Docling outputs.
  Verification: [admin_policy.ts](e:\writing-system\supabase\functions\_shared\admin_policy.ts#L91) and [20260313220000_081_docling_only_parsing.sql](e:\writing-system\supabase\migrations\20260313220000_081_docling_only_parsing.sql#L85) define which source types should receive Docling artifact upload targets.

## 4. Database persistence model

- [x] The platform has tables for parsed document metadata, blocks, and representation artifacts.
  Verification: [conversion-complete/index.ts](e:\writing-system\supabase\functions\conversion-complete\index.ts#L280) upserts into `conversion_parsing`, inserts into `blocks`, and records artifacts through `insertRepresentationArtifact()`.

- [x] The read-model used by the UI exposes parse metadata plus `pipeline_config`.
  Verification: [20260314000000_084_view_documents_add_pipeline_config.sql](e:\writing-system\supabase\migrations\20260314000000_084_view_documents_add_pipeline_config.sql#L1) adds `cp.pipeline_config` to `view_documents`.

- [ ] The database can distinguish requested profile config from applied runtime config.
  Verification: the current schema only exposes `pipeline_config` in [20260314000000_084_view_documents_add_pipeline_config.sql](e:\writing-system\supabase\migrations\20260314000000_084_view_documents_add_pipeline_config.sql#L1). There is no source-verified `requested_pipeline_config`, `applied_pipeline_config`, or `parser_runtime_meta` yet.

## 5. Docling artifact contract

- [x] The parse callback expects and persists a Docling JSON artifact.
  Verification: [conversion-complete/index.ts](e:\writing-system\supabase\functions\conversion-complete\index.ts#L231) fails legacy callbacks without `docling_key`, then uses the Docling JSON as the authoritative parse artifact.

- [x] The platform persists Docling supplemental exports.
  Verification: [trigger-parse/index.ts](e:\writing-system\supabase\functions\trigger-parse\index.ts#L118) creates signed upload targets for `.docling.json`, `.html`, and `.doctags`, and [conversion-complete/index.ts](e:\writing-system\supabase\functions\conversion-complete\index.ts#L173) persists these as supplemental representations.

- [x] Blocks are reconstructed from Docling JSON, not just callback metadata.
  Verification: [conversion-complete/index.ts](e:\writing-system\supabase\functions\conversion-complete\index.ts#L278) downloads `docling_key`, computes `conv_uid`, and runs `extractDoclingBlocks(doclingBytes)`.

- [x] Block locators use Docling pointer semantics.
  Verification: [conversion-complete/index.ts](e:\writing-system\supabase\functions\conversion-complete\index.ts#L348) inserts block locators with `type: "docling_json_pointer"` and stores `pointer`, `parser_block_type`, and `parser_path`.

- [ ] The external conversion service is proven to emit a callback payload shape fully compatible with this contract in all profile modes.
  Verification: the receiving contract is visible in this repo, but the conversion service implementation is not present here.

## 6. Parsing profiles and config propagation

- [x] A `parsing_profiles` table exists and is seeded with Docling profiles.
  Verification: [20260310120000_075_parsing_pipeline_config.sql](e:\writing-system\supabase\migrations\20260310120000_075_parsing_pipeline_config.sql#L1) creates `parsing_profiles` and seeds `Fast`, `Balanced`, `High Quality`, and `AI Vision`.

- [x] The web UI can select and send a parsing profile.
  Verification: [ParseTabPanel.tsx](e:\writing-system\web\src\components\documents\ParseTabPanel.tsx#L74) loads profiles from `parsing_profiles`, chooses a default, and updates `configText` from the selected profile.

- [x] `trigger-parse` resolves saved profile config and forwards it to the conversion service.
  Verification: [trigger-parse/index.ts](e:\writing-system\supabase\functions\trigger-parse\index.ts#L52) loads `parsing_profiles.config`, decorates it with `_profile_id` and `_profile_name`, and includes it in the `/convert` body.

- [x] The current parse result model stores the forwarded profile config.
  Verification: [conversion-complete/index.ts](e:\writing-system\supabase\functions\conversion-complete\index.ts#L300) persists `pipeline_config: body.pipeline_config ?? {}` into `conversion_parsing`.

- [ ] The repo proves that the conversion runtime actually applies the selected profile.
  Verification: not source-verified. This workspace shows UI selection and config forwarding, but not the external service logic that maps `pipeline_config` into real Docling runtime options.

## 7. OCR backends and layout pipeline dependencies

- [x] The seeded `Fast` profile requests Tesseract OCR and Heron layout.
  Verification: [20260310120000_075_parsing_pipeline_config.sql](e:\writing-system\supabase\migrations\20260310120000_075_parsing_pipeline_config.sql#L24) sets `"ocr_options": { "kind": "tesseract" }` and `"layout_options": { "model": "heron" }`.

- [x] The seeded `Balanced` profile requests EasyOCR and Heron layout.
  Verification: [20260310120000_075_parsing_pipeline_config.sql](e:\writing-system\supabase\migrations\20260310120000_075_parsing_pipeline_config.sql#L40) sets `"ocr_options": { "kind": "easyocr" }` and `"layout_options": { "model": "heron" }`.

- [x] The seeded `High Quality` profile requests EasyOCR plus more expensive table and enrichment options.
  Verification: [20260310120000_075_parsing_pipeline_config.sql](e:\writing-system\supabase\migrations\20260310120000_075_parsing_pipeline_config.sql#L57) sets accurate table mode, code enrichment, formula enrichment, and picture-image generation.

- [ ] Tesseract is actually installed and configured in the conversion runtime.
  Verification: required by the `Fast` profile config, but no conversion-service runtime or deployment manifest is present in this workspace.

- [ ] EasyOCR is actually installed and configured in the conversion runtime.
  Verification: required by the `Balanced` and `High Quality` profile configs, but not source-verified here.

- [ ] The Heron layout model and any associated Docling runtime assets are available in the conversion environment.
  Verification: referenced in profile JSON, but not proven by any code in this repo.

## 8. VLM and enrichment-model dependencies

- [x] The seeded `AI Vision` profile requests the Docling `vlm` pipeline.
  Verification: [20260310120000_075_parsing_pipeline_config.sql](e:\writing-system\supabase\migrations\20260310120000_075_parsing_pipeline_config.sql#L80) sets `"pipeline": "vlm"` and a `vlm_pipeline` block with `"preset": "granite_docling"`.

- [x] Some seeded profiles request AI-style enrichments beyond plain OCR parsing.
  Verification: [20260310120000_075_parsing_pipeline_config.sql](e:\writing-system\supabase\migrations\20260310120000_075_parsing_pipeline_config.sql#L53) enables `do_picture_classification`, and [20260310120000_075_parsing_pipeline_config.sql](e:\writing-system\supabase\migrations\20260310120000_075_parsing_pipeline_config.sql#L73) enables `do_picture_description` and `do_chart_extraction`.

- [ ] The runtime declares which provider or model implements `granite_docling` or any VLM path used by `AI Vision`.
  Verification: not source-verified. The preset name appears only in profile JSON in this repo.

- [ ] The runtime declares which provider or model implements picture classification.
  Verification: not source-verified. The profile asks for it, but no implementation is visible here.

- [ ] The runtime declares which provider or model implements picture description.
  Verification: not source-verified. The profile asks for it, but no implementation is visible here.

- [ ] The runtime declares which provider or model implements chart extraction.
  Verification: not source-verified. The profile asks for it, but no implementation is visible here.

- [ ] The system has a readiness check that prevents selecting unrunnable VLM or enrichment-backed profiles.
  Verification: not implemented in this repo yet. The current Parse UI loads profiles and dispatches them without any runtime dependency gate ([ParseTabPanel.tsx](e:\writing-system\web\src\components\documents\ParseTabPanel.tsx#L74), [useBatchParse.ts](e:\writing-system\web\src\hooks\useBatchParse.ts#L29)).

## 9. Frontend visibility and operator feedback

- [x] The UI can show which profile config was selected for a parse.
  Verification: [ParseConfigColumn.tsx](e:\writing-system\web\src\components\documents\ParseConfigColumn.tsx#L58) reads the selected profile and displays its name, description, and pipeline label.

- [x] The UI can load parsed Docling JSON artifacts for inspection.
  Verification: [ParseTabPanel.tsx](e:\writing-system\web\src\components\documents\ParseTabPanel.tsx#L108) signs and opens the `.docling.json` artifact for the selected document.

- [ ] The UI can show requested profile vs applied runtime vs actual OCR or model backend used.
  Verification: not implemented. The current `view_documents` shape only exposes `pipeline_config`, not applied runtime evidence.

- [ ] The UI can tell the user before dispatch that a chosen profile is unrunnable because a backend dependency is missing.
  Verification: not implemented. The current flow does not check OCR, VLM, or enrichment-model readiness before starting parse.

## 10. Optional downstream integrations

- [x] Arango sync hooks exist for parsed Docling documents.
  Verification: [conversion-complete/index.ts](e:\writing-system\supabase\functions\conversion-complete\index.ts#L393) calls `syncParsedDocumentToArango(...)` when Arango sync is enabled.

- [ ] Arango runtime config is actually present and healthy in the target environment.
  Verification: [README.md](e:\writing-system\supabase\functions\README.md#L42) declares the required Arango env vars, but the live environment is not visible here.

## 11. Bottom line

- [x] The repo proves that the platform-side Docling orchestration exists.
  Verification: `trigger-parse`, `conversion-complete`, Docling-only migrations, seeded profiles, artifact persistence, and UI plumbing are all present in this workspace.

- [ ] The repo proves that Docling is fully and correctly implemented end-to-end for all profiles.
  Verification: not proven. The missing proof points are the external conversion service implementation, OCR and VLM runtime availability, enrichment-model availability, and requested-versus-applied runtime evidence.
