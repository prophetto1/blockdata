# Objective Assessment Addendum (No Changes to Originals)

Date: 2026-02-20  
Scope: Objective assessment and strengthening of the existing plan in `docling/docling-full-integration` only.

## Directional Verdict
The existing plan is directionally correct and technically serious, but not yet implementation-ready end-to-end.  
Main issue: contract drift between database schema, edge-function payloads, and frontend controls.

## Evidence Baseline Used
- Conversion service: `services/conversion-service/app/main.py`
- Ingest + callback path: `supabase/functions/ingest/*`, `supabase/functions/conversion-complete/index.ts`
- Runtime policy + upload policy: `supabase/functions/_shared/admin_policy.ts`, `supabase/functions/upload-policy/index.ts`
- Frontend upload flow: `web/src/components/documents/MultiDocumentUploader.tsx`
- Docling reference: `ref-repos/docling/docling/*`
- Live Supabase schema + policy + publication state (queried)

## Objective Checklist: Existing Plan Claims vs Current State

- [x] Correct: Docling pipeline selection is auto-routed by input format.
  Evidence: `ref-repos/docling/docling/document_converter.py:149`, `ref-repos/docling/docling/document_converter.py:163`, `ref-repos/docling/docling/document_converter.py:167`.

- [x] Correct: Current conversion service does not expose profile/enricher controls.
  Evidence: `services/conversion-service/app/main.py:23`, `services/conversion-service/app/main.py:32`.

- [x] Correct: Current callback payload has no parser provenance fields.
  Evidence: `services/conversion-service/app/main.py:294`, `services/conversion-service/app/main.py:303`.

- [x] Correct: Current callback handler does not accept/store parser provenance.
  Evidence: `supabase/functions/conversion-complete/index.ts:10`, `supabase/functions/conversion-complete/index.ts:19`, `supabase/functions/conversion-complete/index.ts:169`.

- [x] Correct: Current extractor discards most Docling-native metadata.
  Evidence: `supabase/functions/_shared/docling.ts:99`, `supabase/functions/_shared/docling.ts:168`, `supabase/functions/_shared/docling.ts:297`.

- [x] Correct: Frontend upload flow currently sends only file + project.
  Evidence: `web/src/components/documents/MultiDocumentUploader.tsx:190`, `web/src/components/documents/MultiDocumentUploader.tsx:193`.

- [x] Correct: `upload-policy` currently returns only file batch/extension policy.
  Evidence: `supabase/functions/upload-policy/index.ts:23`, `supabase/functions/upload-policy/index.ts:26`.

- [x] Correct: Live DB currently lacks parser provenance columns and block raw metadata columns.
  Evidence: live `information_schema.columns` query on `conversion_parsing` and `blocks`.

- [x] Correct: Live DB currently has `source_documents` in `supabase_realtime`.
  Evidence: live publication query showed `source_documents` and `block_overlays`.

- [x] Correct: Live `source_type_catalog` already contains extended values (`asciidoc`, `audio`, `image`, `vtt`, `xml_jats`, `xml_uspto`, `json_docling`, `mets_gbs`).
  Evidence: live catalog query on `public.source_type_catalog`.

- [ ] Needs correction in plan: migration SQL uses non-idempotent realtime statement.
  Evidence: `docling/docling-full-integration/01-database-migration.sql:130`.
  Action: replace with guarded `DO $$` block.

- [ ] Needs correction in plan: callback contract adds `conversion_status/errors/timings` but migration has no destination column.
  Evidence: `docling/docling-full-integration/02-conversion-service-changes.md:459`, `docling/docling-full-integration/01-database-migration.sql:20`.
  Action: add `conversion_meta_json` (or equivalent explicit columns) on `conversion_parsing`.

- [ ] Needs correction in plan: profile regex includes non-PDF profiles without full mapping logic.
  Evidence: `docling/docling-full-integration/02-conversion-service-changes.md:78`, `docling/docling-full-integration/02-conversion-service-changes.md:116`.
  Action: either implement Simple/ASR profile mapping or remove those profile names from accepted regex for this phase.

- [ ] Needs correction in plan: proposed options mapping returns only `InputFormat.PDF`, so `image`/`mets_gbs` are not actually configured.
  Evidence: `docling/docling-full-integration/02-conversion-service-changes.md:195`.
  Action: include `InputFormat.IMAGE` and `InputFormat.METS_GBS` mappings when using PDF-family options.

- [ ] Needs correction in plan: ingest extension/source mapping not expanded for proposed new types.
  Evidence: `supabase/functions/ingest/storage.ts:3`.
  Action: extend `SOURCE_TYPE_BY_EXTENSION` and MIME map in ingest path.

- [ ] Needs correction in plan: idempotency logic is content-keyed only; profile-based reprocessing collides.
  Evidence: `supabase/functions/ingest/index.ts:47`, `supabase/functions/ingest/validate.ts:41`.
  Action: define a reprocess policy (explicit override, version key, or profile-aware identity).

- [ ] Needs correction in plan: overview references docs `03`-`07` that do not exist yet.
  Evidence: `docling/docling-full-integration/00-overview.md:93`.
  Action: add those docs or update overview scope.

## Root Cause of Plan Fragility
The current plan focuses strongly on conversion-service and schema fields, but it under-specifies cross-layer contract compatibility:
1. Ingest request contract (frontend -> ingest -> process-convert -> conversion service)
2. Callback contract (conversion service -> conversion-complete -> DB)
3. Runtime policy contract (`admin_runtime_policy` -> upload-policy -> frontend)
4. Identity/idempotency contract (same bytes, different profile/extender config)

Without those four contracts being explicitly aligned, "all pipelines + extenders" becomes partially implemented and operationally ambiguous.

## Strengthened Requirements (Testable)

