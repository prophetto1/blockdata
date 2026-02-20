# Implementation Sequence and Dependency Map

---

## Dependency Graph

```
Phase 1 (DB Migration)
  │
  ├──────────────────────────────────┐
  │                                  │
  ▼                                  ▼
Phase 2 (Conversion Service)    Phase 3 (Edge Functions)
  │                                  │
  └──────────┬───────────────────────┘
             │
             ▼
        Phase 4 (Frontend)
```

- Phase 1 has no dependencies — apply immediately
- Phases 2 and 3 both depend on Phase 1 but are independent of each other
- Phase 2 and 3 can be developed in parallel
- Phase 3 works without Phase 2 (new columns stay NULL until conversion service sends provenance)
- Phase 4 depends on Phase 1 (columns exist) and Phase 3 (data flows through)

---

## Phase 1: Database Migration

**Risk:** Zero. All new columns nullable. No data migration.
**Estimated effort:** 1 migration, apply via Supabase dashboard or CLI.

### Steps

| # | Action | File | Verify |
|---|---|---|---|
| 1.1 | Apply migration SQL | `01-database-migration.sql` | `SELECT column_name FROM information_schema.columns WHERE table_name = 'blocks'` shows 12 columns |
| 1.2 | Verify conversion_parsing has 18 columns | — | `SELECT column_name FROM information_schema.columns WHERE table_name = 'conversion_parsing'` shows 18 columns |
| 1.3 | Verify documents_view recreated | — | `SELECT * FROM documents_view LIMIT 1` includes parser_version etc. (all NULL for existing rows) |
| 1.4 | Verify realtime publication | — | `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'` includes source_documents |
| 1.5 | Verify catalog entries | — | `SELECT * FROM document_status_catalog` includes partial_success |
| 1.6 | Verify PostgREST cache reloaded | — | API calls return new columns |

### Rollback

```sql
-- Safe to roll back: drop new columns (data loss only for new columns, which are all NULL)
ALTER TABLE blocks
  DROP COLUMN IF EXISTS raw_element_type,
  DROP COLUMN IF EXISTS raw_group_type,
  DROP COLUMN IF EXISTS raw_item_ref,
  DROP COLUMN IF EXISTS page_no,
  DROP COLUMN IF EXISTS coordinates_json,
  DROP COLUMN IF EXISTS parser_metadata_json;

ALTER TABLE conversion_parsing
  DROP COLUMN IF EXISTS parser_version,
  DROP COLUMN IF EXISTS parser_pipeline_family,
  DROP COLUMN IF EXISTS parser_profile_name,
  DROP COLUMN IF EXISTS parser_backend_name,
  DROP COLUMN IF EXISTS parser_input_format,
  DROP COLUMN IF EXISTS parser_input_mime,
  DROP COLUMN IF EXISTS parser_options_json,
  DROP COLUMN IF EXISTS parser_options_hash,
  DROP COLUMN IF EXISTS parser_extenders_json;
```

---

## Phase 2: Conversion Service

**Risk:** Medium. Docker rebuild, new Docling options API surface.
**Estimated effort:** 2-3 sessions. Python changes + Docker rebuild + testing.

### Steps

| # | Action | File | Verify |
|---|---|---|---|
| 2.1 | Expand source_type regex | `services/conversion-service/app/main.py` | Unit test: new source types accepted |
| 2.2 | Add `DoclingEnricherConfig` Pydantic model | `main.py` | Unit test: defaults correct |
| 2.3 | Add `profile` and `enricher_config` to `ConvertRequest` | `main.py` | Unit test: validation works |
| 2.4 | Implement `_build_pipeline_options()` | `main.py` | Unit test: each profile produces correct options |
| 2.5 | Implement `_extract_parser_provenance()` | `main.py` | Unit test: provenance dict shape correct |
| 2.6 | Implement `_extract_conversion_metadata()` | `main.py` | Unit test: timings/errors captured |
| 2.7 | Update `_convert()` to return provenance + metadata | `main.py` | Integration test: full pipeline |
| 2.8 | Update `/convert` endpoint callback payload | `main.py` | Integration test: callback includes provenance |
| 2.9 | Update `SOURCE_SUFFIX_BY_TYPE` for new formats | `main.py` | Unit test |
| 2.10 | Update Docker warmup for code/formula models | `warmup.py` | Docker build succeeds |
| 2.11 | Rebuild Docker image | `Dockerfile` | `docker build` succeeds |
| 2.12 | Run test suite | `tests/test_main.py` | All tests pass |
| 2.13 | Deploy to Cloud Run / container host | — | Health check passes |
| 2.14 | Test end-to-end: upload PDF, verify callback | — | Callback contains parser_provenance |

### Testing strategy

1. **Unit tests** for each new function (profile resolution, options building, provenance extraction)
2. **Integration test** with a real PDF: upload → convert → verify callback payload
3. **Backwards compatibility test**: send request without `profile`/`enricher_config` → defaults work
4. **New format test**: upload image, asciidoc, xml → conversion succeeds

---

## Phase 3: Edge Functions

**Risk:** Low. Additive TypeScript changes. Backwards-compatible.
**Estimated effort:** 1-2 sessions. TypeScript changes + deploy.

### Steps

