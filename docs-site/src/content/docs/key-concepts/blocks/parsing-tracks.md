---
title: Parsing Tracks
description: Ingest parsing tracks, routing policy, and representation contracts.
sidebar:
  order: 2
---

**Spec version:** v2.0  
**Date:** 2026-02-13  
**Status:** Implemented (`mdast`, `docling`, `pandoc`)

## Track Contracts

| Track | `conv_parsing_tool` | `conv_representation_type` | `block_locator.type` |
|---|---|---|---|
| mdast | `mdast` | `markdown_bytes` | `text_offset_range` |
| docling | `docling` | `doclingdocument_json` | `docling_json_pointer` |
| pandoc | `pandoc` | `pandoc_ast_json` | `pandoc_ast_path` |

## Parser-Native Metadata Contract

Normalized `block_type` remains the default platform view. Parser-native metadata is additive and track-specific.

| Track | Required locator base fields | Parser-native fields now exposed | Parser-native source |
|---|---|---|---|
| mdast | `type`, `start_offset`, `end_offset` | `parser_block_type`, `parser_path` | mdast node type + traversal path |
| docling | `type`, `pointer`, optional `page_no` | `parser_block_type`, `parser_path` | Docling item label + Docling pointer |
| pandoc | `type`, `path` | `parser_block_type`, `parser_path` | Pandoc constructor + AST path |

Section-by-section examples:

### mdast parser-native locator

```json
{
  "type": "text_offset_range",
  "start_offset": 102,
  "end_offset": 188,
  "parser_block_type": "paragraph",
  "parser_path": "$.children[3]"
}
```

### docling parser-native locator

```json
{
  "type": "docling_json_pointer",
  "pointer": "#/texts/47",
  "page_no": 12,
  "parser_block_type": "paragraph",
  "parser_path": "#/texts/47"
}
```

### pandoc parser-native locator

```json
{
  "type": "pandoc_ast_path",
  "path": "$.blocks[12]",
  "parser_block_type": "Header",
  "parser_path": "$.blocks[12]"
}
```

## Normalized vs Parser-Native View

Default behavior stays normalized. Parser-native is opt-in exposure:

1. Block viewer UI includes a `Normalized` / `Parser Native` toggle.
2. JSONL export supports `block_view=normalized|parser_native` (`normalized` default).

## Track Roles

### mdast

- inline markdown parsing in Edge Function,
- no conversion-service dependency,
- canonical for `.md` and `.markdown`,
- currently also used for `.txt` by default routing policy.

### docling

- conversion-service path,
- layout-aware document parsing,
- representation sidecar is Docling JSON.

Current default routing target for:

- `.docx`, `.pdf`, `.pptx`, `.xlsx`, `.html`, `.htm`, `.csv`

### pandoc

- conversion-service path,
- parser-native AST representation from Pandoc JSON,
- deterministic AST bytes persisted as first-class artifact.

Current default routing target for:

- `.rst`, `.tex`, `.latex`, `.odt`, `.epub`, `.rtf`, `.org`

## Capability vs Enablement

Routing is controlled by runtime policy using a two-layer model:

1. `upload.track_capability_catalog`: declared parser capability catalog
2. runtime rollout controls:
   - `upload.track_enabled`
   - `upload.extension_track_routing`
   - `upload.allowed_extensions`

This allows a track to be present in platform capability while only selected formats are enabled for production ingestion.

## Pandoc Block Mapping

Initial block mapping in Pandoc extractor:

- `Header` -> `heading`
- `Para`, `Plain` -> `paragraph`
- `BulletList`, `OrderedList` -> `list_item` (one row per list item)
- `CodeBlock` -> `code_block`
- `Table` -> `table`
- `HorizontalRule` -> `divider`
- `DefinitionList` -> `definition`
- `RawBlock` (html) -> `html_block`
- unknown constructors -> `other`

Unknown constructors are non-fatal and are intentionally mapped to `other`.

## Representation Persistence

All successful ingests persist a representation row in `conversion_representations_v2`:

- mdast markdown bytes,
- docling JSON,
- pandoc AST JSON.

This supports deterministic downstream adapters while preserving the current single active conversion slot in `documents_v2`.