1. `SRL-DB-001`: `conversion_parsing` stores parser provenance and conversion metadata for docling track.
   Evidence target: non-null provenance columns on new docling conversions.

2. `SRL-DB-002`: `blocks` stores raw Docling labels and geometry metadata when available.
   Evidence target: non-null `raw_element_type` and `page_no` for paginated docling conversions.

3. `SRL-DB-003`: schema migration is idempotent in live projects already containing realtime/publication entries.
   Evidence target: migration re-run succeeds without failure.

4. `SRL-CONV-001`: conversion-service request accepts profile and enricher configuration with validation.
   Evidence target: accepted request body includes `profile` + `enricher_config`.

5. `SRL-CONV-002`: conversion-service emits callback payload containing parser provenance and conversion metadata for docling track.
   Evidence target: callback body contains parser fields on success.

6. `SRL-EDGE-001`: `conversion-complete` persists parser provenance and conversion metadata.
   Evidence target: inserted `conversion_parsing` row contains parser fields.

7. `SRL-EDGE-002`: `ingest` + `storage` support source types/extensions required for selected Docling scope.
   Evidence target: accepted upload for every extension enabled in policy.

8. `SRL-UI-001`: frontend uploader supports "simple default" and "advanced parser options" modes.
   Evidence target: user can upload without advanced options; advanced users can set profile/extenders.

9. `SRL-UI-002`: frontend shows parser provenance for ingested documents.
   Evidence target: document detail includes parsing tool, profile, pipeline family, options hash.

10. `SRL-IDEMP-001`: repeated uploads of same bytes with different parser config have deterministic behavior by policy.
    Evidence target: explicit response behavior documented and enforced in `checkIdempotency`.

## Required Database Changes (Precise)

1. `conversion_parsing` add columns (nullable):
- `parser_version text`
- `parser_pipeline_family text`
- `parser_profile_name text`
- `parser_backend_name text`
- `parser_input_format text`
- `parser_input_mime text`
- `parser_options_json jsonb`
- `parser_options_hash text`
- `parser_extenders_json jsonb`
- `conversion_meta_json jsonb`  (aligns with callback `conversion_status/errors/timings/confidence`)
- `created_at timestamptz default now()` (if still absent)

2. `blocks` add columns (nullable):
- `raw_element_type text`
- `raw_group_type text`
- `raw_item_ref text`
- `page_no integer`
- `coordinates_json jsonb`
- `parser_metadata_json jsonb`

3. `documents_view` include new `conversion_parsing` provenance fields (read-only surface for frontend).

4. Indexes:
- `conversion_parsing(source_uid)`
- `blocks(page_no) where page_no is not null`
- `blocks(raw_element_type) where raw_element_type is not null`

5. Realtime publication statement must be guarded (idempotent) because live DB already includes `source_documents`.

## Required Conversion Service + Edge Function Changes

1. Conversion service (`services/conversion-service/app/main.py`):
- Extend `ConvertRequest` with `profile` and `enricher_config`.
- Extend `source_type` validation only to the scope actually supported by ingest + policy in this phase.
- Build effective Docling options by source family (PDF/Image/METS, Simple, ASR as scoped).
- Emit parser provenance + conversion metadata in callback payload.
- Keep mdast/pandoc behavior backward compatible.

2. Ingest path (`supabase/functions/ingest/*`):
- Parse and forward profile/enricher fields.
- Expand extension/source mapping in `storage.ts`.
- Extend runtime policy schema for parser options exposure (if controlled centrally).

3. Callback path (`supabase/functions/conversion-complete/index.ts`):
- Extend callback body type with parser metadata fields.
- Persist provenance fields into `conversion_parsing`.
- Persist conversion-level metadata into `conversion_meta_json`.
- Continue storing supplemental artifacts into `conversion_representations`.

4. Docling extractor (`supabase/functions/_shared/docling.ts`):
- Preserve raw labels/group refs/page/coordinates into new block columns.
- Keep existing mapped `block_type` behavior unchanged for downstream compatibility.

5. Upload policy (`supabase/functions/upload-policy/index.ts`):
- Expose parser configuration catalog for frontend advanced controls (profiles + extenders per source family).

## Frontend Setup (Best Practical Pattern)

1. Keep default flow unchanged:
- User uploads with no parser options; system applies runtime defaults.

2. Add advanced panel in uploader:
- Visible toggle "Advanced conversion options".
- Inputs gated by source type family:
  - profile selector
  - extenders toggles
  - optional layout/table mode where applicable

3. Submit contract:
- send `profile` and `enricher_config` along with file and project.

4. Document detail display:
- parsing tool
- parser pipeline family
- parser profile name
- options hash
- selected extenders summary

5. Do not block run pipeline UX:
- existing run/worker pages remain independent of parser provenance.

## Mandatory Clarifications Before Implementation

1. Scope decision for this phase:
- Include only auto-selected Docling pipelines (StandardPdfPipeline, SimplePipeline, AsrPipeline), or
- Also include explicit VLM pipeline mode.

2. Idempotency decision:
- For same bytes + same owner + different profile/extender config, should behavior be:
  - return existing,
  - create new conversion attempt, or
  - require explicit "force reprocess" flag.

3. Supported upload extensions in this phase:
- runtime policy currently allows only a subset in `upload.allowed_extensions`;
- expansion must be synchronized across ingest mapping + policy + UI.

## Minimal Corrections to Existing Plan Files (Without Rewriting Them)

1. Keep `00-overview.md` as-is, but add this addendum as governing clarification.
2. Apply corrections listed above before executing `01-database-migration.sql`.
3. Treat `02-conversion-service-changes.md` as partial until Simple/ASR + image/mets mapping and callback persistence are aligned.

---

This addendum intentionally does not modify original plan files.
