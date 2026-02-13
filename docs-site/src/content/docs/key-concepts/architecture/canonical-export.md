---
title: Canonical Export Contract
description: The two-key per-block JSON shape, JSONL export rules, and entity model.

sidebar:
  order: 1
---

**Spec version:** v1.0
**Date:** 2026-02-11
**Source:** `docs/product-defining-v2.0/0207-prd-tech-spec-doc2.md` (Sections 1, 5, 6, 9)
**Status:** Canonical — implemented in `export-jsonl` edge function

---

## Scope

This page defines the canonical per-block export shape, the JSONL export format, entity definitions, and the legacy mapping table.

It does **not** cover: field definitions (see [Immutable Fields](/docs/key-concepts/schemas/immutable-schema/)), block types (see [Block Types](/docs/key-concepts/blocks/block-types/)), or overlay confirmation semantics (see [Overlay Contract](/docs/core-workflow/review-and-export/overlay-contract/)).

---

<!-- BEGIN VERBATIM COPY from docs/product-defining-v2.0/0207-prd-tech-spec-doc2.md (Sections 1, 3, 5, 6, 9) -->

## 1) Core Invariants

1. **Immutable is never mutated after ingest**
   - After ingest completes, the extracted immutable substrate is fixed.

2. **User-defined schemas are overlays, not edits to immutable**
   - All schema outputs (tags, extracted fields, rewrites, comments, signals) live in a mutable overlay layer.

3. **Multi-schema is a first-class requirement**
   - A single document's immutable block inventory must support attaching many schemas.
   - A single schema must be reusable across many documents.

4. **The export format is the contract**
   - Canonical output is JSON (per block) and JSONL (one JSON per line).
   - The database is storage; export is assembled on demand.

---

## 3) Entities

This section describes how multi-schema works. These entities describe the *intended design contract* for Phase 1 + Phase 2.

- **Source upload (pre-conversion upload identity):**
  - Identified by `immutable.source_upload.source_uid`.
  - Meaning: identity of the uploaded source bytes (before any conversion).

- **Conversion / Document (immutable substrate identity for block inventory):**
  - Identified by `immutable.conversion.conv_uid`.
  - Meaning: identity of the converted representation bytes that were parsed to produce the block inventory.
  - Note: `conv_uid` is the stable "document identity" for the block inventory in v3.0.

- **Block (atomic unit in reading order):**
  - Identified by `immutable.block.block_uid`.
  - Recommended derived form: `block_uid = conv_uid + ":" + block_index`.

- **Schema (user-defined schema artifact):**
  - A reusable schema definition owned by a user.
  - Stable identifiers:
    - `schema_ref` (user-facing slug)
    - `schema_uid` (content hash of canonicalized schema JSON)

- **Run (schema attached to a document for one execution instance):**
  - A binding of one `conv_uid` to one schema for a specific execution instance.
  - Identified by `run_id`.

- **Overlay (per-block user-defined output for a run):**
  - One overlay payload per `(run_id, block_uid)`.
  - This overlay is what becomes `user_defined.data` at export time for that run.

This creates the many-to-many relationship you want:
- A **document (conv_uid)** has many schema attachments (many runs).
- A **schema** appears on many documents (many runs).

---

## 5) Canonical Output: One Block Record

Each exported block is one JSON object with exactly two top-level keys:

- `immutable`: deterministic substrate derived at ingest time.
- `user_defined`: user-defined schema overlay for a specific schema attachment (run).

### 5.1 Canonical Shape

```json
{
  "immutable": {
    "source_upload": {
      "source_uid": "...",
      "source_type": "md",
      "source_filesize": 12345,
      "source_total_characters": 12000,
      "source_upload_timestamp": "2026-02-07T00:00:00Z"
    },
    "conversion": {
      "conv_status": "success",
      "conv_uid": "...",
      "conv_parsing_tool": "mdast",
      "conv_representation_type": "markdown_bytes",
      "conv_total_blocks": 555,
      "conv_block_type_freq": { "paragraph": 255, "heading": 55 },
      "conv_total_characters": 123456
    },
    "block": {
      "block_uid": "...",
      "block_index": 37,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 0, "end_offset": 0 },
      "block_content": "..."
    }
  },
  "user_defined": {
    "schema_ref": null,
    "schema_uid": null,
    "data": {}
  }
}
```