| # | Action | File | Verify |
|---|---|---|---|
| 3.1 | Update `DoclingBlockDraft` type | `_shared/docling.ts` | TypeScript compiles |
| 3.2 | Update `DoclingTextItem` type with optional fields | `_shared/docling.ts` | TypeScript compiles |
| 3.3 | Update `DoclingPictureItem` type with meta | `_shared/docling.ts` | TypeScript compiles |
| 3.4 | Update `resolveAndEmit()` for text items | `_shared/docling.ts` | Unit test: raw_element_type populated |
| 3.5 | Update `resolveAndEmit()` for table items | `_shared/docling.ts` | Unit test: table metadata captured |
| 3.6 | Update `resolveAndEmit()` for picture items | `_shared/docling.ts` | Unit test: classification/description captured |
| 3.7 | Update `resolveAndEmit()` for kv/form items | `_shared/docling.ts` | Unit test |
| 3.8 | Update `ConversionCompleteBody` type | `conversion-complete/index.ts` | TypeScript compiles |
| 3.9 | Update docling branch: insert provenance into conversion_parsing | `conversion-complete/index.ts` | Manual test: provenance persisted |
| 3.10 | Update docling branch: insert new block columns | `conversion-complete/index.ts` | Manual test: page_no, raw_element_type populated |
| 3.11 | Update docling branch: enrich artifact_meta | `conversion-complete/index.ts` | Manual test: artifact_meta has parser subset |
| 3.12 | Update docling branch: handle partial_success | `conversion-complete/index.ts` | Manual test: status maps correctly |
| 3.13 | Update process-convert.ts: forward profile | `ingest/process-convert.ts` | Manual test: profile in request body |
| 3.14 | Update admin_policy.ts: add new policy keys | `_shared/admin_policy.ts` | Unit test: defaults correct |
| 3.15 | Insert default policy rows | SQL or admin-config | Verify in admin_runtime_policy table |
| 3.16 | Run docling.test.ts | — | All tests pass |
| 3.17 | Deploy edge functions | `supabase functions deploy` | Health check passes |
| 3.18 | End-to-end test: upload PDF → verify blocks have page_no | — | Blocks query shows page_no |

### Testing strategy

1. **Unit tests** for `_shared/docling.ts` with fixture DoclingDocument JSONs
2. **Manual end-to-end**: upload → convert → verify DB state
3. **Backwards compatibility**: old-format callback (no parser_provenance) still works
4. **Null safety**: pandoc/mdast tracks leave new columns NULL

---

## Phase 4: Frontend

**Risk:** Low. Read-only UI additions.
**Estimated effort:** 1-2 sessions. React component changes.

### Steps

| # | Action | File | Verify |
|---|---|---|---|
| 4.1 | Update useBlocks hook to fetch new columns | `hooks/useBlocks.ts` | Data includes page_no, raw_element_type |
| 4.2 | Add page_no column to grid | `BlockViewerGrid.tsx` | Column appears for PDF documents |
| 4.3 | Add raw_element_type column (hidden by default) | `BlockViewerGrid.tsx` | Column toggleable |
| 4.4 | Add raw_group_type column (hidden by default) | `BlockViewerGrid.tsx` | Column toggleable |
| 4.5 | Add coordinates column (hidden by default) | `BlockViewerGrid.tsx` | Tooltip shows bbox |
| 4.6 | Create ConversionDetailPanel component | `components/conversion/ConversionDetailPanel.tsx` | Shows parser version, pipeline, enrichers |
| 4.7 | Integrate panel into ProjectDetail page | `pages/ProjectDetail.tsx` | Panel visible when document selected |
| 4.8 | Extend upload format mapping | Upload component | New extensions accepted |
| 4.9 | Add Docling settings section to admin page | `pages/AdminConfig.tsx` | Profile selector and enricher toggles work |
| 4.10 | Verify realtime subscription works | `pages/ProjectDetail.tsx` | Status updates appear without page refresh |

---

## Deployment Order (Production)

```
Day 1:  Apply Phase 1 (database migration)
        → Zero risk, immediate
        → Verify: new columns exist, documents_view works, realtime publication includes source_documents

Day 2+: Develop Phase 2 (conversion service) and Phase 3 (edge functions) in parallel
        → Phase 3 can deploy first (new columns stay NULL)
        → Phase 2 deploy triggers data flow into new columns

Day 3+: Deploy Phase 3 (edge functions)
        → Insert admin policy default rows
        → Verify: new document uploads populate new columns

Day 4+: Deploy Phase 2 (conversion service)
        → Docker rebuild + deploy
        → Verify: callbacks include parser_provenance
        → Verify: new source types convert successfully

Day 5+: Deploy Phase 4 (frontend)
        → Verify: grid shows page_no column for PDFs
        → Verify: conversion detail panel shows provenance
        → Verify: realtime status updates work
```

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Docling API changes between versions | Pin `docling>=2.70.0,<3.0.0` in requirements. Wrap all attribute access in try/catch. |
| Pipeline options constructor changes | Try/except around `PdfPipelineOptions(...)`. Fall back to `DocumentConverter()` with no options. |
| Large Docker image (picture description VLM) | Start with API mode only. Defer local VLM to a future phase. |
| Audio/ASR support | Defer. Not included in initial integration. Gate behind admin policy toggle. |
| `.xml` format ambiguity | Default to `xml_jats`. Let Docling's format detection handle disambiguation. |
| Callback payload size increase | New fields add ~2KB max. Well within HTTP payload limits. |
| Existing data has NULL new columns | Acceptable. Frontend handles NULL gracefully (hides columns, shows "—"). |

---

## What's Explicitly Out of Scope

1. **VlmPipeline** — never auto-assigned, requires explicit construction. Future work.
2. **Audio/ASR pipeline** — requires `docling[asr]` extra and Whisper models. Future work.
3. **Local VLM picture description** — large model download. Use API mode first.
4. **Backfilling existing data** — existing blocks keep NULL for new columns. Re-ingest to populate.
5. **Block grouping** — future derived entity, not part of per-block export contract.
6. **Worker/extraction changes** — worker reads `block_content` only; new columns don't affect extraction.
