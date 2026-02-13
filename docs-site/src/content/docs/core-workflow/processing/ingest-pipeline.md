---
title: Ingest Pipeline
description: Engineering-level upload, conversion, and block-ingest flow with policy-driven track routing.
---

This page describes the implemented ingest pipeline end to end, including routing policy, identifiers, storage artifacts, and database writes.

## Contracts and Identifiers

### `source_uid`

`source_uid` is a SHA-256 digest of source bytes with canonical source type prefix:

```text
source_uid = sha256_hex(source_type + "\n" + source_bytes)
```

`source_uid` is the primary key of `documents_v2`.

### `source_type` from extension

Current canonical mapping:

- `.md`, `.markdown` -> `md`
- `.docx` -> `docx`
- `.pdf` -> `pdf`
- `.pptx` -> `pptx`
- `.xlsx` -> `xlsx`
- `.html`, `.htm` -> `html`
- `.csv` -> `csv`
- `.txt` -> `txt`
- `.rst` -> `rst`
- `.tex`, `.latex` -> `latex`
- `.odt` -> `odt`
- `.epub` -> `epub`
- `.rtf` -> `rtf`
- `.org` -> `org`

### `conv_uid`

`conv_uid` is a deterministic identity of the parsed representation:

- mdast markdown bytes:
  `sha256_hex("mdast\nmarkdown_bytes\n" + markdown_bytes)`
- docling sidecar JSON:
  `sha256_hex("docling\ndoclingdocument_json\n" + docling_json_bytes)`
- pandoc AST JSON:
  `sha256_hex("pandoc\npandoc_ast_json\n" + pandoc_ast_json_bytes)`

## Track Routing

Ingest route resolution is policy-driven:

1. extension allowed by `upload.allowed_extensions`,
2. extension mapped by `upload.extension_track_routing`,
3. track enabled by `upload.track_enabled`,
4. route consistent with `upload.track_capability_catalog`.

Resolved route returns `{ extension, source_type, track }`.

## Storage Artifacts

Bucket: `DOCUMENTS_BUCKET` (default `documents`).

Per source:

- original upload: `uploads/<source_uid>/<filename>`
- converted markdown: `converted/<source_uid>/<basename>.md`
- docling representation: `converted/<source_uid>/<basename>.docling.json` (docling track)
- pandoc representation: `converted/<source_uid>/<basename>.pandoc.ast.json` (pandoc track)

## Database Writes

### `documents_v2`

Single active conversion slot remains canonical:

- `conv_uid`
- `conv_parsing_tool`
- `conv_representation_type`
- `conv_locator`
- conversion metrics/frequencies

### `blocks_v2`

Block locator types by track:

- mdast: `text_offset_range`
- docling: `docling_json_pointer`
- pandoc: `pandoc_ast_path`

Parser-native metadata fields are additive across tracks:

- `parser_block_type`
- `parser_path`

These fields are stored inside `block_locator` and do not replace normalized `block_type`.

### `conversion_representations_v2`

Each successful ingest also upserts one representation artifact row:

- `source_uid`
- `conv_uid`
- `parsing_tool`
- `representation_type`
- `artifact_locator`
- `artifact_hash`
- `artifact_size_bytes`
- `artifact_meta`

This table provides first-class representation persistence for downstream deterministic adapters while `documents_v2.conv_*` remains the active slot.

## API Boundaries

### `POST /functions/v1/ingest`

- Validates auth and project ownership.
- Loads runtime policy and resolves route.
- `md` route ingests inline via mdast path.
- Other routes enqueue conversion service with explicit `track`.

### `POST /functions/v1/conversion-complete`

Authenticated by `X-Conversion-Service-Key`.

Callback precedence:

1. both `docling_key` and `pandoc_key` set -> fail (`conversion_failed`)
2. `pandoc_key` set -> pandoc branch
3. `docling_key` set -> docling branch
4. otherwise -> mdast fallback branch from converted markdown

### `GET /functions/v1/export-jsonl`

Supports `block_view` query parameter:

- `block_view=normalized` (default)
- `block_view=parser_native`

`parser_native` keeps canonical envelope shape and switches block presentation to parser-native metadata where available.

## State Transitions

Observed `documents_v2.status` flow:

- `uploaded -> ingested`
- `uploaded -> ingest_failed`
- `converting -> uploaded -> ingested`
- `converting -> conversion_failed`
- `converting -> ingest_failed`

## Retry and Cleanup

On retry of failed ingests, stale rows are cleaned from:

- `blocks_v2` (by prior `conv_uid`)
- `conversion_representations_v2` (by `source_uid`)
- `documents_v2` (by `source_uid`)

This preserves idempotent reprocessing behavior.
