---
title: Immutable Fields
description: All 20 fields in the immutable envelope — types, formulas, and constraints.
sidebar:
  order: 2
---

The immutable envelope is attached to every exported block record. It has three nested objects: `source_upload`, `conversion`, and `block`.

## Field table

| Category | Field | Type | Description |
|:--:|:--|:--|:--|
| **source_upload** | `source_uid` | string (sha256 hex) | `sha256(source_type + "\n" + raw_source_bytes)` |
| | `source_type` | string (enum) | Original upload format (`md`, `docx`, `pdf`, etc.) |
| | `source_filesize` | integer (bytes) | Size of uploaded file |
| | `source_total_characters` | integer \| null | Character count of decoded source text; `null` for binary formats |
| | `source_upload_timestamp` | string (ISO 8601) | When the file was uploaded |
| **conversion** | `conv_status` | string (enum) | `success`, `partial_success`, `failure` |
| | `conv_uid` | string (sha256 hex) | `sha256(tool + "\n" + representation_type + "\n" + representation_bytes)` |
| | `conv_parsing_tool` | string (enum) | `mdast`, `docling`, `pandoc` |
| | `conv_representation_type` | string (enum) | `markdown_bytes`, `doclingdocument_json`, `pandoc_ast_json` |
| | `conv_total_blocks` | integer | Total blocks in the inventory |
| | `conv_block_type_freq` | object (map) | `{ "paragraph": 255, "heading": 55, ... }` |
| | `conv_total_characters` | integer | `sum(len(block_content))` across all blocks |
| **block** | `block_uid` | string | `conv_uid + ":" + block_index` |
| | `block_index` | integer | 0-based position in reading order |
| | `block_type` | string (enum) | Normalized platform block type |
| | `block_locator` | object (typed) | Provenance pointer back into parsed representation |
| | `block_content` | string | Original block text, preserved verbatim |

## Deterministic formulas

All identity values are derived from content, making them reproducible:

### `source_uid`
```
source_uid = sha256(source_type + "\n" + raw_source_bytes)
```

### `conv_uid`
```
conv_uid = sha256(conv_parsing_tool + "\n" + conv_representation_type + "\n" + conv_representation_bytes)
```

Serialization requirements:
- `markdown_bytes`: UTF-8 bytes of the canonical markdown text
- `doclingdocument_json`: Deterministic JSON (`sort_keys=True, separators=(",",":")`)
- `pandoc_ast_json`: Deterministic JSON serialization

### `block_uid`
```
block_uid = conv_uid + ":" + block_index
```

### `schema_uid`
```
schema_uid = sha256(canonical_json_bytes(schema_artifact))
```
Sorted keys, no trailing whitespace, consistent numeric formatting, UTF-8 encoded.

### `conv_total_characters`
```
conv_total_characters = sum(len(block_content)) across all blocks
```

## Pairing rules

These combinations are strict — invalid pairings are rejected:

| `conv_parsing_tool` | `conv_representation_type` | `block_locator.type` |
|:---:|:---:|:---:|
| `mdast` | `markdown_bytes` | `text_offset_range` |
| `docling` | `doclingdocument_json` | `docling_json_pointer` |
| `pandoc` | `pandoc_ast_json` | `pandoc_ast_path` |

## Block locator schemas

### `text_offset_range`
```json
{ "type": "text_offset_range", "start_offset": 123, "end_offset": 456 }
```
Rule: `0 <= start_offset <= end_offset`

### `docling_json_pointer`
```json
{ "type": "docling_json_pointer", "pointer": "#/texts/5", "page_no": 3 }
```
`page_no` is optional.

### `pandoc_ast_path`
```json
{ "type": "pandoc_ast_path", "path": ["blocks", 12] }
```

## Constraints

- `block_index` is 0-based: `0..conv_total_blocks-1`
- `conv_block_type_freq` keys must be valid `block_type` enum values
- `sum(values(conv_block_type_freq))` must equal `conv_total_blocks`
- `"\n"` in formulas is a literal newline separator (prevents ambiguous concatenation)
