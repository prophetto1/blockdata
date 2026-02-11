---
title: Immutable Fields
description: The immutable envelope attached to every exported block record.
sidebar:
  order: 1
---

**Spec version:** v1.0
**Date:** 2026-02-11
**Source:** `docs/product-defining-v2.0/0207-immutable-fields.md`
**Status:** Canonical — implemented and verified in production

---

## Scope

This page defines the **immutable** envelope that is attached to every exported block JSON record. It covers field names, types, deterministic identity derivation rules, enum registries, pairing rules, and locator schemas.

It does **not** cover: user-defined overlay fields, schema artifacts, prompt configuration, or run semantics.

---

<!-- BEGIN VERBATIM COPY from docs/product-defining-v2.0/0207-immutable-fields.md -->

## Naming convention

- `source_*` = **pre-conversion** facts about the uploaded source bytes.
- `conv_*` = **post-conversion** facts about the converted representation that was parsed to derive blocks.
- `block_*` = per-block immutable registry entry (one row/unit in reading order).

Legacy note: older names like `doc_uid`, `md_uid`, `char_span`, `section_path`, and `annotation` are legacy naming only.

## Canonical shape

The shape below represents one block.

```json
{
  "immutable": {
    "source_upload": {},
    "conversion": {},
    "block": {}
  }
}
```

## Field table

Covers field roles and types.

| Category | Field name | Role / description | Suggested data type |
| :--: | :-- | :-- | :-- |
| **Root object** | **`immutable`** | The top-level container for all immutable metadata associated with a block. | `object` |
| **Source upload** | **`source_upload`** | File-level object containing metadata about the original uploaded document (pre-conversion). | `object` |
|  | `source_uid` | A unique identifier for the uploaded source bytes: `sha256(source_type + "\n" + raw_source_bytes)`. | `string` (sha256 hex) |
|  | `source_type` | The original source format (e.g., `docx`, `pdf`, `md`). | `string` (enum) |
|  | `source_filesize` | The size of the original uploaded file. | `integer` (bytes) |
|  | `source_total_characters` | The total character count of decoded **source text**. Only meaningful for text-native sources (`md`, `txt`, etc.); otherwise `null`. | `integer \| null` |
|  | `source_upload_timestamp` | The time and date the document was uploaded to the platform. | `string` (ISO 8601) |
| **Conversion** | **`conversion`** | File-level object detailing the results of the parsing/conversion pipeline (the representation that produced the block inventory). | `object` |
|  | `conv_status` | Indicates if the conversion process was successful (e.g., `success`). | `string` (enum) |
|  | `conv_uid` | A unique identifier for the converted representation bytes (document identity for block inventory). | `string` (sha256 hex) |
|  | `conv_parsing_tool` | The tool/model used to derive blocks (e.g., `docling`, `mdast`, optionally `pandoc`). | `string` (enum) |
|  | `conv_representation_type` | The converted representation that was parsed to produce blocks (e.g., `doclingdocument_json`, `markdown_bytes`). | `string` (enum) |
|  | `conv_total_blocks` | The total number of blocks/atomic units generated from the document conversion. | `integer` |
|  | `conv_block_type_freq` | A breakdown of the number of blocks per type (e.g., `{ "paragraph": 255 }`). | `object` (map `string -> integer`) |
|  | `conv_total_characters` | The total character count of the content after conversion. Explicit definition: `sum(len(block_content))` across all blocks. | `integer` |
| **Block** | **`block`** | Block-level object containing immutable metadata specific to this individual block. | `object` |
|  | `block_uid` | A unique identifier assigned to this specific block within the conversion. | `string` |
|  | `block_index` | The sequential order of the block within the converted document's reading order (`0..conv_total_blocks-1`). | `integer` |
|  | `block_type` | The normalized type of the block (e.g., `paragraph`, `heading`, `table`). | `string` (enum) |
|  | `block_locator` | A typed locator object defining the block's position/reference back into the converted representation (tool-specific). | `object` (typed locator) |
|  | `block_content` | The immutable original block content as represented in the converted representation (pre-overlay). | `string` |

## Deterministic definitions

These definitions exist to prevent drift.

- `"\n"` in formulas is a literal newline separator to prevent ambiguous concatenation.

- `source_uid`:
  - `source_uid = sha256(source_type + "\n" + raw_source_bytes)`