The example above shows the **mdast track** (Markdown source). The **Docling track** (non-Markdown source) produces a different shape for the same two-key contract:

```json
{
  "immutable": {
    "source_upload": {
      "source_uid": "...",
      "source_type": "docx",
      "source_filesize": 284672,
      "source_total_characters": null,
      "source_upload_timestamp": "2026-02-07T09:00:00Z"
    },
    "conversion": {
      "conv_status": "success",
      "conv_uid": "...",
      "conv_parsing_tool": "docling",
      "conv_representation_type": "doclingdocument_json",
      "conv_total_blocks": 214,
      "conv_block_type_freq": { "heading": 18, "paragraph": 162, "list_item": 24, "table": 6, "page_header": 2, "page_footer": 2 },
      "conv_total_characters": 89340
    },
    "block": {
      "block_uid": "...",
      "block_index": 47,
      "block_type": "paragraph",
      "block_locator": { "type": "docling_json_pointer", "pointer": "#/texts/47", "page_no": 12 },
      "block_content": "..."
    }
  },
  "user_defined": {
    "schema_ref": null,
    "schema_uid": null,
    "data": {}
  }
}
```

Key differences between tracks:

| | mdast track | Docling track |
|:--|:--|:--|
| `source_type` | `md` | `docx`, `pdf`, `pptx`, `html`, etc. |
| `source_total_characters` | integer (text readable from source bytes) | `null` (binary format) |
| `conv_parsing_tool` | `mdast` | `docling` |
| `conv_representation_type` | `markdown_bytes` | `doclingdocument_json` |
| `block_locator.type` | `text_offset_range` | `docling_json_pointer` |

Both tracks produce the same canonical two-key export shape. The pairing rules enforce valid combinations.

Notes:
- Phase 1 keeps `user_defined` inert (null schema identifiers + empty `data`).
- Phase 2 populates `user_defined` from the run + overlays.
- Legacy docs and artifacts may use the key name `annotation` for what is conceptually the same mutable overlay. This v3.0 spec standardizes the exported mutable key as `user_defined` (Section 9).

---

## 6) Canonical Output: JSONL

JSONL is newline-delimited JSON. Each line is one block record.
- A JSONL file is the ordered concatenation of block records.

Ordering rule:
- Export MUST order by `immutable.block.block_index` ascending (stable reading order).

Export variants:
- **Phase 1 export** (immutable only): parameterized by `conv_uid`.
  - `user_defined` is always inert: `{ "schema_ref": null, "schema_uid": null, "data": {} }`
- **Phase 2 export** (immutable + a specific schema overlay): parameterized by `run_id`.
  - `user_defined.schema_ref` and `user_defined.schema_uid` are sourced from the run's schema.
  - `user_defined.data` is sourced from the run's per-block overlay payload for `(run_id, block_uid)`.

API parameter naming note (contract-level, not implementation-level):
- The Phase 1 export needs to identify the immutable substrate that owns the block inventory.
- In v3.0 that identifier is `conv_uid`, so the Phase 1 export contract is parameterized by `conv_uid`.
- Legacy docs may still describe Phase 1 export as parameterized by `doc_uid`; treat that as legacy aliasing to be reconciled.

Multi-schema note:
- A document with many attached schemas produces many Phase 2 JSONL exports (one per `run_id`), each representing one schema overlay over the same immutable block inventory.

---

## 9) Legacy Mapping

This section exists to reconcile older docs and prevent drift while the repo is mid-transition.

- Legacy `doc_uid` -> v3.0 `conv_uid`
  - v3.0: document identity is the hash of the converted representation bytes that produced the block inventory.

- Legacy `md_uid` -> removed in favor of `conv_uid` + `conv_representation_type`
  - v3.0: `markdown_bytes` is one possible converted representation type.

- Legacy `char_span` -> v3.0 `block_locator` with `type = text_offset_range`

- Legacy `section_path` -> not part of the v3.0 immutable contract
  - If needed, it must be reintroduced explicitly as a defined field with deterministic derivation rules.

- Legacy `annotation` (mutable overlay key) -> v3.0 `user_defined`
  - v3.0 export uses `user_defined` as the canonical key.
  - During migration, schema examples and legacy docs may still describe overlays using `annotation.*`; treat that as legacy naming only.

<!-- END VERBATIM COPY -->
