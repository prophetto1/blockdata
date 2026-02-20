# Callback Contract: Conversion Service → conversion-complete Edge Function

**Direction:** Python conversion service → `POST /functions/v1/conversion-complete`
**Auth:** `X-Conversion-Service-Key` header (shared secret)

---

## Current Callback Payload

```json
{
  "source_uid": "sha256hex...",
  "conversion_job_id": "uuid",
  "track": "mdast|docling|pandoc",
  "md_key": "converted/<source_uid>/<name>.md",
  "docling_key": "converted/<source_uid>/<name>.docling.json",
  "pandoc_key": "converted/<source_uid>/<name>.pandoc.ast.json",
  "success": true,
  "error": null
}
```

Notes:
- `docling_key` / `pandoc_key` are `null` unless the artifact was successfully uploaded
- `track` is the resolved track (after defaults)
- All keys are Storage locators (bucket-relative paths), not URLs

---

## New Callback Payload (Backwards-Compatible Additions)

```json
{
  "source_uid": "sha256hex...",
  "conversion_job_id": "uuid",
  "track": "mdast|docling|pandoc",
  "md_key": "converted/<source_uid>/<name>.md",
  "docling_key": "converted/<source_uid>/<name>.docling.json",
  "pandoc_key": "converted/<source_uid>/<name>.pandoc.ast.json",
  "success": true,
  "error": null,

  "parser_provenance": {
    "version": "2.71.0",
    "pipeline_family": "StandardPdfPipeline",
    "profile_name": "docling_pdf_balanced_default",
    "backend_name": "DoclingParseV4DocumentBackend",
    "input_format": "pdf",
    "input_mime": "application/pdf",
    "options_json": {
      "do_ocr": true,
      "do_table_structure": true,
      "do_code_enrichment": false,
      "do_formula_enrichment": false,
      "do_picture_classification": false,
      "do_picture_description": false,
      "table_structure_options": {
        "mode": "ACCURATE",
        "do_cell_matching": true
      },
      "ocr_options": {
        "kind": "rapidocr",
        "lang": ["en"]
      },
      "layout_options": {
        "model_spec": "DOCLING_LAYOUT_HERON"
      },
      "images_scale": 1.0,
      "generate_page_images": false,
      "generate_picture_images": false,
      "artifacts_path": "/root/.cache/docling/models"
    },
    "options_hash": "sha256hex_of_canonical_options_json",
    "extenders_json": {
      "do_ocr": true,
      "do_table_structure": true,
      "do_code_enrichment": false,
      "do_formula_enrichment": false,
      "do_picture_classification": false,
      "do_picture_description": false
    }
  },

  "conversion_status": "SUCCESS",
  "conversion_errors": [],
  "conversion_timings": {
    "page_init": { "total": 0.12, "count": 5 },
    "page_ocr": { "total": 2.34, "count": 5 },
    "page_layout": { "total": 1.56, "count": 5 },
    "page_table": { "total": 0.89, "count": 3 },
    "page_assemble": { "total": 0.45, "count": 5 },
    "doc_build": { "total": 5.36, "count": 1 },
    "doc_assemble": { "total": 0.23, "count": 1 },
    "doc_enrich": { "total": 0.0, "count": 0 },
    "pipeline_total": { "total": 5.82, "count": 1 }
  }
}
```

---

## Field-by-Field Specification

### Existing fields (unchanged)

| Field | Type | Required | Description |
|---|---|---|---|
| `source_uid` | string | YES | Content-addressed document identifier |
| `conversion_job_id` | string | YES | UUID matching source_documents.conversion_job_id |
| `track` | string | YES | Resolved track: `"mdast"`, `"docling"`, or `"pandoc"` |
| `md_key` | string | YES | Storage path to converted markdown |
| `docling_key` | string\|null | NO | Storage path to DoclingDocument JSON (null if not uploaded) |
| `pandoc_key` | string\|null | NO | Storage path to Pandoc AST JSON (null if not uploaded) |
| `success` | boolean | YES | Whether conversion succeeded |
| `error` | string\|null | NO | Error message (capped at 1000 chars) |

### New fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `parser_provenance` | object\|null | NO | null | Full parser provenance. Only populated when track=docling. |
| `parser_provenance.version` | string\|null | NO | null | Docling library version (e.g., `"2.71.0"`) |
| `parser_provenance.pipeline_family` | string\|null | NO | null | Auto-selected pipeline class name |
| `parser_provenance.profile_name` | string\|null | NO | null | Quality tier used for this conversion |
| `parser_provenance.backend_name` | string\|null | NO | null | Backend class name |
| `parser_provenance.input_format` | string\|null | NO | null | Docling InputFormat enum value |
| `parser_provenance.input_mime` | string\|null | NO | null | Detected MIME type |
| `parser_provenance.options_json` | object\|null | NO | null | Effective pipeline options (canonicalized) |
| `parser_provenance.options_hash` | string\|null | NO | null | SHA-256 of options_json for equality checks |
| `parser_provenance.extenders_json` | object\|null | NO | null | Enricher toggle snapshot |
| `conversion_status` | string\|null | NO | null | Docling ConversionStatus enum: `"SUCCESS"`, `"PARTIAL_SUCCESS"`, `"FAILURE"`, `"SKIPPED"` |
| `conversion_errors` | array | NO | `[]` | Error objects: `{component_type, module_name, error_message}` |
| `conversion_timings` | object | NO | `{}` | Timing profiling by stage: `{stage_name: {total, count}}` |

