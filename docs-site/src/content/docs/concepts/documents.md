---
title: Documents
description: Documents are uploaded source files that the platform parses into blocks via the conversion pipeline.
sidebar:
  order: 2
---

A **document** represents an uploaded source file and its conversion into blocks. Documents belong to a project and are identified by a deterministic `source_uid` derived from the file's content.

## Upload and conversion pipeline

When a user uploads a file:

1. **Ingest** — The `ingest` Edge Function accepts the file, computes `source_uid = sha256(source_type + "\n" + raw_bytes)`, uploads to Supabase Storage, and creates a `documents_v2` row with status `uploaded`.
2. **Conversion** — The file is parsed into blocks:
   - **Markdown** (`.md`) — Parsed inline via mdast (remark). No external service needed.
   - **DOCX / PDF** (`.docx`, `.pdf`) — Sent to the Docling conversion service (Cloud Run). Returns markdown + DoclingDocument JSON sidecar.
3. **Block extraction** — The `conversion-complete` Edge Function extracts blocks from the parsed representation, computes `conv_uid`, and writes block rows to `blocks_v2`.

## Document status machine

```
uploaded → converting → ingested (success)
                     → conversion_failed (error)
         → ingest_failed (error during block extraction)
```

| Status | Meaning |
|--------|---------|
| `uploaded` | File stored, conversion not started |
| `converting` | Conversion service processing the file |
| `ingested` | Blocks extracted successfully |
| `conversion_failed` | Conversion service returned an error |
| `ingest_failed` | Block extraction failed after conversion |

## Supported formats

| Format | Extension | Parsing Track |
|--------|-----------|--------------|
| Markdown | `.md` | mdast (inline) |
| Word | `.docx` | Docling (Cloud Run) |
| PDF | `.pdf` | Docling (Cloud Run) |
| Plain text | `.txt` | mdast (inline) |

## Deterministic identity

- `source_uid = sha256(source_type + "\n" + raw_source_bytes)` — Uploading the same file twice produces the same `source_uid`.
- `conv_uid = sha256(conv_parsing_tool + "\n" + conv_representation_type + "\n" + conv_representation_bytes)` — The block inventory identity, stable for identical conversions.

## Multi-file upload

The upload page supports drag-and-drop of up to 10 files per batch. Each file is ingested independently with its own status tracking.