- `conv_uid`:
  - `conv_uid = sha256(conv_parsing_tool + "\n" + conv_representation_type + "\n" + conv_representation_bytes)`
  - `conv_representation_type` values:
    - `markdown_bytes` (Markdown text bytes)
    - `doclingdocument_json` (DoclingDocument JSON bytes)
    - `pandoc_ast_json` (Pandoc JSON AST bytes)
  - `conv_representation_bytes` must be serialized deterministically (UTF-8 for Markdown; stable JSON serialization for Docling/Pandoc AST).

- `block_index` stays under `block` because it is **per-block ordering**. `conversion` only summarizes the inventory (`conv_total_blocks`, `conv_block_type_freq`, etc.).

- `block_uid`:
  - Recommended derived form: `block_uid = conv_uid + ":" + block_index`
  - (So it is stable within a specific conversion, without inventing a second ordering concept.)

- `block_locator` is intentionally tool-specific (it is the provenance pointer back into what you parsed). Examples:
  - For `mdast` over Markdown bytes (better term than legacy `char_span`):
    - `{ "type": "text_offset_range", "start_offset": 123, "end_offset": 456 }`
  - For Docling JSON:
    - `{ "type": "docling_json_pointer", "pointer": "#/texts/5", "page_no": 3 }`
  - For Pandoc JSON AST:
    - `{ "type": "pandoc_ast_path", "path": ["blocks", 12] }`

## Enum registry + pairing rules

This section exists to prevent implementation drift by making enum scope and valid combinations explicit.

### `source_type`

Strict enum. Represents the uploaded source format (pre-conversion).

- `md`
- `txt`
- `docx`
- `pptx`
- `pdf`
- `html`
- `image`
- `asciidoc`
- `csv`
- `xlsx`
- `xml_uspto`
- `xml_jats`
- `mets_gbs`
- `json_docling`
- `audio`
- `vtt`

### `conv_status`

Strict enum. Represents the conversion/parsing outcome for the converted representation.

- `success`
- `partial_success`
- `failure`

### `conv_parsing_tool`

Strict enum. Represents the tool/model used to derive the block inventory from the converted representation.

- `mdast`
- `docling`
- `pandoc`

### `conv_representation_type`

Strict enum.

- `markdown_bytes`
- `doclingdocument_json`
- `pandoc_ast_json`

### `block_type`

Strict enum. The `platform_block_type` values:

- `heading`
- `paragraph`
- `list_item`
- `code_block`
- `table`
- `figure`
- `caption`
- `footnote`
- `divider`
- `html_block`
- `definition`
- `checkbox`
- `form_region`
- `key_value_region`
- `page_header`
- `page_footer`
- `other`

### `block_locator.type`

Strict enum.

- `text_offset_range`
- `docling_json_pointer`
- `pandoc_ast_path`

### Pairing rules

These pairings are strict — violations are invalid.

#### `conv_parsing_tool` -> `conv_representation_type`

- If `conv_parsing_tool = mdast`:
  - MUST have `conv_representation_type = markdown_bytes`
- If `conv_parsing_tool = docling`:
  - MUST have `conv_representation_type = doclingdocument_json`
- If `conv_parsing_tool = pandoc`:
  - MUST have `conv_representation_type = pandoc_ast_json`

#### `conv_representation_type` -> `block_locator.type`

- If `conv_representation_type = markdown_bytes`:
  - `block_locator.type` MUST be `text_offset_range`
- If `conv_representation_type = doclingdocument_json`:
  - `block_locator.type` MUST be `docling_json_pointer`
- If `conv_representation_type = pandoc_ast_json`:
  - `block_locator.type` MUST be `pandoc_ast_path`

#### `conv_block_type_freq` constraints

- `conv_block_type_freq` keys MUST be drawn from the `block_type` enum above.
- `sum(values(conv_block_type_freq))` MUST equal `conv_total_blocks`.

## `block_locator` payload schema

Keyed by `block_locator.type`. This section makes the typed locator objects self-describing.

### `text_offset_range`

Required fields:
- `type`: `text_offset_range`
- `start_offset`: integer
- `end_offset`: integer

Rules:
- `0 <= start_offset <= end_offset`

### `docling_json_pointer`

Required fields:
- `type`: `docling_json_pointer`
- `pointer`: string (JSON-pointer-like reference into the DoclingDocument JSON)

Optional fields:
- `page_no`: integer

### `pandoc_ast_path`

Required fields:
- `type`: `pandoc_ast_path`
- `path`: array (address into the Pandoc JSON AST)

<!-- END VERBATIM COPY -->
