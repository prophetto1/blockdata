---
title: Export Shape
description: Field-by-field breakdown of the canonical JSONL output record.
sidebar:
  order: 6
---

## Canonical block record

Every exported block is one JSON object with exactly two top-level keys:

```json
{
  "immutable": { ... },
  "user_defined": { ... }
}
```

## `immutable` (deterministic, never changes after ingest)

### `immutable.source_upload`

| Field | Type | Example |
|-------|------|---------|
| `source_uid` | string (sha256) | `"a1b2c3d4..."` |
| `source_type` | string (enum) | `"md"`, `"docx"`, `"pdf"` |
| `source_filesize` | integer | `12345` |
| `source_total_characters` | integer \| null | `12000` (null for binary) |
| `source_upload_timestamp` | string (ISO 8601) | `"2026-02-07T00:00:00Z"` |

### `immutable.conversion`

| Field | Type | Example |
|-------|------|---------|
| `conv_status` | string (enum) | `"success"` |
| `conv_uid` | string (sha256) | `"d4e5f6..."` |
| `conv_parsing_tool` | string (enum) | `"mdast"`, `"docling"` |
| `conv_representation_type` | string (enum) | `"markdown_bytes"`, `"doclingdocument_json"` |
| `conv_total_blocks` | integer | `555` |
| `conv_block_type_freq` | object | `{ "paragraph": 255, "heading": 55 }` |
| `conv_total_characters` | integer | `123456` |

### `immutable.block`

| Field | Type | Example |
|-------|------|---------|
| `block_uid` | string | `"d4e5f6...:37"` |
| `block_index` | integer | `37` |
| `block_type` | string (enum) | `"paragraph"` |
| `block_locator` | object (typed) | `{ "type": "text_offset_range", ... }` |
| `block_content` | string | `"The court held that..."` |

## `user_defined` (schema overlay, set per run)

| Field | Type | Description |
|-------|------|-------------|
| `schema_ref` | string \| null | User-facing schema identifier |
| `schema_uid` | string \| null | Content hash of the schema artifact |
| `data` | object | Extraction fields defined by the schema |

### Without a run (immutable-only export)

```json
"user_defined": {
  "schema_ref": null,
  "schema_uid": null,
  "data": {}
}
```

### With a confirmed overlay

```json
"user_defined": {
  "schema_ref": "scotus_close_reading_v1",
  "schema_uid": "a3f8...",
  "data": {
    "rhetorical_function": "holding",
    "cited_authorities": ["Marbury v. Madison"],
    "confidence": 0.92
  }
}
```

## JSONL ordering

Records are ordered by `block_index` ascending (stable reading order). Each line is one complete JSON object.

## Track differences

| Field | mdast track | Docling track |
|-------|-------------|---------------|
| `source_type` | `md` | `docx`, `pdf`, etc. |
| `source_total_characters` | integer | `null` |
| `conv_parsing_tool` | `mdast` | `docling` |
| `conv_representation_type` | `markdown_bytes` | `doclingdocument_json` |
| `block_locator.type` | `text_offset_range` | `docling_json_pointer` |
