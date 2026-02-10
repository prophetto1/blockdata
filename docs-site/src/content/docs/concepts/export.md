---
title: Export
description: The canonical output contract — how confirmed overlays become structured JSONL with full provenance.
sidebar:
  order: 7
---

**Export** is how data leaves the platform. Every confirmed block is serialized as a self-contained JSON object with exactly two top-level keys: the immutable substrate and the user-defined overlay.

## Canonical output shape

```json
{
  "immutable": {
    "source_upload": {
      "source_uid": "a1b2c3...",
      "source_type": "md",
      "source_filesize": 12345,
      "source_total_characters": 12000,
      "source_upload_timestamp": "2026-02-07T00:00:00Z"
    },
    "conversion": {
      "conv_status": "success",
      "conv_uid": "d4e5f6...",
      "conv_parsing_tool": "mdast",
      "conv_representation_type": "markdown_bytes",
      "conv_total_blocks": 555,
      "conv_block_type_freq": { "paragraph": 255, "heading": 55 },
      "conv_total_characters": 123456
    },
    "block": {
      "block_uid": "d4e5f6...:37",
      "block_index": 37,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 0, "end_offset": 456 },
      "block_content": "The court held that..."
    }
  },
  "user_defined": {
    "schema_ref": "scotus_close_reading_v1",
    "schema_uid": "a3f8...",
    "data": {
      "rhetorical_function": "holding",
      "cited_authorities": ["Marbury v. Madison"],
      "confidence": 0.92
    }
  }
}
```

## JSONL format

JSONL (newline-delimited JSON) is the canonical export format. Each line is one block record. Ordering is by `block_index` ascending (stable reading order).

## Export modes

| Mode | Parameter | Output |
|------|-----------|--------|
| **Immutable only** | `conv_uid` | Blocks with empty `user_defined.data` |
| **With schema overlay** | `run_id` | Blocks with confirmed overlay data from that run |
| **Project ZIP** | project + schema | One JSONL file per document, bundled in a ZIP |

## Export sources

- **Single run** — From Document Detail or Run Detail, export one run's confirmed overlays
- **Project-wide** — From Project Detail, "Export All (ZIP)" exports the latest run per document for the selected schema

## What gets exported

By default, only **confirmed** overlays are included. Blocks where the overlay is still in staging or pending are exported with `"data": {}`. This ensures downstream consumers never ingest unreviewed values.

## The two-key contract

The export contract is the platform's most important invariant:

- **`immutable`** — Never changes after ingest. Deterministic identity from content hashes. Three nested objects: `source_upload`, `conversion`, `block`.
- **`user_defined`** — Schema overlay confirmed by the user. Contains `schema_ref`, `schema_uid`, and the `data` object with extraction fields.

A document with N schemas produces N separate JSONL exports (one per run), all sharing the same `immutable` blocks.

## Downstream formats

| Format | Best for |
|--------|----------|
| **JSONL** | ML pipelines, fine-tuning, webhooks, inter-system transfer |
| **CSV** | Analyst handoff, spreadsheet review |
| **Parquet** | Analytical queries at scale (DuckDB, Trino, Athena) |
| **JSON** | Single-document inspection, debugging |

JSONL is the canonical format. CSV and Parquet are derived views — see [Integrations](/docs/integrations/) for downstream pipeline details.
