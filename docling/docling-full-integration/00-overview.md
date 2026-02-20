# Docling Full-Pipeline Integration Plan

**Date:** 2026-02-20
**Scope:** Integrate all Docling pipelines (StandardPdfPipeline, SimplePipeline, AsrPipeline) and all optional enrichers into the blockdata platform.

---

## Current State

### What works today

1. **Conversion service** (`services/conversion-service/app/main.py`): FastAPI Python service using `DocumentConverter()` with default options only. Handles 13 source types (`docx|pdf|pptx|xlsx|html|csv|txt|rst|latex|odt|epub|rtf|org`). No enrichers. No pipeline options exposed. No profile control.

2. **Block extraction** (`supabase/functions/_shared/docling.ts`): Parses DoclingDocument JSON, maps 23 native DocItemLabels to 17 platform block_types, captures `pointer` and `page_no` only. Discards: bounding boxes, charspan, group labels, formatting, hyperlinks, code_language, heading level, picture classification/description metadata.

3. **Conversion callback** (`supabase/functions/conversion-complete/index.ts`): Persists blocks + representation artifacts. Stores zero parser provenance (no version, no pipeline family, no options hash, no extender config, no confidence scores).

4. **Database schema**: `blocks` has 6 columns. `conversion_parsing` has 9 columns. `conversion_representations` has opaque `artifact_meta` JSONB. All tables exist with proper FK enforcement via 8 lookup catalog tables.

### What Docling produces that we discard

| Data | Source | Current status |
|---|---|---|
| ConversionResult wrapper (status, errors, timings, confidence, versions) | `result.status`, `result.errors`, `result.timings`, `result.confidence` | Discarded entirely |
| Per-block bounding boxes | `item.prov[0].bbox` (l, t, r, b, coord_origin) | Discarded |
| Per-block character spans | `item.prov[0].charspan` [start, end] | Discarded |
| Native DocItemLabels (23 values) | `item.label` | Collapsed to 17 platform types; original lost |
| Parent GroupLabels (12 values) | Parent node's `label` | Not captured |
| Item self-references | `item.self_ref` | Used transiently in extraction, not persisted |
| Heading level | `item.level` | Not captured |
| Code language | `item.code_language` | Not captured |
| Formatting (DOCX) | `item.formatting` (bold, italic, underline) | Not captured |
| Hyperlinks (HTML) | `item.hyperlink` | Not captured |
| Picture classification | `item.meta.classification` (class_name, confidence) | Enricher not enabled; not captured |
| Picture description | `item.meta.description` (text) | Enricher not enabled; not captured |
| Table cell-level structure | `item.data.table_cells[].bbox`, spans, headers | Partially captured (text only via pipe-delimited grid) |
| Parser version/pipeline/options | ConversionResult metadata | Not captured anywhere |
| Audio timestamps | `item.source.start_time`, `end_time`, `voice` | Pipeline not supported |

---

## Pipeline Selection (Auto, Not User-Chosen)

Docling's pipeline is **automatically selected** based on detected file format. The user never picks a pipeline. The routing is:

| InputFormat | Pipeline (auto) | Backend (auto) |
|---|---|---|
| `pdf` | StandardPdfPipeline | DoclingParseV4DocumentBackend |
| `image` | StandardPdfPipeline | ImageDocumentBackend |
| `mets_gbs` | StandardPdfPipeline | MetsGbsDocumentBackend |
| `docx` | SimplePipeline | MsWordDocumentBackend |
| `pptx` | SimplePipeline | MsPowerpointDocumentBackend |
| `html` | SimplePipeline | HTMLDocumentBackend |
| `md` | SimplePipeline | MarkdownDocumentBackend |
| `asciidoc` | SimplePipeline | AsciiDocBackend |
| `csv` | SimplePipeline | CsvDocumentBackend |
| `xlsx` | SimplePipeline | MsExcelDocumentBackend |
| `xml_jats` | SimplePipeline | JatsDocumentBackend |
| `xml_uspto` | SimplePipeline | PatentUsptoDocumentBackend |
| `json_docling` | SimplePipeline | DoclingJSONBackend |
| `audio` | AsrPipeline | NoOpBackend |
| `vtt` | SimplePipeline | WebVTTDocumentBackend |

**VlmPipeline** is never auto-assigned. It requires explicit construction and is not part of this integration.

**What IS configurable** (via profiles/options within the auto-selected pipeline):
- Which enrichers run (OCR, table structure, code, formula, picture classification/description)
- Quality knobs (layout model, table mode FAST/ACCURATE, OCR engine)
- Operational controls (timeout, batch sizes, artifacts path)

---

## Phased Implementation

| Phase | Scope | Dependencies | Risk |
|---|---|---|---|
| **Phase 1** | Database migration (add nullable columns) | None | Zero — all nullable, backwards-compatible |
| **Phase 2** | Conversion service (Python: profiles, enrichers, provenance) | None | Medium — Docker rebuild, new Docling options API |
| **Phase 3** | Edge functions (TypeScript: extract + persist enriched data) | Phase 1 | Low — additive changes to existing functions |
| **Phase 4** | Frontend (React: new grid columns, conversion detail panel) | Phase 1 + 3 | Low — read-only UI additions |

Phase 1 is safe to apply immediately. Phases 2 and 3 can be developed in parallel (Phase 3 just leaves new columns null until Phase 2 deploys). Phase 4 is purely additive UI.

---

## File Index

| File | Contents |
|---|---|
| `01-database-migration.sql` | Complete SQL migration: new columns, catalog entries, realtime fix |
| `02-conversion-service-changes.md` | Python conversion service: profiles, enrichers, provenance emission |
| `03-edge-function-changes.md` | TypeScript edge function changes: extraction + persistence |
| `04-callback-contract.md` | New callback payload shape between conversion service and edge function |
| `05-admin-policy-changes.md` | Runtime policy additions for profile/enricher control |
| `06-frontend-changes.md` | React frontend: grid columns, conversion details, upload flow |
| `07-implementation-sequence.md` | Step-by-step execution order with dependency map |

---

## What Does NOT Change

- `blocks` PK/FK structure (`block_uid = conv_uid:block_index`)
- `conv_uid` computation (`sha256(tool + "\n" + rep_type + "\n" + bytes)`)
- Worker/runs/schemas — completely independent of conversion pipeline
- Pandoc/mdast tracks — new columns are nullable, these tracks leave them null
- `block_type_catalog` — 17 platform types already cover all Docling label mappings
- Storage bucket/key layout
- Signed URL auth pattern between ingest → conversion service → callback