---

## Backwards Compatibility

The new fields are **additive only**. The edge function (`conversion-complete/index.ts`) must:

1. Accept callbacks with or without `parser_provenance` (null check before accessing)
2. Accept callbacks with or without `conversion_status` / `conversion_errors` / `conversion_timings`
3. Existing mdast and pandoc tracks never populate `parser_provenance` — these fields stay null

The conversion service must:

1. Always include the new fields in the callback (even if null/empty)
2. Never fail a callback because provenance extraction failed — wrap in try/catch, send null

---

## Mapping: Callback Fields → Database Columns

| Callback field | Database column | Table |
|---|---|---|
| `parser_provenance.version` | `parser_version` | `conversion_parsing` |
| `parser_provenance.pipeline_family` | `parser_pipeline_family` | `conversion_parsing` |
| `parser_provenance.profile_name` | `parser_profile_name` | `conversion_parsing` |
| `parser_provenance.backend_name` | `parser_backend_name` | `conversion_parsing` |
| `parser_provenance.input_format` | `parser_input_format` | `conversion_parsing` |
| `parser_provenance.input_mime` | `parser_input_mime` | `conversion_parsing` |
| `parser_provenance.options_json` | `parser_options_json` | `conversion_parsing` |
| `parser_provenance.options_hash` | `parser_options_hash` | `conversion_parsing` |
| `parser_provenance.extenders_json` | `parser_extenders_json` | `conversion_parsing` |
| `conversion_status` | Maps to `conv_status` + stored in `conversion_meta_json` | `conversion_parsing` |
| `conversion_errors` | Stored in `conversion_meta_json.errors` + `artifact_meta.errors` | `conversion_parsing` + `conversion_representations` |
| `conversion_timings` | Stored in `conversion_meta_json.timings` + `artifact_meta.timings` | `conversion_parsing` + `conversion_representations` |

Note: `parser_provenance.options_json` is NOT stored on `conversion_representations` (too large). Only the `options_hash` is included in `artifact_meta.parser` for cross-referencing.

---

## Example: SimplePipeline Format (DOCX)

```json
{
  "source_uid": "abc123...",
  "conversion_job_id": "uuid",
  "track": "docling",
  "md_key": "converted/abc123/report.md",
  "docling_key": "converted/abc123/report.docling.json",
  "pandoc_key": null,
  "success": true,
  "error": null,
  "parser_provenance": {
    "version": "2.71.0",
    "pipeline_family": "SimplePipeline",
    "profile_name": "docling_simple_picture_aware",
    "backend_name": "MsWordDocumentBackend",
    "input_format": "docx",
    "input_mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "options_json": null,
    "options_hash": null,
    "extenders_json": {
      "do_ocr": false,
      "do_table_structure": false,
      "do_code_enrichment": false,
      "do_formula_enrichment": false,
      "do_picture_classification": false,
      "do_picture_description": false
    }
  },
  "conversion_status": "SUCCESS",
  "conversion_errors": [],
  "conversion_timings": {
    "doc_build": { "total": 1.23, "count": 1 },
    "pipeline_total": { "total": 1.45, "count": 1 }
  }
}
```

Note: SimplePipeline formats have `options_json: null` and `options_hash: null` because there are no configurable pipeline options. The `extenders_json` still captures the enricher state.

---

## Example: Partial Success (PDF with page errors)

```json
{
  "source_uid": "def456...",
  "conversion_job_id": "uuid",
  "track": "docling",
  "md_key": "converted/def456/scan.md",
  "docling_key": "converted/def456/scan.docling.json",
  "pandoc_key": null,
  "success": true,
  "error": null,
  "parser_provenance": {
    "version": "2.71.0",
    "pipeline_family": "StandardPdfPipeline",
    "profile_name": "docling_pdf_balanced_default",
    "backend_name": "DoclingParseV4DocumentBackend",
    "input_format": "pdf",
    "input_mime": "application/pdf",
    "options_json": { "do_ocr": true, "do_table_structure": true },
    "options_hash": "789abc...",
    "extenders_json": { "do_ocr": true, "do_table_structure": true }
  },
  "conversion_status": "PARTIAL_SUCCESS",
  "conversion_errors": [
    {
      "component_type": "DOCUMENT_BACKEND",
      "module_name": "docling.backend.pdf_backend",
      "error_message": "Page 7: corrupted content stream"
    }
  ],
  "conversion_timings": {
    "pipeline_total": { "total": 12.5, "count": 1 }
  }
}
```

The edge function maps `conversion_status: "PARTIAL_SUCCESS"` to `conv_status: "partial_success"` in `conversion_parsing` and `status: "partial_success"` in `source_documents`.